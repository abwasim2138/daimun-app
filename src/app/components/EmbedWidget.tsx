import { useEffect, useMemo, useRef, useState } from 'react';
import type { Mosque } from '../App';
import { API_URL, publicAnonKey, SITE_URL } from '../utils/api';
import { calculateIqamaTimes, getNextPrayer } from '../utils/iqamaCalculator';

/**
 * /embed/:id — a compact iqama-times card meant to live inside an <iframe>
 * on a masjid's own website.
 *
 * Everything is read live from the API on every load (and refreshed while
 * the page stays open), so edits made in the Daimun admin show up on the
 * masjid's site without them touching the embed code.
 *
 * Appearance comes from the query string, set when the admin copies the
 * snippet: ?theme=light|dark&accent=RRGGBB. We deliberately ignore the
 * visitor's system theme here — the widget should match the host site, not
 * the visitor's OS.
 */

const DEFAULT_ACCENT = '059669'; // emerald-600, the app's primary green
const REFRESH_MS = 10 * 60_000;  // re-pull data so long-open pages pick up edits
const TICK_MS = 30_000;          // keep "next prayer" current

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
 * The accent as a text colour that stays readable (WCAG AA, 4.5:1) on the card.
 * Admins can pick any colour — a pale brand yellow on white, or navy on the
 * dark card — so nudge it toward black or white only as far as needed. The
 * highlight bar and row tint still use the exact colour they picked.
 */
function readableOn(accentHex: string, bgHex: string, towardHex: string): string {
  const accent = toRgb(accentHex);
  const bg = toRgb(bgHex);
  const toward = toRgb(towardHex);
  for (let t = 0; t <= 1; t += 0.05) {
    const c = accent.map((v, i) => v + (toward[i] - v) * t);
    if (contrast(c, bg) >= 4.5) return toHex(c);
  }
  return towardHex;
}

function readAppearance() {
  const params = new URLSearchParams(window.location.search);
  const dark = params.get('theme') === 'dark';
  const raw = (params.get('accent') || '').replace('#', '');
  const accent = /^[0-9a-fA-F]{6}$/.test(raw) ? raw : DEFAULT_ACCENT;
  return { dark, accent: `#${accent}` };
}

interface Props {
  mosqueId: string;
}

