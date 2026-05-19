import { useState, useEffect, useMemo } from 'react';
import { Calendar, MapPin } from 'lucide-react';
import type { Event, Mosque } from '../App';

// Convert 24-hour time to 12-hour format
function formatTime12Hour(time: string): string {
  if (!time || !time.includes(':')) return time;

  const parts = time.split(':');
  const hours = parseInt(parts[0], 10);
  const minutes = parts[1] ? parseInt(parts[1], 10) : 0;

  if (isNaN(hours) || isNaN(minutes)) return time;

  const period = hours >= 12 ? 'pm' : 'am';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')}${period}`;
}

interface EventWithMosque {
  event: Event;
  mosque: Mosque;
}

interface EventCarouselProps {
  mosques: Mosque[];
}

export function EventCarousel({ mosques }: EventCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Get today's events from all mosques
  const todayEvents = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const dayOfWeek = today.getDay();

    const events: EventWithMosque[] = [];

    for (const mosque of mosques) {
      if (!mosque.events || mosque.events.length === 0) continue;

      for (const event of mosque.events) {
        let isToday = false;

        // Check if event is today
        if (event.date === todayStr) {
          isToday = true;
        } else if (event.recurring?.enabled) {
          // Check recurring events
          if (event.recurring.frequency === 'daily') {
            isToday = true;
          } else if (event.recurring.frequency === 'weekly' && event.recurring.dayOfWeek === dayOfWeek) {
            isToday = true;
          } else if (event.recurring.frequency === 'monthly') {
            const todayDay = today.getDate();
            if (event.recurring.dayOfMonth === todayDay) {
              isToday = true;
            }
          } else if (event.recurring.frequency === 'nth-day') {
            // Calculate nth occurrence of dayOfWeek
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            const firstDayOfWeek = firstDay.getDay();
            const offset = (event.recurring.dayOfWeek! - firstDayOfWeek + 7) % 7;
            const nthDate = 1 + offset + (event.recurring.nthWeek! - 1) * 7;
            if (today.getDate() === nthDate) {
              isToday = true;
            }
          }
        }

        if (isToday) {
          events.push({ event, mosque });
        }
      }
    }

    return events;
  }, [mosques]);

  // Auto-rotate carousel
  useEffect(() => {
    if (todayEvents.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % todayEvents.length);
    }, 5000); // Change every 5 seconds

    return () => clearInterval(interval);
  }, [todayEvents.length]);

  if (todayEvents.length === 0) return null;

  const { event, mosque } = todayEvents[currentIndex];

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 p-5 shadow-lg border border-blue-400/20 dark:border-blue-500/20">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
      
      <div className="relative z-[1]">
        {/* Event content with fade transition */}
        <div 
          key={`${event.id}-${mosque.id}`}
          className="animate-[fadeIn_0.5s_ease]"
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-white/60 font-semibold">
                  Today's Event
                </div>
              </div>
            </div>
            
            {/* Pagination dots */}
            {todayEvents.length > 1 && (
              <div className="flex gap-1.5">
                {todayEvents.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      idx === currentIndex
                        ? 'bg-white w-4'
                        : 'bg-white/40 hover:bg-white/60'
                    }`}
                    aria-label={`Go to event ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Event title */}
          <h3 className="text-white font-semibold text-base mb-1.5 leading-snug">
            {event.title}
          </h3>

          {/* Event details */}
          <div className="space-y-1 text-white/80 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{formatTime12Hour(event.time)}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{mosque.name}</span>
            </div>
          </div>

          {/* Description if available */}
          {event.description && (
            <p className="mt-3 text-white/70 text-xs leading-relaxed line-clamp-2">
              {event.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
