import { Mosque } from '../App';
import { calculateIqamaTimes } from './iqamaCalculator';
import { timeToMinutes } from './prayerTimes';
import { parseLocalDate } from './dateUtils';

export interface AdminSuggestion {
  id: string;
  type: 'iqama-before-adhan' | 'staleness' | 'nearby-updated' | 'adhan-drift' | 'seasonal' | 'outlier' | 'tight-gap' | 'predictive-collision' | 'gap-erosion' | 'recommend-offset' | 'frequent-adjustments' | 'dst-impact' | 'congregation-size' | 'cross-masjid-trend' | 'scheduled-change-gap' | 'iqama-consensus' | 'historical-pattern' | 'adhan-acceleration';
  severity: 'urgent' | 'warning' | 'info';
  mosqueId: string;
  mosqueName: string;
  title: string;
  description: string;
  prayer?: string;
  actionLabel?: string;
  suggestedTime?: string; // Concrete recommended iqama time (e.g., "6:30 AM")
  /** When consolidated, holds the original IDs so dismissing one dismisses all */
  mergedIds?: string[];
}

const PRAYER_NAMES: Record<string, string> = {
  fajr: 'Fajr',
  dhuhr: 'Dhuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
};

/**
 * Check if any iqama time is set BEFORE the adhan time (impossible/misconfigured)
 */
function checkIqamaBeforeAdhan(mosque: Mosque): AdminSuggestion[] {
  const suggestions: AdminSuggestion[] = [];
  const now = new Date();
  const calculated = calculateIqamaTimes(
    mosque.latitude,
    mosque.longitude,
    mosque.iqamaTimes,
    now,
    mosque.calculationMethod || 'NorthAmerica',
    mosque.asrMethod || 'Standard',
    mosque.scheduledTimeChanges
  );

  const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
  for (const prayer of prayers) {
    const adhanMin = timeToMinutes(calculated[prayer].adhan);
    const iqamaMin = timeToMinutes(calculated[prayer].iqama);
    if (iqamaMin < adhanMin && !(prayer === 'fajr' && adhanMin > 1200)) {
      const safeSuggestion = suggestSafeTime(mosque, prayer);
      suggestions.push({
        id: `iqama-before-adhan-${mosque.id}-${prayer}`,
        type: 'iqama-before-adhan',
        severity: 'urgent',
        mosqueId: mosque.id,
        mosqueName: mosque.name,
        title: `${PRAYER_NAMES[prayer]} iqama is before adhan`,
        description: `${PRAYER_NAMES[prayer]} iqama is set to ${calculated[prayer].iqama} but adhan is at ${calculated[prayer].adhan}. Change the iqama to ${safeSuggestion} or later.`,
        prayer,
        actionLabel: 'Fix Now',
        suggestedTime: safeSuggestion,
      });
    }
  }

  return suggestions;
}

/**
 * Check if mosque data is stale (not updated recently)
 */
function checkStaleness(mosque: Mosque): AdminSuggestion[] {
  const suggestions: AdminSuggestion[] = [];

  // Check both server updatedAt and localStorage
  const localTimestamp = typeof window !== 'undefined' ? localStorage.getItem(`mosque-updated:${mosque.id}`) : null;
  const updatedAtStr = mosque.updatedAt || localTimestamp;

  if (!updatedAtStr) {
    suggestions.push({
      id: `staleness-never-${mosque.id}`,
      type: 'staleness',
      severity: 'warning',
      mosqueId: mosque.id,
      mosqueName: mosque.name,
      title: 'No update history recorded',
      description: `${mosque.name} has never been marked as updated. Review the iqama times to make sure they're current.`,
      actionLabel: 'Review Times',
    });
    return suggestions;
  }

  const updatedDate = new Date(updatedAtStr);
  const now = new Date();
  const diffDays = (now.getTime() - updatedDate.getTime()) / (1000 * 60 * 60 * 24);

  if (diffDays > 60) {
    suggestions.push({
      id: `staleness-60d-${mosque.id}`,
      type: 'staleness',
      severity: 'urgent',
      mosqueId: mosque.id,
      mosqueName: mosque.name,
      title: 'Times may be outdated',
      description: `Last updated ${Math.floor(diffDays)} days ago. Iqama times may have changed — please verify with the masjid.`,
      actionLabel: 'Review Times',
    });
  } else if (diffDays > 30) {
    suggestions.push({
      id: `staleness-30d-${mosque.id}`,
      type: 'staleness',
      severity: 'warning',
      mosqueId: mosque.id,
      mosqueName: mosque.name,
      title: 'Due for a review',
      description: `Last updated ${Math.floor(diffDays)} days ago. Consider verifying the iqama times are still accurate.`,
      actionLabel: 'Review Times',
    });
  }

  return suggestions;
}

/**
 * If other mosques updated recently, suggest this one might need attention too
 */
function checkNearbyUpdates(mosque: Mosque, allMosques: Mosque[]): AdminSuggestion[] {
  const suggestions: AdminSuggestion[] = [];

  const recentlyUpdatedOthers = allMosques.filter(m => {
    if (m.id === mosque.id) return false;
    const localTs = typeof window !== 'undefined' ? localStorage.getItem(`mosque-updated:${m.id}`) : null;
    const ts = m.updatedAt || localTs;
    if (!ts) return false;
    const diffHours = (Date.now() - new Date(ts).getTime()) / (1000 * 60 * 60);
    return diffHours < 48;
  });

  // Only suggest if this mosque hasn't been updated recently
  const localTs = typeof window !== 'undefined' ? localStorage.getItem(`mosque-updated:${mosque.id}`) : null;
  const myTs = mosque.updatedAt || localTs;
  const myDiffHours = myTs ? (Date.now() - new Date(myTs).getTime()) / (1000 * 60 * 60) : Infinity;

  if (recentlyUpdatedOthers.length > 0 && myDiffHours > 48) {
    const names = recentlyUpdatedOthers.slice(0, 2).map(m => m.name);
    const extra = recentlyUpdatedOthers.length > 2 ? ` and ${recentlyUpdatedOthers.length - 2} more` : '';
    suggestions.push({
      id: `nearby-updated-${mosque.id}`,
      type: 'nearby-updated',
      severity: 'info',
      mosqueId: mosque.id,
      mosqueName: mosque.name,
      title: 'Other masajid recently updated',
      description: `${names.join(', ')}${extra} updated their times recently. You may want to check if ${mosque.name}'s times need adjusting too.`,
      actionLabel: 'Review Times',
    });
  }

  return suggestions;
}

/**
 * Detect significant adhan time drift — when calculated adhan times have shifted
 * significantly, suggesting fixed iqama times may no longer be appropriate
 */
function checkAdhanDrift(mosque: Mosque): AdminSuggestion[] {
  const suggestions: AdminSuggestion[] = [];
  const now = new Date();

  // Compare today's adhan with 2 weeks ago
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const todayCalc = calculateIqamaTimes(
    mosque.latitude, mosque.longitude, mosque.iqamaTimes, now,
    mosque.calculationMethod || 'NorthAmerica', mosque.asrMethod || 'Standard'
  );
  const pastCalc = calculateIqamaTimes(
    mosque.latitude, mosque.longitude, mosque.iqamaTimes, twoWeeksAgo,
    mosque.calculationMethod || 'NorthAmerica', mosque.asrMethod || 'Standard'
  );

  const prayers = ['fajr', 'isha'] as const; // Fajr and Isha shift the most
  for (const prayer of prayers) {
    const todayAdhan = timeToMinutes(todayCalc[prayer].adhan);
    const pastAdhan = timeToMinutes(pastCalc[prayer].adhan);
    const driftMinutes = Math.abs(todayAdhan - pastAdhan);

    // Only flag if using fixed iqama times and drift is significant
    const iqamaConfig = mosque.iqamaTimes[prayer];
    const isFixed = typeof iqamaConfig === 'string' || (typeof iqamaConfig === 'object' && iqamaConfig.type === 'fixed');

    if (driftMinutes >= 20 && isFixed) {
      const direction = todayAdhan > pastAdhan ? 'later' : 'earlier';
      const safeSuggestion = suggestSafeTime(mosque, prayer);
      suggestions.push({
        id: `adhan-drift-${mosque.id}-${prayer}`,
        type: 'adhan-drift',
        severity: 'warning',
        mosqueId: mosque.id,
        mosqueName: mosque.name,
        title: `${PRAYER_NAMES[prayer]} adhan shifted ${driftMinutes}min ${direction}`,
        description: `${PRAYER_NAMES[prayer]} adhan has moved ${driftMinutes} minutes ${direction} in the past 2 weeks (now ${todayCalc[prayer].adhan}). Move the iqama to ${safeSuggestion} to maintain a comfortable gap for the community.`,
        prayer,
        actionLabel: 'Adjust Time',
        suggestedTime: safeSuggestion,
      });
    }
  }

  return suggestions;
}

/**
 * Seasonal reminders - DST transitions, Ramadan, solstices
 */
function checkSeasonalReminders(mosque: Mosque): AdminSuggestion[] {
  const suggestions: AdminSuggestion[] = [];
  const now = new Date();
  const month = now.getMonth(); // 0-indexed
  const day = now.getDate();

  // DST spring forward (US: 2nd Sunday of March)
  if (month === 2 && day >= 5 && day <= 18) {
    suggestions.push({
      id: `seasonal-dst-spring-${mosque.id}`,
      type: 'seasonal',
      severity: 'info',
      mosqueId: mosque.id,
      mosqueName: mosque.name,
      title: 'Daylight Saving Time - Spring Forward',
      description: 'Clocks spring forward in March. Review all iqama times, especially Dhuhr, Asr, and Isha, which often change for the new season.',
      actionLabel: 'Review Times',
    });
  }

  // DST fall back (US: 1st Sunday of November)
  if (month === 10 && day >= 1 && day <= 10) {
    suggestions.push({
      id: `seasonal-dst-fall-${mosque.id}`,
      type: 'seasonal',
      severity: 'info',
      mosqueId: mosque.id,
      mosqueName: mosque.name,
      title: 'Daylight Saving Time - Fall Back',
      description: 'Clocks fall back in November. Review all iqama times, especially Maghrib and Isha, as sunset shifts significantly.',
      actionLabel: 'Review Times',
    });
  }

  // Summer solstice period (June) - rapid Fajr/Isha changes
  if (month === 5) {
    suggestions.push({
      id: `seasonal-summer-${mosque.id}`,
      type: 'seasonal',
      severity: 'info',
      mosqueId: mosque.id,
      mosqueName: mosque.name,
      title: 'Summer schedule check',
      description: 'Fajr is at its earliest and Isha at its latest during summer. Make sure iqama times still work for your community.',
      actionLabel: 'Review Times',
    });
  }

  // Winter solstice period (December) - early Maghrib/Isha
  if (month === 11) {
    suggestions.push({
      id: `seasonal-winter-${mosque.id}`,
      type: 'seasonal',
      severity: 'info',
      mosqueId: mosque.id,
      mosqueName: mosque.name,
      title: 'Winter schedule check',
      description: 'Maghrib is at its earliest during winter. Double-check Maghrib and Isha times are suitable for your community.',
      actionLabel: 'Review Times',
    });
  }

  return suggestions;
}

