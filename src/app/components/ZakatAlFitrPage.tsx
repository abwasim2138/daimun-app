import { useCallback } from 'react';
import {
  ArrowLeft, Share2,
  HandHeart, Scale, Clock, Users, DollarSign, Wheat, AlertTriangle,
} from 'lucide-react';
import { motion } from 'motion/react';
import { SITE_URL } from '../utils/api';

/* ─── Hadith source URL helper ─── */
function getHadithUrl(source: string): string | null {
  const collections: [string, string][] = [
    ['Sahih Muslim', 'muslim'],
    ['Sahih Bukhari', 'bukhari'],
    ['Abu Dawud', 'abudawud'],
    ['Tirmidhi', 'tirmidhi'],
    ['Musnad Ahmad', 'ahmad'],
    ['Ibn Majah', 'ibnmajah'],
    ['Nasa\'i', 'nasai'],
  ];
  for (const [key, slug] of collections) {
    if (source.startsWith(key)) {
      const number = source.replace(key, '').trim();
      return number ? `https://sunnah.com/${slug}:${number}` : `https://sunnah.com/${slug}`;
    }
  }
  return null;
}

function SourceLink({ source, className }: { source: string; className?: string }) {
  const url = getHadithUrl(source);
  if (url) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer"
        className={`underline decoration-dotted underline-offset-2 hover:decoration-solid transition-all ${className ?? ''}`}>
        {source}
      </a>
    );
  }
  return <span className={className}>{source}</span>;
}

