import { useState, useMemo, useRef } from 'react';
import { ArrowLeft, Printer, ChevronLeft, ChevronRight, Download, Moon } from 'lucide-react';
import { Mosque } from '../App';
import { calculateIqamaTimes } from '../utils/iqamaCalculator';
import { hasScheduledOverride } from '../utils/effectiveIqamaTime';
import { toHijri } from 'hijri-converter';

interface PrintableTimetableProps {
  mosque: Mosque;
  onBack: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const HIJRI_MONTH_NAMES = [
  'Muharram', 'Safar', "Rabī' al-Awwal", "Rabī' al-Thānī",
  "Jumādā al-Ūlā", "Jumādā al-Thāniyah", 'Rajab', "Sha'bān",
  'Ramaḍān', 'Shawwāl', "Dhū al-Qa'dah", 'Dhū al-Ḥijjah',
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface DayData {
  date: Date;
  dayOfMonth: number;
  dayOfWeek: number;
  isFriday: boolean;
  hijriDate: string;
  adhan: Record<string, string>;
  iqama: Record<string, string>;
  overrides: Record<string, boolean>; // tracks which prayers have scheduled overrides
  jumuah?: string;
}

export function PrintableTimetable({ mosque, onBack }: PrintableTimetableProps) {
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [showAdhan, setShowAdhan] = useState(true);
  const tableRef = useRef<HTMLDivElement>(null);

  const allPrayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
  // Filter to only offered prayers (all offered if field is undefined/empty)
  const prayers = allPrayers.filter(p => !mosque.offeredPrayers || mosque.offeredPrayers.length === 0 || mosque.offeredPrayers.includes(p));
  const prayerLabels: Record<string, string> = {
    fajr: 'Fajr', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha',
  };

  // Generate all days for the month
  const days: DayData[] = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const result: DayData[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const calculated = calculateIqamaTimes(
        mosque.latitude, mosque.longitude, mosque.iqamaTimes, date,
        mosque.calculationMethod || 'NorthAmerica',
        mosque.asrMethod || 'Standard',
        mosque.scheduledTimeChanges
      );

      // Hijri date
      let hijriDate = '';
      try {
        const h = toHijri(date.getFullYear(), date.getMonth() + 1, date.getDate());
        hijriDate = `${h.hd} ${HIJRI_MONTH_NAMES[h.hm - 1]}`;
      } catch {}

      // Jumuah time
      let jumuah: string | undefined;
      if (date.getDay() === 5) {
        const j = mosque.iqamaTimes.jumuah;
        if (Array.isArray(j)) {
          jumuah = j.map(jt => jt.khutbah?.time || '').filter(Boolean).join(' / ');
        } else if (j && typeof j === 'object' && 'khutbah' in j) {
          jumuah = (j as any).khutbah?.time || '';
        } else if (typeof j === 'string') {
          jumuah = j;
        }
      }

      result.push({
        date,
        dayOfMonth: d,
        dayOfWeek: date.getDay(),
        isFriday: date.getDay() === 5,
        hijriDate,
        adhan: Object.fromEntries(prayers.map(p => [p, calculated[p].adhan])),
        iqama: Object.fromEntries(prayers.map(p => [p, calculated[p].iqama])),
        overrides: Object.fromEntries(prayers.map(p => [p, hasScheduledOverride(p, mosque.scheduledTimeChanges, date)])),
        jumuah,
      });
    }

    return result;
  }, [mosque, month, year]);

  // Get hijri month range for the header
  const hijriRange = useMemo(() => {
    if (days.length === 0) return '';
    try {
      const first = toHijri(days[0].date.getFullYear(), days[0].date.getMonth() + 1, days[0].date.getDate());
      const last = toHijri(days[days.length - 1].date.getFullYear(), days[days.length - 1].date.getMonth() + 1, days[days.length - 1].date.getDate());
      if (first.hm === last.hm) {
        return `${HIJRI_MONTH_NAMES[first.hm - 1]} ${first.hy} AH`;
      }
      return `${HIJRI_MONTH_NAMES[first.hm - 1]} – ${HIJRI_MONTH_NAMES[last.hm - 1]} ${last.hy} AH`;
    } catch {
      return '';
    }
  }, [days]);

