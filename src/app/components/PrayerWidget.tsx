import { useState, useEffect } from 'react';
import { Bell, Settings, X } from 'lucide-react';
import { Mosque } from '../App';
import { calculateIqamaTimes } from '../utils/iqamaCalculator';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { API_URL } from '../utils/api';
import { navigate } from '../utils/router';

export function PrayerWidget() {
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [selectedMosqueId, setSelectedMosqueId] = useState<string | null>(null);
  const [selectedMosque, setSelectedMosque] = useState<Mosque | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notifiedPrayers, setNotifiedPrayers] = useState<Set<string>>(new Set());
  const [showControls, setShowControls] = useState(false);
  const [hideControlsTimeout, setHideControlsTimeout] = useState<NodeJS.Timeout | null>(null);

  // API_URL imported from /utils/api.ts

  // Load saved mosque ID from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('daimun-widget-mosque-id');
    if (saved) {
      setSelectedMosqueId(saved);
    }
  }, []);

  // Fetch all mosques
  useEffect(() => {
    const fetchMosques = async () => {
      try {
        const response = await fetch(`${API_URL}/mosques`, {
          headers: { 'apikey': publicAnonKey, 'Authorization': `Bearer ${publicAnonKey}` }
        });
        const data = await response.json();
        if (data.mosques) { setMosques(data.mosques); }
      } catch (e) { console.error('Widget: failed to load mosques', e); }
    };

    fetchMosques();
  }, []);

  // Fetch selected mosque details
  useEffect(() => {
    if (!selectedMosqueId) return;

    const fetchMosque = async () => {
      try {
        const response = await fetch(`${API_URL}/mosques/${selectedMosqueId}`, {
          headers: { 'apikey': publicAnonKey, 'Authorization': `Bearer ${publicAnonKey}` }
        });
        const data = await response.json();
        if (data.mosque) { setSelectedMosque(data.mosque); }
      } catch (e) { console.error('Widget: failed to load mosque', e); }
    };

    fetchMosque();
    // Refresh every 5 minutes
    const interval = setInterval(fetchMosque, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [selectedMosqueId]);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Request notification permissions
  const enableNotifications = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === 'granted');
    }
  };

  // Check notification permission on load
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  }, []);

  // Handle mosque selection
  const handleMosqueSelect = (mosqueId: string) => {
    setSelectedMosqueId(mosqueId);
    localStorage.setItem('daimun-widget-mosque-id', mosqueId);
    setShowSettings(false);
    // Reset notified prayers when changing mosque
    setNotifiedPrayers(new Set());
  };

  // Calculate prayer times and update tab title
  useEffect(() => {
    if (!selectedMosque) {
      document.title = '🌙 Dāimūn - Prayer Widget';
      return;
    }

    const calculatedTimes = calculateIqamaTimes(
      selectedMosque.latitude,
      selectedMosque.longitude,
      selectedMosque.iqamaTimes,
      new Date(),
      selectedMosque.calculationMethod || 'NorthAmerica',
      selectedMosque.asrMethod || 'Standard',
      selectedMosque.scheduledTimeChanges  // Pass scheduled time changes to get effective times
    );

    const timeToMinutes = (timeStr: string): number => {
      const [time, period] = timeStr.split(' ');
      let [hours, minutes] = time.split(':').map(Number);
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    };

    const getCurrentMinutes = () => {
      return currentTime.getHours() * 60 + currentTime.getMinutes();
    };

    const isFriday = currentTime.getDay() === 5; // 5 = Friday

    // Helper: check if a prayer is offered (all offered if field is undefined/empty)
    const isOfferedInEffect = (key: string) => !selectedMosque.offeredPrayers || selectedMosque.offeredPrayers.length === 0 || selectedMosque.offeredPrayers.includes(key as any);

    const salawat = [
      ...(isOfferedInEffect('fajr') ? [{ name: 'Fajr', key: 'fajr', adhan: calculatedTimes.fajr.adhan, iqama: calculatedTimes.fajr.iqama }] : []),
      // Use Jumuah on Fridays if available, otherwise Dhuhr
      ...(isFriday && calculatedTimes.jumuah
        ? [{ name: 'Jumuah', key: 'jumuah', adhan: (calculatedTimes.jumuah as any).adhan, iqama: (calculatedTimes.jumuah as any).iqama }]
        : isOfferedInEffect('dhuhr') ? [{ name: 'Dhuhr', key: 'dhuhr', adhan: calculatedTimes.dhuhr.adhan, iqama: calculatedTimes.dhuhr.iqama }] : []),
      ...(isOfferedInEffect('asr') ? [{ name: 'Asr', key: 'asr', adhan: calculatedTimes.asr.adhan, iqama: calculatedTimes.asr.iqama }] : []),
      ...(isOfferedInEffect('maghrib') ? [{ name: 'Maghrib', key: 'maghrib', adhan: calculatedTimes.maghrib.adhan, iqama: calculatedTimes.maghrib.iqama }] : []),
      ...(isOfferedInEffect('isha') ? [{ name: 'Isha', key: 'isha', adhan: calculatedTimes.isha.adhan, iqama: calculatedTimes.isha.iqama }] : []),
    ];

    const currentMinutes = getCurrentMinutes();
    let nextSalah = salawat[0]; // Default to first offered prayer

    for (const salah of salawat) {
      const salahMinutes = timeToMinutes(salah.iqama);
      if (salahMinutes > currentMinutes) {
        nextSalah = salah;
        break;
      }
    }

    // Calculate countdown
    const nextSalahMinutes = timeToMinutes(nextSalah.iqama);
    let minutesUntil = nextSalahMinutes - currentMinutes;
    if (minutesUntil < 0) minutesUntil += 24 * 60;

    const hoursUntil = Math.floor(minutesUntil / 60);
    const minsUntil = minutesUntil % 60;
    const secsUntil = 60 - currentTime.getSeconds();

    // Update tab title
    const countdown = hoursUntil > 0 
      ? `${hoursUntil}:${String(minsUntil).padStart(2, '0')}`
      : `${minsUntil}m`;
    document.title = `🌙 ${nextSalah.name} in ${countdown}`;

    // Send notifications
    if (notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
      const notificationKey = `${nextSalah.key}-${nextSalah.iqama}`;
      
      const fireNotification = async (title: string, body: string, tag: string, opts?: { requireInteraction?: boolean }) => {
        // Try SW-based notification first (required by Chrome)
        try {
          const regs = await navigator.serviceWorker?.getRegistrations?.() || [];
          for (const reg of regs) {
            if (reg.active) {
              await reg.showNotification(title, { body, icon: '/favicon.ico', tag, ...opts });
              return;
            }
          }
        } catch {}
        // Fallback: direct constructor (Safari, older browsers)
        try { new Notification(title, { body, icon: '/favicon.ico', tag, ...opts }); } catch {}
      };

      // 15 minutes before
      if (minutesUntil === 15 && !notifiedPrayers.has(`${notificationKey}-15`)) {
        fireNotification('Next Salah Soon', `${nextSalah.name} iqama in 15 minutes at ${nextSalah.iqama}`, `${notificationKey}-15`);
        setNotifiedPrayers(prev => new Set(prev).add(`${notificationKey}-15`));
      }
      
      // 5 minutes before
      if (minutesUntil === 5 && !notifiedPrayers.has(`${notificationKey}-5`)) {
        fireNotification('Next Salah Very Soon', `${nextSalah.name} iqama in 5 minutes at ${nextSalah.iqama}`, `${notificationKey}-5`);
        setNotifiedPrayers(prev => new Set(prev).add(`${notificationKey}-5`));
      }
      
      // At prayer time
      if (minutesUntil === 0 && !notifiedPrayers.has(`${notificationKey}-0`)) {
        fireNotification('Time for Salah!', `${nextSalah.name} time is now - ${nextSalah.iqama}`, `${notificationKey}-0`, { requireInteraction: true });
        setNotifiedPrayers(prev => new Set(prev).add(`${notificationKey}-0`));
      }
    }

    // Reset notifications at midnight
    const now = new Date();
    if (now.getHours() === 0 && now.getMinutes() === 0) {
      setNotifiedPrayers(new Set());
    }
  }, [selectedMosque, currentTime, notificationsEnabled, notifiedPrayers]);

  // Show settings if no mosque selected
  useEffect(() => {
    if (!selectedMosqueId && mosques.length > 0) {
      setShowSettings(true);
    }
  }, [selectedMosqueId, mosques]);

  // Handle mouse movement to show/hide controls
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      
      // Clear existing timeout
      if (hideControlsTimeout) {
        clearTimeout(hideControlsTimeout);
      }
      
      // Set new timeout to hide controls after 3 seconds
      const timeout = setTimeout(() => {
        setShowControls(false);
      }, 3000);
      
      setHideControlsTimeout(timeout);
    };

    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (hideControlsTimeout) {
        clearTimeout(hideControlsTimeout);
      }
    };
  }, [hideControlsTimeout]);

  if (!selectedMosque) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] dark:bg-black transition-colors flex items-center justify-center p-4">
        <div className="bg-white dark:bg-white/[0.03] rounded-2xl p-8 max-w-md w-full border border-gray-200/50 dark:border-white/[0.06]">
          <div className="text-center mb-6">
            <div className="text-5xl mb-4">🌙</div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2 tracking-tight">Dāimūn Prayer Widget</h1>
            <p className="text-sm text-gray-600 dark:text-white/60">Select your masjid to get started</p>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {mosques.map(mosque => (
              <button
                key={mosque.id}
                onClick={() => handleMosqueSelect(mosque.id)}
                className="w-full text-left p-4 bg-gray-50 dark:bg-white/[0.03] hover:bg-gray-100 dark:hover:bg-white/[0.06] border border-gray-200/50 dark:border-white/[0.06] rounded-xl transition-all"
              >
                <div className="font-medium text-gray-900 dark:text-white">{mosque.name}</div>
                <div className="text-sm text-gray-600 dark:text-white/60">{mosque.address}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const calculatedTimes = calculateIqamaTimes(
    selectedMosque.latitude,
    selectedMosque.longitude,
    selectedMosque.iqamaTimes,
    new Date(),
    selectedMosque.calculationMethod || 'NorthAmerica',
    selectedMosque.asrMethod || 'Standard',
    selectedMosque.scheduledTimeChanges  // Pass scheduled time changes to get effective times
  );

  const timeToMinutes = (timeStr: string): number => {
    const [time, period] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  const getCurrentMinutes = () => {
    return currentTime.getHours() * 60 + currentTime.getMinutes();
  };

  const isFriday = currentTime.getDay() === 5; // 5 = Friday

  // Helper: check if a prayer is offered (all offered if field is undefined/empty)
  const isOffered = (key: string) => !selectedMosque.offeredPrayers || selectedMosque.offeredPrayers.length === 0 || selectedMosque.offeredPrayers.includes(key as any);

  const salawat = [
    ...(isOffered('fajr') ? [{ name: 'Fajr', key: 'fajr', adhan: calculatedTimes.fajr.adhan, iqama: calculatedTimes.fajr.iqama }] : []),
    // Use Jumuah on Fridays if available, otherwise Dhuhr
    ...(isFriday && calculatedTimes.jumuah
      ? [{ name: 'Jumuah', key: 'jumuah', adhan: (calculatedTimes.jumuah as any).adhan, iqama: (calculatedTimes.jumuah as any).iqama }]
      : isOffered('dhuhr') ? [{ name: 'Dhuhr', key: 'dhuhr', adhan: calculatedTimes.dhuhr.adhan, iqama: calculatedTimes.dhuhr.iqama }] : []),
    ...(isOffered('asr') ? [{ name: 'Asr', key: 'asr', adhan: calculatedTimes.asr.adhan, iqama: calculatedTimes.asr.iqama }] : []),
    ...(isOffered('maghrib') ? [{ name: 'Maghrib', key: 'maghrib', adhan: calculatedTimes.maghrib.adhan, iqama: calculatedTimes.maghrib.iqama }] : []),
    ...(isOffered('isha') ? [{ name: 'Isha', key: 'isha', adhan: calculatedTimes.isha.adhan, iqama: calculatedTimes.isha.iqama }] : []),
  ];

  const currentMinutes = getCurrentMinutes();
  let nextSalah = salawat[0];

  for (const salah of salawat) {
    const salahMinutes = timeToMinutes(salah.iqama);
    if (salahMinutes > currentMinutes) {
      nextSalah = salah;
      break;
    }
  }

  // Calculate countdown
  const nextSalahMinutes = timeToMinutes(nextSalah.iqama);
  let minutesUntil = nextSalahMinutes - currentMinutes;
  if (minutesUntil < 0) minutesUntil += 24 * 60;

  const hoursUntil = Math.floor(minutesUntil / 60);
  const minsUntil = minutesUntil % 60;
  const secsUntil = 60 - currentTime.getSeconds();

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-black transition-colors p-4">
      {/* Close Button - appears on mouse move */}
      <div className={`fixed top-4 right-4 z-40 transition-opacity duration-300 ${
        showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}>
        <button
          onClick={() => navigate('/')}
          className="p-3 bg-white/90 dark:bg-white/[0.06] hover:bg-white dark:hover:bg-white/[0.09] backdrop-blur-xl rounded-full shadow-lg border border-gray-200/50 dark:border-white/[0.06] transition-all"
        >
          <X className="w-6 h-6 text-gray-900 dark:text-white" />
        </button>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-white/[0.03] rounded-2xl p-8 max-w-md w-full border border-gray-200/50 dark:border-white/[0.06]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/[0.06] rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-white/70" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-3">
                  Select Masjid
                </label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {mosques.map(mosque => (
                    <button
                      key={mosque.id}
                      onClick={() => handleMosqueSelect(mosque.id)}
                      className={`w-full text-left p-3 rounded-xl transition-all ${
                        mosque.id === selectedMosqueId
                          ? 'bg-blue-50 dark:bg-blue-500/10 border-2 border-blue-500 dark:border-blue-500'
                          : 'bg-gray-50 dark:bg-white/[0.03] border-2 border-transparent hover:bg-gray-100 dark:hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="font-medium text-gray-900 dark:text-white">{mosque.name}</div>
                      <div className="text-sm text-gray-600 dark:text-white/60">{mosque.address}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-3">
                  Notifications
                </label>
                <button
                  onClick={enableNotifications}
                  className={`w-full p-4 rounded-xl transition-all ${
                    notificationsEnabled
                      ? 'bg-green-50 dark:bg-green-500/10 border-2 border-green-500 dark:border-green-500 text-green-900 dark:text-green-400'
                      : 'bg-gray-50 dark:bg-white/[0.03] border-2 border-gray-200 dark:border-white/[0.06] text-gray-700 dark:text-white/70 hover:bg-gray-100 dark:hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {notificationsEnabled ? 'Notifications Enabled' : 'Enable Notifications'}
                    </span>
                    <Bell className="w-5 h-5" />
                  </div>
                  {notificationsEnabled && (
                    <div className="text-sm mt-2 text-green-700 dark:text-green-400 text-left">
                      You'll receive alerts 15 min, 5 min, and at salah time
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Widget */}
      <div className="max-w-md mx-auto mt-8">
        <div className="bg-white dark:bg-white/[0.03] rounded-2xl p-8 border border-gray-200/50 dark:border-white/[0.06]">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="text-sm text-gray-600 dark:text-white/60 mb-1">Next Salah</div>
              <div className="text-xs text-gray-500 dark:text-white/45">{selectedMosque.name}</div>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/[0.06] rounded-full transition-colors"
            >
              <Settings className="w-5 h-5 text-gray-600 dark:text-white/70" />
            </button>
          </div>

          {/* Next Prayer Display */}
          <div className="text-center mb-8">
            <div className="text-6xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
              {nextSalah.name}
            </div>
            <div className="text-5xl font-light text-blue-600 dark:text-blue-400 mb-6">
              {nextSalah.iqama}
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-500/10 rounded-full border border-blue-200/50 dark:border-blue-500/20">
              <span className="text-sm text-gray-600 dark:text-white/60">in</span>
              <span className="text-2xl font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                {hoursUntil > 0 
                  ? `${hoursUntil}:${String(minsUntil).padStart(2, '0')}:${String(secsUntil).padStart(2, '0')}`
                  : `${minsUntil}:${String(secsUntil).padStart(2, '0')}`
                }
              </span>
            </div>
          </div>

          {/* All Prayer Times */}
          <div className="space-y-2 pt-6 border-t border-gray-200 dark:border-white/[0.06]">
            <div className="text-xs text-gray-500 dark:text-white/45 uppercase tracking-wider mb-3">Today's Times</div>
            {salawat.map(salah => (
              <div
                key={salah.key}
                className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                  salah.key === nextSalah.key
                    ? 'bg-blue-50 dark:bg-blue-500/10 border border-blue-200/50 dark:border-blue-500/20'
                    : 'bg-gray-50 dark:bg-white/[0.03]'
                }`}
              >
                <span className="font-medium text-gray-700 dark:text-white/70">{salah.name}</span>
                <div className="text-right">
                  <div className={`font-semibold ${
                    salah.key === nextSalah.key ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'
                  }`}>
                    {salah.iqama}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-white/45">Adhan: {salah.adhan}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Notification Status */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-white/[0.06]">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-gray-600 dark:text-white/60">
                <Bell className="w-4 h-4" />
                <span>Notifications</span>
              </div>
              <span className={notificationsEnabled ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-white/40'}>
                {notificationsEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 p-6 bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200/50 dark:border-white/[0.06]">
          <div className="text-sm text-gray-600 dark:text-white/60 space-y-2">
            <div className="font-medium text-gray-900 dark:text-white mb-3">💡 Pro Tips:</div>
            <div>• <strong className="text-gray-900 dark:text-white">Pin this tab</strong> - Right-click the tab → "Pin Tab" to keep it always visible</div>
            <div>• <strong className="text-gray-900 dark:text-white">Notifications</strong> - Get alerts 15 min, 5 min, and at salah time</div>
            <div>• <strong className="text-gray-900 dark:text-white">Always up-to-date</strong> - Times sync with your masjid automatically</div>
          </div>
        </div>
      </div>
    </div>
  );
}