import { Event } from '../App';
import { getNthWeekdayOfMonth } from './nthDayUtils';
import { parseLocalDate } from './dateUtils';

/**
 * Get the next occurrence date for an event
 */
export function getNextOccurrence(event: Event, today: Date = new Date()): Date {
  const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  // For one-time events
  if (!event.recurring?.enabled && event.date) {
    const eventDate = parseLocalDate(event.date);
    return new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
  }
  
  // For recurring events
  if (event.recurring?.enabled) {
    const { frequency, dayOfWeek, dayOfMonth, nthWeek, nthDayOfWeek } = event.recurring;
    
    // Weekly events
    if (frequency === 'weekly' && dayOfWeek !== undefined) {
      const currentDay = todayDateOnly.getDay();
      let daysUntilEvent = (dayOfWeek - currentDay + 7) % 7;
      
      // If it's 0, the event is today
      if (daysUntilEvent === 0) {
        return todayDateOnly;
      }
      
      const nextOccurrence = new Date(todayDateOnly);
      nextOccurrence.setDate(todayDateOnly.getDate() + daysUntilEvent);
      return nextOccurrence;
    }
    
    // Monthly events
    if (frequency === 'monthly' && dayOfMonth !== undefined) {
      const currentDate = todayDateOnly.getDate();
      
      // If today's date matches or hasn't passed this month
      if (dayOfMonth >= currentDate) {
        const thisMonth = new Date(todayDateOnly.getFullYear(), todayDateOnly.getMonth(), dayOfMonth);
        return thisMonth;
      } else {
        // Event is next month
        const nextMonth = new Date(todayDateOnly.getFullYear(), todayDateOnly.getMonth() + 1, dayOfMonth);
        return nextMonth;
      }
    }
    
    // Nth-day events (e.g., "Last Sunday of the month")
    if (frequency === 'nth-day' && nthWeek && nthDayOfWeek !== undefined) {
      // Try this month first
      const thisMonthOccurrence = getNthWeekdayOfMonth(
        todayDateOnly.getFullYear(),
        todayDateOnly.getMonth(),
        nthDayOfWeek,
        nthWeek
      );
      
      if (thisMonthOccurrence && thisMonthOccurrence >= todayDateOnly) {
        return thisMonthOccurrence;
      }
      
      // Try next month
      const nextMonth = new Date(todayDateOnly.getFullYear(), todayDateOnly.getMonth() + 1, 1);
      const nextMonthOccurrence = getNthWeekdayOfMonth(
        nextMonth.getFullYear(),
        nextMonth.getMonth(),
        nthDayOfWeek,
        nthWeek
      );
      
      return nextMonthOccurrence || todayDateOnly;
    }
  }
  
  // Default: return today
  return todayDateOnly;
}

/**
 * Sort events by their next occurrence, with today's events first
 */
export function sortEventsByProximity(events: Event[]): Event[] {
  const today = new Date();
  const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  return [...events].sort((a, b) => {
    const aNextDate = getNextOccurrence(a, today);
    const bNextDate = getNextOccurrence(b, today);
    
    const aDaysUntil = Math.floor((aNextDate.getTime() - todayDateOnly.getTime()) / (1000 * 60 * 60 * 24));
    const bDaysUntil = Math.floor((bNextDate.getTime() - todayDateOnly.getTime()) / (1000 * 60 * 60 * 24));
    
    // Sort by days until next occurrence
    return aDaysUntil - bDaysUntil;
  });
}