  const navigateMonth = (delta: number) => {
    let newMonth = month + delta;
    let newYear = year;
    if (newMonth < 0) { newMonth = 11; newYear--; }
    if (newMonth > 11) { newMonth = 0; newYear++; }
    setMonth(newMonth);
    setYear(newYear);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0A0A0A]">
      {/* Screen-only header */}
      <div className="print:hidden sticky top-0 z-10 bg-gray-50/80 dark:bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-xl transition-colors active:scale-95"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-white/80" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-gray-900 dark:text-white truncate">Monthly Timetable</h1>
            <p className="text-xs text-gray-500 dark:text-white/40 truncate">{mosque.name}</p>
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-sm font-medium active:scale-[0.98] transition-transform"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      {/* Controls — screen only */}
      <div className="print:hidden max-w-5xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          {/* Month navigator */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-lg transition-colors active:scale-95"
            >
              <ChevronLeft className="w-4.5 h-4.5 text-gray-600 dark:text-white/60" />
            </button>
            <div className="text-center min-w-[180px]">
              <div className="text-gray-900 dark:text-white font-medium">
                {MONTH_NAMES[month]} {year}
              </div>
              {hijriRange && (
                <div className="text-xs text-gray-500 dark:text-white/40">{hijriRange}</div>
              )}
            </div>
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-lg transition-colors active:scale-95"
            >
              <ChevronRight className="w-4.5 h-4.5 text-gray-600 dark:text-white/60" />
            </button>
          </div>

