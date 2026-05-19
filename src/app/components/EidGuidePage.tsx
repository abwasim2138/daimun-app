import { useCallback } from 'react';
import {
  ArrowLeft, Share2,
  PartyPopper, Clock, Users, Heart,
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

/* ─── Takbirat ─── */
const takbiratArabic = 'اللهُ أكْبَر، اللهُ أكْبَر، لا إلهَ إلَّا الله، اللهُ أكْبَر، اللهُ أكْبَر، ولله الحَمْد';
const takbiratTranslit = 'Allahu Akbar, Allahu Akbar, la ilaha ill-Allah, Allahu Akbar, Allahu Akbar, wa lillahil-hamd';

interface EidGuidePageProps {
  onBack: () => void;
}

export function EidGuidePage({ onBack }: EidGuidePageProps) {
  const handleShare = useCallback(async () => {
    const url = `${SITE_URL}/eid-guide`;
    const shareData = {
      title: 'Eid al-Fitr Guide \u2014 D\u0101im\u016bn',
      text: 'Quick Eid guide: sunnahs, prayer, celebrating, and gift-giving. Eid Mubarak!',
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
          <span className="text-sm text-gray-400 dark:text-white/40">Eid al-Fitr</span>
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
            className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-500/20 mx-auto mb-4">
            <PartyPopper className="w-7 h-7 text-white" />
          </motion.div>
          <h1 className="text-2xl sm:text-3xl tracking-wide mb-3 text-gray-900 dark:text-white/90">
            Eid al-Fitr
          </h1>
          <div className="max-w-xl mx-auto mb-2">
            <p className="text-gray-500 dark:text-white/45 text-xs italic text-left" style={{ lineHeight: '1.7' }}>
              &ldquo;Ramaḍân is the month in which the Quran was revealed as a guide for humanity with clear proofs of guidance and the decisive authority. So whoever is present this month, let them fast. But whoever is ill or on a journey, then ˹let them fast˺ an equal number of days ˹after Ramaḍân˺. Allah intends ease for you, not hardship, so that you may complete the prescribed period and proclaim the greatness of Allah for guiding you, and perhaps you will be grateful.&rdquo;
            </p>
          </div>
          <a
            href="https://quran.com/al-baqarah/185?readingMode=translation&translations=131"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[10px] text-gray-400 dark:text-white/30 mt-1 hover:text-gray-600 dark:hover:text-white/50 transition-colors"
          >
            <span>Quran 2:185</span>
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </FadeUp>

        {/* ━━━ TAKBIRAT ━━━ */}
        <FadeUp delay={0.15} className="mt-6 mb-6">
          <div className="rounded-2xl bg-gradient-to-r from-amber-500/10 to-yellow-500/10 dark:from-amber-500/[0.08] dark:to-yellow-500/[0.08] border border-amber-500/20 dark:border-amber-400/15 p-5 text-center">
            <p className="text-[10px] text-gray-400 dark:text-white/30 uppercase tracking-wider mb-2">Eid Takbirat</p>
            <p className="text-right text-xl text-gray-900 dark:text-white/90 mb-2" style={{ fontFamily: "'Amiri', 'Traditional Arabic', serif", lineHeight: '2' }}>
              {takbiratArabic}
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300 italic">
              {takbiratTranslit}
            </p>
            <p className="text-xs text-gray-500 dark:text-white/40 mt-1">
              Allah is the Greatest, Allah is the Greatest, there is no god but Allah, Allah is the Greatest, Allah is the Greatest, and to Allah belongs all praise
            </p>
            <p className="text-[10px] text-amber-600/50 dark:text-amber-400/50 mt-2 italic" style={{ lineHeight: '1.5' }}>
              This wording is proven from Ibn Mas'ud (RA) and others among the early generation
            </p>
          </div>
        </FadeUp>

        {/* ━━━ WHAT IS IT ━━━ */}
        <FadeUp delay={0.2} className="mb-5">
          <div className="rounded-2xl bg-white/80 dark:bg-white/[0.04] border border-gray-200/60 dark:border-white/[0.06] p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-amber-500/12 flex items-center justify-center flex-shrink-0 mt-0.5">
                <PartyPopper className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h2 className="text-sm text-gray-900 dark:text-white/85 mb-1">What is it?</h2>
                <p className="text-xs text-gray-500 dark:text-white/50" style={{ lineHeight: '1.65' }}>
                  The &ldquo;Festival of Breaking the Fast&rdquo; — one of only two holidays in Islam. A day of gratitude to Allah for completing Ramadan, joy, and celebration. Fasting on this day is prohibited.
                </p>
              </div>
            </div>
            <div className="rounded-xl bg-amber-50/60 dark:bg-amber-500/[0.05] border border-amber-200/40 dark:border-amber-500/10 p-3 ml-11">
              <p className="text-xs text-gray-500 dark:text-white/50 italic" style={{ lineHeight: '1.6' }}>
                &ldquo;When the Messenger of Allah (&#xFDFA;) came to Medina, the people had two days on which they engaged in games. He asked: What are these two days (what is the significance)? They said: We used to engage ourselves on them in the pre-Islamic period. The Messenger of Allah (&#xFDFA;) said: Allah has substituted for them something better than them, the day of sacrifice and the day of the breaking of the fast.&rdquo;
              </p>
              <p className="text-[11px] text-gray-400 dark:text-white/30 mt-1.5">
                &mdash; <SourceLink source="Abu Dawud 1134" />
              </p>
            </div>
          </div>
        </FadeUp>

        {/* ━━━ EID MORNING CHECKLIST ━━━ */}
        <FadeUp delay={0.25} className="mb-5">
          <div className="rounded-2xl bg-white/80 dark:bg-white/[0.04] border border-gray-200/60 dark:border-white/[0.06] p-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/12 flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-sm text-gray-900 dark:text-white/85">Eid morning sunnahs</h2>
            </div>
            <div className="ml-[42px] space-y-1.5">
              {[
                { emoji: '🚿', text: 'Take ghusl (full bath)' },
                { emoji: '👔', text: 'Wear your best clothes' },
                { emoji: '🫒', text: 'Eat odd number of dates before prayer' },
                { emoji: '🌟', text: 'Apply perfume (men)' },
                { emoji: '📢', text: 'Recite takbirat on the way' },
                { emoji: '🚶', text: 'Walk to prayer if possible' },
                { emoji: '🔄', text: 'Take a different route home' },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-2.5 py-1.5 px-2.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-500/[0.04]">
                  <span className="text-sm flex-shrink-0">{item.emoji}</span>
                  <span className="text-[11px] text-gray-600 dark:text-white/55">{item.text}</span>
                </div>
              ))}
            </div>
            <div className="rounded-xl bg-emerald-50/60 dark:bg-emerald-500/[0.05] border border-emerald-200/40 dark:border-emerald-500/10 p-3 ml-[42px] mt-3">
              <p className="text-xs text-gray-500 dark:text-white/50 italic" style={{ lineHeight: '1.6' }}>
                &ldquo;The Prophet (&#xFDFA;) used not to go out on the Day of Id-ul-Fitr unless he had eaten some dates. And he used to eat an odd number of dates.&rdquo;
              </p>
              <p className="text-[11px] text-gray-400 dark:text-white/30 mt-1.5">
                &mdash; <SourceLink source="Sahih Bukhari 953" />
              </p>
            </div>
          </div>
        </FadeUp>

        {/* ━━━ THE PRAYER ━━━ */}
        <FadeUp delay={0.35} className="mb-5">
          <div className="rounded-2xl bg-white/80 dark:bg-white/[0.04] border border-gray-200/60 dark:border-white/[0.06] p-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-full bg-sky-500/12 flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              </div>
              <h2 className="text-sm text-gray-900 dark:text-white/85">The Eid prayer</h2>
            </div>
            <div className="ml-[42px] grid grid-cols-2 gap-2 mb-2.5">
              {[
                { label: '2 rak\u2019ahs', sub: 'with extra takbirat' },
                { label: 'After sunrise', sub: '~15\u201330 min after' },
                { label: 'Extra takbirat', sub: 'scholars differ on count' },
                { label: 'Khutbah after', sub: 'listening recommended' },
              ].map((item) => (
                <div key={item.label} className="py-2 px-2.5 rounded-lg bg-sky-50/50 dark:bg-sky-500/[0.04] border border-sky-200/30 dark:border-sky-500/10 text-center">
                  <div className="text-xs text-sky-700 dark:text-sky-400">{item.label}</div>
                  <div className="text-[10px] text-gray-400 dark:text-white/30">{item.sub}</div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 dark:text-white/30 ml-[42px]">
              Everyone is encouraged to attend — women, children, elderly. Arrive early for best spots.
            </p>
          </div>
        </FadeUp>

        {/* ━━━ CLOSING HADITH ━━━ */}
        <FadeUp delay={0.4}>
          <div className="text-center pt-4 pb-8">
            <div className="w-8 h-px bg-gray-200 dark:bg-white/10 mx-auto mb-4" />
            <p className="text-lg text-amber-600 dark:text-amber-400 mb-2">
              Eid Mubarak!
            </p>
            <p className="text-xs text-gray-400 dark:text-white/25 italic" style={{ lineHeight: '1.6' }}>
              &ldquo;Do not fast during these days, for they are the days of eating, drinking and remembrance of Allah.&rdquo;
            </p>
            <p className="text-xs text-gray-300 dark:text-white/15 mt-1">
              &mdash; <SourceLink source="Sahih Muslim 1141" className="text-gray-300 dark:text-white/15" />
            </p>
          </div>
        </FadeUp>
      </div>
    </div>
  );
}