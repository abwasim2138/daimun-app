import { Clock, MapPin, Smartphone, ArrowLeft, Minimize, Maximize, Palette, ArrowLeftRight, PhoneOff, Sun } from 'lucide-react';
import { Mosque } from '../App';
import { calculateIqamaTimes, getNextPrayer } from '../utils/iqamaCalculator';
import { useEffect, useState, useRef } from 'react';
import { parseLocalDate } from '../utils/dateUtils';
import { isNthDayToday, formatNthDay } from '../utils/nthDayUtils';
import { navigate } from '../utils/router';
import { sortEventsByProximity } from '../utils/eventSorter';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { API_URL } from '../utils/api';
import { toHijri, toGregorian } from 'hijri-converter';
import { Moon } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface TVDisplayPageProps {
  mosqueId: string;
}

// Helper functions
const getCurrentMinutes = () => {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};

const timeToMinutes = (time: string | undefined): number => {
  if (!time) return 0; // Return 0 if time is undefined
  const [timePart, period] = time.split(' ');
  let [hours, minutes] = timePart.split(':').map(Number);
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

const formatHijriDate = (date: Date): string => {
  try {
    const hijri = toHijri(date.getFullYear(), date.getMonth() + 1, date.getDate());
    const monthNames = ['Muharram', 'Safar', 'Rabi\' al-awwal', 'Rabi\' al-thani', 'Jumada al-awwal', 'Jumada al-thani', 'Rajab', 'Sha\'ban', 'Ramadan', 'Shawwal', 'Dhu al-Qi\'dah', 'Dhu al-Hijjah'];
    return `${hijri.hd} ${monthNames[hijri.hm - 1]} ${hijri.hy}`;
  } catch (error) {
    console.error('Hijri date conversion error:', error);
    return '';
  }
};

export function TVDisplayPage({ mosqueId }: TVDisplayPageProps) {
  const [mosque, setMosque] = useState<Mosque | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [hideControlsTimeout, setHideControlsTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>(() => {
    // Load from localStorage or default to gold
    return localStorage.getItem('tvDisplayColor') || 'gold';
  });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [manualLayoutOverride, setManualLayoutOverride] = useState<boolean | null>(null);

  // API_URL imported from /utils/api.ts

  // Clear any cached layout override on mount to enable smart switching
  useEffect(() => {
    localStorage.removeItem('tvDisplayLayoutOverride');
  }, []);

  // Color presets
  const colorPresets = [
    { name: 'Gold', value: 'gold', gradient: 'from-amber-400/25 via-orange-400/15 to-yellow-500/20', border: 'border-amber-500/40', text: 'text-amber-200/90' },
    { name: 'Blue', value: 'blue', gradient: 'from-blue-400/25 via-cyan-400/15 to-blue-500/20', border: 'border-blue-500/40', text: 'text-blue-200/90' },
    { name: 'Green', value: 'green', gradient: 'from-emerald-400/25 via-green-400/15 to-emerald-500/20', border: 'border-emerald-500/40', text: 'text-emerald-200/90' },
    { name: 'Purple', value: 'purple', gradient: 'from-purple-400/25 via-violet-400/15 to-purple-500/20', border: 'border-purple-500/40', text: 'text-purple-200/90' },
    { name: 'Red', value: 'red', gradient: 'from-red-400/25 via-rose-400/15 to-red-500/20', border: 'border-red-500/40', text: 'text-red-200/90' },
    { name: 'Teal', value: 'teal', gradient: 'from-teal-400/25 via-cyan-400/15 to-teal-500/20', border: 'border-teal-500/40', text: 'text-teal-200/90' },
    { name: 'Pink', value: 'pink', gradient: 'from-pink-400/25 via-rose-400/15 to-pink-500/20', border: 'border-pink-500/40', text: 'text-pink-200/90' },
    { name: 'Indigo', value: 'indigo', gradient: 'from-indigo-400/25 via-blue-400/15 to-indigo-500/20', border: 'border-indigo-500/40', text: 'text-indigo-200/90' },
    { name: 'Clear', value: 'clear', gradient: 'from-transparent via-transparent to-transparent', border: 'border-2 border-white/30', text: 'text-white/70' },
  ];

  // Get current color config
  const currentColorConfig = colorPresets.find(c => c.value === selectedColor) || colorPresets[0];

  // Handle color change
  const handleColorChange = (colorValue: string) => {
    setSelectedColor(colorValue);
    localStorage.setItem('tvDisplayColor', colorValue);
    setShowColorPicker(false);
  };

  // Handle layout switch
  const handleLayoutSwitch = () => {
    const newLayout = !isReversedLayout;
    setManualLayoutOverride(newLayout);
    localStorage.setItem('tvDisplayLayoutOverride', JSON.stringify(newLayout));
  };

  // Force landscape orientation on mobile
  useEffect(() => {
    const lockOrientation = async () => {
      // Check if screen is mobile-sized (less than 768px)
      const isMobile = window.matchMedia('(max-width: 767px)').matches;
      
      if (isMobile && screen.orientation && screen.orientation.lock) {
        try {
          await screen.orientation.lock('landscape');
          console.log('Screen locked to landscape');
        } catch (err) {
          console.log('Could not lock screen orientation:', err);
        }
      }
    };

    lockOrientation();

    // Unlock when component unmounts
    return () => {
      if (screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
      }
    };
  }, []);

  // Handle fullscreen
  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } catch (err) {
        console.log('Fullscreen API not available, please use F11 to enter fullscreen mode');
        // Show a temporary message to the user
        alert('Fullscreen API is blocked. Please press F11 to enter fullscreen mode, or open this page in a new tab/window.');
      }
    } else {
      try {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } catch (err) {
        console.error('Error exiting fullscreen:', err);
      }
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

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

  // Fetch mosque data
  useEffect(() => {
    const fetchMosque = async () => {
      try {
        const response = await fetch(`${API_URL}/mosques/${mosqueId}`, {
          headers: {
            'apikey': publicAnonKey,
            'Authorization': `Bearer ${publicAnonKey}`
          }
        });
        const data = await response.json();
        if (data.mosque) {
          setMosque(data.mosque);
        } else {
          console.error('Mosque not found');
        }
      } catch (error) {
        console.error('Error fetching mosque:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMosque();
    // Refresh data every 5 minutes
    const interval = setInterval(fetchMosque, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [mosqueId]);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-16 w-16 mx-auto mb-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-white text-2xl">Loading...</p>
        </div>
      </div>
    );
  }

  if (!mosque) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-2xl mb-4">Masjid not found</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors text-lg font-medium"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  const calculatedTimes = calculateIqamaTimes(
    mosque.latitude,
    mosque.longitude,
    mosque.iqamaTimes,
    new Date(),
    mosque.calculationMethod || 'NorthAmerica',
    mosque.asrMethod || 'Standard',
    mosque.scheduledTimeChanges  // Pass scheduled time changes to get effective times
  );

  // Find next prayer
  const currentMinutes = getCurrentMinutes();
  const isFriday = currentTime.getDay() === 5; // 5 = Friday
  
  // Build salawat array with proper Jumuah khutbah handling
  const buildSalawat = (): Array<{ name: string; key: string; adhan: string; iqama: string; isJumuah?: boolean }> => {
    // Helper: check if a prayer is offered (all offered if field is undefined/empty)
    const isOffered = (key: string) => !mosque.offeredPrayers || mosque.offeredPrayers.length === 0 || mosque.offeredPrayers.includes(key as any);

    const list: Array<{ name: string; key: string; adhan: string; iqama: string; isJumuah?: boolean }> = [];

    if (isOffered('fajr')) {
      list.push({ name: 'Fajr', key: 'fajr', adhan: calculatedTimes.fajr.adhan, iqama: calculatedTimes.fajr.iqama });
    }

    if (isFriday && calculatedTimes.jumuah) {
      // Extract khutbah times — support single object or array
      const jumuahArr = Array.isArray(calculatedTimes.jumuah)
        ? calculatedTimes.jumuah
        : [calculatedTimes.jumuah];

      if (jumuahArr.length === 1) {
        list.push({
          name: 'Jumuah',
          key: 'jumuah',
          adhan: jumuahArr[0].khutbah,
          iqama: jumuahArr[0].khutbah,
          isJumuah: true,
        });
      } else {
        jumuahArr.forEach((j, i) => {
          const ordinal = i === 0 ? '1st' : i === 1 ? '2nd' : `${i + 1}th`;
          list.push({
            name: `Jumuah ${ordinal}`,
            key: `jumuah-${i}`,
            adhan: j.khutbah,
            iqama: j.khutbah,
            isJumuah: true,
          });
        });
      }
    } else if (isOffered('dhuhr')) {
      list.push({ name: 'Dhuhr', key: 'dhuhr', adhan: calculatedTimes.dhuhr.adhan, iqama: calculatedTimes.dhuhr.iqama });
    }

    if (isOffered('asr')) {
      list.push({ name: 'Asr', key: 'asr', adhan: calculatedTimes.asr.adhan, iqama: calculatedTimes.asr.iqama });
    }
    if (isOffered('maghrib')) {
      list.push({ name: 'Maghrib', key: 'maghrib', adhan: calculatedTimes.maghrib.adhan, iqama: calculatedTimes.maghrib.iqama });
    }
    if (isOffered('isha')) {
      list.push({ name: 'Isha', key: 'isha', adhan: calculatedTimes.isha.adhan, iqama: calculatedTimes.isha.iqama });
    }

    return list.filter(salah => salah.iqama);
  };

  const salawat = buildSalawat();

  // --- Jumuah silence window (computed independently of nextSalah) ---
  // After khutbah begins, hold the silence screen for 30 minutes
  // so the highlight card doesn't jump to Asr immediately.
  const JUMUAH_SILENCE_DURATION = 30 * 60; // 30 minutes in seconds
  const DEBUG_SHOW_JUMUAH_SILENCE = false; // Disabled — only activates on Fridays during khutbah window

  const jumuahSilenceState = (() => {
    // Resolve the real khutbah time from calculated data when available
    const resolveKhutbahTime = (): string => {
      const jumuahEntries = salawat.filter(s => s.isJumuah);
      if (jumuahEntries.length > 0) return jumuahEntries[0].iqama;
      // Fallback: try raw calculated times
      if (calculatedTimes.jumuah) {
        const arr = Array.isArray(calculatedTimes.jumuah) ? calculatedTimes.jumuah : [calculatedTimes.jumuah];
        if (arr.length > 0) return arr[0].khutbah;
      }
      return '';
    };

    if (DEBUG_SHOW_JUMUAH_SILENCE) {
      return { active: true, khutbahTime: resolveKhutbahTime() };
    }

    if (!isFriday) return { active: false, khutbahTime: '' };

    // Find the latest Jumuah entry whose khutbah window is active
    const jumuahEntries = salawat.filter(s => s.isJumuah);
    const nowSeconds = currentTime.getHours() * 3600 + currentTime.getMinutes() * 60 + currentTime.getSeconds();

    for (const entry of jumuahEntries) {
      const khutbahSeconds = timeToMinutes(entry.iqama) * 60;
      if (nowSeconds >= khutbahSeconds && nowSeconds < khutbahSeconds + JUMUAH_SILENCE_DURATION) {
        return { active: true, khutbahTime: entry.iqama };
      }
    }

    return { active: false, khutbahTime: '' };
  })();

  let nextSalahKey = 'fajr';
  for (const salah of salawat) {
    const salahMinutes = timeToMinutes(salah.iqama);
    if (salahMinutes > currentMinutes) {
      nextSalahKey = salah.key;
      break;
    }
  }

  // ── Silence-period detection ──
  // Separate from nextSalahKey because that pointer advances the moment iqama
  // passes, but we need to keep showing the silence card for 7 min (or 15 for Jumuah).
  const SILENCE_REGULAR = 7 * 60;   // seconds
  const SILENCE_JUMUAH  = 15 * 60;  // seconds

  const silencePrayer = (() => {
    const nowSec = currentTime.getHours() * 3600 + currentTime.getMinutes() * 60 + currentTime.getSeconds();
    // Walk backwards so we match the most-recently-started iqama first
    for (let i = salawat.length - 1; i >= 0; i--) {
      const s = salawat[i];
      const iqSec = timeToMinutes(s.iqama) * 60;
      const dur = s.isJumuah ? SILENCE_JUMUAH : SILENCE_REGULAR;
      if (nowSec >= iqSec && nowSec < iqSec + dur) {
        return s;
      }
    }
    return null;
  })();

  // Get today's and upcoming events
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const dayOfWeek = today.getDay();
  
  const upcomingEvents = sortEventsByProximity((mosque.events || []).filter(event => {
    if (event.recurring?.enabled) {
      if (event.recurring.frequency === 'daily') {
        return true;
      }
      if (event.recurring.frequency === 'weekly' && event.recurring.dayOfWeek === dayOfWeek) {
        return true;
      }
      if (event.recurring.frequency === 'monthly' && event.recurring.dayOfMonth === today.getDate()) {
        return true;
      }
      if (event.recurring.frequency === 'nth-day' && event.recurring.nthWeek && event.recurring.nthDayOfWeek !== undefined) {
        return isNthDayToday(today, event.recurring.nthDayOfWeek, event.recurring.nthWeek);
      }
    }
    return event.date >= todayStr;
  })).slice(0, 3);

  // Compute Ramadan iftar-window states so we can hide events during breaking-fast / iftar
  const hideEventsForIftar = (() => {
    const h = toHijri(today.getFullYear(), today.getMonth() + 1, today.getDate());
    if (h.hm !== 9) return false; // not Ramadan
    const fajrMin = timeToMinutes(calculatedTimes.fajr.adhan);
    const maghribMin = timeToMinutes(calculatedTimes.maghrib.adhan);
    const ishaAdhanMin = timeToMinutes(calculatedTimes.isha.adhan);
    const nowMin = currentTime.getHours() * 60 + currentTime.getMinutes();
    const isFasting = nowMin >= fajrMin && nowMin < maghribMin;
    // Hide events from Maghrib adhan until Isha adhan (covers both breaking-fast & iftar windows)
    return !isFasting && nowMin >= maghribMin && nowMin < ishaAdhanMin;
  })();

  // Format date
  const formatDate = (date: Date) => {
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // Format time
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const nextSalah = salawat.find(p => p.key === nextSalahKey);

  // Determine layout direction with smart prayer-time switching
  // - Within 20 minutes before iqama: card on RIGHT (isReversedLayout = false)
  // - After iqama: card on LEFT (isReversedLayout = true)
  // - Otherwise: use manual override or daily rotation
  const getDayOfYear = (date: Date) => {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  };
  
  const dayOfYear = getDayOfYear(currentTime);
  
  // Calculate if we're in special time windows for the next prayer
  let isReversedLayout: boolean;
  
  if (manualLayoutOverride !== null) {
    // Manual override takes precedence
    isReversedLayout = manualLayoutOverride;
  } else if (nextSalah) {
    const currentSeconds = currentTime.getHours() * 3600 + currentTime.getMinutes() * 60 + currentTime.getSeconds();
    const iqamaMinutes = timeToMinutes(nextSalah.iqama);
    const iqamaSeconds = iqamaMinutes * 60;
    
    // Check if we're within 20 minutes before iqama
    const twentyMinutesBeforeIqama = iqamaSeconds - (20 * 60);
    const isApproachingIqama = currentSeconds >= twentyMinutesBeforeIqama && currentSeconds < iqamaSeconds;
    
    // Check if we're after iqama
    const isAfterIqama = currentSeconds >= iqamaSeconds;
    
    if (isApproachingIqama) {
      // Within 20 mins of iqama: card on RIGHT
      isReversedLayout = false;
    } else if (isAfterIqama) {
      // After iqama: card on LEFT
      isReversedLayout = true;
    } else {
      // Default: use daily rotation
      isReversedLayout = dayOfYear % 2 === 0;
    }
  } else {
    // Fallback to daily rotation
    isReversedLayout = dayOfYear % 2 === 0;
  }

  return (
    <div className="w-screen h-screen bg-black text-white relative overflow-hidden flex flex-col">
      {/* Current Time & Date - Bottom Corner (Apple TV style) - switches sides to prevent burn-in */}
      <div className={`absolute bottom-[2vh] z-10 text-left ${
        isReversedLayout ? 'right-[2vw]' : 'left-[2vw]'
      }`}>
        <div className="flex items-baseline gap-[1.5vw]">
          <p className="text-[clamp(1.5rem,3vh,4rem)] font-light text-white/90">{formatTime(currentTime)}</p>
          <div className="flex items-center gap-[1vw] text-[clamp(0.75rem,1.2vh,1.5rem)] text-white/50 font-light">
            <span>{formatDate(currentTime)}</span>
            <span className="text-white/30">•</span>
            <span>{formatHijriDate(currentTime)}</span>
          </div>
        </div>
      </div>

      {/* QR Code - Bottom corner opposite the clock */}
      <div className={`absolute bottom-[2vh] z-10 flex items-end gap-[0.8vw] ${
        isReversedLayout ? 'left-[2vw]' : 'right-[2vw]'
      }`}>
        <div className="bg-white rounded-[clamp(0.25rem,0.6vh,0.75rem)] p-[clamp(0.25rem,0.5vh,0.6rem)] shadow-lg shadow-black/30">
          <QRCodeSVG
            value="https://daimun.app"
            size={56}
            level="M"
            bgColor="#ffffff"
            fgColor="#000000"
            className="w-[clamp(2.5rem,5vh,5rem)] h-[clamp(2.5rem,5vh,5rem)]"
          />
        </div>
      </div>
      
      {/* Exit button - subtle in top right */}
      <button
        onClick={() => navigate('/')}
        className={`absolute top-[2vh] right-[2vw] p-[1vh] bg-white/5 hover:bg-white/10 rounded-lg transition-all duration-300 z-10 border border-white/10 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        aria-label="Exit TV Display"
      >
        <ArrowLeft className="w-[clamp(1rem,2vh,2rem)] h-[clamp(1rem,2vh,2rem)] text-white/60" />
      </button>

      {/* Fullscreen toggle - top right next to exit */}
      <button
        onClick={toggleFullscreen}
        className={`absolute top-[2vh] right-[7vw] p-[1vh] bg-white/5 hover:bg-white/10 rounded-lg transition-all duration-300 z-10 border border-white/10 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
      >
        {isFullscreen ? (
          <Minimize className="w-[clamp(1rem,2vh,2rem)] h-[clamp(1rem,2vh,2rem)] text-white/60" />
        ) : (
          <Maximize className="w-[clamp(1rem,2vh,2rem)] h-[clamp(1rem,2vh,2rem)] text-white/60" />
        )}
      </button>

      {/* Color picker toggle - top right next to fullscreen */}
      <div className={`absolute top-[2vh] right-[12vw] transition-all duration-300 z-10 ${
        showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}>
        <button
          onClick={() => setShowColorPicker(!showColorPicker)}
          className="p-[1vh] bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors"
          aria-label="Choose Color"
        >
          <Palette className="w-[clamp(1rem,2vh,2rem)] h-[clamp(1rem,2vh,2rem)] text-white/60" />
        </button>
        
        {/* Color picker dropdown */}
        {showColorPicker && (
          <div className="absolute top-[calc(100%+1vh)] right-0 bg-black/90 backdrop-blur-xl border border-white/10 rounded-lg p-[1.5vh] shadow-2xl min-w-[12vw]">
            <div className="space-y-[0.5vh]">
              {colorPresets.map((color) => (
                <button
                  key={color.value}
                  onClick={() => handleColorChange(color.value)}
                  className={`w-full text-left px-[1vw] py-[1vh] rounded-md transition-all hover:bg-white/10 flex items-center gap-[1vw] ${
                    selectedColor === color.value ? 'bg-white/15' : ''
                  }`}
                >
                  <div className={`w-[1.5vh] h-[1.5vh] rounded-full bg-gradient-to-br ${color.gradient.split(' ').slice(0, 2).join(' ')}`}></div>
                  <span className="text-[clamp(0.7rem,1.2vh,1.5rem)] text-white/80 font-light">{color.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Layout switch button - top right next to color picker */}
      <button
        onClick={handleLayoutSwitch}
        className={`absolute top-[2vh] right-[17vw] p-[1vh] bg-white/5 hover:bg-white/10 rounded-lg transition-all duration-300 z-10 border border-white/10 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        aria-label="Switch Layout"
      >
        <ArrowLeftRight className="w-[clamp(1rem,2vh,2rem)] h-[clamp(1rem,2vh,2rem)] text-white/60" />
      </button>

      {/* Fullscreen hint - only show when not in fullscreen */}
      {!isFullscreen && (
        <div className={`absolute top-[2vh] left-1/2 -translate-x-1/2 px-[2vw] py-[1vh] bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 transition-all duration-300 z-10 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}>
          <p className="text-[clamp(0.6rem,1vh,1rem)] text-white/60 font-light">Press F11 or click "Enter Fullscreen" to hide browser controls</p>
        </div>
      )}

      <div className="w-full h-full flex flex-col px-[3vw] py-[8vh] pb-[12vh]">
        {/* Salah Times - Two Column Layout - alternates to prevent burn-in */}
        <div className="flex-1 flex items-center justify-center min-h-0">
          <div className={`grid grid-cols-[auto_auto] gap-[8vw] w-full max-w-[80vw] mx-auto h-full items-center justify-center ${
            isReversedLayout ? 'direction-rtl' : ''
          }`} style={{ direction: isReversedLayout ? 'rtl' : 'ltr' }}>
            {/* Salah List Column */}
            <div className="flex flex-col justify-center space-y-[2vh] min-w-[20vw]" style={{ direction: 'ltr' }}>
              {salawat.map(salah => {
                const isNext = salah.key === nextSalahKey && !silencePrayer;
                const isInProgress = silencePrayer?.key === salah.key;
                return (
                  <div
                    key={salah.name}
                    className="py-[1vh]"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[clamp(1rem,2vh,2.5rem)] font-light tracking-wide ${isInProgress ? 'text-emerald-300/90' : isNext ? 'text-white/60' : 'text-white/70'}`}>
                        {salah.name}
                      </span>
                      <div className="flex items-baseline gap-[1.2vw]">
                        {/* Adhan time — secondary, for non-Jumuah entries where adhan differs from iqama */}
                        {!salah.isJumuah && salah.adhan && salah.adhan !== salah.iqama && (
                          <span className={`text-[clamp(0.6rem,1.2vh,1.3rem)] font-light ${isInProgress ? 'text-emerald-200/40' : 'text-white/40'}`}>
                            {salah.adhan}
                          </span>
                        )}
                        {salah.isJumuah && (
                          <span className={`text-[clamp(0.6rem,1.2vh,1.2rem)] font-light tracking-wide ${isInProgress ? 'text-emerald-200/50' : isNext ? 'text-white/35' : 'text-white/40'}`}>
                            Khutbah
                          </span>
                        )}
                        <div className={`text-[clamp(1.2rem,2.5vh,3rem)] font-medium ${isInProgress ? 'text-emerald-300/90' : isNext ? 'text-white/60' : 'text-white'}`}>
                          {salah.iqama}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Jumuah Khutba time — shown on non-Fridays as a subtle reference */}
              {!isFriday && calculatedTimes.jumuah && (() => {
                const jumuahArr = Array.isArray(calculatedTimes.jumuah)
                  ? calculatedTimes.jumuah
                  : [calculatedTimes.jumuah];
                return (
                  <div className="pt-[1vh] mt-[1vh] border-t border-white/[0.1]">
                    {jumuahArr.map((j, i) => (
                      <div key={`jumuah-ref-${i}`} className="flex items-center justify-between py-[0.5vh]">
                        <span className="text-[clamp(0.75rem,1.5vh,1.8rem)] font-light tracking-wide text-white/45">
                          {jumuahArr.length > 1 ? `Jumuah ${i === 0 ? '1st' : '2nd'}` : 'Jumuah'}
                        </span>
                        <div className="flex items-baseline gap-[1vw]">
                          <span className="text-[clamp(0.6rem,1.1vh,1.2rem)] font-light text-white/35">Khutbah</span>
                          <span className="text-[clamp(0.85rem,1.7vh,2rem)] font-light text-white/45">{j.khutbah}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Upcoming Events - Below salah times */}
              {upcomingEvents.length > 0 && !hideEventsForIftar && (
                <div className="mt-[4vh] space-y-[1.5vh]">
                  {upcomingEvents.map(event => {
                    // Determine if this event is happening today
                    const isToday = event.recurring?.enabled || event.date === todayStr;

                    // Determine "Tonight" vs "Today" based on event time
                    const isTonightEvent = (() => {
                      if (!isToday) return false;
                      const timeLower = (event.time || '').toLowerCase();
                      // Keywords that imply evening
                      if (timeLower.includes('isha') || timeLower.includes('maghrib') || timeLower.includes('taraweeh') || timeLower.includes('night')) return true;
                      // Parse clock times — PM with hour >= 5
                      const pmMatch = timeLower.match(/(\d{1,2})\s*:\s*\d{2}\s*pm/);
                      if (pmMatch) {
                        const hour = parseInt(pmMatch[1], 10);
                        if (hour >= 5 && hour !== 12) return true;
                        if (hour === 12) return false; // 12 PM is noon
                      }
                      // "After" + evening prayer
                      if (timeLower.includes('after') && (timeLower.includes('isha') || timeLower.includes('maghrib'))) return true;
                      return false;
                    })();

                    const todayLabel = isTonightEvent ? 'Tonight' : 'Today';

                    return (
                      <div
                        key={event.id}
                        className="bg-white/5 border border-white/10 rounded-lg px-[1.5vw] py-[1.5vh]"
                      >
                        <div className="flex flex-col">
                          <h3 className="text-[clamp(0.9rem,1.6vh,2rem)] font-light mb-[0.5vh] text-[#D4AF37] truncate">{event.title}</h3>
                          {event.description && (
                            <p className="text-[clamp(0.7rem,1.2vh,1.5rem)] text-white/60 mb-[0.5vh] font-light line-clamp-1">{event.description}</p>
                          )}
                          <div className="flex gap-[0.5vw] text-white/50 text-[clamp(0.7rem,1.2vh,1.5rem)] font-light">
                            {event.recurring?.enabled ? (
                              <span>
                                {isToday ? todayLabel : (event.recurring.frequency === 'daily' ? 'Daily' : event.recurring.frequency === 'weekly' ? 'Weekly' : 'Monthly')} · {event.time}
                              </span>
                            ) : (
                              <>
                                <span>{isToday ? todayLabel : parseLocalDate(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                <span>·</span>
                                <span>{event.time}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Ramadan Tile — countdown (pre-Ramadan), live mode (during), or Eid (post) */}
              {(() => {
                const todayHijri = toHijri(today.getFullYear(), today.getMonth() + 1, today.getDate());

                // ⚠️ Flip to `true` once Ramadan is officially confirmed via moon sighting.
                // Until then, the Ramadan Mubarak greeting tile shows UNCONDITIONALLY.
                const RAMADAN_CONFIRMED = true;

                const topSpacing = (upcomingEvents.length > 0 && !hideEventsForIftar) ? "mt-[1.5vh]" : "mt-[4vh]";

                // ── Ramadan Mubarak greeting until confirmed ──
                if (!RAMADAN_CONFIRMED) {
                  const ramadanYear = todayHijri.hy;

                  return (
                    <div className={topSpacing}>
                      <div className="bg-gradient-to-br from-purple-500/20 via-indigo-500/15 to-purple-600/20 backdrop-blur-xl border border-purple-400/30 rounded-lg px-[1.5vw] py-[1.5vh]">
                        {/* Header */}
                        <div className="flex items-center gap-[0.8vw] mb-[1.2vh]">
                          <Moon className="w-[clamp(0.8rem,1.5vh,2rem)] h-[clamp(0.8rem,1.5vh,2rem)] text-purple-300/80" />
                          <span className="text-[clamp(0.9rem,1.6vh,2rem)] font-light text-white">
                            Ramadan Mubarak
                          </span>
                        </div>

                        {/* Greeting */}
                        <div className="text-center py-[0.5vh]">
                          <div className="text-[clamp(1rem,1.8vh,2.2rem)] text-white mb-[0.8vh]">
                            Ramadan Mubarak
                          </div>
                          {/* Al-Baqarah 2:185 — Arabic */}
                          <div className="text-[clamp(0.7rem,1.2vh,1.5rem)] text-white/70 font-light leading-relaxed mb-[0.6vh]" dir="rtl" lang="ar">
                            شَهْرُ رَمَضَانَ الَّذِي أُنزِلَ فِيهِ الْقُرْآنُ هُدًى لِّلنَّاسِ وَبَيِّنَاتٍ مِّنَ الْهُدَىٰ وَالْفُرْقَانِ
                          </div>
                          {/* English translation */}
                          <div className="text-[clamp(0.55rem,0.9vh,1.1rem)] text-white/40 font-light italic leading-relaxed">
                            "The month of Ramadan is that in which the Quran was revealed, a guidance for the people and clear proofs of guidance and criterion."
                          </div>
                          <div className="text-[clamp(0.45rem,0.75vh,0.9rem)] text-white/25 mt-[0.4vh]">
                            — Al-Baqarah 2:185
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                // ═════════════════════════���════════════════════════════════════
                // Below only runs once RAMADAN_CONFIRMED is flipped to true
                // ══════════════════════════════════════════════════════════════

                const isRamadan = todayHijri.hm === 9;
                const isEarlyShawwal = todayHijri.hm === 10 && todayHijri.hd <= 3;

                // ── DURING RAMADAN: live suhoor/iftar tile ──
                if (isRamadan) {
                  const ramadanDay = todayHijri.hd;
                  const fajrAdhan = calculatedTimes.fajr.adhan;
                  const maghribAdhan = calculatedTimes.maghrib.adhan;
                  const maghribIqamaStr = calculatedTimes.maghrib.iqama;
                  const ishaAdhan = calculatedTimes.isha.adhan;
                  const ishaIqama = calculatedTimes.isha.iqama;
                  const fajrMin = timeToMinutes(fajrAdhan);
                  const maghribMin = timeToMinutes(maghribAdhan);
                  const maghribIqamaMin = timeToMinutes(maghribIqamaStr);
                  const ishaAdhanMin = timeToMinutes(ishaAdhan);
                  const ishaIqamaMin = timeToMinutes(ishaIqama);
                  const nowMin = currentTime.getHours() * 60 + currentTime.getMinutes();
                  const isFasting = nowMin >= fajrMin && nowMin < maghribMin;

                  // Breaking fast: Maghrib adhan → Maghrib iqama
                  const isBreakingFast = !isFasting && nowMin >= maghribMin && nowMin < maghribIqamaMin;
                  // Iftar window: Maghrib iqama → Isha adhan
                  const isIftarWindow = !isFasting && !isBreakingFast && nowMin >= maghribIqamaMin && nowMin < ishaAdhanMin;

                  // Taraweeh window: Isha adhan → Isha iqama + 60 min
                  const rp = mosque.ramadanProgram;
                  const taraweehWindowEnd = ishaIqamaMin + 60;
                  const isTaraweehWindow = !isFasting && !isBreakingFast && !isIftarWindow && nowMin >= ishaAdhanMin && nowMin < taraweehWindowEnd && !!rp?.tarawih;

                  let countdownMin: number;
                  let countdownLabel: string;
                  if (isFasting) {
                    countdownMin = maghribMin - nowMin;
                    countdownLabel = 'until Iftar';
                  } else if (isBreakingFast) {
                    countdownMin = maghribIqamaMin - nowMin;
                    countdownLabel = 'until Iqama';
                  } else if (nowMin < fajrMin) {
                    countdownMin = fajrMin - nowMin;
                    countdownLabel = 'until Suhoor ends';
                  } else {
                    countdownMin = (fajrMin + 1440) - nowMin;
                    countdownLabel = 'until Suhoor ends';
                  }
                  const cH = Math.floor(countdownMin / 60);
                  const cM = countdownMin % 60;
                  const countdownStr = cH > 0 ? `${cH}h ${cM}m` : `${cM}m`;

                  const focusLabel = isFasting ? 'Iftar' : 'Suhoor ends';
                  const focusTime = isFasting ? maghribAdhan : fajrAdhan;

                  // ── Breaking fast: expanded card (events hidden) ──
                  if (isBreakingFast) {
                    return (
                      <div className="mt-[4vh]">
                        <div className="bg-gradient-to-br from-amber-500/25 via-orange-500/15 to-yellow-500/20 backdrop-blur-xl border border-amber-400/40 rounded-lg px-[1.5vw] py-[2.5vh]">
                          {/* Header */}
                          <div className="flex items-center gap-[0.8vw] mb-[1.5vh]">
                            <Moon className="w-[clamp(0.8rem,1.5vh,2rem)] h-[clamp(0.8rem,1.5vh,2rem)] text-amber-300/80" />
                            <span className="text-[clamp(0.9rem,1.6vh,2rem)] font-light text-white">
                              Ramadan Mubarak
                            </span>
                          </div>
                          {/* Break your fast card */}
                          <div className="bg-white/[0.06] rounded-md px-[1.2vw] py-[1.5vh]">
                            <div className="flex items-center gap-[0.4vw] mb-[0.6vh]">
                              <Sun className="w-[clamp(0.5rem,0.9vh,1.2rem)] h-[clamp(0.5rem,0.9vh,1.2rem)] text-amber-300/80" />
                              <span className="text-[clamp(0.5rem,0.85vh,1rem)] text-amber-200/60 uppercase tracking-wider">Break Your Fast</span>
                            </div>
                            <div className="text-[clamp(0.85rem,1.5vh,1.8rem)] text-white/90 font-light mb-[1vh]">
                              Bismillah — eat &amp; drink before iqama
                            </div>
                            <div className="flex items-baseline justify-between mb-[1.2vh]">
                              <span className="text-[clamp(1rem,2vh,2.5rem)] text-white font-medium tabular-nums">{countdownStr}</span>
                              <span className="text-[clamp(0.65rem,1.1vh,1.3rem)] text-amber-200/50 font-light">Iqama at {maghribIqamaStr}</span>
                            </div>
                            {/* Iftar dua */}
                            <div className="pt-[1vh] border-t border-amber-300/15">
                              <div className="text-right mb-[0.4vh]" dir="rtl">
                                <p className="text-[clamp(0.65rem,1.15vh,1.4rem)] text-amber-100/60 font-light leading-relaxed">
                                  ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ وَثَبَتَ الأَجْرُ إِنْ شَاءَ اللَّهُ
                                </p>
                              </div>
                              <p className="text-[clamp(0.5rem,0.85vh,1rem)] text-white/30 font-light italic">
                                &ldquo;The thirst is gone, the veins are moistened, and the reward is assured, if Allah wills.&rdquo;
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // ── Iftar window: expanded card (events hidden) ──
                  if (isIftarWindow) {
                    return (
                      <div className="mt-[4vh]">
                        <div className="bg-gradient-to-br from-purple-500/20 via-indigo-500/15 to-purple-600/20 backdrop-blur-xl border border-purple-400/30 rounded-lg px-[1.5vw] py-[2.5vh]">
                          {/* Header */}
                          <div className="flex items-center gap-[0.8vw] mb-[1.5vh]">
                            <Moon className="w-[clamp(0.8rem,1.5vh,2rem)] h-[clamp(0.8rem,1.5vh,2rem)] text-purple-300/80" />
                            <span className="text-[clamp(0.9rem,1.6vh,2rem)] font-light text-white">
                              Ramadan Mubarak
                            </span>
                          </div>
                          {/* Iftar window card */}
                          <div className="bg-white/[0.06] rounded-md px-[1.2vw] py-[1.5vh]">
                            <div className="flex items-center gap-[0.4vw] mb-[0.6vh]">
                              <Sun className="w-[clamp(0.5rem,0.9vh,1.2rem)] h-[clamp(0.5rem,0.9vh,1.2rem)] text-amber-300/80" />
                              <span className="text-[clamp(0.5rem,0.85vh,1rem)] text-white/40 uppercase tracking-wider">Iftar Time</span>
                            </div>
                            <div className="text-[clamp(0.85rem,1.5vh,1.8rem)] text-white/80 font-light mb-[1vh]">
                              Eat up &amp; get ready for Isha{rp?.tarawih ? ' & Taraweeh' : ''}
                            </div>
                            {rp?.tarawih && (
                              <div className="flex items-center gap-[0.6vw] text-[clamp(0.6rem,1vh,1.2rem)] text-indigo-200/50 font-light">
                                <Moon className="w-[clamp(0.4rem,0.8vh,1rem)] h-[clamp(0.4rem,0.8vh,1rem)]" />
                                <span>
                                  {rp.tarawihRakat ? `${rp.tarawihRakat} Rakat` : 'Taraweeh'}
                                  {rp.tarawihTime ? ` · ${rp.tarawihTime}` : ` · After Isha · ${ishaIqama}`}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className={topSpacing}>
                      <div className="bg-gradient-to-br from-purple-500/20 via-indigo-500/15 to-purple-600/20 backdrop-blur-xl border border-purple-400/30 rounded-lg px-[1.5vw] py-[1.5vh]">
                        {/* Header */}
                        <div className="flex items-center gap-[0.8vw] mb-[1.2vh]">
                          <Moon className="w-[clamp(0.8rem,1.5vh,2rem)] h-[clamp(0.8rem,1.5vh,2rem)] text-purple-300/80" />
                          <span className="text-[clamp(0.9rem,1.6vh,2rem)] font-light text-white">
                            Ramadan Mubarak
                          </span>
                        </div>

                        {isTaraweehWindow ? (
                          /* ── Taraweeh focus tile ── */
                          <div className="bg-white/[0.06] rounded-md px-[1vw] py-[0.8vh]">
                            <div className="flex items-center gap-[0.4vw] mb-[0.4vh]">
                              <Moon className="w-[clamp(0.5rem,0.9vh,1.2rem)] h-[clamp(0.5rem,0.9vh,1.2rem)] text-indigo-200/80" />
                              <span className="text-[clamp(0.5rem,0.85vh,1rem)] text-white/40 uppercase tracking-wider">Taraweeh Tonight</span>
                            </div>
                            <div className="flex items-baseline justify-between">
                              <span className="text-[clamp(0.8rem,1.4vh,1.8rem)] text-white font-medium">
                                {rp!.tarawihRakat ? `${rp!.tarawihRakat} Rakat` : 'Taraweeh'}
                              </span>
                              <span className="text-[clamp(0.65rem,1.1vh,1.3rem)] text-white/50 font-light">
                                {rp!.tarawihTime || `After Isha · ${ishaIqama}`}
                              </span>
                            </div>
                          </div>
                        ) : (
                          /* ── Suhoor / Iftar countdown ── */
                          <div className="bg-white/[0.06] rounded-md px-[1vw] py-[0.8vh]">
                            <div className="flex items-center gap-[0.4vw] mb-[0.4vh]">
                              {isFasting ? (
                                <Sun className="w-[clamp(0.5rem,0.9vh,1.2rem)] h-[clamp(0.5rem,0.9vh,1.2rem)] text-amber-300/80" />
                              ) : (
                                <Moon className="w-[clamp(0.5rem,0.9vh,1.2rem)] h-[clamp(0.5rem,0.9vh,1.2rem)] text-purple-200/80" />
                              )}
                              <span className="text-[clamp(0.5rem,0.85vh,1rem)] text-white/40 uppercase tracking-wider">{focusLabel}</span>
                            </div>
                            <div className="flex items-baseline justify-between">
                              <span className="text-[clamp(0.8rem,1.4vh,1.8rem)] text-white font-medium">{countdownStr}</span>
                              <span className="text-[clamp(0.65rem,1.1vh,1.3rem)] text-white/50 font-light">{focusTime}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                // ── EID MUBARAK (first 3 days of Shawwal) ──
                if (isEarlyShawwal) {
                  return (
                    <div className={topSpacing}>
                      <div className="bg-gradient-to-br from-emerald-500/20 via-teal-500/15 to-emerald-600/20 backdrop-blur-xl border border-emerald-400/30 rounded-lg px-[1.5vw] py-[1.5vh] text-center">
                        <div className="text-[clamp(1rem,1.8vh,2.2rem)] text-white mb-[0.3vh]">Eid Mubarak!</div>
                        <div className="text-[clamp(0.65rem,1vh,1.3rem)] text-white/60 font-light">Taqabbal Allahu minna wa minkum</div>
                      </div>
                    </div>
                  );
                }

                // ── PRE-RAMADAN GREETING (within 30 days) ──
                let ramadanYear = todayHijri.hy;
                if (todayHijri.hm >= 9) {
                  ramadanYear = todayHijri.hy + 1;
                }
                const ramadanStart = toGregorian(ramadanYear, 9, 1);
                const ramadanDate = new Date(ramadanStart.gy, ramadanStart.gm - 1, ramadanStart.gd);
                const diffTime = ramadanDate.getTime() - today.getTime();
                const daysUntil = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                
                if (daysUntil <= 30 && daysUntil > 0) {
                  return (
                    <div className={topSpacing}>
                      <div className="bg-gradient-to-br from-purple-500/20 via-indigo-500/15 to-purple-600/20 backdrop-blur-xl border border-purple-400/30 rounded-lg px-[1.5vw] py-[1.5vh]">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-[1vh]">
                          <div className="flex items-center gap-[0.8vw]">
                            <Moon className="w-[clamp(0.8rem,1.5vh,2rem)] h-[clamp(0.8rem,1.5vh,2rem)] text-purple-300/80" />
                            <span className="text-[clamp(0.9rem,1.6vh,2rem)] font-light text-white">
                              Ramadan {ramadanYear}
                            </span>
                          </div>
                          <span className="text-[clamp(0.65rem,1.1vh,1.3rem)] text-white/50 font-light">
                            {daysUntil} day{daysUntil !== 1 ? 's' : ''} away
                          </span>
                        </div>

                        {/* Greeting + Ayat */}
                        <div className="text-center py-[0.5vh]">
                          <div className="text-[clamp(0.7rem,1.2vh,1.5rem)] text-white/70 font-light leading-relaxed mb-[0.6vh]" dir="rtl" lang="ar">
                            شَهْرُ رَمَضَانَ الَّذِي أُنزِلَ فِيهِ الْقُرْآنُ هُدًى لِّلنَّاسِ وَبَيِّنَاتٍ مِّنَ الْهُدَىٰ وَالْفُرْقَانِ
                          </div>
                          <div className="text-[clamp(0.55rem,0.9vh,1.1rem)] text-white/40 font-light italic leading-relaxed">
                            "The month of Ramadan is that in which the Quran was revealed, a guidance for the people and clear proofs of guidance and criterion."
                          </div>
                          <div className="text-[clamp(0.45rem,0.75vh,0.9rem)] text-white/25 mt-[0.4vh]">
                            — Al-Baqarah 2:185
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                return null;
              })()}
            </div>

            {/* Right: Next Salah Highlight with Countdown */}
            {(() => {
              // --- Jumuah Khutbah silence override ---
              // When khutbah is in progress (or DEBUG flag is on), show silence card
              // instead of the normal next-prayer countdown for 30 minutes.
              if (jumuahSilenceState.active) {
                return (
                  <div className="flex items-center justify-center h-full" style={{ direction: 'ltr' }}>
                    <div className="relative bg-gradient-to-br from-emerald-500/20 via-teal-500/15 to-emerald-600/20 backdrop-blur-xl border border-emerald-400/30 rounded-[clamp(1rem,3vh,4rem)] px-[5vw] py-[8vh] flex flex-col justify-center items-center text-center shadow-2xl overflow-hidden">
                      <div className="relative z-10">
                        {/* Mosque / minbar icon area */}
                        <div className="mb-[4vh] flex justify-center">
                          <div className="relative">
                            <PhoneOff className="w-[clamp(3rem,12vh,16rem)] h-[clamp(3rem,12vh,16rem)] text-emerald-300/70 drop-shadow-2xl" strokeWidth={1.2} />
                          </div>
                        </div>

                        {/* Title */}
                        <div className="text-[clamp(2rem,8vh,10rem)] font-bold mb-[3vh] text-white leading-tight drop-shadow-lg">
                          Jumuah Khutbah
                        </div>

                        {/* Subtitle */}
                        <div className="text-[clamp(1.2rem,3vh,5rem)] font-light text-emerald-100/80 mb-[5vh]">
                          In Progress
                        </div>

                        {/* Divider line */}
                        <div className="w-[8vw] h-px bg-white/20 mx-auto mb-[5vh]"></div>

                        {/* Request message */}
                        <div className="text-[clamp(1rem,2.5vh,3.5rem)] font-light text-white/70 leading-relaxed text-center">
                          Please silence all devices<br />and refrain from talking
                        </div>

                        {/* Khutbah started at */}
                        <div className="mt-[5vh] text-[clamp(0.7rem,1.3vh,1.5rem)] uppercase tracking-[0.3em] text-emerald-200/50 font-semibold">
                          Khutbah · {jumuahSilenceState.khutbahTime}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              // --- Silence card for any prayer whose iqama just passed ---
              // Uses `silencePrayer` (computed above) which looks backward at
              // the most-recently-started iqama rather than relying on nextSalah
              // (which has already advanced to the following prayer).
              if (silencePrayer) {
                const isSilenceJumuah = !!silencePrayer.isJumuah;
                return (
                  <div className="flex items-center justify-center h-full" style={{ direction: 'ltr' }}>
                    <div className="relative bg-gradient-to-br from-emerald-500/20 via-teal-500/15 to-emerald-600/20 backdrop-blur-xl border border-emerald-400/30 rounded-[clamp(1rem,3vh,4rem)] px-[5vw] py-[8vh] flex flex-col justify-center items-center text-center shadow-2xl overflow-hidden">
                      <div className="relative z-10">
                        {/* Phone Off Icon */}
                        <div className="mb-[4vh] flex justify-center">
                          <div className="relative">
                            <PhoneOff className="w-[clamp(3rem,12vh,16rem)] h-[clamp(3rem,12vh,16rem)] text-emerald-300/70 drop-shadow-2xl" strokeWidth={1.2} />
                          </div>
                        </div>

                        {/* Title */}
                        <div className="text-[clamp(2rem,8vh,10rem)] font-bold mb-[3vh] text-white leading-tight drop-shadow-lg">
                          {isSilenceJumuah ? 'Jumuah' : silencePrayer.name}
                        </div>

                        {/* Status */}
                        <div className="text-[clamp(1rem,3vh,4rem)] font-light text-emerald-100/80 mb-[3vh]">
                          {isSilenceJumuah ? 'Khutbah in Progress' : 'Salah in Progress'}
                        </div>

                        {/* Divider line */}
                        <div className="w-[8vw] h-px bg-white/20 mx-auto mb-[5vh]"></div>

                        {/* Request message */}
                        <div className="text-[clamp(1rem,2.5vh,3.5rem)] font-light text-white/70 leading-relaxed text-center">
                          Please silence all devices<br />and refrain from talking
                        </div>

                        {/* Iqama / Khutbah time */}
                        <div className="mt-[5vh] text-[clamp(0.7rem,1.3vh,1.5rem)] uppercase tracking-[0.3em] text-emerald-200/50 font-semibold">
                          {isSilenceJumuah ? 'Khutbah' : 'Iqama'} · {silencePrayer.iqama}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              // --- Normal next-prayer highlight card ---
              if (!nextSalah) return null;

              const isJumuahNext = !!nextSalah.isJumuah;
              
              // Calculate countdown to adhan or iqama/khutbah with seconds
              const now = currentTime;
              const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
              const adhanMinutes = timeToMinutes(nextSalah.adhan);
              const iqamaMinutes = timeToMinutes(nextSalah.iqama);
              const adhanSeconds = adhanMinutes * 60;
              const iqamaSeconds = iqamaMinutes * 60;

              // Otherwise, show normal countdown
              // For Jumuah: no adhan/iqama split — just countdown to khutbah
              // For regular prayers: adhan → iqama two-phase countdown
              let secondsUntil: number;
              let countdownLabel: string;
              let showAdhanTime = false;
              
              if (isJumuahNext) {
                // Single-phase countdown to khutbah
                secondsUntil = iqamaSeconds - currentSeconds;
                if (secondsUntil < 0) secondsUntil += 24 * 3600;
                countdownLabel = "Time Until Khutbah";
              } else {
                // Two-phase: adhan then iqama
                const isAfterAdhan = currentSeconds >= adhanSeconds && currentSeconds < iqamaSeconds;
                
                if (isAfterAdhan) {
                  secondsUntil = iqamaSeconds - currentSeconds;
                  countdownLabel = "Time Until Iqama";
                } else {
                  secondsUntil = adhanSeconds - currentSeconds;
                  if (secondsUntil < 0) secondsUntil += 24 * 3600;
                  countdownLabel = "Time Until Adhan";
                  showAdhanTime = true;
                }
              }
              
              const hoursUntil = Math.floor(secondsUntil / 3600);
              const minsUntil = Math.floor((secondsUntil % 3600) / 60);
              const secsUntil = secondsUntil % 60;
              
              // Labels for the hero section
              const heroLabel = isJumuahNext ? 'Khutbah' : 'Iqama';
              
              return (
                <div className="flex items-center justify-center h-full" style={{ direction: 'ltr' }}>
                  <div className={`relative bg-gradient-to-br ${currentColorConfig.gradient} backdrop-blur-xl border ${currentColorConfig.border} rounded-[clamp(1rem,3vh,4rem)] px-[5vw] py-[8vh] flex flex-col justify-center items-center text-center shadow-2xl overflow-hidden`}>
                    {/* Content */}
                    <div className="relative z-10">
                      <div className={`text-[clamp(0.6rem,1.2vh,1.5rem)] uppercase tracking-[0.3em] mb-[3vh] ${currentColorConfig.text} font-semibold`}>{isJumuahNext ? 'Next' : 'Next Salah'}</div>
                      <div className="text-[clamp(3rem,12vh,15rem)] font-bold mb-[6vh] text-white leading-none drop-shadow-lg">{nextSalah.name}</div>
                      
                      {/* Countdown */}
                      <div className="mb-[6vh]">
                        <div className={`text-[clamp(0.5rem,1vh,1.2rem)] uppercase tracking-[0.3em] mb-[2vh] ${currentColorConfig.text} font-semibold`}>{countdownLabel}</div>
                        <div className="flex items-center justify-center gap-[2vw]">
                          <div className="text-[clamp(2rem,6vh,8rem)] font-semibold text-white drop-shadow-md">
                            {hoursUntil > 0 
                              ? `${hoursUntil}:${String(minsUntil).padStart(2, '0')}:${String(secsUntil).padStart(2, '0')}`
                              : minsUntil >= 1
                                ? `${minsUntil}:${String(secsUntil).padStart(2, '0')}`
                                : `${secsUntil}s`
                            }
                          </div>
                          {/* Show adhan time next to countdown when counting down to adhan (non-Jumuah only) */}
                          {showAdhanTime && (
                            <div className="text-[clamp(1.5rem,4vh,6rem)] font-light text-white/60">
                              {nextSalah.adhan}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Iqama / Khutbah Time - Hero */}
                      <div>
                        <div className={`text-[clamp(0.5rem,1vh,1.2rem)] uppercase tracking-[0.3em] mb-[3vh] ${currentColorConfig.text} font-semibold`}>{heroLabel}</div>
                        <div className="text-[clamp(4rem,14vh,18rem)] font-bold text-white leading-none tracking-tight drop-shadow-lg">{nextSalah.iqama}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}