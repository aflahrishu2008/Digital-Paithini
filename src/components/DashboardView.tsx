import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Download,
  Folder,
  FolderHeart,
  FolderPlus,
  LogOut,
  MoreVertical,
  Plus,
  Search,
  Upload,
  X,
} from 'lucide-react';
import type { AuthMember, DriveItem } from '../types';
import {
  buildBreadcrumbs,
  collectDescendantIds,
  filterDriveItems,
  formatFileSize,
  formatShortDate,
  sortDriveItems,
} from '../utils/formatters';
import {
  AddActionSheet,
  DeleteModal,
  ItemActionSheet,
  NameModal,
} from './ActionModals';
import { FileIcon } from './FileIcon';
import { FilePreviewModal } from './FilePreviewModal';

interface DashboardViewProps {
  member: AuthMember;
  mode: 'supabase' | 'local-preview';
  items: DriveItem[];
  isLoading: boolean;
  onLogout: () => Promise<void>;
  onCreateFolder: (name: string, parentId: string | null) => Promise<void>;
  onUploadFiles: (files: FileList, parentId: string | null) => Promise<void>;
  onRenameItem: (id: string, newName: string) => Promise<void>;
  onDeleteItem: (item: DriveItem) => Promise<void>;
  onGetFileViewUrl: (item: DriveItem) => Promise<string>;
  onDownloadFile: (item: DriveItem) => Promise<void>;
}

const ACCEPTED_FILE_TYPES =
  '.pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.xls,.xlsx,.csv,.txt,.ppt,.pptx,application/pdf,image/*';

