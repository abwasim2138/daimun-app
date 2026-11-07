console.log('[BOOT] Edge function module loading… v73-reset-flow', Date.now());
import { Hono } from 'https://esm.sh/hono@4.7.4';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';
import {
  SYNC_TAG, SyncError, TIMEZONE, applyPlan, cleanIgnore, fetchSchedule, findSource, planSync, shortDate, sourceUrl, todayIn,
  type TimeSource,
} from './timesync.ts';
console.log('[BOOT] Imports resolved, v73-reset-flow', Date.now());

const PREFIX = '/server';
const app = new Hono().basePath(PREFIX);

// ── CORS headers (applied at Deno.serve level for bulletproof coverage) ───────

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, apikey, x-client-info',
  'Access-Control-Max-Age': '86400',
};

// ── Health ────────────────────────────────────────────────────────────────────

app.get('/health', (c) =>
  c.json({ status: 'ok', ts: new Date().toISOString() })
);

// ── Auth helper ───────────────────────────────────────────────────────────────

// Lazy-init: avoid creating the Supabase admin client at module scope
// (eliminates a potential cold-start bottleneck).
let _supabaseAdmin: ReturnType<typeof createClient> | null = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
  }
  return _supabaseAdmin;
}

/**
 * Decode a JWT payload without verification.
 * The Supabase gateway already verifies signatures (unless --no-verify-jwt);
 * we just need to extract the claims so route handlers can read the user.
 */
function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // Base64url → Base64 → decode
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(b64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

async function requireAuth(c: any, next: any) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[AUTH] Rejected: no Authorization header or missing Bearer prefix');
    return c.json({ error: 'Unauthorized - No token provided' }, 401);
  }

  const token = authHeader.split(' ')[1];

  // Reject if someone accidentally sends the anon key as the bearer token
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  if (token === anonKey) {
    return c.json({ error: 'Unauthorized - Anon key is not a valid auth token' }, 401);
  }

  // ── Strategy 1: Local JWT decode (instant, no network) ─────────────
  // The Supabase gateway already cryptographically verified the JWT.
  // We just decode the payload to extract user info for route handlers.
  const payload = decodeJwtPayload(token);
  if (payload && payload.sub && payload.role === 'authenticated') {
    const nowSec = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp > nowSec) {
      // Build a minimal user object matching what getUser() would return
      c.set('user', {
        id: payload.sub,
        email: payload.email || '',
        role: payload.role,
        aud: payload.aud || 'authenticated',
        user_metadata: payload.user_metadata || {},
      });
      console.log('[AUTH] OK via local JWT decode, user:', payload.sub);
      await next();
      return;
    }
    console.log('[AUTH] JWT expired, exp:', payload.exp, 'now:', nowSec);
  }

  // ── Strategy 2: Fallback to admin getUser() for edge cases ─────────
  try {
    console.log('[AUTH] Local decode insufficient, falling back to getUser()');
    const { data: { user }, error } = await getSupabaseAdmin().auth.getUser(token);
    if (error || !user) {
      console.log('[AUTH] getUser failed:', error?.message);
      return c.json({ error: 'Unauthorized - Invalid token', details: error?.message }, 401);
    }
    c.set('user', user);
    await next();
  } catch (err) {
    console.error('[AUTH] Exception during token verification:', err);
    return c.json({ error: 'Unauthorized - Token verification failed', details: String(err) }, 401);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ██  MOSQUES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Apply mature scheduled time changes:
 * - Permanent changes (no endDate) whose startDate <= today → bake into iqamaTimes, remove from array
 * - Ranged changes whose endDate < today → expired, remove from array
 * Returns true if the mosque was modified and needs saving.
 */
function applyMatureScheduledChanges(mosque: any): boolean {
  if (!mosque.scheduledTimeChanges || mosque.scheduledTimeChanges.length === 0) return false;

  // Tampa's date, not the server's: the server runs on UTC, which turns over
  // at 7–8 PM Tampa time and would put tomorrow's times up the evening before.
  const todayStr = todayIn(TIMEZONE);

  let modified = false;
  let onlySynced = true; // every change applied came from automatic time sync
  const remaining: any[] = [];

  for (const change of mosque.scheduledTimeChanges) {
    const startDate = change.startDate; // "YYYY-MM-DD"
    const endDate = change.endDate;     // "YYYY-MM-DD" or undefined

    if (!endDate && startDate <= todayStr) {
      // Permanent change whose start date has arrived → bake into base iqamaTimes
      const prayer = change.prayer; // 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'
      if (mosque.iqamaTimes && mosque.iqamaTimes[prayer] && prayer !== 'jumuah') {
        mosque.iqamaTimes[prayer] = { type: 'fixed', time: change.newTime };
      }
      modified = true;
      if (change.source !== SYNC_TAG) onlySynced = false;
      // Don't keep this change
    } else if (endDate && endDate < todayStr) {
      // Ranged change that has expired → remove it
      modified = true;
      onlySynced = false;
    } else {
      // Still pending or currently active ranged change → keep it
      remaining.push(change);
    }
  }

  if (modified) {
    mosque.scheduledTimeChanges = remaining;
    mosque.updatedAt = new Date().toISOString();
    // A synced change taking effect is still an automatic update ("Auto-updated" in the app).
    if (onlySynced) mosque.autoUpdatedAt = mosque.updatedAt;
  }

  return modified;
}

app.get('/mosques', async (c) => {
  try {
    const mosques = await kv.getByPrefix('mosque:');
    // Lazily apply mature scheduled changes
    const savePromises: Promise<void>[] = [];
    for (const mosque of (mosques || [])) {
      if (applyMatureScheduledChanges(mosque)) {
        savePromises.push(kv.set(`mosque:${mosque.id}`, mosque));
      }
    }
    if (savePromises.length > 0) {
      await Promise.all(savePromises);
    }
    return c.json({ mosques: mosques || [] });
  } catch (error) {
    console.log(`Error fetching mosques: ${error}`);
    return c.json({ error: 'Failed to fetch mosques', details: String(error) }, 500);
  }
});

app.get('/mosques/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const mosque = await kv.get(`mosque:${id}`);
    if (!mosque) return c.json({ error: 'Mosque not found' }, 404);
    // Lazily apply mature scheduled changes
    if (applyMatureScheduledChanges(mosque)) {
      await kv.set(`mosque:${id}`, mosque);
    }
    return c.json({ mosque });
  } catch (error) {
    console.log(`Error fetching mosque: ${error}`);
    return c.json({ error: 'Failed to fetch mosque', details: String(error) }, 500);
  }
});

app.post('/mosques', async (c) => {
  try {
    const body = await c.req.json();
    const id = body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const mosque = { id, ...body, events: body.events || [], updatedAt: new Date().toISOString() };
    await kv.set(`mosque:${id}`, mosque);
    return c.json({ success: true, mosque });
  } catch (error) {
    console.log(`Error adding mosque: ${error}`);
    return c.json({ error: 'Failed to add mosque', details: String(error) }, 500);
  }
});

