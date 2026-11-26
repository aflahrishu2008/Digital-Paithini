import { Download, ExternalLink, X } from 'lucide-react';
import type { DriveItem } from '../types';
import { formatFileSize, getFileCategory } from '../utils/formatters';
import { FileIcon } from './FileIcon';

interface FilePreviewModalProps {
  item: DriveItem | null;
  viewUrl: string | null;
  isLoading: boolean;
  onClose: () => void;
  onDownload: (item: DriveItem) => void;
}

export function FilePreviewModal({
  item,
  viewUrl,
  isLoading,
  onClose,
  onDownload,
}: FilePreviewModalProps) {
  if (!item) return null;

  const category = getFileCategory(item.mime_type, item.name);
  const canEmbedInline = category === 'image' || category === 'pdf' || category === 'text';

  return (
    <div className="preview-backdrop" role="dialog" aria-modal="true" aria-label={item.name}>
      <div className="preview-topbar">
        <h2 className="preview-title">{item.name}</h2>
        <div className="preview-actions">
          {viewUrl && (
            <a
              className="preview-icon-btn"
              href={viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open in new tab"
            >
              <ExternalLink size={17} />
              <span>Open</span>
            </a>
          )}
          <button
            type="button"
            className="preview-icon-btn"
            onClick={() => onDownload(item)}
            aria-label="Download file"
          >
            <Download size={17} />
            <span>Save</span>
          </button>
          <button
            type="button"
            className="preview-icon-btn"
            onClick={onClose}
            aria-label="Close preview"
          >
            <X size={19} />
          </button>
        </div>
      </div>

      <div className="preview-body" onClick={onClose}>
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isLoading && <div className="spinner" style={{ borderTopColor: '#ffffff' }} />}

          {!isLoading && viewUrl && category === 'image' && (
            <img className="preview-image" src={viewUrl} alt={item.name} />
          )}

          {!isLoading && viewUrl && (category === 'pdf' || category === 'text') && (
            <iframe
              className="preview-frame"
              src={viewUrl}
              title={item.name}
            />
          )}

          {!isLoading && (!viewUrl || !canEmbedInline) && (
            <div className="preview-fallback-card">
              <FileIcon mimeType={item.mime_type} fileName={item.name} />
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '1rem' }}>{item.name}</h3>
                <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                  {formatFileSize(item.size_bytes) || 'Document'}
                </p>
              </div>
              <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
                Preview is not available for this file format directly in the browser. Download or open it in another app.
              </p>
              <div style={{ display: 'flex', gap: 10, width: '100%', marginTop: 4 }}>
                {viewUrl && (
                  <a
                    className="secondary-btn"
                    style={{ flex: 1, textDecoration: 'none' }}
                    href={viewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink size={16} />
                    <span>Open</span>
                  </a>
                )}
                <button
                  type="button"
                  className="primary-btn"
                  style={{ flex: 1 }}
                  onClick={() => onDownload(item)}
                >
                  <Download size={16} />
                  <span>Download</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
