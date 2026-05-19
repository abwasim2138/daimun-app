import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Star, MapPin, Calendar, Monitor, Share2, Edit2, Bell, MoreHorizontal, Moon, Utensils, BookOpen, DoorClosed, Rows3 } from 'lucide-react';
import { toHijri } from 'hijri-converter';
import { Mosque } from '../App';
import { parseLocalDate } from '../utils/dateUtils';
import { calculateIqamaTimes, getNextPrayer } from '../utils/iqamaCalculator';
import { calculatePrayerTimes, formatPrayerTime, timeToMinutes } from '../utils/prayerTimes';
import { isNthDayToday, formatNthDay } from '../utils/nthDayUtils';
import { sortEventsByProximity } from '../utils/eventSorter';
import { getAutoAnnouncements, formatAnnouncementMessage } from '../utils/scheduledChangeAnnouncer';
import { navigate } from '../utils/router';

interface MosqueCardProps {
  mosque: Mosque;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  distance: number | null;
  onShare: (mosque: Mosque) => void;
  onEdit: (mosque: Mosque) => void;
  onDelete: (id: string) => void;
  onAddEvent: (mosqueId: string) => void;
  onDeleteEvent: (mosqueId: string, eventId: string) => void;
  onDetail: (mosque: Mosque) => void;
  canEdit: boolean;
}

const getDayName = (day: number) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[day];
};

// Check if an event is happening today
const isEventToday = (event: any): boolean => {
  const today = new Date();
  const todayDateString = today.toISOString().split('T')[0];
  
  // For recurring events
  if (event.recurring?.enabled) {
    if (event.recurring.frequency === 'daily') {
      return true;
    }
    if (event.recurring.frequency === 'weekly' && event.recurring.dayOfWeek !== undefined) {
      return today.getDay() === event.recurring.dayOfWeek;
    }
    if (event.recurring.frequency === 'monthly' && event.recurring.dayOfMonth !== undefined) {
      return today.getDate() === event.recurring.dayOfMonth;
    }
    if (event.recurring.frequency === 'nth-day' && event.recurring.nthWeek && event.recurring.nthDayOfWeek !== undefined) {
      return isNthDayToday(today, event.recurring.nthDayOfWeek, event.recurring.nthWeek);
    }
  }
  
  // For one-time events
  if (event.date) {
    return event.date === todayDateString;
  }
  
  return false;
};