app.put('/mosques/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const updates = await c.req.json();
    const existingMosque = await kv.get(`mosque:${id}`);
    if (!existingMosque) return c.json({ error: 'Mosque not found' }, 404);
    const updatedMosque = { ...existingMosque, ...updates, id, updatedAt: new Date().toISOString() };
    await kv.set(`mosque:${id}`, updatedMosque);
    return c.json({ success: true, mosque: updatedMosque });
  } catch (error) {
    console.log(`Error updating mosque: ${error}`);
    return c.json({ error: 'Failed to update mosque', details: String(error) }, 500);
  }
});

app.delete('/mosques/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await kv.del(`mosque:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting mosque: ${error}`);
    return c.json({ error: 'Failed to delete mosque', details: String(error) }, 500);
  }
});

// ── Automatic iqama-time sync ────────────────────────────────────────────────
// Reads a masjid's schedule from the prayer-times service on its own website
// (see timesync.ts). Runs twice a day from a Netlify scheduled function for
// every masjid whose admin has turned it on.

const syncStatusKey = (id: string) => `timesync-status:${id}`;

/** Sync one masjid and record the outcome. Never throws. */
async function runTimeSync(id: string): Promise<any> {
  const today = todayIn(TIMEZONE);
  const mosque: any = await kv.get(`mosque:${id}`);
  const source: TimeSource | undefined = mosque?.timeSync?.source;
  let status: any;
  try {
    if (!source) throw new SyncError('No source is set for this masjid.');
    const schedule = await fetchSchedule(source, today);
    const plan = planSync(mosque, schedule, today);
    const updated = applyPlan(mosque, plan, schedule.label);
    if (updated) await kv.set(`mosque:${id}`, updated);
    status = {
      ok: true,
      message: plan.coveredThrough
        ? `Up to date — your timetable has times through ${shortDate(plan.coveredThrough)}.`
        : 'Your timetable has no times entered for today onward yet, so nothing was changed.',
      sourceLastUpdated: schedule.lastUpdated,
      coveredThrough: plan.coveredThrough,
      updatedNow: plan.updateNow,
      upcoming: plan.upcoming,
      warnings: plan.warnings,
    };
  } catch (err) {
    status = {
      ok: false,
      message: err instanceof SyncError ? err.message : `Sync failed: ${String(err)}`,
      warnings: [],
    };
  }
  status = { ...status, checkedAt: new Date().toISOString(), source: source ? sourceUrl(source) : null };
  await kv.set(syncStatusKey(id), status);
  return status;
}

// Called by the scheduled function. Public (it only ever applies what each
// opted-in masjid's own source says), so it's throttled rather than secret.
app.post('/timesync/run', async (c) => {
  const last: any = await kv.get('timesync-lastrun');
  if (last?.at && Date.now() - Date.parse(last.at) < 20 * 60_000) {
    return c.json({ skipped: true, reason: 'Ran less than 20 minutes ago', lastRun: last.at });
  }
  await kv.set('timesync-lastrun', { at: new Date().toISOString() });

  const mosques = (await kv.getByPrefix('mosque:')) || [];
  const enabled = mosques.filter((m: any) => m?.timeSync?.enabled && m.timeSync.source);
  const results: Record<string, any> = {};
  for (const m of enabled) {
    const s = await runTimeSync(m.id);
    results[m.id] = { ok: s.ok, message: s.message, updatedNow: s.updatedNow?.length ?? 0, upcoming: s.upcoming?.length ?? 0 };
  }
  console.log('[timesync] run', JSON.stringify(results));
  return c.json({ ran: enabled.length, results });
});

app.get('/mosques/:id/timesync', requireAuth, async (c) => {
  const id = c.req.param('id');
  const mosque: any = await kv.get(`mosque:${id}`);
  if (!mosque) return c.json({ error: 'Mosque not found' }, 404);
  return c.json({ config: mosque.timeSync || null, status: (await kv.get(syncStatusKey(id))) || null });
});

// Dry run: what the sync would do right now. Writes nothing.
app.post('/mosques/:id/timesync/preview', requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const mosque: any = await kv.get(`mosque:${id}`);
    if (!mosque) return c.json({ error: 'Mosque not found' }, 404);
    const body = await c.req.json().catch(() => ({}));

    const asked = body.source as TimeSource | undefined;
    const askedValid = asked && ['themasjidapp', 'athanplus', 'masjidbox'].includes(asked.provider) && /^[A-Za-z0-9_-]+$/.test(String(asked.id));
    // The source already chosen (when re-previewing); else a pasted link; else the saved source; else look on the masjid's website.
    let source: TimeSource | null = askedValid
      ? { provider: asked!.provider, id: String(asked!.id) }
      : body.link ? findSource(String(body.link)) : mosque.timeSync?.source || null;
    let detected = false;
    if (!source && !body.link && mosque.website) {
      const site = mosque.website.startsWith('http') ? mosque.website : `https://${mosque.website}`;
      const res = await fetch(site, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DaimunBot/1.0; +https://daimun.app)' } });
      source = res.ok ? findSource(await res.text()) : null;
      detected = !!source;
    }
    if (!source) {
      return c.json({
        error: body.link
          ? "That link isn't one we can read yet. Supported: themasjidapp.org, AthanPlus (Masjidal) and MasjidBox timetables."
          : "We couldn't find a supported prayer-times service on this masjid's website. Paste the link to its timetable instead.",
      }, 400);
    }

    const today = todayIn(TIMEZONE);
    const schedule = await fetchSchedule(source, today);
    return c.json({
      source,
      url: sourceUrl(source),
      detected,
      label: schedule.label,
      sourceLastUpdated: schedule.lastUpdated,
      plan: planSync(mosque, schedule, today, body.ignore !== undefined ? body.ignore : mosque.timeSync?.ignore),
    });
  } catch (err) {
    const message = err instanceof SyncError ? err.message : `Couldn't read the schedule: ${String(err)}`;
    return c.json({ error: message }, 502);
  }
});

app.put('/mosques/:id/timesync', requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const mosque: any = await kv.get(`mosque:${id}`);
    if (!mosque) return c.json({ error: 'Mosque not found' }, 404);
    const body = await c.req.json();
    const source = body.source as TimeSource | undefined;
    if (body.enabled && !(source && ['themasjidapp', 'athanplus', 'masjidbox'].includes(source.provider) && /^[A-Za-z0-9_-]+$/.test(source.id))) {
      return c.json({ error: 'A valid source is required to turn sync on.' }, 400);
    }

    const today = todayIn(TIMEZONE);
    const prev = mosque.timeSync || {};
    const nextSource = source || prev.source;
    // "Check now" on a running sync keeps what it has seen, so it still won't
    // undo edits made in Daimun. Switching it on (or to another timetable)
    // starts fresh and lines today's times up with the timetable.
    const keepMemory = body.enabled && prev.enabled && JSON.stringify(prev.source) === JSON.stringify(nextSource);
    await kv.set(`mosque:${id}`, {
      ...mosque,
      timeSync: {
        enabled: !!body.enabled,
        source: nextSource,
        ignore: body.ignore !== undefined ? cleanIgnore(body.ignore) : cleanIgnore(prev.ignore),
        changedAt: new Date().toISOString(),
        ...(keepMemory && { applied: prev.applied, created: prev.created, dismissed: prev.dismissed }),
      },
      // Turning it off drops the upcoming changes it scheduled — nothing would
      // keep them current. Times already in effect stay as they are.
      ...(!body.enabled && {
        scheduledTimeChanges: (mosque.scheduledTimeChanges || []).filter(
          (ch: any) => ch.source !== SYNC_TAG || ch.startDate <= today,
        ),
      }),
    });
    // Turning it on syncs straight away rather than waiting for the next run.
    const status = body.enabled ? await runTimeSync(id) : (await kv.get(syncStatusKey(id))) || null;
    const latest: any = await kv.get(`mosque:${id}`);
    return c.json({ config: latest.timeSync, status, mosque: latest });
  } catch (err) {
    console.log(`Error updating time sync: ${err}`);
    return c.json({ error: 'Failed to update time sync', details: String(err) }, 500);
  }
});

