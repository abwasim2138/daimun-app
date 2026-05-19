import { Search, X, MapPin, Navigation } from 'lucide-react';
import { useRef, useEffect, useMemo, useCallback, useState } from 'react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  locationSource?: 'cache' | 'ip' | 'gps' | null;
  onRequestLocation?: () => void;
}

const PLACEHOLDER_HINTS = [
  'Search masajid\u2026',
  '\u201cfajr time\u201d',
  '\u201ctaraweeh near me\u201d',
  '\u201ciftar provided\u201d',
  '\u201cjumuah times\u201d',
  '\u201c20 rakat\u201d',
  '\u201cnext prayer\u201d',
  '\u201ceid prayer\u201d',
  '\u201cqiyam\u201d',
];

const ROTATE_INTERVAL = 3400; // ms per hint
const FADE_DURATION = 500;    // ms for crossfade

// ── Search suggestions — tappable autocomplete ──────────────────
const SEARCH_SUGGESTIONS = [
  'Fajr',
  'Dhuhr',
  'Asr',
  'Maghrib',
  'Isha',
  'Next prayer',
  'Iftar time',
  'Suhoor',
  'Jumuah',
  'Taraweeh',
  '8 rakat',
  '20 rakat',
  "I'tikaf",
  'Qiyam',
  'Free iftar',
  'Khatm al-Quran',
  'Eid',
  'Zakat al-Fitr',
  'Nearby',
  'Ramadan info',
];

function matchSuggestions(query: string): string[] {
  if (!query || query.length < 1) return [];
  const q = query.toLowerCase().trim();
  if (!q) return [];
  // Prefix match + contains match, deduped, max 4
  const prefix: string[] = [];
  const contains: string[] = [];
  for (const s of SEARCH_SUGGESTIONS) {
    const lower = s.toLowerCase();
    if (lower.startsWith(q)) prefix.push(s);
    else if (lower.includes(q)) contains.push(s);
  }
  // Don't show if the query already exactly matches a suggestion
  const exact = SEARCH_SUGGESTIONS.some(s => s.toLowerCase() === q);
  if (exact) return [];
  return [...prefix, ...contains].slice(0, 4);
}

/**
 * iOS-style search field with rotating placeholder hints.
 *
 * Design principles:
 * - Zero internal state for the search value — parent owns it.
 * - `type="search"` gives us native iOS clear button + "Search" keyboard key.
 * - Fill colors use exact iOS `tertiarySystemFill` values (#767680 at 12%/24%).
 * - Single passive touchmove listener for keyboard dismissal on scroll.
 * - Rotating placeholder overlay cycles through smart-search examples,
 *   hidden while the input is focused or has a value.
 */
