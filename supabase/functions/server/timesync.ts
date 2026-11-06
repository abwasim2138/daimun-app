/**
 * Automatic iqama-time sync.
 *
 * Reads the schedule a masjid already publishes through a prayer-times
 * service and turns it into Daimun data: today's times update the base iqama
 * times, and upcoming changes become scheduled time changes — which is what
 * drives the existing day-before heads-up in the app.
 *
 * Only Fajr, Dhuhr, Asr and Isha are synced. Maghrib is left alone (Daimun
 * stores it as "adhan + N minutes"; sources print a different clock time every
 * day), and so is Jumuah.
 *
 * Deliberately free of Deno and KV so it can be run under Node against the
 * live sources.
 */

export type SyncPrayer = 'fajr' | 'dhuhr' | 'asr' | 'isha';
export const SYNC_PRAYERS: readonly SyncPrayer[] = ['fajr', 'dhuhr', 'asr', 'isha'];

export type Provider = 'themasjidapp' | 'athanplus';
export interface TimeSource {
  provider: Provider;
  id: string;
}

export interface SourceDay {
  date: string; // YYYY-MM-DD
  iqama: Partial<Record<SyncPrayer, string>>; // raw text as published
  adhan?: Partial<Record<SyncPrayer, string>>;
}

export interface SourceSchedule {
  label: string;
  days: SourceDay[];
  lastUpdated?: string;
}

export interface SyncPlan {
  today: string;
  /** Last date the source has usable times for, or null if none from today on. */
  coveredThrough: string | null;
  /** Prayers whose time today differs from Daimun's. */
  updateNow: { prayer: SyncPrayer; from: string; to: string }[];
  /** Future change points, first day of each new time. */
  upcoming: { prayer: SyncPrayer; time: string; date: string }[];
  warnings: string[];
}

export class SyncError extends Error {}

export const TIMEZONE = 'America/New_York';
export const SYNC_TAG = 'timesync';
const LOOKAHEAD_DAYS = 31;
const USER_AGENT = 'Mozilla/5.0 (compatible; DaimunBot/1.0; +https://daimun.app)';

const LABEL: Record<SyncPrayer, string> = { fajr: 'Fajr', dhuhr: 'Dhuhr', asr: 'Asr', isha: 'Isha' };

// Plausible iqama windows (minutes after midnight). Wide enough for every
// season in Florida; a value outside them is an AM/PM slip or a typo.
const RANGE: Record<SyncPrayer, [number, number]> = {
  fajr: [3 * 60 + 30, 9 * 60],
  dhuhr: [11 * 60 + 30, 15 * 60 + 30],
  asr: [14 * 60 + 30, 19 * 60 + 30],
  isha: [18 * 60, 23 * 60 + 59],
};

// ── Dates & times ────────────────────────────────────────────────────────

export function todayIn(tz = TIMEZONE, now = new Date()): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(now)
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}`;
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const isFriday = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay() === 5;

export const shortDate = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

/** Same parsing as the app's timeToMinutes; null instead of 0 when unparseable. */
export function toMinutes(t: string): number | null {
  const m = t.match(/^(\d{1,2}):(\d{2}) (AM|PM)$/);
  if (!m) return null;
  let h = +m[1] % 12;
  if (m[3] === 'PM') h += 12;
  return h * 60 + +m[2];
}

/**
 * Published text → the app's "6:40 AM" form, or null. Sources that omit
 * AM/PM (AthanPlus) get it from the prayer; the range check catches a wrong
 * guess.
 */
export function normalizeTime(raw: string, prayer: SyncPrayer): string | null {
  const m = String(raw).trim().match(/^(\d{1,2}):(\d{2})\s*(?:([AaPp])\.?\s*[Mm]\.?)?$/);
  if (!m) return null;
  const h = +m[1];
  if (h < 1 || h > 12 || +m[2] > 59) return null;
  const period = m[3]
    ? m[3].toUpperCase() === 'P' ? 'PM' : 'AM'
    : prayer === 'fajr' || (prayer === 'dhuhr' && h >= 10 && h <= 11) ? 'AM' : 'PM';
  return `${h}:${m[2]} ${period}`;
}

// ── Finding a masjid's source ────────────────────────────────────────────

/** Find a supported source in a pasted link or a website's HTML. */
export function findSource(text: string): TimeSource | null {
  const tma = text.match(/themasjidapp\.org\/([A-Za-z0-9_-]+)/);
  if (tma) return { provider: 'themasjidapp', id: tma[1] };
  const ap = text.match(/timing\.athanplus\.com\/[^"'\s]*?masjid_id=([A-Za-z0-9]+)/);
  if (ap) return { provider: 'athanplus', id: ap[1] };
  return null;
}

export function sourceUrl(s: TimeSource): string {
  return s.provider === 'themasjidapp'
    ? `https://themasjidapp.org/${encodeURIComponent(s.id)}/prayers`
    : `https://timing.athanplus.com/masjid/widgets/monthly?masjid_id=${encodeURIComponent(s.id)}&theme=2`;
}

