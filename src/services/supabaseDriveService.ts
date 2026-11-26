import {
  AUTH_EMAIL_DOMAIN,
  SUPABASE_BUCKET,
  supabase,
} from '../lib/supabase';
import type { AuthMember, DriveItem, DriveService } from '../types';
import {
  collectDescendantIds,
  extractDisplayUsername,
  normalizeUsernameToEmail,
  sanitizeStorageFileName,
  validateItemName,
} from '../utils/formatters';

const SIGNED_URL_EXPIRY_SECONDS = 60 * 15;

function getClient() {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }
  return supabase;
}

function toMember(user: { id: string; email?: string | null }): AuthMember {
  const email = user.email ?? '';
  return {
    id: user.id,
    email,
    username: extractDisplayUsername(email || 'member'),
  };
}

function triggerBrowserDownload(url: string, fileName: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export const supabaseDriveService: DriveService = {
  mode: 'supabase',

  async getSession() {
    const client = getClient();
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    const user = data.session?.user;
    return user ? toMember(user) : null;
  },

  onAuthStateChange(callback) {
    const client = getClient();
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ? toMember(session.user) : null);
    });
    return () => subscription.unsubscribe();
  },

  async login(username, password) {
    const client = getClient();
    if (!password) {
      throw new Error('Please enter your password.');
    }
    const email = normalizeUsernameToEmail(username, AUTH_EMAIL_DOMAIN);
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      throw new Error(
        error.message === 'Invalid login credentials'
          ? 'Invalid username or password.'
          : error.message
      );
    }
    if (!data.user) {
      throw new Error('Unable to sign in. Please try again.');
    }
    return toMember(data.user);
  },

  async logout() {
    const client = getClient();
    const { error } = await client.auth.signOut();
    if (error) throw error;
  },

  async listAllItems() {
    const client = getClient();
    const { data, error } = await client
      .from('items')
      .select('*')
      .order('type', { ascending: false })
      .order('name', { ascending: true });

    if (error) throw error;
    return (data ?? []) as DriveItem[];
  },

  subscribeToChanges(onChange) {
    const client = getClient();
    const channel = client
      .channel('digital-paithini-items')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'items' },
        () => {
          onChange();
        }
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  },

  async createFolder(name, parentId) {
    const client = getClient();
    const validName = validateItemName(name);
    const { data, error } = await client
      .from('items')
      .insert({
        name: validName,
        type: 'folder',
        parent_id: parentId,
        storage_path: null,
        file_url: null,
      })
      .select('*')
      .single();

    if (error) throw error;
    return data as DriveItem;
  },

  async uploadFile(file, parentId) {
    const client = getClient();
    const validName = validateItemName(file.name);
    const uniquePrefix = crypto.randomUUID();
    const safeName = sanitizeStorageFileName(validName);
    const folderPrefix = parentId ? `folders/${parentId}` : 'root';
    const storagePath = `${folderPrefix}/${uniquePrefix}-${safeName}`;

    const { error: uploadError } = await client.storage
      .from(SUPABASE_BUCKET)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || undefined,
      });

    if (uploadError) throw uploadError;

    const { data, error: insertError } = await client
      .from('items')
      .insert({
        name: validName,
        type: 'file',
        parent_id: parentId,
        storage_path: storagePath,
        file_url: null,
        mime_type: file.type || null,
        size_bytes: file.size,
      })
      .select('*')
      .single();

    if (insertError) {
      await client.storage.from(SUPABASE_BUCKET).remove([storagePath]);
      throw insertError;
    }

    return data as DriveItem;
  },

  async renameItem(id, newName) {
    const client = getClient();
    const validName = validateItemName(newName);
    const { data, error } = await client
      .from('items')
      .update({ name: validName })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data as DriveItem;
  },

  async deleteItem(item, allItems) {
    const client = getClient();

    if (item.type === 'folder') {
      const idsToRemove = new Set(collectDescendantIds(item.id, allItems));
      const storagePaths = allItems
        .filter((candidate) => idsToRemove.has(candidate.id) && candidate.type === 'file' && candidate.storage_path)
        .map((candidate) => candidate.storage_path as string);

      if (storagePaths.length > 0) {
        const { error: storageError } = await client.storage
          .from(SUPABASE_BUCKET)
          .remove(storagePaths);
        if (storageError) throw storageError;
      }
    } else if (item.storage_path) {
      const { error: storageError } = await client.storage
        .from(SUPABASE_BUCKET)
        .remove([item.storage_path]);
      if (storageError) throw storageError;
    }

    const { error } = await client.from('items').delete().eq('id', item.id);
    if (error) throw error;
  },

  async getFileViewUrl(item) {
    if (!item.storage_path) {
      throw new Error('File storage path is missing.');
    }
    const client = getClient();
    const { data, error } = await client.storage
      .from(SUPABASE_BUCKET)
      .createSignedUrl(item.storage_path, SIGNED_URL_EXPIRY_SECONDS);

    if (error) throw error;
    return data.signedUrl;
  },

  async downloadFile(item) {
    if (!item.storage_path) {
      throw new Error('File storage path is missing.');
    }
    const client = getClient();
    const { data, error } = await client.storage
      .from(SUPABASE_BUCKET)
      .createSignedUrl(item.storage_path, SIGNED_URL_EXPIRY_SECONDS, {
        download: item.name,
      });

    if (error) throw error;
    triggerBrowserDownload(data.signedUrl, item.name);
  },
};