/**
 * Detect if a mosque's iqama time is a significant outlier compared to others.
 *
 * Normalizes for different calculation methods by comparing GAPS (iqama - adhan)
 * rather than raw iqama times. This way, if two masajid use different methods
 * (e.g., ISNA vs MWL) producing different adhan times, a similar gap is recognized
 * as alignment rather than a false outlier.
 */
function checkOutliers(mosque: Mosque, allMosques: Mosque[]): AdminSuggestion[] {
  const suggestions: AdminSuggestion[] = [];
  if (allMosques.length < 3) return suggestions;

  const now = new Date();
  const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

  // Calculate times for all mosques, tracking both iqama and gap
  const allData = allMosques.map(m => {
    const times = calculateIqamaTimes(
      m.latitude, m.longitude, m.iqamaTimes, now,
      m.calculationMethod || 'NorthAmerica', m.asrMethod || 'Standard',
      m.scheduledTimeChanges
    );
    return { id: m.id, name: m.name, method: m.calculationMethod || 'NorthAmerica', times };
  });

  const myData = allData.find(d => d.id === mosque.id);
  if (!myData) return suggestions;

  // Check if multiple calculation methods are in use
  const methods = new Set(allData.map(d => d.method));
  const mixedMethods = methods.size > 1;

  for (const prayer of prayers) {
    const myIqama = timeToMinutes(myData.times[prayer].iqama);
    const myAdhan = timeToMinutes(myData.times[prayer].adhan);
    const myGap = myIqama - myAdhan;

    // Compare gaps (normalized) rather than raw iqamas
    const otherGaps = allData
      .filter(d => d.id !== mosque.id)
      .map(d => {
        const iq = timeToMinutes(d.times[prayer].iqama);
        const ad = timeToMinutes(d.times[prayer].adhan);
        return iq - ad;
      });

    if (otherGaps.length < 2) continue;

    const sortedGaps = [...otherGaps].sort((a, b) => a - b);
    const medianGap = sortedGaps[Math.floor(sortedGaps.length / 2)];
    const gapDiff = Math.abs(myGap - medianGap);

    // Also check raw iqama difference for reference
    const otherIqamas = allData.filter(d => d.id !== mosque.id).map(d => timeToMinutes(d.times[prayer].iqama));
    const sortedIqamas = [...otherIqamas].sort((a, b) => a - b);
    const medianIqama = sortedIqamas[Math.floor(sortedIqamas.length / 2)];
    const rawDiff = Math.abs(myIqama - medianIqama);

    // Flag if gap difference ≥30 (normalized) OR raw difference ≥45 (visual)
    if (gapDiff >= 30 || rawDiff >= 45) {
      const direction = myGap > medianGap ? 'longer' : 'shorter';
      const safeSuggestion = suggestSafeTime(mosque, prayer);

      // If methods differ and raw times differ but gaps are similar, explain it
      const methodNote = mixedMethods && gapDiff < 15 && rawDiff >= 30
        ? ` Note: this difference is partly because ${mosque.name} uses ${myData.method} while others use different calculation methods for adhan.`
        : '';

      suggestions.push({
        id: `outlier-${mosque.id}-${prayer}`,
        type: 'outlier',
        severity: 'info',
        mosqueId: mosque.id,
        mosqueName: mosque.name,
        title: `${PRAYER_NAMES[prayer]} gap is ${gapDiff}min ${direction} than average`,
        description: `${mosque.name}'s ${PRAYER_NAMES[prayer]} has a ${myGap}min gap (iqama ${myData.times[prayer].iqama}, adhan ${myData.times[prayer].adhan}) vs the community median of ${medianGap}min. ${safeSuggestion} would bring it closer to the average.${methodNote}`,
        prayer,
        actionLabel: 'Compare',
        suggestedTime: safeSuggestion,
      });
    }
  }

  return suggestions;
}

// Minimum acceptable gap (in minutes) between adhan and iqama by prayer
// Maghrib is traditionally shorter since the sunnah is to pray soon after sunset
const TIGHT_GAP_THRESHOLDS: Record<string, { urgent: number; warning: number }> = {
  fajr:    { urgent: 2, warning: 5 },
  dhuhr:   { urgent: 2, warning: 5 },
  asr:     { urgent: 2, warning: 5 },
  maghrib: { urgent: 1, warning: 3 },
  isha:    { urgent: 2, warning: 5 },
};

/**
 * Quick safe-time suggestion for single-mosque checks that don't have access
 * to allMosques for the full consensus algorithm. Simply: adhan + preferred gap,
 * rounded to nearest 5 minutes, ensuring it clears the warning threshold.
 */
function suggestSafeTime(mosque: Mosque, prayer: string, targetDate?: Date): string {
  const date = targetDate || new Date();
  const calc = calculateIqamaTimes(
    mosque.latitude, mosque.longitude, mosque.iqamaTimes, date,
    mosque.calculationMethod || 'NorthAmerica', mosque.asrMethod || 'Standard'
  );
  const adhanMin = timeToMinutes(calc[prayer].adhan);
  const preferredGap = inferPreferredGap(mosque.id, prayer, mosque);
  const thresholds = TIGHT_GAP_THRESHOLDS[prayer];
  const safeGap = Math.max(preferredGap, thresholds.warning + 2);
  const raw = adhanMin + safeGap;
  const rounded = roundToNearestMinutes(raw, 5);
  return formatMinutesToTime(rounded);
}

/**
 * Detect iqama times that are dangerously close to adhan times.
 * A tight gap means the community barely has time to arrive, line up, and prepare.
 * Maghrib uses a shorter threshold since it's sunnah to pray soon after sunset.
 */
function checkTightGap(mosque: Mosque): AdminSuggestion[] {
  const suggestions: AdminSuggestion[] = [];
  const now = new Date();
  const calculated = calculateIqamaTimes(
    mosque.latitude, mosque.longitude, mosque.iqamaTimes, now,
    mosque.calculationMethod || 'NorthAmerica', mosque.asrMethod || 'Standard',
    mosque.scheduledTimeChanges
  );

  const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
  for (const prayer of prayers) {
    const adhanMin = timeToMinutes(calculated[prayer].adhan);
    const iqamaMin = timeToMinutes(calculated[prayer].iqama);
    const gap = iqamaMin - adhanMin;

    // Skip if already negative — that's checkIqamaBeforeAdhan's job
    if (gap < 0) continue;

    const thresholds = TIGHT_GAP_THRESHOLDS[prayer];

    if (gap < thresholds.urgent) {
      const safeSuggestion = suggestSafeTime(mosque, prayer);
      suggestions.push({
        id: `tight-gap-urgent-${mosque.id}-${prayer}`,
        type: 'tight-gap',
        severity: 'urgent',
        mosqueId: mosque.id,
        mosqueName: mosque.name,
        title: `${PRAYER_NAMES[prayer]} iqama is only ${gap}min after adhan`,
        description: `${PRAYER_NAMES[prayer]} iqama (${calculated[prayer].iqama}) is only ${gap} minute${gap !== 1 ? 's' : ''} after adhan (${calculated[prayer].adhan}). Move the iqama to ${safeSuggestion} to give the community enough time to arrive and line up.`,
        prayer,
        actionLabel: 'Adjust Time',
        suggestedTime: safeSuggestion,
      });
    } else if (gap < thresholds.warning) {
      const safeSuggestion = suggestSafeTime(mosque, prayer);
      suggestions.push({
        id: `tight-gap-warning-${mosque.id}-${prayer}`,
        type: 'tight-gap',
        severity: 'warning',
        mosqueId: mosque.id,
        mosqueName: mosque.name,
        title: `${PRAYER_NAMES[prayer]} gap is getting tight (${gap}min)`,
        description: `Only ${gap} minutes between ${PRAYER_NAMES[prayer]} adhan (${calculated[prayer].adhan}) and iqama (${calculated[prayer].iqama}). Moving to ${safeSuggestion} would give the community at least ${thresholds.warning} minutes${prayer === 'maghrib' ? '' : ' for this salah'} to arrive and pray sunnah.`,
        prayer,
        actionLabel: 'Adjust Time',
        suggestedTime: safeSuggestion,
      });
    }
  }

  return suggestions;
}

/**
 * Predictive collision detection — the crown jewel of the suggestions engine.
 * Projects adhan times 7 and 14 days into the future and warns admins BEFORE
 * a fixed iqama time becomes too close to or crosses the adhan.
 *
 * Only applies to fixed iqama times (offset-based times inherently track the adhan).
 * Skips prayers that already have a problem today (other checks cover those).
 *
 * This is what makes Dāimūn the smartest iqama system — we tell you about
 * problems that haven't happened yet.
 */
function checkPredictiveCollision(mosque: Mosque): AdminSuggestion[] {
  const suggestions: AdminSuggestion[] = [];
  const now = new Date();
  const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
  const lookAheadDays = [7, 14];

  // Calculate today's times for baseline
  const todayCalc = calculateIqamaTimes(
    mosque.latitude, mosque.longitude, mosque.iqamaTimes, now,
    mosque.calculationMethod || 'NorthAmerica', mosque.asrMethod || 'Standard',
    mosque.scheduledTimeChanges
  );

  for (const prayer of prayers) {
    // Only check fixed iqama times — offset times track the adhan automatically
    const iqamaConfig = mosque.iqamaTimes[prayer];
    const isFixed = typeof iqamaConfig === 'string' || (typeof iqamaConfig === 'object' && iqamaConfig.type === 'fixed');
    if (!isFixed) continue;

    const todayAdhan = timeToMinutes(todayCalc[prayer].adhan);
    const todayIqama = timeToMinutes(todayCalc[prayer].iqama);
    const todayGap = todayIqama - todayAdhan;
    const thresholds = TIGHT_GAP_THRESHOLDS[prayer];

    // Skip if today already has a problem — checkIqamaBeforeAdhan or checkTightGap handles it
    if (todayGap < thresholds.warning) continue;

    // Project forward and find the worst future scenario
    let worstGap = todayGap;
    let worstDay = 0;
    let worstAdhanTime = todayCalc[prayer].adhan;

    for (const daysAhead of lookAheadDays) {
      const futureDate = new Date(now);
      futureDate.setDate(futureDate.getDate() + daysAhead);

      const futureCalc = calculateIqamaTimes(
        mosque.latitude, mosque.longitude, mosque.iqamaTimes, futureDate,
        mosque.calculationMethod || 'NorthAmerica', mosque.asrMethod || 'Standard',
        mosque.scheduledTimeChanges
      );

      const futureAdhan = timeToMinutes(futureCalc[prayer].adhan);
      const futureIqama = timeToMinutes(futureCalc[prayer].iqama);
      const futureGap = futureIqama - futureAdhan;

      if (futureGap < worstGap) {
        worstGap = futureGap;
        worstDay = daysAhead;
        worstAdhanTime = futureCalc[prayer].adhan;
      }
    }

    // Only suggest if future is worse than today AND crosses a threshold
    if (worstDay === 0) continue;

    if (worstGap < 0) {
      const futureDate = new Date(now);
      futureDate.setDate(futureDate.getDate() + worstDay);
      const safeSuggestion = suggestSafeTime(mosque, prayer, futureDate);
      suggestions.push({
        id: `predictive-collision-${mosque.id}-${prayer}`,
        type: 'predictive-collision',
        severity: 'urgent',
        mosqueId: mosque.id,
        mosqueName: mosque.name,
        title: `${PRAYER_NAMES[prayer]} iqama will be before adhan in ${worstDay} days`,
        description: `In ${worstDay} days, ${PRAYER_NAMES[prayer]} adhan will shift to ${worstAdhanTime}, putting it AFTER the current fixed iqama (${todayCalc[prayer].iqama}). Change the iqama to ${safeSuggestion} now to stay ahead of the shift.`,
        prayer,
        actionLabel: 'Fix Ahead',
        suggestedTime: safeSuggestion,
      });
    } else if (worstGap < thresholds.urgent) {
      const futureDate = new Date(now);
      futureDate.setDate(futureDate.getDate() + worstDay);
      const safeSuggestion = suggestSafeTime(mosque, prayer, futureDate);
      suggestions.push({
        id: `predictive-squeeze-urgent-${mosque.id}-${prayer}`,
        type: 'predictive-collision',
        severity: 'urgent',
        mosqueId: mosque.id,
        mosqueName: mosque.name,
        title: `${PRAYER_NAMES[prayer]} gap shrinks to ${worstGap}min in ${worstDay} days`,
        description: `${PRAYER_NAMES[prayer]} adhan is shifting toward ${worstAdhanTime} in the next ${worstDay} days. Move the iqama to ${safeSuggestion} now so the community has enough time to arrive.`,
        prayer,
        actionLabel: 'Adjust Now',
        suggestedTime: safeSuggestion,
      });
    } else if (worstGap < thresholds.warning) {
      const futureDate = new Date(now);
      futureDate.setDate(futureDate.getDate() + worstDay);
      const safeSuggestion = suggestSafeTime(mosque, prayer, futureDate);
      suggestions.push({
        id: `predictive-squeeze-warning-${mosque.id}-${prayer}`,
        type: 'predictive-collision',
        severity: 'warning',
        mosqueId: mosque.id,
        mosqueName: mosque.name,
        title: `${PRAYER_NAMES[prayer]} gap will tighten to ${worstGap}min in ~${worstDay} days`,
        description: `The adhan for ${PRAYER_NAMES[prayer]} is trending toward ${worstAdhanTime} over the next ${worstDay} days. Moving the iqama to ${safeSuggestion} now would keep the gap safe through this shift.`,
        prayer,
        actionLabel: 'Adjust Now',
        suggestedTime: safeSuggestion,
      });
    }
  }

  return suggestions;
}

