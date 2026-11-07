import type { Mosque } from '../App';
import { calculateIqamaTimes } from './iqamaCalculator';
import { formatHijriDate } from './hijriConverter';

/**
 * Data behind the "all masjids" times sheet (/prayer-times): one row per
 * masjid with that day's iqama times. The page renders it as a table, and
 * renderAllTimesImage() draws the same data to a picture people can save or
 * share — so the two can't disagree.
 */

export const PRAYER_COLUMNS = [
  { key: 'fajr', label: 'Fajr' },
  { key: 'dhuhr', label: 'Dhuhr' },
  { key: 'asr', label: 'Asr' },
  { key: 'maghrib', label: 'Maghrib' },
  { key: 'isha', label: 'Isha' },
] as const;

export interface AllTimesRow {
  id: string;
  name: string;
  /** Iqama time per PRAYER_COLUMNS entry, or null when the masjid doesn't hold that prayer. */
  times: (string | null)[];
  /** Khutbah times, one per Jumuah slot. */
  jumuah: string[];
}

export interface AllTimesModel {
  dateLabel: string;
  hijriLabel: string;
  rows: AllTimesRow[];
}

export function buildAllTimes(mosques: Mosque[], date: Date): AllTimesModel {
  const rows: AllTimesRow[] = [];
  for (const m of mosques) {
    if (m.temporarilyHidden) continue; // admin hid it while its data is being fixed
    try {
      const t = calculateIqamaTimes(
        m.latitude, m.longitude, m.iqamaTimes, date,
        m.calculationMethod || 'NorthAmerica', m.asrMethod || 'Standard', m.scheduledTimeChanges,
      );
      const offered = (k: string) => !m.offeredPrayers?.length || m.offeredPrayers.includes(k as any);
      const j = t.jumuah ? (Array.isArray(t.jumuah) ? t.jumuah : [t.jumuah]) : [];
      rows.push({
        id: m.id,
        name: m.name,
        times: PRAYER_COLUMNS.map((c) => (offered(c.key) ? t[c.key].iqama : null)),
        jumuah: j.map((x) => x.khutbah).filter(Boolean),
      });
    } catch {
      // One masjid with bad data shouldn't take the whole sheet down.
    }
  }
  rows.sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));

  return {
    dateLabel: date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
    hijriLabel: formatHijriDate(date),
    rows,
  };
}

export const SHEET_TITLE = 'Tampa Bay Iqama Times';
export const SHEET_NOTE = 'Iqama (congregation) times. Times can change — please confirm with your masjid.';
export const SHEET_URL = 'daimun.app/prayer-times';

// ── Picture ──────────────────────────────────────────────────────────────

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

/**
 * Draw the sheet as a PNG. Always light and fixed-width so it reads the same
 * on any phone, in any theme, however it's shared.
 */
export function renderAllTimesImage(model: AllTimesModel): Promise<Blob> {
  const SCALE = 2; // retina-sharp when zoomed on a phone
  const W = 980, PAD = 32;
  const NAME_W = 286, TIME_W = 96, JUMUAH_W = 130; // 286 + 5·96 + 130 = 896 = W − 2·PAD
  const HEAD_H = 118, COLHEAD_H = 46, ROW_MIN = 52, LINE_H = 22, FOOT_H = 84;

  const rowH = (r: AllTimesRow) => Math.max(ROW_MIN, Math.max(r.jumuah.length, 1) * LINE_H + 30);
  const H = HEAD_H + COLHEAD_H + model.rows.reduce((h, r) => h + rowH(r), 0) + FOOT_H;

  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('Image drawing is not available in this browser.'));
  ctx.scale(SCALE, SCALE);

  const text = (s: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign = 'left') => {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(s, x, y);
  };
  const fit = (s: string, maxW: number, font: string) => {
    ctx.font = font;
    if (ctx.measureText(s).width <= maxW) return s;
    let t = s;
    while (t.length > 1 && ctx.measureText(`${t}…`).width > maxW) t = t.slice(0, -1);
    return `${t.trimEnd()}…`;
  };

  // Page + header band
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#111827';
  ctx.fillRect(0, 0, W, HEAD_H);
  text(SHEET_TITLE, PAD, 42, `700 32px ${FONT}`, '#FFFFFF');
  text(`${model.dateLabel}  ·  ${model.hijriLabel}`, PAD, 82, `400 17px ${FONT}`, '#D1D5DB');
  text('Dāimūn', W - PAD, 42, `700 20px ${FONT}`, '#34D399', 'right');

  // Column headings
  let y = HEAD_H;
  ctx.fillStyle = '#F3F4F6';
  ctx.fillRect(0, y, W, COLHEAD_H);
  const colX = (i: number) => PAD + NAME_W + i * TIME_W + TIME_W / 2; // centre of prayer column i
  const jumuahX = PAD + NAME_W + 5 * TIME_W + JUMUAH_W / 2;
  text('MASJID', PAD, y + COLHEAD_H / 2, `700 13px ${FONT}`, '#4B5563');
  PRAYER_COLUMNS.forEach((c, i) => text(c.label.toUpperCase(), colX(i), y + COLHEAD_H / 2, `700 13px ${FONT}`, '#4B5563', 'center'));
  text('JUMUAH', jumuahX, y + COLHEAD_H / 2, `700 13px ${FONT}`, '#4B5563', 'center');
  y += COLHEAD_H;

  // Rows
  model.rows.forEach((r, idx) => {
    const h = rowH(r);
    if (idx % 2 === 1) {
      ctx.fillStyle = '#F9FAFB';
      ctx.fillRect(0, y, W, h);
    }
    ctx.fillStyle = '#E5E7EB';
    ctx.fillRect(0, y + h - 1, W, 1);

    const mid = y + h / 2;
    text(fit(r.name, NAME_W - 16, `600 18px ${FONT}`), PAD, mid, `600 18px ${FONT}`, '#111827');
    r.times.forEach((t, i) =>
      text(t ?? '—', colX(i), mid, `500 17px ${FONT}`, t ? '#111827' : '#9CA3AF', 'center'),
    );
    if (r.jumuah.length === 0) {
      text('—', jumuahX, mid, `500 17px ${FONT}`, '#9CA3AF', 'center');
    } else {
      const top = mid - ((r.jumuah.length - 1) * LINE_H) / 2;
      r.jumuah.forEach((t, i) => text(t, jumuahX, top + i * LINE_H, `500 17px ${FONT}`, '#111827', 'center'));
    }
    y += h;
  });

  // Footer
  text(SHEET_NOTE, PAD, y + 30, `400 14px ${FONT}`, '#6B7280');
  text(SHEET_URL, PAD, y + 58, `600 15px ${FONT}`, '#059669');

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not create the image.'))), 'image/png'),
  );
}
