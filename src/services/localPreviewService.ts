import type { AuthMember, DriveItem, DriveService } from '../types';
import {
  collectDescendantIds,
  extractDisplayUsername,
  validateItemName,
} from '../utils/formatters';

const ITEMS_STORAGE_KEY = 'digital-paithini-preview-items-v1';
const SESSION_STORAGE_KEY = 'digital-paithini-preview-session-v1';

// In-memory blob store for files uploaded during a local preview session
const previewBlobStore = new Map<string, Blob>();
const authListeners = new Set<(member: AuthMember | null) => void>();
const itemListeners = new Set<() => void>();

const PREVIEW_USERS: Record<string, string> = {
  member1: 'paithini123',
  member2: 'paithini123',
  member3: 'paithini123',
  member4: 'paithini123',
  member5: 'paithini123',
};

function createInitialPreviewItems(): DriveItem[] {
  const now = new Date().toISOString();
  const folderNames = ['Minutes', 'Reports', 'Members List', 'Books', 'Sahithyotsav'];
  return folderNames.map((name, index) => ({
    id: `preview-folder-${index + 1}`,
    name,
    type: 'folder',
    parent_id: null,
    storage_path: null,
    file_url: null,
    mime_type: null,
    size_bytes: null,
    created_by: 'preview-member1',
    created_at: now,
    updated_at: now,
  }));
}

function readPreviewItems(): DriveItem[] {
  const raw = localStorage.getItem(ITEMS_STORAGE_KEY);
  if (!raw) {
    const initial = createInitialPreviewItems();
    localStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(raw) as DriveItem[];
  } catch {
    const initial = createInitialPreviewItems();
    localStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
}

function writePreviewItems(items: DriveItem[]) {
  localStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify(items));
  itemListeners.forEach((listener) => listener());
}

function readPreviewSession(): AuthMember | null {
  const raw = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthMember;
  } catch {
    return null;
  }
}

function buildSamplePreviewTextBlob(item: DriveItem): Blob {
  return new Blob(
    [
      `Digital Paithini — Local Preview File\nName: ${item.name}\nUpdated: ${item.updated_at}\n\nConnect Supabase in .env for shared cloud storage across all 5 members.`,
    ],
    { type: item.mime_type || 'text/plain' }
  );
}

export const localPreviewDriveService: DriveService = {
  mode: 'local-preview',

  async getSession() {
    return readPreviewSession();
  },

  onAuthStateChange(callback) {
    authListeners.add(callback);
    return () => {
      authListeners.delete(callback);
    };
  },

  async login(username, password) {
    const normalized = extractDisplayUsername(username).toLowerCase();
    if (!normalized) {
      throw new Error('Please enter your username.');
    }
    if (!password) {
      throw new Error('Please enter your password.');
    }
    const expected = PREVIEW_USERS[normalized];
    if (!expected || expected !== password) {
      throw new Error('Invalid username or password.');
    }
    const member: AuthMember = {
      id: `preview-${normalized}`,
      username: normalized,
      email: `${normalized}@digitalpaithini.local`,
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(member));
    authListeners.forEach((cb) => cb(member));
    return member;
  },

  async logout() {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    authListeners.forEach((cb) => cb(null));
  },

  async listAllItems() {
    return readPreviewItems();
  },

  subscribeToChanges(onChange) {
    itemListeners.add(onChange);
    const onStorage = (event: StorageEvent) => {
      if (event.key === ITEMS_STORAGE_KEY) {
        onChange();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      itemListeners.delete(onChange);
      window.removeEventListener('storage', onStorage);
    };
  },

  async createFolder(name, parentId) {
    const validName = validateItemName(name);
    const now = new Date().toISOString();
    const session = readPreviewSession();
    const newFolder: DriveItem = {
      id: crypto.randomUUID(),
      name: validName,
      type: 'folder',
      parent_id: parentId,
      storage_path: null,
      file_url: null,
      mime_type: null,
      size_bytes: null,
      created_by: session?.id ?? null,
      created_at: now,
      updated_at: now,
    };
    const items = readPreviewItems();
    writePreviewItems([...items, newFolder]);
    return newFolder;
  },

  async uploadFile(file, parentId) {
    const validName = validateItemName(file.name);
    const now = new Date().toISOString();
    const session = readPreviewSession();
    const id = crypto.randomUUID();
    const storagePath = `preview/${id}-${validName}`;
    previewBlobStore.set(storagePath, file);

    const newFile: DriveItem = {
      id,
      name: validName,
      type: 'file',
      parent_id: parentId,
      storage_path: storagePath,
      file_url: null,
      mime_type: file.type || 'application/octet-stream',
      size_bytes: file.size,
      created_by: session?.id ?? null,
      created_at: now,
      updated_at: now,
    };
    const items = readPreviewItems();
    writePreviewItems([...items, newFile]);
    return newFile;
  },

  async renameItem(id, newName) {
    const validName = validateItemName(newName);
    const now = new Date().toISOString();
    const items = readPreviewItems();
    let updatedItem: DriveItem | null = null;
    const next = items.map((item) => {
      if (item.id !== id) return item;
      updatedItem = { ...item, name: validName, updated_at: now };
      return updatedItem;
    });
    if (!updatedItem) {
      throw new Error('Item not found.');
    }
    writePreviewItems(next);
    return updatedItem;
  },

  async deleteItem(item, allItems) {
    const idsToDelete =
      item.type === 'folder'
        ? new Set(collectDescendantIds(item.id, allItems))
        : new Set([item.id]);

    for (const candidate of allItems) {
      if (idsToDelete.has(candidate.id) && candidate.storage_path) {
        previewBlobStore.delete(candidate.storage_path);
      }
    }
    const items = readPreviewItems();
    writePreviewItems(items.filter((candidate) => !idsToDelete.has(candidate.id)));
  },

  async getFileViewUrl(item) {
    const blob =
      (item.storage_path ? previewBlobStore.get(item.storage_path) : undefined) ??
      buildSamplePreviewTextBlob(item);
    return URL.createObjectURL(blob);
  },

  async downloadFile(item) {
    const url = await this.getFileViewUrl(item);
    const link = document.createElement('a');
    link.href = url;
    link.download = item.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};
