import { CalculatedIqamaTimes } from '../utils/iqamaCalculator';

interface PrayerTimesDisplayProps {
  times: CalculatedIqamaTimes;
  nextPrayerName?: string;
  showAdhan?: boolean;
  offeredPrayers?: ('fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha')[];
}

export function PrayerTimesDisplay({ times, nextPrayerName, showAdhan = true, offeredPrayers }: PrayerTimesDisplayProps) {
  const today = new Date();
  const isFriday = today.getDay() === 5;

  // Helper: check if a prayer is offered (all offered if field is undefined/empty)
  const isOffered = (key: string) => !offeredPrayers || offeredPrayers.length === 0 || offeredPrayers.includes(key as any);

  const prayers = [
    ...(isOffered('fajr') ? [{ name: 'Fajr', key: 'fajr', adhan: times.fajr.adhan, iqama: times.fajr.iqama }] : []),
    ...(!isFriday && isOffered('dhuhr') ? [{ name: 'Dhuhr', key: 'dhuhr', adhan: times.dhuhr.adhan, iqama: times.dhuhr.iqama }] : []),
    ...(isOffered('asr') ? [{ name: 'Asr', key: 'asr', adhan: times.asr.adhan, iqama: times.asr.iqama }] : []),
    ...(isOffered('maghrib') ? [{ name: 'Maghrib', key: 'maghrib', adhan: times.maghrib.adhan, iqama: times.maghrib.iqama }] : []),
    ...(isOffered('isha') ? [{ name: 'Isha', key: 'isha', adhan: times.isha.adhan, iqama: times.isha.iqama }] : []),
  ];

  return (
    <div className="space-y-2">
      {prayers.map(prayer => {
        const isNext = nextPrayerName?.toLowerCase() === prayer.key;
        return (
          <div 
            key={prayer.name}
            className={`flex items-center justify-between p-4 rounded-2xl transition-all ${
              isNext 
                ? 'bg-gray-900 dark:bg-white/[0.08] border border-gray-800 dark:border-white/[0.1] shadow-[0_2px_8px_rgba(0,0,0,0.12)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
                : 'bg-gray-50/80 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.06]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {isNext && (
                <div className="w-1.5 h-8 rounded-full bg-blue-500 dark:bg-blue-400 flex-shrink-0"></div>
              )}
              <span className={`font-semibold text-[15px] ${isNext ? 'text-white' : 'text-gray-700 dark:text-white'}`}>
                {prayer.name}
                {isNext && <span className="ml-2 text-[11px] font-medium text-white/60 dark:text-white/40 uppercase tracking-wider">Next</span>}
              </span>
            </div>
            <div className="text-right flex-shrink-0">
              {showAdhan && prayer.adhan && (
                <div className={`text-[12px] ${isNext ? 'text-white/55' : 'text-gray-400 dark:text-white/40'} mb-0.5 whitespace-nowrap`}>
                  Adhan {prayer.adhan}
                </div>
              )}
              <div className={`text-xl font-bold ${isNext ? 'text-white' : 'text-gray-900 dark:text-white'} whitespace-nowrap`}>
                {prayer.iqama}
              </div>
            </div>
          </div>
        );
      })}

      {/* Display Jumuah times - always show if they exist */}
      {times.jumuah && (() => {
        const jumuahTimes = Array.isArray(times.jumuah) ? times.jumuah : [times.jumuah];
        return jumuahTimes.map((jumuah, index) => {
          const isNext = nextPrayerName?.toLowerCase() === 'jumuah';
          return (
            <div 
              key={`jumuah-${index}`}
              className={`flex items-center justify-between p-4 rounded-2xl transition-all ${
                isNext 
                  ? 'bg-gray-900 dark:bg-white/[0.08] border border-gray-800 dark:border-white/[0.1] shadow-[0_2px_8px_rgba(0,0,0,0.12)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
                  : 'bg-gray-50/80 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.06]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {isNext && (
                  <div className="w-1.5 h-8 rounded-full bg-blue-500 dark:bg-blue-400 flex-shrink-0"></div>
                )}
                <span className={`font-semibold text-[15px] ${isNext ? 'text-white' : 'text-gray-700 dark:text-white'}`}>
                  {jumuahTimes.length > 1 ? `Jumuah ${index + 1}` : 'Jumuah'}
                  {isNext && <span className="ml-2 text-[11px] font-medium text-white/60 dark:text-white/40 uppercase tracking-wider">Next</span>}
                </span>
              </div>
              <div className="text-right flex-shrink-0">
                <div className={`text-[12px] ${isNext ? 'text-white/55' : 'text-gray-400 dark:text-white/40'} mb-0.5 whitespace-nowrap`}>
                  Khutbah
                </div>
                <div className={`text-xl font-bold ${isNext ? 'text-white' : 'text-gray-900 dark:text-white'} whitespace-nowrap`}>
                  {jumuah.khutbah}
                </div>
              </div>
            </div>
          );
        });
      })()}
    </div>
  );
}