export const MosqueCard = React.memo(function MosqueCard({ 
  mosque, 
  isFavorite, 
  onToggleFavorite, 
  distance, 
  onShare,
  onEdit,
  onDelete,
  onAddEvent,
  onDeleteEvent,
  onDetail,
  canEdit
}: MosqueCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Close context menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        menuButtonRef.current && !menuButtonRef.current.contains(e.target as Node)
      ) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

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
  
  // Get auto-generated announcements for scheduled time changes (1 day before)
  const autoAnnouncements = getAutoAnnouncements(mosque.scheduledTimeChanges);

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
    // Friendly relative time
    if (diffHours < 1) {
      const mins = Math.floor(diffMs / (1000 * 60));
      return mins <= 1 ? 'Just now' : `${mins}m ago`;
    }
    return `${Math.floor(diffHours)}h ago`;
  })();

  // Filter events to only show today's events on the main card
  const todaysEvents = mosque.events.filter(isEventToday);

  // Sort events by proximity
  const sortedEvents = sortEventsByProximity(todaysEvents);

  const handleCardClick = () => {
    onDetail(mosque);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onDetail(mosque);
    }
  };

  // Check if it's currently Ramadan for showing Ramadan badges
  // Account for Islamic day starting at Maghrib
  const now = new Date();
  let adjustedDate = new Date(now);
  
  // Check if we're past Maghrib
  try {
    const times = calculatePrayerTimes(
      mosque.latitude,
      mosque.longitude,
      now,
      mosque.calculationMethod || 'NorthAmerica',
      mosque.asrMethod || 'Standard'
    );
    const maghribTime = formatPrayerTime(times.maghrib);
    const maghribMinutes = timeToMinutes(maghribTime);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    // If we're past Maghrib, we're in the next Islamic day
    if (currentMinutes >= maghribMinutes) {
      adjustedDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Add 1 day
    }
  } catch (e) {
    // If prayer time calculation fails, fall back to midnight-based conversion
    console.warn('Failed to calculate Maghrib time for Islamic date adjustment:', e);
  }
  
  const hijri = toHijri(adjustedDate.getFullYear(), adjustedDate.getMonth() + 1, adjustedDate.getDate());
  const isRamadan = hijri.hm === 9;
  const ramadanDay = hijri.hm === 9 ? hijri.hd : 0;

  const rp = mosque.ramadanProgram;
  const hasRamadanInfo = rp && (rp.tarawih || rp.iftarProvided || rp.itikaf || rp.qiyam || rp.khatmQuran);
  const isLast10 = isRamadan && ramadanDay >= 21;

  // During Ramadan fasting hours, label the hero as "Next Iqama" for clarity
  const isFastingHours = useMemo(() => {
    if (!isRamadan) return false;
    const now = new Date();
    const adhan = calculatePrayerTimes(
      mosque.latitude, mosque.longitude, now,
      mosque.calculationMethod || 'NorthAmerica',
      mosque.asrMethod || 'Standard'
    );
    const fajrMin = timeToMinutes(formatPrayerTime(adhan.fajr));
    const maghribMin = timeToMinutes(formatPrayerTime(adhan.maghrib));
    const currentMin = now.getHours() * 60 + now.getMinutes();
    return currentMin >= fajrMin && currentMin < maghribMin;
  }, [isRamadan, mosque]);

  // Determine if we have any metadata to show under the name
  const hasDistance = distance !== null;
  const hasMetadata = hasDistance || recentlyUpdated;

  return (
    <div 
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      className="w-full text-left bg-white dark:bg-[#1C1C1E] rounded-2xl border border-gray-200/50 dark:border-white/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3),0_8px_24px_rgba(0,0,0,0.2)] overflow-hidden transition-all duration-300 hover:shadow-[0_2px_8px_rgba(0,0,0,0.1),0_16px_40px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_2px_8px_rgba(0,0,0,0.4),0_16px_40px_rgba(0,0,0,0.25)] hover:-translate-y-0.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2 dark:focus:ring-offset-[#111]"
      aria-label={`View details for ${mosque.name}`}
    >
      <div className="p-5">
        {/* Header — clean: name + metadata, star + context menu */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[17px] text-gray-900 dark:text-white tracking-tight mb-1">{mosque.name}</h3>
            {hasMetadata && (
              <p className="text-[13px] text-gray-500 dark:text-white/50 flex items-center gap-1 flex-wrap">
                {hasDistance && (
                  <>
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2} />
                    <span>{distance!.toFixed(1)} mi</span>
                  </>
                )}
                {hasDistance && recentlyUpdated && (
                  <span className="text-gray-300 dark:text-white/20">·</span>
                )}
                {recentlyUpdated && (
                  <span className="text-emerald-600 dark:text-emerald-400/80">Updated {recentlyUpdated}</span>
                )}
              </p>
            )}
          </div>
          <div className="flex items-center ml-3 -mt-0.5">
            {/* Favorite — 44pt touch target */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(mosque.id);
              }}
              className="w-11 h-11 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-full transition-colors active:scale-90"
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star
                className={`w-[18px] h-[18px] transition-colors ${
                  isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-white/25'
                }`}
                strokeWidth={2}
              />
            </button>
            {/* Context menu — 44pt touch target */}
            <div className="relative">
              <button
                ref={menuButtonRef}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu((prev) => !prev);
                }}
                className="w-11 h-11 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-full transition-colors active:scale-90"
                aria-label="More options"
              >
                <MoreHorizontal className="w-[18px] h-[18px] text-gray-300 dark:text-white/25" strokeWidth={2} />
              </button>
              {/* Dropdown */}
              {showMenu && (
                <div
                  ref={menuRef}
                  className="absolute right-0 top-full mt-1 w-48 bg-white/95 dark:bg-[#2C2C2E]/95 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.14),0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5),0_1px_3px_rgba(0,0,0,0.3)] border border-gray-200/50 dark:border-white/[0.1] overflow-hidden z-50 py-1.5"
                  style={{ animation: 'menuAppear 0.15s ease-out' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onShare(mosque);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-[15px] text-gray-700 dark:text-white/80 hover:bg-gray-100/80 dark:hover:bg-white/[0.06] flex items-center gap-3 transition-colors"
                  >
                    <Share2 className="w-[16px] h-[16px] text-gray-400 dark:text-white/40" strokeWidth={2} />
                    Share
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/tv/${mosque.id}`);
                      setShowMenu(false);
                    }}
                    className="hidden md:flex w-full px-4 py-2.5 text-left text-[15px] text-gray-700 dark:text-white/80 hover:bg-gray-100/80 dark:hover:bg-white/[0.06] items-center gap-3 transition-colors"
                  >
                    <Monitor className="w-[16px] h-[16px] text-gray-400 dark:text-white/40" strokeWidth={2} />
                    TV Display
                  </button>
                  {canEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(mosque);
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-[15px] text-gray-700 dark:text-white/80 hover:bg-gray-100/80 dark:hover:bg-white/[0.06] flex items-center gap-3 transition-colors"
                    >
                      <Edit2 className="w-[16px] h-[16px] text-gray-400 dark:text-white/40" strokeWidth={2} />
                      Edit
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Announcement Alert Badge — Auto-generated from scheduled time changes */}
        {autoAnnouncements.length > 0 && (
          <div className="mb-4 space-y-2">
            {autoAnnouncements.map((announcement, index) => (
              <div key={index} className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200/60 dark:border-amber-900/20 rounded-xl p-3 flex items-start gap-2.5">
                <Bell className="w-4 h-4 text-amber-500 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                    {formatAnnouncementMessage(announcement)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Next Prayer — Frosted Glass Hero */}
        <div className="relative overflow-hidden rounded-2xl">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-800 dark:from-[#2C2C2E] dark:to-[#1C1C1E]"></div>
          
          {/* Frosted glass overlay */}
          <div className="relative backdrop-blur-xl bg-black/40 dark:bg-black/30 border border-white/[0.08] p-5 rounded-2xl">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="text-[11px] uppercase tracking-widest text-white/45 mb-1 font-medium">{isFastingHours ? 'Next Iqama' : 'Next'}</div>
                <div className="text-2xl font-bold text-white mb-1">{nextPrayer.name}</div>
                {/* For Jumuah, show Khutbah or Salah label instead of Adhan */}
                {nextPrayer.name === 'Jumuah' ? (
                  <div className="text-[13px] text-white/50">
                    <div>Khutbah</div>
                  </div>
                ) : nextPrayer.adhanTime ? (
                  <div className="text-[13px] text-white/50">
                    <div>Adhan {nextPrayer.adhanTime}</div>
                  </div>
                ) : null}
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-[11px] uppercase tracking-widest text-white/45 mb-1 font-medium">
                  {nextPrayer.name === 'Jumuah' && nextPrayer.isKhutbah ? 'Khutbah' : 'Iqama'}
                </div>
                <div className="text-4xl font-bold text-white leading-none tracking-tight">{nextPrayer.iqamaTime}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Ramadan Program Strip — prominent, below hero */}
        {isRamadan && hasRamadanInfo && rp && (
          <div className="mt-3 bg-gradient-to-br from-[#6B2F4A]/[0.07] to-[#4A1E35]/[0.10] dark:from-[#6B2F4A]/20 dark:to-[#4A1E35]/15 border border-[#6B2F4A]/15 dark:border-[#6B2F4A]/15 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-2.5">
              <Moon className="w-3.5 h-3.5 text-[#6B2F4A] dark:text-[#D4A0B9]" />
              <span className="text-[11px] uppercase tracking-widest text-[#6B2F4A]/80 dark:text-[#D4A0B9]/70 font-medium">Ramadan</span>
              {isLast10 && (
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/30">Last 10</span>
              )}
            </div>
            {/* Primary row: tarawih + iftar — the two things everyone asks about */}
            <div className="grid grid-cols-2 gap-2">
              {rp.tarawih && (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#6B2F4A]/10 dark:bg-[#6B2F4A]/25 flex items-center justify-center flex-shrink-0">
                    <Rows3 className="w-3.5 h-3.5 text-[#6B2F4A] dark:text-[#D4A0B9]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-gray-900 dark:text-white truncate">
                      Tarawih{rp.tarawihRakat ? ` · ${rp.tarawihRakat}R` : ''}
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-white/40 truncate">
                      {rp.tarawihTime || ''}
                    </div>
                  </div>
                </div>
              )}
              {rp.iftarProvided && (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-800/30 flex items-center justify-center flex-shrink-0">
                    <Utensils className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-gray-900 dark:text-white truncate">
                      Iftar{rp.iftarEveryNight ? ' · Nightly' : ''}
                    </div>
                    {rp.iftarNotes && (
                      <div className="text-[11px] text-gray-500 dark:text-white/40 truncate">
                        {rp.iftarNotes}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {/* If only one of tarawih/iftar is set, fill second slot with qiyam or khatm */}
              {rp.tarawih && !rp.iftarProvided && rp.qiyam && (
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isLast10 ? 'bg-amber-100 dark:bg-amber-800/30' : 'bg-indigo-100 dark:bg-indigo-800/30'}`}>
                    <Star className={`w-3.5 h-3.5 ${isLast10 ? 'text-amber-600 dark:text-amber-400' : 'text-indigo-600 dark:text-indigo-400'}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-gray-900 dark:text-white truncate">Qiyam al-Layl</div>
                    <div className={`text-[11px] truncate ${isLast10 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-white/40'}`}>{isLast10 ? `Night ${ramadanDay - 20} of Last 10` : (rp.qiyamTime || 'Last 10 Nights')}</div>
                  </div>
                </div>
              )}
              {!rp.tarawih && rp.iftarProvided && rp.qiyam && (
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isLast10 ? 'bg-amber-100 dark:bg-amber-800/30' : 'bg-indigo-100 dark:bg-indigo-800/30'}`}>
                    <Star className={`w-3.5 h-3.5 ${isLast10 ? 'text-amber-600 dark:text-amber-400' : 'text-indigo-600 dark:text-indigo-400'}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-gray-900 dark:text-white truncate">Qiyam al-Layl</div>
                    <div className={`text-[11px] truncate ${isLast10 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-white/40'}`}>{isLast10 ? `Night ${ramadanDay - 20} of Last 10` : (rp.qiyamTime || 'Last 10 Nights')}</div>
                  </div>
                </div>
              )}
            </div>
            {/* Secondary offerings pills — only if there's extra beyond what the grid showed */}
            {(() => {
              const extras: { icon: React.ReactNode; label: string }[] = [];
              // Only show qiyam pill if it wasn't already shown in the grid
              if (rp.qiyam && rp.tarawih && rp.iftarProvided) {
                extras.push({ 
                  icon: <Star className={`w-2.5 h-2.5 ${isLast10 ? 'text-amber-600 dark:text-amber-400' : ''}`} />, 
                  label: isLast10 ? `Qiyam · Night ${ramadanDay - 20}` : (rp.qiyamTime ? `Qiyam ${rp.qiyamTime}` : 'Qiyam · Last 10')
                });
              }
              if (rp.itikaf) extras.push({ icon: <DoorClosed className="w-2.5 h-2.5" />, label: "I'tikaf" });
              if (rp.khatmQuran) extras.push({ icon: <BookOpen className="w-2.5 h-2.5" />, label: 'Khatm' });
              if (extras.length === 0) return null;
              return (
                <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-[#6B2F4A]/10 dark:border-[#6B2F4A]/10">
                  {extras.map((e, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-[11px] text-[#6B2F4A] dark:text-[#D4A0B9]/80 bg-[#6B2F4A]/[0.08] dark:bg-[#6B2F4A]/15 px-2 py-0.5 rounded-full">
                      {e.icon} {e.label}
                    </span>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* Events — spacing-only separation, no hard border */}
        {sortedEvents.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-1.5 text-[13px] text-gray-500 dark:text-white/50 mb-2 font-medium">
              <Calendar className="w-3.5 h-3.5" strokeWidth={2} />
              <span>Today</span>
            </div>
            <div className="space-y-1">
              {sortedEvents.slice(0, 2).map(event => (
                <div key={event.id} className="text-[15px] flex items-baseline gap-1.5">
                  <span className="text-gray-900 dark:text-white/90 font-medium truncate">{event.title}</span>
                  <span className="text-gray-400 dark:text-white/35 text-[13px] flex-shrink-0">
                    {event.time}
                  </span>
                </div>
              ))}
              {sortedEvents.length > 2 && (
                <div className="text-[13px] text-gray-400 dark:text-white/30">
                  +{sortedEvents.length - 2} more
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});