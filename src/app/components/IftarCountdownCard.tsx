import { useState, useEffect, useMemo } from 'react';
import { Sun, Clock, MapPin } from 'lucide-react';
import { Mosque } from '../App';
import { calculatePrayerTimes, formatPrayerTime, timeToMinutes } from '../utils/prayerTimes';
import { calculateIqamaTimes, getNextPrayer } from '../utils/iqamaCalculator';

interface IftarCountdownCardProps {
  mosques: Mosque[];
  favorites: Set<string>;
  userLocation: { lat: number; lng: number } | null;
}

/**
 * IftarCountdownCard
 *
 * During fasting hours (Fajr adhan → Maghrib adhan), this card shows a
 * live countdown to Maghrib **adhan** (iftar). Beneath the countdown it
 * surfaces the next upcoming **iqama** time so users know exactly when
 * the congregational prayer starts.
 *
 * Renders nothing outside fasting hours (parent already gates on Ramadan).
 */
export function IftarCountdownCard({ mosques, favorites, userLocation }: IftarCountdownCardProps) {
  const [now, setNow] = useState(new Date());

  // Tick every second for a live countdown
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Representative mosque: first favourite, or first mosque
  const mosque = useMemo(
    () => mosques.find((m) => favorites.has(m.id)) || mosques[0],
    [mosques, favorites]
  );

  const data = useMemo(() => {
    if (!mosque) return null;

    const adhan = calculatePrayerTimes(
      mosque.latitude,
      mosque.longitude,
      now,
      mosque.calculationMethod || 'NorthAmerica',
      mosque.asrMethod || 'Standard'
    );

    const fajrStr = formatPrayerTime(adhan.fajr);
    const maghribStr = formatPrayerTime(adhan.maghrib);
    const fajrMin = timeToMinutes(fajrStr);
    const maghribMin = timeToMinutes(maghribStr);
    const currentMin = now.getHours() * 60 + now.getMinutes();

    // Only show during fasting hours
    const isFasting = currentMin >= fajrMin && currentMin < maghribMin;
    if (!isFasting) return null;

    // Remaining seconds until Maghrib adhan
    const maghribDate = adhan.maghrib;
    const remainingMs = maghribDate.getTime() - now.getTime();
    const remainingSec = Math.max(0, Math.floor(remainingMs / 1000));

    // Next iqama
    const iqamaTimes = calculateIqamaTimes(
      mosque.latitude,
      mosque.longitude,
      mosque.iqamaTimes,
      now,
      mosque.calculationMethod || 'NorthAmerica',
      mosque.asrMethod || 'Standard',
      mosque.scheduledTimeChanges
    );
    const next = getNextPrayer(iqamaTimes, mosque.offeredPrayers);

    return {
      remainingSec,
      maghribStr,
      nextPrayerName: next.name,
      nextIqamaTime: next.iqamaTime,
      nextAdhanTime: next.adhanTime,
      mosqueName: mosque.name,
    };
  }, [mosque, now]);

  if (!data) return null;

  const { remainingSec, maghribStr, nextPrayerName, nextIqamaTime, nextAdhanTime, mosqueName } = data;

  const hours = Math.floor(remainingSec / 3600);
  const minutes = Math.floor((remainingSec % 3600) / 60);
  const seconds = remainingSec % 60;

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="mb-4 rounded-2xl overflow-hidden bg-gradient-to-br from-[#6B2F4A] to-[#4A1E35] dark:from-[#5A2840] dark:to-[#3D1A2D] shadow-lg">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
            <Sun className="w-4 h-4 text-amber-300" />
          </div>
          <div>
            <div className="text-[13px] text-white/90 font-medium">Iftar Countdown</div>
            <div className="text-[11px] text-white/50">Maghrib Adhan · {maghribStr}</div>
          </div>
        </div>

        {/* Countdown digits */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {/* Hours */}
          <div className="flex flex-col items-center">
            <div className="bg-white/10 backdrop-blur-sm border border-white/[0.08] rounded-xl px-4 py-3 min-w-[64px] text-center">
              <span className="text-3xl font-bold text-white tabular-nums tracking-tight">{pad(hours)}</span>
            </div>
            <span className="text-[10px] text-white/40 uppercase tracking-wider mt-1.5">hrs</span>
          </div>

          <span className="text-2xl text-white/30 font-light mt-[-14px]">:</span>

          {/* Minutes */}
          <div className="flex flex-col items-center">
            <div className="bg-white/10 backdrop-blur-sm border border-white/[0.08] rounded-xl px-4 py-3 min-w-[64px] text-center">
              <span className="text-3xl font-bold text-white tabular-nums tracking-tight">{pad(minutes)}</span>
            </div>
            <span className="text-[10px] text-white/40 uppercase tracking-wider mt-1.5">min</span>
          </div>

          <span className="text-2xl text-white/30 font-light mt-[-14px]">:</span>

          {/* Seconds */}
          <div className="flex flex-col items-center">
            <div className="bg-white/10 backdrop-blur-sm border border-white/[0.08] rounded-xl px-4 py-3 min-w-[64px] text-center">
              <span className="text-3xl font-bold text-white tabular-nums tracking-tight">{pad(seconds)}</span>
            </div>
            <span className="text-[10px] text-white/40 uppercase tracking-wider mt-1.5">sec</span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/10 my-3" />

        {/* Next iqama — clearly labeled */}
        <div className="bg-white/[0.08] border border-white/[0.06] rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Clock className="w-3.5 h-3.5 text-white/50" />
            <div>
              <div className="text-[11px] text-white/45 uppercase tracking-wider">Upcoming Iqama</div>
              <div className="text-[15px] text-white font-medium mt-0.5">{nextPrayerName}</div>
            </div>
          </div>
          <div className="text-right">
            {nextAdhanTime && (
              <div className="text-[11px] text-white/40">Adhan {nextAdhanTime}</div>
            )}
            <div className="text-xl text-white font-bold tabular-nums">{nextIqamaTime}</div>
            <div className="text-[10px] text-white/40 uppercase tracking-wider">Iqama</div>
          </div>
        </div>

        {/* Location disclaimer */}
        {!userLocation && (
          <div className="flex items-start gap-2 mt-3 px-1">
            <MapPin className="w-3 h-3 text-white/30 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-white/35 leading-relaxed">
              Time is based on <span className="text-white/50">{mosqueName}</span>'s location. Enable location services for a more accurate countdown.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}