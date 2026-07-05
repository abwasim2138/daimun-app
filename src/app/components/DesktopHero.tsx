import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone } from 'lucide-react';
import { AppStoreBadge } from './AppStoreBadge';
import { navigate } from '../utils/router';
import { SITE_URL } from '../utils/api';

/**
 * Desktop-only landing hero. The directory/search below is the same on every
 * screen size, but a desktop visitor can't install the app on the device
 * they're using — so this is the pitch to get them onto a phone, front and
 * center, above the (unchanged) useful web experience.
 *
 * Hidden below the `lg` breakpoint — mobile/tablet layout is untouched.
 */
export function DesktopHero() {
  const [screenshots, setScreenshots] = useState<{ mainDark: string; detail: string } | null>(null);

  useEffect(() => {
    import('./screenshotData').then((m) => {
      setScreenshots({ mainDark: m.SCREENSHOT_MAINDARK, detail: m.SCREENSHOT_DETAIL });
    }).catch(() => {});
  }, []);

  return (
    <div className="hidden lg:block relative overflow-hidden border-b border-white/[0.06]">
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(135deg, #12182a, #151c33, #0b0f1a)' }}
        aria-hidden="true"
      />
      <div className="absolute -top-32 -right-20 w-[480px] h-[480px] rounded-full bg-amber-500/10 blur-3xl pointer-events-none" aria-hidden="true" />
      <div className="absolute -bottom-40 -left-20 w-[380px] h-[380px] rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" aria-hidden="true" />

      <div className="relative max-w-6xl mx-auto px-10 py-16 grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-white/60 tracking-wide">Free &middot; Community-driven</span>
          </div>

          <h1
            className="text-4xl xl:text-[2.75rem] font-semibold text-white mb-4 tracking-tight leading-[1.15]"
            style={{ fontFamily: "'Exo 2', sans-serif" }}
          >
            Prayer times & masajid<br />for Tampa Bay
          </h1>
          <p className="text-white/55 text-lg leading-relaxed mb-8 max-w-md">
            Dāimūn is best on your phone — live iqama times, smart notifications before every prayer, and Qibla wherever you are.
          </p>

          <div className="flex items-center gap-3 mb-7 flex-wrap">
            <AppStoreBadge />
            <button
              onClick={() => navigate('/android')}
              className="h-[40px] flex items-center gap-1.5 px-4 border border-emerald-400/50 text-emerald-300 rounded-lg text-sm font-medium hover:border-emerald-400 hover:bg-emerald-500/10 active:scale-[0.98] transition-all"
            >
              <Smartphone className="w-4 h-4" />
              Join Android Beta
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded-lg flex-shrink-0">
              <QRCodeSVG value={SITE_URL} size={56} level="M" bgColor="#ffffff" fgColor="#0b0f1a" />
            </div>
            <span className="text-white/35 text-xs leading-snug">
              Scan with your phone<br />to open &amp; install
            </span>
          </div>
        </div>

        <div className="relative flex justify-center xl:justify-end h-[420px]">
          {screenshots && (
            <>
              <img
                src={screenshots.detail}
                alt=""
                className="absolute h-[380px] w-auto rounded-[1.75rem] shadow-2xl shadow-black/50 rotate-6 top-6 right-2 opacity-90"
                aria-hidden="true"
              />
              <img
                src={screenshots.mainDark}
                alt="Dāimūn app showing live prayer times"
                className="relative h-[420px] w-auto rounded-[1.75rem] shadow-2xl shadow-black/60 -rotate-3"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
