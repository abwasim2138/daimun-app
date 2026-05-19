import { useState, useEffect, useMemo } from 'react';
import { X, Star, MapPin, Share2, Edit2, Calendar, Monitor, ExternalLink, Clock, Moon, Utensils, BookOpen, DoorClosed, Rows3, Flag, Printer, MessageCircle, Heart, Globe } from 'lucide-react';
import { toHijri } from 'hijri-converter';
import { calculateIqamaTimes, getNextPrayer } from '../utils/iqamaCalculator';
import { PrayerTimesDisplay } from './PrayerTimesDisplay';
import { Mosque } from '../App';
import { parseLocalDate } from '../utils/dateUtils';
import { formatNthDay } from '../utils/nthDayUtils';
import { sortEventsByProximity } from '../utils/eventSorter';
import { API_URL, publicAnonKey, SITE_URL } from '../utils/api';
import type { VolunteerOpportunity } from './VolunteersPage';
import { navigate } from '../utils/router';

interface MosqueDetailModalProps {
  mosque: Mosque;
  isFavorite: boolean;
  distance: number | null;
  onClose: () => void;
  onToggleFavorite: (id: string) => void;
  onShare: (mosque: Mosque) => void;
  onEdit: (mosque: Mosque) => void;
  isAdmin?: boolean;
  onReportTime?: (mosque: Mosque) => void;
}

const getDayName = (day: number) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[day];
};