// ── Mosque Events ─────────────────────────────────────────────────────────────

app.post('/mosques/:id/events', async (c) => {
  try {
    const mosqueId = c.req.param('id');
    const eventData = await c.req.json();
    const mosque = await kv.get(`mosque:${mosqueId}`);
    if (!mosque) return c.json({ error: 'Mosque not found' }, 404);
    const eventId = `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newEvent = { id: eventId, ...eventData };
    mosque.events = mosque.events || [];
    mosque.events.push(newEvent);
    mosque.updatedAt = new Date().toISOString();
    await kv.set(`mosque:${mosqueId}`, mosque);
    return c.json({ success: true, event: newEvent });
  } catch (error) {
    console.log(`Error adding event: ${error}`);
    return c.json({ error: 'Failed to add event', details: String(error) }, 500);
  }
});

app.delete('/mosques/:mosqueId/events/:eventId', async (c) => {
  try {
    const mosqueId = c.req.param('mosqueId');
    const eventId = c.req.param('eventId');
    const mosque = await kv.get(`mosque:${mosqueId}`);
    if (!mosque) return c.json({ error: 'Mosque not found' }, 404);
    mosque.events = (mosque.events || []).filter((e: any) => e.id !== eventId);
    mosque.updatedAt = new Date().toISOString();
    await kv.set(`mosque:${mosqueId}`, mosque);
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting event: ${error}`);
    return c.json({ error: 'Failed to delete event', details: String(error) }, 500);
  }
});

app.put('/mosques/:mosqueId/events/:eventId', async (c) => {
  try {
    const mosqueId = c.req.param('mosqueId');
    const eventId = c.req.param('eventId');
    const eventData = await c.req.json();
    const mosque = await kv.get(`mosque:${mosqueId}`);
    if (!mosque) return c.json({ error: 'Mosque not found' }, 404);
    const eventIndex = (mosque.events || []).findIndex((e: any) => e.id === eventId);
    if (eventIndex === -1) return c.json({ error: 'Event not found' }, 404);
    mosque.events[eventIndex] = { ...eventData, id: eventId };
    mosque.updatedAt = new Date().toISOString();
    await kv.set(`mosque:${mosqueId}`, mosque);
    return c.json({ success: true, event: mosque.events[eventIndex] });
  } catch (error) {
    console.log(`Error updating event: ${error}`);
    return c.json({ error: 'Failed to update event', details: String(error) }, 500);
  }
});

// ── Mosque Announcements ──────────────────────────────────────────────────────

app.post('/mosques/:id/announcements', async (c) => {
  try {
    const mosqueId = c.req.param('id');
    const announcementData = await c.req.json();
    const mosque = await kv.get(`mosque:${mosqueId}`);
    if (!mosque) return c.json({ error: 'Mosque not found' }, 404);
    const announcementId = `announcement-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newAnnouncement = { id: announcementId, ...announcementData };
    mosque.announcements = mosque.announcements || [];
    mosque.announcements.push(newAnnouncement);
    mosque.updatedAt = new Date().toISOString();
    await kv.set(`mosque:${mosqueId}`, mosque);
    return c.json({ success: true, announcement: newAnnouncement });
  } catch (error) {
    console.log(`Error adding announcement: ${error}`);
    return c.json({ error: 'Failed to add announcement', details: String(error) }, 500);
  }
});

app.delete('/mosques/:mosqueId/announcements/:announcementId', async (c) => {
  try {
    const mosqueId = c.req.param('mosqueId');
    const announcementId = c.req.param('announcementId');
    const mosque = await kv.get(`mosque:${mosqueId}`);
    if (!mosque) return c.json({ error: 'Mosque not found' }, 404);
    mosque.announcements = (mosque.announcements || []).filter((a: any) => a.id !== announcementId);
    mosque.updatedAt = new Date().toISOString();
    await kv.set(`mosque:${mosqueId}`, mosque);
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting announcement: ${error}`);
    return c.json({ error: 'Failed to delete announcement', details: String(error) }, 500);
  }
});

// ── Mosque Scheduled Time Changes ─────────────────────────────────────────────

