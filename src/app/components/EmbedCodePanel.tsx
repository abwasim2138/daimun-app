import { useEffect, useMemo, useRef, useState } from 'react';
import { Code, Copy, Check, ChevronDown } from 'lucide-react';
import { SITE_URL } from '../utils/api';

interface Props {
  mosqueId: string;
  mosqueName: string;
  /** Number of Jumuah slots — each adds a row, so it drives the fallback height. */
  jumuahCount: number;
}

const ACCENTS = [
  { name: 'Emerald', hex: '059669' },
  { name: 'Teal', hex: '0F766E' },
  { name: 'Navy', hex: '1E3A8A' },
  { name: 'Maroon', hex: '9F1239' },
  { name: 'Gold', hex: 'A16207' },
];

// Measured from the rendered widget: 332px with the five prayers and no
// Jumuah, plus 36px per Jumuah row. The 24px of slack covers a masjid name
// that wraps to two lines on a narrow column. /embed.js then corrects it to
// the exact height; this only matters where a site builder strips <script>.
const BASE_HEIGHT = 332;
const ROW_HEIGHT = 36;
const SLACK = 24;

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * "Add to your website" — lets a masjid admin copy an embed snippet for their
 * own site. The widget reads live data, so the snippet never needs re-copying
 * after edits; only appearance (theme, accent) is baked into it.
 */
export function EmbedCodePanel({ mosqueId, mosqueName, jumuahCount }: Props) {
  const defaultHeight = BASE_HEIGHT + jumuahCount * ROW_HEIGHT + SLACK;
  const [expanded, setExpanded] = useState(false);
  const [dark, setDark] = useState(false);
  const [accent, setAccent] = useState(ACCENTS[0].hex);
  const [copied, setCopied] = useState(false);
  const [previewHeight, setPreviewHeight] = useState(defaultHeight);
  const previewRef = useRef<HTMLIFrameElement | null>(null);

  const query = `theme=${dark ? 'dark' : 'light'}&accent=${accent}`;
  const id = encodeURIComponent(mosqueId);

  // The colour picker fires continuously while dragging; only reload the
  // preview once it settles.
  const [previewQuery, setPreviewQuery] = useState(query);
  useEffect(() => {
    const t = setTimeout(() => setPreviewQuery(query), 250);
    return () => clearTimeout(t);
  }, [query]);
  const name = escapeHtml(mosqueName);

  // The snippet always points at production; the preview uses the current
  // origin so it also works on localhost.
  const snippet = useMemo(
    () =>
      [
        `<!-- Dāimūn iqama times: ${name} -->`,
        `<div style="max-width:420px">`,
        `  <iframe src="${SITE_URL}/embed/${id}?${query}"`,
        `    title="${name} iqama times"`,
        `    style="width:100%;height:${defaultHeight}px;border:0;border-radius:16px;display:block"`,
        `    loading="lazy"></iframe>`,
        `  <p style="margin:8px 0 0;font:13px/1.4 system-ui,sans-serif;text-align:center">`,
        `    <a href="${SITE_URL}/?masjid=${id}">Full ${name} schedule &amp; events</a>`,
        `  </p>`,
        `</div>`,
        `<script src="${SITE_URL}/embed.js" async></script>`,
      ].join('\n'),
    [id, name, query, defaultHeight],
  );

  // Size the preview the same way /embed.js sizes it on a real site.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== previewRef.current?.contentWindow) return;
      if (e.data?.type === 'daimun-embed:height' && Number(e.data.height) > 0) {
        setPreviewHeight(Math.ceil(e.data.height));
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
    } catch {
      // Clipboard API can be blocked (non-secure context, permissions) — fall back.
      const ta = document.createElement('textarea');
      ta.value = snippet;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white dark:bg-[#1C1C1C] rounded-2xl border border-gray-200 dark:border-white/[0.1] overflow-hidden">
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl flex-shrink-0">
            <Code className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-gray-900 dark:text-white">Add to your website</p>
            <p className="text-xs text-gray-500 dark:text-white/40">
              Show your iqama times on your own site — updates automatically
            </p>
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 dark:text-white/30 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="border-t border-gray-100 dark:border-white/[0.06] px-4 py-4 space-y-5">
          {/* Appearance */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-white/45">Style</span>
              <div className="flex rounded-lg bg-gray-100 dark:bg-white/[0.06] p-0.5">
                {[
                  { label: 'Light', value: false },
                  { label: 'Dark', value: true },
                ].map((t) => (
                  <button
                    key={t.label}
                    onClick={() => setDark(t.value)}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      dark === t.value
                        ? 'bg-white dark:bg-white/15 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 dark:text-white/50'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-white/45">Accent</span>
              <div className="flex items-center gap-1.5">
                {ACCENTS.map((a) => (
                  <button
                    key={a.hex}
                    onClick={() => setAccent(a.hex)}
                    title={a.name}
                    aria-label={`${a.name} accent`}
                    aria-pressed={accent === a.hex}
                    className={`w-6 h-6 rounded-full transition-transform ${
                      accent === a.hex ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-[#1C1C1C] scale-110' : ''
                    }`}
                    style={{ background: `#${a.hex}` }}
                  />
                ))}
                <label
                  title="Custom colour (e.g. your site's brand colour)"
                  className={`relative w-6 h-6 rounded-full overflow-hidden border border-dashed border-gray-300 dark:border-white/25 cursor-pointer ${
                    !ACCENTS.some((a) => a.hex === accent) ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-[#1C1C1C]' : ''
                  }`}
                  style={!ACCENTS.some((a) => a.hex === accent) ? { background: `#${accent}` } : undefined}
                >
                  <input
                    type="color"
                    value={`#${accent}`}
                    onChange={(e) => setAccent(e.target.value.replace('#', '').toUpperCase())}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    aria-label="Custom accent colour"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div
            className={`rounded-xl p-4 flex justify-center ${
              dark ? 'bg-[#0A0A0A]' : 'bg-gray-100 dark:bg-white/[0.04]'
            }`}
          >
            <iframe
              ref={previewRef}
              key={previewQuery /* reload on appearance change */}
              src={`${window.location.origin}/embed/${id}?${previewQuery}`}
              title={`${mosqueName} iqama times preview`}
              style={{ width: '100%', maxWidth: 420, height: previewHeight, border: 0, borderRadius: 16, display: 'block' }}
            />
          </div>

          {/* Snippet */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500 dark:text-white/45">Paste this where you want the times to appear</p>
              <button
                onClick={copy}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  copied
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                    : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy code'}
              </button>
            </div>
            <pre className="text-[11.5px] leading-relaxed font-mono bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/[0.08] rounded-xl p-3 overflow-x-auto text-gray-700 dark:text-white/70 whitespace-pre">
              {snippet}
            </pre>
          </div>

          {/* Where to paste */}
          <div className="text-xs text-gray-500 dark:text-white/45 leading-relaxed space-y-1">
            <p className="font-medium text-gray-700 dark:text-white/70">Where to paste it</p>
            <p><span className="text-gray-700 dark:text-white/65">WordPress:</span> add a <em>Custom HTML</em> block.</p>
            <p><span className="text-gray-700 dark:text-white/65">Squarespace:</span> add a <em>Code</em> block.</p>
            <p><span className="text-gray-700 dark:text-white/65">Wix:</span> Add → Embed code → <em>Embed HTML</em>.</p>
            <p className="pt-1">
              Any change you make here — iqama times, Jumuah, scheduled changes — shows up on your site on its
              own. You only need to copy the code again to change the style.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
