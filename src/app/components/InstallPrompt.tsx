import { useState, useEffect, useCallback } from 'react';
import { Download, Share, Plus, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const INSTALLED_KEY = 'install-prompt-used';

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  );
}

function isIOSSafari(): boolean {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS|Chrome/.test(ua);
  return isIOS && isSafari;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [hidden, setHidden] = useState(true);
  const [iosGuideExpanded, setIosGuideExpanded] = useState(false);

  useEffect(() => {
    // Don't show if already installed or previously used
    if (isStandalone()) return;
    if (localStorage.getItem(INSTALLED_KEY)) return;

    setHidden(false);

    // Android/Chrome: listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // iOS Safari detection
    if (isIOSSafari()) {
      setIsIOS(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = useCallback(async () => {
    if (!deferredPrompt) return;
    localStorage.setItem(INSTALLED_KEY, '1');
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setHidden(true);
  }, [deferredPrompt]);

  const handleIOSGuideClick = useCallback(() => {
    if (iosGuideExpanded) {
      // Second tap = they've seen the steps, mark as used
      localStorage.setItem(INSTALLED_KEY, '1');
      setHidden(true);
    } else {
      setIosGuideExpanded(true);
    }
  }, [iosGuideExpanded]);

  const handleGenericClick = useCallback(() => {
    localStorage.setItem(INSTALLED_KEY, '1');
    setHidden(true);
  }, []);

  if (hidden) return null;

  // Determine which variant to show
  const showIOSGuide = isIOS;
  const showNativeInstall = !isIOS && !!deferredPrompt;
  const showGenericHint = !isIOS && !deferredPrompt;

  return (
    <div className="relative bg-white dark:bg-white/[0.08] rounded-2xl border border-gray-200 dark:border-white/[0.1] p-4 shadow-sm">
      {showIOSGuide ? (
        // iOS Safari guide
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <Download className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-gray-900 dark:text-white font-medium">Add to Home Screen</p>
              <p className="text-xs text-gray-500 dark:text-white/50">Quick access like a native app</p>
            </div>
          </div>

          <button
            onClick={handleIOSGuideClick}
            className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 dark:bg-blue-500 text-white rounded-xl text-sm font-medium active:scale-[0.98] transition-transform"
          >
            <span>{iosGuideExpanded ? 'Got it' : 'Show me how'}</span>
          </button>

          <div
            className="overflow-hidden transition-all duration-200"
            style={{
              display: 'grid',
              gridTemplateRows: iosGuideExpanded ? '1fr' : '0fr',
              opacity: iosGuideExpanded ? 1 : 0,
            }}
          >
            <div className="min-h-0">
                <div className="mt-3 space-y-2.5">
                  <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 dark:bg-white/[0.05] rounded-xl">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-blue-600 dark:text-blue-400">1</div>
                    <div className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-white/70">
                      <span>Tap</span>
                      <Share className="w-4 h-4 text-blue-500" />
                      <span>in the toolbar below</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 dark:bg-white/[0.05] rounded-xl">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-blue-600 dark:text-blue-400">2</div>
                    <div className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-white/70">
                      <span>Scroll down, tap</span>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-200 dark:bg-white/10 rounded text-xs font-medium">
                        <Plus className="w-3 h-3" /> Add to Home Screen
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 dark:bg-white/[0.05] rounded-xl">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-blue-600 dark:text-blue-400">3</div>
                    <span className="text-sm text-gray-700 dark:text-white/70">Tap <span className="font-medium text-gray-900 dark:text-white">Add</span> to confirm</span>
                  </div>
                </div>
            </div>
          </div>
        </div>
      ) : showNativeInstall ? (
        // Android/Chrome native prompt
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <Download className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-gray-900 dark:text-white font-medium">Add to Home Screen</p>
              <p className="text-xs text-gray-500 dark:text-white/50">Quick access like a native app</p>
            </div>
          </div>
          <button
            onClick={handleInstallClick}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 dark:bg-blue-500 text-white rounded-xl text-sm font-medium active:scale-[0.98] transition-transform"
          >
            <Download className="w-4 h-4" />
            <span>Install</span>
          </button>
        </div>
      ) : showGenericHint ? (
        // Generic fallback (desktop browsers, non-Safari iOS browsers, etc.)
        <button
          onClick={handleGenericClick}
          className="w-full flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0">
            <Smartphone className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="min-w-0 text-left">
            <p className="text-sm text-gray-900 dark:text-white font-medium">Add Dāimūn to your phone</p>
            <p className="text-xs text-gray-500 dark:text-white/50">Open on mobile &amp; add to Home Screen for the best experience</p>
          </div>
        </button>
      ) : null}
    </div>
  );
}