app.post('/mosques/:id/scheduled-changes', async (c) => {
  try {
    const mosqueId = c.req.param('id');
    const body = await c.req.json();
    const mosque = await kv.get(`mosque:${mosqueId}`);
    if (!mosque) return c.json({ error: 'Mosque not found' }, 404);
    mosque.scheduledTimeChanges = mosque.scheduledTimeChanges || [];
    const changes = Array.isArray(body) ? body : [body];
    const newChanges: any[] = [];
    for (const changeData of changes) {
      const changeId = `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newChange = { id: changeId, ...changeData };
      mosque.scheduledTimeChanges.push(newChange);
      newChanges.push(newChange);
    }
    mosque.updatedAt = new Date().toISOString();
    await kv.set(`mosque:${mosqueId}`, mosque);
    return c.json({ success: true, changes: newChanges });
  } catch (error) {
    console.log(`Error adding scheduled time change: ${error}`);
    return c.json({ error: 'Failed to add scheduled time change', details: String(error) }, 500);
  }
});

app.delete('/mosques/:mosqueId/scheduled-changes/:changeId', async (c) => {
  try {
    const mosqueId = c.req.param('mosqueId');
    const changeId = c.req.param('changeId');
    const mosque = await kv.get(`mosque:${mosqueId}`);
    if (!mosque) return c.json({ error: 'Mosque not found' }, 404);
    mosque.scheduledTimeChanges = (mosque.scheduledTimeChanges || []).filter((ch: any) => ch.id !== changeId);
    mosque.updatedAt = new Date().toISOString();
    await kv.set(`mosque:${mosqueId}`, mosque);
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting scheduled time change: ${error}`);
    return c.json({ error: 'Failed to delete scheduled time change', details: String(error) }, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// ██  JANAZAS
// ══════════════════════════════════════════════════════════════════════════════

app.get('/janazas', async (c) => {
  try {
    const janazas = await kv.getByPrefix('janaza:');
    const now = Date.now();
    const active: any[] = [];
    const deletePromises: Promise<void>[] = [];

    for (const janaza of (janazas || [])) {
      if (janaza.dateTime && new Date(janaza.dateTime).getTime() < now) {
        // Janaza time has passed — delete it
        deletePromises.push(kv.del(`janaza:${janaza.id}`));
        console.log(`[JANAZA] Auto-deleted expired janaza ${janaza.id} (was ${janaza.dateTime})`);
      } else {
        active.push(janaza);
      }
    }

    if (deletePromises.length > 0) await Promise.all(deletePromises);

    return c.json({ janazas: active });
  } catch (error) {
    console.log(`Error fetching janazas: ${error}`);
    return c.json({ error: 'Failed to fetch janazas', details: String(error) }, 500);
  }
});

app.post('/janazas', async (c) => {
  try {
    const body = await c.req.json();
    const { mosqueId, dateTime, notes } = body;
    if (!mosqueId || !dateTime) return c.json({ error: 'Mosque ID and date/time are required' }, 400);
    const janazaId = `janaza-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const janaza = { id: janazaId, mosqueId, dateTime, notes: notes || '', createdAt: new Date().toISOString() };
    await kv.set(`janaza:${janazaId}`, janaza);
    return c.json({ success: true, janaza });
  } catch (error) {
    console.log(`Error adding janaza: ${error}`);
    return c.json({ error: 'Failed to add janaza', details: String(error) }, 500);
  }
});

app.delete('/janazas/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await kv.del(`janaza:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting janaza: ${error}`);
    return c.json({ error: 'Failed to delete janaza', details: String(error) }, 500);
  }
});

app.put('/janazas/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { mosqueId, dateTime, notes } = await c.req.json();
    if (!mosqueId || !dateTime) return c.json({ error: 'Missing required fields' }, 400);
    const mosque = await kv.get(`mosque:${mosqueId}`);
    if (!mosque) return c.json({ error: 'Mosque not found' }, 404);
    const existingJanaza = await kv.get(`janaza:${id}`);
    if (!existingJanaza) return c.json({ error: 'Janaza alert not found' }, 404);
    const updatedJanaza = {
      id, mosqueId, dateTime, notes: notes || '',
      createdAt: existingJanaza.createdAt,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`janaza:${id}`, updatedJanaza);
    return c.json({ success: true, janaza: updatedJanaza });
  } catch (error) {
    console.log(`Error updating janaza: ${error}`);
    return c.json({ error: 'Failed to update janaza', details: String(error) }, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// ██  INITIALIZE (seed data)
// ══════════════════════════════════════════════════════════════════════════════

app.post('/initialize', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const force = body.force === true;
    const mosques = await kv.getByPrefix('mosque:');
    if (mosques && mosques.length > 0 && !force) {
      return c.json({ message: 'Already initialized', count: mosques.length });
    }
    if (force && mosques && mosques.length > 0) {
      for (const mosque of mosques) await kv.del(`mosque:${mosque.id}`);
    }
    const sampleMosques = [
      {
        id: 'masjid-al-khaliq', name: 'Masjid Al Khaliq',
        address: '7917 Ostrow St, San Diego, CA 92111',
        latitude: 32.8138, longitude: -117.1478,
        website: 'https://masjidalkhaliq.org', calculationMethod: 'NorthAmerica',
        iqamaTimes: {
          fajr: { type: 'offset', minutes: 20 }, dhuhr: { type: 'offset', minutes: 10 },
          asr: { type: 'offset', minutes: 10 }, maghrib: { type: 'offset', minutes: 5 },
          isha: { type: 'offset', minutes: 10 },
          jumuah: { khutbah: { type: 'fixed', time: '1:15 PM' }, iqama: { type: 'fixed', time: '1:45 PM' } }
        },
        events: [{ id: 'event-1', title: 'Quran Study Circle', date: '2026-01-20', time: '7:00 PM', description: 'Weekly Quran study and discussion', recurring: { enabled: true, frequency: 'weekly', dayOfWeek: 1 } }]
      },
      {
        id: 'islamic-center-of-san-diego', name: 'Islamic Center of San Diego',
        address: '7050 Eckstrom Ave, San Diego, CA 92111',
        latitude: 32.8058, longitude: -117.1511,
        website: 'https://icsdmasjid.org', calculationMethod: 'NorthAmerica',
        iqamaTimes: {
          fajr: { type: 'offset', minutes: 15 }, dhuhr: { type: 'offset', minutes: 15 },
          asr: { type: 'offset', minutes: 15 }, maghrib: { type: 'offset', minutes: 5 },
          isha: { type: 'offset', minutes: 15 },
          jumuah: { khutbah: { type: 'fixed', time: '1:00 PM' }, iqama: { type: 'fixed', time: '1:30 PM' } }
        },
        events: []
      },
      {
        id: 'masjid-abu-bakr', name: 'Masjid Abu Bakr',
        address: '4460 Alabama St, San Diego, CA 92116',
        latitude: 32.7586, longitude: -117.1294,
        website: 'https://masjidabubakr.com', calculationMethod: 'NorthAmerica',
        iqamaTimes: {
          fajr: { type: 'offset', minutes: 20 }, dhuhr: { type: 'offset', minutes: 10 },
          asr: { type: 'offset', minutes: 10 }, maghrib: { type: 'offset', minutes: 5 },
          isha: { type: 'offset', minutes: 15 },
          jumuah: { khutbah: { type: 'fixed', time: '12:45 PM' }, iqama: { type: 'fixed', time: '1:15 PM' } }
        },
        events: []
      }
    ];
    for (const mosque of sampleMosques) await kv.set(`mosque:${mosque.id}`, mosque);
    return c.json({ message: 'Initialized successfully', count: sampleMosques.length });
  } catch (error) {
    console.error('Error initializing database:', error);
    return c.json({ error: 'Failed to initialize database', details: String(error) }, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// ██  MASJID REQUESTS  (public submission, admin management)
// ══════════════════════════════════════════════════════════════════════════════

app.post('/masjid-requests', async (c) => {
  try {
    const body = await c.req.json();
    const { masjidName, address, city, state, website, submitterName, submitterEmail, notes } = body;
    if (!masjidName || !address || !city || !state) {
      return c.json({ error: 'Masjid name, address, city, and state are required' }, 400);
    }
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const request = {
      id: requestId, masjidName, address, city, state,
      website: website || null, submitterName: submitterName || null,
      submitterEmail: submitterEmail || null, notes: notes || null,
      status: 'pending', createdAt: new Date().toISOString(),
    };
    await kv.set(`masjid-request:${requestId}`, request);
    console.log(`New masjid request: ${masjidName} by ${submitterName || 'anon'}`);
    return c.json({ success: true, request });
  } catch (error) {
    console.log(`Error submitting masjid request: ${error}`);
    return c.json({ error: 'Failed to submit masjid request', details: String(error) }, 500);
  }
});

app.get('/masjid-requests', requireAuth, async (c) => {
  try {
    const requests = await kv.getByPrefix('masjid-request:');
    const sorted = (requests || []).sort((a: any, b: any) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return c.json({ requests: sorted });
  } catch (error) {
    console.log(`Error fetching masjid requests: ${error}`);
    return c.json({ error: 'Failed to fetch masjid requests', details: String(error) }, 500);
  }
});

app.put('/masjid-requests/:id', requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const { status } = await c.req.json();
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return c.json({ error: 'Invalid status' }, 400);
    }
    const existing = await kv.get(`masjid-request:${id}`);
    if (!existing) return c.json({ error: 'Masjid request not found' }, 404);
    const updated = { ...existing, status, updatedAt: new Date().toISOString() };
    await kv.set(`masjid-request:${id}`, updated);
    return c.json({ success: true, request: updated });
  } catch (error) {
    console.log(`Error updating masjid request: ${error}`);
    return c.json({ error: 'Failed to update masjid request', details: String(error) }, 500);
  }
});

app.delete('/masjid-requests/:id', requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    await kv.del(`masjid-request:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting masjid request: ${error}`);
    return c.json({ error: 'Failed to delete masjid request', details: String(error) }, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// ██  TIME CORRECTIONS  (public submission, admin management)
// ══════════════════════════════════════════════════════════════════════════════

app.post('/time-corrections', async (c) => {
  try {
    let body: any;
    try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid request body' }, 400); }
    const { mosqueId, mosqueName, prayers, reportType, correctTime, notes, currentTimes } = body;
    if (!mosqueId || !reportType) return c.json({ error: 'Mosque ID and report type are required' }, 400);
    const correctionId = `correction-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const correction = {
      id: correctionId,
      mosqueId: String(mosqueId), mosqueName: String(mosqueName || ''),
      prayers: Array.isArray(prayers) ? prayers : [],
      reportType: String(reportType),
      correctTime: correctTime ? String(correctTime) : null,
      notes: notes ? String(notes) : null,
      currentTimes: currentTimes && typeof currentTimes === 'object' ? currentTimes : {},
      status: 'pending', createdAt: new Date().toISOString(),
    };
    await kv.set(`time-correction:${correctionId}`, correction);
    console.log(`Time correction submitted for ${correction.mosqueName} (${correctionId})`);
    return c.json({ success: true, correction });
  } catch (error) {
    console.error('Error submitting time correction:', error);
    return c.json({ error: 'Failed to submit time correction', details: String(error) }, 500);
  }
});

app.get('/time-corrections', requireAuth, async (c) => {
  try {
    const corrections = await kv.getByPrefix('time-correction:');
    const sorted = (corrections || []).sort((a: any, b: any) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return c.json({ corrections: sorted });
  } catch (error) {
    console.log(`Error fetching time corrections: ${error}`);
    return c.json({ error: 'Failed to fetch time corrections', details: String(error) }, 500);
  }
});

app.put('/time-corrections/:id', requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const { status } = await c.req.json();
    if (!['pending', 'accepted', 'dismissed'].includes(status)) {
      return c.json({ error: 'Invalid status' }, 400);
    }
    const existing = await kv.get(`time-correction:${id}`);
    if (!existing) return c.json({ error: 'Time correction not found' }, 404);
    const updated = { ...existing, status, reviewedAt: new Date().toISOString() };
    await kv.set(`time-correction:${id}`, updated);
    return c.json({ success: true, correction: updated });
  } catch (error) {
    console.log(`Error updating time correction: ${error}`);
    return c.json({ error: 'Failed to update time correction', details: String(error) }, 500);
  }
});

app.delete('/time-corrections/:id', requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    await kv.del(`time-correction:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting time correction: ${error}`);
    return c.json({ error: 'Failed to delete time correction', details: String(error) }, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// ██  BUG REPORTS  (public submission, admin management)
// ══════════════════════════════════════════════════════════════════════════════

app.post('/bug-reports', async (c) => {
  try {
    let body: any;
    try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid request body' }, 400); }
    const { category, description, steps, userAgent, screenSize, url, timestamp } = body;
    if (!description) return c.json({ error: 'Description is required' }, 400);
    const reportId = `bug-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const report = {
      id: reportId, category: String(category || 'other'),
      description: String(description), steps: steps ? String(steps) : null,
      userAgent: String(userAgent || ''), screenSize: String(screenSize || ''),
      url: String(url || ''), status: 'open',
      createdAt: timestamp || new Date().toISOString(),
    };
    await kv.set(`bug-report:${reportId}`, report);
    console.log(`Bug report submitted: ${reportId} (${report.category})`);
    return c.json({ success: true, report });
  } catch (error) {
    console.error('Error submitting bug report:', error);
    return c.json({ error: 'Failed to submit bug report', details: String(error) }, 500);
  }
});

app.get('/bug-reports', requireAuth, async (c) => {
  try {
    const reports = await kv.getByPrefix('bug-report:');
    const sorted = (reports || []).sort((a: any, b: any) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return c.json({ reports: sorted });
  } catch (error) {
    console.error('Error fetching bug reports:', error);
    return c.json({ error: 'Failed to fetch bug reports', details: String(error) }, 500);
  }
});

app.put('/bug-reports/:id', requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const { status } = await c.req.json();
    if (!['open', 'resolved'].includes(status)) return c.json({ error: 'Invalid status' }, 400);
    const existing = await kv.get(`bug-report:${id}`);
    if (!existing) return c.json({ error: 'Bug report not found' }, 404);
    const updated = { ...existing, status, resolvedAt: status === 'resolved' ? new Date().toISOString() : undefined };
    await kv.set(`bug-report:${id}`, updated);
    return c.json({ success: true, report: updated });
  } catch (error) {
    console.error('Error updating bug report:', error);
    return c.json({ error: 'Failed to update bug report', details: String(error) }, 500);
  }
});

app.delete('/bug-reports/:id', requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    await kv.del(`bug-report:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting bug report:', error);
    return c.json({ error: 'Failed to delete bug report', details: String(error) }, 500);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// ██  AUTH — signup + access requests
// ══════════════════════════════════════════════════════════════════════════════

app.post('/auth/signup', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, name } = body;
    if (!email || !password || !name) return c.json({ error: 'Email, password, and name are required' }, 400);
    if (password.length < 6) return c.json({ error: 'Password must be at least 6 characters' }, 400);

    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'apikey': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { name } }),
    });
    if (!response.ok) {
      const error = await response.json();
      return c.json({ error: error.msg || 'Failed to create account' }, response.status);
    }
    const user = await response.json();
    console.log('Admin user created:', user.email);

    // Send welcome email via Resend (best-effort)
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey) {
      try {
        const origin = c.req.header('origin') || 'https://daimun.com';
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Daimun <welcome@daimun.app>', to: [email],
            subject: 'Welcome to Daimun - Admin Account Created!',
            html: `<div style="font-family:system-ui;max-width:560px;margin:auto;padding:32px;background:#fff;border-radius:12px"><h1 style="color:#d97706">Daimun</h1><p>As-salamu alaykum <b>${name}</b>!</p><p>Your admin account has been created. <a href="${origin}">Open Daimun</a></p></div>`,
          }),
        });
      } catch (e) { console.error('Email send failed (non-fatal):', e); }
    }

    return c.json({ success: true, message: 'Account created successfully.', user: { email: user.email, name } });
  } catch (error) {
    console.error('Error creating admin account:', error);
    return c.json({ error: 'Failed to create account', details: String(error) }, 500);
  }
});

