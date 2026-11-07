import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Download, Loader, Printer, Share2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { API_URL } from '../utils/api';
import { publicAnonKey } from '../utils/supabase/info';
import type { Mosque } from '../App';
import {
  PRAYER_COLUMNS, SHEET_NOTE, SHEET_TITLE, SHEET_URL, buildAllTimes, renderAllTimesImage,
} from '../utils/allTimes';

interface AllTimesPageProps {
  onBack: () => void;
}

const isoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * /prayer-times — every masjid's iqama times for a day in one table, to print
 * or to save/share as a picture (for a phone's photos, WhatsApp, a fridge).
 */
export function AllTimesPage({ onBack }: AllTimesPageProps) {
  const [mosques, setMosques] = useState<Mosque[] | null>(null);
  const [error, setError] = useState(false);
  const [dayOffset, setDayOffset] = useState(0);
  const [busy, setBusy] = useState<null | 'save' | 'share'>(null);
  const [canShareFiles, setCanShareFiles] = useState(false);

  useEffect(() => {
    document.title = 'Tampa Bay Iqama Times — All Masjids | Daimun';
    // Share-sheet with a picture is a phone feature; only offer it where it works.
    try {
      const probe = new File([''], 'x.png', { type: 'image/png' });
      setCanShareFiles(typeof navigator.canShare === 'function' && navigator.canShare({ files: [probe] }));
    } catch {
      setCanShareFiles(false);
    }
  }, []);

  // Paper is white: drop dark mode while the print dialog is up, then restore it.
  useEffect(() => {
    const root = document.documentElement;
    let wasDark = false;
    const before = () => { wasDark = root.classList.contains('dark'); root.classList.remove('dark'); };
    const after = () => { if (wasDark) root.classList.add('dark'); wasDark = false; };
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
      after();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/mosques`, {
          headers: { apikey: publicAnonKey, Authorization: `Bearer ${publicAnonKey}` },
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (!cancelled) setMosques(data.mosques || []);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const date = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + dayOffset);
    return d;
  }, [dayOffset]);

  const model = useMemo(() => (mosques ? buildAllTimes(mosques, date) : null), [mosques, date]);
  const isToday = dayOffset === 0;
  const filename = `daimun-iqama-times-${isoDay(date)}.png`;

  const makeImage = async () => {
    if (!model) throw new Error('Times are still loading.');
    return renderAllTimesImage(model);
  };

  const saveImage = async () => {
    setBusy('save');
    try {
      const url = URL.createObjectURL(await makeImage());
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      toast.success('Image saved');
    } catch (e: any) {
      toast.error(e?.message || 'Could not create the image');
    } finally {
      setBusy(null);
    }
  };

  const shareImage = async () => {
    setBusy('share');
    try {
      const file = new File([await makeImage()], filename, { type: 'image/png' });
      await navigator.share({ files: [file], title: SHEET_TITLE });
    } catch (e: any) {
      if (e?.name !== 'AbortError') toast.error('Could not share the image');
    } finally {
      setBusy(null);
    }
  };

  const actionBtn =
    'flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium active:scale-[0.98] transition-transform disabled:opacity-50';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0A0A0A]">
      {/* Screen-only header */}
      <div className="print:hidden sticky top-0 z-10 bg-gray-50/80 dark:bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/[0.06]">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={onBack}
            aria-label="Back"
            className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-xl transition-colors active:scale-95"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-white/80" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-gray-900 dark:text-white truncate">All Masjids</h1>
            <p className="text-xs text-gray-500 dark:text-white/40 truncate">Iqama times in one table</p>
          </div>
        </div>
      </div>

      {/* Controls — screen only */}
      <div className="print:hidden max-w-4xl mx-auto px-4 pt-4 pb-3 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setDayOffset((o) => o - 1)}
              aria-label="Previous day"
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-lg transition-colors active:scale-95"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-white/60" />
            </button>
            <div className="text-center min-w-[170px]">
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {isToday ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'long' })}
              </div>
              <div className="text-xs text-gray-500 dark:text-white/40">
                {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
            <button
              onClick={() => setDayOffset((o) => o + 1)}
              aria-label="Next day"
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-lg transition-colors active:scale-95"
            >
              <ChevronRight className="w-4 h-4 text-gray-600 dark:text-white/60" />
            </button>
            {!isToday && (
              <button
                onClick={() => setDayOffset(0)}
                className="ml-1 px-2.5 py-1 text-xs rounded-lg text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              >
                Today
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={saveImage}
              disabled={!model || busy !== null}
              className={`${actionBtn} bg-gray-900 dark:bg-white text-white dark:text-gray-900`}
            >
              {busy === 'save' ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Save image
            </button>
            {canShareFiles && (
              <button
                onClick={shareImage}
                disabled={!model || busy !== null}
                className={`${actionBtn} bg-white dark:bg-white/[0.08] text-gray-800 dark:text-white border border-gray-200 dark:border-white/[0.1]`}
              >
                {busy === 'share' ? <Loader className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                Share
              </button>
            )}
            <button
              onClick={() => window.print()}
              disabled={!model}
              className={`${actionBtn} bg-white dark:bg-white/[0.08] text-gray-800 dark:text-white border border-gray-200 dark:border-white/[0.1]`}
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
        </div>
      </div>

      <p className="print:hidden max-w-4xl mx-auto px-4 pb-3 text-xs text-gray-500 dark:text-white/40 sm:hidden">
        Swipe the table sideways to see every column — or tap <strong className="font-medium">Save image</strong> to keep a copy.
      </p>

      {/* The sheet — this is what prints */}
      <div className="max-w-4xl mx-auto px-4 pb-10 print:px-0 print:pb-0 print:max-w-none">
        {error ? (
          <div className="rounded-2xl border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20 p-6 text-center text-sm text-red-700 dark:text-red-400">
            Couldn't load the times. Please check your connection and try again.
          </div>
        ) : !model ? (
          <div className="flex items-center justify-center py-24 text-gray-400">
            <Loader className="w-5 h-5 animate-spin" />
          </div>
        ) : (
          <div className="bg-white dark:bg-[#1C1C1C] rounded-2xl print:rounded-none border border-gray-200 dark:border-white/[0.1] print:border-0 overflow-hidden">
            <div className="px-5 py-4 bg-gray-900 print:bg-gray-900 text-white">
              <h2 className="text-lg font-semibold">{SHEET_TITLE}</h2>
              <p className="text-sm text-gray-300 mt-0.5">
                {model.dateLabel} · {model.hijriLabel}
              </p>
            </div>

            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100 dark:bg-white/[0.06] print:bg-gray-100 text-gray-600 dark:text-white/60 print:text-gray-600">
                    <th className="sticky left-0 z-[1] bg-gray-100 dark:bg-[#26262A] print:bg-gray-100 px-3 sm:px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide min-w-[118px] sm:min-w-[170px]">
                      Masjid
                    </th>
                    {PRAYER_COLUMNS.map((c) => (
                      <th key={c.key} className="px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap">
                        {c.label}
                      </th>
                    ))}
                    <th className="px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide">Jumuah</th>
                  </tr>
                </thead>
                <tbody>
                  {model.rows.map((r, i) => {
                    const zebra = i % 2 === 1;
                    return (
                      <tr
                        key={r.id}
                        className={`border-t border-gray-100 dark:border-white/[0.06] print:border-gray-200 print:break-inside-avoid ${
                          zebra ? 'bg-gray-50/70 dark:bg-white/[0.02] print:bg-gray-50' : ''
                        }`}
                      >
                        <th
                          scope="row"
                          className={`sticky left-0 z-[1] px-3 sm:px-4 py-3 text-left font-semibold text-gray-900 dark:text-white ${
                            zebra ? 'bg-gray-50 dark:bg-[#1F1F22] print:bg-gray-50' : 'bg-white dark:bg-[#1C1C1C] print:bg-white'
                          }`}
                        >
                          {r.name}
                        </th>
                        {r.times.map((t, j) => (
                          <td
                            key={j}
                            className={`px-1.5 sm:px-2 py-3 text-center tabular-nums whitespace-nowrap ${
                              t ? 'text-gray-900 dark:text-white' : 'text-gray-300 dark:text-white/20'
                            }`}
                          >
                            {t ?? '—'}
                          </td>
                        ))}
                        <td className="px-1.5 sm:px-2 py-3 text-center tabular-nums whitespace-nowrap text-gray-900 dark:text-white">
                          {r.jumuah.length ? (
                            r.jumuah.map((t, k) => <div key={k}>{t}</div>)
                          ) : (
                            <span className="text-gray-300 dark:text-white/20">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-3 border-t border-gray-100 dark:border-white/[0.06] print:border-gray-200 text-xs text-gray-500 dark:text-white/40 print:text-gray-500">
              <p>{SHEET_NOTE}</p>
              <p className="mt-1 font-medium text-emerald-700 dark:text-emerald-400 print:text-emerald-700">{SHEET_URL}</p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          html, body, .min-h-screen { background: white !important; min-height: 0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          @page { size: portrait; margin: 0.5in; }
          table { font-size: 11px; }
          th, td { padding-top: 5px !important; padding-bottom: 5px !important; }
          .sticky { position: static !important; }
        }
      `}</style>
    </div>
  );
}
