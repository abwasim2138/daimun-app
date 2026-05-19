import { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { MapPin, ExternalLink, Share2, Clock, Moon, Utensils, BookOpen, DoorClosed, Rows3, Star, Calendar, MessageCircle, Heart, Loader, Navigation, ChevronRight, Flag, ChevronLeft } from 'lucide-react';
import { toHijri } from 'hijri-converter';
import { Mosque } from '../App';
import { API_URL, publicAnonKey, SITE_URL } from '../utils/api';
import { calculateIqamaTimes, getNextPrayer } from '../utils/iqamaCalculator';
import { calculatePrayerTimes, formatPrayerTime } from '../utils/prayerTimes';
import { parseLocalDate } from '../utils/dateUtils';
import { formatNthDay } from '../utils/nthDayUtils';
import { sortEventsByProximity } from '../utils/eventSorter';
import type { VolunteerOpportunity } from './VolunteersPage';

const ReportTimeModal = lazy(() => import('./ReportTimeModal').then(m => ({ default: m.ReportTimeModal })));

interface MasjidLandingPageProps {
  mosqueId: string;
  onBack: () => void;
}

// Helper function to linkify URLs in text
const linkifyText = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9][a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      const href = part.startsWith('http') ? part : `https://${part}`;
      return (
        <a key={index} href={href} target="_blank" rel="noopener noreferrer"
          className="text-emerald-700 dark:text-emerald-400 hover:underline break-all">
          {part}
        </a>
      );
    }
    return part;
  });
};

const getDayName = (day: number) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[day];
};

