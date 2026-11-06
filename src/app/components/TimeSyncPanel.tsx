import { useState } from 'react';
import { RefreshCw, ChevronDown, Loader, AlertTriangle, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import type { Mosque, TimeSyncConfig } from '../App';
import { API_URL, publicAnonKey } from '../utils/api';
import { useAuth } from './AuthContext';

/**
 * "Automatic time updates" — lets a masjid admin have Daimun follow the
 * timetable they already publish through themasjidapp.org or AthanPlus.
 * The server reads it twice a day (see supabase/functions/server/timesync.ts).
 */

type Source = NonNullable<TimeSyncConfig['source']>;
type Prayer = 'fajr' | 'dhuhr' | 'asr' | 'isha';

interface Plan {
  coveredThrough: string | null;
  updateNow: { prayer: Prayer; from: string; to: string }[];
  upcoming: { prayer: Prayer; time: string; date: string }[];
  warnings: string[];
}

interface Status {
  ok: boolean;
  message: string;
  checkedAt: string;
  source: string | null;
  sourceLastUpdated?: string;
  updatedNow?: Plan['updateNow'];
  upcoming?: Plan['upcoming'];
  warnings: string[];
}

interface Preview {
  source: Source;
  url: string;
  detected: boolean;
  label: string;
  sourceLastUpdated?: string;
  plan: Plan;
}

interface Props {
  mosque: Mosque;
  onMosqueUpdated: (mosque: Mosque) => void;
}

const LABEL: Record<Prayer, string> = { fajr: 'Fajr', dhuhr: 'Dhuhr', asr: 'Asr', isha: 'Isha' };
const PROVIDER: Record<Source['provider'], string> = { themasjidapp: 'themasjidapp.org', athanplus: 'AthanPlus' };

const day = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const when = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export function TimeSyncPanel({ mosque, onMosqueUpdated }: Props) {
  const { accessToken } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [config, setConfig] = useState<TimeSyncConfig | null>(mosque.timeSync || null);
  const [status, setStatus] = useState<Status | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState<null | 'find' | 'save'>(null);
  const [error, setError] = useState<string | null>(null);

  const enabled = !!config?.enabled;
  const headers = {
    'Content-Type': 'application/json',
    apikey: publicAnonKey,
    Authorization: `Bearer ${accessToken}`,
  };

  const call = async (path: string, init?: RequestInit) => {
    const res = await fetch(`${API_URL}/mosques/${encodeURIComponent(mosque.id)}/timesync${path}`, { ...init, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  };

  const toggle = async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !loaded) {
      try {
        const data = await call('');
        setConfig(data.config);
        setStatus(data.status);
      } catch {
        // Status is a nice-to-have; the panel still works without it.
      }
      setLoaded(true);
    }
  };

  const find = async (pasted?: string) => {
    setBusy('find');
    setError(null);
    setPreview(null);
    try {
      setPreview(await call('/preview', { method: 'POST', body: JSON.stringify(pasted ? { link: pasted } : {}) }));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  };

  const save = async (on: boolean, source?: Source) => {
    setBusy('save');
    setError(null);
    try {
      const data = await call('', { method: 'PUT', body: JSON.stringify({ enabled: on, source: source || config?.source }) });
      setConfig(data.config);
      setStatus(data.status);
      setPreview(null);
      if (data.mosque) onMosqueUpdated(data.mosque);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  };

  const sourceName = config?.source ? `${PROVIDER[config.source.provider]} · ${config.source.id}` : '';

  return (
    <div className="bg-white dark:bg-[#1C1C1C] rounded-2xl border border-gray-200 dark:border-white/[0.1] overflow-hidden">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-sky-50 dark:bg-sky-950/30 rounded-xl flex-shrink-0">
            <RefreshCw className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
              Automatic time updates
              {enabled && (
                <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                  On
                </span>
              )}
            </p>
            <p className="text-xs text-gray-500 dark:text-white/40">
              {enabled ? `Following ${sourceName}` : "Follow the timetable you already publish online"}
            </p>
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 dark:text-white/30 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="border-t border-gray-100 dark:border-white/[0.06] px-4 py-4 space-y-4 text-sm">
          {error && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl px-3 py-2.5">
              <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {enabled ? (
            <>
              {status ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    {status.ok
                      ? <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                      : <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />}
                    <div>
                      <p className="text-gray-900 dark:text-white">{status.message}</p>
                      <p className="text-xs text-gray-500 dark:text-white/40">
                        Last checked {when(status.checkedAt)}
                        {status.sourceLastUpdated && ` · your timetable was last edited ${when(status.sourceLastUpdated)}`}
                      </p>
                    </div>
                  </div>
                  <Changes now={status.updatedNow} upcoming={status.upcoming} warnings={status.warnings} past />
                </div>
              ) : (
                <p className="text-gray-500 dark:text-white/45">Not checked yet.</p>
              )}

              <p className="text-xs text-gray-500 dark:text-white/45 leading-relaxed">
                Checked every morning and evening. While this is on, change Fajr, Dhuhr, Asr and Isha on your{' '}
                {config?.source ? PROVIDER[config.source.provider] : 'online'} timetable rather than here — the next
                check would put them back. Maghrib and Jumuah stay as you set them.
              </p>

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => save(true)} busy={busy === 'save'} primary>Check now</Button>
                <Button onClick={() => save(false)} disabled={!!busy}>Turn off</Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-gray-600 dark:text-white/60 leading-relaxed">
                If your masjid publishes its timetable through <strong className="font-medium">themasjidapp.org</strong> or{' '}
                <strong className="font-medium">AthanPlus (Masjidal)</strong>, Daimun can follow it: today's times are kept
                in step, and upcoming changes are scheduled so the community gets a heads-up the day before.
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={() => find()} busy={busy === 'find'} primary>Find our timetable</Button>
                <span className="text-xs text-gray-400 dark:text-white/30">or</span>
                <input
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && link.trim() && find(link.trim())}
                  placeholder="Paste your timetable link"
                  className="flex-1 min-w-[180px] px-3 py-1.5 rounded-lg text-sm bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.1] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30"
                />
                <Button onClick={() => find(link.trim())} disabled={!link.trim() || !!busy}>Check</Button>
              </div>

              {preview && (
                <div className="rounded-xl border border-gray-200 dark:border-white/[0.08] bg-gray-50/60 dark:bg-white/[0.02] p-3 space-y-3">
                  <div>
                    <p className="text-gray-900 dark:text-white font-medium">
                      {preview.detected ? 'Found on your website: ' : 'Timetable: '}
                      <a href={preview.url} target="_blank" rel="noopener noreferrer" className="text-sky-600 dark:text-sky-400 inline-flex items-center gap-1">
                        {PROVIDER[preview.source.provider]} · {preview.source.id} <ExternalLink className="w-3 h-3" />
                      </a>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-white/40">
                      {preview.plan.coveredThrough ? `Has times through ${day(preview.plan.coveredThrough)}` : 'Has no times entered for today onward yet'}
                      {preview.sourceLastUpdated && ` · last edited ${when(preview.sourceLastUpdated)}`}
                    </p>
                  </div>
                  <Changes now={preview.plan.updateNow} upcoming={preview.plan.upcoming} warnings={preview.plan.warnings} />
                  <Button onClick={() => save(true, preview.source)} busy={busy === 'save'} primary>Turn on</Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Today's corrections, upcoming scheduled changes, and warnings — for a preview or the last run. */
function Changes({ now = [], upcoming = [], warnings = [], past = false }: {
  now?: Plan['updateNow']; upcoming?: Plan['upcoming']; warnings?: string[]; past?: boolean;
}) {
  return (
    <div className="space-y-3">
      {now.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-white/35 mb-1">{past ? 'Updated' : 'Will update today'}</p>
          {now.map((u) => (
            <p key={u.prayer} className="text-gray-800 dark:text-white/80">
              {LABEL[u.prayer]}: {u.from} → <strong className="font-semibold">{u.to}</strong>
            </p>
          ))}
        </div>
      )}
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-white/35 mb-1">
          {past ? 'Scheduled' : 'Will schedule'}{upcoming.length > 0 && ' · heads-up the day before'}
        </p>
        {upcoming.length === 0 ? (
          <p className="text-gray-500 dark:text-white/45">No changes coming up in the next month.</p>
        ) : (
          upcoming.map((u) => (
            <p key={`${u.date}-${u.prayer}`} className="text-gray-800 dark:text-white/80">
              <span className="inline-block w-28 text-gray-500 dark:text-white/45">{day(u.date)}</span>
              {LABEL[u.prayer]} → <strong className="font-semibold">{u.time}</strong>
            </p>
          ))
        )}
      </div>
      {warnings.map((w) => (
        <div key={w} className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-lg px-3 py-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-amber-800 dark:text-amber-300 text-[13px] leading-snug">{w}</p>
        </div>
      ))}
    </div>
  );
}

function Button({ children, onClick, busy, disabled, primary }: {
  children: React.ReactNode; onClick: () => void; busy?: boolean; disabled?: boolean; primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy || disabled}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity disabled:opacity-50 ${
        primary
          ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90'
          : 'bg-gray-100 dark:bg-white/[0.08] text-gray-700 dark:text-white/80 hover:bg-gray-200 dark:hover:bg-white/[0.12]'
      }`}
    >
      {busy && <Loader className="w-3.5 h-3.5 animate-spin" />}
      {children}
    </button>
  );
}
