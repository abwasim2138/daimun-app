import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, MessageCircle, ArrowDown, RotateCcw, CheckCircle, Loader } from 'lucide-react';
import { Mosque, IqamaTime } from '../App';
import { API_URL } from '../utils/api';
import { publicAnonKey } from '../utils/supabase/info';
import { calculateIqamaTimes } from '../utils/iqamaCalculator';
import type { VolunteerOpportunity } from './VolunteersPage';
import type { CharityLink } from './CharityPage';

// ── Knowledge base ──────────────────────────────────────────────────
interface KBEntry {
  keywords: string[];
  question: string;
  answer: string;
  category: string;
}

const KB: KBEntry[] = [
  {
    keywords: ['iqama', 'time', 'wrong', 'incorrect', 'fix', 'update', 'change'],
    question: 'Iqama times are wrong — how do I fix them?',
    answer: `You can ask me directly!\n\n• **"Set Fajr for [masjid name] to 6:30 AM"**\n• **"Set Maghrib for [masjid] to 10 minutes after adhan"**\n\nOr go to the masjid card → tap **Edit** → scroll to the Iqama Times section. Each prayer can be **fixed** (e.g. "7:30 PM") or **offset** (e.g. "+20 min after adhan").`,
    category: 'iqama',
  },
  {
    keywords: ['scheduled', 'change', 'future', 'advance', 'plan', 'override'],
    question: 'How do scheduled time changes work?',
    answer: `Scheduled changes let you set iqama times that kick in on a future date:\n\n1. Pick the prayer(s) and the new time\n2. Set the **effective date**\n3. Choose if it's **permanent** or **temporary** (reverts after a period)\n\nPermanent changes get "baked in" to the base iqama times when they mature. You'll see an amber banner in the edit form showing active overrides.`,
    category: 'iqama',
  },
  {
    keywords: ['calculation', 'method', 'isna', 'mwl', 'adhan', 'sunrise', 'sunset'],
    question: 'Adhan times seem off — calculation methods',
    answer: `Dāimūn calculates adhan using your masjid's coordinates. Methods:\n\n• **NorthAmerica (ISNA)** — 15° Fajr, 15° Isha\n• **MWL** — 18° Fajr, 17° Isha\n• **Egyptian** — 19.5° Fajr, 17.5° Isha\n• **UmmAlQura** — 18.5° Fajr, fixed 90 min Isha\n\nAsr: **Standard** (Shafi'i) or **Hanafi** (2× shadow). Change via chat: "Set asr method for [masjid] to Hanafi" or in the edit form under "Calculation Settings."`,
    category: 'iqama',
  },
  {
    keywords: ['add', 'new', 'mosque', 'masjid', 'create', 'register'],
    question: 'How do I add a new masjid?',
    answer: `From the admin dashboard, tap **"+ Masjid"** in the header. Fill in name, address (auto-geocodes), iqama times, calculation method, and optional Jumu'ah/WhatsApp settings. The masjid appears in the public listing immediately after saving.`,
    category: 'mosque',
  },
  {
    keywords: ['hide', 'hidden', 'visible', 'temporarily', 'visibility', 'show'],
    question: 'How do I hide/show a masjid?',
    answer: `You can ask me! Just say:\n\n• **"Hide [masjid name]"**\n• **"Show [masjid name]"**\n\nOr use the admin card → "Hide from users" toggle. Hidden masjids show an orange banner and can be restored anytime.`,
    category: 'mosque',
  },
  {
    keywords: ['scope', 'permission', 'access', 'scoped', 'admin', 'contributor', 'restricted'],
    question: 'How does admin scoping work?',
    answer: `**Super admins** (scope = null) can see ALL masjids. **Scoped admins** only see assigned masjids.\n\nScopes are stored in KV as \`admin-scope:{email}\`. Manage them from the **"Contributor Scopes"** panel at the bottom of the admin dashboard.\n\nIf someone can't see a masjid, their scope needs that masjid's ID added.`,
    category: 'admin',
  },
  {
    keywords: ['password', 'reset', 'forgot', 'login', 'locked', 'expired', 'token'],
    question: 'Password reset not working',
    answer: `The reset flow bypasses Supabase PKCE. Common issues:\n\n1. **Expired token** — user sees "Request New Link" modal\n2. **Email not arriving** — check Supabase Dashboard email template uses: \`https://daimun.app/?token_hash={{ .TokenHash }}&type=recovery\`\n3. **Manual setup needed** — Site URL, Redirect URLs, and Reset Password template all need configuring in Supabase Dashboard`,
    category: 'admin',
  },
  {
    keywords: ['deploy', 'edge', 'function', 'broken', 'down', '500', 'error'],
    question: 'Edge function / deployment issues',
    answer: `Common issues:\n\n1. **Missing \`--no-verify-jwt\`** — ALL requests fail with 401. The edge function MUST use this flag.\n2. **Cold starts** — first request can take 5-10s. The app retries with backoff.\n3. **500 errors** — check Supabase Dashboard → Edge Functions → Logs.\n4. **CORS** — the Hono server has CORS configured; make sure function is deployed to the correct project.`,
    category: 'tech',
  },
  {
    keywords: ['tv', 'display', 'screen', 'kiosk', 'digital', 'signage'],
    question: 'How to set up TV display',
    answer: `Open \`https://daimun.app/#/tv/{mosqueId}\` on your TV browser. Shows prayer times, Jumu'ah, announcements, and Ramadan tile.\n\n**Tips:** Chrome/Edge full-screen (F11), auto-refreshes data, respects system light/dark mode.`,
    category: 'display',
  },
  {
    keywords: ['ramadan', 'tarawih', 'iftar', 'suhoor', 'qiyam'],
    question: 'Ramadan mode setup',
    answer: `During Ramadan, Dāimūn activates: iftar countdown, TV Ramadan tile, daily hadith reminders, and per-masjid Ramadan program settings.\n\nYou can manage it all via chat:\n• "Ramadan program for [masjid]" — view current settings\n• "Enable tarawih for [masjid]"\n• "Set tarawih rakat for [masjid] to 20"\n• "Set tarawih time for [masjid] to 9:30 PM"\n• "Enable qiyam for [masjid]"\n• "Set qiyam time for [masjid] to 2:00 AM"\n• "Enable iftar for [masjid]"\n• "Set iftar notes for [masjid] to Fridays and weekends only"`,
    category: 'features',
  },
  {
    keywords: ['notification', 'push', 'reminder', 'service worker', 'bell'],
    question: 'Push notifications not working',
    answer: `Uses Web Push API with service worker. Common issues:\n\n• User hasn't granted permission\n• Browser doesn't support Push API (Safari iOS limited)\n• Service worker registration error — check console\n• Schedule reminders only fire the day before a change`,
    category: 'tech',
  },
  {
    keywords: ['analytics', 'stats', 'usage', 'views', 'traffic'],
    question: 'How analytics work',
    answer: `Three-layer system: page views, unique visitors (truncated SHA-256 fingerprint), city-level geo (IP → city via ipinfo.io, then IP discarded).\n\nViewable in the Analytics section at the bottom of admin dashboard (loads on expand). No PII stored.`,
    category: 'analytics',
  },
  {
    keywords: ['suggestion', 'health', 'score', 'stability', 'action needed'],
    question: 'Health scores and suggestions explained',
    answer: `Each masjid gets a stability score (0-100) based on freshness, validation, and issues.\n\n• Red **Urgent** — iqama before adhan, missing data\n• Yellow **Warning** — stale data, large time gaps\n• Blue **Info** — tips and suggestions\n\nDismiss addressed items — they're stored locally.`,
    category: 'analytics',
  },
  {
    keywords: ['volunteer', 'volunteers', 'community service'],
    question: 'Volunteers feature',
    answer: `Public page (#/volunteers) + admin CRUD. Manage via chat:\n\n• **"List volunteers"** — see all opportunities\n• **"Add volunteer [title] at [url]"** — create new\n• **"Add volunteer [title] at [url] for [masjid]"** — masjid-specific\n• **"Delete volunteer [title]"** — remove by name\n\nOr use the Volunteers section in the admin dashboard.`,
    category: 'features',
  },
  {
    keywords: ['charity', 'donation', 'give', 'zakat', 'sadaqah'],
    question: 'Charity / Donations feature',
    answer: `Public page (#/charity) + admin CRUD. Manage via chat:\n\n• **"List charities"** — see all links\n• **"Add charity [title] at [url]"** — create new\n• **"Add charity [title] at [url] category zakat"** — with category\n• **"Add charity [title] at [url] category sadaqah for [masjid]"** — masjid-specific\n• **"Delete charity [title]"** — remove by name\n\nCategories: zakat, sadaqah, building-fund, zakat-ul-fitr, other.`,
    category: 'features',
  },
  {
    keywords: ['share', 'link', 'url', 'landing page', 'masjid page'],
    question: 'Shareable links / landing pages',
    answer: `Each masjid has a landing page at \`https://daimun.app/?masjid={id}\` with geometric SVG hero, prayer times, events.\n\nShare button uses \`navigator.share()\` / clipboard fallback. \`?page=\` query param supports hash-free deep links.`,
    category: 'features',
  },
  {
    keywords: ['khateeb', 'khatib', 'imam', 'speaker', 'friday speaker', 'sms'],
    question: 'Khateeb management',
    answer: `Manage Friday khutbah speakers: add/edit/delete khateebs, assign to dates, send SMS reminders. Persisted via KV. Phone numbers need country code.`,
    category: 'events',
  },
  {
    keywords: ['logo', 'image', 'upload', 'svg', 'monochrome'],
    question: 'Masjid logo upload',
    answer: `Uploaded images are auto-traced to monochrome SVG (canvas-based, Otsu's threshold). Results are crisp at any size and respect light/dark mode.\n\n**Tip:** Use high-contrast images with clean white/transparent backgrounds.`,
    category: 'mosque',
  },
  {
    keywords: ['janaza', 'funeral', 'death'],
    question: 'Janaza alerts',
    answer: `Tap **"+ Janaza"** in the admin header. Janaza alerts show as prominent cards on the home screen for ALL users. Include deceased's name, hosting masjid, date/time, and notes.`,
    category: 'events',
  },
  {
    keywords: ['bug', 'report', 'correction', 'community report', 'feedback'],
    question: 'Community reports and corrections',
    answer: `Users submit Time Corrections ("this iqama is wrong") and Bug Reports (general issues), both with CAPTCHA. View in the Community Reports section — pending/resolved states with badge counts.`,
    category: 'admin',
  },
  {
    keywords: ['dark mode', 'light mode', 'theme', 'color'],
    question: 'Theming / dark mode',
    answer: `Follows system preference by default. Warm tan/parchment palette in light mode. Users can toggle manually. TV display also respects the system preference.`,
    category: 'tech',
  },
  {
    keywords: ['whatsapp', 'channel', 'link'],
    question: 'WhatsApp channel setup',
    answer: `You can set it via chat: **"Set whatsapp for [masjid] to https://..."**\n\nOr in the edit form, paste the WhatsApp channel/group URL into the "WhatsApp Channel" field. Shows a WhatsApp icon on the masjid card.`,
    category: 'features',
  },
  {
    keywords: ['blank', 'white screen', 'loading', 'stuck', 'spinner'],
    question: 'App stuck loading / white screen',
    answer: `Usually: edge function cold start (wait 10-15s, refresh), network issue, JS error (check console F12), or cache issue (hard refresh Ctrl+Shift+R).\n\nIf persistent, check Supabase Dashboard → Edge Functions → Logs.`,
    category: 'tech',
  },
  {
    keywords: ['address', 'location', 'coordinates', 'geocode', 'wrong location'],
    question: 'Wrong masjid location',
    answer: `Address auto-geocodes to lat/lng. For wrong pins: enter full address (street, city, state, ZIP), re-save to re-geocode, check coordinates below the address field. Accuracy matters for adhan calculation and distance sorting.`,
    category: 'mosque',
  },
  {
    keywords: ['access', 'request', 'approve', 'new admin', 'create account'],
    question: 'Approving access requests',
    answer: `In Community Reports → Requests tab:\n1. Select masjid scope for the person\n2. **Create Account** — signs them up, saves scope, sends password reset email\n3. Or **Dismiss** to remove\n\nNew admin gets email to set their own password.`,
    category: 'admin',
  },
  {
    keywords: ['offered', 'prayers', 'skip', 'partial'],
    question: 'Offered prayers setting',
    answer: `Some masjids don't hold all 5 prayers (e.g. workplace musallah). "Offered Prayers" marks which prayers are conducted. Un-offered prayers show as "—" and aren't in next-prayer calculations.`,
    category: 'mosque',
  },
  {
    keywords: ['qibla', 'compass', 'direction'],
    question: 'Qibla compass',
    answer: `Uses GPS + magnetometer to point toward Ka'bah. If compass spins wildly, calibrate by moving device in figure-8 pattern.`,
    category: 'features',
  },
  {
    keywords: ['jumuah', 'friday', 'jummah', 'khutbah', 'multiple'],
    question: "Jumu'ah times setup",
    answer: `You can manage via chat:\n• **"Jumuah times for [masjid]"** — view current times\n• **"Set jumuah for [masjid] to 1:00 PM and 2:00 PM"**\n\nOr in the edit form → Jumu'ah section, add multiple time slots. These show on the masjid detail page and TV display.`,
    category: 'iqama',
  },
  {
    keywords: ['validation', 'before', 'adhan', 'too early', 'too late'],
    question: 'Iqama validation warnings',
    answer: `Dāimūn warns if iqama is before adhan (likely a mistake) or very far after adhan (possible typo). These are warnings, not blockers. Check fixed vs. offset config if unexpected.`,
    category: 'iqama',
  },
  {
    keywords: ['auth', 'authentication', 'sign in', 'session', 'jwt'],
    question: 'How authentication works',
    answer: `Supabase Auth with local JWT decode (no round-trip). \`requireAuth\` middleware decodes via base64, checks \`role === 'authenticated'\` and \`exp > now\`.\n\nEdge function MUST use \`--no-verify-jwt\` (mixed public/private routes). If auth breaks after deploy, check this flag.`,
    category: 'admin',
  },
];

