import { Smartphone } from 'lucide-react';
import { AppStoreBadge } from './AppStoreBadge';
import { navigate } from '../utils/router';

interface MobileMiniHeroProps {
  mosqueCount?: number;
}

/**
 * Condensed version of DesktopHero for mobile/tablet — same gradient +
 * glass language and app pitch, but no side-by-side phone mockup (no room
 * for it below `lg`) and no QR (pointless to scan your own screen).
 */
export function MobileMiniHero({ mosqueCount }: MobileMiniHeroProps) {
  return (
    <div className="lg:hidden relative overflow-hidden rounded-2xl mb-4">
      <div
        className="absolute inset-0 dark:hidden"
        style={{ background: 'linear-gradient(135deg, #fdfdfb, #f6f2ea, #ede5d8)' }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 hidden dark:block"
        style={{ background: 'linear-gradient(135deg, #12182a, #151c33, #0b0f1a)' }}
        aria-hidden="true"
      />
      {/* Soft glows via radial-gradient rather than a blurred solid circle —
          `filter: blur()` doesn't reliably clip to a rounded-corner
          `overflow-hidden` parent in every browser and can leave a sharp
          square edge poking past the rounded corner. */}
      <div
        className="absolute -top-10 -right-10 w-40 h-40 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.18), transparent 70%)' }}
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-10 -left-10 w-32 h-32 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.18), transparent 70%)' }}
        aria-hidden="true"
      />

      <div className="relative p-5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/10 dark:border-white/15 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
          <span className="text-[11px] text-gray-600 dark:text-white/70 tracking-wide">
            {mosqueCount ? `${mosqueCount} masajid and counting` : 'Free · Community-driven'}
          </span>
        </div>

        <h2
          className="text-xl font-semibold text-gray-900 dark:text-white mb-1.5 tracking-tight leading-snug"
          style={{ fontFamily: "'Exo 2', sans-serif" }}
        >
          Adhan and Iqama times for Tampa Bay.
        </h2>
        <p className="text-sm text-gray-600 dark:text-white/55 leading-relaxed mb-4">
          Notifications, events, Qibla compass, and more in the app.
        </p>

        <div className="flex items-center gap-2 flex-wrap">
          <AppStoreBadge />
          <button
            onClick={() => navigate('/android')}
            className="h-[40px] flex items-center gap-1.5 px-3 border border-emerald-500/50 dark:border-emerald-400/50 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-medium hover:border-emerald-600 dark:hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 active:scale-[0.98] transition-all"
          >
            <Smartphone className="w-3.5 h-3.5" />
            Join Android Beta
          </button>
        </div>
      </div>
    </div>
  );
}
