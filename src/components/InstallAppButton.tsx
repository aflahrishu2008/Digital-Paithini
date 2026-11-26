import { useState } from 'react';
import { Download, MoreVertical, Share, Smartphone, X } from 'lucide-react';
import { usePwaInstall } from '../utils/pwaInstall';

interface InstallAppButtonProps {
  variant: 'header' | 'card';
}

export function InstallAppButton({ variant }: InstallAppButtonProps) {
  const { isInstalled, isIos, triggerInstall } = usePwaInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) return null;

  async function handleClick() {
    const outcome = await triggerInstall();
    if (outcome === 'unavailable') {
      setShowGuide(true);
    }
  }

  return (
    <>
      {variant === 'header' ? (
        <button
          type="button"
          className="install-header-btn"
          onClick={handleClick}
          aria-label="Install Digital Paithini app"
        >
          <Download size={15} />
          <span>Install</span>
        </button>
      ) : (
        <button
          type="button"
          className="install-card-btn"
          onClick={handleClick}
        >
          <Smartphone size={18} />
          <span>Install Digital Paithini App</span>
        </button>
      )}

      {showGuide && (
        <div
          className="backdrop"
          onClick={() => setShowGuide(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Install Digital Paithini App"
        >
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-header">
              <h2 className="sheet-title">Install Digital Paithini App</h2>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowGuide(false)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {isIos ? (
              <ol className="install-steps">
                <li>
                  Tap the <strong>Share</strong> icon (<Share size={15} style={{ verticalAlign: 'text-bottom' }} />) in Safari&apos;s toolbar.
                </li>
                <li>
                  Scroll down and tap <strong>Add to Home Screen</strong>.
                </li>
                <li>
                  Tap <strong>Add</strong> to open Digital Paithini like a native app.
                </li>
              </ol>
            ) : (
              <ol className="install-steps">
                <li>
                  Open your browser menu (<MoreVertical size={15} style={{ verticalAlign: 'text-bottom' }} /> in Chrome or Edge).
                </li>
                <li>
                  Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.
                </li>
                <li>
                  Confirm <strong>Install</strong> to add the Digital Paithini icon to your home screen.
                </li>
              </ol>
            )}

            <button
              type="button"
              className="primary-btn"
              style={{ marginTop: 16 }}
              onClick={() => setShowGuide(false)}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
