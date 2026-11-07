import type { Mosque } from '../App';

/**
 * For a masjid changed in the last 24 hours: how long ago ("3h ago"), and
 * whether that change came from automatic time sync rather than an admin —
 * shown as "Auto-updated 3h ago" vs "Updated 3h ago".
 */
export function getRecentUpdate(mosque: Mosque): { ago: string; auto: boolean } | null {
  // Server-side updatedAt, plus the admin's own browser's record of their
  // latest save (it can be newer than what this list was loaded with).
  const local = typeof window !== 'undefined' ? localStorage.getItem(`mosque-updated:${mosque.id}`) : null;
  const latest = [mosque.updatedAt, local]
    .filter((t): t is string => !!t)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
  if (!latest) return null;

  const diffMs = Date.now() - new Date(latest).getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  if (diffHours > 24) return null;

  let ago: string;
  if (diffHours < 1) {
    const mins = Math.floor(diffMs / (1000 * 60));
    ago = mins <= 1 ? 'just now' : `${mins}m ago`;
  } else {
    ago = `${Math.floor(diffHours)}h ago`;
  }

  // An admin save after the sync bumps updatedAt past autoUpdatedAt.
  return { ago, auto: !!mosque.autoUpdatedAt && latest === mosque.autoUpdatedAt };
}
