import { useState } from 'react';
import { ArrowLeft, Lightbulb, Droplet, CheckCircle, Loader, User, Phone, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { API_URL } from '../utils/api';
import { publicAnonKey } from '../utils/supabase/info';

interface Props {
  onBack: () => void;
}

type Utility = 'electricity' | 'water' | 'either';

/**
 * /deeds — utility sponsorship interest.
 *
 * Mirrors the "Pay the bill. Earn the deed." flyer: the two bills a person can
 * cover are also the selector, so choosing one is the same gesture as reading
 * about it. We only capture name + phone + preference; which masjid and how
 * much are settled on the follow-up call, since availability changes.
 */
export function DeedsPage({ onBack }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [utility, setUtility] = useState<Utility | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [duplicate, setDuplicate] = useState(false);

  const phoneDigits = phone.replace(/\D/g, '');
  const canSubmit = name.trim().length > 0 && phoneDigits.length >= 10 && utility !== null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/deeds-interest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': publicAnonKey,
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), utility }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');

      setDuplicate(data.duplicate === true);
      setDone(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const options: {
    key: Utility;
    icon: typeof Lightbulb;
    label: string;
    deed: string;
    body: string;
    ring: string;
    tint: string;
    iconColor: string;
  }[] = [
    {
      key: 'electricity',
      icon: Lightbulb,
      label: 'Electricity',
      deed: 'The light on the path to Fajr.',
      body: 'Every step through a lit doorway. Every rakʿah beneath these lights. Every night the doors stay open.',
      ring: 'ring-amber-500 dark:ring-amber-400 border-amber-400/60 dark:border-amber-400/40',
      tint: 'bg-amber-50/70 dark:bg-amber-500/[0.07]',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      key: 'water',
      icon: Droplet,
      label: 'Water',
      deed: 'The wudū before every salah.',
      body: 'Every wudū made at these taps. Every thirst quenched between salah. Every worshipper who stands purified.',
      ring: 'ring-teal-500 dark:ring-teal-400 border-teal-400/60 dark:border-teal-400/40',
      tint: 'bg-teal-50/70 dark:bg-teal-500/[0.07]',
      iconColor: 'text-teal-600 dark:text-teal-400',
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#0A0A0A]">
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
                {duplicate ? "We already have your number" : 'JazākAllāhu khayran'}
              </h2>
              <p className="text-gray-500 dark:text-white/50 text-sm leading-relaxed max-w-xs mx-auto">
                {duplicate
                  ? "We've updated your preference. Someone will still reach out about what's open right now, inshāAllah."
                  : "Someone will reach out to walk you through which bills are open right now, and which masjid you'd like to cover, inshāAllah."}
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
              <div className="mb-9">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/25 mb-5">
                  <Sparkles className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-400 tracking-wide">
                    Sadaqah Jāriyah
                  </span>
                </div>

                <h1 className="text-gray-900 dark:text-white text-4xl font-bold tracking-tight leading-[1.05] mb-4">
                  Pay the bill.
                  <br />
                  <span className="text-amber-600 dark:text-amber-400">Earn the deed.</span>
                </h1>

                <p className="text-gray-500 dark:text-white/50 text-[15px] leading-relaxed">
                  No general fund, no guessing. You cover{' '}
                  <strong className="text-gray-900 dark:text-white font-semibold">
                    one real bill at one real masjid
                  </strong>{' '}
                  — and share in every deed it makes possible.
                </p>
              </div>

              <form onSubmit={handleSubmit}>
                {/* Choose a bill */}
                <div className="mb-3">
                  <p className="text-[11px] uppercase tracking-wider text-gray-400 dark:text-white/35 mb-3">
                    What would you like to cover?
                  </p>

                  <div className="grid sm:grid-cols-2 gap-3">
                    {options.map((opt) => {
                      const Icon = opt.icon;
                      const selected = utility === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setUtility(opt.key)}
                          aria-pressed={selected}
                          className={`text-left rounded-2xl border p-4 transition-all active:scale-[0.99] ${opt.tint} ${
                            selected
                              ? `ring-2 ${opt.ring}`
                              : 'border-gray-200 dark:border-white/[0.08] hover:border-gray-300 dark:hover:border-white/[0.16]'
                          }`}
                        >
                          <Icon className={`w-6 h-6 mb-3 ${opt.iconColor}`} strokeWidth={1.8} />
                          <div className="text-[15px] font-semibold text-gray-900 dark:text-white mb-1.5">
                            {opt.label}
                          </div>
                          <div className="text-[14px] text-gray-700 dark:text-white/70 leading-snug mb-2">
                            {opt.deed}
                          </div>
                          <p className="text-[12.5px] text-gray-500 dark:text-white/45 leading-relaxed">
                            {opt.body}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setUtility('either')}
                    aria-pressed={utility === 'either'}
                    className={`mt-3 w-full text-left rounded-2xl border px-4 py-3.5 transition-all active:scale-[0.99] ${
                      utility === 'either'
                        ? 'ring-2 ring-emerald-500 dark:ring-emerald-400 border-emerald-400/60 dark:border-emerald-400/40 bg-emerald-50/70 dark:bg-emerald-500/[0.07]'
                        : 'border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#1C1C1E] hover:border-gray-300 dark:hover:border-white/[0.16]'
                    }`}
                  >
                    <span className="text-[15px] font-semibold text-gray-900 dark:text-white">Either</span>
                    <span className="block text-[13px] text-gray-500 dark:text-white/45 mt-0.5">
                      Put me wherever the need is greatest.
                    </span>
                  </button>
                </div>

                {/* Contact */}
                <div className="mt-7 space-y-3">
                  <p className="text-[11px] uppercase tracking-wider text-gray-400 dark:text-white/35">
                    How we reach you
                  </p>

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
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-white/30 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      autoComplete="name"
                      disabled={isLoading}
                      className="w-full pl-10 pr-4 py-3.5 border border-gray-300 dark:border-white/[0.12] bg-white dark:bg-[#1C1C1E] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/25 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm disabled:opacity-60"
                    />
                  </div>

                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-white/30 pointer-events-none" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(813) 555-0142"
                      autoComplete="tel"
                      disabled={isLoading}
                      className="w-full pl-10 pr-4 py-3.5 border border-gray-300 dark:border-white/[0.12] bg-white dark:bg-[#1C1C1E] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/25 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm disabled:opacity-60"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !canSubmit}
                    className="w-full py-3.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl text-sm font-medium hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Sending…
                      </>
                    ) : (
                      'Have someone reach out'
                    )}
                  </button>

                  <p className="text-[12.5px] text-gray-400 dark:text-white/35 leading-relaxed text-center pt-1">
                    We&rsquo;ll call or message you about which bills are open and what they run — nothing is
                    charged here.
                  </p>
                </div>
              </form>

              {/* Closing */}
              <p className="mt-9 pt-6 border-t border-gray-200 dark:border-white/[0.08] text-[13px] italic text-gray-400 dark:text-white/30 leading-relaxed">
                The reward continues as long as the light burns and the water flows.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
