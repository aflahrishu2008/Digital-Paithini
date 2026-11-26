export type ItemType = 'folder' | 'file';

export interface DriveItem {
  id: string;
  name: string;
  type: ItemType;
  parent_id: string | null;
  storage_path: string | null;
  file_url: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthMember {
  id: string;
  username: string;
  email: string;
}

export type FileCategory = 'image' | 'pdf' | 'doc' | 'sheet' | 'text' | 'other';

export interface DriveService {
  readonly mode: 'supabase' | 'local-preview';
  getSession(): Promise<AuthMember | null>;
  onAuthStateChange(callback: (member: AuthMember | null) => void): () => void;
  login(username: string, password: string): Promise<AuthMember>;
  logout(): Promise<void>;
  listAllItems(): Promise<DriveItem[]>;
  subscribeToChanges(onChange: () => void): () => void;
  createFolder(name: string, parentId: string | null): Promise<DriveItem>;
  uploadFile(file: File, parentId: string | null): Promise<DriveItem>;
  renameItem(id: string, newName: string): Promise<DriveItem>;
  deleteItem(item: DriveItem, allItems: DriveItem[]): Promise<void>;
  getFileViewUrl(item: DriveItem): Promise<string>;
  downloadFile(item: DriveItem): Promise<void>;
}