async function getPage(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' } });
  if (!res.ok) throw new SyncError(`The schedule page returned an error (HTTP ${res.status}).`);
  return res.text();
}

// ── themasjidapp.org ─────────────────────────────────────────────────────

/**
 * themasjidapp keys iqamas by day of year (Jan 1 = 1) in a 365-slot calendar:
 * in leap years Feb 29 shares Feb 28's slot. Mirrors their own lookup.
 */
export function dayKey(date: string): number {
  const d = new Date(`${date}T00:00:00Z`);
  const y = d.getUTCFullYear();
  const doy = Math.round((d.getTime() - Date.UTC(y, 0, 1)) / 86_400_000) + 1;
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  return leap && doy > 59 ? doy - 1 : doy;
}

export function parseTheMasjidApp(html: string, from: string, days = LOOKAHEAD_DAYS): SourceSchedule {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new SyncError('Could not find the schedule on the page — its layout may have changed.');
  let masjid: any;
  try {
    masjid = JSON.parse(m[1])?.props?.pageProps?.masjid;
  } catch {
    throw new SyncError('The schedule data on the page could not be read.');
  }
  const iqamas = masjid?.iqamas;
  const keys = iqamas && typeof iqamas === 'object' ? Object.keys(iqamas).map(Number).filter(Number.isFinite) : [];
  if (!keys.length) throw new SyncError('The page has no iqama schedule.');

  // themasjidapp itself falls back to the last entry up to a year back, so a
  // masjid that stopped entering times keeps showing stale ones. Only trust
  // dates inside the span the masjid actually entered.
  const minKey = Math.min(...keys);
  const maxKey = Math.max(...keys);

  const out: SourceDay[] = [];
  for (let i = 0; i <= days; i++) {
    const date = addDays(from, i);
    const key = dayKey(date);
    if (key < minKey || key > maxKey) continue;
    const iqama: SourceDay['iqama'] = {};
    for (const p of SYNC_PRAYERS) {
      // Entries are sparse: a prayer appears only on the day its time changes.
      for (let k = key; k >= minKey; k--) {
        const e = iqamas[k];
        const v = e?.[p] ?? (p === 'dhuhr' ? e?.zuhr : undefined);
        if (v) {
          iqama[p] = String(v);
          break;
        }
      }
    }
    out.push({ date, iqama });
  }

  return {
    label: 'themasjidapp.org',
    days: out,
    lastUpdated: masjid.iqamasLastUpdatedAt ? new Date(masjid.iqamasLastUpdatedAt).toISOString() : undefined,
  };
}

// ── AthanPlus (Masjidal) monthly widget ──────────────────────────────────

const cellText = (c: string) =>
  c.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

export function parseAthanPlusMonth(html: string): SourceDay[] {
  // The page's own month comes from its "next month" link: …action=next&date=2026-10-01
  const ym = html.match(/action=next&(?:amp;)?date=(\d{4})-(\d{2})-\d{2}/);
  if (!ym) throw new SyncError('Could not tell which month the timetable shows — its layout may have changed.');

  const out: SourceDay[] = [];
  const seen = new Set<number>();
  for (const row of html.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) || []) {
    const cells = (row.match(/<td[^>]*>[\s\S]*?<\/td>/g) || []).map(cellText);
    // day | hijri | weekday | fajr adhan, iqama | sunrise | dhuhr a, i | asr a, i | maghrib | isha a, i
    if (cells.length !== 13) continue;
    const day = Number(cells[0]);
    if (!Number.isInteger(day) || day < 1 || day > 31 || seen.has(day) || !/\d:\d\d/.test(cells[3])) continue;
    seen.add(day);
    out.push({
      date: `${ym[1]}-${ym[2]}-${String(day).padStart(2, '0')}`,
      adhan: { fajr: cells[3], dhuhr: cells[6], asr: cells[8], isha: cells[11] },
      iqama: { fajr: cells[4], dhuhr: cells[7], asr: cells[9], isha: cells[12] },
    });
  }
  if (!out.length) throw new SyncError('The monthly timetable had no rows — its layout may have changed.');
  return out;
}

