import { motion } from 'motion/react';
import { GetAppPanel } from './GetAppPanel';
import heroEvents from '../assets/hero-events.png';
import heroDetail from '../assets/hero-detail.png';

// Fixed positions/delays for the ambient starfield — hand-placed rather than
// randomized so they read as intentional (a few near the phone, none over the
// text column where they'd be distracting). Dark-mode only — a night sky
// doesn't make sense over the light gradient.
const STARS = [
  { top: '10%', left: '52%', size: 3, duration: 3.4, delay: 0 },
  { top: '20%', left: '68%', size: 2, duration: 4.1, delay: 0.8 },
  { top: '6%', left: '82%', size: 2, duration: 3.7, delay: 1.4 },
  { top: '32%', left: '46%', size: 2, duration: 3.9, delay: 0.4 },
  { top: '58%', left: '88%', size: 3, duration: 4.4, delay: 1.9 },
  { top: '70%', left: '40%', size: 2, duration: 3.5, delay: 1.1 },
];

interface DesktopHeroProps {
  mosqueCount?: number;
}

/**
 * Desktop-only landing hero. The directory/search below is the same on every
 * screen size, but a desktop visitor can't install the app on the device
 * they're using — so this is the pitch to get them onto a phone, front and
 * center, above the (unchanged) useful web experience.
 *
 * Hidden below the `lg` breakpoint — mobile/tablet layout is untouched.
 * Loaded via React.lazy from App.tsx so framer-motion never enters the
 * critical mobile bundle. Colors follow the site's light/dark theme via
 * Tailwind `dark:` variants rather than a fixed palette.
 */
export function DesktopHero({ mosqueCount }: DesktopHeroProps) {
  // Pulled up behind the sticky header (-117px = its rendered height) and
  // padded back down so the gradient reaches the very top of the page while
  // the actual content stays visually in the same place.
  return (
    <div className="hidden lg:block relative overflow-hidden -mt-[117px] pt-[117px]">
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

      {/* Drifting aurora blobs */}
      <motion.div
        className="absolute -top-32 -right-20 w-[480px] h-[480px] rounded-full bg-amber-500/10 blur-3xl pointer-events-none"
        animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden="true"
      />
      <motion.div
        className="absolute -bottom-40 -left-20 w-[380px] h-[380px] rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"
        animate={{ x: [0, -20, 0], y: [0, -25, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        aria-hidden="true"
      />

      {/* Twinkling stars — night-sky texture, dark mode only */}
      <div className="hidden dark:block">
        {STARS.map((s, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full bg-white pointer-events-none"
            style={{ top: s.top, left: s.left, width: s.size, height: s.size }}
            animate={{ opacity: [0.15, 0.9, 0.15] }}
            transition={{ duration: s.duration, repeat: Infinity, delay: s.delay, ease: 'easeInOut' }}
            aria-hidden="true"
          />
        ))}
      </div>

      {/* Glowing horizon line instead of a flat border */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 dark:via-amber-400/30 to-transparent" aria-hidden="true" />

      <div className="relative max-w-6xl mx-auto px-10 py-20 grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-14 items-center">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] backdrop-blur-md border border-black/10 dark:border-white/15 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
              <span className="text-xs text-gray-600 dark:text-white/70 tracking-wide">
                {mosqueCount ? `${mosqueCount} masajid and counting` : 'Free · Community-driven'}
              </span>
            </div>

            <h1
              className="text-4xl xl:text-[2.75rem] font-semibold text-gray-900 dark:text-white mb-4 tracking-tight leading-[1.15]"
              style={{ fontFamily: "'Exo 2', sans-serif" }}
            >
              Adhan and Iqama times for Tampa Bay.
            </h1>
            <p className="text-gray-600 dark:text-white/55 text-lg leading-relaxed mb-8 max-w-md">
              Notifications, events, Qibla compass, and more in the app.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
            className="max-w-md"
          >
            <GetAppPanel />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          className="relative flex justify-center xl:justify-end"
        >
          <div className="absolute w-[320px] h-[320px] rounded-full bg-gradient-to-br from-amber-400/20 via-transparent to-emerald-400/10 blur-3xl pointer-events-none" aria-hidden="true" />

          <motion.div
            className="relative"
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <img
              src={heroEvents}
              alt=""
              className="absolute h-[340px] w-auto rounded-[1.75rem] shadow-2xl shadow-black/50 opacity-70 -left-16 top-16 -rotate-[8deg]"
              aria-hidden="true"
            />
            <img
              src={heroDetail}
              alt="Dāimūn app showing masjid prayer times and details"
              className="relative h-[440px] w-auto rounded-[1.75rem] shadow-2xl shadow-black/60 rotate-[3deg] ring-1 ring-white/10"
            />

            <motion.div
              className="absolute -left-28 bottom-16 bg-white/70 dark:bg-white/10 backdrop-blur-xl border border-black/10 dark:border-white/15 rounded-xl px-3 py-2 shadow-xl"
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            >
              <p className="text-[10px] text-gray-400 dark:text-white/40 uppercase tracking-wide">Reminder set</p>
              <p className="text-sm text-amber-600 dark:text-amber-300 font-semibold">15 min before Isha</p>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
