import { Announcement } from '../App';

/**
 * Check if an announcement is currently active based on start and end dates
 */
export function isAnnouncementActive(announcement: Announcement): boolean {
  const now = new Date();
  const today = now.toISOString().split('T')[0]; // YYYY-MM-DD format
  
  const startDate = announcement.startDate;
  const endDate = announcement.endDate;
  
  // Check if today is >= startDate
  if (today < startDate) {
    return false;
  }
  
  // If there's an end date, check if today is <= endDate
  if (endDate && today > endDate) {
    return false;
  }
  
  return true;
}

/**
 * Get active announcement for a specific prayer
 */
export function getActiveAnnouncementForPrayer(
  announcements: Announcement[] | undefined,
  prayer: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' | 'jumuah'
): Announcement | null {
  if (!announcements || announcements.length === 0) {
    return null;
  }
  
  const activeAnnouncement = announcements.find(
    ann => ann.prayers.includes(prayer) && isAnnouncementActive(ann)
  );
  
  return activeAnnouncement || null;
}

/**
 * Format announcement date for display
 */
export function formatAnnouncementDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}