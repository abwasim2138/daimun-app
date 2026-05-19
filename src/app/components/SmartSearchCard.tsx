import { useMemo } from 'react';
import { Clock, MapPin, Moon, Utensils, BookOpen, Rows3, Star, Calendar, Navigation, HandCoins } from 'lucide-react';
import { Mosque, IqamaTimes, JumuahTime } from '../App';
import { calculatePrayerTimes, formatPrayerTime, timeToMinutes } from '../utils/prayerTimes';
import { calculateIqamaTimes } from '../utils/iqamaCalculator';

interface SmartSearchCardProps {
  query: string;
  mosques: Mosque[];
  favorites: Set<string>;
  userLocation: { latitude: number; longitude: number } | null;
}

type Intent =
  | { type: 'prayer_time'; prayer: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' }
  | { type: 'next_prayer' }
  | { type: 'iftar' }
  | { type: 'suhoor' }
  | { type: 'jumuah' }
  | { type: 'taraweeh' }
  | { type: 'itikaf' }
  | { type: 'ramadan_info' }
  | { type: 'eid_info' }
  | { type: 'zakat' }
  | { type: 'qiyam' }
  | { type: 'iftar_provided' }
  | { type: 'rakat'; count: 8 | 20 }
  | { type: 'khatm' }
  | { type: 'distance' }
  | null;

/**
 * Informational intents — these show an answer card above results
 * but should NOT filter the mosque list. Only feature-search intents
 * (taraweeh, rakat, itikaf, qiyam, iftar_provided, khatm, jumuah)
 * should actually filter mosques.
 */
const INFORMATIONAL_INTENTS = new Set([
  'prayer_time', 'next_prayer', 'iftar', 'suhoor',
  'ramadan_info', 'eid_info', 'zakat', 'distance',
]);

/** Returns true if the query is an informational question (not a mosque-filtering search). */
export function isInformationalSearch(query: string): boolean {
  const intent = parseIntent(query);
  return intent !== null && INFORMATIONAL_INTENTS.has(intent.type);
}

const PRAYER_LABELS: Record<string, string> = {
  fajr: 'Fajr',
  dhuhr: 'Dhuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
};

function parseIntent(query: string): Intent {
  const q = query.toLowerCase().trim();
  if (!q || q.length < 2) return null;

  // Prayer time queries
  if (/\b(fajr|dawn|morning prayer)\b/.test(q)) return { type: 'prayer_time', prayer: 'fajr' };
  if (/\b(dhuhr|zuhr|noon prayer|afternoon prayer)\b/.test(q)) return { type: 'prayer_time', prayer: 'dhuhr' };
  if (/\basr\b/.test(q)) return { type: 'prayer_time', prayer: 'asr' };
  if (/\b(maghrib|sunset|evening prayer)\b/.test(q)) return { type: 'prayer_time', prayer: 'maghrib' };
  if (/\b(isha|night prayer)\b/.test(q) && !/taraw|qiyam|tahajjud/.test(q)) return { type: 'prayer_time', prayer: 'isha' };

  // Next prayer
  if (/\b(next prayer|upcoming prayer|what.?s next|next salah|next salat)\b/.test(q)) return { type: 'next_prayer' };

  // Iftar / suhoor
  if (/\b(iftar|iftaar|break.?fast|when.*(eat|open))\b/.test(q)) return { type: 'iftar' };
  if (/\b(suhoor|suhur|sehri|sahur|pre.?dawn)\b/.test(q)) return { type: 'suhoor' };

  // Jumuah
  if (/\b(jum[ua']+h?|friday|khutba[h]?)\b/.test(q)) return { type: 'jumuah' };

  // Taraweeh specifics
  if (/\b20\s*rak/i.test(q)) return { type: 'rakat', count: 20 };
  if (/\b8\s*rak/i.test(q)) return { type: 'rakat', count: 8 };
  if (/\b(taraw[ei]+h|taravih)\b/.test(q)) return { type: 'taraweeh' };

  // Ramadan features
  if (/\b(itikaf|i.?tikaf|last.?10|last.?ten)\b/.test(q)) return { type: 'itikaf' };
  if (/\b(qiyam|tahajjud|night.?prayer)\b/.test(q)) return { type: 'qiyam' };
  if (/\b(iftar.?provided|free.?iftar|serve.?iftar|food)\b/.test(q)) return { type: 'iftar_provided' };
  if (/\b(khatm|khatam|quran.?completion)\b/.test(q)) return { type: 'khatm' };

  // Ramadan info
  if (/\b(ramadan|ramazan|ramadhan)\b/.test(q) && /\b(day|schedule|info|how.?many|left|when)\b/.test(q)) return { type: 'ramadan_info' };

  // Eid
  if (/\b(eid|^eid$)\b/.test(q)) return { type: 'eid_info' };

  // Zakat
  if (/\b(zakat|zakah|zakat.?al.?fitr|sadaqah|charity)\b/.test(q)) return { type: 'zakat' };

  // Distance/nearby
  if (/\b(near|close|closest|nearest|nearby|distance|how.?far)\b/.test(q)) return { type: 'distance' };

  return null;
}

function getRepresentativeMosque(mosques: Mosque[], favorites: Set<string>): Mosque | null {
  return mosques.find(m => favorites.has(m.id)) || mosques[0] || null;
}

function getPrayerTimesForMosque(mosque: Mosque, now: Date) {
  const adhan = calculatePrayerTimes(
    mosque.latitude, mosque.longitude, now,
    mosque.calculationMethod || 'NorthAmerica',
    mosque.asrMethod || 'Standard'
  );
  const iqama = calculateIqamaTimes(
    mosque.latitude, mosque.longitude,
    mosque.iqamaTimes, now,
    mosque.calculationMethod || 'NorthAmerica',
    mosque.asrMethod || 'Standard',
    mosque.scheduledTimeChanges
  );
  return { adhan, iqama };
}

function getNextPrayer(mosque: Mosque, now: Date): { prayer: string; adhan: string; iqama: string; label: string } | null {
  const { adhan, iqama } = getPrayerTimesForMosque(mosque, now);
  const currentMin = now.getHours() * 60 + now.getMinutes();
  const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

  for (const p of prayers) {
    const adhanStr = formatPrayerTime((adhan as any)[p]);
    const adhanMin = timeToMinutes(adhanStr);
    if (adhanMin > currentMin) {
      return { prayer: p, adhan: adhanStr, iqama: iqama[p].iqama, label: PRAYER_LABELS[p] };
    }
  }
  // All prayers passed — next is tomorrow's Fajr
  const fajrStr = formatPrayerTime(adhan.fajr);
  return { prayer: 'fajr', adhan: fajrStr, iqama: iqama.fajr.iqama, label: 'Fajr (tomorrow)' };
}

function formatJumuahTimes(jumuah: IqamaTimes['jumuah']): string[] {
  if (!jumuah) return [];
  if (typeof jumuah === 'string') return [jumuah];
  if (Array.isArray(jumuah)) {
    return jumuah.map((j: JumuahTime) => j.khutbah.time);
  }
  if ('khutbah' in jumuah && jumuah.khutbah) {
    return [(jumuah as JumuahTime).khutbah.time];
  }
  if ('type' in jumuah) {
    if (jumuah.type === 'fixed' && jumuah.time) return [jumuah.time];
  }
  return [];
}

/**
 * SmartSearchCard — context-aware answer card that appears above search results.
 * Read-only, no CRUD. Parses natural language queries and shows relevant info.
 */
export function SmartSearchCard({ query, mosques, favorites, userLocation }: SmartSearchCardProps) {
  const intent = useMemo(() => parseIntent(query), [query]);
  const now = useMemo(() => new Date(), [query]); // fresh per query change

  const content = useMemo(() => {
    if (!intent) return null;

    const rep = getRepresentativeMosque(mosques, favorites);

    switch (intent.type) {
      case 'prayer_time': {
        if (!rep) return null;
        const { adhan, iqama } = getPrayerTimesForMosque(rep, now);
        const p = intent.prayer;
        const adhanStr = formatPrayerTime((adhan as any)[p]);
        const iqamaStr = iqama[p].iqama;
        const label = PRAYER_LABELS[p];
        return {
          icon: <Clock className="w-4 h-4 text-blue-500 dark:text-blue-400" />,
          title: `${label} Today`,
          lines: [
            { label: 'Adhan', value: adhanStr },
            { label: 'Iqama', value: iqamaStr, bold: true },
          ],
          footnote: rep.name,
        };
      }

      case 'next_prayer': {
        if (!rep) return null;
        const next = getNextPrayer(rep, now);
        if (!next) return null;
        return {
          icon: <Clock className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />,
          title: `Next: ${next.label}`,
          lines: [
            { label: 'Adhan', value: next.adhan },
            { label: 'Iqama', value: next.iqama, bold: true },
          ],
          footnote: rep.name,
        };
      }

      case 'iftar': {
        if (!rep) return null;
        const { adhan } = getPrayerTimesForMosque(rep, now);
        const maghribStr = formatPrayerTime(adhan.maghrib);
        const currentMin = now.getHours() * 60 + now.getMinutes();
        const maghribMin = timeToMinutes(maghribStr);
        const remaining = maghribMin - currentMin;
        return {
          icon: <Utensils className="w-4 h-4 text-orange-500 dark:text-orange-400" />,
          title: 'Iftar Time',
          lines: [
            { label: 'Maghrib', value: maghribStr, bold: true },
            ...(remaining > 0 ? [{ label: 'Remaining', value: `${Math.floor(remaining / 60)}h ${remaining % 60}m` }] : [{ label: '', value: 'Iftar time has passed for today' }]),
          ],
          footnote: rep.name,
        };
      }

      case 'suhoor': {
        if (!rep) return null;
        const { adhan } = getPrayerTimesForMosque(rep, now);
        const fajrStr = formatPrayerTime(adhan.fajr);
        return {
          icon: <Moon className="w-4 h-4 text-indigo-400 dark:text-indigo-300" />,
          title: 'Suhoor Ends at Fajr',
          lines: [
            { label: 'Fajr adhan', value: fajrStr, bold: true },
            { label: 'Tip', value: 'Stop eating a few minutes before Fajr' },
          ],
          footnote: rep.name,
        };
      }

      case 'jumuah': {
        // Collect Jumuah times from all mosques — favorites first, then the rest
        const allJumuah = mosques.filter(m => m.iqamaTimes.jumuah);
        if (allJumuah.length === 0) return null;
        // Favorites first, then non-favorites
        const favFirst = [...allJumuah.filter(m => favorites.has(m.id)), ...allJumuah.filter(m => !favorites.has(m.id))];
        const lines = favFirst.map(m => {
          const times = formatJumuahTimes(m.iqamaTimes.jumuah);
          return {
            label: m.name.split(/\s+/).slice(0, 3).join(' '),
            value: times.join(', '),
            bold: true,
          };
        });
        return {
          icon: <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
          title: 'Jumuah Times',
          lines,
          footnote: favFirst.length === 1 ? undefined : `${favFirst.length} masajid shown`,
        };
      }

      case 'taraweeh': {
        const taraweehMosques = mosques.filter(m => m.ramadanProgram?.tarawih);
        const count = taraweehMosques.length;
        if (count === 0) return { icon: <Rows3 className="w-4 h-4 text-amber-500" />, title: 'Taraweeh', lines: [{ label: '', value: 'No taraweeh info available yet' }] };
        // Show up to 3 favorites first
        const favTaraweeh = taraweehMosques.filter(m => favorites.has(m.id));
        const toShow = (favTaraweeh.length > 0 ? favTaraweeh : taraweehMosques).slice(0, 3);
        const lines = toShow.map(m => ({
          label: m.name.split(/\s+/).slice(0, 3).join(' '),
          value: `${m.ramadanProgram!.tarawihRakat || '?'} rakat${m.ramadanProgram!.tarawihTime ? ' · ' + m.ramadanProgram!.tarawihTime : ''}`,
          bold: true,
        }));
        return {
          icon: <Rows3 className="w-4 h-4 text-amber-500 dark:text-amber-400" />,
          title: `Taraweeh — ${count} masajid`,
          lines,
          footnote: count > 3 ? `and ${count - 3} more below` : undefined,
        };
      }

      case 'rakat': {
        const rakatMosques = mosques.filter(m => m.ramadanProgram?.tarawihRakat === intent.count);
        const count = rakatMosques.length;
        return {
          icon: <Rows3 className="w-4 h-4 text-amber-500 dark:text-amber-400" />,
          title: `${intent.count} Rakat Taraweeh`,
          lines: [{ label: '', value: count > 0 ? `${count} ${count === 1 ? 'masjid offers' : 'masajid offer'} ${intent.count} rakat taraweeh` : `No masajid with ${intent.count} rakat found` }],
          footnote: count > 0 ? 'Showing matching results below' : undefined,
        };
      }

      case 'itikaf': {
        const itikafMosques = mosques.filter(m => m.ramadanProgram?.itikaf);
        return {
          icon: <BookOpen className="w-4 h-4 text-purple-500 dark:text-purple-400" />,
          title: "I'tikaf — Last 10 Nights",
          lines: [{ label: '', value: itikafMosques.length > 0 ? `${itikafMosques.length} ${itikafMosques.length === 1 ? 'masjid offers' : 'masajid offer'} i'tikaf space` : "No i'tikaf info available yet" }],
          footnote: itikafMosques.length > 0 ? 'Showing matching results below' : undefined,
        };
      }

      case 'qiyam': {
        const qiyamMosques = mosques.filter(m => m.ramadanProgram?.qiyam);
        const toShow = qiyamMosques.slice(0, 3);
        if (toShow.length === 0) return { icon: <Moon className="w-4 h-4 text-indigo-500" />, title: 'Qiyam al-Layl', lines: [{ label: '', value: 'No qiyam info available yet' }] };
        const lines = toShow.map(m => ({
          label: m.name.split(/\s+/).slice(0, 3).join(' '),
          value: m.ramadanProgram!.qiyamTime || 'Time not set',
          bold: true,
        }));
        return {
          icon: <Moon className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />,
          title: `Qiyam al-Layl — ${qiyamMosques.length} masajid`,
          lines,
          footnote: qiyamMosques.length > 3 ? `and ${qiyamMosques.length - 3} more below` : undefined,
        };
      }

      case 'iftar_provided': {
        const iftarMosques = mosques.filter(m => m.ramadanProgram?.iftarProvided);
        const toShow = iftarMosques.slice(0, 3);
        if (toShow.length === 0) return { icon: <Utensils className="w-4 h-4 text-orange-500" />, title: 'Iftar Provided', lines: [{ label: '', value: 'No iftar-serving masajid found' }] };
        const lines = toShow.map(m => ({
          label: m.name.split(/\s+/).slice(0, 3).join(' '),
          value: m.ramadanProgram!.iftarNotes || (m.ramadanProgram!.iftarEveryNight ? 'Every night' : 'Select nights'),
          bold: false,
        }));
        return {
          icon: <Utensils className="w-4 h-4 text-orange-500 dark:text-orange-400" />,
          title: `Iftar Served — ${iftarMosques.length} masajid`,
          lines,
          footnote: iftarMosques.length > 3 ? `and ${iftarMosques.length - 3} more below` : undefined,
        };
      }

      case 'khatm': {
        const khatmMosques = mosques.filter(m => m.ramadanProgram?.khatmQuran);
        if (khatmMosques.length === 0) return { icon: <BookOpen className="w-4 h-4 text-teal-500" />, title: 'Khatm al-Quran', lines: [{ label: '', value: 'No khatm info available yet' }] };
        const lines = khatmMosques.slice(0, 3).map(m => ({
          label: m.name.split(/\s+/).slice(0, 3).join(' '),
          value: m.ramadanProgram!.khatmQuranDate || 'Date TBD',
          bold: true,
        }));
        return {
          icon: <BookOpen className="w-4 h-4 text-teal-500 dark:text-teal-400" />,
          title: `Khatm al-Quran — ${khatmMosques.length} masajid`,
          lines,
        };
      }

      case 'ramadan_info': {
        // Use hijri-converter to calculate — but to keep deps light, we do it inline
        // We know Ramadan 1447 started ~Feb 18 or 19, 2026
        // Today is March 9, 2026. Approximate: day 19 or 20 of Ramadan
        const startA = new Date(2026, 1, 18); // Feb 18
        const startB = new Date(2026, 1, 19); // Feb 19
        const dayA = Math.floor((now.getTime() - startA.getTime()) / 86400000) + 1;
        const dayB = Math.floor((now.getTime() - startB.getTime()) / 86400000) + 1;
        const remainA = 30 - dayA;
        const remainB = 30 - dayB;
        return {
          icon: <Moon className="w-4 h-4 text-amber-500 dark:text-amber-400" />,
          title: 'Ramadan 1447',
          lines: [
            { label: 'Started Feb 18', value: `Day ${dayA} · ${remainA} day${remainA !== 1 ? 's' : ''} left`, bold: true },
            { label: 'Started Feb 19', value: `Day ${dayB} · ${remainB} day${remainB !== 1 ? 's' : ''} left` },
            { label: 'Eid', value: 'March 19–21 (depends on start + moon sighting)' },
          ],
        };
      }

      case 'eid_info': {
        return {
          icon: <Star className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />,
          title: 'Eid al-Fitr 1447',
          lines: [
            { label: 'If started Feb 18', value: 'Eid is Wed Mar 19 or Thu Mar 20' },
            { label: 'If started Feb 19', value: 'Eid is Thu Mar 20 or Fri Mar 21' },
            { label: 'Moon sighting', value: 'Look on your 29th evening after Maghrib' },
            { label: 'Tip', value: 'Check your masjid for Eid prayer time' },
          ],
        };
      }

      case 'zakat': {
        return {
          icon: <HandCoins className="w-4 h-4 text-green-600 dark:text-green-400" />,
          title: 'Zakat al-Fitr',
          lines: [
            { label: 'Due', value: 'Before Eid prayer (obligatory)', bold: true },
            { label: 'Amount', value: 'One sa\' (~$15) of food per person' },
            { label: 'For', value: 'Every household member, including children' },
          ],
          footnote: 'Consult your local scholar for exact amount',
        };
      }

      case 'distance': {
        if (!userLocation) {
          return {
            icon: <MapPin className="w-4 h-4 text-blue-500 dark:text-blue-400" />,
            title: 'Nearby Masajid',
            lines: [{ label: '', value: 'Enable location to sort by distance' }],
          };
        }
        return {
          icon: <Navigation className="w-4 h-4 text-blue-500 dark:text-blue-400" />,
          title: 'Nearby Masajid',
          lines: [{ label: '', value: `Showing ${mosques.length} masajid sorted by distance` }],
          footnote: 'Results sorted closest first',
        };
      }

      default:
        return null;
    }
  }, [intent, mosques, favorites, userLocation, now]);

  if (!content) return null;

  return (
    <div className="mb-3 rounded-xl bg-white/80 dark:bg-white/[0.05] border border-gray-200/60 dark:border-white/[0.08] backdrop-blur-sm overflow-hidden animate-[fadeIn_0.2s_ease]">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3.5 pt-3 pb-1.5">
        <div className="flex-shrink-0 bg-gray-100 dark:bg-white/[0.08] rounded-lg p-1.5">
          {content.icon}
        </div>
        <span className="text-[13px] text-gray-900 dark:text-white/90 font-medium truncate min-w-0">{content.title}</span>
      </div>

      {/* Lines */}
      <div className="px-3.5 pb-2.5 pt-1">
        {content.lines.map((line, i) => (
          <div key={i} className="flex items-baseline justify-between py-[3px]">
            {line.label ? (
              <span className="text-[12px] text-gray-500 dark:text-white/40 flex-shrink-0 mr-3">{line.label}</span>
            ) : null}
            <span className={`text-[13px] ${line.bold ? 'text-gray-900 dark:text-white/90 font-medium' : 'text-gray-600 dark:text-white/60'} ${line.label ? 'text-right' : ''} min-w-0`}>
              {line.value}
            </span>
          </div>
        ))}
      </div>

      {/* Footnote */}
      {content.footnote && (
        <div className="px-3.5 pb-2.5">
          <span className="text-[11px] text-gray-400 dark:text-white/25">{content.footnote}</span>
        </div>
      )}
    </div>
  );
}