// Helper function to linkify URLs in text
const linkifyText = (text: string) => {
  // Regex to match URLs (with or without protocol)
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9][a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*)/g;
  
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    // Check if this part is a URL
    if (part.match(urlRegex)) {
      // Add protocol if missing
      const href = part.startsWith('http') ? part : `https://${part}`;
      return (
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline break-all"
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

export function MosqueDetailModal({
  mosque,
  isFavorite,
  distance,
  onClose,
  onToggleFavorite,
  onShare,
  onEdit,
  isAdmin,
  onReportTime
}: MosqueDetailModalProps) {
  // Log the masjid ID when detail page opens
  console.log('Masjid ID:', mosque.id);

  // Fetch volunteer opportunities for this mosque
  const [mosqueVolunteers, setMosqueVolunteers] = useState<VolunteerOpportunity[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/volunteers`, {
      headers: { 'apikey': publicAnonKey, 'Authorization': `Bearer ${publicAnonKey}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!cancelled && data?.volunteers) {
          setMosqueVolunteers(
            data.volunteers.filter((v: VolunteerOpportunity) => v.mosqueId === mosque.id)
          );
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [mosque.id]);

  // Check if it's currently Ramadan
  const isRamadan = useMemo(() => {
    const now = new Date();
    const hijri = toHijri(now.getFullYear(), now.getMonth() + 1, now.getDate());
    return hijri.hm === 9;
  }, []);
  
  // Calculate prayer times for today
  const calculatedTimes = calculateIqamaTimes(
    mosque.latitude,
    mosque.longitude,
    mosque.iqamaTimes,
    new Date(),
    mosque.calculationMethod || 'NorthAmerica',
    mosque.asrMethod || 'Standard',
    mosque.scheduledTimeChanges  // Pass scheduled time changes to get effective times
  );
  
  const nextPrayer = getNextPrayer(calculatedTimes, mosque.offeredPrayers);

  // Check if mosque was recently updated (within last 24 hours)
  const recentlyUpdated = (() => {
    // Check both server-side updatedAt and client-side localStorage fallback
    const localTimestamp = typeof window !== 'undefined' ? localStorage.getItem(`mosque-updated:${mosque.id}`) : null;
    const updatedAtStr = mosque.updatedAt || localTimestamp;
    if (!updatedAtStr) return null;
    
    // Use the most recent timestamp between server and local
    let effectiveTimestamp = updatedAtStr;
    if (mosque.updatedAt && localTimestamp) {
      effectiveTimestamp = new Date(localTimestamp) > new Date(mosque.updatedAt) ? localTimestamp : mosque.updatedAt;
    }
    
    const updatedDate = new Date(effectiveTimestamp);
    const now = new Date();
    const diffMs = now.getTime() - updatedDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    if (diffHours > 24) return null;
    if (diffHours < 1) {
      const mins = Math.floor(diffMs / (1000 * 60));
      return mins <= 1 ? 'Just now' : `${mins}m ago`;
    }
    return `${Math.floor(diffHours)}h ago`;
  })();

  return (
    <div 
      className="fixed inset-0 bg-black/40 dark:bg-black/70 z-50 animate-fadeIn flex items-end md:items-center justify-center md:p-4" 
      onClick={onClose}
    >
      <div 
        className="relative bg-white dark:bg-[#1C1C1C] rounded-t-3xl md:rounded-3xl shadow-[0_-2px_20px_rgba(0,0,0,0.08),0_0_60px_rgba(0,0,0,0.06)] dark:shadow-[0_-2px_20px_rgba(0,0,0,0.4),0_0_60px_rgba(0,0,0,0.3)] max-h-[92vh] md:max-h-[85vh] overflow-y-auto animate-slideUp hide-scrollbar w-full md:max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Handle — mobile only */}
        <div className="flex md:hidden justify-center pt-3 pb-1">
          <div className="w-9 h-[5px] bg-gray-300/80 dark:bg-white/20 rounded-full"></div>
        </div>

        {/* Sticky header — minimal: name + close */}
        <div className="sticky top-0 z-10 bg-white dark:bg-[#1C1C1C]">
          <div className="px-5 md:px-8 pt-4 md:pt-6 pb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight flex-1 min-w-0 pr-4 truncate">
              {mosque.name}
            </h2>
            {/* Apple-style filled close button */}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200/70 dark:bg-white/[0.1] hover:bg-gray-300/70 dark:hover:bg-white/[0.15] transition-colors flex-shrink-0 active:scale-90"
              aria-label="Close"
            >
              <X className="w-[15px] h-[15px] text-gray-600 dark:text-white/60" strokeWidth={2.5} />
            </button>
          </div>
          {/* Subtle separator — sits at the edge of sticky area */}
          <div className="h-px bg-gray-200/60 dark:bg-white/[0.06]"></div>
        </div>

        {/* Scrollable body */}
        <div className="px-5 md:px-8 pt-5 pb-8 space-y-6">

          {/* Metadata section — address, distance, updated */}
          <div className="space-y-1">
            <p className="text-[15px] text-gray-600 dark:text-white/60">{mosque.address}</p>
            <div className="flex items-center gap-1.5 text-[13px] text-gray-500 dark:text-white/50 flex-wrap">
              {distance !== null && (
                <span>~{distance.toFixed(1)} mile{distance !== 1 ? 's' : ''} away</span>
              )}
              {distance !== null && recentlyUpdated && (
                <span className="text-gray-300 dark:text-white/20">·</span>
              )}
              {recentlyUpdated && (
                <span className="text-blue-600 dark:text-blue-400/80">Updated {recentlyUpdated}</span>
              )}
            </div>
          </div>

          {/* Action row — iOS Share Sheet style */}
          <div className="flex flex-wrap justify-center gap-2">
            {/* Directions */}
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mosque.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 w-[72px] flex-shrink-0 py-2 rounded-2xl hover:bg-gray-100/80 dark:hover:bg-white/[0.05] transition-colors active:scale-90"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/[0.08] flex items-center justify-center">
                <MapPin className="w-5 h-5 text-gray-500 dark:text-white/50" strokeWidth={2} />
              </div>
              <span className="text-[11px] font-medium text-gray-500 dark:text-white/50">Directions</span>
            </a>

            {/* Website */}
            {mosque.website && (
              <a
                href={mosque.website.startsWith('http') ? mosque.website : `https://${mosque.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5 w-[72px] flex-shrink-0 py-2 rounded-2xl hover:bg-gray-100/80 dark:hover:bg-white/[0.05] transition-colors active:scale-90"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/[0.08] flex items-center justify-center">
                  <ExternalLink className="w-5 h-5 text-gray-500 dark:text-white/50" strokeWidth={2} />
                </div>
                <span className="text-[11px] font-medium text-gray-500 dark:text-white/50">Website</span>
              </a>
            )}

            {/* WhatsApp Channel */}
            {mosque.whatsappChannel && (
              <a
                href={mosque.whatsappChannel.startsWith('http') ? mosque.whatsappChannel : `https://${mosque.whatsappChannel}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5 w-[72px] flex-shrink-0 py-2 rounded-2xl hover:bg-gray-100/80 dark:hover:bg-white/[0.05] transition-colors active:scale-90"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-12 h-12 rounded-full bg-[#25D366]/10 dark:bg-[#25D366]/15 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-[#25D366]" strokeWidth={2} />
                </div>
                <span className="text-[11px] font-medium text-[#25D366] dark:text-[#25D366]">WhatsApp</span>
              </a>
            )}

            {/* Favorite */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(mosque.id);
              }}
              className="flex flex-col items-center gap-1.5 w-[72px] flex-shrink-0 py-2 rounded-2xl hover:bg-gray-100/80 dark:hover:bg-white/[0.05] transition-colors active:scale-90"
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                isFavorite 
                  ? 'bg-yellow-100 dark:bg-yellow-500/15' 
                  : 'bg-gray-100 dark:bg-white/[0.08]'
              }`}>
                <Star className={`w-5 h-5 ${
                  isFavorite 
                    ? 'fill-yellow-500 text-yellow-500' 
                    : 'text-gray-500 dark:text-white/50'
                }`} strokeWidth={2} />
              </div>
              <span className={`text-[11px] font-medium ${
                isFavorite 
                  ? 'text-yellow-600 dark:text-yellow-400' 
                  : 'text-gray-500 dark:text-white/50'
              }`}>{isFavorite ? 'Saved' : 'Favorite'}</span>
            </button>

            {/* Share */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShare(mosque);
              }}
              className="flex flex-col items-center gap-1.5 w-[72px] flex-shrink-0 py-2 rounded-2xl hover:bg-gray-100/80 dark:hover:bg-white/[0.05] transition-colors active:scale-90"
            >
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/[0.08] flex items-center justify-center">
                <Share2 className="w-5 h-5 text-gray-500 dark:text-white/50" strokeWidth={2} />
              </div>
              <span className="text-[11px] font-medium text-gray-500 dark:text-white/50">Share</span>
            </button>

            {/* Edit (admin only) */}
            {isAdmin && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(mosque);
                }}
                className="flex flex-col items-center gap-1.5 w-[72px] flex-shrink-0 py-2 rounded-2xl hover:bg-gray-100/80 dark:hover:bg-white/[0.05] transition-colors active:scale-90"
              >
                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/[0.08] flex items-center justify-center">
                  <Edit2 className="w-5 h-5 text-gray-500 dark:text-white/50" strokeWidth={2} />
                </div>
                <span className="text-[11px] font-medium text-gray-500 dark:text-white/50">Edit</span>
              </button>
            )}

            {/* TV Display (desktop only) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
                navigate(`/tv/${mosque.id}`);
              }}
              className="hidden md:flex flex-col items-center gap-1.5 w-[72px] flex-shrink-0 py-2 rounded-2xl hover:bg-gray-100/80 dark:hover:bg-white/[0.05] transition-colors active:scale-90"
            >
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/[0.08] flex items-center justify-center">
                <Monitor className="w-5 h-5 text-gray-500 dark:text-white/50" strokeWidth={2} />
              </div>
              <span className="text-[11px] font-medium text-gray-500 dark:text-white/50">TV</span>
            </button>

            {/* Report incorrect time — hidden for admins since they can edit directly */}
            {onReportTime && !isAdmin && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onReportTime(mosque);
                }}
                className="flex flex-col items-center gap-1.5 w-[72px] flex-shrink-0 py-2 rounded-2xl hover:bg-gray-100/80 dark:hover:bg-white/[0.05] transition-colors active:scale-90"
              >
                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/[0.08] flex items-center justify-center">
                  <Flag className="w-5 h-5 text-gray-500 dark:text-white/50" strokeWidth={2} />
                </div>
                <span className="text-[11px] font-medium text-gray-500 dark:text-white/50">Report</span>
              </button>
            )}

            {/* Masjid Landing Page */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Don't call onClose() — the route change to masjid-landing
                // unmounts the entire AppContent (including this modal),
                // avoiding the flicker from modal-close → main-view → landing-page.
                const url = new URL(window.location.href);
                url.searchParams.set('masjid', mosque.id);
                url.hash = '';
                window.history.pushState({ fromApp: true, mosque }, '', url.toString());
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="flex flex-col items-center gap-1.5 w-[72px] flex-shrink-0 py-2 rounded-2xl hover:bg-gray-100/80 dark:hover:bg-white/[0.05] transition-colors active:scale-90"
            >
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/[0.08] flex items-center justify-center">
                <Globe className="w-5 h-5 text-gray-500 dark:text-white/50" strokeWidth={2} />
              </div>
              <span className="text-[11px] font-medium text-gray-500 dark:text-white/50">Page</span>
            </button>
          </div>

          {/* TV Display URL — desktop only, compact */}
          <div className="hidden md:block bg-gray-50/80 dark:bg-white/[0.03] rounded-2xl p-4 border border-gray-100 dark:border-white/[0.06]">
            <div className="flex items-center gap-2.5 mb-2.5">
              <Monitor className="w-4 h-4 text-gray-500 dark:text-white/50 flex-shrink-0" strokeWidth={2} />
              <span className="text-[13px] font-medium text-gray-500 dark:text-white/50">TV Display URL</span>
            </div>
            <input
              type="text"
              readOnly
              value={`${SITE_URL}/tv/${mosque.id}`}
              onClick={(e) => { e.stopPropagation(); e.currentTarget.select(); }}
              className="w-full text-[13px] bg-white dark:bg-black/30 px-3 py-2.5 rounded-xl border border-gray-200/80 dark:border-white/[0.08] text-gray-600 dark:text-white/70 font-mono cursor-text focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:focus:ring-blue-500/20 focus:border-blue-400 dark:focus:border-blue-500/40 transition-all"
            />
            <p className="text-[11px] text-gray-400 dark:text-white/30 mt-2">Click to select, then copy</p>
          </div>

          {/* Landing Page URL — shareable for Google listing etc. */}
          <div className="bg-gray-50/80 dark:bg-white/[0.03] rounded-2xl p-4 border border-gray-100 dark:border-white/[0.06]">
            <div className="flex items-center gap-2.5 mb-2.5">
              <ExternalLink className="w-4 h-4 text-gray-500 dark:text-white/50 flex-shrink-0" strokeWidth={2} />
              <span className="text-[13px] font-medium text-gray-500 dark:text-white/50">Masjid Page URL</span>
            </div>
            <input
              type="text"
              readOnly
              value={`${SITE_URL}?masjid=${mosque.id}`}
              onClick={(e) => { e.stopPropagation(); e.currentTarget.select(); }}
              className="w-full text-[13px] bg-white dark:bg-black/30 px-3 py-2.5 rounded-xl border border-gray-200/80 dark:border-white/[0.08] text-gray-600 dark:text-white/70 font-mono cursor-text focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:focus:ring-blue-500/20 focus:border-blue-400 dark:focus:border-blue-500/40 transition-all"
            />
            <p className="text-[11px] text-gray-400 dark:text-white/30 mt-2">Use as your Google listing website</p>
          </div>

          {/* Monthly Timetable link — hidden for now */}
          {/* <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
              navigate(`/timetable/${mosque.id}`);
            }}
            className="w-full flex items-center gap-3 bg-gray-50/80 dark:bg-white/[0.03] rounded-2xl p-4 border border-gray-100 dark:border-white/[0.06] hover:bg-gray-100/80 dark:hover:bg-white/[0.05] transition-colors active:scale-[0.99] text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/[0.08] flex items-center justify-center flex-shrink-0">
              <Printer className="w-4.5 h-4.5 text-gray-500 dark:text-white/50" strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-gray-700 dark:text-white/70">Monthly Timetable</div>
              <div className="text-[11px] text-gray-400 dark:text-white/30">View & print a full month of prayer times</div>
            </div>
          </button> */}

          {/* Salah Times */}
          <div>
            <div className="text-[13px] uppercase tracking-widest text-gray-400 dark:text-white/35 font-medium mb-3">Salah Times</div>
            <PrayerTimesDisplay 
              times={calculatedTimes} 
              nextPrayerName={nextPrayer.name}
              showAdhan={true}
              offeredPrayers={mosque.offeredPrayers}
            />
          </div>

          {/* Special Notes */}
          {mosque.note && (
            <div>
              <div className="text-[13px] uppercase tracking-widest text-gray-400 dark:text-white/35 font-medium mb-3">Notes</div>
              <div className="bg-amber-50/80 dark:bg-amber-900/10 border border-amber-200/60 dark:border-amber-800/20 rounded-2xl p-4">
                <p className="text-[15px] text-amber-900 dark:text-amber-200/90 leading-relaxed">
                  {linkifyText(mosque.note)}
                </p>
              </div>
            </div>
          )}

          {/* Ramadan Program — shown when masjid has info */}
          {mosque.ramadanProgram && (mosque.ramadanProgram.tarawih || mosque.ramadanProgram.iftarProvided || mosque.ramadanProgram.itikaf || mosque.ramadanProgram.qiyam || mosque.ramadanProgram.khatmQuran) && (() => {
            const rp = mosque.ramadanProgram;
            return (
              <div>
                <div className="text-[13px] uppercase tracking-widest text-gray-400 dark:text-white/35 font-medium mb-3 flex items-center gap-2">
                  <Moon className="w-3.5 h-3.5" />
                  Ramadan Program
                </div>
                <div className="bg-purple-50/80 dark:bg-purple-900/10 border border-purple-200/60 dark:border-purple-800/20 rounded-2xl p-4 space-y-3">
                  {rp.tarawih && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-800/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Rows3 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <div className="text-[15px] font-medium text-purple-900 dark:text-purple-200">
                          Tarawih{rp.tarawihRakat ? ` — ${rp.tarawihRakat} Rakat` : ''}
                        </div>
                        <div className="text-[13px] text-purple-700 dark:text-purple-300/70">
                          {rp.tarawihTime || ''}
                        </div>
                      </div>
                    </div>
                  )}
                  {rp.iftarProvided && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-800/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Utensils className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <div className="text-[15px] font-medium text-purple-900 dark:text-purple-200">
                          Iftar{rp.iftarEveryNight ? ' — Every Night' : ''}
                        </div>
                        {rp.iftarNotes && (
                          <div className="text-[13px] text-purple-700 dark:text-purple-300/70">
                            {rp.iftarNotes}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {rp.khatmQuran && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-800/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <div className="text-[15px] font-medium text-purple-900 dark:text-purple-200">
                          Khatm al-Quran
                        </div>
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
                      <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-800/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <DoorClosed className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      </div>
                      <div>
                        <div className="text-[15px] font-medium text-purple-900 dark:text-purple-200">
                          I'tikaf Available
                        </div>
                        <div className="text-[13px] text-purple-700 dark:text-purple-300/70">
                          Last 10 nights
                        </div>
                      </div>
                    </div>
                  )}
                  {rp.qiyam && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-800/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Star className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <div className="text-[15px] font-medium text-purple-900 dark:text-purple-200">
                          Qiyam al-Layl
                        </div>
                        <div className="text-[13px] text-purple-700 dark:text-purple-300/70">
                          {rp.qiyamTime ? `Last 10 nights at ${rp.qiyamTime}` : 'Last 10 nights'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Events */}
          {mosque.events.length > 0 && (
            <div>
              <div className="text-[13px] uppercase tracking-widest text-gray-400 dark:text-white/35 font-medium mb-3">Events</div>
              <div className="space-y-2">
                {sortEventsByProximity(mosque.events).map(event => (
                  <div key={event.id} className="bg-gray-50/80 dark:bg-white/[0.03] rounded-2xl p-4 border border-gray-100 dark:border-white/[0.06]">
                    <div className="flex-1">
                      <h4 className="font-semibold text-[15px] text-gray-900 dark:text-white">{event.title}</h4>
                      <div className="text-[13px] text-gray-500 dark:text-white/50 mt-1">
                        {event.recurring?.enabled ? (
                          <>
                            {event.recurring.frequency === 'daily' && (
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2} />
                                Every day at {event.time}
                              </div>
                            )}
                            {event.recurring.frequency === 'weekly' && event.recurring.dayOfWeek !== undefined && (
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2} />
                                Every {getDayName(event.recurring.dayOfWeek)} at {event.time}
                              </div>
                            )}
                            {event.recurring.frequency === 'monthly' && event.recurring.dayOfMonth !== undefined && (
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2} />
                                Monthly on day {event.recurring.dayOfMonth} at {event.time}
                              </div>
                            )}
                            {event.recurring.frequency === 'nth-day' && event.recurring.nthWeek && event.recurring.nthDayOfWeek !== undefined && (
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2} />
                                Every {formatNthDay(event.recurring.nthDayOfWeek, event.recurring.nthWeek)} at {event.time}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2} />
                            {parseLocalDate(event.date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric'
                            })} at {event.time}
                          </div>
                        )}
                      </div>
                      {event.description && (
                        <p className="text-[14px] text-gray-600 dark:text-white/60 mt-2 leading-relaxed">{event.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Volunteer Opportunities */}
          {mosqueVolunteers.length > 0 && (
            <div>
              <div className="text-[13px] uppercase tracking-widest text-gray-400 dark:text-white/35 font-medium mb-3">Volunteer</div>
              <div className="space-y-2">
                {mosqueVolunteers.map(vol => (
                  <a
                    key={vol.id}
                    href={vol.link.startsWith('http') ? vol.link : `https://${vol.link}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start justify-between gap-3 bg-rose-50/60 dark:bg-rose-950/10 rounded-2xl p-4 border border-rose-100 dark:border-rose-900/20 hover:border-rose-300 dark:hover:border-rose-700/40 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Heart className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 flex-shrink-0" />
                        <h4 className="font-semibold text-[15px] text-gray-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">{vol.title}</h4>
                      </div>
                      {vol.description && (
                        <p className="text-[13px] text-gray-500 dark:text-white/50 mt-1 leading-relaxed">{vol.description}</p>
                      )}
                    </div>
                    <ExternalLink className="w-4 h-4 text-rose-400 dark:text-rose-500/60 group-hover:text-rose-500 dark:group-hover:text-rose-400 flex-shrink-0 mt-0.5 transition-colors" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}