app.post('/auth/send-reset', async (c) => {
  try {
    const body = await c.req.json();
    const { email } = body;
    if (!email) return c.json({ error: 'Email is required' }, 400);

    const SITE_URL = 'https://daimun.app';

    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/recover`, {
      method: 'POST',
      headers: {
        'apikey': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, redirect_to: SITE_URL }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Reset email failed:', error);
      return c.json({ error: error.msg || 'Failed to send reset email' }, response.status);
    }

    console.log('Password reset email sent to:', email);
    return c.json({ success: true, message: 'Password reset email sent.' });
  } catch (error) {
    console.error('Error sending reset email:', error);
    return c.json({ error: 'Failed to send reset email', details: String(error) }, 500);
  }
});

app.post('/auth/request-access', async (c) => {
  try {
    const body = await c.req.json();
    const { name, email, mosqueIds, mosqueNames, message } = body;
    if (!name || !email || !mosqueIds || mosqueIds.length === 0) {
      return c.json({ error: 'Name, email, and at least one masjid are required' }, 400);
    }
    const id = `${Date.now()}-${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const request = { id, name, email, mosqueIds, mosqueNames: mosqueNames || [], message: message || '', status: 'pending', createdAt: new Date().toISOString() };
    await kv.set(`access-request:${id}`, request);
    return c.json({ success: true, message: 'Request submitted successfully' });
  } catch (error) {
    console.error('Error storing access request:', error);
    return c.json({ error: 'Failed to submit request', details: String(error) }, 500);
  }
});

app.get('/auth/access-requests', requireAuth, async (c) => {
  try {
    const requests = await kv.getByPrefix('access-request:');
    requests.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return c.json({ requests });
  } catch (error) {
    console.error('Error fetching access requests:', error);
    return c.json({ error: 'Failed to fetch requests', details: String(error) }, 500);
  }
});

app.delete('/auth/access-requests/:id', requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    await kv.del(`access-request:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting access request:', error);
    return c.json({ error: 'Failed to delete request', details: String(error) }, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// ██  ADMIN SCOPE — per-user masjid visibility
// ══════════════════════════════════════════════════════════════════════════════

// Save scope for a user by email (super admin sets which masjids a contributor can see)
app.put('/auth/admin-scope', requireAuth, async (c) => {
  try {
    const { email, allowedMosqueIds } = await c.req.json();
    if (!email) return c.json({ error: 'Email is required' }, 400);
    if (!Array.isArray(allowedMosqueIds)) return c.json({ error: 'allowedMosqueIds must be an array' }, 400);
    const key = `admin-scope:${email.toLowerCase().trim()}`;
    if (allowedMosqueIds.length === 0) {
      // Empty array = remove scope (grant full access)
      await kv.del(key);
      console.log(`[SCOPE] Removed scope for ${email} (full access)`);
      return c.json({ success: true, scope: null });
    }
    const scope = { email: email.toLowerCase().trim(), allowedMosqueIds, updatedAt: new Date().toISOString() };
    await kv.set(key, scope);
    console.log(`[SCOPE] Saved scope for ${email}: ${allowedMosqueIds.length} masjids`);
    return c.json({ success: true, scope });
  } catch (error) {
    console.error('Error saving admin scope:', error);
    return c.json({ error: 'Failed to save scope', details: String(error) }, 500);
  }
});

// Get the current user's scope (returns null if no restrictions = super admin)
app.get('/auth/my-scope', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const email = (user.email || '').toLowerCase().trim();
    if (!email) return c.json({ scope: null });
    const scope = await kv.get(`admin-scope:${email}`);
    return c.json({ scope: scope || null });
  } catch (error) {
    console.error('Error fetching admin scope:', error);
    return c.json({ error: 'Failed to fetch scope', details: String(error) }, 500);
  }
});

// List all scopes (super admin overview)
app.get('/auth/admin-scopes', requireAuth, async (c) => {
  try {
    const scopes = await kv.getByPrefix('admin-scope:');
    return c.json({ scopes: scopes || [] });
  } catch (error) {
    console.error('Error fetching admin scopes:', error);
    return c.json({ error: 'Failed to fetch scopes', details: String(error) }, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// ██  KHATEEBS
// ══════════════════════════════════════════════════════════════════════════════

app.get('/khateebs', async (c) => {
  try {
    const khateebs = await kv.getByPrefix('khateeb:');
    return c.json({ khateebs: khateebs || [] });
  } catch (error) {
    console.log(`Error fetching khateebs: ${error}`);
    return c.json({ error: 'Failed to fetch khateebs', details: String(error) }, 500);
  }
});

app.post('/khateebs', requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const { name, phone, notes } = body;
    if (!name || !phone) return c.json({ error: 'Name and phone are required' }, 400);
    const id = `khateeb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const khateeb = { id, name, phone, notes: notes || '', createdAt: new Date().toISOString() };
    await kv.set(`khateeb:${id}`, khateeb);
    return c.json({ success: true, khateeb });
  } catch (error) {
    console.log(`Error adding khateeb: ${error}`);
    return c.json({ error: 'Failed to add khateeb', details: String(error) }, 500);
  }
});

