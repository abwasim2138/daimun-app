import { ScheduledTimeChange } from '../App';
import { parseLocalDate } from './dateUtils';

/**
 * Check if a scheduled time change is active for a given reference date.
 * Compares start/end dates against the provided `referenceDate` (not "now").
 */
function isScheduledChangeActiveForDate(change: ScheduledTimeChange, referenceDate: Date): boolean {
  // Clone to avoid mutating
  const ref = new Date(referenceDate);
  ref.setHours(0, 0, 0, 0);

  // Use parseLocalDate to avoid UTC midnight shift (new Date("YYYY-MM-DD") parses as UTC)
  const startDate = parseLocalDate(change.startDate);
  startDate.setHours(0, 0, 0, 0);

  const isAfterStart = ref >= startDate;

  if (change.endDate) {
    const endDate = parseLocalDate(change.endDate);
    endDate.setHours(23, 59, 59, 999);
    return isAfterStart && ref <= endDate;
  }

  // No end date → permanent from start date onward
  return isAfterStart;
}

/**
 * Get the effective iqama time for a prayer, accounting for active scheduled time changes.
 *
 * @param baseTime   The iqama time from the mosque's base config
 * @param prayer     The prayer name
 * @param scheduledChanges  Array of scheduled changes (may be undefined)
 * @param forDate    The date to evaluate against (defaults to today)
 *
 * When multiple active changes exist for the same prayer, the one with the
 * latest startDate wins (most-recently-scheduled override takes precedence).
 */
export function getEffectiveIqamaTime(
  baseTime: string,
  prayer: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' | 'jumuah',
  scheduledChanges: ScheduledTimeChange[] | undefined,
  forDate?: Date
): string {
  if (!scheduledChanges || scheduledChanges.length === 0) {
    return baseTime;
  }

  const referenceDate = forDate || new Date();

  // Find ALL active changes for this prayer on the reference date,
  // then pick the one with the latest startDate (most recent override wins).
  const activeChanges = scheduledChanges
    .filter(c => c.prayer === prayer && isScheduledChangeActiveForDate(c, referenceDate))
    .sort((a, b) => parseLocalDate(b.startDate).getTime() - parseLocalDate(a.startDate).getTime());

  if (activeChanges.length > 0) {
    return activeChanges[0].newTime;
  }

  return baseTime;
}

/**
 * Check whether a specific prayer has a scheduled override on a given date.
 * Useful for highlighting overridden cells in the timetable.
 */
export function hasScheduledOverride(
  prayer: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' | 'jumuah',
  scheduledChanges: ScheduledTimeChange[] | undefined,
  forDate: Date
): boolean {
  if (!scheduledChanges || scheduledChanges.length === 0) return false;
  return scheduledChanges.some(
    c => c.prayer === prayer && isScheduledChangeActiveForDate(c, forDate)
  );
}