import { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, BellOff, Check, X, ChevronDown, ChevronUp, Send, MapPin } from 'lucide-react';
import { Mosque } from '../App';
import { calculateIqamaTimes } from '../utils/iqamaCalculator';
import { timeToMinutes } from '../utils/prayerTimes';

interface NotificationPreferences {
  enabled: boolean;
  minutesBefore: number;
  prayers: {
    fajr: boolean;
    dhuhr: boolean;
    asr: boolean;
    maghrib: boolean;
    isha: boolean;
  };
  dismissed: boolean; // User explicitly dismissed the prompt
  mosqueId: string | null; // null = auto (first favorite or first in list)
}

const DEFAULT_PREFS: NotificationPreferences = {
  enabled: false,
  minutesBefore: 15,
  prayers: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true },
  dismissed: false,
  mosqueId: null,
};

const STORAGE_KEY = 'daimun-notification-prefs';
const NOTIFIED_KEY = 'daimun-notified-prayers'; // track what we've notified today

function loadPrefs(): NotificationPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULT_PREFS, ...JSON.parse(stored) };
  } catch {}
  return DEFAULT_PREFS;
}

function savePrefs(prefs: NotificationPreferences) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

// Track which prayers we've already notified for today to avoid duplicates
function getTodayNotifiedKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function getNotifiedPrayers(): Set<string> {
  try {
    const stored = localStorage.getItem(NOTIFIED_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      if (data.date === getTodayNotifiedKey()) {
        return new Set(data.prayers);
      }
    }
  } catch {}
  return new Set();
}

function markNotified(prayer: string) {
  const existing = getNotifiedPrayers();
  existing.add(prayer);
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify({
    date: getTodayNotifiedKey(),
    prayers: Array.from(existing),
  }));
}

/**
 * Minimal inline service-worker source used as a fallback when /sw.js
 * can't be fetched (e.g. Figma Make preview, certain CDN setups).
 */
const INLINE_SW_CODE = `
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(l=>{for(const c of l){if('focus' in c)return c.focus()}return self.clients.openWindow('/')}))});
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
`;

/** Wait for a ServiceWorkerRegistration to have an active worker (with timeout). */
function waitForActivation(reg: ServiceWorkerRegistration, ms = 5000): Promise<ServiceWorkerRegistration> {
  return new Promise((resolve) => {
    if (reg.active) { resolve(reg); return; }
    const sw = reg.installing || reg.waiting;
    if (!sw) { resolve(reg); return; }
    if (sw.state === 'activated') { resolve(reg); return; }
    const handler = () => {
      if (sw.state === 'activated' || sw.state === 'redundant') {
        sw.removeEventListener('statechange', handler);
        resolve(reg);
      }
    };
    sw.addEventListener('statechange', handler);
    setTimeout(() => { sw.removeEventListener('statechange', handler); resolve(reg); }, ms);
  });
}

/**
 * Ensure a service worker is registered.
 * Chrome requires a SW to show notifications — `new Notification()` throws TypeError.
 * Returns the ServiceWorkerRegistration if successful, null otherwise.
 *
 * Strategy:
 *  1. Re-use ANY existing active registration (any scope).
 *  2. Try registering /sw.js (file in /public).
 *  3. Fallback: register an inline blob-based SW (works in Chrome 119+).
 */
async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;

  // 1. Check for any existing active registration
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const reg of regs) {
      if (reg.active) return reg;
    }
    // If we found registrations but none are active yet, wait for the first one
    if (regs.length > 0) {
      const activated = await waitForActivation(regs[0]);
      if (activated.active) return activated;
    }
  } catch { /* getRegistrations not supported or blocked — continue */ }

  // 2. Try file-based registration (/public/sw.js → served at /sw.js)
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    const activated = await waitForActivation(reg);
    if (activated.active) return activated;
  } catch { /* file not found, scope mismatch, or blocked — continue */ }

  // 3. Fallback: inline blob SW (Chrome 119+, Firefox 120+)
  try {
    const blob = new Blob([INLINE_SW_CODE], { type: 'application/javascript' });
    const blobUrl = URL.createObjectURL(blob);
    try {
      const reg = await navigator.serviceWorker.register(blobUrl);
      const activated = await waitForActivation(reg);
      if (activated.active) return activated;
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  } catch { /* blob SW not supported — continue */ }

  return null;
}

/**
 * Show a notification — registers a SW if needed (Chrome requirement),
 * falls back to the Notification constructor (Safari / older desktop).
 */
