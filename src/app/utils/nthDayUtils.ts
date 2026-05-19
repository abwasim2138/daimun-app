/**
 * Utility functions for handling "nth day of month" events
 * e.g., "Last Sunday of the month" or "First Friday of the month"
 */

export type NthWeek = 'first' | 'second' | 'third' | 'fourth' | 'last';

/**
 * Get the date for the nth occurrence of a weekday in a given month
 * @param year - The year
 * @param month - The month (0-11)
 * @param weekday - The day of week (0-6, where 0 = Sunday)
 * @param nthWeek - Which occurrence (first, second, third, fourth, last)
 * @returns The date, or null if not found
 */
export function getNthWeekdayOfMonth(
  year: number,
  month: number,
  weekday: number,
  nthWeek: NthWeek
): Date | null {
  if (nthWeek === 'last') {
    // Start from the last day of the month and work backwards
    const lastDay = new Date(year, month + 1, 0);
    const lastDayOfWeek = lastDay.getDay();
    
    let daysToSubtract = (lastDayOfWeek - weekday + 7) % 7;
    const targetDate = new Date(year, month, lastDay.getDate() - daysToSubtract);
    
    return targetDate;
  } else {
    // Find the first occurrence of the weekday
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay();
    
    let daysToAdd = (weekday - firstDayOfWeek + 7) % 7;
    
    // Add weeks based on nth value
    const weekOffset = { first: 0, second: 1, third: 2, fourth: 3 }[nthWeek];
    daysToAdd += weekOffset * 7;
    
    const targetDate = new Date(year, month, 1 + daysToAdd);
    
    // Verify it's still in the same month
    if (targetDate.getMonth() !== month) {
      return null;
    }
    
    return targetDate;
  }
}

/**
 * Check if today matches an nth-day recurring event
 * @param todayDate - The date to check
 * @param weekday - The day of week (0-6, where 0 = Sunday)
 * @param nthWeek - Which occurrence (first, second, third, fourth, last)
 * @returns true if today matches the pattern
 */
export function isNthDayToday(
  todayDate: Date,
  weekday: number,
  nthWeek: NthWeek
): boolean {
  // First check if today is the correct weekday
  if (todayDate.getDay() !== weekday) {
    return false;
  }
  
  const year = todayDate.getFullYear();
  const month = todayDate.getMonth();
  const targetDate = getNthWeekdayOfMonth(year, month, weekday, nthWeek);
  
  if (!targetDate) {
    return false;
  }
  
  return (
    todayDate.getFullYear() === targetDate.getFullYear() &&
    todayDate.getMonth() === targetDate.getMonth() &&
    todayDate.getDate() === targetDate.getDate()
  );
}

/**
 * Format nth-day pattern for display
 * @param weekday - The day of week (0-6, where 0 = Sunday)
 * @param nthWeek - Which occurrence
 * @returns Formatted string like "Last Sunday" or "First Friday"
 */
export function formatNthDay(weekday: number, nthWeek: NthWeek): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const nthNames = {
    first: 'First',
    second: 'Second',
    third: 'Third',
    fourth: 'Fourth',
    last: 'Last'
  };
  
  return `${nthNames[nthWeek]} ${days[weekday]}`;
}