// ── Fetching ─────────────────────────────────────────────────────────────

export async function fetchSchedule(source: TimeSource, today: string): Promise<SourceSchedule> {
  const end = addDays(today, LOOKAHEAD_DAYS);

  if (source.provider === 'themasjidapp') {
    return parseTheMasjidApp(await getPage(sourceUrl(source)), today);
  }

  const base = sourceUrl(source);
  const days = parseAthanPlusMonth(await getPage(base));
  if (end.slice(0, 7) > today.slice(0, 7)) {
    try {
      // The widget's "next month" link: action=next with this month's first day.
      days.push(...parseAthanPlusMonth(await getPage(`${base}&action=next&date=${today.slice(0, 7)}-01`)));
    } catch {
      // Next month not posted yet — this month alone still covers today.
    }
  }
  return { label: 'AthanPlus', days: days.filter((d) => d.date >= today && d.date <= end) };
}

// ── Planning ─────────────────────────────────────────────────────────────

interface ScheduledChange {
  id: string;
  prayer: string;
  newTime: string;
  startDate: string;
  endDate?: string;
  reason?: string;
  source?: string;
}

const describe = (iq: any): string =>
  iq?.type === 'offset' ? `${iq.minutes} min after adhan` : iq?.time || '—';

/** The admin's own scheduled change (not one of ours) overriding this prayer today, if any. */
function manualOverride(mosque: any, prayer: SyncPrayer, today: string): ScheduledChange | null {
  const active = ((mosque.scheduledTimeChanges || []) as ScheduledChange[])
    .filter((c) => c.prayer === prayer && c.source !== SYNC_TAG && c.startDate <= today && (!c.endDate || c.endDate >= today))
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
  return active[0] || null;
}

/** What Daimun shows for this prayer today, ignoring the admin's own overrides. */
function baseToday(mosque: any, prayer: SyncPrayer, today: string): any {
  // A synced change dated today may not have been folded into the base yet.
  const ours = ((mosque.scheduledTimeChanges || []) as ScheduledChange[])
    .filter((c) => c.prayer === prayer && c.source === SYNC_TAG && c.startDate <= today)
    .sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
  return ours ? { type: 'fixed', time: ours.newTime } : mosque.iqamaTimes?.[prayer];
}