app.put('/khateebs/:id', requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const existing = await kv.get(`khateeb:${id}`);
    if (!existing) return c.json({ error: 'Khateeb not found' }, 404);
    const updated = { ...existing, ...body, id, updatedAt: new Date().toISOString() };
    await kv.set(`khateeb:${id}`, updated);
    return c.json({ success: true, khateeb: updated });
  } catch (error) {
    console.log(`Error updating khateeb: ${error}`);
    return c.json({ error: 'Failed to update khateeb', details: String(error) }, 500);
  }
});

app.delete('/khateebs/:id', requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    await kv.del(`khateeb:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting khateeb: ${error}`);
    return c.json({ error: 'Failed to delete khateeb', details: String(error) }, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// ██  VOLUNTEERS  (public read, admin CRUD)
// ══════════════════════════════════════════════════════════════════════════════

app.get('/volunteers', async (c) => {
  try {
    const volunteers = await kv.getByPrefix('volunteer:');
    const sorted = (volunteers || []).sort((a: any, b: any) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return c.json({ volunteers: sorted });
  } catch (error) {
    console.log(`Error fetching volunteers: ${error}`);
    return c.json({ error: 'Failed to fetch volunteers', details: String(error) }, 500);
  }
});

app.post('/volunteers', requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const { title, description, link, mosqueId, mosqueName } = body;
    if (!title || !link) return c.json({ error: 'Title and link are required' }, 400);
    const id = `vol-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const volunteer = {
      id, title: String(title), description: description ? String(description) : null,
      link: String(link), mosqueId: mosqueId ? String(mosqueId) : null,
      mosqueName: mosqueName ? String(mosqueName) : null,
      createdAt: new Date().toISOString(),
    };
    await kv.set(`volunteer:${id}`, volunteer);
    return c.json({ success: true, volunteer });
  } catch (error) {
    console.log(`Error adding volunteer opportunity: ${error}`);
    return c.json({ error: 'Failed to add volunteer opportunity', details: String(error) }, 500);
  }
});

app.put('/volunteers/:id', requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const existing = await kv.get(`volunteer:${id}`);
    if (!existing) return c.json({ error: 'Volunteer opportunity not found' }, 404);
    const updated = { ...existing, ...body, id, updatedAt: new Date().toISOString() };
    await kv.set(`volunteer:${id}`, updated);
    return c.json({ success: true, volunteer: updated });
  } catch (error) {
    console.log(`Error updating volunteer opportunity: ${error}`);
    return c.json({ error: 'Failed to update volunteer opportunity', details: String(error) }, 500);
  }
});

app.delete('/volunteers/:id', requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    await kv.del(`volunteer:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting volunteer opportunity: ${error}`);
    return c.json({ error: 'Failed to delete volunteer opportunity', details: String(error) }, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// ██  CHARITIES  (public read, admin CRUD)
// ══════════════════════════════════════════════════════════════════════════════

app.get('/charities', async (c) => {
  try {
    const charities = await kv.getByPrefix('charity:');
    const sorted = (charities || []).sort((a: any, b: any) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return c.json({ charities: sorted });
  } catch (error) {
    console.log(`Error fetching charities: ${error}`);
    return c.json({ error: 'Failed to fetch charities', details: String(error) }, 500);
  }
});

app.post('/charities', requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const { title, description, link, category, mosqueId, mosqueName } = body;
    if (!title || !link) return c.json({ error: 'Title and link are required' }, 400);
    const id = `chr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const charity = {
      id, title: String(title), description: description ? String(description) : null,
      link: String(link), category: category ? String(category) : null,
      mosqueId: mosqueId ? String(mosqueId) : null,
      mosqueName: mosqueName ? String(mosqueName) : null,
      createdAt: new Date().toISOString(),
    };
    await kv.set(`charity:${id}`, charity);
    return c.json({ success: true, charity });
  } catch (error) {
    console.log(`Error adding charity link: ${error}`);
    return c.json({ error: 'Failed to add charity link', details: String(error) }, 500);
  }
});

app.put('/charities/:id', requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const existing = await kv.get(`charity:${id}`);
    if (!existing) return c.json({ error: 'Charity link not found' }, 404);
    const updated = { ...existing, ...body, id, updatedAt: new Date().toISOString() };
    await kv.set(`charity:${id}`, updated);
    return c.json({ success: true, charity: updated });
  } catch (error) {
    console.log(`Error updating charity link: ${error}`);
    return c.json({ error: 'Failed to update charity link', details: String(error) }, 500);
  }
});

