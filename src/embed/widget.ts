/**
 * Standalone iqama-times widget served at /embed/:id (via embed.html).
 *
 * Deliberately separate from the main app: no React, no app shell, and one
 * request for this masjid only — not the full masjid / janaza lists the app
 * preloads. It lives on other people's websites, so it should cost them as
 * little as possible.
 *
 * Data is read live on load and re-pulled every 10 minutes, so edits made in
 * the Daimun admin appear on the masjid's site without touching the snippet.
 * Appearance comes from the query string, set when the admin copies it:
 * ?theme=light|dark&accent=RRGGBB. The visitor's OS theme is ignored on
 * purpose — the widget should match the host site.
 */
import type { Mosque } from '../app/App';
import { API_URL, publicAnonKey, SITE_URL } from '../app/utils/api';
import { calculateIqamaTimes, getNextPrayer } from '../app/utils/iqamaCalculator';

const DEFAULT_ACCENT = '059669'; // emerald-600, the app's primary green
const REFRESH_MS = 10 * 60_000;
const TICK_MS = 30_000;

// ── Appearance ─────────────────────────────────────────────────────────

const params = new URLSearchParams(location.search);
const dark = params.get('theme') === 'dark';
const rawAccent = (params.get('accent') || '').replace('#', '');
const accent = '#' + (/^[0-9a-fA-F]{6}$/.test(rawAccent) ? rawAccent : DEFAULT_ACCENT);

const c = dark
  ? { bg: '#161616', border: 'rgba(255,255,255,0.10)', text: '#F5F5F5', muted: 'rgba(255,255,255,0.50)', faint: 'rgba(255,255,255,0.35)', rule: 'rgba(255,255,255,0.07)' }
  : { bg: '#FFFFFF', border: '#E5E7EB', text: '#111827', muted: '#6B7280', faint: '#9CA3AF', rule: '#F3F4F6' };

const toRgb = (hex: string) => hex.replace('#', '').match(/\w\w/g)!.map((h) => parseInt(h, 16));
const toHex = (rgb: number[]) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

