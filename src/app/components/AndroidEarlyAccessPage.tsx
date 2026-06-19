import { useState, useEffect } from 'react';
import { ArrowLeft, Zap, FlaskConical, MessageSquare, CheckCircle, Loader, Mail, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from 'next-themes@0.4.6';
import { API_URL } from '../utils/api';
import { publicAnonKey } from '../utils/supabase/info';

interface Props {
  onBack: () => void;
  iconSrc: string;
}

// Google Play requires 12 testers opted in for 14 continuous days
// before a new app can be promoted to production.
const TESTER_GOAL = 12;

const BULLETS = [
  { icon: Zap, text: 'Access to active test builds before public launch' },
  { icon: FlaskConical, text: 'Expect rough edges — this is testing, not production' },
  { icon: MessageSquare, text: 'A direct line to share feedback' },
];

export function AndroidEarlyAccessPage({ onBack, iconSrc }: Props) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [duplicate, setDuplicate] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [screenshots, setScreenshots] = useState<{ mainDark: string; mainLight: string; detail: string } | null>(null);

  useEffect(() => {
    import('./screenshotData').then((m) => {
      setScreenshots({ mainDark: m.SCREENSHOT_MAINDARK, mainLight: m.SCREENSHOT_MAINLIGHT, detail: m.SCREENSHOT_DETAIL });
    }).catch(console.error);
  }, []);

  const fetchCount = async () => {
    try {
      const res = await fetch(`${API_URL}/early-access/count`, {
        headers: {
          'apikey': publicAnonKey,
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      const data = await res.json();
      if (typeof data.total === 'number') setCount(data.total);
    } catch (err) {
      console.error('Failed to fetch tester count:', err);
    }
  };

  useEffect(() => {
    fetchCount();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/early-access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': publicAnonKey,
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong.');
      }

      setDuplicate(data.duplicate === true);
      setDone(true);
      fetchCount();
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a]">
      {/* Nav bar */}
      <div className="bg-white/80 dark:bg-black/80 border-b border-gray-200/50 dark:border-white/[0.06] sticky top-0 z-20 backdrop-blur-xl">
        <div className="max-w-lg mx-auto px-5 py-3 flex items-center">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white transition-colors -ml-1 p-1"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Back</span>
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-12">
        <AnimatePresence mode="wait">
          {done ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
              className="text-center pt-8"
            >
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full bg-emerald-400/20 dark:bg-emerald-500/15 blur-xl" />
                <div className="relative w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <CheckCircle className="w-9 h-9 text-white" />
                </div>
              </div>
              <h2 className="text-gray-900 dark:text-white mb-3 text-2xl font-bold">
                {duplicate ? "You're already on the list" : "You're on the list"}
              </h2>
              <p className="text-gray-500 dark:text-white/50 text-sm leading-relaxed max-w-xs mx-auto">
                {duplicate
                  ? "We already have your email. We'll reach out with testing access, inshāAllah."
                  : "JazākAllāhu khayran — we'll be in touch inshāAllah when the early builds are ready for testing."}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            >
              {/* Hero */}
              <div className="text-center mb-10">
                <div className="relative w-20 h-20 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-3xl bg-emerald-400/20 dark:bg-emerald-500/15 blur-xl scale-125" />
                  <img
                    src={iconSrc}
                    alt="Dāimūn app icon"
                    className="relative w-20 h-20 rounded-3xl object-cover shadow-xl shadow-black/20"
                  />
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/25 mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 tracking-wide">Now in Testing</span>
                </div>

                <h1 className="text-gray-900 dark:text-white text-3xl font-bold mb-3 tracking-tight">
                  Dāimūn for Android
                </h1>
                <p className="text-gray-500 dark:text-white/50 text-sm leading-relaxed max-w-xs mx-auto">
                  The Android app is in active testing. Leave your email and we'll reach out with access, inshāAllah.
                </p>
              </div>

              {/* Screenshots — horizontal scroll, theme-aware main screen */}
              {screenshots && (
                <div className="mb-8 -mx-5 px-5">
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                      className="flex-shrink-0 snap-center"
                    >
                      <img
                        src={isDark ? screenshots.mainDark : screenshots.mainLight}
                        alt="Dāimūn main screen"
                        className="h-[420px] w-auto shadow-2xl shadow-black/30"
                      />
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                      className="flex-shrink-0 snap-center pr-5"
                    >
                      <img
                        src={screenshots.detail}
                        alt="Masjid detail screen"
                        className="h-[420px] w-auto shadow-2xl shadow-black/30"
                      />
                    </motion.div>
                  </div>
                </div>
              )}

              {/* Tester progress — Google Play requires 12 testers to launch */}
              {count !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                  className="mb-8 bg-white dark:bg-[#1C1C1E] border border-gray-200/60 dark:border-white/[0.07] rounded-2xl p-4"
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {Math.min(count, TESTER_GOAL)} of {TESTER_GOAL} testers
                      </span>
                    </div>
                    <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      {Math.round((Math.min(count, TESTER_GOAL) / TESTER_GOAL) * 100)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 dark:bg-white/[0.07] overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((count / TESTER_GOAL) * 100, 100)}%` }}
                      transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1], delay: 0.2 }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-white/40 mt-2.5 leading-relaxed">
                    {count >= TESTER_GOAL
                      ? "We've hit the tester goal — but more testers keep it strong. Jump in!"
                      : `Google requires ${TESTER_GOAL} active testers before Dāimūn can launch on the Play Store. Help us get there — every tester counts!`}
                  </p>
                </motion.div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-3 mb-8">
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl px-4 py-3"
                    >
                      <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-white/30 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    disabled={isLoading}
                    className="w-full pl-10 pr-4 py-3.5 border border-gray-300 dark:border-white/[0.12] bg-white dark:bg-[#1C1C1E] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/25 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm disabled:opacity-60"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !email.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl transition-all text-sm font-semibold shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] relative overflow-hidden"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-[shimmer_3.5s_ease-in-out_infinite]" />
                  {isLoading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin relative z-10" />
                      <span className="relative z-10">Saving…</span>
                    </>
                  ) : (
                    <span className="relative z-10">Request Early Access</span>
                  )}
                </button>
              </form>

              {/* Bullets */}
              <div className="space-y-3">
                {BULLETS.map(({ icon: Icon, text }, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.07, duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                    className="flex items-center gap-3 bg-white dark:bg-[#1C1C1E] border border-gray-200/60 dark:border-white/[0.07] rounded-2xl px-4 py-3.5"
                  >
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <p className="text-sm text-gray-700 dark:text-white/70">{text}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