export function planSync(mosque: any, schedule: SourceSchedule, today: string): SyncPlan {
  const warnings: string[] = [];
  const series: Record<SyncPrayer, { date: string; time: string }[]> = { fajr: [], dhuhr: [], asr: [], isha: [] };
  // A bad value usually repeats for days (e.g. "8:45 AM" for Isha all month), so group them.
  const skipped = new Map<string, { p: SyncPrayer; raw: string; problem: string; dates: string[] }>();

  for (const day of [...schedule.days].sort((a, b) => a.date.localeCompare(b.date))) {
    if (day.date < today) continue;
    for (const p of SYNC_PRAYERS) {
      const raw = day.iqama[p];
      if (!raw || (p === 'dhuhr' && isFriday(day.date))) continue; // Friday's slot is Jumuah
      const time = normalizeTime(raw, p);
      const mins = time ? toMinutes(time) : null;
      let problem = mins === null ? 'is not a time' : mins < RANGE[p][0] || mins > RANGE[p][1] ? 'is outside the usual range' : '';
      if (!problem && day.adhan?.[p]) {
        const adhan = normalizeTime(day.adhan[p]!, p);
        const a = adhan ? toMinutes(adhan) : null;
        if (a !== null && (mins! < a || mins! - a > 120)) problem = `doesn't fit its adhan (${adhan})`;
      }
      if (problem) {
        const key = `${p}|${raw}|${problem}`;
        if (!skipped.has(key)) skipped.set(key, { p, raw, problem, dates: [] });
        skipped.get(key)!.dates.push(day.date);
        continue;
      }
      series[p].push({ date: day.date, time: time! });
    }
  }
  for (const s of skipped.values()) {
    const when = s.dates.length === 1
      ? shortDate(s.dates[0])
      : `${shortDate(s.dates[0])}–${shortDate(s.dates[s.dates.length - 1])}, ${s.dates.length} days`;
    warnings.push(`${LABEL[s.p]} "${s.raw}" ${s.problem} (${when}) — skipped.`);
  }

  const updateNow: SyncPlan['updateNow'] = [];
  const upcoming: SyncPlan['upcoming'] = [];

  for (const p of SYNC_PRAYERS) {
    const points = series[p];
    const current = baseToday(mosque, p, today);
    let prev = current?.type === 'fixed' ? current.time : null;

    if (points[0]?.date === today) {
      const override = manualOverride(mosque, p, today);
      if (override) {
        if (override.newTime !== points[0].time) {
          warnings.push(
            `${LABEL[p]}: your own schedule${override.reason ? ` "${override.reason}"` : ''} sets ${override.newTime}` +
              `${override.endDate ? ` until ${shortDate(override.endDate)}` : ''}; the source says ${points[0].time}. Left as is.`,
          );
        }
      } else if (prev !== points[0].time) {
        updateNow.push({ prayer: p, from: describe(current), to: points[0].time });
      }
      prev = points[0].time;
    }

    const changes: { date: string; time: string; was: string | null }[] = [];
    for (const pt of points) {
      if (pt.date === today) continue;
      if (pt.time !== prev) changes.push({ date: pt.date, time: pt.time, was: prev });
      prev = pt.time;
    }

    // A time that changes and changes straight back within a week is usually
    // a row the masjid forgot to update. Hold both halves rather than announce
    // a change that likely isn't happening.
    const held = new Set<number>();
    for (let i = 1; i < changes.length; i++) {
      const [a, b] = [changes[i - 1], changes[i]];
      if (b.time === a.was && (Date.parse(b.date) - Date.parse(a.date)) / 86_400_000 <= 7) {
        held.add(i - 1).add(i);
        warnings.push(
          `${LABEL[p]} goes ${a.was} → ${a.time} on ${shortDate(a.date)}, then back to ${b.time} on ${shortDate(b.date)}. ` +
            `That looks like a slip in the masjid's schedule, so it wasn't scheduled. If it's real, add it as a scheduled change.`,
        );
      }
    }
    changes.forEach((c, i) => {
      if (!held.has(i)) upcoming.push({ prayer: p, time: c.time, date: c.date });
    });
  }

  const covered = schedule.days.filter((d) => d.date >= today).map((d) => d.date).sort();
  upcoming.sort((a, b) => a.date.localeCompare(b.date) || SYNC_PRAYERS.indexOf(a.prayer) - SYNC_PRAYERS.indexOf(b.prayer));

  return { today, coveredThrough: covered.length ? covered[covered.length - 1] : null, updateNow, upcoming, warnings };
}

/**
 * Apply a plan to a mosque record. Returns the updated record, or null if
 * nothing changed (so a no-op run doesn't touch updatedAt).
 */
export function applyPlan(mosque: any, plan: SyncPlan, label: string): any | null {
  const iqamaTimes = { ...mosque.iqamaTimes };
  // Fold any of our changes already in effect into the base first, so
  // replacing our list below can't drop a time that's already showing.
  for (const p of SYNC_PRAYERS) {
    const b = baseToday(mosque, p, plan.today);
    if (b && b !== mosque.iqamaTimes?.[p]) iqamaTimes[p] = b;
  }
  for (const u of plan.updateNow) iqamaTimes[u.prayer] = { type: 'fixed', time: u.to };

  const theirs = ((mosque.scheduledTimeChanges || []) as ScheduledChange[]).filter((c) => c.source !== SYNC_TAG);

  const ours: ScheduledChange[] = plan.upcoming.map((u) => ({
    id: `sync-${u.date}-${u.prayer}`,
    prayer: u.prayer,
    newTime: u.time,
    startDate: u.date,
    reason: `Synced from ${label}`,
    source: SYNC_TAG,
  }));

  const next = { ...mosque, iqamaTimes, scheduledTimeChanges: [...theirs, ...ours] };
  const same =
    JSON.stringify(next.iqamaTimes) === JSON.stringify(mosque.iqamaTimes) &&
    JSON.stringify(next.scheduledTimeChanges) === JSON.stringify(mosque.scheduledTimeChanges || []);
  return same ? null : { ...next, updatedAt: new Date().toISOString() };
}