          {/* Toggles */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showAdhan}
                onChange={e => setShowAdhan(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
              />
              <span className="text-sm text-gray-600 dark:text-white/60">Show Adhan</span>
            </label>
          </div>
        </div>
      </div>

      {/* Printable timetable */}
      <div ref={tableRef} className="max-w-5xl mx-auto px-4 pb-8 print:px-0 print:max-w-none">
        {/* Print header (hidden on screen) */}
        <div className="hidden print:block mb-4 text-center">
          <h1 className="text-xl font-semibold">{mosque.name}</h1>
          <p className="text-sm text-gray-600">{mosque.address}</p>
          <p className="text-base font-medium mt-1">
            {MONTH_NAMES[month]} {year} Prayer Timetable
          </p>
          {hijriRange && <p className="text-sm text-gray-500">{hijriRange}</p>}
          {mosque.website && <p className="text-xs text-gray-400 mt-0.5">{mosque.website}</p>}
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-[#1C1C1C] rounded-2xl print:rounded-none border border-gray-200 dark:border-white/[0.1] print:border-gray-300 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse">
              <thead>
                <tr className="bg-gray-900 dark:bg-gray-800 print:bg-gray-900 text-white">
                  <th className="px-2 py-2.5 text-xs font-medium text-left sticky left-0 bg-gray-900 dark:bg-gray-800 print:bg-gray-900 z-10" style={{ minWidth: '80px' }}>
                    Date
                  </th>
                  <th className="px-1.5 py-2.5 text-[10px] font-medium tracking-wider" style={{ minWidth: '30px' }}>
                    Day
                  </th>
                  {prayers.map(prayer => (
                    <th key={prayer} className="px-1.5 py-2.5" colSpan={showAdhan ? 2 : 1} style={{ minWidth: showAdhan ? '120px' : '65px' }}>
                      <div className="text-xs font-medium">{prayerLabels[prayer]}</div>
                      {showAdhan && (
                        <div className="flex text-[9px] font-normal opacity-60 mt-0.5">
                          <span className="flex-1">Adhan</span>
                          <span className="flex-1">Iqama</span>
                        </div>
                      )}
                    </th>
                  ))}
                  <th className="px-1.5 py-2.5 text-xs font-medium" style={{ minWidth: '65px' }}>
                    Jumu'ah
                  </th>
                </tr>
              </thead>
              <tbody>
                {days.map((day, idx) => {
                  const isToday =
                    day.date.getFullYear() === new Date().getFullYear() &&
                    day.date.getMonth() === new Date().getMonth() &&
                    day.date.getDate() === new Date().getDate();

                  return (
                    <tr
                      key={day.dayOfMonth}
                      className={`border-t border-gray-100 dark:border-white/[0.06] print:border-gray-200 ${
                        day.isFriday
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/10 print:bg-emerald-50'
                          : idx % 2 === 0
                            ? 'bg-white dark:bg-transparent'
                            : 'bg-gray-50/50 dark:bg-white/[0.02] print:bg-gray-50'
                      } ${isToday ? 'ring-2 ring-inset ring-emerald-400 dark:ring-emerald-500 print:ring-1 print:ring-black' : ''}`}
                    >
                      {/* Date cell */}
                      <td className={`px-2 py-1.5 text-left sticky left-0 z-10 ${
                        day.isFriday
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/10 print:bg-emerald-50'
                          : idx % 2 === 0
                            ? 'bg-white dark:bg-[#1C1C1C]'
                            : 'bg-gray-50/50 dark:bg-[#1E1E1E] print:bg-gray-50'
                      } ${isToday ? 'ring-2 ring-inset ring-emerald-400 dark:ring-emerald-500 print:ring-1 print:ring-black' : ''}`}>
                        <div className="text-xs text-gray-900 dark:text-white font-medium">
                          {day.dayOfMonth}
                        </div>
                        <div className="text-[9px] text-gray-400 dark:text-white/30 whitespace-nowrap">
                          {day.hijriDate}
                        </div>
                      </td>

                      {/* Day */}
                      <td className={`px-1 py-1.5 text-[11px] ${
                        day.isFriday
                          ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                          : 'text-gray-500 dark:text-white/40'
                      }`}>
                        {DAY_NAMES[day.dayOfWeek]}
                      </td>

                      {/* Prayer times */}
                      {prayers.map(prayer => {
                        const isOverride = day.overrides[prayer];
                        return showAdhan ? (
                          <td key={prayer} className={`px-0 py-1.5 ${isOverride ? 'bg-blue-50/60 dark:bg-blue-950/15 print:bg-blue-50' : ''}`} colSpan={2}>
                            <div className="flex text-[11px] tabular-nums">
                              <span className="flex-1 text-gray-400 dark:text-white/30">{day.adhan[prayer]}</span>
                              <span className={`flex-1 font-medium ${isOverride ? 'text-blue-700 dark:text-blue-300 print:text-blue-700' : 'text-gray-900 dark:text-white'}`}>
                                {day.iqama[prayer]}
                                {isOverride && <span className="text-[8px] align-super ml-0.5">*</span>}
                              </span>
                            </div>
                          </td>
                        ) : (
                          <td key={prayer} className={`px-1 py-1.5 text-[11px] font-medium tabular-nums ${isOverride ? 'text-blue-700 dark:text-blue-300 bg-blue-50/60 dark:bg-blue-950/15 print:text-blue-700 print:bg-blue-50' : 'text-gray-900 dark:text-white'}`}>
                            {day.iqama[prayer]}
                            {isOverride && <span className="text-[8px] align-super ml-0.5">*</span>}
                          </td>
                        );
                      })}

                      {/* Jumuah */}
                      <td className="px-1 py-1.5 text-[11px] tabular-nums">
                        {day.jumuah ? (
                          <span className="text-emerald-700 dark:text-emerald-400 font-medium">{day.jumuah}</span>
                        ) : (
                          <span className="text-gray-200 dark:text-white/10">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend for scheduled overrides */}
        {days.some(d => Object.values(d.overrides).some(Boolean)) && (
          <div className="mt-3 flex items-center gap-2 text-[11px] text-blue-600 dark:text-blue-400 px-1">
            <span className="inline-block w-3 h-3 rounded bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/30" />
            <span><span className="font-medium">*</span> = Scheduled iqama time override</span>
          </div>
        )}

        {/* Footer — print only */}
        <div className="hidden print:block mt-4 text-center text-xs text-gray-400">
          <p>Generated by Dāimūn — Community Iqama Times</p>
          <p>Printed {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>

        {/* Screen footer note */}
        <p className="print:hidden text-xs text-gray-400 dark:text-white/25 text-center mt-4">
          Tip: Use your browser's print dialog to save as PDF or print directly
        </p>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .hidden.print\\:block { display: block !important; }
          @page { size: landscape; margin: 0.5in; }
          table { font-size: 10px; }
          th, td { padding: 3px 4px !important; }
        }
      `}</style>
    </div>
  );
}