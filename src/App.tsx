import { useCallback, useEffect, useState } from 'react';
import { DashboardView } from './components/DashboardView';
import { LoginView } from './components/LoginView';
import { driveService } from './services/driveService';
import type { AuthMember, DriveItem } from './types';

interface ToastState {
  message: string;
  isError: boolean;
}

export function App() {
  const [member, setMember] = useState<AuthMember | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [items, setItems] = useState<DriveItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string, isError = false) => {
    setToast({ message, isError });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const loadItems = useCallback(async () => {
    setIsLoadingItems(true);
    try {
      const nextItems = await driveService.listAllItems();
      setItems(nextItems);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load shared files.', true);
    } finally {
      setIsLoadingItems(false);
    }
  }, [showToast]);

  useEffect(() => {
    let mounted = true;

    driveService
      .getSession()
      .then((sessionMember) => {
        if (!mounted) return;
        setMember(sessionMember);
      })
      .catch(() => {
        if (!mounted) return;
        setMember(null);
      })
      .finally(() => {
        if (mounted) setIsCheckingAuth(false);
      });

    const unsubscribe = driveService.onAuthStateChange((nextMember) => {
      setMember(nextMember);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!member) {
      setItems([]);
      return;
    }

    void loadItems();
    const unsubscribe = driveService.subscribeToChanges(() => {
      void loadItems();
    });

    return unsubscribe;
  }, [member, loadItems]);

  async function handleLogin(username: string, password: string) {
    const loggedInMember = await driveService.login(username, password);
    setMember(loggedInMember);
  }

  async function handleLogout() {
    try {
      await driveService.logout();
      setMember(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Logout failed.', true);
    }
  }

  async function handleCreateFolder(name: string, parentId: string | null) {
    await driveService.createFolder(name, parentId);
    await loadItems();
    showToast(`Folder "${name.trim()}" created`);
  }

  async function handleUploadFiles(fileList: FileList, parentId: string | null) {
    const files = Array.from(fileList);
    try {
      for (const file of files) {
        await driveService.uploadFile(file, parentId);
      }
      await loadItems();
      showToast(
        files.length === 1 ? `Uploaded "${files[0].name}"` : `Uploaded ${files.length} files`
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'File upload failed.', true);
    }
  }

  async function handleRenameItem(id: string, newName: string) {
    await driveService.renameItem(id, newName);
    await loadItems();
    showToast('Renamed successfully');
  }

  async function handleDeleteItem(item: DriveItem) {
    try {
      await driveService.deleteItem(item, items);
      await loadItems();
      showToast(`Deleted "${item.name}"`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed.', true);
    }
  }

  async function handleGetFileViewUrl(item: DriveItem): Promise<string> {
    try {
      return await driveService.getFileViewUrl(item);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to open file.', true);
      throw err;
    }
  }

  async function handleDownloadFile(item: DriveItem) {
    try {
      await driveService.downloadFile(item);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Download failed.', true);
    }
  }

  return (
    <>
      {isCheckingAuth ? (
        <div className="center-screen">
          <div className="spinner" />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>
            Opening Digital Paithini...
          </span>
        </div>
      ) : member ? (
        <DashboardView
          member={member}
          mode={driveService.mode}
          items={items}
          isLoading={isLoadingItems}
          onLogout={handleLogout}
          onCreateFolder={handleCreateFolder}
          onUploadFiles={handleUploadFiles}
          onRenameItem={handleRenameItem}
          onDeleteItem={handleDeleteItem}
          onGetFileViewUrl={handleGetFileViewUrl}
          onDownloadFile={handleDownloadFile}
        />
      ) : (
        <LoginView mode={driveService.mode} onLogin={handleLogin} />
      )}

      {toast && (
        <div className={`toast ${toast.isError ? 'error' : ''}`} role="status" aria-live="polite">
          {toast.message}
        </div>
      )}
    </>
  );
}

export default App;