async function showNotification(title: string, options: NotificationOptions): Promise<boolean> {
  try {
    // Try to get or register a service worker
    const reg = await ensureServiceWorker();
    if (reg?.active) {
      await reg.showNotification(title, options);
      return true;
    }
  } catch {
    // ServiceWorker not available or failed — fall through
  }

  // Fallback: direct Notification constructor (Safari, desktop browsers without SW support)
  try {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false;
    new Notification(title, options);
    return true;
  } catch {
    // Chrome throws TypeError here if no SW — already tried above, truly nothing left
    return false;
  }
}

/**
 * Hook that handles scheduling and firing browser notifications.
 * Reads prefs directly from localStorage every check cycle so it
 * always reflects the latest user settings without needing re-renders.
 */
export function useNotificationScheduler(
  mosques: Mosque[],
  favorites: Set<string>
) {
  useEffect(() => {
    // Quick exit: no mosques loaded yet
    if (mosques.length === 0) return;

    // Check if notifications are even supported
    if (typeof Notification === 'undefined') return;

    // Pre-register the service worker so it's ready when we need to fire
    const prefs = loadPrefs();
    if (prefs.enabled && Notification.permission === 'granted') {
      ensureServiceWorker();
    }

    const check = () => {
      // Re-read prefs from localStorage EVERY cycle so we always have fresh values
      const prefs = loadPrefs();

      if (!prefs.enabled) return;
      if (Notification.permission !== 'granted') return;

      // Pick the representative mosque: explicit choice → first favorite → first in list
      const representative = (prefs.mosqueId && mosques.find(m => m.id === prefs.mosqueId))
        || mosques.find(m => favorites.has(m.id))
        || mosques[0];
      if (!representative) return;

      const now = new Date();
      const currentTotalSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
      const notified = getNotifiedPrayers();

      const calculatedTimes = calculateIqamaTimes(
        representative.latitude,
        representative.longitude,
        representative.iqamaTimes,
        now,
        representative.calculationMethod || 'NorthAmerica',
        representative.asrMethod || 'Standard',
        representative.scheduledTimeChanges
      );

      const prayersToCheck: Array<{
        key: keyof typeof prefs.prayers;
        label: string;
        iqama: string;
      }> = [
        { key: 'fajr',    label: 'Fajr',    iqama: calculatedTimes.fajr.iqama },
        { key: 'dhuhr',   label: 'Dhuhr',   iqama: calculatedTimes.dhuhr.iqama },
        { key: 'asr',     label: 'Asr',     iqama: calculatedTimes.asr.iqama },
        { key: 'maghrib', label: 'Maghrib', iqama: calculatedTimes.maghrib.iqama },
        { key: 'isha',    label: 'Isha',    iqama: calculatedTimes.isha.iqama },
      ];

      for (const prayer of prayersToCheck) {
        if (!prefs.prayers[prayer.key]) continue;

        const notifKey = `${prayer.key}-${prefs.minutesBefore}`;
        if (notified.has(notifKey)) continue;

        const iqamaMinutes = timeToMinutes(prayer.iqama);
        const notifyAtMinutes = iqamaMinutes - prefs.minutesBefore;
        const notifyAtSeconds = notifyAtMinutes * 60;

        // Fire if we're within a 90-second window AFTER the notification time
        // (allows for polling interval + slight delays)
        const diff = currentTotalSeconds - notifyAtSeconds;

        if (diff >= 0 && diff < 90) {
          showNotification(`${prayer.label} in ${prefs.minutesBefore} min`, {
            body: `Iqama at ${prayer.iqama} · ${representative.name}`,
            icon: '/favicon.ico',
            tag: `daimun-${prayer.key}`,
            silent: false,
          });
          markNotified(notifKey);
        }
      }
    };

    // Check immediately, then every 30 seconds
    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, [mosques, favorites]); // Only depends on external data, not prefs state
}

interface NotificationPromptProps {
  mosques: Mosque[];
  favorites: Set<string>;
  onDismissChange?: (dismissed: boolean) => void;
}

/**
 * The visible notification prompt/settings card.
 * Shows a one-time "Enable notifications?" prompt, then a compact settings card once enabled.
 */
export function NotificationPrompt({ mosques, favorites, onDismissChange }: NotificationPromptProps) {
  // Hide entirely on Chrome — Chrome requires a service worker for notifications
  // and SW registration is unreliable across preview/iframe/CDN environments.
  const isChrome = typeof navigator !== 'undefined' && /Chrome/.test(navigator.userAgent) && !/Edg/.test(navigator.userAgent);

  const [prefs, setPrefs] = useState<NotificationPreferences>(loadPrefs);
  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );
  const [expanded, setExpanded] = useState(false);
  const [justEnabled, setJustEnabled] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const updatePrefs = useCallback((updates: Partial<NotificationPreferences>) => {
    setPrefs(prev => {
      const next = { ...prev, ...updates };
      savePrefs(next);
      return next;
    });
  }, []);

  const handleEnable = async () => {
    setPermissionError(null);

    // Detect if we're in an iframe — Chrome blocks notification permission prompts in cross-origin iframes
    const isIframe = window.self !== window.top;

    try {
      const result = await Notification.requestPermission();
      setPermissionState(result);
      if (result === 'granted') {
        updatePrefs({ enabled: true });
        setJustEnabled(true);
        if (onDismissChange) onDismissChange(false);
        setTimeout(() => setJustEnabled(false), 2000);
        // Pre-register SW so it's ready for the first test/notification
        ensureServiceWorker();
      } else if (result === 'denied') {
        if (isIframe) {
          setPermissionError('Notifications are blocked in embedded previews. Open this app in its own browser tab to enable them.');
        } else {
          setPermissionError('Notifications were blocked. Check your browser\'s site settings to allow notifications for this site.');
        }
      }
    } catch {
      if (isIframe) {
        setPermissionError('Notifications are blocked in embedded previews. Open this app in its own browser tab to enable them.');
      } else {
        setPermissionError('Could not request notification permission. Try reloading the page.');
      }
    }
  };

  const handleDismiss = () => {
    updatePrefs({ dismissed: true });
    if (onDismissChange) {
      onDismissChange(true);
    }
  };

  const togglePrayer = (prayer: keyof typeof prefs.prayers) => {
    updatePrefs({
      prayers: { ...prefs.prayers, [prayer]: !prefs.prayers[prayer] },
    });
  };

  const handleTestNotification = async () => {
    setTestError(null);
    const representative = (prefs.mosqueId && mosques.find(m => m.id === prefs.mosqueId))
      || mosques.find(m => favorites.has(m.id))
      || mosques[0];
    const mosqueName = representative?.name || 'Your masjid';
    const success = await showNotification('Test Notification', {
      body: `Notifications are working! · ${mosqueName}`,
      icon: '/favicon.ico',
      tag: 'daimun-test',
      silent: false,
    });
    if (success) {
      setTestSent(true);
      setTimeout(() => setTestSent(false), 3000);
    } else {
      const isIframe = window.self !== window.top;
      let message: string;
      if (isIframe) {
        message = "Can\u2019t deliver notifications in this embedded preview. Open the app in its own browser tab to test.";
      } else {
        message = "Notification didn\u2019t fire. Make sure notifications are allowed for this site in your browser settings, then reload and try again.";
      }
      setTestError(message);
      setTimeout(() => setTestError(null), 8000);
    }
  };

  // Don't render if:
  // - Chrome browser (SW issues make notifications unreliable)
  // - Notifications not supported
  // - User has dismissed and hasn't enabled
  // - Permission denied (unless we have an error message to show)
  if (isChrome) return null;
  if (permissionState === 'unsupported') return null;
  if (prefs.dismissed && !prefs.enabled) return null;
  if (permissionState === 'denied' && !prefs.enabled && !permissionError) return null;

  // --- ENABLED STATE: Compact settings card ---
  if (prefs.enabled && permissionState === 'granted') {
    const enabledCount = Object.values(prefs.prayers).filter(Boolean).length;
    const selectedMosque = prefs.mosqueId
      ? mosques.find(m => m.id === prefs.mosqueId)
      : mosques.find(m => favorites.has(m.id)) || mosques[0];
    const mosqueSummary = selectedMosque ? selectedMosque.name.split(/\s+/).slice(0, 3).join(' ') : '';

    return (
      <div className="mb-4 rounded-2xl bg-white/70 dark:bg-white/[0.06] border border-gray-200/60 dark:border-white/[0.08] backdrop-blur-sm overflow-hidden">
        {/* Compact header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-4 py-3 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bell className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              {justEnabled && (
                <div
                  className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-[scale-in_0.3s_ease-out_both]"
                />
              )}
            </div>
            <div>
              <span className="text-xs text-gray-700 dark:text-white/70">
                Notifications · {prefs.minutesBefore}m before{mosqueSummary ? ` · ${mosqueSummary}` : ''}
              </span>
            </div>
          </div>
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-gray-400 dark:text-white/40" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-white/40" />
          )}
        </button>

        {/* Expanded settings */}
        <div
          className="overflow-hidden transition-all duration-200"
          style={{
            display: 'grid',
            gridTemplateRows: expanded ? '1fr' : '0fr',
            opacity: expanded ? 1 : 0,
          }}
        >
          <div className="min-h-0">
              <div className="px-4 pb-4 space-y-3 border-t border-gray-200/50 dark:border-white/[0.06] pt-3">
                {/* Masjid picker — which masjid's iqama times to notify for */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <MapPin className="w-3 h-3 text-gray-400 dark:text-white/40" />
                    <span className="text-xs text-gray-600 dark:text-white/60">Notify based on</span>
                  </div>
                  <div className="relative">
                    <select
                      value={prefs.mosqueId || ''}
                      onChange={(e) => updatePrefs({ mosqueId: e.target.value || null })}
                      className="w-full appearance-none px-3 py-2 pr-8 rounded-lg text-xs bg-gray-100 dark:bg-white/[0.08] text-gray-700 dark:text-white/70 border border-gray-200/60 dark:border-white/[0.08] transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                    >
                      <option value="">
                        {(() => {
                          const autoMosque = mosques.find(m => favorites.has(m.id)) || mosques[0];
                          return autoMosque ? `Auto — ${autoMosque.name}` : 'Auto — first favorite';
                        })()}
                      </option>
                      {mosques.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name}{favorites.has(m.id) ? ' ★' : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 dark:text-white/40 pointer-events-none" />
                  </div>
                </div>

                {/* Minutes before */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 dark:text-white/60">Notify before iqama</span>
                  <div className="flex gap-1.5">
                    {[5, 10, 15, 20, 30].map(min => (
                      <button
                        key={min}
                        onClick={() => updatePrefs({ minutesBefore: min })}
                        className={`px-2 py-1 rounded-md text-xs transition-colors ${
                          prefs.minutesBefore === min
                            ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                            : 'bg-gray-100 dark:bg-white/[0.08] text-gray-600 dark:text-white/50 hover:bg-gray-200 dark:hover:bg-white/[0.12]'
                        }`}
                      >
                        {min}m
                      </button>
                    ))}
                  </div>
                </div>

                {/* Prayer toggles */}
                <div className="flex gap-2 flex-wrap">
                  {(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const).map(prayer => (
                    <button
                      key={prayer}
                      onClick={() => togglePrayer(prayer)}
                      className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                        prefs.prayers[prayer]
                          ? 'bg-emerald-600/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-600/20 dark:border-emerald-400/20'
                          : 'bg-gray-100 dark:bg-white/[0.06] text-gray-400 dark:text-white/30 border border-transparent'
                      }`}
                    >
                      {prayer.charAt(0).toUpperCase() + prayer.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Test notification + Disable */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={handleTestNotification}
                    disabled={testSent}
                    className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-white/40 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors disabled:opacity-50"
                  >
                    {testSent ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400">Sent!</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3 h-3" />
                        <span>Send test</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      updatePrefs({ enabled: false, dismissed: true });
                      if (onDismissChange) onDismissChange(true);
                    }}
                    className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-white/30 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  >
                    <BellOff className="w-3 h-3" />
                    <span>Disable</span>
                  </button>
                </div>
                {testError && (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-2">
                    {testError}
                  </p>
                )}
              </div>
          </div>
        </div>
      </div>
    );
  }

  // --- DEFAULT STATE: Permission prompt ---
  return (
    <div
      className="mb-4 rounded-2xl bg-white/70 dark:bg-white/[0.06] border border-gray-200/60 dark:border-white/[0.08] p-4 backdrop-blur-sm animate-card-enter"
    >
      <div className="flex items-start gap-3">
        <div className="bg-emerald-100 dark:bg-emerald-900/30 rounded-full p-2 flex-shrink-0 mt-0.5">
          <Bell className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-gray-900 dark:text-white/90 mb-1">
            Never miss a salah
          </div>
          <p className="text-xs text-gray-500 dark:text-white/45 mb-3">
            Get a gentle reminder before each iqama so you can head to the masjid on time.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleEnable}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 dark:bg-emerald-500 text-white text-xs rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors"
            >
              <Check className="w-3 h-3" />
              Enable
            </button>
            <button
              onClick={handleDismiss}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-white/[0.08] text-gray-500 dark:text-white/50 text-xs rounded-lg hover:bg-gray-200 dark:hover:bg-white/[0.12] transition-colors"
            >
              <X className="w-3 h-3" />
              Not now
            </button>
          </div>
          {permissionError && (
            <p className="text-xs text-red-500 dark:text-red-400 mt-2">
              {permissionError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}