app.delete('/charities/:id', requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    await kv.del(`charity:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting charity link: ${error}`);
    return c.json({ error: 'Failed to delete charity link', details: String(error) }, 500);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// ██  ANALYTICS  (lightweight page-view tracking)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Hash a string to a short hex fingerprint using SubtleCrypto.
 * Used to create a non-PII visitor identifier from IP + UA.
 */
async function hashFingerprint(raw: string): Promise<string> {
  const data = new TextEncoder().encode(raw);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).slice(0, 8)
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Resolve an IP address to a city name, with KV caching.
 * Uses ipinfo.io (free tier — 50 k/month, no key required).
 * Returns 'Unknown' on any failure so tracking is never blocked.
 */
async function resolveCity(ip: string): Promise<string> {
  if (!ip || ip === 'unknown') return 'Unknown';
  try {
    // Check KV cache first (keyed by hashed IP for privacy)
    const ipHash = await hashFingerprint(ip);
    const geoKey = `geo:${ipHash}`;
    const cached = await kv.get(geoKey);
    if (cached?.city) return cached.city;

    // Fetch from ipinfo.io with a 2-second timeout
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`https://ipinfo.io/${ip}/json`, { signal: controller.signal });
    clearTimeout(timer);

    if (res.ok) {
      const geo = await res.json();
      const city = geo.city || 'Unknown';
      // Cache indefinitely (city-to-IP mapping rarely changes)
      kv.set(geoKey, { city, region: geo.region || '', country: geo.country || '' }).catch(() => {});
      return city;
    }
  } catch { /* timeout or network error — skip silently */ }
  return 'Unknown';
}

// Helper: get YYYY-MM-DD in a given IANA timezone (falls back to UTC)
function dateInTz(tz?: string): string {
  try {
    if (tz) {
      const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
      const y = parts.find(p => p.type === 'year')!.value;
      const m = parts.find(p => p.type === 'month')!.value;
      const d = parts.find(p => p.type === 'day')!.value;
      return `${y}-${m}-${d}`;
    }
  } catch { /* invalid tz — fall through */ }
  return new Date().toISOString().slice(0, 10);
}

// Helper: get YYYY-MM-DD for N days ago in a given IANA timezone
function daysAgoInTz(n: number, tz?: string): string {
  const d = new Date(Date.now() - n * 86400000);
  try {
    if (tz) {
      const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
      const y = parts.find(p => p.type === 'year')!.value;
      const m = parts.find(p => p.type === 'month')!.value;
      const dd = parts.find(p => p.type === 'day')!.value;
      return `${y}-${m}-${dd}`;
    }
  } catch { /* invalid tz — fall through */ }
  return d.toISOString().slice(0, 10);
}

app.post('/analytics/track', async (c) => {
  try {
    const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
      || c.req.header('cf-connecting-ip')
      || 'unknown';
    const ua = c.req.header('user-agent') || 'unknown';
    const body = await c.req.json().catch(() => ({}));
    const page = body.page || '/';

    // Use client timezone for date bucketing so analytics align with the user's local day
    const today = dateInTz(body.tz);
    const key = `analytics:daily:${today}`;
    const fp = await hashFingerprint(`${ip}:${ua}`);

    // Resolve city from IP (cached in KV)
    const city = await resolveCity(ip);

    const existing = await kv.get(key) || { date: today, views: 0, visitors: [], pages: {}, cities: {} };
    existing.views += 1;
    if (!existing.visitors.includes(fp)) {
      existing.visitors.push(fp);
    }
    // Track page breakdown
    existing.pages = existing.pages || {};
    existing.pages[page] = (existing.pages[page] || 0) + 1;
    // Track city breakdown
    existing.cities = existing.cities || {};
    if (city !== 'Unknown') {
      existing.cities[city] = (existing.cities[city] || 0) + 1;
    }

    await kv.set(key, existing);
    return c.json({ ok: true });
  } catch (error) {
    console.error('Analytics track error:', error);
    return c.json({ ok: true }); // Fail silently for tracking
  }
});