export function MasjidLandingPage({ mosqueId, onBack }: MasjidLandingPageProps) {
  // Use mosque data passed via history.state (from Globe button) for instant render;
  // fall back to fetching from API (for direct/shared URL access).
  const stateData = window.history.state;
  const [mosque, setMosque] = useState<Mosque | null>(stateData?.mosque ?? null);
  const [isLoading, setIsLoading] = useState(!stateData?.mosque);
  const [error, setError] = useState<string | null>(null);
  const [volunteers, setVolunteers] = useState<VolunteerOpportunity[]>([]);
  const [now, setNow] = useState(new Date());
  const [showReportModal, setShowReportModal] = useState(false);

  // Detect if navigated from within the app (e.g., Globe button in detail modal)
  const [fromApp] = useState(() => stateData?.fromApp === true);

  // Refresh time every minute so "next salah" stays current
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  // Fetch mosque data (skipped when already provided via history.state)
  useEffect(() => {
    if (mosque) return; // Already have data from history.state
    let cancelled = false;
    const fetchMosque = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_URL}/mosques`, {
          headers: {
            'apikey': publicAnonKey,
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          const found = (data.mosques || data || []).find((m: Mosque) => m.id === mosqueId);
          if (!cancelled) {
            if (found) {
              setMosque(found);
            } else {
              setError('Masjid not found');
            }
          }
        } else {
          if (!cancelled) setError('Failed to load masjid');
        }
      } catch {
        if (!cancelled) setError('Failed to load masjid');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetchMosque();
    return () => { cancelled = true; };
  }, [mosqueId]);

  // Set document title and Open Graph meta tags when mosque loads
  useEffect(() => {
    if (mosque) {
      document.title = `${mosque.name} — Dāimūn`;

      // Set Open Graph meta tags for rich link previews when shared
      const setMeta = (property: string, content: string) => {
        let tag = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
        if (!tag) {
          tag = document.createElement('meta');
          tag.setAttribute('property', property);
          document.head.appendChild(tag);
        }
        tag.content = content;
      };
      setMeta('og:title', mosque.name);
      setMeta('og:description', `Salah times & info for ${mosque.name} — ${mosque.address}`);
      setMeta('og:url', `${SITE_URL}?masjid=${mosqueId}`);
      setMeta('og:type', 'website');
    }
    return () => {
      document.title = 'Dāimūn';
      // Clean up OG tags
      ['og:title', 'og:description', 'og:url', 'og:type'].forEach(prop => {
        document.querySelector(`meta[property="${prop}"]`)?.remove();
      });
    };
  }, [mosque, mosqueId]);

  // Fetch volunteers
  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/volunteers`, {
      headers: { 'apikey': publicAnonKey, 'Authorization': `Bearer ${publicAnonKey}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!cancelled && data?.volunteers) {
          setVolunteers(data.volunteers.filter((v: VolunteerOpportunity) => v.mosqueId === mosqueId));
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [mosqueId]);

  // Calculate salah times
  const calculatedTimes = useMemo(() => {
    if (!mosque) return null;
    return calculateIqamaTimes(
      mosque.latitude, mosque.longitude, mosque.iqamaTimes,
      now, mosque.calculationMethod || 'NorthAmerica',
      mosque.asrMethod || 'Standard', mosque.scheduledTimeChanges
    );
  }, [mosque, now]);

  const nextPrayer = useMemo(() => {
    if (!calculatedTimes) return null;
    return getNextPrayer(calculatedTimes, mosque?.offeredPrayers);
  }, [calculatedTimes, mosque?.offeredPrayers]);

  // Sunrise time
  const sunriseTime = useMemo(() => {
    if (!mosque) return null;
    const times = calculatePrayerTimes(
      mosque.latitude, mosque.longitude, now,
      mosque.calculationMethod || 'NorthAmerica',
      mosque.asrMethod || 'Standard'
    );
    return formatPrayerTime(times.sunrise);
  }, [mosque, now]);

  // Hijri date
  const hijriDate = useMemo(() => {
    const h = toHijri(now.getFullYear(), now.getMonth() + 1, now.getDate());
    const monthNames = [
      'Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani",
      "Jumada al-Awwal", "Jumada al-Thani", 'Rajab', "Sha'ban",
      'Ramadan', 'Shawwal', "Dhu al-Qi'dah", "Dhu al-Hijjah"
    ];
    return `${h.hd} ${monthNames[h.hm - 1]} ${h.hy} AH`;
  }, [now]);

  const gregorianDate = now.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric'
  });

  // Share handler
  const handleShare = async () => {
    const url = `${SITE_URL}?masjid=${mosqueId}`;
    const title = mosque?.name || 'Masjid';
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  // Check if salah is offered
  const isOffered = (key: string) =>
    !mosque?.offeredPrayers || mosque.offeredPrayers.length === 0 || mosque.offeredPrayers.includes(key as any);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5] dark:bg-[#0A0A0A]">
        <Loader className="w-6 h-6 text-gray-400 dark:text-white/30 animate-spin" />
      </div>
    );
  }

  if (error || !mosque || !calculatedTimes) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF8F5] dark:bg-[#0A0A0A] px-6">
        <div className="text-center">
          <div className="text-6xl mb-4 opacity-20">🕌</div>
          <h1 className="text-xl text-gray-900 dark:text-white mb-2">{error || 'Something went wrong'}</h1>
          <p className="text-sm text-gray-500 dark:text-white/40 mb-6">This masjid may not exist or has been removed.</p>
          <button onClick={onBack}
            className="px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full text-sm hover:opacity-90 transition-opacity active:scale-95">
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const isFriday = now.getDay() === 5;
  const rp = mosque.ramadanProgram;
  const hasRamadan = rp && (rp.tarawih || rp.iftarProvided || rp.itikaf || rp.qiyam || rp.khatmQuran);
  const sortedEvents = sortEventsByProximity(mosque.events);

  // Build prayers array for display
  const prayers = [
    ...(isOffered('fajr') ? [{ name: 'Fajr', key: 'fajr', adhan: calculatedTimes.fajr.adhan, iqama: calculatedTimes.fajr.iqama }] : []),
    { name: 'Sunrise', key: 'sunrise', adhan: sunriseTime || '', iqama: '', isSunrise: true },
    ...(!isFriday && isOffered('dhuhr') ? [{ name: 'Dhuhr', key: 'dhuhr', adhan: calculatedTimes.dhuhr.adhan, iqama: calculatedTimes.dhuhr.iqama }] : []),
    ...(isOffered('asr') ? [{ name: 'Asr', key: 'asr', adhan: calculatedTimes.asr.adhan, iqama: calculatedTimes.asr.iqama }] : []),
    ...(isOffered('maghrib') ? [{ name: 'Maghrib', key: 'maghrib', adhan: calculatedTimes.maghrib.adhan, iqama: calculatedTimes.maghrib.iqama }] : []),
    ...(isOffered('isha') ? [{ name: 'Isha', key: 'isha', adhan: calculatedTimes.isha.adhan, iqama: calculatedTimes.isha.iqama }] : []),
  ];

  // Jumuah times
  const jumuahTimes = calculatedTimes.jumuah
    ? (Array.isArray(calculatedTimes.jumuah) ? calculatedTimes.jumuah : [calculatedTimes.jumuah])
    : [];

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#0A0A0A]">
      {/* ── Hero Section ── */}
      <div className="relative overflow-hidden">
        {/* Islamic geometric pattern background — inspired by Masjid al-Haram & Masjid an-Nabawi */}
        <div className="absolute inset-0 overflow-hidden">
          <svg className="absolute inset-0 w-full h-full opacity-[0.12] dark:opacity-[0.08]" xmlns="http://www.w3.org/2000/svg">
            <style>{`
              @keyframes geo-draw {
                from { stroke-dashoffset: 1; }
                to { stroke-dashoffset: 0; }
              }
              @keyframes geo-fill-a {
                from { fill-opacity: 0; }
                to { fill-opacity: 0.1; }
              }
              @keyframes geo-fill-b {
                from { fill-opacity: 0; }
                to { fill-opacity: 0.12; }
              }
              @keyframes logo-fade-in {
                from { opacity: 0; transform: translateY(6px); }
                to { opacity: 1; transform: translateY(0); }
              }
              .geo-trace {
                stroke-dasharray: 1;
                stroke-dashoffset: 1;
                animation: geo-draw 2s cubic-bezier(0.22, 1, 0.36, 1) forwards;
              }
              .geo-d0 { animation-delay: 0s; }
              .geo-d1 { animation-delay: 0.15s; }
              .geo-d2 { animation-delay: 0.35s; }
              .geo-d3 { animation-delay: 0.55s; }
              .geo-d4 { animation-delay: 0.7s; }
              .geo-d5 { animation-delay: 0.9s; }
              /* Combined stroke trace + fill fade for elements that have both */
              .geo-trace-fill-a {
                stroke-dasharray: 1;
                stroke-dashoffset: 1;
                fill-opacity: 0;
                animation:
                  geo-draw 2s cubic-bezier(0.22, 1, 0.36, 1) 0.15s forwards,
                  geo-fill-a 1.2s ease-out 1.4s forwards;
              }
              .geo-trace-fill-b {
                stroke-dasharray: 1;
                stroke-dashoffset: 1;
                fill-opacity: 0;
                animation:
                  geo-draw 2s cubic-bezier(0.22, 1, 0.36, 1) 0.35s forwards,
                  geo-fill-b 1.2s ease-out 1.6s forwards;
              }
            `}</style>
            <defs>
              <pattern id="islamic-geo" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
                {/* Octagon frame — Masjid al-Haram marble floor tessellation */}
                <polygon points="57,0 80,23 80,57 57,80 23,80 0,57 0,23 23,0" fill="none" stroke="#D4BA78" strokeWidth="0.8" pathLength="1" className="geo-trace geo-d0" />
                {/* Corner squares — quarter-pieces that complete when tiled */}
                <path d="M57,0 L80,0 L80,23Z M80,57 L80,80 L57,80Z M23,80 L0,80 L0,57Z M0,23 L0,0 L23,0Z" fill="#D4BA78" className="geo-trace-fill-a" stroke="#D4BA78" strokeWidth="0.5" pathLength="1" />
                {/* 8-pointed star (Rub el Hizb) — iconic motif of both Haramain */}
                <polygon points="40,5 50,15 65,15 65,30 75,40 65,50 65,65 50,65 40,75 30,65 15,65 15,50 5,40 15,30 15,15 30,15" fill="#D4BA78" className="geo-trace-fill-b" stroke="#D4BA78" strokeWidth="0.8" pathLength="1" />
                {/* Inner octagon detail */}
                <polygon points="50,15 65,30 65,50 50,65 30,65 15,50 15,30 30,15" fill="none" stroke="#D4BA78" strokeWidth="0.5" pathLength="1" className="geo-trace geo-d3" />
                {/* Connecting lines — cardinal star tips to octagon midpoints */}
                <line x1="40" y1="5" x2="40" y2="0" stroke="#D4BA78" strokeWidth="0.5" pathLength="1" className="geo-trace geo-d4" />
                <line x1="75" y1="40" x2="80" y2="40" stroke="#D4BA78" strokeWidth="0.5" pathLength="1" className="geo-trace geo-d4" />
                <line x1="40" y1="75" x2="40" y2="80" stroke="#D4BA78" strokeWidth="0.5" pathLength="1" className="geo-trace geo-d4" />
                <line x1="5" y1="40" x2="0" y2="40" stroke="#D4BA78" strokeWidth="0.5" pathLength="1" className="geo-trace geo-d4" />
                {/* Connecting lines — diagonal star tips to octagon vertices */}
                <line x1="65" y1="15" x2="57" y2="0" stroke="#D4BA78" strokeWidth="0.5" pathLength="1" className="geo-trace geo-d5" />
                <line x1="65" y1="15" x2="80" y2="23" stroke="#D4BA78" strokeWidth="0.5" pathLength="1" className="geo-trace geo-d5" />
                <line x1="65" y1="65" x2="80" y2="57" stroke="#D4BA78" strokeWidth="0.5" pathLength="1" className="geo-trace geo-d5" />
                <line x1="65" y1="65" x2="57" y2="80" stroke="#D4BA78" strokeWidth="0.5" pathLength="1" className="geo-trace geo-d5" />
                <line x1="15" y1="65" x2="23" y2="80" stroke="#D4BA78" strokeWidth="0.5" pathLength="1" className="geo-trace geo-d5" />
                <line x1="15" y1="65" x2="0" y2="57" stroke="#D4BA78" strokeWidth="0.5" pathLength="1" className="geo-trace geo-d5" />
                <line x1="15" y1="15" x2="0" y2="23" stroke="#D4BA78" strokeWidth="0.5" pathLength="1" className="geo-trace geo-d5" />
                <line x1="15" y1="15" x2="23" y2="0" stroke="#D4BA78" strokeWidth="0.5" pathLength="1" className="geo-trace geo-d5" />
                {/* Center circle */}
                <circle cx="40" cy="40" r="4" fill="none" stroke="#D4BA78" strokeWidth="0.5" pathLength="1" className="geo-trace geo-d5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#islamic-geo)" />
          </svg>
          {/* Gradient fade at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#FAF8F5] dark:from-[#0A0A0A] to-transparent" />
        </div>

        <div className="relative max-w-xl mx-auto px-6 pt-14 pb-10">
          {/* Top bar — back button (when navigated from app) + share button */}
          <div className="flex items-center justify-between mb-8">
            {fromApp ? (
              <button
                onClick={onBack}
                className="flex items-center gap-1 px-3 py-2 -ml-3 rounded-full text-[14px] text-gray-600 dark:text-white/60 hover:bg-white/60 dark:hover:bg-white/[0.08] transition-colors active:scale-95"
              >
                <ChevronLeft className="w-5 h-5" strokeWidth={2} />
                <span>Back</span>
              </button>
            ) : (
              <div />
            )}
            <button onClick={handleShare}
              className="p-2.5 rounded-full bg-white/60 dark:bg-white/[0.08] backdrop-blur-sm hover:bg-white/90 dark:hover:bg-white/[0.12] transition-all active:scale-90 shadow-sm">
              <Share2 className="w-4.5 h-4.5 text-gray-600 dark:text-white/60" strokeWidth={2} />
            </button>
          </div>

          {/* Mosque name / logo */}
          {mosque.logoSvg ? (
            <div className="mb-3">
              <div
                className="max-h-20 sm:max-h-24 w-auto [&>svg]:max-h-20 sm:[&>svg]:max-h-24 [&>svg]:w-auto [&>svg]:h-auto brightness-0 dark:brightness-0 dark:invert"
                dangerouslySetInnerHTML={{ __html: mosque.logoSvg }}
                role="img"
                aria-label={mosque.name}
                style={{ animation: 'logo-fade-in 0.8s ease-out both' }}
              />
              {/* Screen-reader accessible name */}
              <h1 className="sr-only">{mosque.name}</h1>
            </div>
          ) : (
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight leading-tight mb-3">
              {mosque.name}
            </h1>
          )}

          {/* Address */}
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mosque.address)}`}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[15px] text-gray-500 dark:text-white/50 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors group"
          >
            <MapPin className="w-4 h-4 flex-shrink-0 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" strokeWidth={2} />
            <span className="group-hover:underline">{mosque.address}</span>
          </a>

          {/* Date */}
          <div className="mt-5 flex flex-col gap-0.5">
            <span className="text-[13px] text-gray-600 dark:text-white/50">{gregorianDate}</span>
            <span className="text-[13px] text-gray-400 dark:text-white/30">{hijriDate}</span>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-6 pb-16 space-y-8">

        {/* ── Quick Actions ── */}
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mosque.address)}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 dark:bg-emerald-600 text-white rounded-full text-[13px] font-medium hover:bg-emerald-700 dark:hover:bg-emerald-500 transition-colors active:scale-95 whitespace-nowrap shadow-sm"
          >
            <Navigation className="w-3.5 h-3.5" strokeWidth={2.5} />
            Get Directions
          </a>

          {mosque.website && (
            <a
              href={mosque.website.startsWith('http') ? mosque.website : `https://${mosque.website}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/[0.08] text-gray-700 dark:text-white/70 border border-gray-200 dark:border-white/[0.1] rounded-full text-[13px] font-medium hover:bg-gray-50 dark:hover:bg-white/[0.12] transition-colors active:scale-95 whitespace-nowrap"
            >
              <ExternalLink className="w-3.5 h-3.5" strokeWidth={2} />
              Website
            </a>
          )}

          {mosque.whatsappChannel && (
            <a
              href={mosque.whatsappChannel.startsWith('http') ? mosque.whatsappChannel : `https://${mosque.whatsappChannel}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 bg-[#25D366]/10 dark:bg-[#25D366]/15 text-[#25D366] border border-[#25D366]/20 dark:border-[#25D366]/20 rounded-full text-[13px] font-medium hover:bg-[#25D366]/20 dark:hover:bg-[#25D366]/25 transition-colors active:scale-95 whitespace-nowrap"
            >
              <MessageCircle className="w-3.5 h-3.5" strokeWidth={2} />
              WhatsApp
            </a>
          )}

          <button
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/[0.08] text-gray-500 dark:text-white/50 border border-gray-200 dark:border-white/[0.1] rounded-full text-[13px] font-medium hover:bg-gray-50 dark:hover:bg-white/[0.12] transition-colors active:scale-95 whitespace-nowrap"
          >
            <Flag className="w-3.5 h-3.5" strokeWidth={2} />
            Report
          </button>
        </div>

        {/* ── Salah Times ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[13px] uppercase tracking-widest text-gray-400 dark:text-white/35 font-medium">
              Today's Salah Times
            </h2>
            {nextPrayer && (
              <span className="text-[12px] text-emerald-600 dark:text-emerald-400 font-medium">
                Next: {nextPrayer.name} at {nextPrayer.iqamaTime}
              </span>
            )}
          </div>

          <div className="bg-white dark:bg-[#1C1C1C] rounded-3xl border border-gray-200/60 dark:border-white/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:shadow-none overflow-hidden">
            {/* Header row */}
            <div className="grid grid-cols-3 px-5 py-3 border-b border-gray-100 dark:border-white/[0.06]">
              <span className="text-[11px] uppercase tracking-widest text-gray-400 dark:text-white/30 font-medium">Salah</span>
              <span className="text-[11px] uppercase tracking-widest text-gray-400 dark:text-white/30 font-medium text-center">Adhan</span>
              <span className="text-[11px] uppercase tracking-widest text-gray-400 dark:text-white/30 font-medium text-right">Iqama</span>
            </div>

            {prayers.map((prayer, idx) => {
              const isNext = nextPrayer?.name?.toLowerCase() === prayer.key;
              const isLast = idx === prayers.length - 1 && jumuahTimes.length === 0;
              return (
                <div key={prayer.key}
                  className={`grid grid-cols-3 items-center px-5 py-3.5 transition-colors ${
                    isNext
                      ? 'bg-emerald-50 dark:bg-emerald-900/15'
                      : ''
                  } ${!isLast ? 'border-b border-gray-50 dark:border-white/[0.03]' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    {isNext && <div className="w-1 h-5 rounded-full bg-emerald-500 dark:bg-emerald-400" />}
                    <span className={`text-[15px] ${
                      isNext ? 'font-semibold text-emerald-800 dark:text-emerald-300' :
                      (prayer as any).isSunrise ? 'text-amber-600 dark:text-amber-400/80 italic' :
                      'text-gray-700 dark:text-white/80'
                    }`}>
                      {prayer.name}
                    </span>
                  </div>
                  <span className={`text-[14px] text-center ${
                    isNext ? 'text-emerald-700/70 dark:text-emerald-400/60' :
                    (prayer as any).isSunrise ? 'text-amber-500 dark:text-amber-400/50' :
                    'text-gray-400 dark:text-white/40'
                  }`}>
                    {(prayer as any).isSunrise ? sunriseTime : prayer.adhan}
                  </span>
                  <span className={`text-right text-[17px] ${
                    isNext ? 'font-bold text-emerald-800 dark:text-emerald-300' :
                    (prayer as any).isSunrise ? 'text-amber-500/60 dark:text-amber-400/30 text-[13px]' :
                    'font-semibold text-gray-900 dark:text-white'
                  }`}>
                    {(prayer as any).isSunrise ? '—' : prayer.iqama}
                  </span>
                </div>
              );
            })}

            {/* Jumuah rows */}
            {jumuahTimes.map((j, idx) => {
              const isNext = nextPrayer?.name?.toLowerCase() === 'jumuah';
              return (
                <div key={`jumuah-${idx}`}
                  className={`grid grid-cols-3 items-center px-5 py-3.5 transition-colors ${
                    isNext ? 'bg-emerald-50 dark:bg-emerald-900/15' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isNext && <div className="w-1 h-5 rounded-full bg-emerald-500 dark:bg-emerald-400" />}
                    <span className={`text-[15px] ${
                      isNext ? 'font-semibold text-emerald-800 dark:text-emerald-300' : 'text-gray-700 dark:text-white/80'
                    }`}>
                      {jumuahTimes.length > 1 ? `Jumuah ${idx + 1}` : 'Jumuah'}
                    </span>
                  </div>
                  <span className={`text-[14px] text-center ${
                    isNext ? 'text-emerald-700/70 dark:text-emerald-400/60' : 'text-gray-400 dark:text-white/40'
                  }`}>
                    Khutbah
                  </span>
                  <span className={`text-right text-[17px] ${
                    isNext ? 'font-bold text-emerald-800 dark:text-emerald-300' : 'font-semibold text-gray-900 dark:text-white'
                  }`}>
                    {j.khutbah}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Special Notes ── */}
        {mosque.note && (
          <section>
            <h2 className="text-[13px] uppercase tracking-widest text-gray-400 dark:text-white/35 font-medium mb-3">Notes</h2>
            <div className="bg-amber-50/80 dark:bg-amber-900/10 border border-amber-200/60 dark:border-amber-800/20 rounded-2xl p-4">
              <p className="text-[15px] text-amber-900 dark:text-amber-200/90 leading-relaxed">
                {linkifyText(mosque.note)}
              </p>
            </div>
          </section>
        )}

        {/* ── Ramadan Program ── */}
        {hasRamadan && rp && (
          <section>
            <h2 className="text-[13px] uppercase tracking-widest text-gray-400 dark:text-white/35 font-medium mb-3 flex items-center gap-2">
              <Moon className="w-3.5 h-3.5" />
              Ramadan Program
            </h2>
            <div className="bg-purple-50/80 dark:bg-purple-900/10 border border-purple-200/60 dark:border-purple-800/20 rounded-2xl p-5 space-y-4">
              {rp.tarawih && (
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-800/30 flex items-center justify-center flex-shrink-0">
                    <Rows3 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <div className="text-[15px] font-medium text-purple-900 dark:text-purple-200">
                      Tarawih{rp.tarawihRakat ? ` — ${rp.tarawihRakat} Rakat` : ''}
                    </div>
                    {rp.tarawihTime && <div className="text-[13px] text-purple-700 dark:text-purple-300/70">{rp.tarawihTime}</div>}
                  </div>
                </div>
              )}
              {rp.iftarProvided && (
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-800/30 flex items-center justify-center flex-shrink-0">
                    <Utensils className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <div className="text-[15px] font-medium text-purple-900 dark:text-purple-200">
                      Iftar{rp.iftarEveryNight ? ' — Every Night' : ''}
                    </div>
                    {rp.iftarNotes && <div className="text-[13px] text-purple-700 dark:text-purple-300/70">{rp.iftarNotes}</div>}
                  </div>
                </div>
              )}
              {rp.khatmQuran && (
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-800/30 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-[15px] font-medium text-purple-900 dark:text-purple-200">Khatm al-Quran</div>
                    <div className="text-[13px] text-purple-700 dark:text-purple-300/70">
                      {rp.khatmQuranDate
                        ? new Date(rp.khatmQuranDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                        : 'Quran completion during tarawih'}
                    </div>
                  </div>
                </div>
              )}
              {rp.itikaf && (
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-teal-100 dark:bg-teal-800/30 flex items-center justify-center flex-shrink-0">
                    <DoorClosed className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div>
                    <div className="text-[15px] font-medium text-purple-900 dark:text-purple-200">I'tikaf Available</div>
                    <div className="text-[13px] text-purple-700 dark:text-purple-300/70">Last 10 nights</div>
                  </div>
                </div>
              )}
              {rp.qiyam && (
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-800/30 flex items-center justify-center flex-shrink-0">
                    <Star className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <div className="text-[15px] font-medium text-purple-900 dark:text-purple-200">Qiyam al-Layl</div>
                    <div className="text-[13px] text-purple-700 dark:text-purple-300/70">
                      {rp.qiyamTime ? `Last 10 nights at ${rp.qiyamTime}` : 'Last 10 nights'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Events ── */}
        {sortedEvents.length > 0 && (
          <section>
            <h2 className="text-[13px] uppercase tracking-widest text-gray-400 dark:text-white/35 font-medium mb-3">Events</h2>
            <div className="space-y-3">
              {sortedEvents.map(event => (
                <div key={event.id} className="bg-white dark:bg-[#1C1C1C] rounded-2xl p-4 border border-gray-200/60 dark:border-white/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.03)] dark:shadow-none">
                  <h3 className="font-semibold text-[15px] text-gray-900 dark:text-white">{event.title}</h3>
                  <div className="text-[13px] text-gray-500 dark:text-white/50 mt-1">
                    {event.recurring?.enabled ? (
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2} />
                        {event.recurring.frequency === 'daily' && `Every day at ${event.time}`}
                        {event.recurring.frequency === 'weekly' && event.recurring.dayOfWeek !== undefined && `Every ${getDayName(event.recurring.dayOfWeek)} at ${event.time}`}
                        {event.recurring.frequency === 'monthly' && event.recurring.dayOfMonth !== undefined && `Monthly on day ${event.recurring.dayOfMonth} at ${event.time}`}
                        {event.recurring.frequency === 'nth-day' && event.recurring.nthWeek && event.recurring.nthDayOfWeek !== undefined && `Every ${formatNthDay(event.recurring.nthDayOfWeek, event.recurring.nthWeek)} at ${event.time}`}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2} />
                        {parseLocalDate(event.date).toLocaleDateString('en-US', {
                          weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
                        })} at {event.time}
                      </div>
                    )}
                  </div>
                  {event.description && (
                    <p className="text-[14px] text-gray-600 dark:text-white/60 mt-2 leading-relaxed">{event.description}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Volunteer Opportunities ── */}
        {volunteers.length > 0 && (
          <section>
            <h2 className="text-[13px] uppercase tracking-widest text-gray-400 dark:text-white/35 font-medium mb-3">Volunteer</h2>
            <div className="space-y-3">
              {volunteers.map(vol => (
                <a key={vol.id}
                  href={vol.link.startsWith('http') ? vol.link : `https://${vol.link}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-start justify-between gap-3 bg-rose-50/60 dark:bg-rose-950/10 rounded-2xl p-4 border border-rose-100 dark:border-rose-900/20 hover:border-rose-300 dark:hover:border-rose-700/40 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Heart className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 flex-shrink-0" />
                      <h3 className="font-semibold text-[15px] text-gray-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">{vol.title}</h3>
                    </div>
                    {vol.description && (
                      <p className="text-[13px] text-gray-500 dark:text-white/50 mt-1 leading-relaxed">{vol.description}</p>
                    )}
                  </div>
                  <ExternalLink className="w-4 h-4 text-rose-400 dark:text-rose-500/60 group-hover:text-rose-500 dark:group-hover:text-rose-400 flex-shrink-0 mt-0.5 transition-colors" />
                </a>
              ))}
            </div>
          </section>
        )}

        {/* ── See other masjids ── */}
        <section className="text-center">
          <button onClick={onBack}
            className="inline-flex items-center gap-1.5 text-[13px] text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/50 transition-colors active:scale-95 group"
          >
            See other masjids nearby
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </section>

        {/* ── Footer ── */}
        <footer className="text-center pt-4 pb-2">
          <p className="text-[11px] text-gray-300 dark:text-white/15">
            TampaRamadan.com
          </p>
        </footer>
      </div>

      {/* Report Time Modal */}
      {showReportModal && (
        <Suspense fallback={null}>
          <ReportTimeModal
            mosque={mosque}
            onClose={() => setShowReportModal(false)}
          />
        </Suspense>
      )}
    </div>
  );
}