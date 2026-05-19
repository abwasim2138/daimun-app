import { Coordinates, CalculationMethod, PrayerTimes, Prayer, Madhab } from 'adhan';

export interface CalculatedPrayerTimes {
  fajr: Date;
  sunrise: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
}

/**
 * Calculate prayer times for a given location and date using specified calculation method
 */
export function calculatePrayerTimes(
  latitude: number,
  longitude: number,
  date: Date = new Date(),
  calculationMethodName: string = 'NorthAmerica',
  asrMethod: 'Standard' | 'Hanafi' = 'Standard'
): CalculatedPrayerTimes {
  const coordinates = new Coordinates(latitude, longitude);
  
  // Map string name to actual CalculationMethod
  let params;
  switch (calculationMethodName) {
    case 'MuslimWorldLeague':
      params = CalculationMethod.MuslimWorldLeague();
      break;
    case 'Egyptian':
      params = CalculationMethod.Egyptian();
      break;
    case 'Karachi':
      params = CalculationMethod.Karachi();
      break;
    case 'UmmAlQura':
      params = CalculationMethod.UmmAlQura();
      break;
    case 'Dubai':
      params = CalculationMethod.Dubai();
      break;
    case 'Qatar':
      params = CalculationMethod.Qatar();
      break;
    case 'Kuwait':
      params = CalculationMethod.Kuwait();
      break;
    case 'MoonsightingCommittee':
      params = CalculationMethod.MoonsightingCommittee();
      break;
    case 'Singapore':
      params = CalculationMethod.Singapore();
      break;
    case 'Turkey':
      params = CalculationMethod.Turkey();
      break;
    case 'Tehran':
      params = CalculationMethod.Tehran();
      break;
    case 'NorthAmerica':
    default:
      params = CalculationMethod.NorthAmerica(); // ISNA method (default)
      break;
  }
  
  // Set Asr calculation method (Hanafi or Standard/Shafi)
  params.madhab = asrMethod === 'Hanafi' ? Madhab.Hanafi : Madhab.Shafi;
  
  const prayerTimes = new PrayerTimes(coordinates, date, params);

  return {
    fajr: prayerTimes.fajr,
    sunrise: prayerTimes.sunrise,
    dhuhr: prayerTimes.dhuhr,
    asr: prayerTimes.asr,
    maghrib: prayerTimes.maghrib,
    isha: prayerTimes.isha
  };
}

/**
 * Format a Date object to 12-hour time string (e.g., "6:30 AM")
 */
export function formatPrayerTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Add minutes to a Date object
 */
export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000);
}

/**
 * Convert time string to minutes since midnight
 */
export function timeToMinutes(timeStr: string): number {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return 0;
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[3].toUpperCase();
  
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  
  return hours * 60 + minutes;
}

/**
 * Get the current time in minutes since midnight
 */
export function getCurrentMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}