// ── Prayer name normalization ─────────────────────────────────────
const PRAYER_ALIASES: Record<string, 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'> = {
  fajr: 'fajr', fajar: 'fajr', fajir: 'fajr', dawn: 'fajr', subh: 'fajr', sobh: 'fajr',
  dhuhr: 'dhuhr', zuhr: 'dhuhr', duhr: 'dhuhr', duhur: 'dhuhr', thuhr: 'dhuhr', noon: 'dhuhr', dhur: 'dhuhr', zohar: 'dhuhr', zohr: 'dhuhr',
  asr: 'asr', asar: 'asr', afternoon: 'asr',
  maghrib: 'maghrib', magrib: 'maghrib', maghreb: 'maghrib', magreb: 'maghrib', sunset: 'maghrib',
  isha: 'isha', ishaa: 'isha', esha: 'isha', night: 'isha',
};

// ── Field aliases for generic field operations ────────────────────
interface FieldDef {
  path: string;
  type: 'string' | 'boolean' | 'number' | 'time' | 'rakat';
  label: string;
}

const FIELD_ALIASES: Record<string, FieldDef> = {
  // Top-level strings
  website: { path: 'website', type: 'string', label: 'Website' },
  site: { path: 'website', type: 'string', label: 'Website' },
  whatsapp: { path: 'whatsappChannel', type: 'string', label: 'WhatsApp Channel' },
  'whatsapp channel': { path: 'whatsappChannel', type: 'string', label: 'WhatsApp Channel' },
  note: { path: 'note', type: 'string', label: 'Note' },
  notes: { path: 'note', type: 'string', label: 'Note' },
  // Calculation
  'calculation method': { path: 'calculationMethod', type: 'string', label: 'Calculation Method' },
  'calc method': { path: 'calculationMethod', type: 'string', label: 'Calculation Method' },
  method: { path: 'calculationMethod', type: 'string', label: 'Calculation Method' },
  'asr method': { path: 'asrMethod', type: 'string', label: 'Asr Method' },
  'asr calculation': { path: 'asrMethod', type: 'string', label: 'Asr Method' },
  // Ramadan booleans
  tarawih: { path: 'ramadanProgram.tarawih', type: 'boolean', label: 'Tarawih' },
  taraweeh: { path: 'ramadanProgram.tarawih', type: 'boolean', label: 'Tarawih' },
  iftar: { path: 'ramadanProgram.iftarProvided', type: 'boolean', label: 'Iftar Provided' },
  'iftar provided': { path: 'ramadanProgram.iftarProvided', type: 'boolean', label: 'Iftar Provided' },
  'iftar every night': { path: 'ramadanProgram.iftarEveryNight', type: 'boolean', label: 'Iftar Every Night' },
  itikaf: { path: 'ramadanProgram.itikaf', type: 'boolean', label: "I'tikaf" },
  "i'tikaf": { path: 'ramadanProgram.itikaf', type: 'boolean', label: "I'tikaf" },
  itikaaf: { path: 'ramadanProgram.itikaf', type: 'boolean', label: "I'tikaf" },
  qiyam: { path: 'ramadanProgram.qiyam', type: 'boolean', label: 'Qiyam al-Layl' },
  'qiyam al layl': { path: 'ramadanProgram.qiyam', type: 'boolean', label: 'Qiyam al-Layl' },
  'qiyam ul layl': { path: 'ramadanProgram.qiyam', type: 'boolean', label: 'Qiyam al-Layl' },
  'khatm quran': { path: 'ramadanProgram.khatmQuran', type: 'boolean', label: 'Khatm al-Quran' },
  khatm: { path: 'ramadanProgram.khatmQuran', type: 'boolean', label: 'Khatm al-Quran' },
  'quran completion': { path: 'ramadanProgram.khatmQuran', type: 'boolean', label: 'Khatm al-Quran' },
  // Ramadan times/strings
  'tarawih time': { path: 'ramadanProgram.tarawihTime', type: 'time', label: 'Tarawih Time' },
  'tarawih rakat': { path: 'ramadanProgram.tarawihRakat', type: 'rakat', label: 'Tarawih Rakat' },
  'taraweeh rakat': { path: 'ramadanProgram.tarawihRakat', type: 'rakat', label: 'Tarawih Rakat' },
  rakat: { path: 'ramadanProgram.tarawihRakat', type: 'rakat', label: 'Tarawih Rakat' },
  'qiyam time': { path: 'ramadanProgram.qiyamTime', type: 'time', label: 'Qiyam Time' },
  'iftar notes': { path: 'ramadanProgram.iftarNotes', type: 'string', label: 'Iftar Notes' },
  'khatm date': { path: 'ramadanProgram.khatmQuranDate', type: 'string', label: 'Khatm Date' },
  'khatm quran date': { path: 'ramadanProgram.khatmQuranDate', type: 'string', label: 'Khatm Date' },
};

const CALC_METHOD_ALIASES: Record<string, string> = {
  isna: 'NorthAmerica', 'north america': 'NorthAmerica', northamerica: 'NorthAmerica', na: 'NorthAmerica',
  mwl: 'MuslimWorldLeague', 'muslim world league': 'MuslimWorldLeague',
  egyptian: 'Egyptian', egypt: 'Egyptian',
  'umm al qura': 'UmmAlQura', ummalqura: 'UmmAlQura', makkah: 'UmmAlQura',
  karachi: 'Karachi',
};

const ASR_METHOD_ALIASES: Record<string, 'Standard' | 'Hanafi'> = {
  standard: 'Standard', shafi: 'Standard', "shafi'i": 'Standard', shafii: 'Standard',
  hanafi: 'Hanafi',
};

// ── Helpers ───────────────────────────────────────────────────────
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}

function buildMergedUpdate(mosque: Mosque, path: string, value: any): any {
  if (path.startsWith('ramadanProgram.')) {
    const subKey = path.replace('ramadanProgram.', '');
    return { ramadanProgram: { ...(mosque.ramadanProgram || {}), [subKey]: value } };
  }
  return { [path]: value };
}

function formatJumuahTimes(jumuah: any): string {
  if (!jumuah) return '—';
  if (typeof jumuah === 'string') return jumuah;
  if (Array.isArray(jumuah)) {
    return jumuah.map((j: any) => {
      if (typeof j === 'string') return j;
      if (j?.time) return j.time + (j.label ? ` (${j.label})` : '');
      if (j?.type === 'fixed') return j.time || '—';
      return '—';
    }).join(', ') || '—';
  }
  if (jumuah.time) return jumuah.time + (jumuah.label ? ` (${jumuah.label})` : '');
  if (jumuah.type === 'fixed') return jumuah.time || '—';
  return '—';
}

function formatBool(val: any): string {
  if (val === true) return 'Yes';
  if (val === false) return 'No';
  return '—';
}