function luminance([r, g, b]: number[]) {
  const f = (v: number) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(a: number[], b: number[]) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * The accent as a text colour that stays readable (WCAG AA, 4.5:1) on the
 * card. Admins can pick any colour — a pale brand yellow on white, or navy on
 * the dark card — so nudge it toward black or white only as far as needed.
 * The highlight bar and row tint still use the exact colour they picked.
 */
function readableOn(accentHex: string, bgHex: string, towardHex: string): string {
  const a = toRgb(accentHex);
  const bg = toRgb(bgHex);
  const to = toRgb(towardHex);
  for (let t = 0; t <= 1; t += 0.05) {
    const mixed = a.map((v, i) => v + (to[i] - v) * t);
    if (contrast(mixed, bg) >= 4.5) return toHex(mixed);
  }
  return towardHex;
}

const accentText = readableOn(accent, c.bg, dark ? '#FFFFFF' : '#000000');
const accentTint = accent + (dark ? '29' : '14'); // ~16% / ~8% alpha

// ── Helpers ────────────────────────────────────────────────────────────

/** Masjid names and khutbah times are admin-entered — never trust them as HTML. */
const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

const style = (o: Record<string, string | number>) =>
  Object.entries(o)
    .map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}:${v}`)
    .join(';');

const mosqueId = decodeURIComponent((location.pathname.match(/^\/embed\/([^/]+)/) || [])[1] || '');
const masjidUrl = `${SITE_URL}/?masjid=${encodeURIComponent(mosqueId)}`;
const root = document.getElementById('root')!;

const card = style({
  boxSizing: 'border-box',
  width: '100%',
  background: c.bg,
  color: c.text,
  border: `1px solid ${c.border}`,
  borderRadius: '16px',
  padding: '16px 18px 12px',
  fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  fontSize: '14px',
  lineHeight: 1.4,
});

const grid = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,1fr) minmax(0,1fr)',
  alignItems: 'center',
});

function row(label: string, mid: string, right: string, active: boolean) {
  const box = style({
    padding: '8px 10px',
    margin: '0 -10px',
    borderRadius: '8px',
    background: active ? accentTint : 'transparent',
    boxShadow: active ? `inset 3px 0 0 ${accent}` : 'none',
  });
  const strong = active ? accentText : c.text;
  return `<div style="${grid};${box}">
    <span style="font-weight:${active ? 600 : 400};color:${strong}">${esc(label)}</span>
    <span style="text-align:center;color:${c.muted};font-size:13px">${esc(mid)}</span>
    <span style="text-align:right;font-weight:600;color:${strong}">${esc(right)}</span>
  </div>`;
}

// ── Rendering ──────────────────────────────────────────────────────────

let mosque: Mosque | null = null;
let failed = false;

function render() {
  if (!mosque) {
    root.innerHTML = failed
      ? `<div style="${card};text-align:center;padding:22px 18px">
           <div style="color:${c.muted};margin-bottom:6px">Iqama times are unavailable right now.</div>
           <a href="${masjidUrl}" target="_blank" rel="noopener" style="color:${accentText};font-size:13px;text-decoration:none">View on Dāimūn →</a>
         </div>`
      : `<div style="${card};color:${c.faint};text-align:center;padding:28px 18px">Loading iqama times…</div>`;
    return;
  }

  const now = new Date();
  const times = calculateIqamaTimes(
    mosque.latitude, mosque.longitude, mosque.iqamaTimes, now,
    mosque.calculationMethod || 'NorthAmerica', mosque.asrMethod || 'Standard',
    mosque.scheduledTimeChanges,
  );
  const next = getNextPrayer(times, mosque.offeredPrayers);
  const nextKey = next?.name?.toLowerCase();

  const isFriday = now.getDay() === 5;
  const offered = (k: string) => !mosque!.offeredPrayers?.length || mosque!.offeredPrayers.includes(k as any);

  const rows = [
    offered('fajr') && ['fajr', 'Fajr', times.fajr],
    !isFriday && offered('dhuhr') && ['dhuhr', 'Dhuhr', times.dhuhr],
    offered('asr') && ['asr', 'Asr', times.asr],
    offered('maghrib') && ['maghrib', 'Maghrib', times.maghrib],
    offered('isha') && ['isha', 'Isha', times.isha],
  ].filter(Boolean) as [string, string, { adhan: string; iqama: string }][];

  const jumuah = times.jumuah ? (Array.isArray(times.jumuah) ? times.jumuah : [times.jumuah]) : [];
  const dateLabel = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  root.innerHTML = `<div style="${card}">
    <div style="display:flex;align-items:baseline;justify-content:space-between;gap:12px">
      <div style="font-weight:700;font-size:16px;line-height:1.25;min-width:0">${esc(mosque.name)}</div>
      <div style="color:${c.muted};font-size:12px;white-space:nowrap">${esc(dateLabel)}</div>
    </div>
    ${next ? `<div style="margin-top:4px;font-size:13px;color:${accentText};font-weight:500">
      Next: ${esc(next.isKhutbah ? 'Jumuah khutbah' : next.name)} · ${esc(next.iqamaTime)}
    </div>` : ''}
    <div style="margin-top:12px;padding-top:10px;border-top:1px solid ${c.rule}">
      <div style="${grid};padding:0 0 4px;font-size:10.5px;letter-spacing:0.08em;text-transform:uppercase;color:${c.faint}">
        <span>Salah</span><span style="text-align:center">Adhan</span><span style="text-align:right">Iqama</span>
      </div>
      ${rows.map(([key, name, t]) => row(name, t.adhan, t.iqama, nextKey === key)).join('')}
      ${jumuah
        // getNextPrayer names every Jumuah 'Jumuah', so match on the khutbah time
        .map((j, i) => row(jumuah.length > 1 ? `Jumuah ${i + 1}` : 'Jumuah', 'Khutbah', j.khutbah,
          nextKey === 'jumuah' && next?.iqamaTime === j.khutbah))
        .join('')}
    </div>
    <div style="margin-top:10px;padding-top:9px;border-top:1px solid ${c.rule};text-align:center">
      <a href="${masjidUrl}" target="_blank" rel="noopener" style="color:${c.faint};font-size:11.5px;text-decoration:none">
        Iqama times by <span style="color:${accentText};font-weight:600">Dāimūn</span>
      </a>
    </div>
  </div>`;
}

// ── Data ───────────────────────────────────────────────────────────────

async function load() {
  if (!mosqueId) {
    failed = true;
    return render();
  }
  try {
    const res = await fetch(`${API_URL}/mosques/${encodeURIComponent(mosqueId)}`, {
      headers: { apikey: publicAnonKey, Authorization: `Bearer ${publicAnonKey}` },
    });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    const m = data.mosque ?? data;
    if (m?.id && !m.temporarilyHidden) {
      mosque = m;
      failed = false;
    } else {
      mosque = null;
      failed = true;
    }
  } catch {
    // Keep showing the last good data on a transient failure.
    if (!mosque) failed = true;
  }
  render();
}

// ── Host-page sizing ───────────────────────────────────────────────────
// Report our height so /embed.js on the host page can size the iframe.
if (window.parent !== window) {
  new ResizeObserver(() =>
    window.parent.postMessage(
      { type: 'daimun-embed:height', height: Math.ceil(root.getBoundingClientRect().height) },
      '*',
    ),
  ).observe(root);
}

// Count embed views alongside the app's page views (admin → Analytics).
fetch(`${API_URL}/analytics/track`, {
  method: 'POST',
  headers: { apikey: publicAnonKey, Authorization: `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ page: location.pathname, tz: Intl.DateTimeFormat().resolvedOptions().timeZone }),
}).catch(() => {});

render();
load();
setInterval(load, REFRESH_MS);
setInterval(render, TICK_MS);