app.get('/analytics/summary', requireAuth, async (c) => {
  try {
    // Use client timezone if provided for accurate "today" / window calculations
    const tz = c.req.query('tz') || undefined;
    const records = await kv.getByPrefix('analytics:daily:');
    // Sort by date descending and take last 90 days
    const sorted = (records || [])
      .sort((a: any, b: any) => b.date.localeCompare(a.date))
      .slice(0, 90)
      .map((r: any) => ({
        date: r.date,
        views: r.views || 0,
        visitors: (r.visitors || []).length,
        pages: r.pages || {},
        cities: r.cities || {},
      }));

    // Compute aggregates using client timezone
    const today = dateInTz(tz);
    const sevenDaysAgo = daysAgoInTz(7, tz);
    const thirtyDaysAgo = daysAgoInTz(30, tz);

    const todayData = sorted.find((r: any) => r.date === today);
    const last7 = sorted.filter((r: any) => r.date >= sevenDaysAgo);
    const last30 = sorted.filter((r: any) => r.date >= thirtyDaysAgo);

    // Unique visitors across multi-day windows need raw fingerprint sets
    // For simplicity, sum daily unique counts (slight overcount across days is acceptable)
    const summary = {
      today: { views: todayData?.views || 0, visitors: todayData?.visitors || 0 },
      last7: { views: last7.reduce((s: number, r: any) => s + r.views, 0), visitors: last7.reduce((s: number, r: any) => s + r.visitors, 0) },
      last30: { views: last30.reduce((s: number, r: any) => s + r.views, 0), visitors: last30.reduce((s: number, r: any) => s + r.visitors, 0) },
    };

    return c.json({ summary, daily: sorted.reverse() }); // chronological order
  } catch (error) {
    console.error('Analytics summary error:', error);
    return c.json({ error: 'Failed to fetch analytics', details: String(error) }, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// ██  ANDROID EARLY ACCESS
// ══════════════════════════════════════════════════════════════════════════════

// POST /early-access — public, stores email in KV
app.post('/early-access', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const email = (body.email || '').trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return c.json({ error: 'A valid email address is required.' }, 400);
    }

    const key = `early-access:${email}`;
    const existing = await kv.get(key);
    if (existing) {
      return c.json({ ok: true, duplicate: true });
    }

    await kv.set(key, { email, signedUpAt: new Date().toISOString() });
    console.log(`[EARLY-ACCESS] New signup: ${email}`);
    return c.json({ ok: true, duplicate: false });
  } catch (error) {
    console.error('Early access signup error:', error);
    return c.json({ error: 'Failed to save email. Please try again.', details: String(error) }, 500);
  }
});

// GET /early-access/count — public, returns only the signup count (no emails)
app.get('/early-access/count', async (c) => {
  try {
    const records = await kv.getByPrefix('early-access:');
    return c.json({ total: (records || []).length });
  } catch (error) {
    console.error('Early access count error:', error);
    return c.json({ total: 0, error: String(error) }, 500);
  }
});

// GET /early-access — admin-only, returns full list
app.get('/early-access', requireAuth, async (c) => {
  try {
    const records = await kv.getByPrefix('early-access:');
    const list = (records || []).sort((a: any, b: any) =>
      new Date(b.signedUpAt).getTime() - new Date(a.signedUpAt).getTime()
    );
    return c.json({ list, total: list.length });
  } catch (error) {
    console.error('Early access list error:', error);
    return c.json({ error: 'Failed to fetch list.', details: String(error) }, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// ██  DEEDS — UTILITY SPONSORSHIP INTEREST
// ══════════════════════════════════════════════════════════════════════════════

const DEEDS_UTILITIES = ['electricity', 'water', 'either'];

// POST /deeds-interest — public, records someone willing to cover a utility bill.
// Keyed on the phone digits so a repeat submission updates rather than piles up.
app.post('/deeds-interest', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const name = (body.name || '').trim();
    const phone = (body.phone || '').trim();
    const utility = (body.utility || '').trim().toLowerCase();

    if (!name) return c.json({ error: 'Please enter your name.' }, 400);
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) return c.json({ error: 'Please enter a valid phone number.' }, 400);
    if (!DEEDS_UTILITIES.includes(utility)) {
      return c.json({ error: 'Please choose which bill you would like to cover.' }, 400);
    }

    const key = `deeds-interest:${digits}`;
    const existing = await kv.get(key);
    const record = {
      id: digits,
      name,
      phone,
      utility,
      submittedAt: existing?.submittedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      contacted: existing?.contacted ?? false,
    };
    await kv.set(key, record);
    console.log(`[DEEDS] Interest from ${name} — ${utility}`);
    return c.json({ ok: true, duplicate: !!existing });
  } catch (error) {
    console.error('Deeds interest error:', error);
    return c.json({ error: 'Something went wrong. Please try again.', details: String(error) }, 500);
  }
});

// GET /deeds-interest — admin-only, full list (newest first)
app.get('/deeds-interest', requireAuth, async (c) => {
  try {
    const records = await kv.getByPrefix('deeds-interest:');
    const list = (records || []).sort((a: any, b: any) =>
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
    return c.json({ list, total: list.length });
  } catch (error) {
    console.error('Deeds interest list error:', error);
    return c.json({ error: 'Failed to fetch list.', details: String(error) }, 500);
  }
});

// PUT /deeds-interest/:id — admin-only, mark whether they've been reached
app.put('/deeds-interest/:id', requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const { contacted } = await c.req.json();
    if (typeof contacted !== 'boolean') return c.json({ error: 'Invalid status' }, 400);
    const existing = await kv.get(`deeds-interest:${id}`);
    if (!existing) return c.json({ error: 'Entry not found' }, 404);
    const updated = { ...existing, contacted, contactedAt: contacted ? new Date().toISOString() : undefined };
    await kv.set(`deeds-interest:${id}`, updated);
    return c.json({ success: true, entry: updated });
  } catch (error) {
    console.error('Deeds interest update error:', error);
    return c.json({ error: 'Failed to update entry', details: String(error) }, 500);
  }
});

// DELETE /deeds-interest/:id — admin-only
app.delete('/deeds-interest/:id', requireAuth, async (c) => {
  try {
    await kv.del(`deeds-interest:${c.req.param('id')}`);
    return c.json({ success: true });
  } catch (error) {
    console.error('Deeds interest delete error:', error);
    return c.json({ error: 'Failed to delete entry', details: String(error) }, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// ██  404 + SERVE
// ══════════════════════════════════════════════════════════════════════════════

app.notFound((c) => {
  return c.json({ error: 'Not found', path: c.req.path }, 404);
});

console.log('[BOOT] Routes registered, starting Deno.serve…', Date.now());

// Wrap Hono in a handler that guarantees CORS on every response,
// including OPTIONS preflight and any unhandled errors.
Deno.serve(async (req: Request) => {
  console.log(`[REQ] ${req.method} ${new URL(req.url).pathname}`);

  // Always handle OPTIONS preflight immediately
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const response = await app.fetch(req);
    // Clone headers so we can append CORS
    const newHeaders = new Headers(response.headers);
    for (const [k, v] of Object.entries(corsHeaders)) {
      newHeaders.set(k, v);
    }
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  } catch (err) {
    // Even on crash, return CORS headers so the browser can read the error
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});