// ── Fuzzy mosque name matching ────────────────────────────────────
function normalizeForMatch(str: string): string {
  return str
    .toLowerCase()
    .replace(/masjid|mosque|islamic center|center|al-|al |the |musallah/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function fuzzyMatchMosque(query: string, mosques: Mosque[]): Mosque | null {
  const q = query.toLowerCase().trim();

  const exact = mosques.find(m => m.name.toLowerCase() === q);
  if (exact) return exact;

  const contains = mosques.find(m => m.name.toLowerCase().includes(q) || q.includes(m.name.toLowerCase()));
  if (contains) return contains;

  const qNorm = normalizeForMatch(q);
  if (qNorm.length < 2) return null;

  let bestMatch: Mosque | null = null;
  let bestScore = 0;

  for (const m of mosques) {
    const mNorm = normalizeForMatch(m.name);

    if (mNorm.includes(qNorm) || qNorm.includes(mNorm)) {
      const score = Math.min(qNorm.length, mNorm.length) / Math.max(qNorm.length, mNorm.length);
      if (score > bestScore) { bestScore = score; bestMatch = m; }
    }

    const qWords = q.split(/\s+/).filter(w => w.length > 1);
    const mWords = m.name.toLowerCase().split(/\s+/);
    const overlap = qWords.filter(w => mWords.some(mw => mw.includes(w) || w.includes(mw))).length;
    const score = overlap / Math.max(qWords.length, 1);
    if (score > bestScore && score >= 0.3) { bestScore = score; bestMatch = m; }
  }

  return bestMatch;
}

// ── Time parsing ──────────────────────────────────────────────────
function parseTimeString(input: string): { type: 'fixed'; time: string } | { type: 'offset'; minutes: number } | null {
  const s = input.trim().toLowerCase();

  const offsetMatch = s.match(/^\+?(\d+)\s*(minutes?|mins?|min)?\s*(after\s*(adhan|athan))?$/i)
    || s.match(/^(\d+)\s*(minutes?|mins?|min)\s*(after\s*(adhan|athan)?)$/i);
  if (offsetMatch) return { type: 'offset', minutes: parseInt(offsetMatch[1]) };

  let timeStr = s.replace(/\s+/g, ' ').trim();

  const compactMatch = timeStr.match(/^(\d{3,4})\s*(am|pm)$/i);
  if (compactMatch) {
    const digits = compactMatch[1];
    const period = compactMatch[2].toUpperCase();
    timeStr = digits.length === 3
      ? `${digits[0]}:${digits.slice(1)} ${period}`
      : `${digits.slice(0, 2)}:${digits.slice(2)} ${period}`;
  }

  const stdMatch = timeStr.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
  if (stdMatch) {
    let hour = parseInt(stdMatch[1]);
    const minute = stdMatch[2];
    const period = stdMatch[3]?.toUpperCase();

    if (period) {
      if (hour > 12 || hour < 1) return null;
      return { type: 'fixed', time: `${hour}:${minute} ${period}` };
    } else {
      if (hour > 23) return null;
      const ampm = hour >= 12 ? 'PM' : 'AM';
      if (hour === 0) hour = 12;
      else if (hour > 12) hour -= 12;
      return { type: 'fixed', time: `${hour}:${minute} ${ampm}` };
    }
  }

  return null;
}

// ── Field matching helper ─────────────────────────────────────────
function matchField(text: string): FieldDef | null {
  const lower = text.toLowerCase().trim();
  const sortedAliases = Object.keys(FIELD_ALIASES).sort((a, b) => b.length - a.length);
  for (const alias of sortedAliases) {
    if (lower === alias || lower.includes(alias)) return FIELD_ALIASES[alias];
  }
  return null;
}

// ── Charity category aliases ──────────────────────────────────────
const CHARITY_CATEGORY_ALIASES: Record<string, string> = {
  zakat: 'zakat', zakaat: 'zakat',
  sadaqah: 'sadaqah', sadaqa: 'sadaqah', charity: 'sadaqah',
  'building fund': 'building-fund', 'building-fund': 'building-fund', building: 'building-fund', construction: 'building-fund', masjid: 'building-fund',
  'zakat ul fitr': 'zakat-ul-fitr', 'zakat-ul-fitr': 'zakat-ul-fitr', 'zakat al fitr': 'zakat-ul-fitr', fitrana: 'zakat-ul-fitr', fitra: 'zakat-ul-fitr',
  other: 'other', general: 'other',
};

// ── Parse "add volunteer/charity" free-form text ─────────────────
function parseResourceCreate(resourceType: 'volunteer' | 'charity', text: string, mosques: Mosque[]): Intent {
  // Try to extract: title, link (URL), optional "for [mosque]", optional "category [cat]"
  // The URL is the most reliable anchor point
  const urlMatch = text.match(/(https?:\/\/[^\s,]+)/i);
  const link = urlMatch ? urlMatch[1] : '';

  let remaining = text;
  if (urlMatch) remaining = remaining.replace(urlMatch[0], '|||URL|||');

  // Extract "for [mosque]" from the end
  let mosqueName: string | undefined;
  const forMatch = remaining.match(/\s+(?:for|at)\s+(.+?)$/i);
  if (forMatch) {
    const candidate = forMatch[1].trim();
    // Only treat as mosque if it fuzzy-matches
    if (fuzzyMatchMosque(candidate, mosques)) {
      mosqueName = candidate;
      remaining = remaining.replace(forMatch[0], '');
    }
  }

  // Extract category (charity only)
  let category: string | undefined;
  if (resourceType === 'charity') {
    const catMatch = remaining.match(/\s+(?:category|cat|type)[:\s]+(\S+)/i);
    if (catMatch) {
      const catAlias = CHARITY_CATEGORY_ALIASES[catMatch[1].toLowerCase()];
      if (catAlias) category = catAlias;
      remaining = remaining.replace(catMatch[0], '');
    }
  }

  // Extract description if present: "description: ..." or "desc: ..."
  let description: string | undefined;
  const descMatch = remaining.match(/\s+(?:description|desc)[:\s]+(.+?)(?=\s+(?:link|at|category|for)\s|$)/i);
  if (descMatch) {
    description = descMatch[1].trim();
    remaining = remaining.replace(descMatch[0], '');
  }

  // Whatever is left (minus URL placeholder, "at", "link:") is the title
  let title = remaining
    .replace('|||URL|||', '')
    .replace(/\s+(?:at|link[:\s])\s*/gi, ' ')
    .replace(/[,;]\s*/g, ' ')
    .trim();

  // Clean up quotes
  title = title.replace(/^["']|["']$/g, '').trim();

  if (resourceType === 'charity') {
    return { type: 'add_charity', title, link, description, category, mosqueName };
  }
  return { type: 'add_volunteer', title, link, description, mosqueName };
}

// ── Intent detection ──────────────────────────────────────────────
type Intent =
  | { type: 'update_iqama'; prayer: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'; mosqueName: string; newTime: IqamaTime }
  | { type: 'update_field'; mosqueName: string; fieldDef: FieldDef; newValue: any; displayValue: string }
  | { type: 'update_jumuah'; mosqueName: string; times: string[] }
  | { type: 'update_offered_prayers'; mosqueName: string; prayers: ('fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha')[] }
  | { type: 'clear_field'; mosqueName: string; fieldDef: FieldDef }
  | { type: 'hide_mosque'; mosqueName: string }
  | { type: 'show_mosque'; mosqueName: string }
  | { type: 'view_times'; mosqueName: string }
  | { type: 'view_info'; mosqueName: string; focus?: 'ramadan' | 'settings' | 'jumuah' | 'events' | 'scheduled' | 'all' }
  | { type: 'list_mosques' }
  | { type: 'list_volunteers'; mosqueName?: string }
  | { type: 'add_volunteer'; title: string; link: string; description?: string; mosqueName?: string }
  | { type: 'delete_volunteer'; title: string }
  | { type: 'list_charities'; mosqueName?: string }
  | { type: 'add_charity'; title: string; link: string; description?: string; category?: string; mosqueName?: string }
  | { type: 'delete_charity'; title: string }
  | { type: 'knowledge_query'; query: string }
  | { type: 'unknown'; query: string };

function detectIntent(input: string, mosques: Mosque[]): Intent {
  const s = input.trim();
  const lower = s.toLowerCase();

  // ── List mosques ──
  if (/^(list|show|what are)\s*(all\s*)?(the\s*)?(mosques|masjids?|masajid)/i.test(lower) ||
      /^(how many|which)\s*(mosques|masjids?|masajid)/i.test(lower)) {
    return { type: 'list_mosques' };
  }

  // ── Volunteers ──
  // List: "list volunteers", "show volunteers", "volunteers for [mosque]"
  if (/^(?:list|show|what are|get)\s+(?:all\s+)?(?:the\s+)?volunteers?(?:\s+opportunities?)?$/i.test(lower)) {
    return { type: 'list_volunteers' };
  }
  const volForMatch = lower.match(/(?:volunteers?|volunteer opportunities?)\s+(?:for|at|of|in)\s+(.+)/i)
    || lower.match(/(?:list|show|get|what are)\s+(?:the\s+)?(?:volunteers?|volunteer opportunities?)\s+(?:for|at|of|in)\s+(.+)/i);
  if (volForMatch) {
    return { type: 'list_volunteers', mosqueName: volForMatch[1].trim() };
  }
  // Add: "add volunteer [title] at [url]", "add volunteer [title] at [url] for [mosque]"
  //       "create volunteer: [title], link: [url]"
  const addVolMatch = lower.match(/(?:add|create|new)\s+(?:a\s+)?volunteer(?:\s+opportunity)?[:\s]+(.+)/i);
  if (addVolMatch) {
    const rest = s.slice(s.toLowerCase().indexOf(addVolMatch[1].charAt(0)));  // preserve original casing
    return parseResourceCreate('volunteer', rest, mosques);
  }
  // Delete: "delete volunteer [title]", "remove volunteer [title]"
  const delVolMatch = lower.match(/(?:delete|remove)\s+(?:the\s+)?volunteer(?:\s+opportunity)?[:\s]+(.+)/i)
    || lower.match(/(?:delete|remove)\s+(?:the\s+)?volunteer(?:\s+opportunity)?\s+(?:called|named|titled)?\s*["']?(.+?)["']?$/i);
  if (delVolMatch) {
    return { type: 'delete_volunteer', title: delVolMatch[1].trim().replace(/^["']|["']$/g, '') };
  }

  // ── Charities ──
  // List: "list charities", "show charity links", "charities for [mosque]"
  if (/^(?:list|show|what are|get)\s+(?:all\s+)?(?:the\s+)?(?:charit(?:y|ies)|donation(?:s)?|give)(?:\s+links?)?$/i.test(lower)) {
    return { type: 'list_charities' };
  }
  const charForMatch = lower.match(/(?:charit(?:y|ies)|donation(?:s)?)\s+(?:for|at|of|in)\s+(.+)/i)
    || lower.match(/(?:list|show|get|what are)\s+(?:the\s+)?(?:charit(?:y|ies)|donation(?:s)?)\s+(?:for|at|of|in)\s+(.+)/i);
  if (charForMatch) {
    return { type: 'list_charities', mosqueName: charForMatch[1].trim() };
  }
  // Add: "add charity [title] at [url]", "add charity [title] at [url] category zakat for [mosque]"
  const addCharMatch = lower.match(/(?:add|create|new)\s+(?:a\s+)?(?:charity|donation)(?:\s+(?:link|campaign))?[:\s]+(.+)/i);
  if (addCharMatch) {
    const rest = s.slice(s.toLowerCase().indexOf(addCharMatch[1].charAt(0)));
    return parseResourceCreate('charity', rest, mosques);
  }
  // Delete: "delete charity [title]", "remove charity [title]"
  const delCharMatch = lower.match(/(?:delete|remove)\s+(?:the\s+)?(?:charity|donation)(?:\s+(?:link|campaign))?[:\s]+(.+)/i)
    || lower.match(/(?:delete|remove)\s+(?:the\s+)?(?:charity|donation)(?:\s+(?:link|campaign))?\s+(?:called|named|titled)?\s*["']?(.+?)["']?$/i);
  if (delCharMatch) {
    return { type: 'delete_charity', title: delCharMatch[1].trim().replace(/^["']|["']$/g, '') };
  }

  // ── View info / details ──
  const viewInfoMatch = lower.match(/(?:info|details?|settings?|everything|all data|full info|all info|about|tell me about|describe)\s+(?:for|about|of|on|at|in)\s+(.+)/i)
    || lower.match(/(?:what(?:'s| is| are)|show me|get|view|check|display)\s+(?:the\s+)?(?:info|details?|settings?|config(?:uration)?|data)\s+(?:for|at|of|in)\s+(.+)/i);
  if (viewInfoMatch) {
    return { type: 'view_info', mosqueName: viewInfoMatch[1].trim(), focus: 'all' };
  }

  // ── Ramadan program view ──
  const ramadanViewMatch = lower.match(/(?:ramadan|ramadhan)\s+(?:program|info|settings?|details?|status)\s+(?:for|at|of|in)\s+(.+)/i)
    || lower.match(/(?:what(?:'s| is| are)|show|get|view|check)\s+(?:the\s+)?(?:ramadan|ramadhan)\s+(?:program|info|settings?|details?)?\s*(?:for|at|of|in)\s+(.+)/i);
  if (ramadanViewMatch) {
    return { type: 'view_info', mosqueName: ramadanViewMatch[1].trim(), focus: 'ramadan' };
  }

  // ── "does [mosque] have [field]" ──
  const doesHaveMatch = lower.match(/(?:does|do|is|has|have)\s+(.+?)\s+(?:have|offer|do|hold|provide|host|serve)\s+(tarawih|taraweeh|iftar|itikaf|i'tikaf|itikaaf|qiyam|qiyam al layl|khatm|khatm quran|quran completion)/i);
  if (doesHaveMatch) {
    return { type: 'view_info', mosqueName: doesHaveMatch[1].trim(), focus: 'ramadan' };
  }
  // reverse: "is qiyam enabled for [mosque]"
  const isFieldForMatch = lower.match(/(?:is|are|does)\s+(tarawih|taraweeh|iftar|itikaf|i'tikaf|itikaaf|qiyam|khatm)\s+(?:enabled|available|on|set|active|offered|provided)\s+(?:for|at|in)\s+(.+)/i);
  if (isFieldForMatch) {
    return { type: 'view_info', mosqueName: isFieldForMatch[2].trim(), focus: 'ramadan' };
  }

  // ── "what's the [field] for [mosque]" ──
  const whatFieldMatch = lower.match(/(?:what(?:'s| is| are)|show|get|check)\s+(?:the\s+)?(website|whatsapp|whatsapp channel|note|notes|calculation method|calc method|method|asr method|tarawih time|tarawih rakat|qiyam time|iftar notes|khatm date|offered prayers)\s+(?:for|at|of|in)\s+(.+)/i);
  if (whatFieldMatch) {
    return { type: 'view_info', mosqueName: whatFieldMatch[2].trim(), focus: 'all' };
  }

  // ── Jumuah view ──
  const jumuahViewMatch = lower.match(/(?:jumuah|jummah|jumu'ah|friday|juma)\s+(?:times?|schedule|info)\s+(?:for|at|of|in)\s+(.+)/i)
    || lower.match(/(?:what(?:'s| is| are)|show|get|view|check)\s+(?:the\s+)?(?:jumuah|jummah|jumu'ah|friday|juma)\s+(?:times?|schedule)?\s*(?:for|at|of|in)\s+(.+)/i);
  if (jumuahViewMatch) {
    return { type: 'view_info', mosqueName: jumuahViewMatch[1].trim(), focus: 'jumuah' };
  }

  // ── Events view ──
  const eventsViewMatch = lower.match(/(?:events?|announcements?|programs?)\s+(?:for|at|of|in)\s+(.+)/i)
    || lower.match(/(?:what(?:'s| is| are)|show|get|view|list|check)\s+(?:the\s+)?(?:events?|announcements?)\s+(?:for|at|of|in)\s+(.+)/i)
    || lower.match(/(?:what events? does|does .+ have events?|any events? (?:for|at))\s+(.+?)(?:\s+have)?$/i);
  if (eventsViewMatch) {
    return { type: 'view_info', mosqueName: eventsViewMatch[1].trim(), focus: 'events' };
  }

  // ── Scheduled changes view ──
  const schedViewMatch = lower.match(/(?:scheduled?\s*(?:time\s*)?changes?|upcoming changes?|pending changes?|overrides?)\s+(?:for|at|of|in)\s+(.+)/i)
    || lower.match(/(?:what(?:'s| is| are)|show|get|view|list|check)\s+(?:the\s+)?(?:scheduled?\s*(?:time\s*)?changes?|overrides?)\s+(?:for|at|of|in)\s+(.+)/i);
  if (schedViewMatch) {
    return { type: 'view_info', mosqueName: schedViewMatch[1].trim(), focus: 'scheduled' };
  }

  // ── "Where is [mosque]" / address query ──
  const whereMatch = lower.match(/(?:where is|where's|location of|address of|address for)\s+(.+)/i)
    || lower.match(/(?:what(?:'s| is)|show|get)\s+(?:the\s+)?(?:address|location)\s+(?:for|of|at)\s+(.+)/i);
  if (whereMatch) {
    return { type: 'view_info', mosqueName: whereMatch[1].trim(), focus: 'all' };
  }

  // ── "When was [mosque] last updated" ──
  const lastUpdatedMatch = lower.match(/(?:when was|last updated|last update|update(?:d)? at|freshness)\s+(?:for\s+)?(.+?)(?:\s+(?:last\s+)?updated)?$/i)
    || lower.match(/(?:when|how (?:recently|long ago))\s+(?:was\s+)?(.+?)\s+(?:last\s+)?updated/i);
  if (lastUpdatedMatch) {
    return { type: 'view_info', mosqueName: lastUpdatedMatch[1].trim(), focus: 'all' };
  }

  // ── Clear/remove a field ──
  // "clear note for [mosque]", "remove whatsapp for [mosque]", "delete note for [mosque]"
  const clearFieldMatch = lower.match(/(?:clear|remove|delete|reset|unset|wipe)\s+(?:the\s+)?(website|whatsapp|whatsapp channel|note|notes|iftar notes|tarawih time|qiyam time|khatm date|khatm quran date)\s+(?:for|at|of|in|from)\s+(.+)/i);
  if (clearFieldMatch) {
    const fieldDef = matchField(clearFieldMatch[1].trim());
    if (fieldDef) {
      return { type: 'clear_field', mosqueName: clearFieldMatch[2].trim(), fieldDef };
    }
  }

  // "clear jumuah for [mosque]", "remove jumuah times for [mosque]"
  const clearJumuahMatch = lower.match(/(?:clear|remove|delete|reset|unset)\s+(?:the\s+)?(?:jumuah|jummah|jumu'ah|friday|juma)\s+(?:times?\s+)?(?:for|at|of|in|from)\s+(.+)/i);
  if (clearJumuahMatch) {
    return { type: 'clear_field', mosqueName: clearJumuahMatch[1].trim(), fieldDef: { path: 'iqamaTimes.jumuah', type: 'string', label: "Jumu'ah Times" } };
  }

  // "clear ramadan program for [mosque]", "reset ramadan for [mosque]"
  const clearRamadanMatch = lower.match(/(?:clear|remove|delete|reset|wipe)\s+(?:the\s+)?(?:ramadan|ramadhan)\s+(?:program\s+)?(?:for|at|of|in|from)\s+(.+)/i);
  if (clearRamadanMatch) {
    return { type: 'clear_field', mosqueName: clearRamadanMatch[1].trim(), fieldDef: { path: 'ramadanProgram', type: 'string', label: 'Ramadan Program' } };
  }

  // ── Set offered prayers ──
  // "set offered prayers for [mosque] to fajr, maghrib, isha"
  const offeredMatch = lower.match(/(?:set|update|change)\s+(?:offered\s+)?prayers\s+(?:for|at|of|in)\s+(.+?)\s+(?:to|=|as)\s+(.+)/i);
  if (offeredMatch) {
    const prayerParts = offeredMatch[2].split(/\s*(?:,|and|&)\s*/i).map(p => p.trim().toLowerCase());
    const validPrayers = prayerParts.map(p => PRAYER_ALIASES[p]).filter(Boolean) as ('fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha')[];
    if (validPrayers.length > 0) {
      return { type: 'update_offered_prayers', mosqueName: offeredMatch[1].trim(), prayers: validPrayers };
    }
  }
  // "offer all prayers for [mosque]", "reset offered prayers for [mosque]"
  const offerAllMatch = lower.match(/(?:offer|enable|restore)\s+(?:all\s+)?(?:five\s+)?prayers?\s+(?:for|at|of|in)\s+(.+)/i)
    || lower.match(/(?:reset|clear)\s+offered\s+prayers?\s+(?:for|at|of|in)\s+(.+)/i);
  if (offerAllMatch) {
    return { type: 'update_offered_prayers', mosqueName: offerAllMatch[1].trim(), prayers: ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] };
  }

  // "which prayers does [mosque] offer"
  const whichPrayersMatch = lower.match(/(?:which|what)\s+prayers?\s+(?:does|do|is|are)\s+(.+?)\s+(?:offer|hold|have|host)/i);
  if (whichPrayersMatch) {
    return { type: 'view_info', mosqueName: whichPrayersMatch[1].trim(), focus: 'all' };
  }

  // ── Enable/disable boolean fields ──
  const enableMatch = lower.match(/(?:enable|turn on|activate|start)\s+(tarawih|taraweeh|iftar|iftar provided|iftar every night|qiyam|qiyam al layl|qiyam ul layl|itikaf|i'tikaf|itikaaf|khatm|khatm quran|quran completion)\s+(?:for|at|of|in)\s+(.+)/i);
  if (enableMatch) {
    const fieldDef = matchField(enableMatch[1].trim());
    if (fieldDef && fieldDef.type === 'boolean') {
      return { type: 'update_field', mosqueName: enableMatch[2].trim(), fieldDef, newValue: true, displayValue: 'Yes' };
    }
  }
  const disableMatch = lower.match(/(?:disable|turn off|deactivate|stop|remove)\s+(tarawih|taraweeh|iftar|iftar provided|iftar every night|qiyam|qiyam al layl|qiyam ul layl|itikaf|i'tikaf|itikaaf|khatm|khatm quran|quran completion)\s+(?:for|at|of|in)\s+(.+)/i);
  if (disableMatch) {
    const fieldDef = matchField(disableMatch[1].trim());
    if (fieldDef && fieldDef.type === 'boolean') {
      return { type: 'update_field', mosqueName: disableMatch[2].trim(), fieldDef, newValue: false, displayValue: 'No' };
    }
  }

  // ── Set jumuah times (before generic set-field, since jumuah is special) ──
  const jumuahSetMatch = lower.match(/(?:set|update|change)\s+(?:jumuah|jummah|jumu'ah|friday|juma)\s+(?:times?\s+)?(?:for|at|of|in)\s+(.+?)\s+(?:to|=|as)\s+(.+)/i)
    || lower.match(/(?:add)\s+(?:a\s+)?(?:jumuah|jummah|jumu'ah|friday|juma)\s+(?:time\s+)?(?:for|at|of|in)\s+(.+?)\s+(?:at|to|=)\s+(.+)/i);
  if (jumuahSetMatch) {
    const timesPart = jumuahSetMatch[2].trim();
    const timeStrings = timesPart.split(/\s*(?:and|,|&)\s*/i).map(t => t.trim()).filter(Boolean);
    const parsedTimes: string[] = [];
    for (const ts of timeStrings) {
      const parsed = parseTimeString(ts);
      if (parsed?.type === 'fixed') parsedTimes.push(parsed.time);
    }
    if (parsedTimes.length > 0) {
      return { type: 'update_jumuah', mosqueName: jumuahSetMatch[1].trim(), times: parsedTimes };
    }
  }

  // ── Set generic field ──
  // "set [field] for [mosque] to [value]"
  // "set [field] to [value] for [mosque]"
  const setFieldPatterns = [
    /(?:set|update|change)\s+(.+?)\s+(?:for|at|of|in)\s+(.+?)\s+(?:to|=|as)\s+(.+)/i,
    /(?:set|update|change)\s+(.+?)\s+(?:to|=|as)\s+(.+?)\s+(?:for|at|of|in)\s+(.+)/i,
  ];

  for (let pi = 0; pi < setFieldPatterns.length; pi++) {
    const match = lower.match(setFieldPatterns[pi]);
    if (match) {
      const fieldStr = match[1].trim();
      const mosqueStr = pi === 0 ? match[2].trim() : match[3].trim();
      const valueStr = pi === 0 ? match[3].trim() : match[2].trim();

      // Skip if this looks like a prayer name (handled by update_iqama below)
      if (PRAYER_ALIASES[fieldStr]) continue;
      // Skip if it looks like jumuah (handled above)
      if (/^(jumuah|jummah|jumu'ah|friday|juma)/i.test(fieldStr)) continue;

      const fieldDef = matchField(fieldStr);
      if (fieldDef) {
        let newValue: any = valueStr;
        let displayValue = valueStr;

        // Get original casing from input for string values
        const originalValMatch = s.match(/(?:to|=|as)\s+(.+)$/i);
        if (originalValMatch && fieldDef.type === 'string') {
          newValue = originalValMatch[1].trim();
          displayValue = newValue;
        }

        if (fieldDef.type === 'string') {
          if (fieldDef.path === 'calculationMethod') {
            const normalized = CALC_METHOD_ALIASES[newValue.toLowerCase()];
            if (normalized) { newValue = normalized; displayValue = normalized; }
          }
          if (fieldDef.path === 'asrMethod') {
            const normalized = ASR_METHOD_ALIASES[newValue.toLowerCase()];
            if (normalized) { newValue = normalized; displayValue = normalized; }
          }
        } else if (fieldDef.type === 'boolean') {
          const boolVal = /^(yes|true|on|enable|enabled|1)$/i.test(newValue);
          newValue = boolVal;
          displayValue = boolVal ? 'Yes' : 'No';
        } else if (fieldDef.type === 'time') {
          const parsed = parseTimeString(newValue);
          if (parsed?.type === 'fixed') { newValue = parsed.time; displayValue = parsed.time; }
          else continue;
        } else if (fieldDef.type === 'rakat') {
          const num = parseInt(newValue);
          if (num === 8 || num === 20) { newValue = num; displayValue = `${num} rakat`; }
          else continue;
        }

        return { type: 'update_field', mosqueName: mosqueStr, fieldDef, newValue, displayValue };
      }
    }
  }

  // ── Update iqama time ──
  const updatePatterns = [
    /(?:set|update|change|make|put)\s+(\w+)\s+(?:for|at|of|in)\s+(.+?)\s+(?:to|=|as)\s+(.+)/i,
    /(?:set|update|change|make|put)\s+(\w+)\s+(?:for|at|of|in)\s+(.+?)\s+(\d.+)/i,
    /(?:set|update|change|make|put)\s+(.+?)\s+(\w+)\s+(?:to|=|as)\s+(.+)/i,
    /(\w+)\s+(?:for|at|of|in)\s+(.+?)\s+(?:to|should be|=)\s+(.+)/i,
    /(.+?)\s+(\w+)\s+(?:to|=)\s+(.+)/i,
  ];

  for (const pattern of updatePatterns) {
    const match = lower.match(pattern);
    if (match) {
      const candidates = [
        { prayerStr: match[1], mosqueStr: match[2], timeStr: match[3] },
        { prayerStr: match[2], mosqueStr: match[1], timeStr: match[3] },
      ];

      for (const { prayerStr, mosqueStr, timeStr } of candidates) {
        const prayer = PRAYER_ALIASES[prayerStr.trim().toLowerCase()];
        const parsedTime = parseTimeString(timeStr);

        if (prayer && parsedTime) {
          const newTime: IqamaTime = parsedTime.type === 'fixed'
            ? { type: 'fixed', time: parsedTime.time }
            : { type: 'offset', minutes: parsedTime.minutes };
          return { type: 'update_iqama', prayer, mosqueName: mosqueStr.trim(), newTime };
        }
      }
    }
  }

  // ── Hide mosque ──
  const hideMatch = lower.match(/^(?:hide|disable|unpublish|remove)\s+(.+)/i);
  if (hideMatch) {
    return { type: 'hide_mosque', mosqueName: hideMatch[1].replace(/\s*(from users?|from public|from listing)\s*/gi, '').trim() };
  }

  // ── Show mosque (careful: don't catch "show me" / "show the" queries) ──
  const showMatch = lower.match(/^(?:unhide|publish|restore|make visible)\s+(.+)/i);
  if (showMatch) {
    return { type: 'show_mosque', mosqueName: showMatch[1].replace(/\s*(to users?|to public|in listing)\s*/gi, '').trim() };
  }
  // "show [mosque]" but not "show info/details/times/ramadan/..." 
  const showSimple = lower.match(/^show\s+(.+)/i);
  if (showSimple) {
    const rest = showSimple[1].trim();
    if (!/^(me|the|all|info|details|settings|times|iqama|prayer|schedule|ramadan|jumuah|jummah|friday)/i.test(rest)) {
      return { type: 'show_mosque', mosqueName: rest.replace(/\s*(to users?|to public|in listing)\s*/gi, '').trim() };
    }
  }

  // ── View times ──
  const viewMatch = lower.match(/(?:what(?:'s| is| are)|get|view|check|display|current)\s+(?:the\s+)?(?:times?|iqama|prayer|schedule)\s+(?:for|at|of|in)\s+(.+)/i)
    || lower.match(/(?:times?|iqama|prayer|schedule)\s+(?:for|at|of|in)\s+(.+)/i);
  if (viewMatch) {
    return { type: 'view_times', mosqueName: viewMatch[1].trim() };
  }

  // ── Knowledge query (fallback) ──
  const kbMatches = findBestMatches(s);
  if (kbMatches.length > 0) {
    return { type: 'knowledge_query', query: s };
  }

  return { type: 'unknown', query: s };
}

// ── KB matching ───────────────────────────────────────────────────
function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/['']/g, "'").replace(/[^a-z0-9']/g, ' ').split(/\s+/).filter(t => t.length > 1);
}

function scoreMatch(query: string, entry: KBEntry): number {
  const tokens = tokenize(query);
  if (tokens.length === 0) return 0;
  const queryLower = query.toLowerCase();
  let score = 0;
  for (const kw of entry.keywords) {
    if (queryLower.includes(kw)) score += 10;
    for (const token of tokens) {
      if (kw.includes(token) || token.includes(kw)) score += 3;
    }
  }
  const questionTokens = tokenize(entry.question);
  for (const token of tokens) {
    if (questionTokens.includes(token)) score += 2;
  }
  return score;
}

function findBestMatches(query: string, limit = 3): KBEntry[] {
  return KB.map(entry => ({ entry, score: scoreMatch(query, entry) }))
    .filter(s => s.score > 5)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.entry);
}

// ── Types ─────────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  relatedQuestions?: string[];
  timestamp: Date;
  status?: 'pending' | 'success' | 'error';
  actionLabel?: string;
}

interface AdminHelpChatProps {
  mosques: Mosque[];
  accessToken: string | null;
  onRefresh: () => Promise<void>;
}

// ── Quick suggestions ─────────────────────────────────────────────
const QUICK_SUGGESTIONS = [
  'Info for {mosque}',
  'Ramadan program for {mosque}',
  'Set Fajr for {mosque} to 6:30 AM',
  'Enable tarawih for {mosque}',
  'List volunteers',
  'List charities',
  'List all masajid',
  'Jumuah times for {mosque}',
  'Events for {mosque}',
];

// ── Component ─────────────────────────────────────────────────────
export function AdminHelpChat({ mosques, accessToken, onRefresh }: AdminHelpChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<{ intent: Intent; msgId: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasGreeted = useRef(false);

  const quickSuggestions = QUICK_SUGGESTIONS.map(s => {
    if (s.includes('{mosque}') && mosques.length > 0) {
      return s.replace('{mosque}', mosques[0].name);
    }
    return s;
  });

  const addMessage = useCallback((msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMsg: ChatMessage = { ...msg, id: `msg-${Date.now()}-${Math.random()}`, timestamp: new Date() };
    setMessages(prev => [...prev, newMsg]);
    return newMsg.id;
  }, []);

  const updateMessage = useCallback((id: string, updates: Partial<ChatMessage>) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  }, []);

  // Greeting
  useEffect(() => {
    if (isOpen && !hasGreeted.current) {
      hasGreeted.current = true;
      const hour = new Date().getHours();
      const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

      const staleCount = mosques.filter(m => {
        const ts = m.updatedAt || (typeof window !== 'undefined' ? localStorage.getItem(`mosque-updated:${m.id}`) : null);
        if (!ts) return true;
        return (Date.now() - new Date(ts).getTime()) > 7 * 24 * 60 * 60 * 1000;
      }).length;

      let tip = '';
      if (staleCount > 0) tip = `\n\n${staleCount} masjid${staleCount > 1 ? 's haven\'t' : ' hasn\'t'} been updated in over a week.`;

      addMessage({
        role: 'assistant',
        content: `${greeting}! I'm your Dāimūn admin assistant. I can **read and update** masjid data, volunteers, and charities.\n\n**Masjid actions:**\n• "Set Fajr for [masjid] to 6:30 AM"\n• "Enable tarawih for [masjid]"\n• "Set jumuah to 1:00 PM and 2:00 PM"\n• "Hide/Show [masjid]"\n\n**Volunteers & Charities:**\n• "List volunteers" / "List charities"\n• "Add volunteer [title] at [url]"\n• "Add charity [title] at [url] category zakat"\n• "Delete volunteer/charity [title]"\n\n**View data:**\n• "Info for [masjid]" — full details\n• "Ramadan program for [masjid]"\n• "Times for [masjid]"${tip}`,
      });
    }
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    setShowScrollDown(container.scrollHeight - container.scrollTop - container.clientHeight > 100);
  }, []);

  // ── Execute helpers ─────────────────────────────────────────────
  const executeMosqueUpdate = async (mosque: Mosque, body: any) => {
    const res = await fetch(`${API_URL}/mosques/${mosque.id}`, {
      method: 'PUT',
      headers: {
        'apikey': publicAnonKey,
        'Authorization': `Bearer ${accessToken || publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    localStorage.setItem(`mosque-updated:${mosque.id}`, new Date().toISOString());
    await onRefresh();
  };

  const formatTimeValue = (t: IqamaTime): string => {
    if (t.type === 'fixed') return t.time || '—';
    return `${t.minutes} min after adhan`;
  };

  // ── Build mosque info string ────────────────────────────────────
  const buildFullInfo = (mosque: Mosque): string => {
    const lines: string[] = [];
    lines.push(`**${mosque.name}**`);
    lines.push('');

    // Basic
    lines.push(`• **Address:** ${mosque.address}`);
    if (mosque.website) lines.push(`• **Website:** ${mosque.website}`);
    if (mosque.whatsappChannel) lines.push(`• **WhatsApp:** ${mosque.whatsappChannel}`);
    if (mosque.note) lines.push(`• **Note:** ${mosque.note}`);
    lines.push(`• **Calculation:** ${mosque.calculationMethod || 'NorthAmerica'} / Asr: ${mosque.asrMethod || 'Standard'}`);
    if (mosque.temporarilyHidden) lines.push(`• **Status:** Hidden from users`);

    // Offered prayers
    if (mosque.offeredPrayers && mosque.offeredPrayers.length > 0 && mosque.offeredPrayers.length < 5) {
      lines.push(`• **Offered Prayers:** ${mosque.offeredPrayers.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ')}`);
    }

    // Jumuah
    const jumuah = mosque.iqamaTimes.jumuah;
    if (jumuah) {
      lines.push(`• **Jumu'ah:** ${formatJumuahTimes(jumuah)}`);
    }

    // Ramadan
    const rp = mosque.ramadanProgram;
    if (rp) {
      lines.push('');
      lines.push('**Ramadan Program:**');
      lines.push(`• Tarawih: ${formatBool(rp.tarawih)}${rp.tarawih && rp.tarawihRakat ? ` (${rp.tarawihRakat} rakat)` : ''}${rp.tarawih && rp.tarawihTime ? ` at ${rp.tarawihTime}` : ''}`);
      lines.push(`• Iftar: ${formatBool(rp.iftarProvided)}${rp.iftarProvided && rp.iftarEveryNight !== undefined ? ` (every night: ${formatBool(rp.iftarEveryNight)})` : ''}${rp.iftarNotes ? ` — ${rp.iftarNotes}` : ''}`);
      lines.push(`• I'tikaf: ${formatBool(rp.itikaf)}`);
      lines.push(`• Qiyam al-Layl: ${formatBool(rp.qiyam)}${rp.qiyam && rp.qiyamTime ? ` at ${rp.qiyamTime}` : ''}`);
      lines.push(`• Khatm al-Quran: ${formatBool(rp.khatmQuran)}${rp.khatmQuran && rp.khatmQuranDate ? ` on ${rp.khatmQuranDate}` : ''}`);
    } else {
      lines.push('');
      lines.push('**Ramadan Program:** _Not configured_');
    }

    // Events
    if (mosque.events && mosque.events.length > 0) {
      lines.push('');
      lines.push(`**Events (${mosque.events.length}):**`);
      for (const ev of mosque.events.slice(0, 5)) {
        const rec = ev.recurring?.enabled ? ' _(recurring)_' : '';
        lines.push(`• ${ev.title} — ${ev.date} at ${ev.time}${rec}`);
      }
      if (mosque.events.length > 5) lines.push(`  _...and ${mosque.events.length - 5} more_`);
    }

    // Scheduled changes
    if (mosque.scheduledTimeChanges && mosque.scheduledTimeChanges.length > 0) {
      lines.push('');
      lines.push(`**Scheduled Changes (${mosque.scheduledTimeChanges.length}):**`);
      for (const sc of mosque.scheduledTimeChanges) {
        const prayerName = sc.prayer.charAt(0).toUpperCase() + sc.prayer.slice(1);
        const end = sc.endDate ? ` → reverts ${sc.endDate}` : ' (permanent)';
        const reason = sc.reason ? ` — ${sc.reason}` : '';
        lines.push(`• ${prayerName}: ${sc.newTime} starting ${sc.startDate}${end}${reason}`);
      }
    }

    // Last updated
    const ts = mosque.updatedAt || (typeof window !== 'undefined' ? localStorage.getItem(`mosque-updated:${mosque.id}`) : null);
    if (ts) {
      const d = new Date(ts);
      const ago = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
      lines.push('');
      lines.push(`**Last Updated:** ${d.toLocaleDateString()}${ago > 0 ? ` (${ago} day${ago !== 1 ? 's' : ''} ago)` : ' (today)'}`);
    }

    return lines.join('\n');
  };

  const buildRamadanInfo = (mosque: Mosque): string => {
    const rp = mosque.ramadanProgram;
    const lines: string[] = [];
    lines.push(`**${mosque.name}** — Ramadan Program`);
    lines.push('');

    if (!rp) {
      lines.push('_No Ramadan program configured yet._');
      lines.push('');
      lines.push('You can set it up:');
      lines.push(`• "Enable tarawih for ${mosque.name}"`);
      lines.push(`• "Set tarawih rakat for ${mosque.name} to 20"`);
      lines.push(`• "Set tarawih time for ${mosque.name} to 9:30 PM"`);
      lines.push(`• "Enable qiyam for ${mosque.name}"`);
      lines.push(`• "Enable iftar for ${mosque.name}"`);
      return lines.join('\n');
    }

    lines.push(`• **Tarawih:** ${formatBool(rp.tarawih)}${rp.tarawih && rp.tarawihRakat ? ` — ${rp.tarawihRakat} rakat` : ''}${rp.tarawih && rp.tarawihTime ? ` at ${rp.tarawihTime}` : ''}`);
    lines.push(`• **Iftar Provided:** ${formatBool(rp.iftarProvided)}${rp.iftarProvided && rp.iftarEveryNight !== undefined ? ` (every night: ${formatBool(rp.iftarEveryNight)})` : ''}`);
    if (rp.iftarNotes) lines.push(`  _${rp.iftarNotes}_`);
    lines.push(`• **I'tikaf:** ${formatBool(rp.itikaf)}`);
    lines.push(`• **Qiyam al-Layl:** ${formatBool(rp.qiyam)}${rp.qiyam && rp.qiyamTime ? ` at ${rp.qiyamTime}` : ''}`);
    lines.push(`• **Khatm al-Quran:** ${formatBool(rp.khatmQuran)}${rp.khatmQuran && rp.khatmQuranDate ? ` — date: ${rp.khatmQuranDate}` : ''}`);

    lines.push('');
    lines.push('To update, try:');
    lines.push(`• "Set tarawih rakat for ${mosque.name} to 20"`);
    lines.push(`• "Enable qiyam for ${mosque.name}"`);
    lines.push(`• "Set qiyam time for ${mosque.name} to 2:00 AM"`);

    return lines.join('\n');
  };

  const buildJumuahInfo = (mosque: Mosque): string => {
    const jumuah = mosque.iqamaTimes.jumuah;
    const lines: string[] = [];
    lines.push(`**${mosque.name}** — Jumu'ah Times`);
    lines.push('');

    if (!jumuah) {
      lines.push('_No Jumu\'ah times configured._');
      lines.push('');
      lines.push(`Set them: "Set jumuah for ${mosque.name} to 1:00 PM and 2:00 PM"`);
    } else {
      lines.push(`**Current:** ${formatJumuahTimes(jumuah)}`);
      lines.push('');
      lines.push(`To change: "Set jumuah for ${mosque.name} to 1:30 PM"`);
    }

    return lines.join('\n');
  };

  const buildEventsInfo = (mosque: Mosque): string => {
    const lines: string[] = [];
    lines.push(`**${mosque.name}** — Events`);
    lines.push('');

    if (!mosque.events || mosque.events.length === 0) {
      lines.push('_No events configured._');
      lines.push('');
      lines.push('Add events from the edit page → Events section.');
    } else {
      for (const ev of mosque.events) {
        const rec = ev.recurring?.enabled
          ? ` _(${ev.recurring.frequency}${ev.recurring.dayOfWeek !== undefined ? ', ' + ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][ev.recurring.dayOfWeek] : ''})_`
          : '';
        lines.push(`• **${ev.title}** — ${ev.date} at ${ev.time}${rec}`);
        if (ev.description) lines.push(`  _${ev.description}_`);
      }
    }

    return lines.join('\n');
  };

  const buildScheduledInfo = (mosque: Mosque): string => {
    const lines: string[] = [];
    lines.push(`**${mosque.name}** — Scheduled Time Changes`);
    lines.push('');

    if (!mosque.scheduledTimeChanges || mosque.scheduledTimeChanges.length === 0) {
      lines.push('_No scheduled changes._');
      lines.push('');
      lines.push('Create them from the edit page → Scheduled Changes section, or say "How do scheduled changes work?" to learn more.');
    } else {
      for (const sc of mosque.scheduledTimeChanges) {
        const prayerName = sc.prayer.charAt(0).toUpperCase() + sc.prayer.slice(1);
        const end = sc.endDate ? `reverts ${sc.endDate}` : 'permanent';
        const reason = sc.reason ? ` — _${sc.reason}_` : '';
        const isActive = new Date(sc.startDate) <= new Date();
        const status = isActive ? '**active**' : '_upcoming_';
        lines.push(`• **${prayerName}** → ${sc.newTime} (${sc.startDate}, ${end}) [${status}]${reason}`);
      }
    }

    return lines.join('\n');
  };

  // ── Process user input ──────────────────────────────────────────
  const handleSend = async (text?: string) => {
    const query = (text || input).trim();
    if (!query || isProcessing) return;

    addMessage({ role: 'user', content: query });
    setInput('');
    setPendingConfirm(null);
    setIsProcessing(true);

    await new Promise(r => setTimeout(r, 300));

    const intent = detectIntent(query, mosques);

    const notFoundMsg = (name: string) =>
      `I couldn't find a masjid matching **"${name}"**. Here are the masjids I know:\n\n${mosques.map(m => `• ${m.name}`).join('\n')}\n\nTry again with the exact name?`;

    switch (intent.type) {
      case 'update_iqama': {
        const mosque = fuzzyMatchMosque(intent.mosqueName, mosques);
        if (!mosque) { addMessage({ role: 'assistant', content: notFoundMsg(intent.mosqueName) }); break; }

        const timeLabel = intent.newTime.type === 'fixed' ? intent.newTime.time! : `${intent.newTime.minutes} min after adhan`;
        const prayerName = intent.prayer.charAt(0).toUpperCase() + intent.prayer.slice(1);
        const currentTime = formatTimeValue(mosque.iqamaTimes[intent.prayer]);

        const confirmId = addMessage({
          role: 'assistant',
          content: `**Update ${prayerName} iqama for ${mosque.name}**\n\nCurrent: ${currentTime}\nNew: **${timeLabel}**\n\nShall I apply this change?`,
          actionLabel: 'confirm',
        });
        setPendingConfirm({ intent: { ...intent, mosqueName: mosque.name }, msgId: confirmId });
        break;
      }

      case 'update_field': {
        const mosque = fuzzyMatchMosque(intent.mosqueName, mosques);
        if (!mosque) { addMessage({ role: 'assistant', content: notFoundMsg(intent.mosqueName) }); break; }

        const currentVal = getNestedValue(mosque, intent.fieldDef.path);
        const currentDisplay = currentVal === undefined || currentVal === null || currentVal === ''
          ? '—'
          : intent.fieldDef.type === 'boolean' ? formatBool(currentVal) : String(currentVal);

        const confirmId = addMessage({
          role: 'assistant',
          content: `**Update ${intent.fieldDef.label} for ${mosque.name}**\n\nCurrent: ${currentDisplay}\nNew: **${intent.displayValue}**\n\nShall I apply this change?`,
          actionLabel: 'confirm',
        });
        setPendingConfirm({ intent: { ...intent, mosqueName: mosque.name }, msgId: confirmId });
        break;
      }

      case 'update_jumuah': {
        const mosque = fuzzyMatchMosque(intent.mosqueName, mosques);
        if (!mosque) { addMessage({ role: 'assistant', content: notFoundMsg(intent.mosqueName) }); break; }

        const currentJumuah = formatJumuahTimes(mosque.iqamaTimes.jumuah);
        const newDisplay = intent.times.join(', ');

        const confirmId = addMessage({
          role: 'assistant',
          content: `**Update Jumu'ah times for ${mosque.name}**\n\nCurrent: ${currentJumuah}\nNew: **${newDisplay}**\n\nShall I apply this change?`,
          actionLabel: 'confirm',
        });
        setPendingConfirm({ intent: { ...intent, mosqueName: mosque.name }, msgId: confirmId });
        break;
      }

      case 'update_offered_prayers': {
        const mosque = fuzzyMatchMosque(intent.mosqueName, mosques);
        if (!mosque) { addMessage({ role: 'assistant', content: notFoundMsg(intent.mosqueName) }); break; }

        const currentOffered = (!mosque.offeredPrayers || mosque.offeredPrayers.length === 0 || mosque.offeredPrayers.length === 5)
          ? 'All five prayers'
          : mosque.offeredPrayers.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ');
        const newDisplay = intent.prayers.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ');

        const confirmId = addMessage({
          role: 'assistant',
          content: `**Update offered prayers for ${mosque.name}**\n\nCurrent: ${currentOffered}\nNew: **${newDisplay}**\n\nShall I apply this change?`,
          actionLabel: 'confirm',
        });
        setPendingConfirm({ intent: { ...intent, mosqueName: mosque.name }, msgId: confirmId });
        break;
      }

      case 'clear_field': {
        const mosque = fuzzyMatchMosque(intent.mosqueName, mosques);
        if (!mosque) { addMessage({ role: 'assistant', content: notFoundMsg(intent.mosqueName) }); break; }

        const currentVal = getNestedValue(mosque, intent.fieldDef.path);
        if (currentVal === undefined || currentVal === null || currentVal === '') {
          addMessage({ role: 'assistant', content: `**${intent.fieldDef.label}** for **${mosque.name}** is already empty.` });
          break;
        }

        let currentDisplay: string;
        if (intent.fieldDef.path === 'ramadanProgram' && typeof currentVal === 'object') {
          currentDisplay = '_configured (see "ramadan program for ' + mosque.name + '")_';
        } else if (intent.fieldDef.path === 'iqamaTimes.jumuah') {
          currentDisplay = formatJumuahTimes(currentVal);
        } else {
          currentDisplay = String(currentVal);
        }

        const confirmId = addMessage({
          role: 'assistant',
          content: `**Clear ${intent.fieldDef.label} for ${mosque.name}?**\n\nCurrent: ${currentDisplay}\n\nThis will remove the value entirely.`,
          actionLabel: 'confirm',
        });
        setPendingConfirm({ intent: { ...intent, mosqueName: mosque.name }, msgId: confirmId });
        break;
      }

      case 'hide_mosque':
      case 'show_mosque': {
        const hide = intent.type === 'hide_mosque';
        const mosque = fuzzyMatchMosque(intent.mosqueName, mosques);
        if (!mosque) { addMessage({ role: 'assistant', content: notFoundMsg(intent.mosqueName) }); break; }

        if (hide && mosque.temporarilyHidden) { addMessage({ role: 'assistant', content: `**${mosque.name}** is already hidden from users.` }); break; }
        if (!hide && !mosque.temporarilyHidden) { addMessage({ role: 'assistant', content: `**${mosque.name}** is already visible to users.` }); break; }

        const confirmId = addMessage({
          role: 'assistant',
          content: `**${hide ? 'Hide' : 'Show'} ${mosque.name}${hide ? ' from' : ' to'} users?**\n\n${hide ? 'It will be temporarily removed from the public listing.' : 'It will be restored to the public listing.'}`,
          actionLabel: 'confirm',
        });
        setPendingConfirm({ intent: { ...intent, mosqueName: mosque.name }, msgId: confirmId });
        break;
      }

      case 'view_info': {
        const mosque = fuzzyMatchMosque(intent.mosqueName, mosques);
        if (!mosque) { addMessage({ role: 'assistant', content: notFoundMsg(intent.mosqueName) }); break; }

        let content: string;
        if (intent.focus === 'ramadan') {
          content = buildRamadanInfo(mosque);
        } else if (intent.focus === 'jumuah') {
          content = buildJumuahInfo(mosque);
        } else if (intent.focus === 'events') {
          content = buildEventsInfo(mosque);
        } else if (intent.focus === 'scheduled') {
          content = buildScheduledInfo(mosque);
        } else {
          content = buildFullInfo(mosque);
        }
        addMessage({ role: 'assistant', content });
        break;
      }

      case 'view_times': {
        const mosque = fuzzyMatchMosque(intent.mosqueName, mosques);
        if (!mosque) { addMessage({ role: 'assistant', content: notFoundMsg(intent.mosqueName) }); break; }

        const now = new Date();
        const calc = calculateIqamaTimes(
          mosque.latitude, mosque.longitude, mosque.iqamaTimes, now,
          mosque.calculationMethod || 'NorthAmerica',
          mosque.asrMethod || 'Standard',
          mosque.scheduledTimeChanges
        );

        const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
        const lines = prayers.map(p => {
          const offered = !mosque.offeredPrayers || mosque.offeredPrayers.length === 0 || mosque.offeredPrayers.includes(p);
          if (!offered) return `• **${p.charAt(0).toUpperCase() + p.slice(1)}**: _not offered_`;
          const adhan = calc[p].adhan;
          const iqama = calc[p].iqama;
          const config = mosque.iqamaTimes[p];
          const configLabel = config.type === 'offset' ? ` (${config.minutes} min after adhan)` : '';
          return `• **${p.charAt(0).toUpperCase() + p.slice(1)}**: Adhan ${adhan} → Iqama **${iqama}**${configLabel}`;
        });

        const jumuah = mosque.iqamaTimes.jumuah;
        if (jumuah) lines.push(`\n• **Jumu'ah:** ${formatJumuahTimes(jumuah)}`);

        addMessage({
          role: 'assistant',
          content: `**${mosque.name}** — Current Times\n\n${lines.join('\n')}\n\n${mosque.temporarilyHidden ? '⚠️ _This masjid is currently hidden from users._\n\n' : ''}To update, say e.g. "Set Fajr for ${mosque.name} to 6:30 AM"`,
        });
        break;
      }

      case 'list_mosques': {
        if (mosques.length === 0) {
          addMessage({ role: 'assistant', content: 'No masjids found. Tap **"+ Masjid"** in the admin header to add one.' });
        } else {
          const lines = mosques.map(m => {
            const status = m.temporarilyHidden ? ' — hidden' : '';
            const rp = m.ramadanProgram;
            const ramadanBits: string[] = [];
            if (rp?.tarawih) ramadanBits.push('tarawih');
            if (rp?.iftarProvided) ramadanBits.push('iftar');
            if (rp?.qiyam) ramadanBits.push('qiyam');
            const ramadanLabel = ramadanBits.length > 0 ? ` [${ramadanBits.join(', ')}]` : '';
            return `• **${m.name}**${status}${ramadanLabel}`;
          });
          addMessage({
            role: 'assistant',
            content: `**${mosques.length} Masjid${mosques.length !== 1 ? 's' : ''}:**\n\n${lines.join('\n')}\n\nSay **"info for [name]"** for full details.`,
          });
        }
        break;
      }

      case 'list_volunteers': {
        try {
          const res = await fetch(`${API_URL}/volunteers`, {
            headers: { 'apikey': publicAnonKey, 'Authorization': `Bearer ${accessToken || publicAnonKey}` },
          });
          if (!res.ok) throw new Error('Failed to fetch');
          const data = await res.json();
          let vols: VolunteerOpportunity[] = data.volunteers || [];
          if (intent.mosqueName) {
            const mosque = fuzzyMatchMosque(intent.mosqueName, mosques);
            if (mosque) vols = vols.filter(v => v.mosqueId === mosque.id);
            else vols = vols.filter(v => v.mosqueName?.toLowerCase().includes(intent.mosqueName!.toLowerCase()));
          }
          if (vols.length === 0) {
            addMessage({ role: 'assistant', content: intent.mosqueName ? `No volunteer opportunities found for **${intent.mosqueName}**.` : 'No volunteer opportunities yet.\n\nAdd one: **"Add volunteer [title] at [url]"**' });
          } else {
            const lines = vols.map(v => {
              const scope = v.mosqueName ? ` — _${v.mosqueName}_` : ' — _General_';
              return `• **${v.title}**${scope}\n  ${v.link}${v.description ? `\n  _${v.description}_` : ''}`;
            });
            addMessage({
              role: 'assistant',
              content: `**${vols.length} Volunteer Opportunit${vols.length !== 1 ? 'ies' : 'y'}:**\n\n${lines.join('\n\n')}`,
            });
          }
        } catch { addMessage({ role: 'assistant', content: 'Failed to fetch volunteers. Try again.' }); }
        break;
      }

      case 'add_volunteer': {
        if (!intent.title) { addMessage({ role: 'assistant', content: 'Please provide a title:\n\n**"Add volunteer [title] at [url]"**\n\nOptionally: **"... for [masjid]"**' }); break; }
        if (!intent.link) { addMessage({ role: 'assistant', content: `Got title **"${intent.title}"** but I need a link URL.\n\nTry: **"Add volunteer ${intent.title} at https://..."**` }); break; }
        let mosque: Mosque | null = null;
        if (intent.mosqueName) { mosque = fuzzyMatchMosque(intent.mosqueName, mosques); }

        const lines = [`**Title:** ${intent.title}`, `**Link:** ${intent.link}`];
        if (intent.description) lines.push(`**Description:** ${intent.description}`);
        lines.push(mosque ? `**Masjid:** ${mosque.name}` : '**Scope:** General (all masjids)');

        const confirmId = addMessage({
          role: 'assistant',
          content: `**Add volunteer opportunity?**\n\n${lines.join('\n')}\n\nShall I create this?`,
          actionLabel: 'confirm',
        });
        const confirmIntent = { ...intent, mosqueName: mosque?.name || undefined };
        setPendingConfirm({ intent: confirmIntent as any, msgId: confirmId });
        break;
      }

      case 'delete_volunteer': {
        try {
          const res = await fetch(`${API_URL}/volunteers`, {
            headers: { 'apikey': publicAnonKey, 'Authorization': `Bearer ${accessToken || publicAnonKey}` },
          });
          if (!res.ok) throw new Error('Failed to fetch');
          const data = await res.json();
          const vols: VolunteerOpportunity[] = data.volunteers || [];
          const match = vols.find(v => v.title.toLowerCase() === intent.title.toLowerCase())
            || vols.find(v => v.title.toLowerCase().includes(intent.title.toLowerCase()));
          if (!match) {
            addMessage({ role: 'assistant', content: `No volunteer opportunity matching **"${intent.title}"** found.\n\nSay **"List volunteers"** to see all.` });
          } else {
            const confirmId = addMessage({
              role: 'assistant',
              content: `**Delete volunteer opportunity?**\n\n• **${match.title}**\n  ${match.link}${match.mosqueName ? `\n  _${match.mosqueName}_` : ''}\n\nThis cannot be undone.`,
              actionLabel: 'confirm',
            });
            setPendingConfirm({ intent: { ...intent, title: match.id } as any, msgId: confirmId });
          }
        } catch { addMessage({ role: 'assistant', content: 'Failed to fetch volunteers. Try again.' }); }
        break;
      }

      case 'list_charities': {
        try {
          const res = await fetch(`${API_URL}/charities`, {
            headers: { 'apikey': publicAnonKey, 'Authorization': `Bearer ${accessToken || publicAnonKey}` },
          });
          if (!res.ok) throw new Error('Failed to fetch');
          const data = await res.json();
          let chars: CharityLink[] = data.charities || [];
          if (intent.mosqueName) {
            const mosque = fuzzyMatchMosque(intent.mosqueName, mosques);
            if (mosque) chars = chars.filter(c => c.mosqueId === mosque.id);
            else chars = chars.filter(c => c.mosqueName?.toLowerCase().includes(intent.mosqueName!.toLowerCase()));
          }
          if (chars.length === 0) {
            addMessage({ role: 'assistant', content: intent.mosqueName ? `No charity links found for **${intent.mosqueName}**.` : 'No charity links yet.\n\nAdd one: **"Add charity [title] at [url]"**' });
          } else {
            const catLabel = (c: string | null | undefined) => {
              if (!c) return '';
              const labels: Record<string, string> = { zakat: 'Zakat', sadaqah: 'Sadaqah', 'building-fund': 'Building Fund', 'zakat-ul-fitr': 'Zakat ul-Fitr', other: 'Other' };
              return labels[c] ? ` [${labels[c]}]` : '';
            };
            const lines = chars.map(c => {
              const scope = c.mosqueName ? ` — _${c.mosqueName}_` : ' — _General_';
              return `• **${c.title}**${catLabel(c.category)}${scope}\n  ${c.link}${c.description ? `\n  _${c.description}_` : ''}`;
            });
            addMessage({
              role: 'assistant',
              content: `**${chars.length} Charity Link${chars.length !== 1 ? 's' : ''}:**\n\n${lines.join('\n\n')}`,
            });
          }
        } catch { addMessage({ role: 'assistant', content: 'Failed to fetch charities. Try again.' }); }
        break;
      }

      case 'add_charity': {
        if (!intent.title) { addMessage({ role: 'assistant', content: 'Please provide a title:\n\n**"Add charity [title] at [url]"**\n\nOptional: **"... category zakat for [masjid]"**' }); break; }
        if (!intent.link) { addMessage({ role: 'assistant', content: `Got title **"${intent.title}"** but I need a link URL.\n\nTry: **"Add charity ${intent.title} at https://..."**` }); break; }
        let charMosque: Mosque | null = null;
        if (intent.mosqueName) { charMosque = fuzzyMatchMosque(intent.mosqueName, mosques); }

        const catLabels: Record<string, string> = { zakat: 'Zakat', sadaqah: 'Sadaqah', 'building-fund': 'Building Fund', 'zakat-ul-fitr': 'Zakat ul-Fitr', other: 'Other' };
        const lines = [`**Title:** ${intent.title}`, `**Link:** ${intent.link}`];
        if (intent.description) lines.push(`**Description:** ${intent.description}`);
        if (intent.category) lines.push(`**Category:** ${catLabels[intent.category] || intent.category}`);
        lines.push(charMosque ? `**Masjid:** ${charMosque.name}` : '**Scope:** General (all masjids)');

        const confirmId = addMessage({
          role: 'assistant',
          content: `**Add charity link?**\n\n${lines.join('\n')}\n\nShall I create this?`,
          actionLabel: 'confirm',
        });
        const confirmIntent = { ...intent, mosqueName: charMosque?.name || undefined };
        setPendingConfirm({ intent: confirmIntent as any, msgId: confirmId });
        break;
      }

      case 'delete_charity': {
        try {
          const res = await fetch(`${API_URL}/charities`, {
            headers: { 'apikey': publicAnonKey, 'Authorization': `Bearer ${accessToken || publicAnonKey}` },
          });
          if (!res.ok) throw new Error('Failed to fetch');
          const data = await res.json();
          const chars: CharityLink[] = data.charities || [];
          const match = chars.find(c => c.title.toLowerCase() === intent.title.toLowerCase())
            || chars.find(c => c.title.toLowerCase().includes(intent.title.toLowerCase()));
          if (!match) {
            addMessage({ role: 'assistant', content: `No charity link matching **"${intent.title}"** found.\n\nSay **"List charities"** to see all.` });
          } else {
            const confirmId = addMessage({
              role: 'assistant',
              content: `**Delete charity link?**\n\n• **${match.title}**\n  ${match.link}${match.mosqueName ? `\n  _${match.mosqueName}_` : ''}\n\nThis cannot be undone.`,
              actionLabel: 'confirm',
            });
            setPendingConfirm({ intent: { ...intent, title: match.id } as any, msgId: confirmId });
          }
        } catch { addMessage({ role: 'assistant', content: 'Failed to fetch charities. Try again.' }); }
        break;
      }

      case 'knowledge_query': {
        const matches = findBestMatches(intent.query);
        const response = matches[0].answer;
        const related = matches.slice(1).map(m => m.question);
        addMessage({
          role: 'assistant',
          content: response,
          relatedQuestions: related.length > 0 ? related : undefined,
        });
        break;
      }

      default: {
        addMessage({
          role: 'assistant',
          content: `I'm not sure what you mean. Here's what I can do:\n\n**Masjid updates:**\n• "Set [prayer] for [masjid] to [time]"\n• "Set jumuah for [masjid] to 1:00 PM and 2:00 PM"\n• "Enable/disable tarawih/qiyam/iftar/itikaf"\n• "Set tarawih rakat/time, qiyam time"\n• "Set whatsapp/website/note to [value]"\n• "Set calc method to ISNA / asr to Hanafi"\n• "Set offered prayers to fajr, maghrib, isha"\n• "Clear note/whatsapp" · "Hide/Show"\n\n**Volunteers & Charities:**\n• "List volunteers" / "List charities"\n• "Add volunteer [title] at [url] for [masjid]"\n• "Add charity [title] at [url] category zakat"\n• "Delete volunteer/charity [title]"\n\n**View data:**\n• "Info for [masjid]" · "Times" · "Ramadan program"\n• "Jumuah times" · "Events" · "Scheduled changes"\n• "Where is [masjid]?" · "List all masajid"\n\n**Questions:** Iqama setup, admin scoping, TV display, deployment…`,
          relatedQuestions: ['List volunteers', 'Ramadan mode setup', 'How do scheduled changes work?'],
        });
      }
    }

    setIsProcessing(false);
  };

  // ── Confirm / cancel action ─────────────────────────────────────
  const handleConfirm = async () => {
    if (!pendingConfirm) return;
    const { intent } = pendingConfirm;
    setPendingConfirm(null);
    setIsProcessing(true);

    const statusMsgId = addMessage({
      role: 'assistant',
      content: 'Applying change…',
      status: 'pending',
    });

    try {
      // Volunteer/Charity intents don't always require a mosque
      if (intent.type === 'add_volunteer') {
        const mosque = intent.mosqueName ? (mosques.find(m => m.name === intent.mosqueName) || fuzzyMatchMosque(intent.mosqueName, mosques)) : null;
        const body: any = { title: intent.title, link: intent.link, description: intent.description || null, mosqueId: mosque?.id || null, mosqueName: mosque?.name || null };
        const res = await fetch(`${API_URL}/volunteers`, {
          method: 'POST',
          headers: { 'apikey': publicAnonKey, 'Authorization': `Bearer ${accessToken || publicAnonKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(await res.text());
        updateMessage(statusMsgId, {
          content: `Done! Volunteer opportunity **"${intent.title}"** created.${mosque ? ` (${mosque.name})` : ''}`,
          status: 'success',
        });
      } else if (intent.type === 'delete_volunteer') {
        // intent.title was overwritten with the ID during the confirm step
        const id = intent.title;
        const res = await fetch(`${API_URL}/volunteers/${id}`, {
          method: 'DELETE',
          headers: { 'apikey': publicAnonKey, 'Authorization': `Bearer ${accessToken || publicAnonKey}` },
        });
        if (!res.ok) throw new Error(await res.text());
        updateMessage(statusMsgId, { content: 'Done! Volunteer opportunity deleted.', status: 'success' });
      } else if (intent.type === 'add_charity') {
        const mosque = intent.mosqueName ? (mosques.find(m => m.name === intent.mosqueName) || fuzzyMatchMosque(intent.mosqueName, mosques)) : null;
        const body: any = { title: intent.title, link: intent.link, description: intent.description || null, category: intent.category || null, mosqueId: mosque?.id || null, mosqueName: mosque?.name || null };
        const res = await fetch(`${API_URL}/charities`, {
          method: 'POST',
          headers: { 'apikey': publicAnonKey, 'Authorization': `Bearer ${accessToken || publicAnonKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(await res.text());
        updateMessage(statusMsgId, {
          content: `Done! Charity link **"${intent.title}"** created.${mosque ? ` (${mosque.name})` : ''}`,
          status: 'success',
        });
      } else if (intent.type === 'delete_charity') {
        const id = intent.title;
        const res = await fetch(`${API_URL}/charities/${id}`, {
          method: 'DELETE',
          headers: { 'apikey': publicAnonKey, 'Authorization': `Bearer ${accessToken || publicAnonKey}` },
        });
        if (!res.ok) throw new Error(await res.text());
        updateMessage(statusMsgId, { content: 'Done! Charity link deleted.', status: 'success' });
      } else {
      // Mosque-based intents
      const mosqueName = (intent as any).mosqueName as string;
      const mosque = mosques.find(m => m.name === mosqueName) || fuzzyMatchMosque(mosqueName, mosques);
      if (!mosque) throw new Error('Mosque not found');

      if (intent.type === 'update_iqama') {
        await executeMosqueUpdate(mosque, {
          iqamaTimes: { ...mosque.iqamaTimes, [intent.prayer]: intent.newTime },
        });
        const prayerName = intent.prayer.charAt(0).toUpperCase() + intent.prayer.slice(1);
        const timeLabel = intent.newTime.type === 'fixed' ? intent.newTime.time : `${intent.newTime.minutes} min after adhan`;
        updateMessage(statusMsgId, {
          content: `Done! ${prayerName} iqama for **${mosque.name}** updated to **${timeLabel}**.`,
          status: 'success',
        });
      } else if (intent.type === 'update_field') {
        const body = buildMergedUpdate(mosque, intent.fieldDef.path, intent.newValue);
        await executeMosqueUpdate(mosque, body);
        updateMessage(statusMsgId, {
          content: `Done! **${intent.fieldDef.label}** for **${mosque.name}** updated to **${intent.displayValue}**.`,
          status: 'success',
        });
      } else if (intent.type === 'update_jumuah') {
        const jumuahValue = intent.times.length === 1
          ? { type: 'fixed' as const, time: intent.times[0] }
          : intent.times.map(t => ({ time: t }));
        await executeMosqueUpdate(mosque, {
          iqamaTimes: { ...mosque.iqamaTimes, jumuah: jumuahValue },
        });
        updateMessage(statusMsgId, {
          content: `Done! Jumu'ah times for **${mosque.name}** updated to **${intent.times.join(', ')}**.`,
          status: 'success',
        });
      } else if (intent.type === 'update_offered_prayers') {
        await executeMosqueUpdate(mosque, { offeredPrayers: intent.prayers });
        const display = intent.prayers.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ');
        updateMessage(statusMsgId, {
          content: `Done! Offered prayers for **${mosque.name}** updated to **${display}**.`,
          status: 'success',
        });
      } else if (intent.type === 'clear_field') {
        let body: any;
        if (intent.fieldDef.path === 'ramadanProgram') {
          body = { ramadanProgram: null };
        } else if (intent.fieldDef.path === 'iqamaTimes.jumuah') {
          const { jumuah, ...rest } = mosque.iqamaTimes as any;
          body = { iqamaTimes: rest };
        } else {
          const clearValue = intent.fieldDef.path.startsWith('ramadanProgram.') ? undefined : null;
          body = buildMergedUpdate(mosque, intent.fieldDef.path, clearValue);
        }
        await executeMosqueUpdate(mosque, body);
        updateMessage(statusMsgId, {
          content: `Done! **${intent.fieldDef.label}** for **${mosque.name}** has been cleared.`,
          status: 'success',
        });
      } else if (intent.type === 'hide_mosque' || intent.type === 'show_mosque') {
        const hide = intent.type === 'hide_mosque';
        await executeMosqueUpdate(mosque, { temporarilyHidden: hide });
        updateMessage(statusMsgId, {
          content: `Done! **${mosque.name}** is now ${hide ? 'hidden from' : 'visible to'} users.`,
          status: 'success',
        });
      }
      } // close else (mosque-based intents)
    } catch (err: any) {
      updateMessage(statusMsgId, {
        content: `Failed: ${err.message || 'Unknown error'}. Please try again or do it manually from the edit page.`,
        status: 'error',
      });
    }

    setIsProcessing(false);
  };

  const handleCancel = () => {
    if (!pendingConfirm) return;
    setPendingConfirm(null);
    addMessage({ role: 'assistant', content: 'Cancelled. No changes made.' });
  };

  const handleReset = () => {
    hasGreeted.current = false;
    setMessages([]);
    setPendingConfirm(null);
    setIsProcessing(false);
    hasGreeted.current = true;
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    addMessage({
      role: 'assistant',
      content: `${greeting}! Fresh start. What can I help with?\n\nTry: "Info for ${mosques[0]?.name || 'Masjid'}", "List volunteers", or "Set Fajr for ${mosques[0]?.name || 'Masjid'} to 6:30 AM"`,
    });
  };

  // ── Render markdown-ish content ─────────────────────────────────
  const renderContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, i) => {
      let processed = line
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/_(.*?)_/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 bg-gray-100 dark:bg-white/10 rounded text-[12px] font-mono">$1</code>');

      if (line.startsWith('• ') || line.startsWith('- ')) {
        return (
          <div key={i} className="flex gap-1.5 ml-1">
            <span className="text-gray-400 dark:text-white/30 select-none flex-shrink-0">•</span>
            <span dangerouslySetInnerHTML={{ __html: processed.replace(/^[•\-]\s*/, '') }} />
          </div>
        );
      }
      if (/^\d+\.\s/.test(line)) {
        const num = line.match(/^(\d+)\./)?.[1];
        return (
          <div key={i} className="flex gap-1.5 ml-1">
            <span className="text-gray-400 dark:text-white/30 select-none flex-shrink-0 min-w-[1rem] text-right">{num}.</span>
            <span dangerouslySetInnerHTML={{ __html: processed.replace(/^\d+\.\s*/, '') }} />
          </div>
        );
      }
      if (line.trim() === '') return <div key={i} className="h-2" />;
      return <div key={i} dangerouslySetInnerHTML={{ __html: processed }} />;
    });
  };

  return (
    <>
      {/* FAB */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gray-900 dark:bg-white rounded-full shadow-lg shadow-black/20 dark:shadow-black/40 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
          aria-label="Open admin assistant"
        >
          <MessageCircle className="w-6 h-6 text-white dark:text-gray-900" />
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-end sm:items-end sm:justify-end sm:p-4">
          <div
            className="absolute inset-0 bg-black/30 dark:bg-black/50 sm:hidden"
            onClick={() => setIsOpen(false)}
          />

          <div className="relative w-full sm:w-[400px] h-full sm:h-[min(620px,85vh)] bg-white dark:bg-[#1C1C1C] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200/50 dark:border-white/[0.08]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/[0.06] bg-gray-50 dark:bg-[#161616] flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-white dark:text-gray-900" />
                </div>
                <div>
                  <h3 className="text-gray-900 dark:text-white text-[14px]">Admin Assistant</h3>
                  <p className="text-[11px] text-gray-500 dark:text-white/40">Actions &amp; help</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleReset}
                  className="p-2 text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
                  aria-label="Reset conversation"
                  title="New conversation"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
            >
              {messages.length > 2 && !isProcessing && !pendingConfirm && (
                <div className="flex justify-center">
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/50 bg-gray-100 dark:bg-white/[0.04] hover:bg-gray-150 dark:hover:bg-white/[0.08] rounded-full transition-colors active:scale-[0.97]"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Clear chat
                  </button>
                </div>
              )}
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[88%] ${
                    msg.role === 'user'
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl rounded-br-md px-3.5 py-2.5'
                      : msg.status === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-200 rounded-2xl rounded-bl-md px-3.5 py-2.5 border border-emerald-200 dark:border-emerald-900/30'
                        : msg.status === 'error'
                          ? 'bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-200 rounded-2xl rounded-bl-md px-3.5 py-2.5 border border-red-200 dark:border-red-900/30'
                          : msg.status === 'pending'
                            ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-200 rounded-2xl rounded-bl-md px-3.5 py-2.5 border border-blue-200 dark:border-blue-900/30'
                            : 'bg-gray-50 dark:bg-white/[0.06] text-gray-800 dark:text-white/85 rounded-2xl rounded-bl-md px-3.5 py-2.5'
                  }`}>
                    {msg.status === 'pending' && (
                      <div className="flex items-center gap-2 mb-1">
                        <Loader className="w-3.5 h-3.5 animate-spin" />
                        <span className="text-[12px]">Working on it…</span>
                      </div>
                    )}
                    <div className="text-[13px] leading-relaxed space-y-0.5">
                      {msg.role === 'user' ? msg.content : renderContent(msg.content)}
                    </div>

                    {/* Related questions */}
                    {msg.relatedQuestions && msg.relatedQuestions.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-gray-200/50 dark:border-white/[0.06] space-y-1.5">
                        <p className="text-[11px] text-gray-400 dark:text-white/30">Related:</p>
                        {msg.relatedQuestions.map((q, i) => (
                          <button
                            key={i}
                            onClick={() => handleSend(q)}
                            className="block w-full text-left text-[12px] text-blue-600 dark:text-blue-400 hover:underline py-0.5"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Confirm / Cancel buttons */}
              {pendingConfirm && !isProcessing && (
                <div className="flex gap-2 ml-1">
                  <button
                    onClick={handleConfirm}
                    className="flex items-center gap-1.5 px-4 py-2 text-[13px] bg-emerald-600 dark:bg-emerald-500 text-white rounded-xl hover:bg-emerald-700 dark:hover:bg-emerald-600 active:scale-[0.97] transition-all"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Yes, apply
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex items-center gap-1.5 px-4 py-2 text-[13px] bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-white/60 rounded-xl hover:bg-gray-200 dark:hover:bg-white/[0.1] active:scale-[0.97] transition-all"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Processing indicator */}
              {isProcessing && !messages.some(m => m.status === 'pending') && (
                <div className="flex justify-start">
                  <div className="bg-gray-50 dark:bg-white/[0.06] rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-gray-300 dark:bg-white/20 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-gray-300 dark:bg-white/20 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-gray-300 dark:bg-white/20 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Quick suggestions (only at start) */}
              {messages.length === 1 && !isProcessing && (
                <div className="space-y-2">
                  <p className="text-[11px] text-gray-400 dark:text-white/30 px-1">Try these:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {quickSuggestions.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(q)}
                        className="px-2.5 py-1.5 text-[12px] bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-white/60 rounded-full hover:bg-gray-200 dark:hover:bg-white/[0.1] transition-colors active:scale-[0.97]"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Scroll to bottom */}
            {showScrollDown && (
              <button
                onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="absolute bottom-20 left-1/2 -translate-x-1/2 w-8 h-8 bg-white dark:bg-[#2C2C2C] border border-gray-200 dark:border-white/[0.1] rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 dark:hover:bg-white/[0.1] transition-colors"
              >
                <ArrowDown className="w-4 h-4 text-gray-500 dark:text-white/50" />
              </button>
            )}

            {/* Input */}
            <div className="flex-shrink-0 border-t border-gray-100 dark:border-white/[0.06] px-3 py-3 bg-white dark:bg-[#1C1C1C]">
              <form
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={pendingConfirm ? 'Confirm or cancel above…' : 'Ask anything or take an action…'}
                  className="flex-1 bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.08] rounded-xl px-3.5 py-2.5 text-[14px] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-gray-900/20 dark:focus:ring-white/20 focus:border-gray-300 dark:focus:border-white/20 transition-all disabled:opacity-50"
                  disabled={isProcessing || !!pendingConfirm}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isProcessing || !!pendingConfirm}
                  className="w-10 h-10 bg-gray-900 dark:bg-white rounded-xl flex items-center justify-center text-white dark:text-gray-900 disabled:opacity-30 hover:bg-gray-800 dark:hover:bg-gray-100 active:scale-95 transition-all flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
              <p className="text-[10px] text-gray-400 dark:text-white/20 text-center mt-2">
                Actions require confirmation · No data sent to third parties
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