export function SearchBar({ value, onChange, locationSource, onRequestLocation }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [hintIndex, setHintIndex] = useState(0);
  const [hintOpacity, setHintOpacity] = useState(1);
  const [isFocused, setIsFocused] = useState(false);

  const suggestions = useMemo(() => matchSuggestions(value), [value]);
  const showSuggestions = isFocused && suggestions.length > 0;

  // Platform detection (stable — runs once)
  const isSafari = useMemo(() =>
    /^((?!chrome|android).)*safari/i.test(navigator.userAgent), []);

  // Location button visibility:
  // Safari: always show (re-prompts every time, always useful)
  // Others: hide once we have GPS/cached location
  const hasGps = locationSource === 'gps' || locationSource === 'cache';
  const showLocationBtn = onRequestLocation && (isSafari || !hasGps);

  // Rotate placeholder hints
  useEffect(() => {
    // Don't rotate when user is actively searching or focused
    if (value || isFocused) return;

    const timer = setInterval(() => {
      // Fade out
      setHintOpacity(0);

      // After fade-out, switch text and fade in
      setTimeout(() => {
        setHintIndex(prev => (prev + 1) % PLACEHOLDER_HINTS.length);
        setHintOpacity(1);
      }, FADE_DURATION);
    }, ROTATE_INTERVAL);

    return () => clearInterval(timer);
  }, [value, isFocused]);

  // Reset to first hint when search clears
  useEffect(() => {
    if (!value && !isFocused) {
      setHintIndex(0);
      setHintOpacity(1);
    }
  }, [value, isFocused]);

  // Dismiss keyboard when user scrolls (mobile web doesn't do this natively)
  useEffect(() => {
    const dismiss = () => {
      if (document.activeElement === inputRef.current) {
        inputRef.current!.blur();
      }
    };
    document.addEventListener('touchmove', dismiss, { passive: true });
    return () => document.removeEventListener('touchmove', dismiss);
  }, []);

  const handleClear = useCallback(() => {
    onChange('');
    inputRef.current?.focus();
  }, [onChange]);

  const handleSuggestionTap = useCallback((suggestion: string) => {
    onChange(suggestion);
    inputRef.current?.blur();
    // Scroll to top so the SmartSearchCard answer is visible
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }, [onChange]);

  // Trailing action: clear button when searching, location button when idle
  const trailing = value ? (
    <button
      onClick={handleClear}
      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full
                 text-gray-400 dark:text-white/40
                 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]
                 active:bg-black/[0.08] dark:active:bg-white/[0.10]
                 transition-colors"
      aria-label="Clear search"
    >
      <X className="w-4 h-4" />
    </button>
  ) : showLocationBtn ? (
    <button
      onClick={onRequestLocation}
      className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg
                  transition-colors active:scale-95
                  ${hasGps
                    ? 'text-green-600 dark:text-green-400 hover:bg-green-500/[0.08] dark:hover:bg-green-500/[0.12]'
                    : 'text-blue-600 dark:text-blue-400 hover:bg-blue-500/[0.08] dark:hover:bg-blue-500/[0.12]'
                  }`}
      aria-label={hasGps ? 'Refresh location' : 'Enable location'}
      title={hasGps ? 'Refresh precise location' : 'Enable location for distance sorting'}
    >
      {hasGps
        ? <Navigation className="w-4 h-4" />
        : <MapPin className="w-4 h-4" />
      }
    </button>
  ) : null;

  // Show rotating overlay when input is empty and not focused
  const showHintOverlay = !value && !isFocused;

  return (
    <div className="relative w-full">
      {/* Leading search icon */}
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 w-[16px] h-[16px]
                   text-[#8E8E93] dark:text-[#98989D] pointer-events-none z-[1]"
        strokeWidth={2.2}
      />

      {/* Input — uses iOS tertiarySystemFill for the field background */}
      <input
        ref={inputRef}
        type="search"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        placeholder={isFocused ? 'Search masajid\u2026' : ''}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={[
          'w-full h-9 pl-9 text-[17px] rounded-[10px]',
          // Right padding adapts to trailing button
          value ? 'pr-10' : showLocationBtn ? 'pr-11' : 'pr-3',
          // Frosted glass fill — subtle tint that blends with warm tan background
          'bg-black/[0.04] dark:bg-white/[0.08]',
          // Text colors
          'text-gray-900 dark:text-white',
          'placeholder:text-[#8E8E93] dark:placeholder:text-[#98989D]',
          // Focus ring — subtle, not distracting
          'focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:focus:ring-blue-400/30',
          // Smooth transitions
          'transition-shadow duration-150',
        ].join(' ')}
      />

      {/* Rotating hint overlay — sits above input, pointer-events-none so clicks pass through */}
      {showHintOverlay && (
        <span
          className="absolute left-9 top-1/2 -translate-y-1/2 text-[17px]
                     text-[#8E8E93] dark:text-[#98989D] pointer-events-none
                     select-none whitespace-nowrap overflow-hidden max-w-[calc(100%-3.5rem)]"
          style={{
            opacity: hintOpacity,
            transition: `opacity ${FADE_DURATION}ms ease`,
          }}
          aria-hidden="true"
        >
          {PLACEHOLDER_HINTS[hintIndex]}
        </span>
      )}

      {trailing}

      {/* Autocomplete suggestions dropdown */}
      {showSuggestions && (
        <ul
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-50
                     bg-white/95 dark:bg-[#1c1c1e]/95 backdrop-blur-xl
                     border border-gray-200/60 dark:border-white/[0.1]
                     rounded-xl shadow-lg overflow-hidden"
          role="listbox"
        >
          {suggestions.map((s) => (
            <li key={s}>
              <button
                type="button"
                role="option"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSuggestionTap(s)}
                className="w-full text-left px-3.5 py-2.5 flex items-center gap-2.5
                           text-[15px] text-gray-900 dark:text-white/90
                           hover:bg-black/[0.04] dark:hover:bg-white/[0.06]
                           active:bg-black/[0.08] dark:active:bg-white/[0.10]
                           transition-colors"
              >
                <Search className="w-3.5 h-3.5 text-gray-400 dark:text-white/30 flex-shrink-0" />
                <span>{s}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}