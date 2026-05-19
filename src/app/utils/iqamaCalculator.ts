import { IqamaTimes, IqamaTime, JumuahTime, ScheduledTimeChange } from '../App';
import { calculatePrayerTimes, formatPrayerTime, addMinutes, timeToMinutes, getCurrentMinutes } from './prayerTimes';
import { getEffectiveIqamaTime } from './effectiveIqamaTime';

export interface CalculatedIqamaTimes {
  fajr: { adhan: string; iqama: string };
  dhuhr: { adhan: string; iqama: string };
  asr: { adhan: string; iqama: string };
  maghrib: { adhan: string; iqama: string };
  isha: { adhan: string; iqama: string };
  jumuah?: { khutbah: string } | Array<{ khutbah: string }>; // Support single or multiple Jumuah
}

/**
 * Calculate both adhan and iqama times for a mosque
 * Supports both fixed times and offset-based times
 * If scheduled time changes are provided, applies effective times based on active scheduled changes
 */
export function calculateIqamaTimes(
  latitude: number,
  longitude: number,
  iqamaTimes: IqamaTimes,
  date: Date = new Date(),
  calculationMethod: string = 'NorthAmerica',
  asrMethod: 'Standard' | 'Hanafi' = 'Standard',
  scheduledTimeChanges?: ScheduledTimeChange[]
): CalculatedIqamaTimes {
  // Calculate adhan times with specified calculation method and asr method
  const adhanTimes = calculatePrayerTimes(latitude, longitude, date, calculationMethod, asrMethod);

  const calculateIqama = (
    prayer: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha',
    config: IqamaTime | string
  ): string => {
    // First calculate the base time
    let baseTime: string;
    
    // Handle legacy string format (backward compatibility)
    if (typeof config === 'string') {
      baseTime = config;
    }
    // Handle new object format
    else if (config.type === 'fixed' && config.time) {
      baseTime = config.time;
    } else if (config.type === 'offset' && config.minutes !== undefined) {
      const adhanDate = adhanTimes[prayer];
      const iqamaDate = addMinutes(adhanDate, config.minutes);
      baseTime = formatPrayerTime(iqamaDate);
    } else {
      // Fallback to adhan time
      baseTime = formatPrayerTime(adhanTimes[prayer]);
    }
    
    // Apply effective time (checking for active scheduled time changes)
    return getEffectiveIqamaTime(baseTime, prayer, scheduledTimeChanges, date);
  };

  const calculateJumuahIqama = (config: JumuahTime | JumuahTime[] | IqamaTime | string): { khutbah: string } | Array<{ khutbah: string }> => {
    // Handle array format (multiple Jumuah prayers)
    if (Array.isArray(config)) {
      return config.map(jumuah => ({
        khutbah: jumuah.khutbah.time
      }));
    }

    // Handle legacy string format - treat it as khutbah time
    if (typeof config === 'string') {
      return {
        khutbah: config
      };
    }

    // Check if it's the new JumuahTime format with khutbah
    if ('khutbah' in config) {
      return {
        khutbah: config.khutbah.time
      };
    }

    // Handle legacy IqamaTime format (type: 'fixed', time: '1:00 PM')
    if ('type' in config && config.type === 'fixed' && config.time) {
      return {
        khutbah: config.time
      };
    }

    // Default fallback
    return {
        khutbah: '12:45 PM'
    };
  };

  return {
    fajr: {
      adhan: formatPrayerTime(adhanTimes.fajr),
      iqama: calculateIqama('fajr', iqamaTimes.fajr)
    },
    dhuhr: {
      adhan: formatPrayerTime(adhanTimes.dhuhr),
      iqama: calculateIqama('dhuhr', iqamaTimes.dhuhr)
    },
    asr: {
      adhan: formatPrayerTime(adhanTimes.asr),
      iqama: calculateIqama('asr', iqamaTimes.asr)
    },
    maghrib: {
      adhan: formatPrayerTime(adhanTimes.maghrib),
      iqama: calculateIqama('maghrib', iqamaTimes.maghrib)
    },
    isha: {
      adhan: formatPrayerTime(adhanTimes.isha),
      iqama: calculateIqama('isha', iqamaTimes.isha)
    },
    jumuah: iqamaTimes.jumuah ? calculateJumuahIqama(iqamaTimes.jumuah) : undefined
  };
}

