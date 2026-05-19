import { useMemo, useState, useEffect } from 'react';
import { Mosque } from '../App';
import { calculatePrayerTimes, formatPrayerTime } from '../utils/prayerTimes';

type PrayerWindow = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

interface PrayerTheme {
  window: PrayerWindow;
  bgClass: string;
  headerClass: string;
  titleClass: string;
  titleHoverClass: string;
}

/**
 * Parse "H:MM AM/PM" into minutes since midnight
 */
function parseTimeToMinutes(timeStr: string): number {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return 0;
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[3].toUpperCase();
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

/**
 * Determine the current prayer window based on adhan times
 */
function getCurrentPrayerWindow(
  lat: number,
  lng: number,
  calculationMethod: string,
  asrMethod: 'Standard' | 'Hanafi'
): PrayerWindow {
  const now = new Date();
  const times = calculatePrayerTimes(lat, lng, now, calculationMethod, asrMethod);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const fajrMin = parseTimeToMinutes(formatPrayerTime(times.fajr));
  const sunriseMin = parseTimeToMinutes(formatPrayerTime(times.sunrise));
  const dhuhrMin = parseTimeToMinutes(formatPrayerTime(times.dhuhr));
  const asrMin = parseTimeToMinutes(formatPrayerTime(times.asr));
  const maghribMin = parseTimeToMinutes(formatPrayerTime(times.maghrib));
  const ishaMin = parseTimeToMinutes(formatPrayerTime(times.isha));

  if (currentMinutes >= ishaMin || currentMinutes < fajrMin) return 'isha';
  if (currentMinutes >= maghribMin) return 'maghrib';
  if (currentMinutes >= asrMin) return 'asr';
  if (currentMinutes >= dhuhrMin) return 'dhuhr';
  if (currentMinutes >= sunriseMin) return 'sunrise';
  return 'fajr';
}

/**
 * Theme configurations for each prayer window.
 * Designed to be extremely subtle — a faint ambient tint at the top
 * of the page that fades to the baseline color, like Apple Weather.
 */
const themes: Record<PrayerWindow, PrayerTheme> = {
  fajr: {
    window: 'fajr',
    // Pre-dawn: cool-tinted parchment
    bgClass: 'bg-[#E6DDD6] dark:bg-black',
    headerClass: 'bg-white/80 dark:bg-black/80',
    // Dawn palette — steel blue to soft rose
    titleClass: 'from-blue-500 via-purple-400 to-rose-400 dark:from-blue-400 dark:via-purple-300 dark:to-rose-300',
    titleHoverClass: 'hover:from-blue-600 hover:via-purple-500 hover:to-rose-500 dark:hover:from-blue-300 dark:hover:via-purple-200 dark:hover:to-rose-200',
  },
  sunrise: {
    window: 'sunrise',
    // Post-sunrise: warm golden parchment
    bgClass: 'bg-[#F0E2D0] dark:bg-black',
    headerClass: 'bg-white/80 dark:bg-black/80',
    // Morning warmth — warm gold to soft orange
    titleClass: 'from-amber-500 via-yellow-500 to-orange-400 dark:from-amber-400 dark:via-yellow-400 dark:to-orange-300',
    titleHoverClass: 'hover:from-amber-600 hover:via-yellow-600 hover:to-orange-500 dark:hover:from-amber-300 dark:hover:via-yellow-300 dark:hover:to-orange-200',
  },
  dhuhr: {
    window: 'dhuhr',
    // Midday: bright warm tan
    bgClass: 'bg-[#EDE5D8] dark:bg-black',
    headerClass: 'bg-white/80 dark:bg-black/80',
    // Bright midday — warm amber (the classic/default feel)
    titleClass: 'from-amber-600 via-yellow-600 to-orange-500 dark:from-amber-500 dark:via-yellow-500 dark:to-orange-400',
    titleHoverClass: 'hover:from-amber-700 hover:via-yellow-700 hover:to-orange-600 dark:hover:from-amber-400 dark:hover:via-yellow-400 dark:hover:to-orange-300',
  },
  asr: {
    window: 'asr',
    // Golden hour: warm amber tan
    bgClass: 'bg-[#EDE0CE] dark:bg-black',
    headerClass: 'bg-white/80 dark:bg-black/80',
    // Golden hour — deep gold to warm copper
    titleClass: 'from-amber-600 via-orange-500 to-yellow-600 dark:from-amber-400 dark:via-orange-400 dark:to-yellow-400',
    titleHoverClass: 'hover:from-amber-700 hover:via-orange-600 hover:to-yellow-700 dark:hover:from-amber-300 dark:hover:via-orange-300 dark:hover:to-yellow-300',
  },
  maghrib: {
    window: 'maghrib',
    // Sunset: warm rose-tinted parchment
    bgClass: 'bg-[#EADDD4] dark:bg-black',
    headerClass: 'bg-white/80 dark:bg-black/80',
    // Sunset palette — coral to rose to purple
    titleClass: 'from-orange-500 via-rose-500 to-purple-500 dark:from-orange-400 dark:via-rose-400 dark:to-purple-400',
    titleHoverClass: 'hover:from-orange-600 hover:via-rose-600 hover:to-purple-600 dark:hover:from-orange-300 dark:hover:via-rose-300 dark:hover:to-purple-300',
  },
  isha: {
    window: 'isha',
    // Night: cool evening parchment
    bgClass: 'bg-[#E2DBD5] dark:bg-black',
    headerClass: 'bg-white/80 dark:bg-black/80',
    // Night sky — indigo to blue to violet
    titleClass: 'from-indigo-400 via-blue-400 to-violet-400 dark:from-indigo-300 dark:via-blue-300 dark:to-violet-300',
    titleHoverClass: 'hover:from-indigo-500 hover:via-blue-500 hover:to-violet-500 dark:hover:from-indigo-200 dark:hover:via-blue-200 dark:hover:to-violet-200',
  },
};

/**
 * Hook that returns the current prayer-window-aware theme.
 * Updates every 60 seconds to catch prayer transitions.
 */
export function usePrayerTheme(
  mosques: Mosque[],
  favorites: Set<string>
): PrayerTheme {
  // Tick every 60s to re-evaluate the prayer window
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  const theme = useMemo(() => {
    // Pick a representative mosque (first favorite, or first in list)
    const representative =
      mosques.find(m => favorites.has(m.id)) || mosques[0];

    if (!representative) {
      // No mosques loaded yet — default to a neutral theme
      return themes.dhuhr;
    }

    const window = getCurrentPrayerWindow(
      representative.latitude,
      representative.longitude,
      representative.calculationMethod || 'NorthAmerica',
      representative.asrMethod || 'Standard'
    );

    return themes[window];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mosques, favorites, tick]);

  return theme;
}