/* ─── Fade-up wrapper ─── */
function FadeUp({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface ZakatAlFitrPageProps {
  onBack: () => void;
}

export function ZakatAlFitrPage({ onBack }: ZakatAlFitrPageProps) {
  const handleShare = useCallback(async () => {
    const url = `${SITE_URL}/zakat-al-fitr`;
    const shareData = {
      title: 'Zakat al-Fitr Guide \u2014 D\u0101im\u016bn',
      text: 'Quick visual guide to Zakat al-Fitr: amount, timing, and who pays.',
      url,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a]">
      {/* ── Sticky header ─── */}
      <div className="bg-white/80 dark:bg-black/80 border-b border-gray-200/50 dark:border-white/[0.06] sticky top-0 z-20 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center justify-between">
          <button onClick={onBack}
            className="flex items-center gap-2 text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white transition-colors -ml-1 p-1">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Back</span>
          </button>
          <span className="text-sm text-gray-400 dark:text-white/40">Zakat al-Fitr</span>
          <button onClick={handleShare}
            className="p-2 -mr-1 text-gray-400 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/70 transition-colors rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
            aria-label="Share this guide">
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 pb-16">
        {/* ━━━ HERO ━━━ */}
        <FadeUp delay={0} className="pt-8 pb-2 text-center">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.1 }}
            className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 mx-auto mb-4">
            <HandHeart className="w-7 h-7 text-white" />
          </motion.div>
          <h1 className="text-2xl sm:text-3xl tracking-wide mb-1.5 text-gray-900 dark:text-white/90">
            Zakat al-Fitr
          </h1>
          <p className="text-gray-500 dark:text-white/45 text-sm" style={{ lineHeight: '1.5' }}>
            Purify your fast &bull; Feed the needy before Eid
          </p>
        </FadeUp>

        {/* ━━━ BIG 3 STATS ━━━ */}
        <FadeUp delay={0.15} className="mt-6 mb-6">
          <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 to-green-500/10 dark:from-emerald-500/[0.08] dark:to-green-500/[0.08] border border-emerald-500/20 dark:border-emerald-400/15 p-5">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="w-10 h-10 rounded-full bg-emerald-500/15 dark:bg-emerald-400/10 flex items-center justify-center mx-auto mb-2">
                  <Scale className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-lg text-emerald-700 dark:text-emerald-400">~3 kg</div>
                <div className="text-[11px] text-gray-500 dark:text-white/40 mt-0.5">one ṣāʿ of<br/>staple food</div>
              </div>
              <div>
                <div className="w-10 h-10 rounded-full bg-emerald-500/15 dark:bg-emerald-400/10 flex items-center justify-center mx-auto mb-2">
                  <DollarSign className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-lg text-emerald-700 dark:text-emerald-400">$12–15</div>
                <div className="text-[11px] text-gray-500 dark:text-white/40 mt-0.5">cash equivalent<br/>per person</div>
              </div>
              <div>
                <div className="w-10 h-10 rounded-full bg-emerald-500/15 dark:bg-emerald-400/10 flex items-center justify-center mx-auto mb-2">
                  <Clock className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-lg text-emerald-700 dark:text-emerald-400">Before</div>
                <div className="text-[11px] text-gray-500 dark:text-white/40 mt-0.5">Eid prayer<br/>starts</div>
              </div>
            </div>
            <p className="text-[11px] text-center text-gray-400 dark:text-white/30 mt-3.5 pt-3 border-t border-emerald-500/10 dark:border-emerald-400/10">
              Check with your local masjid — some set the amount higher based on the price of dates or rice.
            </p>
          </div>
        </FadeUp>

        {/* ━━━ WHAT IS IT ━━━ */}
        <FadeUp delay={0.25} className="mb-5">
          <div className="rounded-2xl bg-white/80 dark:bg-white/[0.04] border border-gray-200/60 dark:border-white/[0.06] p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/12 flex items-center justify-center flex-shrink-0 mt-0.5">
                <HandHeart className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-sm text-gray-900 dark:text-white/85 mb-1">What is it?</h2>
                <p className="text-xs text-gray-500 dark:text-white/50" style={{ lineHeight: '1.65' }}>
                  A mandatory charity given before Eid al-Fitr prayer. It purifies the fasting person from shortcomings during Ramadan and ensures every Muslim can celebrate Eid with food.
                </p>
              </div>
            </div>
            <div className="rounded-xl bg-emerald-50/60 dark:bg-emerald-500/[0.05] border border-emerald-200/40 dark:border-emerald-500/10 p-3 ml-11">
              <p className="text-xs text-gray-500 dark:text-white/50 italic" style={{ lineHeight: '1.6' }}>
                &ldquo;The Messenger of Allah (ﷺ) prescribed the sadaqah relating to the breaking of the fast as a purification of the fasting from empty and obscene talk and as food for the poor. If anyone pays it before the prayer (of &lsquo;Id), it will be accepted as zakat. If anyone pays it after the prayer, that will be a sadaqah like other sadaqahs (alms).&rdquo;
              </p>
              <p className="text-[11px] text-gray-400 dark:text-white/30 mt-1.5">
                &mdash; <SourceLink source="Abu Dawud 1609" className="text-gray-300 dark:text-white/15" />
              </p>
            </div>
          </div>
        </FadeUp>

        {/* ━━━ WHO PAYS / WHO RECEIVES ━━━ */}
        <FadeUp delay={0.3} className="mb-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/80 dark:bg-white/[0.04] border border-gray-200/60 dark:border-white/[0.06] p-4">
              <div className="w-8 h-8 rounded-full bg-blue-500/12 flex items-center justify-center mb-2.5">
                <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-sm text-gray-900 dark:text-white/85 mb-1.5">Who pays?</h3>
              <ul className="space-y-1.5">
                {['Every Muslim', 'For each dependent', 'Spouse & children', 'Newborns before Eid'].map((t) => (
                  <li key={t} className="flex items-start gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                    <span className="text-[11px] text-gray-500 dark:text-white/45" style={{ lineHeight: '1.5' }}>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl bg-white/80 dark:bg-white/[0.04] border border-gray-200/60 dark:border-white/[0.06] p-4">
              <div className="w-8 h-8 rounded-full bg-rose-500/12 flex items-center justify-center mb-2.5">
                <HandHeart className="w-4 h-4 text-rose-500 dark:text-rose-400" />
              </div>
              <h3 className="text-sm text-gray-900 dark:text-white/85 mb-1.5">Who receives?</h3>
              <ul className="space-y-1.5">
                {['The poor (fuqarāʾ)', 'The needy (masākīn)', 'Local community first', 'Then overseas'].map((t) => (
                  <li key={t} className="flex items-start gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-rose-500 mt-1.5 flex-shrink-0" />
                    <span className="text-[11px] text-gray-500 dark:text-white/45" style={{ lineHeight: '1.5' }}>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </FadeUp>

        {/* ━━━ WHAT TO GIVE ━━━ */}
        <FadeUp delay={0.35} className="mb-5">
          <div className="rounded-2xl bg-white/80 dark:bg-white/[0.04] border border-gray-200/60 dark:border-white/[0.06] p-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-full bg-amber-500/12 flex items-center justify-center flex-shrink-0">
                <Wheat className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-sm text-gray-900 dark:text-white/85">What to give</h2>
            </div>
            <div className="grid grid-cols-3 gap-2 ml-[42px]">
              {[
                { emoji: '🍚', label: 'Rice' },
                { emoji: '🌾', label: 'Wheat / Flour' },
                { emoji: '🫘', label: 'Barley' },
                { emoji: '🥜', label: 'Dates' },
                { emoji: '🍝', label: 'Pasta' },
                { emoji: '🫙', label: 'Lentils' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5 py-1.5 px-2 rounded-lg bg-amber-50/60 dark:bg-amber-500/[0.05] border border-amber-200/30 dark:border-amber-500/10">
                  <span className="text-sm">{item.emoji}</span>
                  <span className="text-[11px] text-gray-600 dark:text-white/50">{item.label}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 dark:text-white/30 mt-3 ml-[42px]" style={{ lineHeight: '1.5' }}>
              One ṣāʿ (~2.5–3 kg) of the staple food of your region, per person.
            </p>
            <div className="rounded-xl bg-amber-50/60 dark:bg-amber-500/[0.05] border border-amber-200/40 dark:border-amber-500/10 p-3 ml-[42px] mt-2.5">
              <p className="text-xs text-gray-500 dark:text-white/50 italic" style={{ lineHeight: '1.6' }}>
                &ldquo;Allah&rsquo;s Messenger (&#xFDFA;) enjoined the payment of one Sa&rsquo; of dates or one Sa&rsquo; of barley as Zakat-ul-Fitr on every Muslim slave or free, male or female, young or old, and he ordered that it be paid before the people went out to offer the &lsquo;Id prayer.&rdquo;
              </p>
              <p className="text-[11px] text-gray-400 dark:text-white/30 mt-1.5">
                &mdash; <SourceLink source="Sahih Bukhari 1503" />
              </p>
            </div>
          </div>
        </FadeUp>

        {/* ━━━ TIMING VISUAL ━━━ */}
        <FadeUp delay={0.4} className="mb-5">
          <div className="rounded-2xl bg-white/80 dark:bg-white/[0.04] border border-gray-200/60 dark:border-white/[0.06] p-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-full bg-violet-500/12 flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              </div>
              <h2 className="text-sm text-gray-900 dark:text-white/85">When to pay</h2>
            </div>
            <div className="ml-[42px] space-y-2">
              {[
                { time: 'Throughout Ramadan', desc: 'Accepted — gives orgs time to distribute', status: 'ok' as const },
                { time: '1–2 days before Eid', desc: 'Best time (Sunnah of the Companions)', status: 'best' as const },
                { time: 'Morning of Eid', desc: 'Before Eid prayer — last chance', status: 'warn' as const },
                { time: 'After Eid prayer', desc: 'Too late — counts as regular sadaqah only', status: 'late' as const },
              ].map((row) => (
                <div key={row.time} className="flex items-start gap-2.5">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    row.status === 'best' ? 'bg-emerald-500' :
                    row.status === 'ok' ? 'bg-blue-400' :
                    row.status === 'warn' ? 'bg-amber-500' :
                    'bg-red-400'
                  }`} />
                  <div>
                    <span className="text-xs text-gray-800 dark:text-white/75">{row.time}</span>
                    <p className="text-[11px] text-gray-400 dark:text-white/35" style={{ lineHeight: '1.4' }}>{row.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </FadeUp>

        {/* ━━━ PAYMENT METHODS ━━━ */}
        <FadeUp delay={0.45} className="mb-5">
          <div className="rounded-2xl bg-white/80 dark:bg-white/[0.04] border border-gray-200/60 dark:border-white/[0.06] p-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/12 flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-sm text-gray-900 dark:text-white/85">Paying with cash?</h2>
                <p className="text-[11px] text-gray-400 dark:text-white/35">Lower fees = more reaches the poor</p>
              </div>
            </div>
            <div className="ml-[42px] space-y-1.5">
              {[
                { method: 'Cash / Check', fee: 'Free', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/[0.06]' },
                { method: 'Zelle', fee: 'Free', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/[0.06]' },
                { method: 'ACH / eCheck', fee: '$0–$0.50', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/[0.06]' },
                { method: 'Debit card', fee: '~1.5%', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/[0.06]' },
                { method: 'Credit card', fee: '2.2–3.5%', color: 'text-red-500 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/[0.06]' },
              ].map((row) => (
                <div key={row.method} className={`flex items-center justify-between py-2 px-3 rounded-lg ${row.bg}`}>
                  <span className="text-xs text-gray-700 dark:text-white/70">{row.method}</span>
                  <span className={`text-xs ${row.color}`}>{row.fee}</span>
                </div>
              ))}
            </div>
          </div>
        </FadeUp>

        {/* ━━━ COMMON MISTAKES ━━━ */}
        <FadeUp delay={0.5} className="mb-5">
          <div className="rounded-2xl bg-red-50/50 dark:bg-red-500/[0.04] border border-red-200/40 dark:border-red-500/10 p-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-full bg-red-500/12 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400" />
              </div>
              <h2 className="text-sm text-gray-900 dark:text-white/85">Common mistakes</h2>
            </div>
            <div className="ml-[42px] space-y-2">
              {[
                'Paying after Eid prayer — no longer valid as Zakat al-Fitr',
                'Forgetting a family member — count everyone you support',
                'Confusing with Zakat al-Mal — that\'s 2.5% of savings, different obligation',
                'Giving non-food items — must be food or its cash equivalent',
              ].map((text) => (
                <div key={text} className="flex items-start gap-2">
                  <span className="text-red-400 dark:text-red-400/70 text-xs mt-0.5 flex-shrink-0">✗</span>
                  <span className="text-[11px] text-gray-600 dark:text-white/50" style={{ lineHeight: '1.5' }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </FadeUp>

        {/* ━━━ QUICK CALCULATOR ━━━ */}
        <FadeUp delay={0.55} className="mb-5">
          <QuickCalc />
        </FadeUp>

        {/* ━━━ CLOSING ━━━ */}
        <FadeUp delay={0.6}>
          <div className="text-center pt-4 pb-8">
            <div className="w-8 h-px bg-gray-200 dark:bg-white/10 mx-auto mb-4" />
            <p className="text-xs text-gray-400 dark:text-white/25 italic" style={{ lineHeight: '1.6' }}>
              &ldquo;If anyone pays it before the prayer (of &lsquo;Id), it will be accepted as zakat. If anyone pays it after the prayer, that will be a sadaqah like other sadaqahs (alms).&rdquo;
            </p>
            <p className="text-xs text-gray-300 dark:text-white/15 mt-1">
              &mdash; <SourceLink source="Abu Dawud 1609" className="text-gray-300 dark:text-white/15" />
            </p>
          </div>
        </FadeUp>
      </div>
    </div>
  );
}

/* ─── Simple family-size calculator ─── */
function QuickCalc() {
  const amounts = [
    { people: 1, low: 12, high: 15 },
    { people: 2, low: 24, high: 30 },
    { people: 3, low: 36, high: 45 },
    { people: 4, low: 48, high: 60 },
    { people: 5, low: 60, high: 75 },
    { people: 6, low: 72, high: 90 },
  ];
  return (
    <div className="rounded-2xl bg-white/80 dark:bg-white/[0.04] border border-gray-200/60 dark:border-white/[0.06] p-4">
      <p className="text-[11px] text-gray-400 dark:text-white/35 uppercase tracking-wider mb-3">
        Quick reference
      </p>
      <div className="grid grid-cols-3 gap-2">
        {amounts.map((row) => (
          <div key={row.people} className="text-center py-2.5 px-2 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.04]">
            <div className="text-lg text-gray-800 dark:text-white/80">{row.people}</div>
            <div className="text-[10px] text-gray-400 dark:text-white/30 mb-1">{row.people === 1 ? 'person' : 'people'}</div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400">${row.low}–${row.high}</div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-gray-400 dark:text-white/25 text-center mt-2.5">
        Based on $12–$15 per person. Ask your masjid for their specific recommendation.
      </p>
    </div>
  );
}