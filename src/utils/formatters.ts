import type { DriveItem, FileCategory } from '../types';

export const DEFAULT_AUTH_DOMAIN = 'digitalpaithini.local';

export function normalizeUsernameToEmail(
  rawUsername: string,
  domain: string = DEFAULT_AUTH_DOMAIN
): string {
  const cleaned = rawUsername.trim().toLowerCase();
  if (!cleaned) {
    throw new Error('Please enter your username.');
  }
  if (cleaned.includes('@')) {
    return cleaned;
  }
  const safeLocalPart = cleaned.replace(/\s+/g, '.');
  return `${safeLocalPart}@${domain}`;
}

export function extractDisplayUsername(emailOrUsername: string): string {
  const value = emailOrUsername.trim();
  const atIndex = value.indexOf('@');
  return atIndex > 0 ? value.slice(0, atIndex) : value;
}

export function sanitizeStorageFileName(fileName: string): string {
  const trimmed = fileName.trim() || 'file';
  return trimmed.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function validateItemName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Name cannot be empty.');
  }
  if (trimmed.length > 120) {
    throw new Error('Name must be 120 characters or fewer.');
  }
  if (/[\\/]/.test(trimmed)) {
    throw new Error('Name cannot contain / or \\ characters.');
  }
  return trimmed;
}

export function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes < 0 || Number.isNaN(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(1)} GB`;
}

export function formatShortDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const isSameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isSameDay) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function getFileCategory(mimeType: string | null, fileName: string): FileCategory {
  const mime = (mimeType ?? '').toLowerCase();
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';

  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
    return 'image';
  }
  if (mime === 'application/pdf' || ext === 'pdf') {
    return 'pdf';
  }
  if (
    mime.includes('wordprocessingml') ||
    mime === 'application/msword' ||
    ['doc', 'docx', 'odt', 'rtf'].includes(ext)
  ) {
    return 'doc';
  }
  if (
    mime.includes('spreadsheetml') ||
    mime === 'application/vnd.ms-excel' ||
    ['xls', 'xlsx', 'csv', 'ods'].includes(ext)
  ) {
    return 'sheet';
  }
  if (mime.startsWith('text/') || ['txt', 'md', 'json', 'log'].includes(ext)) {
    return 'text';
  }
  return 'other';
}

export function filterDriveItems(items: DriveItem[], query: string): DriveItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) => item.name.toLowerCase().includes(q));
}

export function collectDescendantIds(folderId: string, allItems: DriveItem[]): string[] {
  const ids: string[] = [folderId];
  const queue: string[] = [folderId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const item of allItems) {
      if (item.parent_id === current) {
        ids.push(item.id);
        if (item.type === 'folder') {
          queue.push(item.id);
        }
      }
    }
  }
  return ids;
}

export function buildBreadcrumbs(
  currentFolderId: string | null,
  allItems: DriveItem[]
): DriveItem[] {
  if (!currentFolderId) return [];
  const byId = new Map(allItems.map((item) => [item.id, item]));
  const trail: DriveItem[] = [];
  let cursor: string | null = currentFolderId;
  const visited = new Set<string>();

  while (cursor && !visited.has(cursor)) {
    visited.add(cursor);
    const folder = byId.get(cursor);
    if (!folder) break;
    trail.unshift(folder);
    cursor = folder.parent_id;
  }

  return trail;
}

export function sortDriveItems(items: DriveItem[]): DriveItem[] {
  return [...items].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'folder' ? -1 : 1;
    }
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
}