/**
 * Get the next salah name and time
 * For Jumuah, returns either Khutbah or Iqama time depending on current time
 */
export function getNextPrayer(calculatedTimes: CalculatedIqamaTimes, offeredPrayers?: ('fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha')[]): {
  name: string;
  iqamaTime: string;
  adhanTime?: string;
  isKhutbah?: boolean; // Flag for Jumuah khutbah vs iqama
} {
  const currentMinutes = getCurrentMinutes();
  const today = new Date();
  const isFriday = today.getDay() === 5; // 5 = Friday

  // Helper: check if a prayer is offered (all offered if field is undefined/empty)
  const isOffered = (key: string) => !offeredPrayers || offeredPrayers.length === 0 || offeredPrayers.includes(key as any);

  // Build prayers list with special handling for Jumuah
  const prayers: Array<{
    name: string;
    timeToCheck: string;
    iqama: string;
    adhan?: string;
    isKhutbah?: boolean;
  }> = [];

  if (isOffered('fajr')) {
    prayers.push({ name: 'Fajr', timeToCheck: calculatedTimes.fajr.iqama, iqama: calculatedTimes.fajr.iqama, adhan: calculatedTimes.fajr.adhan });
  }

  // On Friday, add Jumuah with khutbah times (always shown if mosque has jumuah, regardless of offeredPrayers)
  if (isFriday && calculatedTimes.jumuah) {
    const jumuahTimes = Array.isArray(calculatedTimes.jumuah) ? calculatedTimes.jumuah : [calculatedTimes.jumuah];
    for (const jumuah of jumuahTimes) {
      const khutbahMinutes = timeToMinutes(jumuah.khutbah);

      // If current time is before khutbah, show khutbah
      if (khutbahMinutes > currentMinutes) {
        prayers.push({
          name: 'Jumuah',
          timeToCheck: jumuah.khutbah,
          iqama: jumuah.khutbah,
          isKhutbah: true
        });
      }
    }
  } else if (isOffered('dhuhr')) {
    // Not Friday, use regular Dhuhr
    prayers.push({
      name: 'Dhuhr',
      timeToCheck: calculatedTimes.dhuhr.iqama,
      iqama: calculatedTimes.dhuhr.iqama,
      adhan: calculatedTimes.dhuhr.adhan
    });
  }

  if (isOffered('asr')) {
    prayers.push({ name: 'Asr', timeToCheck: calculatedTimes.asr.iqama, iqama: calculatedTimes.asr.iqama, adhan: calculatedTimes.asr.adhan });
  }
  if (isOffered('maghrib')) {
    prayers.push({ name: 'Maghrib', timeToCheck: calculatedTimes.maghrib.iqama, iqama: calculatedTimes.maghrib.iqama, adhan: calculatedTimes.maghrib.adhan });
  }
  if (isOffered('isha')) {
    prayers.push({ name: 'Isha', timeToCheck: calculatedTimes.isha.iqama, iqama: calculatedTimes.isha.iqama, adhan: calculatedTimes.isha.adhan });
  }

  // If no prayers are offered (shouldn't happen), fallback to Fajr
  if (prayers.length === 0) {
    return { name: 'Fajr', iqamaTime: calculatedTimes.fajr.iqama, adhanTime: calculatedTimes.fajr.adhan };
  }

  // Find the next salah
  for (const prayer of prayers) {
    const prayerMinutes = timeToMinutes(prayer.timeToCheck);
    if (prayerMinutes > currentMinutes) {
      return {
        name: prayer.name,
        iqamaTime: prayer.iqama,
        adhanTime: prayer.adhan,
        isKhutbah: prayer.isKhutbah
      };
    }
  }

  // If no salah found, next salah is first prayer tomorrow
  return {
    name: prayers[0].name,
    iqamaTime: prayers[0].iqama,
    adhanTime: prayers[0].adhan
  };
}