/**
 * Gap erosion velocity — measures HOW FAST the gap between adhan and iqama
 * is shrinking over the coming week, expressed as min/week.
 *
 * This fills the intelligence gap between "everything's fine right now" and
 * "you'll hit a threshold in 14 days" (predictive collision). It tells admins
 * their margin is eroding even when no threshold is in immediate danger.
 *
 * Only fires for fixed iqama times where the gap is currently healthy but
 * actively shrinking at ≥2 min/week. Skips prayers already flagged by
 * tightGap or predictiveCollision checks.
 */
function checkGapErosion(mosque: Mosque): AdminSuggestion[] {
  const suggestions: AdminSuggestion[] = [];
  const now = new Date();
  const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

  const todayCalc = calculateIqamaTimes(
    mosque.latitude, mosque.longitude, mosque.iqamaTimes, now,
    mosque.calculationMethod || 'NorthAmerica', mosque.asrMethod || 'Standard',
    mosque.scheduledTimeChanges
  );

  const oneWeekAhead = new Date(now);
  oneWeekAhead.setDate(oneWeekAhead.getDate() + 7);
  const futureCalc = calculateIqamaTimes(
    mosque.latitude, mosque.longitude, mosque.iqamaTimes, oneWeekAhead,
    mosque.calculationMethod || 'NorthAmerica', mosque.asrMethod || 'Standard',
    mosque.scheduledTimeChanges
  );

  for (const prayer of prayers) {
    const iqamaConfig = mosque.iqamaTimes[prayer];
    const isFixed = typeof iqamaConfig === 'string' || (typeof iqamaConfig === 'object' && iqamaConfig.type === 'fixed');
    if (!isFixed) continue;

    const todayGap = timeToMinutes(todayCalc[prayer].iqama) - timeToMinutes(todayCalc[prayer].adhan);
    const futureGap = timeToMinutes(futureCalc[prayer].iqama) - timeToMinutes(futureCalc[prayer].adhan);
    const thresholds = TIGHT_GAP_THRESHOLDS[prayer];

    // Skip if today already has a problem (other checks handle it)
    if (todayGap < thresholds.warning) continue;

    // Skip if future gap would trigger predictive collision (that check handles it)
    if (futureGap < thresholds.warning) continue;

    // Calculate erosion rate: positive = shrinking, negative = growing
    const erosionPerWeek = todayGap - futureGap;

    // Only flag if actively shrinking at ≥4 min/week
    if (erosionPerWeek >= 4) {
      const weeksUntilWarning = Math.ceil((todayGap - thresholds.warning) / erosionPerWeek);
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + weeksUntilWarning * 7);
      const safeSuggestion = suggestSafeTime(mosque, prayer, targetDate);
      suggestions.push({
        id: `gap-erosion-${mosque.id}-${prayer}`,
        type: 'gap-erosion',
        severity: 'info',
        mosqueId: mosque.id,
        mosqueName: mosque.name,
        title: `${PRAYER_NAMES[prayer]} gap shrinking ${erosionPerWeek}min/week`,
        description: `The gap between ${PRAYER_NAMES[prayer]} adhan and iqama is currently ${todayGap}min but losing ~${erosionPerWeek}min per week. Plan to move the iqama to ${safeSuggestion} within ~${weeksUntilWarning} week${weeksUntilWarning !== 1 ? 's' : ''} to stay ahead of the shift.`,
        prayer,
        actionLabel: 'Plan Adjustment',
        suggestedTime: safeSuggestion,
      });
    }
  }

  return suggestions;
}

/**
 * Recommend switching from fixed to offset iqama mode for prayers with
 * high seasonal adhan variance.
 *
 * Samples adhan times across 4 points in the year (Jan 15, Apr 15, Jul 15, Oct 15)
 * to measure the total annual swing. Prayers with >60min of swing are inherently
 * volatile on a fixed schedule — offset mode (e.g., "15 min after adhan") eliminates
 * this entire class of problems permanently.
 *
 * Also cross-references with adjustment history: if the admin has adjusted this
 * prayer multiple times recently, the recommendation becomes a warning instead of info.
 */
function checkRecommendOffset(mosque: Mosque): AdminSuggestion[] {
  const suggestions: AdminSuggestion[] = [];
  const now = new Date();
  const year = now.getFullYear();
  const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

  // Sample 4 dates across the year for seasonal variance
  const sampleDates = [
    new Date(year, 0, 15),  // Jan 15
    new Date(year, 3, 15),  // Apr 15
    new Date(year, 6, 15),  // Jul 15
    new Date(year, 9, 15),  // Oct 15
  ];

  const sampledTimes = sampleDates.map(d =>
    calculateIqamaTimes(
      mosque.latitude, mosque.longitude, mosque.iqamaTimes, d,
      mosque.calculationMethod || 'NorthAmerica', mosque.asrMethod || 'Standard'
    )
  );

  for (const prayer of prayers) {
    const iqamaConfig = mosque.iqamaTimes[prayer];
    const isFixed = typeof iqamaConfig === 'string' || (typeof iqamaConfig === 'object' && iqamaConfig.type === 'fixed');
    if (!isFixed) continue;

    // Calculate annual adhan swing
    const adhanMinutes = sampledTimes.map(t => timeToMinutes(t[prayer].adhan));
    const minAdhan = Math.min(...adhanMinutes);
    const maxAdhan = Math.max(...adhanMinutes);
    const annualSwing = maxAdhan - minAdhan;

    if (annualSwing < 45) continue; // Not volatile enough to recommend offset

    // Check adjustment history for this prayer
    const history = getAdjustmentHistory(mosque.id, prayer);
    const recentAdjustments = history.filter(h => {
      const diffDays = (Date.now() - h.timestamp) / (1000 * 60 * 60 * 24);
      return diffDays <= 90;
    });
    const hasFrequentAdjustments = recentAdjustments.length >= 2;

    // Stronger recommendation if they keep adjusting it
    const severity = hasFrequentAdjustments ? 'warning' : 'info';
    const adjustmentNote = hasFrequentAdjustments
      ? ` You've adjusted this prayer ${recentAdjustments.length} times in the past 3 months — offset mode would handle these changes automatically.`
      : '';

    suggestions.push({
      id: `recommend-offset-${mosque.id}-${prayer}`,
      type: 'recommend-offset',
      severity,
      mosqueId: mosque.id,
      mosqueName: mosque.name,
      title: `Consider offset mode for ${PRAYER_NAMES[prayer]}`,
      description: `${PRAYER_NAMES[prayer]} adhan swings ${annualSwing} minutes across the year (${formatMinutesToTime(minAdhan)} to ${formatMinutesToTime(maxAdhan)}). Using a fixed iqama means you'll need to manually adjust every season. Offset mode (e.g., "15 min after adhan") keeps the gap consistent year-round.${adjustmentNote}`,
      prayer,
      actionLabel: 'Switch Mode',
    });
  }

  return suggestions;
}

// --- Adjustment History Tracking ---
// Persists per-prayer edit timestamps in localStorage so the engine can detect
// patterns in admin behavior (e.g., "you keep adjusting Fajr every 3 weeks").

interface AdjustmentRecord {
  prayer: string;
  timestamp: number;
  oldValue?: string;
  newValue?: string;
}

const ADJUSTMENT_HISTORY_KEY = (mosqueId: string) => `prayer-adjustments:${mosqueId}`;
const ADJUSTMENT_HISTORY_MAX_AGE_DAYS = 180; // Keep 6 months of history

function getAdjustmentHistoryAll(mosqueId: string): AdjustmentRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ADJUSTMENT_HISTORY_KEY(mosqueId));
    if (!raw) return [];
    const records: AdjustmentRecord[] = JSON.parse(raw);
    // Prune old records
    const cutoff = Date.now() - (ADJUSTMENT_HISTORY_MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
    return records.filter(r => r.timestamp > cutoff);
  } catch {
    return [];
  }
}

function getAdjustmentHistory(mosqueId: string, prayer: string): AdjustmentRecord[] {
  return getAdjustmentHistoryAll(mosqueId).filter(r => r.prayer === prayer);
}

/**
 * Record a prayer time adjustment. Call this from the edit flow when iqama
 * times are saved and a prayer's config actually changed.
 *
 * Exported so EditMosqueModal can call it on save.
 */
export function recordPrayerAdjustment(
  mosqueId: string,
  prayer: string,
  oldValue?: string,
  newValue?: string
): void {
  if (typeof window === 'undefined') return;
  const records = getAdjustmentHistoryAll(mosqueId);
  records.push({
    prayer,
    timestamp: Date.now(),
    oldValue,
    newValue,
  });
  try {
    localStorage.setItem(ADJUSTMENT_HISTORY_KEY(mosqueId), JSON.stringify(records));
  } catch {
    // localStorage full — silently fail
  }
}

