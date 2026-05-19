/**
 * Iqama time validation utilities
 * Enforces guardrails like AM/PM constraints per prayer and "not before adhan" checks.
 */

export interface IqamaValidationError {
  message: string;
  severity: 'error' | 'warning';
}

/** AM/PM and reasonable-range constraints per prayer */
const PRAYER_RULES: Record<string, { allowedPeriods: ('AM' | 'PM')[]; label: string }> = {
  fajr:    { allowedPeriods: ['AM'], label: 'Fajr' },
  dhuhr:   { allowedPeriods: ['PM'], label: 'Dhuhr' },
  asr:     { allowedPeriods: ['PM'], label: 'Asr' },
  maghrib: { allowedPeriods: ['PM'], label: 'Maghrib' },
  isha:    { allowedPeriods: ['PM'], label: 'Isha' },
  jumuah:  { allowedPeriods: ['PM'], label: 'Jumuah' },
};

/**
 * Parse "6:30 AM" style time string into components + total minutes since midnight.
 * Returns null if the string doesn't match the expected format.
 */
export function parseTimeString(time: string): {
  hours: number;
  minutes: number;
  period: 'AM' | 'PM';
  totalMinutes: number;
} | null {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase() as 'AM' | 'PM';

  if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return null;

  let h24 = hours;
  if (period === 'PM' && hours !== 12) h24 += 12;
  if (period === 'AM' && hours === 12) h24 = 0;

  return { hours, minutes, period, totalMinutes: h24 * 60 + minutes };
}

/**
 * Validate a single iqama time config for a given prayer.
 *
 * @param prayerKey  e.g. 'fajr', 'dhuhr', etc.
 * @param config     The IqamaTime object (type + time/minutes)
 * @param adhanTime  Optional adhan time string for "not before adhan" check
 * @returns          Validation error or null if valid
 */
export function validateIqamaTime(
  prayerKey: string,
  config: { type: 'fixed' | 'offset'; time?: string; minutes?: number },
  adhanTime?: string
): IqamaValidationError | null {
  const rule = PRAYER_RULES[prayerKey];

  if (config.type === 'fixed') {
    if (!config.time || !config.time.trim()) {
      return { message: 'Time is required', severity: 'error' };
    }

    const parsed = parseTimeString(config.time);
    if (!parsed) {
      return { message: 'Invalid format \u2014 use "6:00 AM" style', severity: 'error' };
    }

    // AM/PM constraint
    if (rule && !rule.allowedPeriods.includes(parsed.period)) {
      const expected = rule.allowedPeriods.join(' or ');
      return {
        message: `${rule.label} must be ${expected}`,
        severity: 'error',
      };
    }

    // Not-before-adhan constraint
    if (adhanTime) {
      const adhanParsed = parseTimeString(adhanTime);
      if (adhanParsed && parsed.totalMinutes < adhanParsed.totalMinutes) {
        return {
          message: `Can\u2019t be before adhan (${adhanTime})`,
          severity: 'error',
        };
      }
    }
  }

  if (config.type === 'offset') {
    const mins = config.minutes ?? 0;
    if (mins < 0) {
      return { message: 'Offset can\u2019t be negative', severity: 'error' };
    }
    if (mins > 60) {
      return { message: 'Offset seems too large (max 60 min)', severity: 'warning' };
    }
  }

  return null;
}

/**
 * Run validation across all five prayers.
 * Returns a map of prayer -> error, only for those with issues.
 */
export function validateAllIqamaTimes(
  prayers: Record<string, { type: 'fixed' | 'offset'; time?: string; minutes?: number }>,
  adhanTimes?: Record<string, string>
): Record<string, IqamaValidationError> {
  const errors: Record<string, IqamaValidationError> = {};
  const keys = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

  for (const key of keys) {
    const config = prayers[key];
    if (!config) continue;
    const adhan = adhanTimes?.[key];
    const err = validateIqamaTime(key, config, adhan);
    if (err) errors[key] = err;
  }

  // Cross-prayer ordering: iqama times should be chronologically ordered
  // fajr < dhuhr < asr < maghrib < isha
  const orderedKeys = keys.filter(k => prayers[k]?.type === 'fixed' && prayers[k]?.time);
  for (let i = 0; i < orderedKeys.length - 1; i++) {
    const currKey = orderedKeys[i];
    const nextKey = orderedKeys[i + 1];
    // Skip if either already has an error
    if (errors[currKey] || errors[nextKey]) continue;

    const currParsed = parseTimeString(prayers[currKey].time!);
    const nextParsed = parseTimeString(prayers[nextKey].time!);
    if (currParsed && nextParsed && currParsed.totalMinutes >= nextParsed.totalMinutes) {
      const currLabel = PRAYER_RULES[currKey]?.label || currKey;
      const nextLabel = PRAYER_RULES[nextKey]?.label || nextKey;
      errors[nextKey] = {
        message: `${nextLabel} must be after ${currLabel}`,
        severity: 'error',
      };
    }
  }

  return errors;
}
