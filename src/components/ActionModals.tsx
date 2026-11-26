import { useEffect, useState, type FormEvent } from 'react';
import {
  Download,
  ExternalLink,
  FolderOpen,
  FolderPlus,
  Pencil,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { DriveItem } from '../types';

interface AddActionSheetProps {
  isOpen: boolean;
  folderName: string;
  onClose: () => void;
  onNewFolder: () => void;
  onUploadFiles: () => void;
}

export function AddActionSheet({
  isOpen,
  folderName,
  onClose,
  onNewFolder,
  onUploadFiles,
}: AddActionSheetProps) {
  if (!isOpen) return null;

  return (
    <div className="backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Add to Digital Paithini">
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-header">
          <h2 className="sheet-title">Add to {folderName}</h2>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="sheet-actions">
          <button
            type="button"
            className="sheet-action-btn"
            onClick={() => {
              onClose();
              onUploadFiles();
            }}
          >
            <Upload size={20} color="var(--primary)" />
            <span>Upload Files</span>
          </button>

          <button
            type="button"
            className="sheet-action-btn"
            onClick={() => {
              onClose();
              onNewFolder();
            }}
          >
            <FolderPlus size={20} color="var(--folder-color)" />
            <span>Create New Folder</span>
          </button>
        </div>
      </div>
    </div>
  );
}

interface ItemActionSheetProps {
  item: DriveItem | null;
  onClose: () => void;
  onOpen: (item: DriveItem) => void;
  onDownload: (item: DriveItem) => void;
  onRename: (item: DriveItem) => void;
  onDelete: (item: DriveItem) => void;
}

export function ItemActionSheet({
  item,
  onClose,
  onOpen,
  onDownload,
  onRename,
  onDelete,
}: ItemActionSheetProps) {
  if (!item) return null;

  return (
    <div className="backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label={`Actions for ${item.name}`}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-header">
          <h2 className="sheet-title">{item.name}</h2>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="sheet-actions">
          <button
            type="button"
            className="sheet-action-btn"
            onClick={() => {
              onClose();
              onOpen(item);
            }}
          >
            {item.type === 'folder' ? <FolderOpen size={20} /> : <ExternalLink size={20} />}
            <span>{item.type === 'folder' ? 'Open Folder' : 'Open / View File'}</span>
          </button>

          {item.type === 'file' && (
            <button
              type="button"
              className="sheet-action-btn"
              onClick={() => {
                onClose();
                onDownload(item);
              }}
            >
              <Download size={20} />
              <span>Download File</span>
            </button>
          )}

          <button
            type="button"
            className="sheet-action-btn"
            onClick={() => {
              onClose();
              onRename(item);
            }}
          >
            <Pencil size={20} />
            <span>Rename</span>
          </button>

          <button
            type="button"
            className="sheet-action-btn danger"
            onClick={() => {
              onClose();
              onDelete(item);
            }}
          >
            <Trash2 size={20} />
            <span>Delete {item.type === 'folder' ? 'Folder' : 'File'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

interface NameModalProps {
  isOpen: boolean;
  title: string;
  label: string;
  initialValue: string;
  submitLabel: string;
  placeholder: string;
  onClose: () => void;
  onSubmit: (value: string) => Promise<void>;
}

export function NameModal({
  isOpen,
  title,
  label,
  initialValue,
  submitLabel,
  placeholder,
  onClose,
  onSubmit,
}: NameModalProps) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
      setError(null);
      setIsSaving(false);
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      await onSubmit(value);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-header">
          <h2 className="sheet-title">{title}</h2>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field-group">
            <label className="field-label" htmlFor="modal-name-input">
              {label}
            </label>
            <input
              id="modal-name-input"
              className="text-input"
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              autoFocus
              required
            />
          </div>

          {error && (
            <div className="error-banner" style={{ marginTop: 12 }} role="alert">
              <span>{error}</span>
            </div>
          )}

          <div className="modal-btn-row">
            <button type="button" className="secondary-btn" onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button type="submit" className="primary-btn" disabled={isSaving}>
              {isSaving ? 'Saving...' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface DeleteModalProps {
  item: DriveItem | null;
  childCount: number;
  onClose: () => void;
  onConfirm: (item: DriveItem) => Promise<void>;
}

export function DeleteModal({
  item,
  childCount,
  onClose,
  onConfirm,
}: DeleteModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!item) return null;

  async function handleConfirm() {
    if (!item) return;
    setIsDeleting(true);
    try {
      await onConfirm(item);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Confirm delete">
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-header">
          <h2 className="sheet-title">Delete {item.type === 'folder' ? 'Folder' : 'File'}?</h2>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <p style={{ margin: '0 0 8px', color: 'var(--text-secondary)', fontSize: '0.94rem' }}>
          This will permanently remove <strong>{item.name}</strong> for all Digital Paithini members.
        </p>

        {item.type === 'folder' && childCount > 0 && (
          <p style={{ margin: '0 0 8px', color: 'var(--danger)', fontSize: '0.88rem', fontWeight: 600 }}>
            Warning: {childCount} item{childCount === 1 ? '' : 's'} inside this folder will also be deleted.
          </p>
        )}

        <div className="modal-btn-row">
          <button type="button" className="secondary-btn" onClick={onClose} disabled={isDeleting}>
            Cancel
          </button>
          <button type="button" className="danger-btn" onClick={handleConfirm} disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
