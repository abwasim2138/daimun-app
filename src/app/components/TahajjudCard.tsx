import { Moon, Star } from 'lucide-react';

interface TahajjudCardProps {
  data: {
    maghribAdhanTime: string; // e.g., "7:15 PM"
    fajrAdhanTime: string;    // e.g., "5:30 AM"
    ishaAdhanTime: string;    // e.g., "8:30 PM"
    visible: boolean;         // true when in the Tahajjud window (after Isha or before Fajr)
  };
}

/**
 * Parse a 12-hour time string like "8:30 PM" into minutes since midnight
 */
function parseToMinutes(timeStr: string): number | null {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return null;

  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[3].toUpperCase();

  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight back to a 12-hour time string
 */
function minutesToTimeStr(totalMinutes: number): string {
  // Normalize to 0–1439
  totalMinutes = ((totalMinutes % 1440) + 1440) % 1440;

  const hour24 = Math.floor(totalMinutes / 60);
  const mins = Math.round(totalMinutes % 60);

  const period = hour24 >= 12 ? 'PM' : 'AM';
  let hour12 = hour24 % 12;
  if (hour12 === 0) hour12 = 12;

  return `${hour12}:${mins.toString().padStart(2, '0')} ${period}`;
}

/**
 * Calculate the start of the last third of the night.
 * Night = Maghrib to Fajr (crosses midnight).
 * Last third starts at: Maghrib + 2/3 * nightDuration
 */
function calculateLastThirdStart(maghribMinutes: number, fajrMinutes: number): number {
  // Night duration handles midnight crossing
  let nightDuration = fajrMinutes - maghribMinutes;
  if (nightDuration <= 0) {
    nightDuration += 24 * 60; // crosses midnight
  }

  const lastThirdOffset = (2 / 3) * nightDuration;
  return (maghribMinutes + lastThirdOffset) % (24 * 60);
}

export function TahajjudCard({ data }: TahajjudCardProps) {
  const { maghribAdhanTime, fajrAdhanTime, ishaAdhanTime, visible } = data;

  if (!visible || !ishaAdhanTime || !maghribAdhanTime || !fajrAdhanTime) {
    return null;
  }

  const maghribMin = parseToMinutes(maghribAdhanTime);
  const fajrMin = parseToMinutes(fajrAdhanTime);
  const ishaMin = parseToMinutes(ishaAdhanTime);

  if (maghribMin === null || fajrMin === null || ishaMin === null) {
    return null;
  }

  const lastThirdStart = calculateLastThirdStart(maghribMin, fajrMin);

  const lastThirdStr = minutesToTimeStr(lastThirdStart);
  const fajrStr = minutesToTimeStr(fajrMin);

  return (
    <a
      href="https://quran.com/17?startingVerse=79"
      target="_blank"
      rel="noopener noreferrer"
      className="block mb-4 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 dark:from-indigo-700 dark:to-purple-800 p-4 shadow-lg hover:shadow-xl transition-shadow cursor-pointer animate-card-enter"
    >
      <div className="flex items-start gap-3">
        <div className="relative bg-white/20 rounded-full p-2 flex-shrink-0">
          <Moon className="w-5 h-5 text-white" />
          <div
            className="absolute -top-1 -right-1 animate-[pulse_3s_ease-in-out_infinite]"
          >
            <Star className="w-2.5 h-2.5 text-yellow-300 fill-yellow-300" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white font-semibold text-sm mb-1">
            Tahajjud Tonight
          </div>
          <div className="space-y-0.5">
            <div className="text-white/90 text-xs">
              Last third begins at {lastThirdStr} · Fajr at {fajrStr}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/15">
            <div className="text-right mb-2" dir="rtl">
              <p className="text-white/90 text-sm leading-relaxed font-arabic">
                وَمِنَ ٱلَّيْلِ فَتَهَجَّدْ بِهِۦ نَافِلَةً لَّكَ عَسَىٰٓ أَن يَبْعَثَكَ رَبُّكَ مَقَامًا مَّحْمُودًا
              </p>
            </div>
            <p className="text-white/50 text-[10px] italic leading-relaxed">
              Al-Isra 17:79 — &ldquo;And rise at ˹the last˺ part of the night, offering additional prayers, so your Lord may raise you to a station of praise.&rdquo;
            </p>
          </div>
        </div>
      </div>
    </a>
  );
}