/**
 * Detect admin behavior patterns — frequent adjustments to the same prayer
 * suggest the current configuration strategy isn't working.
 *
 * Thresholds:
 * - 3+ adjustments in 60 days → warning ("you keep changing this")
 * - 2 adjustments in 30 days → info ("heads up, this is becoming a pattern")
 *
 * Also calculates the average interval between adjustments to give the admin
 * a sense of cadence: "You're adjusting Fajr every ~18 days."
 */
function checkFrequentAdjustments(mosque: Mosque): AdminSuggestion[] {
  const suggestions: AdminSuggestion[] = [];
  const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

  for (const prayer of prayers) {
    // Only relevant for fixed times — offset doesn't need frequent changes
    const iqamaConfig = mosque.iqamaTimes[prayer];
    const isFixed = typeof iqamaConfig === 'string' || (typeof iqamaConfig === 'object' && iqamaConfig.type === 'fixed');
    if (!isFixed) continue;

    const history = getAdjustmentHistory(mosque.id, prayer);
    if (history.length < 2) continue;

    // Sort by timestamp descending
    const sorted = [...history].sort((a, b) => b.timestamp - a.timestamp);

    // Check 60-day window
    const sixtyDaysAgo = Date.now() - (60 * 24 * 60 * 60 * 1000);
    const recent60 = sorted.filter(r => r.timestamp > sixtyDaysAgo);

    // Check 30-day window
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const recent30 = sorted.filter(r => r.timestamp > thirtyDaysAgo);

    // Calculate average interval between adjustments
    let avgIntervalDays = 0;
    if (sorted.length >= 2) {
      const intervals: number[] = [];
      for (let i = 0; i < sorted.length - 1; i++) {
        intervals.push((sorted[i].timestamp - sorted[i + 1].timestamp) / (1000 * 60 * 60 * 24));
      }
      avgIntervalDays = Math.round(intervals.reduce((sum, v) => sum + v, 0) / intervals.length);
    }

    if (recent60.length >= 3) {
      suggestions.push({
        id: `frequent-adj-60d-${mosque.id}-${prayer}`,
        type: 'frequent-adjustments',
        severity: 'warning',
        mosqueId: mosque.id,
        mosqueName: mosque.name,
        title: `${PRAYER_NAMES[prayer]} adjusted ${recent60.length} times in 2 months`,
        description: `You're adjusting ${PRAYER_NAMES[prayer]} iqama roughly every ${avgIntervalDays} days. This pattern suggests the fixed time can't keep up with the shifting adhan. Switching to offset mode (e.g., "15 min after adhan") would eliminate the need for manual updates.`,
        prayer,
        actionLabel: 'Switch to Offset',
      });
    } else if (recent30.length >= 2) {
      suggestions.push({
        id: `frequent-adj-30d-${mosque.id}-${prayer}`,
        type: 'frequent-adjustments',
        severity: 'info',
        mosqueId: mosque.id,
        mosqueName: mosque.name,
        title: `${PRAYER_NAMES[prayer]} adjusted ${recent30.length} times this month`,
        description: `${PRAYER_NAMES[prayer]} iqama has needed ${recent30.length} changes in the past 30 days${avgIntervalDays > 0 ? ` (roughly every ${avgIntervalDays} days)` : ''}. If this keeps up, consider switching to offset mode so the iqama automatically follows the adhan.`,
        prayer,
        actionLabel: 'Review',
      });
    }
  }

  return suggestions;
}

/**
 * Helper to serialize an IqamaTime config to a comparable string.
 * Used by the edit flow to detect which prayers actually changed.
 */
export function serializeIqamaConfig(config: unknown): string {
  if (typeof config === 'string') return `fixed:${config}`;
  if (typeof config === 'object' && config !== null && 'type' in config) {
    const c = config as { type: string; time?: string; minutes?: number };
    if (c.type === 'fixed') return `fixed:${c.time || ''}`;
    if (c.type === 'offset') return `offset:${c.minutes || 0}`;
  }
  return JSON.stringify(config);
}

// --- DST Utilities ---

/**
 * Find the Nth occurrence of a weekday in a given month/year.
 * day: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
 * n: 1 = first, 2 = second, etc.
 */
function getNthWeekdayOfMonth(year: number, month: number, day: number, n: number): Date {
  const first = new Date(year, month, 1);
  const firstDayOfWeek = first.getDay();
  let dateNum = 1 + ((day - firstDayOfWeek + 7) % 7) + (n - 1) * 7;
  return new Date(year, month, dateNum);
}

/**
 * Get the next upcoming DST transition date (US rules).
 * Spring Forward: 2nd Sunday of March
 * Fall Back: 1st Sunday of November
 *
 * Returns null if no DST transition is within `withinDays`.
 */
