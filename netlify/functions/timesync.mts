/**
 * Twice-daily trigger for the automatic iqama-time sync.
 *
 * The work happens in the Supabase server (POST /timesync/run), which syncs
 * every masjid whose admin turned sync on. Morning and evening runs mean a
 * change a masjid posts during the day is picked up the same evening, in time
 * for the day-before heads-up.
 */
import { projectId, publicAnonKey } from '../../src/app/utils/supabase/info.tsx';

export default async () => {
  const res = await fetch(`https://${projectId}.supabase.co/functions/v1/server/timesync/run`, {
    method: 'POST',
    headers: { apikey: publicAnonKey, Authorization: `Bearer ${publicAnonKey}` },
  });
  const body = await res.text();
  console.log(`[timesync] HTTP ${res.status}: ${body.slice(0, 2000)}`);
  if (!res.ok) throw new Error(`timesync run failed: HTTP ${res.status}`);
};

// UTC: 10:00 and 22:00 → 5 AM / 5 PM in Tampa in winter, 6 AM / 6 PM in summer.
export const config = { schedule: '0 10,22 * * *' };