export function DashboardView({
  member,
  mode,
  items,
  isLoading,
  onLogout,
  onCreateFolder,
  onUploadFiles,
  onRenameItem,
  onDeleteItem,
  onGetFileViewUrl,
  onDownloadFile,
}: DashboardViewProps) {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [actionItem, setActionItem] = useState<DriveItem | null>(null);
  const [renameTarget, setRenameTarget] = useState<DriveItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DriveItem | null>(null);
  const [previewItem, setPreviewItem] = useState<DriveItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const folderMap = useMemo(
    () => new Map(items.filter((i) => i.type === 'folder').map((f) => [f.id, f])),
    [items]
  );

  const breadcrumbs = useMemo(
    () => buildBreadcrumbs(currentFolderId, items),
    [currentFolderId, items]
  );

  const currentFolderName =
    breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].name : 'Shared Space';

  const childCountByFolder = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      if (item.parent_id) {
        counts.set(item.parent_id, (counts.get(item.parent_id) ?? 0) + 1);
      }
    }
    return counts;
  }, [items]);

  const currentFolders = useMemo(
    () =>
      sortDriveItems(
        items.filter((i) => i.type === 'folder' && i.parent_id === currentFolderId)
      ),
    [items, currentFolderId]
  );

  const currentFiles = useMemo(
    () =>
      sortDriveItems(
        items.filter((i) => i.type === 'file' && i.parent_id === currentFolderId)
      ),
    [items, currentFolderId]
  );

  const recentFiles = useMemo(() => {
    return [...items]
      .filter((i) => i.type === 'file')
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .slice(0, 8);
  }, [items]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return sortDriveItems(filterDriveItems(items, searchQuery));
  }, [items, searchQuery]);

  const deleteDescendantCount = useMemo(() => {
    if (!deleteTarget || deleteTarget.type !== 'folder') return 0;
    return Math.max(0, collectDescendantIds(deleteTarget.id, items).length - 1);
  }, [deleteTarget, items]);

  function getLocationLabel(parentId: string | null): string {
    if (!parentId) return 'Home';
    return folderMap.get(parentId)?.name ?? 'Folder';
  }

  async function handleOpenItem(item: DriveItem) {
    if (item.type === 'folder') {
      setSearchQuery('');
      setCurrentFolderId(item.id);
      return;
    }

    setPreviewItem(item);
    setPreviewUrl(null);
    setIsPreviewLoading(true);
    try {
      const url = await onGetFileViewUrl(item);
      setPreviewUrl(url);
    } finally {
      setIsPreviewLoading(false);
    }
  }

  function handleClosePreview() {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewItem(null);
    setPreviewUrl(null);
  }

  function triggerFilePicker() {
    fileInputRef.current?.click();
  }

  async function handleFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      await onUploadFiles(files, currentFolderId);
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  }

  function handleGoBack() {
    if (breadcrumbs.length <= 1) {
      setCurrentFolderId(null);
    } else {
      setCurrentFolderId(breadcrumbs[breadcrumbs.length - 2].id);
    }
  }

  const isSearching = searchQuery.trim().length > 0;
  const searchFolders = searchResults.filter((i) => i.type === 'folder');
  const searchFiles = searchResults.filter((i) => i.type === 'file');

  return (
    <div className="app-shell">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_FILE_TYPES}
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />

      <header className="top-bar">
        <div className="top-bar-row">
          <div className="app-identity">
            <div className="app-badge-icon" aria-hidden="true">
              <FolderHeart size={20} />
            </div>
            <div className="app-name-wrap">
              <h1 className="app-name">Digital Paithini</h1>
              <div className="member-meta">
                <span>@{member.username}</span>
                <span className={`mode-pill ${mode === 'local-preview' ? 'preview' : ''}`}>
                  {mode === 'supabase' ? 'Shared Cloud' : 'Local Preview'}
                </span>
              </div>
            </div>
          </div>

          <button type="button" className="logout-btn" onClick={onLogout}>
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>

        <div className="search-bar-wrap">
          <Search size={18} className="search-icon" aria-hidden="true" />
          <input
            type="search"
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search folders and files..."
            aria-label="Search folders and files"
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              <X size={17} />
            </button>
          )}
        </div>
      </header>

      <main className="dashboard-main">
        {!isSearching && currentFolderId && (
          <nav className="breadcrumb-bar" aria-label="Folder navigation">
            <button
              type="button"
              className="back-btn"
              onClick={handleGoBack}
              aria-label="Go back"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="breadcrumb-list">
              <button
                type="button"
                className="crumb-btn"
                onClick={() => setCurrentFolderId(null)}
              >
                Home
              </button>
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <span
                    key={crumb.id}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    <ChevronRight size={14} color="var(--text-muted)" />
                    <button
                      type="button"
                      className={`crumb-btn ${isLast ? 'active' : ''}`}
                      onClick={() => setCurrentFolderId(crumb.id)}
                    >
                      {crumb.name}
                    </button>
                  </span>
                );
              })}
            </div>
          </nav>
        )}

        {isLoading ? (
          <div className="empty-state">
            <div className="spinner" />
            <p>Loading shared folders and files...</p>
          </div>
        ) : isSearching ? (
          <>
            <section>
              <div className="section-header">
                <h2 className="section-title">Search Results</h2>
                <span className="section-count">
                  {searchResults.length} match{searchResults.length === 1 ? '' : 'es'}
                </span>
              </div>

              {searchResults.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <Search size={22} />
                  </div>
                  <h3>No matches found</h3>
                  <p>No folders or files match &ldquo;{searchQuery}&rdquo;.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {searchFolders.length > 0 && (
                    <div className="folder-grid">
                      {searchFolders.map((folder) => (
                        <div key={folder.id} className="folder-card">
                          <button
                            type="button"
                            className="folder-card-main"
                            onClick={() => handleOpenItem(folder)}
                          >
                            <div className="folder-icon-box" aria-hidden="true">
                              <Folder size={20} />
                            </div>
                            <div className="folder-text">
                              <span className="item-name">{folder.name}</span>
                              <span className="item-sub">
                                In {getLocationLabel(folder.parent_id)}
                              </span>
                            </div>
                          </button>
                          <button
                            type="button"
                            className="more-btn"
                            onClick={() => setActionItem(folder)}
                            aria-label={`Actions for ${folder.name}`}
                          >
                            <MoreVertical size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchFiles.length > 0 && (
                    <div className="file-list">
                      {searchFiles.map((file) => (
                        <div key={file.id} className="file-row">
                          <button
                            type="button"
                            className="file-row-main"
                            onClick={() => handleOpenItem(file)}
                          >
                            <FileIcon mimeType={file.mime_type} fileName={file.name} />
                            <div className="folder-text">
                              <span className="item-name">{file.name}</span>
                              <span className="item-sub">
                                In {getLocationLabel(file.parent_id)}
                                {file.size_bytes !== null ? ` • ${formatFileSize(file.size_bytes)}` : ''}
                              </span>
                            </div>
                          </button>
                          <div className="file-row-actions">
                            <button
                              type="button"
                              className="more-btn"
                              onClick={() => onDownloadFile(file)}
                              aria-label={`Download ${file.name}`}
                            >
                              <Download size={18} />
                            </button>
                            <button
                              type="button"
                              className="more-btn"
                              onClick={() => setActionItem(file)}
                              aria-label={`Actions for ${file.name}`}
                            >
                              <MoreVertical size={18} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          </>
        ) : (
          <>
            {/* Folders Section */}
            <section>
              <div className="section-header">
                <h2 className="section-title">
                  {currentFolderId ? 'Subfolders' : 'Folders'}
                </h2>
                <span className="section-count">{currentFolders.length}</span>
              </div>

              {currentFolders.length > 0 ? (
                <div className="folder-grid">
                  {currentFolders.map((folder) => {
                    const count = childCountByFolder.get(folder.id) ?? 0;
                    return (
                      <div key={folder.id} className="folder-card">
                        <button
                          type="button"
                          className="folder-card-main"
                          onClick={() => handleOpenItem(folder)}
                        >
                          <div className="folder-icon-box" aria-hidden="true">
                            <Folder size={20} />
                          </div>
                          <div className="folder-text">
                            <span className="item-name">{folder.name}</span>
                            <span className="item-sub">
                              {count} {count === 1 ? 'item' : 'items'}
                            </span>
                          </div>
                        </button>
                        <button
                          type="button"
                          className="more-btn"
                          onClick={() => setActionItem(folder)}
                          aria-label={`Actions for ${folder.name}`}
                        >
                          <MoreVertical size={18} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                !currentFolderId && (
                  <div className="empty-state">
                    <div className="empty-state-icon">
                      <FolderPlus size={22} />
                    </div>
                    <h3>No folders yet</h3>
                    <p>Create your first shared folder to organize group files.</p>
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() => setIsNewFolderOpen(true)}
                    >
                      <FolderPlus size={17} />
                      <span>New Folder</span>
                    </button>
                  </div>
                )
              )}
            </section>

            {/* Files inside current folder */}
            {currentFolderId ? (
              <section>
                <div className="section-header">
                  <h2 className="section-title">Files</h2>
                  <span className="section-count">{currentFiles.length}</span>
                </div>

                {currentFiles.length > 0 ? (
                  <div className="file-list">
                    {currentFiles.map((file) => (
                      <div key={file.id} className="file-row">
                        <button
                          type="button"
                          className="file-row-main"
                          onClick={() => handleOpenItem(file)}
                        >
                          <FileIcon mimeType={file.mime_type} fileName={file.name} />
                          <div className="folder-text">
                            <span className="item-name">{file.name}</span>
                            <span className="item-sub">
                              {formatFileSize(file.size_bytes)}
                              {file.size_bytes !== null ? ' • ' : ''}
                              {formatShortDate(file.updated_at)}
                            </span>
                          </div>
                        </button>
                        <div className="file-row-actions">
                          <button
                            type="button"
                            className="more-btn"
                            onClick={() => onDownloadFile(file)}
                            aria-label={`Download ${file.name}`}
                          >
                            <Download size={18} />
                          </button>
                          <button
                            type="button"
                            className="more-btn"
                            onClick={() => setActionItem(file)}
                            aria-label={`Actions for ${file.name}`}
                          >
                            <MoreVertical size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  currentFolders.length === 0 && (
                    <div className="empty-state">
                      <div className="empty-state-icon">
                        <Upload size={22} />
                      </div>
                      <h3>This folder is empty</h3>
                      <p>Upload PDFs, photos, or documents for everyone to view and download.</p>
                      <div className="empty-actions">
                        <button
                          type="button"
                          className="primary-btn"
                          style={{ width: 'auto' }}
                          onClick={triggerFilePicker}
                        >
                          <Upload size={17} />
                          <span>Upload File</span>
                        </button>
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() => setIsNewFolderOpen(true)}
                        >
                          <FolderPlus size={17} />
                          <span>New Folder</span>
                        </button>
                      </div>
                    </div>
                  )
                )}
              </section>
            ) : (
              <>
                {currentFiles.length > 0 && (
                  <section>
                    <div className="section-header">
                      <h2 className="section-title">Root Files</h2>
                      <span className="section-count">{currentFiles.length}</span>
                    </div>
                    <div className="file-list">
                      {currentFiles.map((file) => (
                        <div key={file.id} className="file-row">
                          <button
                            type="button"
                            className="file-row-main"
                            onClick={() => handleOpenItem(file)}
                          >
                            <FileIcon mimeType={file.mime_type} fileName={file.name} />
                            <div className="folder-text">
                              <span className="item-name">{file.name}</span>
                              <span className="item-sub">
                                {formatFileSize(file.size_bytes)}
                                {file.size_bytes !== null ? ' • ' : ''}
                                {formatShortDate(file.updated_at)}
                              </span>
                            </div>
                          </button>
                          <div className="file-row-actions">
                            <button
                              type="button"
                              className="more-btn"
                              onClick={() => onDownloadFile(file)}
                              aria-label={`Download ${file.name}`}
                            >
                              <Download size={18} />
                            </button>
                            <button
                              type="button"
                              className="more-btn"
                              onClick={() => setActionItem(file)}
                              aria-label={`Actions for ${file.name}`}
                            >
                              <MoreVertical size={18} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <section>
                  <div className="section-header">
                    <h2 className="section-title">Recent Files</h2>
                    <span className="section-count">{recentFiles.length}</span>
                  </div>

                  {recentFiles.length > 0 ? (
                    <div className="file-list">
                      {recentFiles.map((file) => (
                        <div key={file.id} className="file-row">
                          <button
                            type="button"
                            className="file-row-main"
                            onClick={() => handleOpenItem(file)}
                          >
                            <FileIcon mimeType={file.mime_type} fileName={file.name} />
                            <div className="folder-text">
                              <span className="item-name">{file.name}</span>
                              <span className="item-sub">
                                {getLocationLabel(file.parent_id)}
                                {file.size_bytes !== null ? ` • ${formatFileSize(file.size_bytes)}` : ''}
                                {` • ${formatShortDate(file.updated_at)}`}
                              </span>
                            </div>
                          </button>
                          <div className="file-row-actions">
                            <button
                              type="button"
                              className="more-btn"
                              onClick={() => onDownloadFile(file)}
                              aria-label={`Download ${file.name}`}
                            >
                              <Download size={18} />
                            </button>
                            <button
                              type="button"
                              className="more-btn"
                              onClick={() => setActionItem(file)}
                              aria-label={`Actions for ${file.name}`}
                            >
                              <MoreVertical size={18} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <div className="empty-state-icon">
                        <Upload size={22} />
                      </div>
                      <h3>No files uploaded yet</h3>
                      <p>Tap + Add below to upload a PDF, photo, or document to Digital Paithini.</p>
                    </div>
                  )}
                </section>
              </>
            )}
          </>
        )}
      </main>

      <button
        type="button"
        className="fab"
        onClick={() => setIsAddSheetOpen(true)}
        disabled={isUploading}
        aria-label="Add folder or upload file"
      >
        <Plus size={20} />
        <span>{isUploading ? 'Uploading...' : 'Add'}</span>
      </button>

      <AddActionSheet
        isOpen={isAddSheetOpen}
        folderName={currentFolderName}
        onClose={() => setIsAddSheetOpen(false)}
        onNewFolder={() => setIsNewFolderOpen(true)}
        onUploadFiles={triggerFilePicker}
      />

      <ItemActionSheet
        item={actionItem}
        onClose={() => setActionItem(null)}
        onOpen={handleOpenItem}
        onDownload={onDownloadFile}
        onRename={(item) => setRenameTarget(item)}
        onDelete={(item) => setDeleteTarget(item)}
      />

      <NameModal
        isOpen={isNewFolderOpen}
        title="New Folder"
        label="Folder name"
        initialValue=""
        submitLabel="Create"
        placeholder="e.g. Budget 2026"
        onClose={() => setIsNewFolderOpen(false)}
        onSubmit={(name) => onCreateFolder(name, currentFolderId)}
      />

      <NameModal
        isOpen={renameTarget !== null}
        title={`Rename ${renameTarget?.type === 'folder' ? 'Folder' : 'File'}`}
        label="New name"
        initialValue={renameTarget?.name ?? ''}
        submitLabel="Save"
        placeholder="Enter name"
        onClose={() => setRenameTarget(null)}
        onSubmit={async (newName) => {
          if (renameTarget) {
            await onRenameItem(renameTarget.id, newName);
          }
        }}
      />

      <DeleteModal
        item={deleteTarget}
        childCount={deleteDescendantCount}
        onClose={() => setDeleteTarget(null)}
        onConfirm={onDeleteItem}
      />

      <FilePreviewModal
        item={previewItem}
        viewUrl={previewUrl}
        isLoading={isPreviewLoading}
        onClose={handleClosePreview}
        onDownload={onDownloadFile}
      />
    </div>
  );
}