function getNextDstTransition(now: Date, withinDays: number = 10): { date: Date; type: 'spring-forward' | 'fall-back'; daysUntil: number } | null {
  const year = now.getFullYear();
  const candidates: Array<{ date: Date; type: 'spring-forward' | 'fall-back' }> = [
    { date: getNthWeekdayOfMonth(year, 2, 0, 2), type: 'spring-forward' },     // 2nd Sunday of March
    { date: getNthWeekdayOfMonth(year, 10, 0, 1), type: 'fall-back' },          // 1st Sunday of November
    { date: getNthWeekdayOfMonth(year + 1, 2, 0, 2), type: 'spring-forward' },  // Next year's spring
  ];

  for (const candidate of candidates) {
    const daysUntil = Math.ceil((candidate.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil > 0 && daysUntil <= withinDays) {
      return { ...candidate, daysUntil };
    }
  }

  return null;
}

/**
 * DST Impact Analysis — simulates the exact effect of an upcoming DST transition
 * on every prayer's adhan-to-iqama gap.
 *
 * When clocks Spring Forward, afternoon adhan times (in local clock time) shift ~60min later.
 * A fixed iqama at 1:00 PM that had a 45min gap suddenly has a -15min collision.
 * When clocks Fall Back, morning adhan times shift ~60min later and afternoon times ~60min earlier.
 *
 * This check:
 * 1. Finds the next DST date within 21 days
 * 2. Simulates the day before DST and the day after DST
 * 3. For each prayer with a fixed iqama, compares pre-DST gap vs post-DST gap
 * 4. Flags specific collisions, tight gaps, and significant shifts with DST-specific language
 *
 * This is NOT redundant with predictive collision — that check doesn't identify DST as
 * the cause, doesn't extend to 21 days, and can't provide DST-specific action guidance.
 */
function checkDstImpact(mosque: Mosque): AdminSuggestion[] {
  const suggestions: AdminSuggestion[] = [];
  const now = new Date();

  const dst = getNextDstTransition(now);
  if (!dst) return suggestions; // No DST within 21 days

  const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
  const dstLabel = dst.type === 'spring-forward' ? 'Spring Forward' : 'Fall Back';
  const dstDateStr = dst.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // Simulate the day before DST and the day after DST
  const dayBefore = new Date(dst.date);
  dayBefore.setDate(dayBefore.getDate() - 1);
  const dayAfter = new Date(dst.date);
  dayAfter.setDate(dayAfter.getDate() + 1);

  const preDst = calculateIqamaTimes(
    mosque.latitude, mosque.longitude, mosque.iqamaTimes, dayBefore,
    mosque.calculationMethod || 'NorthAmerica', mosque.asrMethod || 'Standard',
    mosque.scheduledTimeChanges
  );
  const postDst = calculateIqamaTimes(
    mosque.latitude, mosque.longitude, mosque.iqamaTimes, dayAfter,
    mosque.calculationMethod || 'NorthAmerica', mosque.asrMethod || 'Standard',
    mosque.scheduledTimeChanges
  );

  for (const prayer of prayers) {
    const iqamaConfig = mosque.iqamaTimes[prayer];
    const isFixed = typeof iqamaConfig === 'string' || (typeof iqamaConfig === 'object' && iqamaConfig.type === 'fixed');
    if (!isFixed) continue;

    const preGap = timeToMinutes(preDst[prayer].iqama) - timeToMinutes(preDst[prayer].adhan);
    const postGap = timeToMinutes(postDst[prayer].iqama) - timeToMinutes(postDst[prayer].adhan);
    const gapChange = postGap - preGap;
    const thresholds = TIGHT_GAP_THRESHOLDS[prayer];

    // Skip if gap barely changes (< 5 min shift)
    if (Math.abs(gapChange) < 5) continue;

    if (postGap < 0) {
      const safeSuggestion = suggestSafeTime(mosque, prayer, dayAfter);
      suggestions.push({
        id: `dst-collision-${mosque.id}-${prayer}`,
        type: 'dst-impact',
        severity: 'urgent',
        mosqueId: mosque.id,
        mosqueName: mosque.name,
        title: `DST ${dstLabel}: ${PRAYER_NAMES[prayer]} iqama will be before adhan`,
        description: `After clocks ${dst.type === 'spring-forward' ? 'spring forward' : 'fall back'} on ${dstDateStr} (${dst.daysUntil} days), ${PRAYER_NAMES[prayer]} adhan moves to ${postDst[prayer].adhan} but the fixed iqama stays at ${postDst[prayer].iqama} — a ${Math.abs(postGap)}min collision. Change the iqama to ${safeSuggestion} before ${dstDateStr}.`,
        prayer,
        actionLabel: 'Fix Before DST',
        suggestedTime: safeSuggestion,
      });
    } else if (postGap < thresholds.urgent) {
      // CRITICAL tight gap after DST
      const safeSuggestionUrgent = suggestSafeTime(mosque, prayer, dayAfter);
      suggestions.push({
        id: `dst-tight-urgent-${mosque.id}-${prayer}`,
        type: 'dst-impact',
        severity: 'urgent',
        mosqueId: mosque.id,
        mosqueName: mosque.name,
        title: `DST ${dstLabel}: ${PRAYER_NAMES[prayer]} gap drops to ${postGap}min`,
        description: `After ${dstDateStr} (${dst.daysUntil} days), ${PRAYER_NAMES[prayer]} adhan shifts to ${postDst[prayer].adhan}, shrinking the gap from ${preGap}min to just ${postGap}min. Move the iqama to ${safeSuggestionUrgent} before then.`,
        prayer,
        actionLabel: 'Fix Before DST',
        suggestedTime: safeSuggestionUrgent,
      });
    } else if (postGap < thresholds.warning) {
      const safeSuggestionWarn = suggestSafeTime(mosque, prayer, dayAfter);
      suggestions.push({
        id: `dst-tight-warning-${mosque.id}-${prayer}`,
        type: 'dst-impact',
        severity: 'warning',
        mosqueId: mosque.id,
        mosqueName: mosque.name,
        title: `DST ${dstLabel}: ${PRAYER_NAMES[prayer]} gap tightens to ${postGap}min`,
        description: `${PRAYER_NAMES[prayer]} adhan will shift to ${postDst[prayer].adhan} after ${dstDateStr}. The gap shrinks from ${preGap}min to ${postGap}min. Moving the iqama to ${safeSuggestionWarn} would keep the gap comfortable.`,
        prayer,
        actionLabel: 'Plan DST Adjustment',
        suggestedTime: safeSuggestionWarn,
      });
    } else if (Math.abs(gapChange) >= 20) {
      // Large gap shift (even if still safe) — admin should be aware
      const direction = gapChange > 0 ? 'widens' : 'shrinks';
      suggestions.push({
        id: `dst-shift-${mosque.id}-${prayer}`,
        type: 'dst-impact',
        severity: 'info',
        mosqueId: mosque.id,
        mosqueName: mosque.name,
        title: `DST ${dstLabel}: ${PRAYER_NAMES[prayer]} gap ${direction} ${Math.abs(gapChange)}min`,
        description: `After ${dstDateStr}, ${PRAYER_NAMES[prayer]} adhan moves to ${postDst[prayer].adhan} (from ${preDst[prayer].adhan}). The gap to iqama ${direction} from ${preGap}min to ${postGap}min. The timing is still safe, but review if the new gap feels right for your community.`,
        prayer,
        actionLabel: 'Review',
      });
    }
  }

  return suggestions;
}

/**
 * Congregation size heuristics — larger masajid need longer gaps because
 * more people need more time to arrive, find parking, line up in rows,
 * and pray their sunnah.
 *
 * We infer congregation size from:
 * - Multiple Jumuah prayers (2+ = large, 3 = very large)
 * - Future: could add explicit size field
 *
 * For large congregations, the minimum gap thresholds are higher:
 * - Standard prayers: 15min warning (vs 10min)
 * - Maghrib: 8min warning (vs 5min)
 *
 * Only flags prayers that are above the normal threshold (so checkTightGap
 * doesn't fire) but below the large-congregation threshold.
 */
function checkCongregationSize(mosque: Mosque): AdminSuggestion[] {
  const suggestions: AdminSuggestion[] = [];

  // Infer congregation size from Jumuah configuration
  const jumuah = mosque.iqamaTimes.jumuah;
  const jumuahCount = Array.isArray(jumuah) ? jumuah.length : (jumuah ? 1 : 0);

  // Only apply to large congregations (2+ Jumuah prayers)
  if (jumuahCount < 2) return suggestions;

  const sizeLabel = jumuahCount >= 3 ? 'very large' : 'large';

  // Higher gap thresholds for large congregations
  const largeThresholds: Record<string, { min: number }> = {
    fajr:    { min: 15 },
    dhuhr:   { min: 15 },
    asr:     { min: 15 },
    maghrib: { min: 8 },
    isha:    { min: 15 },
  };

  const now = new Date();
  const calculated = calculateIqamaTimes(
    mosque.latitude, mosque.longitude, mosque.iqamaTimes, now,
    mosque.calculationMethod || 'NorthAmerica', mosque.asrMethod || 'Standard',
    mosque.scheduledTimeChanges
  );

  const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
  for (const prayer of prayers) {
    const adhanMin = timeToMinutes(calculated[prayer].adhan);
    const iqamaMin = timeToMinutes(calculated[prayer].iqama);
    const gap = iqamaMin - adhanMin;
    const normalThreshold = TIGHT_GAP_THRESHOLDS[prayer].warning;
    const largeMin = largeThresholds[prayer].min;

    // Only flag if gap is above normal threshold (so checkTightGap doesn't overlap)
    // but below the large-congregation recommendation
    if (gap >= normalThreshold && gap < largeMin) {
      const widerTime = formatMinutesToTime(roundToNearestMinutes(adhanMin + largeMin, 5));
      suggestions.push({
        id: `congregation-size-${mosque.id}-${prayer}`,
        type: 'congregation-size',
        severity: 'info',
        mosqueId: mosque.id,
        mosqueName: mosque.name,
        title: `${PRAYER_NAMES[prayer]} gap may be tight for ${sizeLabel} congregation`,
        description: `With ${jumuahCount} Jumuah prayers, ${mosque.name} serves a ${sizeLabel} congregation. The current ${gap}min gap may not give enough time for everyone to arrive, park, and line up. Moving the iqama to ${widerTime} would provide ${largeMin}+ minutes.`,
        prayer,
        actionLabel: 'Widen Gap',
        suggestedTime: widerTime,
      });
    }
  }

  return suggestions;
}

/**
 * Cross-masjid trend detection — when multiple other masajid have recently
 * adjusted the same prayer, it's a strong signal that this masjid should
 * check too (seasonal shift, DST, community feedback, etc.).
 *
 * Reads the adjustment history across ALL mosques and looks for prayers
 * where 2+ other masajid made changes in the past 7 days.
 */
function checkCrossMasjidTrend(mosque: Mosque, allMosques: Mosque[]): AdminSuggestion[] {
  const suggestions: AdminSuggestion[] = [];
  if (allMosques.length < 3) return suggestions;

  const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

  for (const prayer of prayers) {
    // Check how many OTHER mosques adjusted this prayer in the past 7 days
    const otherAdjusters: string[] = [];
    for (const m of allMosques) {
      if (m.id === mosque.id) continue;
      const history = getAdjustmentHistory(m.id, prayer);
      const recentAdj = history.some(h => h.timestamp > sevenDaysAgo);
      if (recentAdj) {
        otherAdjusters.push(m.name);
      }
    }

    if (otherAdjusters.length < 2) continue;

    // Check if THIS mosque also adjusted recently (if so, skip — they're already on it)
    const myHistory = getAdjustmentHistory(mosque.id, prayer);
    const myRecentAdj = myHistory.some(h => h.timestamp > sevenDaysAgo);
    if (myRecentAdj) continue;

    const names = otherAdjusters.slice(0, 3).join(', ');
    const extra = otherAdjusters.length > 3 ? ` and ${otherAdjusters.length - 3} more` : '';

    suggestions.push({
      id: `cross-trend-${mosque.id}-${prayer}`,
      type: 'cross-masjid-trend',
      severity: 'warning',
      mosqueId: mosque.id,
      mosqueName: mosque.name,
      title: `${otherAdjusters.length} other masajid just adjusted ${PRAYER_NAMES[prayer]}`,
      description: `${names}${extra} all changed their ${PRAYER_NAMES[prayer]} iqama time this week. This usually indicates a seasonal shift — check if ${mosque.name} needs the same adjustment.`,
      prayer,
      actionLabel: 'Check Now',
    });
  }

  return suggestions;
}

/**
 * Scheduled change gap validation — verifies that upcoming scheduledTimeChanges
 * won't create tight-gap or collision problems when they take effect.
 *
 * For each pending (not yet active) scheduled change:
 * 1. Simulates the adhan on the effective start date
 * 2. Calculates the gap between the scheduled new iqama time and the adhan
 * 3. Flags tight gaps or collisions with specific language about the scheduled change
 *
 * This catches mistakes BEFORE they go live — the admin schedules a change
 * for next Monday but doesn't realize the adhan on that date is different
 * from today's.
 */
function checkScheduledChangeGaps(mosque: Mosque): AdminSuggestion[] {
  const suggestions: AdminSuggestion[] = [];
  if (!mosque.scheduledTimeChanges || mosque.scheduledTimeChanges.length === 0) return suggestions;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  for (const change of mosque.scheduledTimeChanges) {
    // Only check pending (future) changes, not already-active ones
    // Use parseLocalDate to avoid UTC midnight shift (new Date("YYYY-MM-DD") is UTC)
    const startDate = parseLocalDate(change.startDate);
    startDate.setHours(0, 0, 0, 0);
    if (startDate <= now) continue;

    // Only check the 5 daily prayers (skip jumuah)
    const prayer = change.prayer;
    if (!PRAYER_NAMES[prayer]) continue;

    // Simulate adhan on the effective date
    const futureCalc = calculateIqamaTimes(
      mosque.latitude, mosque.longitude, mosque.iqamaTimes, startDate,
      mosque.calculationMethod || 'NorthAmerica', mosque.asrMethod || 'Standard'
      // Intentionally NOT passing scheduledTimeChanges here — we want base adhan
    );

    const adhanMin = timeToMinutes(futureCalc[prayer].adhan);
    const scheduledIqamaMin = timeToMinutes(change.newTime);
    const gap = scheduledIqamaMin - adhanMin;
    const thresholds = TIGHT_GAP_THRESHOLDS[prayer];
    const effectiveDateStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    if (gap < 0) {
      const correctedTime = suggestSafeTime(mosque, prayer, startDate);
      suggestions.push({
        id: `sched-gap-collision-${mosque.id}-${change.id}`,
        type: 'scheduled-change-gap',
        severity: 'urgent',
        mosqueId: mosque.id,
        mosqueName: mosque.name,
        title: `Scheduled ${PRAYER_NAMES[prayer]} change will collide with adhan`,
        description: `The scheduled change to ${change.newTime} on ${effectiveDateStr} will be ${Math.abs(gap)}min BEFORE the adhan (${futureCalc[prayer].adhan} on that date).${change.reason ? ` Reason: "${change.reason}".` : ''} Change the scheduled time to ${correctedTime} or later.`,
        prayer,
        actionLabel: 'Fix Schedule',
        suggestedTime: correctedTime,
      });
    } else if (gap < thresholds.urgent) {
      const correctedTime = suggestSafeTime(mosque, prayer, startDate);
      suggestions.push({
        id: `sched-gap-tight-urgent-${mosque.id}-${change.id}`,
        type: 'scheduled-change-gap',
        severity: 'urgent',
        mosqueId: mosque.id,
        mosqueName: mosque.name,
        title: `Scheduled ${PRAYER_NAMES[prayer]} change only ${gap}min after adhan`,
        description: `The scheduled iqama of ${change.newTime} on ${effectiveDateStr} leaves only ${gap}min after adhan (${futureCalc[prayer].adhan} on that date). Change the scheduled time to ${correctedTime} for a safer gap.`,
        prayer,
        actionLabel: 'Fix Schedule',
        suggestedTime: correctedTime,
      });
    } else if (gap < thresholds.warning) {
      const correctedTime = suggestSafeTime(mosque, prayer, startDate);
      suggestions.push({
        id: `sched-gap-tight-warning-${mosque.id}-${change.id}`,
        type: 'scheduled-change-gap',
        severity: 'warning',
        mosqueId: mosque.id,
        mosqueName: mosque.name,
        title: `Scheduled ${PRAYER_NAMES[prayer]} change may be tight (${gap}min gap)`,
        description: `The scheduled iqama of ${change.newTime} on ${effectiveDateStr} will have a ${gap}min gap to adhan (${futureCalc[prayer].adhan} on that date). Moving to ${correctedTime} would add more buffer.`,
        prayer,
        actionLabel: 'Adjust Schedule',
        suggestedTime: correctedTime,
      });
    }

    // Also check if DST falls between now and the effective date
    const dstInWindow = getNextDstTransition(now, Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    if (dstInWindow && dstInWindow.date < startDate) {
      // The scheduled change takes effect AFTER a DST transition
      // Re-simulate with post-DST awareness (the futureCalc above already accounts for it
      // since JS Date handles timezone, but flag it so the admin is aware)
      const postDstCalc = calculateIqamaTimes(
        mosque.latitude, mosque.longitude, mosque.iqamaTimes, startDate,
        mosque.calculationMethod || 'NorthAmerica', mosque.asrMethod || 'Standard'
      );
      const postDstAdhan = timeToMinutes(postDstCalc[prayer].adhan);
      const postDstGap = scheduledIqamaMin - postDstAdhan;
      const dstLabel = dstInWindow.type === 'spring-forward' ? 'Spring Forward' : 'Fall Back';

      // Only add DST note if the gap is materially different from what you'd expect
      // (this catches cases where the admin scheduled based on today's adhan, not post-DST)
      const todayAdhan = timeToMinutes(calculateIqamaTimes(
        mosque.latitude, mosque.longitude, mosque.iqamaTimes, now,
        mosque.calculationMethod || 'NorthAmerica', mosque.asrMethod || 'Standard'
      )[prayer].adhan);
      const todayGapIfScheduled = scheduledIqamaMin - todayAdhan;
      const dstShiftEffect = Math.abs(todayGapIfScheduled - postDstGap);

      if (dstShiftEffect >= 15 && postDstGap >= thresholds.warning) {
        // The scheduled time is safe post-DST, but may have been set based on pre-DST adhan
        suggestions.push({
          id: `sched-dst-note-${mosque.id}-${change.id}`,
          type: 'scheduled-change-gap',
          severity: 'info',
          mosqueId: mosque.id,
          mosqueName: mosque.name,
          title: `DST ${dstLabel} falls before scheduled ${PRAYER_NAMES[prayer]} change`,
          description: `Clocks ${dstInWindow.type === 'spring-forward' ? 'spring forward' : 'fall back'} before your scheduled change on ${effectiveDateStr}. ${PRAYER_NAMES[prayer]} adhan will be ${postDstCalc[prayer].adhan} on that date (not ${formatMinutesToTime(todayAdhan)} like today). The gap will be ${postDstGap}min — verify this is what you intended.`,
          prayer,
          actionLabel: 'Verify',
        });
      }
    }
  }

  return suggestions;
}

// --- NEXT FRONTIER: Advanced Intelligence Systems ---

/**
 * Round a minute value to the nearest N minutes.
 */
function roundToNearestMinutes(totalMinutes: number, nearest: number = 5): number {
  return Math.round(totalMinutes / nearest) * nearest;
}

/**
 * Infer the admin's preferred gap for a prayer by analyzing their adjustment history.
 * Looks at what gap existed right after each adjustment (the "chosen gap") and
 * returns the median. Falls back to sensible defaults if no history exists.
 */
function inferPreferredGap(mosqueId: string, prayer: string, mosque: Mosque): number {
  const defaults: Record<string, number> = {
    fajr: 20, dhuhr: 20, asr: 20, maghrib: 7, isha: 15,
  };

  const history = getAdjustmentHistory(mosqueId, prayer);
  if (history.length === 0) return defaults[prayer] || 15;

  const chosenGaps: number[] = [];
  for (const rec of history) {
    if (!rec.newValue) continue;
    const match = rec.newValue.match(/^fixed:(.+)$/);
    if (!match) continue;
    const newIqamaMin = timeToMinutes(match[1]);
    const adjDate = new Date(rec.timestamp);
    const calc = calculateIqamaTimes(
      mosque.latitude, mosque.longitude, mosque.iqamaTimes, adjDate,
      mosque.calculationMethod || 'NorthAmerica', mosque.asrMethod || 'Standard'
    );
    const adhanMin = timeToMinutes(calc[prayer].adhan);
    const gap = newIqamaMin - adhanMin;
    if (gap > 0 && gap < 120) chosenGaps.push(gap);
  }

  if (chosenGaps.length === 0) return defaults[prayer] || 15;
  const sorted = [...chosenGaps].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/**
 * Smart Iqama Time Suggestion — calculates the optimal iqama time considering:
 * 1. Admin's historical gap preference
 * 2. Projected adhan 14 days out (for longer validity)
 * 3. Community median (gentle 30% pull)
 * 4. Large congregation bonus
 */
function suggestOptimalIqamaTime(
  mosque: Mosque,
  prayer: string,
  allMosques: Mosque[]
): string | null {
  const iqamaConfig = mosque.iqamaTimes[prayer as keyof typeof mosque.iqamaTimes];
  const isFixed = typeof iqamaConfig === 'string' || (typeof iqamaConfig === 'object' && iqamaConfig !== null && 'type' in iqamaConfig && (iqamaConfig as { type: string }).type === 'fixed');
  if (!isFixed) return null;

  const now = new Date();
  const preferredGap = inferPreferredGap(mosque.id, prayer, mosque);

  const futureDate = new Date(now);
  futureDate.setDate(futureDate.getDate() + 14);
  const futureCalc = calculateIqamaTimes(
    mosque.latitude, mosque.longitude, mosque.iqamaTimes, futureDate,
    mosque.calculationMethod || 'NorthAmerica', mosque.asrMethod || 'Standard'
  );
  const futureAdhan = timeToMinutes(futureCalc[prayer].adhan);

  let suggestedMin = futureAdhan + preferredGap;

  // Pull toward community median (30% weight)
  if (allMosques.length >= 3) {
    const allIqamas = allMosques
      .filter(m => m.id !== mosque.id)
      .map(m => {
        const calc = calculateIqamaTimes(
          m.latitude, m.longitude, m.iqamaTimes, now,
          m.calculationMethod || 'NorthAmerica', m.asrMethod || 'Standard',
          m.scheduledTimeChanges
        );
        return timeToMinutes(calc[prayer].iqama);
      });
    if (allIqamas.length >= 2) {
      const sorted = [...allIqamas].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      suggestedMin = Math.round(suggestedMin * 0.7 + median * 0.3);
    }
  }

  // Large congregation bonus
  const jumuah = mosque.iqamaTimes.jumuah;
  const jumuahCount = Array.isArray(jumuah) ? jumuah.length : (jumuah ? 1 : 0);
  if (jumuahCount >= 2 && prayer !== 'maghrib') {
    suggestedMin = Math.max(suggestedMin, futureAdhan + 15);
  }

  // Ensure minimum gap
  const todayCalc = calculateIqamaTimes(
    mosque.latitude, mosque.longitude, mosque.iqamaTimes, now,
    mosque.calculationMethod || 'NorthAmerica', mosque.asrMethod || 'Standard'
  );
  const todayAdhan = timeToMinutes(todayCalc[prayer].adhan);
  const thresholds = TIGHT_GAP_THRESHOLDS[prayer];
  suggestedMin = Math.max(suggestedMin, todayAdhan + thresholds.warning);

  suggestedMin = roundToNearestMinutes(suggestedMin, 5);

  const currentIqama = timeToMinutes(todayCalc[prayer].iqama);
  if (Math.abs(suggestedMin - currentIqama) < 5) return null;

  return formatMinutesToTime(suggestedMin);
}

/**
 * Iqama Consensus Engine — suggests specific iqama times based on community convergence.
 * Normalizes by gap (iqama - adhan) to account for different calculation methods.
 * Operates in the 8-19min gap-deviation range (checkOutliers handles ≥20min).
 * Provides concrete suggested times using the smart suggestion algorithm.
 */
function checkIqamaConsensus(mosque: Mosque, allMosques: Mosque[]): AdminSuggestion[] {
  const suggestions: AdminSuggestion[] = [];
  if (allMosques.length < 3) return suggestions;

  const now = new Date();
  const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

  const allData = allMosques.map(m => ({
    id: m.id,
    method: m.calculationMethod || 'NorthAmerica',
    times: calculateIqamaTimes(
      m.latitude, m.longitude, m.iqamaTimes, now,
      m.calculationMethod || 'NorthAmerica', m.asrMethod || 'Standard',
      m.scheduledTimeChanges
    ),
  }));
  const myData = allData.find(d => d.id === mosque.id);
  if (!myData) return suggestions;

  const methods = new Set(allData.map(d => d.method));
  const mixedMethods = methods.size > 1;

  for (const prayer of prayers) {
    const iqamaConfig = mosque.iqamaTimes[prayer];
    const isFixed = typeof iqamaConfig === 'string' || (typeof iqamaConfig === 'object' && iqamaConfig.type === 'fixed');
    if (!isFixed) continue;

    const myAdhan = timeToMinutes(myData.times[prayer].adhan);
    const myIqama = timeToMinutes(myData.times[prayer].iqama);
    const myGap = myIqama - myAdhan;

    // Compare gaps (normalized for different calc methods)
    const otherGaps = allData
      .filter(d => d.id !== mosque.id)
      .map(d => timeToMinutes(d.times[prayer].iqama) - timeToMinutes(d.times[prayer].adhan));

    if (otherGaps.length < 2) continue;

    const sortedGaps = [...otherGaps].sort((a, b) => a - b);
    const medianGap = sortedGaps[Math.floor(sortedGaps.length / 2)];
    const gapDiff = Math.abs(myGap - medianGap);

    // 15-29min range (checkOutliers handles ≥30)
    if (gapDiff < 15 || gapDiff >= 30) continue;

    const direction = myGap > medianGap ? 'longer' : 'shorter';
    const suggested = suggestOptimalIqamaTime(mosque, prayer, allMosques);

    const methodNote = mixedMethods
      ? ' (Gaps are compared to account for different adhan calculation methods across masajid.)'
      : '';

    suggestions.push({
      id: `consensus-${mosque.id}-${prayer}`,
      type: 'iqama-consensus',
      severity: 'info',
      mosqueId: mosque.id,
      mosqueName: mosque.name,
      title: `${PRAYER_NAMES[prayer]} gap is ${gapDiff}min ${direction} than community average`,
      description: `${mosque.name}'s ${PRAYER_NAMES[prayer]} gap is ${myGap}min (adhan ${myData.times[prayer].adhan} → iqama ${myData.times[prayer].iqama}) vs the community median of ${medianGap}min. ${suggested ? `Moving to ${suggested} would align with community practice.` : 'Consider whether adjusting would benefit your community.'}${methodNote}`,
      prayer,
      actionLabel: 'Align',
      suggestedTime: suggested || undefined,
    });
  }

  return suggestions;
}

/** Get the day of year (1-366) for a Date */
function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Historical Pattern Learning — mines adjustment history for annual rhythms
 * and directional trends.
 *
 * Pattern 1: Calendar Anniversary — if you adjusted this prayer around the same
 * calendar date last year, proactively remind you.
 *
 * Pattern 2: Directional Trend — if the last 3+ adjustments all moved in the
 * same direction (earlier/later), predict you'll need another.
 */
function checkHistoricalPatterns(mosque: Mosque, allMosques: Mosque[]): AdminSuggestion[] {
  const suggestions: AdminSuggestion[] = [];
  const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
  const now = new Date();
  const todayDayOfYear = getDayOfYear(now);

  for (const prayer of prayers) {
    const iqamaConfig = mosque.iqamaTimes[prayer];
    const isFixed = typeof iqamaConfig === 'string' || (typeof iqamaConfig === 'object' && iqamaConfig.type === 'fixed');
    if (!isFixed) continue;

    const history = getAdjustmentHistory(mosque.id, prayer);
    if (history.length === 0) continue;

    // Skip if there's a recent adjustment (within 14 days) — they already acted
    const recentAdj = history.some(h => (Date.now() - h.timestamp) < (14 * 24 * 60 * 60 * 1000));

    // Pattern 1: Calendar Anniversary
    const oneYearAgoMs = Date.now() - (365 * 24 * 60 * 60 * 1000);
    const twoYearsAgoMs = Date.now() - (730 * 24 * 60 * 60 * 1000);
    const anniversaryAdj = history.filter(h => {
      if (h.timestamp < twoYearsAgoMs || h.timestamp > oneYearAgoMs - (14 * 24 * 60 * 60 * 1000)) return false;
      const adjDayOfYear = getDayOfYear(new Date(h.timestamp));
      const diff = Math.abs(adjDayOfYear - todayDayOfYear);
      return diff <= 14 || diff >= 351;
    });

    if (anniversaryAdj.length > 0 && !recentAdj) {
      const lastAnniversary = anniversaryAdj[anniversaryAdj.length - 1];
      const dateStr = new Date(lastAnniversary.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const suggested = suggestOptimalIqamaTime(mosque, prayer, allMosques);

      suggestions.push({
        id: `anniversary-${mosque.id}-${prayer}`,
        type: 'historical-pattern',
        severity: 'info',
        mosqueId: mosque.id,
        mosqueName: mosque.name,
        title: `${PRAYER_NAMES[prayer]} was adjusted around ${dateStr} last year`,
        description: `You changed ${PRAYER_NAMES[prayer]} iqama around this same time last year. The adhan follows the same seasonal pattern annually, so it's likely time to adjust again.${suggested ? ` Suggested: ${suggested}.` : ''}`,
        prayer,
        actionLabel: 'Check Now',
        suggestedTime: suggested || undefined,
      });
    }

    // Pattern 2: Directional Trend
    const sorted = [...history].sort((a, b) => a.timestamp - b.timestamp);
    if (sorted.length >= 3 && !recentAdj) {
      const directions: ('earlier' | 'later' | 'unknown')[] = [];
      for (const rec of sorted) {
        if (!rec.oldValue || !rec.newValue) { directions.push('unknown'); continue; }
        const oldMatch = rec.oldValue.match(/^fixed:(.+)$/);
        const newMatch = rec.newValue.match(/^fixed:(.+)$/);
        if (!oldMatch || !newMatch) { directions.push('unknown'); continue; }
        const oldMin = timeToMinutes(oldMatch[1]);
        const newMin = timeToMinutes(newMatch[1]);
        if (newMin < oldMin) directions.push('earlier');
        else if (newMin > oldMin) directions.push('later');
        else directions.push('unknown');
      }

      const recentDirs = directions.slice(-3);
      const allEarlier = recentDirs.every(d => d === 'earlier');
      const allLater = recentDirs.every(d => d === 'later');

      if (allEarlier || allLater) {
        const trendDir = allEarlier ? 'earlier' : 'later';
        const suggested = suggestOptimalIqamaTime(mosque, prayer, allMosques);

        suggestions.push({
          id: `trend-${mosque.id}-${prayer}`,
          type: 'historical-pattern',
          severity: 'info',
          mosqueId: mosque.id,
          mosqueName: mosque.name,
          title: `${PRAYER_NAMES[prayer]} has been trending ${trendDir}`,
          description: `The last ${recentDirs.length} adjustments to ${PRAYER_NAMES[prayer]} all moved the iqama ${trendDir}. The adhan is likely still shifting in that direction.${suggested ? ` Next suggested time: ${suggested}.` : ' Check if another adjustment is needed.'}`,
          prayer,
          actionLabel: 'Review Trend',
          suggestedTime: suggested || undefined,
        });
      }
    }
  }

  return suggestions;
}

/**
 * Adhan Acceleration Analysis — the physics engine of Dāimūn.
 *
 * Measures velocity (min/week) AND acceleration (is the shift speeding up or slowing down)
 * to determine the optimal adjustment window.
 *
 * Near equinoxes: fast + accelerating → "adjust now before it gets worse"
 * Decelerating: approaching solstice → "perfect window to lock in a time"
 * Near solstice: barely moving → "your time is stable for weeks"
 */
function checkAdhanAcceleration(mosque: Mosque): AdminSuggestion[] {
  const suggestions: AdminSuggestion[] = [];
  const now = new Date();
  const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

  const pastDate = new Date(now);
  pastDate.setDate(pastDate.getDate() - 7);
  const futureDate = new Date(now);
  futureDate.setDate(futureDate.getDate() + 7);

  const pastCalc = calculateIqamaTimes(
    mosque.latitude, mosque.longitude, mosque.iqamaTimes, pastDate,
    mosque.calculationMethod || 'NorthAmerica', mosque.asrMethod || 'Standard'
  );
  const todayCalc = calculateIqamaTimes(
    mosque.latitude, mosque.longitude, mosque.iqamaTimes, now,
    mosque.calculationMethod || 'NorthAmerica', mosque.asrMethod || 'Standard',
    mosque.scheduledTimeChanges
  );
  const futureCalc = calculateIqamaTimes(
    mosque.latitude, mosque.longitude, mosque.iqamaTimes, futureDate,
    mosque.calculationMethod || 'NorthAmerica', mosque.asrMethod || 'Standard'
  );

  for (const prayer of prayers) {
    const iqamaConfig = mosque.iqamaTimes[prayer];
    const isFixed = typeof iqamaConfig === 'string' || (typeof iqamaConfig === 'object' && iqamaConfig.type === 'fixed');
    if (!isFixed) continue;

    const pastAdhan = timeToMinutes(pastCalc[prayer].adhan);
    const todayAdhan = timeToMinutes(todayCalc[prayer].adhan);
    const futureAdhan = timeToMinutes(futureCalc[prayer].adhan);

    const velocityFirstHalf = todayAdhan - pastAdhan;
    const velocitySecondHalf = futureAdhan - todayAdhan;
    const overallVelocity = (futureAdhan - pastAdhan) / 2;
    const acceleration = velocitySecondHalf - velocityFirstHalf;
    const absVelocity = Math.abs(overallVelocity);

    if (absVelocity < 2) continue;

    const currentGap = timeToMinutes(todayCalc[prayer].iqama) - todayAdhan;
    const thresholds = TIGHT_GAP_THRESHOLDS[prayer];
    if (currentGap < thresholds.warning) continue;

    const shiftDir = overallVelocity > 0 ? 'later' : 'earlier';
    const absAccel = Math.abs(acceleration);

    if (absAccel >= 1 && Math.sign(acceleration) === Math.sign(overallVelocity)) {
      // ACCELERATING — urgency increasing
      if (absVelocity >= 3) {
        const safeSuggestion = suggestSafeTime(mosque, prayer, futureDate);
        suggestions.push({
          id: `accel-fast-${mosque.id}-${prayer}`,
          type: 'adhan-acceleration',
          severity: 'warning',
          mosqueId: mosque.id,
          mosqueName: mosque.name,
          title: `${PRAYER_NAMES[prayer]} adhan shifting ${Math.round(absVelocity)}min/week and accelerating`,
          description: `${PRAYER_NAMES[prayer]} adhan is moving ${shiftDir} at ${Math.round(absVelocity)}min/week and speeding up (equinox season). Move the iqama to ${safeSuggestion} now — waiting will require a bigger change later.`,
          prayer,
          actionLabel: 'Adjust Now',
          suggestedTime: safeSuggestion,
        });
      }
    } else if (absAccel >= 1 && Math.sign(acceleration) !== Math.sign(overallVelocity)) {
      // DECELERATING — optimal adjustment window
      if (absVelocity >= 2) {
        const safeSuggestion = suggestSafeTime(mosque, prayer, futureDate);
        suggestions.push({
          id: `accel-decel-${mosque.id}-${prayer}`,
          type: 'adhan-acceleration',
          severity: 'info',
          mosqueId: mosque.id,
          mosqueName: mosque.name,
          title: `${PRAYER_NAMES[prayer]} shift is slowing down — good time to adjust`,
          description: `${PRAYER_NAMES[prayer]} adhan has been moving ${shiftDir} at ${Math.round(absVelocity)}min/week but is now decelerating. Lock in ${safeSuggestion} now for maximum stability — it will stay accurate longer.`,
          prayer,
          actionLabel: 'Lock In',
          suggestedTime: safeSuggestion,
        });
      }
    }

    // Stability confirmation after recent adjustment
    if (absVelocity < 2 && absAccel < 0.5) {
      const recentAdj = getAdjustmentHistory(mosque.id, prayer).some(
        h => (Date.now() - h.timestamp) < (21 * 24 * 60 * 60 * 1000)
      );
      if (recentAdj) {
        suggestions.push({
          id: `accel-stable-${mosque.id}-${prayer}`,
          type: 'adhan-acceleration',
          severity: 'info',
          mosqueId: mosque.id,
          mosqueName: mosque.name,
          title: `${PRAYER_NAMES[prayer]} is in a stable period`,
          description: `${PRAYER_NAMES[prayer]} adhan is barely moving (${absVelocity < 0.5 ? '<0.5' : '~' + Math.round(absVelocity)}min/week). Your recent adjustment should hold steady for several weeks.`,
          prayer,
          actionLabel: 'All Good',
        });
      }
    }
  }

  return suggestions;
}

// --- Seasonal Stability Score ---

export interface MosqueStabilityScore {
  overall: number;
  gapSafety: number;
  configHealth: number;
  updateFreshness: number;
  offsetCoverage: number;
  label: 'Excellent' | 'Good' | 'Fair' | 'Needs Attention' | 'Critical';
  color: string;
}

/**
 * Calculate a comprehensive stability score (0-100) for a mosque.
 *
 * Components:
 * 1. Gap Safety (35%): Simulate next 30 days, measure gap violations.
 * 2. Config Health (25%): Based on suggestion count/severity.
 * 3. Update Freshness (20%): How recently was data updated?
 * 4. Offset Coverage (20%): % of volatile prayers using offset mode.
 */
export function getMosqueStabilityScore(mosque: Mosque, suggestions: AdminSuggestion[]): MosqueStabilityScore {
  const now = new Date();
  const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

  // 1. Gap Safety (sample every 3 days over 30 days)
  let gapViolationDays = 0;
  let totalSampleDays = 0;
  for (let daysAhead = 0; daysAhead <= 30; daysAhead += 3) {
    const sampleDate = new Date(now);
    sampleDate.setDate(sampleDate.getDate() + daysAhead);
    totalSampleDays++;
    const calc = calculateIqamaTimes(
      mosque.latitude, mosque.longitude, mosque.iqamaTimes, sampleDate,
      mosque.calculationMethod || 'NorthAmerica', mosque.asrMethod || 'Standard',
      mosque.scheduledTimeChanges
    );
    let dayHasViolation = false;
    for (const prayer of prayers) {
      const iqamaConfig = mosque.iqamaTimes[prayer];
      const isFixed = typeof iqamaConfig === 'string' || (typeof iqamaConfig === 'object' && iqamaConfig.type === 'fixed');
      if (!isFixed) continue;
      const gap = timeToMinutes(calc[prayer].iqama) - timeToMinutes(calc[prayer].adhan);
      if (gap < TIGHT_GAP_THRESHOLDS[prayer].warning) { dayHasViolation = true; break; }
    }
    if (dayHasViolation) gapViolationDays++;
  }
  const gapSafety = Math.max(0, Math.round((1 - gapViolationDays / totalSampleDays) * 100));

  // 2. Config Health
  const mosqueSuggestions = suggestions.filter(s => s.mosqueId === mosque.id);
  let healthPenalty = 0;
  for (const s of mosqueSuggestions) {
    if (s.severity === 'urgent') healthPenalty += 20;
    else if (s.severity === 'warning') healthPenalty += 10;
    else healthPenalty += 3;
  }
  const configHealth = Math.max(0, Math.min(100, 100 - healthPenalty));

  // 3. Update Freshness
  const localTs = typeof window !== 'undefined' ? localStorage.getItem(`mosque-updated:${mosque.id}`) : null;
  const updatedAtStr = mosque.updatedAt || localTs;
  let updateFreshness = 10;
  if (updatedAtStr) {
    const diffHours = (Date.now() - new Date(updatedAtStr).getTime()) / (1000 * 60 * 60);
    if (diffHours < 24) updateFreshness = 100;
    else if (diffHours < 168) updateFreshness = 80;
    else if (diffHours < 336) updateFreshness = 60;
    else if (diffHours < 720) updateFreshness = 40;
    else updateFreshness = 10;
  }

  // 4. Offset Coverage
  const year = now.getFullYear();
  const sampleDates = [new Date(year, 0, 15), new Date(year, 3, 15), new Date(year, 6, 15), new Date(year, 9, 15)];
  const sampledTimes = sampleDates.map(d =>
    calculateIqamaTimes(mosque.latitude, mosque.longitude, mosque.iqamaTimes, d,
      mosque.calculationMethod || 'NorthAmerica', mosque.asrMethod || 'Standard')
  );
  let volatilePrayers = 0;
  let offsetVolatilePrayers = 0;
  for (const prayer of prayers) {
    const adhanMinutes = sampledTimes.map(t => timeToMinutes(t[prayer].adhan));
    const swing = Math.max(...adhanMinutes) - Math.min(...adhanMinutes);
    if (swing >= 45) {
      volatilePrayers++;
      const iqamaConfig = mosque.iqamaTimes[prayer];
      const isOffset = typeof iqamaConfig === 'object' && iqamaConfig !== null && 'type' in iqamaConfig && (iqamaConfig as { type: string }).type === 'offset';
      if (isOffset) offsetVolatilePrayers++;
    }
  }
  const offsetCoverage = volatilePrayers === 0 ? 100 : Math.round((offsetVolatilePrayers / volatilePrayers) * 100);

  // Composite
  const overall = Math.round(
    gapSafety * 0.35 + configHealth * 0.25 + updateFreshness * 0.20 + offsetCoverage * 0.20
  );

  let label: MosqueStabilityScore['label'];
  let color: string;
  if (overall >= 90) { label = 'Excellent'; color = 'text-emerald-600 dark:text-emerald-400'; }
  else if (overall >= 75) { label = 'Good'; color = 'text-blue-600 dark:text-blue-400'; }
  else if (overall >= 55) { label = 'Fair'; color = 'text-amber-600 dark:text-amber-400'; }
  else if (overall >= 35) { label = 'Needs Attention'; color = 'text-orange-600 dark:text-orange-400'; }
  else { label = 'Critical'; color = 'text-red-600 dark:text-red-400'; }

  return { overall, gapSafety, configHealth, updateFreshness, offsetCoverage, label, color };
}

function formatMinutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
}

/**
 * Generate all suggestions for a set of mosques
 */
export function generateAdminSuggestions(mosques: Mosque[]): AdminSuggestion[] {
  const allSuggestions: AdminSuggestion[] = [];

  for (const mosque of mosques) {
    allSuggestions.push(...checkIqamaBeforeAdhan(mosque));
    allSuggestions.push(...checkStaleness(mosque));
    allSuggestions.push(...checkNearbyUpdates(mosque, mosques));
    allSuggestions.push(...checkAdhanDrift(mosque));
    allSuggestions.push(...checkSeasonalReminders(mosque));
    allSuggestions.push(...checkOutliers(mosque, mosques));
    allSuggestions.push(...checkTightGap(mosque));
    allSuggestions.push(...checkPredictiveCollision(mosque));
    allSuggestions.push(...checkGapErosion(mosque));
    allSuggestions.push(...checkRecommendOffset(mosque));
    allSuggestions.push(...checkFrequentAdjustments(mosque));
    allSuggestions.push(...checkDstImpact(mosque));
    allSuggestions.push(...checkCongregationSize(mosque));
    allSuggestions.push(...checkCrossMasjidTrend(mosque, mosques));
    allSuggestions.push(...checkScheduledChangeGaps(mosque));
    // Next Frontier
    allSuggestions.push(...checkIqamaConsensus(mosque, mosques));
    allSuggestions.push(...checkHistoricalPatterns(mosque, mosques));
    allSuggestions.push(...checkAdhanAcceleration(mosque));
  }

  // Filter out suggestions for prayers the mosque doesn't offer.
  // If a masjid doesn't hold Dhuhr, there's no reason to alert about Dhuhr gaps.
  const offeredMap = new Map<string, Set<string>>();
  for (const mosque of mosques) {
    const offered = mosque.offeredPrayers;
    if (offered && offered.length > 0) {
      offeredMap.set(mosque.id, new Set(offered));
    }
  }
  const filteredSuggestions = allSuggestions.filter(s => {
    if (!s.prayer) return true; // Non-prayer-specific suggestions (staleness, seasonal, etc.)
    const offered = offeredMap.get(s.mosqueId);
    if (!offered) return true; // No offeredPrayers defined → defaults to all five
    return offered.has(s.prayer);
  });

  // Consolidate: merge same-type + same-prayer + same-severity across masajid
  const consolidated = consolidateSuggestions(filteredSuggestions);

  // Sort by severity: urgent first, then warning, then info
  const severityOrder = { urgent: 0, warning: 1, info: 2 };
  consolidated.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  // Cap info/tips at 3 to keep dashboard focused
  const urgent = consolidated.filter(s => s.severity === 'urgent');
  const warning = consolidated.filter(s => s.severity === 'warning');
  const info = consolidated.filter(s => s.severity === 'info').slice(0, 3);

  return [...urgent, ...warning, ...info];
}

/**
 * Consolidate suggestions: when multiple masajid share the same issue
 * (same type + prayer + severity), merge them into a single concise entry.
 */
function consolidateSuggestions(suggestions: AdminSuggestion[]): AdminSuggestion[] {
  // Group by type + prayer + severity
  const groups = new Map<string, AdminSuggestion[]>();
  for (const s of suggestions) {
    const key = `${s.type}|${s.prayer || ''}|${s.severity}`;
    const arr = groups.get(key) || [];
    arr.push(s);
    groups.set(key, arr);
  }

  const result: AdminSuggestion[] = [];
  for (const [, group] of groups) {
    if (group.length === 1) {
      // Single masjid — keep as-is but make description more concise
      result.push({ ...group[0], description: shortenDescription(group[0].description) });
      continue;
    }

    // Multiple masajid — merge into one consolidated suggestion
    const first = group[0];
    const names = group.map(s => s.mosqueName);
    const uniqueNames = [...new Set(names)];
    const nameList = uniqueNames.length <= 3
      ? uniqueNames.join(', ')
      : `${uniqueNames.slice(0, 2).join(', ')} +${uniqueNames.length - 2} more`;

    const merged: AdminSuggestion = {
      ...first,
      id: `merged-${first.type}-${first.prayer || 'all'}-${first.severity}`,
      mosqueName: nameList,
      title: buildMergedTitle(first, uniqueNames.length),
      description: buildMergedDescription(first, uniqueNames),
      mergedIds: group.map(s => s.id),
      // Keep first mosque's action for the button
      actionLabel: first.actionLabel ? `Review ${uniqueNames.length > 1 ? 'All' : ''}` : undefined,
      // Clear suggestedTime for merged (each masjid may differ)
      suggestedTime: group.length === 1 ? first.suggestedTime : undefined,
    };
    result.push(merged);
  }

  return result;
}

function buildMergedTitle(s: AdminSuggestion, count: number): string {
  const prayerName = s.prayer ? PRAYER_NAMES[s.prayer] : '';

  switch (s.type) {
    case 'iqama-before-adhan':
      return `${prayerName} iqama before adhan at ${count} masajid`;
    case 'staleness':
      return count > 1 ? `${count} masajid need a review` : s.title;
    case 'seasonal':
      return s.title; // Seasonal tips are identical
    case 'tight-gap':
      return `${prayerName} gap is tight at ${count} masajid`;
    case 'predictive-collision':
      return `${prayerName} gap shrinking at ${count} masajid`;
    case 'adhan-drift':
      return `${prayerName} adhan shifted at ${count} masajid`;
    case 'gap-erosion':
      return `${prayerName} gap eroding at ${count} masajid`;
    case 'recommend-offset':
      return `Consider offset mode for ${prayerName} (${count} masajid)`;
    case 'dst-impact':
      return `DST affects ${prayerName} at ${count} masajid`;
    case 'congregation-size':
      return `${prayerName} gap tight for large congregations (${count})`;
    case 'adhan-acceleration':
      return `${prayerName} adhan shifting fast at ${count} masajid`;
    default:
      return count > 1 ? `${s.title} (${count} masajid)` : s.title;
  }
}

function buildMergedDescription(s: AdminSuggestion, names: string[]): string {
  const nameList = names.length <= 3
    ? names.join(', ')
    : `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`;

  switch (s.type) {
    case 'staleness':
      return `${nameList} haven't been updated recently. Review their iqama times.`;
    case 'seasonal':
      return shortenDescription(s.description);
    case 'iqama-before-adhan':
      return `${s.prayer ? PRAYER_NAMES[s.prayer] : 'Iqama'} is set before adhan at ${nameList}. Fix immediately.`;
    case 'tight-gap':
      return `${nameList} have a tight ${s.prayer ? PRAYER_NAMES[s.prayer] : ''} gap. Increase to give the community time.`;
    case 'adhan-drift':
      return `${s.prayer ? PRAYER_NAMES[s.prayer] : 'Adhan'} has shifted significantly at ${nameList}. Adjust fixed iqama times.`;
    case 'dst-impact':
      return `DST will affect ${s.prayer ? PRAYER_NAMES[s.prayer] : ''} gaps at ${nameList}. Plan adjustments before the switch.`;
    case 'recommend-offset':
      return `${nameList} could benefit from offset mode for ${s.prayer ? PRAYER_NAMES[s.prayer] : 'this prayer'} — it eliminates seasonal adjustments.`;
    default:
      return shortenDescription(s.description);
  }
}

/** Trim verbose descriptions to ~120 chars */
function shortenDescription(desc: string): string {
  // If already short, keep it
  if (desc.length <= 140) return desc;
  // Split at first period or dash after 80 chars
  const cutoff = desc.indexOf('. ', 60);
  if (cutoff > 0 && cutoff < 140) return desc.slice(0, cutoff + 1);
  return desc.slice(0, 137) + '...';
}

/**
 * Get a summary count by severity
 */
export function getSuggestionSummary(suggestions: AdminSuggestion[]) {
  return {
    urgent: suggestions.filter(s => s.severity === 'urgent').length,
    warning: suggestions.filter(s => s.severity === 'warning').length,
    info: suggestions.filter(s => s.severity === 'info').length,
    total: suggestions.length,
  };
}