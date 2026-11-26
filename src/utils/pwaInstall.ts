import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let initialized = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

export function isRunningStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    nav.standalone === true
  );
}

export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function initPwaInstallListener(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notify();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notify();
  });
}

export function usePwaInstall() {
  const [canNativeInstall, setCanNativeInstall] = useState(() => Boolean(deferredPrompt));
  const [isInstalled, setIsInstalled] = useState(() => isRunningStandalone());

  useEffect(() => {
    initPwaInstallListener();

    const sync = () => {
      setCanNativeInstall(Boolean(deferredPrompt));
      setIsInstalled(isRunningStandalone());
    };

    listeners.add(sync);
    const media = window.matchMedia?.('(display-mode: standalone)');
    media?.addEventListener?.('change', sync);
    sync();

    return () => {
      listeners.delete(sync);
      media?.removeEventListener?.('change', sync);
    };
  }, []);

  async function triggerInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!deferredPrompt) return 'unavailable';
    const promptEvent = deferredPrompt;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') {
      deferredPrompt = null;
      notify();
    }
    return outcome;
  }

  return {
    isInstalled,
    canNativeInstall,
    isIos: isIosDevice(),
    triggerInstall,
  };
}