export function EmbedWidget({ mosqueId }: Props) {
  const [{ dark, accent }] = useState(readAppearance);
  const [mosque, setMosque] = useState<Mosque | null>(null);
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const rootRef = useRef<HTMLDivElement | null>(null);

  // The app shell paints a cream/black page background and lets next-themes
  // set color-scheme from the visitor's OS. Inside an iframe both would show
  // around the card, so clear them.
  useEffect(() => {
    const html = document.documentElement;
    html.style.background = 'transparent';
    html.style.colorScheme = 'normal';
    document.body.style.background = 'transparent';
    document.body.style.margin = '0';
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/mosques/${encodeURIComponent(mosqueId)}`, {
          headers: { apikey: publicAnonKey, Authorization: `Bearer ${publicAnonKey}` },
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        const m = data.mosque ?? data;
        if (!cancelled) {
          if (m?.id && !m.temporarilyHidden) {
            setMosque(m);
            setFailed(false);
          } else {
            setFailed(true);
          }
        }
      } catch {
        // Keep showing the last good data on a transient failure.
        if (!cancelled) setFailed((prev) => prev || !mosque);
      }
    };
    load();
    const refresh = setInterval(load, REFRESH_MS);
    const tick = setInterval(() => setNow(new Date()), TICK_MS);
    return () => {
      cancelled = true;
      clearInterval(refresh);
      clearInterval(tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mosqueId]);

  // Tell the host page how tall we are, so /embed.js can size the iframe.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || window.parent === window) return;
    const post = () =>
      window.parent.postMessage(
        { type: 'daimun-embed:height', height: Math.ceil(el.getBoundingClientRect().height) },
        '*',
      );
    post();
    const ro = new ResizeObserver(post);
    ro.observe(el);
    return () => ro.disconnect();
  }, [mosque, failed]);

  const times = useMemo(() => {
    if (!mosque) return null;
    return calculateIqamaTimes(
      mosque.latitude, mosque.longitude, mosque.iqamaTimes, now,
      mosque.calculationMethod || 'NorthAmerica', mosque.asrMethod || 'Standard',
      mosque.scheduledTimeChanges,
    );
  }, [mosque, now]);

  const next = useMemo(
    () => (times ? getNextPrayer(times, mosque?.offeredPrayers) : null),
    [times, mosque?.offeredPrayers],
  );

  // ── Palette ───────────────────────────────────────────────────────
  const c = dark
    ? { bg: '#161616', border: 'rgba(255,255,255,0.10)', text: '#F5F5F5', muted: 'rgba(255,255,255,0.50)', faint: 'rgba(255,255,255,0.35)', rule: 'rgba(255,255,255,0.07)' }
    : { bg: '#FFFFFF', border: '#E5E7EB', text: '#111827', muted: '#6B7280', faint: '#9CA3AF', rule: '#F3F4F6' };
  const accentText = readableOn(accent, c.bg, dark ? '#FFFFFF' : '#000000');
  const accentTint = accent + (dark ? '29' : '14'); // ~16% / ~8% alpha

  const masjidUrl = `${SITE_URL}/?masjid=${encodeURIComponent(mosqueId)}`;

  const card: React.CSSProperties = {
    boxSizing: 'border-box',
    width: '100%',
    background: c.bg,
    color: c.text,
    border: `1px solid ${c.border}`,
    borderRadius: 16,
    padding: '16px 18px 12px',
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    fontSize: 14,
    lineHeight: 1.4,
  };

  if (failed && !mosque) {
    return (
      <div ref={rootRef} style={{ ...card, textAlign: 'center', padding: '22px 18px' }}>
        <div style={{ color: c.muted, marginBottom: 6 }}>Iqama times are unavailable right now.</div>
        <a href={masjidUrl} target="_blank" rel="noopener" style={{ color: accentText, fontSize: 13, textDecoration: 'none' }}>
          View on Dāimūn →
        </a>
      </div>
    );
  }

  if (!mosque || !times) {
    return (
      <div ref={rootRef} style={{ ...card, color: c.faint, textAlign: 'center', padding: '28px 18px' }}>
        Loading iqama times…
      </div>
    );
  }

  const isFriday = now.getDay() === 5;
  const offered = (k: string) =>
    !mosque.offeredPrayers?.length || mosque.offeredPrayers.includes(k as any);

  const rows = [
    offered('fajr') && { key: 'fajr', name: 'Fajr', adhan: times.fajr.adhan, iqama: times.fajr.iqama },
    !isFriday && offered('dhuhr') && { key: 'dhuhr', name: 'Dhuhr', adhan: times.dhuhr.adhan, iqama: times.dhuhr.iqama },
    offered('asr') && { key: 'asr', name: 'Asr', adhan: times.asr.adhan, iqama: times.asr.iqama },
    offered('maghrib') && { key: 'maghrib', name: 'Maghrib', adhan: times.maghrib.adhan, iqama: times.maghrib.iqama },
    offered('isha') && { key: 'isha', name: 'Isha', adhan: times.isha.adhan, iqama: times.isha.iqama },
  ].filter(Boolean) as { key: string; name: string; adhan: string; iqama: string }[];

  const jumuah = times.jumuah ? (Array.isArray(times.jumuah) ? times.jumuah : [times.jumuah]) : [];
  const nextKey = next?.name?.toLowerCase();

  const dateLabel = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const grid: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,1fr) minmax(0,1fr)',
    alignItems: 'center',
  };

  // A plain render helper rather than a nested component, so rows aren't
  // remounted on every 30-second tick.
  const row = (key: string, label: string, mid: string, right: string, active: boolean) => (
    <div
      key={key}
      style={{
        ...grid,
        padding: '8px 10px',
        margin: '0 -10px',
        borderRadius: 8,
        background: active ? accentTint : 'transparent',
        boxShadow: active ? `inset 3px 0 0 ${accent}` : 'none',
      }}
    >
      <span style={{ fontWeight: active ? 600 : 400, color: active ? accentText : c.text }}>{label}</span>
      <span style={{ textAlign: 'center', color: c.muted, fontSize: 13 }}>{mid}</span>
      <span style={{ textAlign: 'right', fontWeight: 600, color: active ? accentText : c.text }}>{right}</span>
    </div>
  );

  return (
    <div ref={rootRef} style={card}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.25, minWidth: 0 }}>{mosque.name}</div>
        <div style={{ color: c.muted, fontSize: 12, whiteSpace: 'nowrap' }}>{dateLabel}</div>
      </div>

      {next && (
        <div style={{ marginTop: 4, fontSize: 13, color: accentText, fontWeight: 500 }}>
          Next: {next.isKhutbah ? 'Jumuah khutbah' : next.name} · {next.iqamaTime}
        </div>
      )}

      {/* Table */}
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${c.rule}` }}>
        <div style={{ ...grid, padding: '0 0 4px', fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: c.faint }}>
          <span>Salah</span>
          <span style={{ textAlign: 'center' }}>Adhan</span>
          <span style={{ textAlign: 'right' }}>Iqama</span>
        </div>

        {rows.map((r) => row(r.key, r.name, r.adhan, r.iqama, nextKey === r.key))}

        {/* getNextPrayer names every Jumuah 'Jumuah', so match on the khutbah time */}
        {jumuah.map((j, i) =>
          row(
            `jumuah-${i}`,
            jumuah.length > 1 ? `Jumuah ${i + 1}` : 'Jumuah',
            'Khutbah',
            j.khutbah,
            nextKey === 'jumuah' && next?.iqamaTime === j.khutbah,
          ),
        )}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 10, paddingTop: 9, borderTop: `1px solid ${c.rule}`, textAlign: 'center' }}>
        <a href={masjidUrl} target="_blank" rel="noopener" style={{ color: c.faint, fontSize: 11.5, textDecoration: 'none' }}>
          Iqama times by <span style={{ color: accentText, fontWeight: 600 }}>Dāimūn</span>
        </a>
      </div>
    </div>
  );
}
