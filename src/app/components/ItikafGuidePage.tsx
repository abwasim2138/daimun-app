import { useCallback } from 'react';
import {
  ArrowLeft, Share2,
  Moon, BookOpen, Clock, MapPin, ShieldCheck, Star, Utensils,
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

interface ItikafGuidePageProps {
  onBack: () => void;
}

export function ItikafGuidePage({ onBack }: ItikafGuidePageProps) {
  const handleShare = useCallback(async () => {
    const url = `${SITE_URL}/itikaf-guide`;
    const shareData = {
      title: 'I\u2019tikaf Guide \u2014 D\u0101im\u016bn',
      text: 'Quick visual guide to i\u2019tikaf: what to bring, what to do, and how to seek Laylat al-Qadr.',
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
          <span className="text-sm text-gray-400 dark:text-white/40">I&#39;tikaf Guide</span>
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
            className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 mx-auto mb-4">
            <Moon className="w-7 h-7 text-white" />
          </motion.div>
          <h1 className="text-2xl sm:text-3xl tracking-wide mb-1.5 text-gray-900 dark:text-white/90">
            I&#39;tikaf
          </h1>
          <p className="text-gray-500 dark:text-white/45 text-sm" style={{ lineHeight: '1.5' }}>
            Seclude yourself with Allah &bull; Seek Laylat al-Qadr
          </p>
        </FadeUp>

        {/* ━━━ DU'A HIGHLIGHT ━━━ */}
        <FadeUp delay={0.15} className="mt-6 mb-6">
          <div className="rounded-2xl bg-gradient-to-r from-indigo-500/10 to-violet-500/10 dark:from-indigo-500/[0.08] dark:to-violet-500/[0.08] border border-indigo-500/20 dark:border-indigo-400/15 p-5 text-center">
            <p className="text-[10px] text-gray-400 dark:text-white/30 uppercase tracking-wider mb-2">Du&rsquo;a for Laylat al-Qadr</p>
            <p className="text-right text-xl text-gray-900 dark:text-white/90 mb-2" style={{ fontFamily: "'Amiri', 'Traditional Arabic', serif", lineHeight: '2' }}>
              {'\u0627\u0644\u0644\u0651\u064E\u0647\u064F\u0645\u0651\u064E \u0625\u0650\u0646\u0651\u064E\u0643\u064E \u0639\u064E\u0641\u064F\u0648\u0651\u064C \u062A\u064F\u062D\u0650\u0628\u0651\u064F \u0627\u0644\u0639\u064E\u0641\u0652\u0648\u064E \u0641\u064E\u0627\u0639\u0652\u0641\u064F \u0639\u064E\u0646\u0651\u064E\u0627'}
            </p>
            <p className="text-sm text-indigo-700 dark:text-indigo-300 italic">
              Allahumma innaka &#39;afuwwun, tuhibb al-&#39;afwa, fa&#39;fu &#39;anna
            </p>
            <p className="text-xs text-gray-500 dark:text-white/40 mt-1">
              O Allah, You are pardoning and love to pardon, so pardon us
            </p>
            <p className="text-[10px] text-gray-400 dark:text-white/25 mt-2">
              <SourceLink source="Tirmidhi 3513" className="text-gray-400 dark:text-white/25" />
            </p>
          </div>
        </FadeUp>

        {/* ━━━ BIG 3 STATS ━━━ */}
        <FadeUp delay={0.2} className="mb-6">
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Moon, label: 'Last 10 nights', sub: 'of Ramadan', color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-500/12' },
              { icon: MapPin, label: 'In the masjid', sub: 'full seclusion', color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-500/12' },
              { icon: Star, label: 'Laylat al-Qadr', sub: '> 1,000 months', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/12' },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="rounded-2xl bg-white/80 dark:bg-white/[0.04] border border-gray-200/60 dark:border-white/[0.06] p-3.5 text-center">
                  <div className={`w-9 h-9 rounded-full ${s.bg} flex items-center justify-center mx-auto mb-2`}>
                    <Icon className={`w-4 h-4 ${s.color}`} />
                  </div>
                  <div className={`text-xs ${s.color}`}>{s.label}</div>
                  <div className="text-[10px] text-gray-400 dark:text-white/30 mt-0.5">{s.sub}</div>
                </div>
              );
            })}
          </div>
        </FadeUp>

        {/* ━━━ WHAT IS IT ━━━ */}
        <FadeUp delay={0.25} className="mb-5">
          <div className="rounded-2xl bg-white/80 dark:bg-white/[0.04] border border-gray-200/60 dark:border-white/[0.06] p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-indigo-500/12 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Moon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="text-sm text-gray-900 dark:text-white/85 mb-1">What is it?</h2>
                <p className="text-xs text-gray-500 dark:text-white/50" style={{ lineHeight: '1.65' }}>
                  A spiritual retreat where you seclude yourself in the masjid to worship Allah. The Prophet &#xFDFA; observed it every Ramadan during the last 10 nights. Both men and women can observe it.
                </p>
              </div>
            </div>
            <div className="rounded-xl bg-indigo-50/60 dark:bg-indigo-500/[0.05] border border-indigo-200/40 dark:border-indigo-500/10 p-3 ml-11">
              <p className="text-xs text-gray-500 dark:text-white/50 italic" style={{ lineHeight: '1.6' }}>
                &ldquo;Allah&rsquo;s Messenger (&#xFDFA;) used to practice I&rsquo;tikaf in the last ten days of Ramadan till he died and then his wives used to practice I&rsquo;tikaf after him.&rdquo;
              </p>
              <p className="text-[11px] text-gray-400 dark:text-white/30 mt-1.5">
                &mdash; <SourceLink source="Sahih Bukhari 2026" />
              </p>
            </div>
          </div>
        </FadeUp>

        {/* ━━━ TIMING ━━━ */}
        <FadeUp delay={0.3} className="mb-5">
          <div className="rounded-2xl bg-white/80 dark:bg-white/[0.04] border border-gray-200/60 dark:border-white/[0.06] p-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-full bg-amber-500/12 flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-sm text-gray-900 dark:text-white/85">When</h2>
            </div>
            <div className="ml-[42px] space-y-2">
              {[
                { time: 'Enter', desc: 'Maghrib on 20th Ramadan (night of the 21st)', status: 'start' as const },
                { time: 'Focus', desc: 'Odd nights: 21st, 23rd, 25th, 27th, 29th', status: 'best' as const },
                { time: 'Exit', desc: 'Maghrib on last day or moon sighting of Shawwal', status: 'end' as const },
              ].map((row) => (
                <div key={row.time} className="flex items-start gap-2.5">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    row.status === 'start' ? 'bg-indigo-500' :
                    row.status === 'best' ? 'bg-amber-500' :
                    'bg-emerald-500'
                  }`} />
                  <div>
                    <span className="text-xs text-gray-800 dark:text-white/75">{row.time}</span>
                    <p className="text-[11px] text-gray-400 dark:text-white/35" style={{ lineHeight: '1.4' }}>{row.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 dark:text-white/30 mt-3 ml-[42px]">
              Can&rsquo;t do all 10? Even the last 3 nights or just odd nights counts.
            </p>
          </div>
        </FadeUp>

        {/* ━━━ PARTIAL I'TIKAF ━━━ */}
        <FadeUp delay={0.32} className="mb-5">
          <div className="rounded-2xl bg-white/80 dark:bg-white/[0.04] border border-gray-200/60 dark:border-white/[0.06] p-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-full bg-violet-500/12 flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              </div>
              <h2 className="text-sm text-gray-900 dark:text-white/85">Partial i&rsquo;tikaf is valid too</h2>
            </div>
            <div className="ml-[42px] space-y-2.5">
              <p className="text-xs text-gray-500 dark:text-white/50" style={{ lineHeight: '1.65' }}>
                Many scholars hold that i&rsquo;tikaf has no minimum duration — even a few hours in the masjid with the intention of i&rsquo;tikaf counts. If you can&rsquo;t commit to the full 10 nights, consider:
              </p>
              <div className="space-y-1.5">
                {[
                  { label: 'One full night', desc: 'Stay from Maghrib to Fajr on an odd night' },
                  { label: 'Weekend i\u2019tikaf', desc: 'Friday evening through Sunday morning' },
                  { label: 'Daytime hours', desc: 'Spend a few hours after Fajr or before Maghrib in worship' },
                  { label: 'Odd nights only', desc: 'The 21st, 23rd, 25th, 27th & 29th — when Laylat al-Qadr is most likely' },
                ].map((opt) => (
                  <div key={opt.label} className="flex items-start gap-2.5 py-1.5 px-2.5 rounded-lg bg-violet-50/60 dark:bg-violet-500/[0.05] border border-violet-200/30 dark:border-violet-500/10">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 flex-shrink-0" />
                    <div>
                      <span className="text-[11px] text-gray-800 dark:text-white/75">{opt.label}</span>
                      <p className="text-[10px] text-gray-400 dark:text-white/35" style={{ lineHeight: '1.4' }}>{opt.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-xl bg-violet-50/60 dark:bg-violet-500/[0.05] border border-violet-200/40 dark:border-violet-500/10 p-3">
                <p className="text-xs text-gray-500 dark:text-white/50 italic" style={{ lineHeight: '1.6' }}>
                  The key is making the niyyah (intention) for i&rsquo;tikaf when you enter the masjid. Some of the Salaf would make this intention every time they entered any masjid.
                </p>
              </div>
            </div>
          </div>
        </FadeUp>

        {/* ━━━ WHAT TO DO ━━━ */}
        <FadeUp delay={0.35} className="mb-5">
          <div className="rounded-2xl bg-white/80 dark:bg-white/[0.04] border border-gray-200/60 dark:border-white/[0.06] p-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/12 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-sm text-gray-900 dark:text-white/85">What to do</h2>
            </div>
            <div className="grid grid-cols-2 gap-2 ml-[42px]">
              {[
                { emoji: '📖', label: 'Quran recitation' },
                { emoji: '🤲', label: 'Du\u2019a & dhikr' },
                { emoji: '🌙', label: 'Tahajjud / Qiyam' },
                { emoji: '🪞', label: 'Self-reflection' },
                { emoji: '📚', label: 'Learn / Tafsir' },
                { emoji: '😴', label: 'Rest (it\u2019s Sunnah!)' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 py-2 px-2.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-500/[0.05] border border-emerald-200/30 dark:border-emerald-500/10">
                  <span className="text-sm">{item.emoji}</span>
                  <span className="text-[11px] text-gray-600 dark:text-white/50">{item.label}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 dark:text-white/30 mt-2.5 ml-[42px]">
              Minimize phone use. Sustainable worship &gt; burnout.
            </p>
          </div>
        </FadeUp>

        {/* ━━━ FOOD ━━━ */}
        <FadeUp delay={0.4} className="mb-5">
          <div className="rounded-2xl bg-white/80 dark:bg-white/[0.04] border border-gray-200/60 dark:border-white/[0.06] p-4">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-full bg-orange-500/12 flex items-center justify-center flex-shrink-0">
                <Utensils className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              </div>
              <h2 className="text-sm text-gray-900 dark:text-white/85">Food & provisions</h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-white/50 ml-[42px]" style={{ lineHeight: '1.65' }}>
              You eat inside the masjid — many provide iftar and suhoor for mu&rsquo;takifin. If bringing your own, keep it simple: sandwiches, fruit, dates, nuts. Ask someone to drop off meals at the door. Clean up after yourself.
            </p>
          </div>
        </FadeUp>

        {/* ━━━ WHAT BREAKS IT ━━━ */}
        <FadeUp delay={0.45} className="mb-5">
          <div className="rounded-2xl bg-red-50/50 dark:bg-red-500/[0.04] border border-red-200/40 dark:border-red-500/10 p-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-full bg-red-500/12 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-4 h-4 text-red-500 dark:text-red-400" />
              </div>
              <h2 className="text-sm text-gray-900 dark:text-white/85">What breaks it</h2>
            </div>
            <div className="ml-[42px] space-y-2">
              {[
                'Leaving masjid without valid need',
                'Intimate relations with spouse',
                'Going out for food runs or casual strolls',
              ].map((text) => (
                <div key={text} className="flex items-start gap-2">
                  <span className="text-red-400 dark:text-red-400/70 text-xs mt-0.5 flex-shrink-0">✗</span>
                  <span className="text-[11px] text-gray-600 dark:text-white/50" style={{ lineHeight: '1.5' }}>{text}</span>
                </div>
              ))}
            </div>
            <div className="ml-[42px] mt-2.5 space-y-1.5">
              {[
                'Restroom, wudu, necessary shower',
                'Brief family visits at the door',
                'Genuine emergencies (resume after)',
              ].map((text) => (
                <div key={text} className="flex items-start gap-2">
                  <span className="text-emerald-500 dark:text-emerald-400/70 text-xs mt-0.5 flex-shrink-0">✓</span>
                  <span className="text-[11px] text-gray-600 dark:text-white/50" style={{ lineHeight: '1.5' }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </FadeUp>

        {/* ━━━ PACKING LIST ━━━ */}
        <FadeUp delay={0.5} className="mb-5">
          <div className="rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-white/[0.08] dark:via-white/[0.05] dark:to-white/[0.08] border border-gray-700/50 dark:border-white/[0.08] p-5">
            <p className="text-xs text-white/50 uppercase tracking-wider mb-3">
              Packing Essentials
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
              {[
                'Sleeping bag / mat', 'Pillow',
                'Quran / mushaf', 'Du\u2019a list',
                'Phone charger', 'Change of clothes',
                'Toiletries (minimal)', 'Water bottle',
                'Snacks / dates', 'Miswak / toothbrush',
                'Notebook & pen', 'Eye mask / earplugs',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 py-1">
                  <div className="w-1 h-1 rounded-full bg-white/30 flex-shrink-0" />
                  <span className="text-xs text-white/70">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </FadeUp>

        {/* ━━━ LAYLAT AL-QADR ━━━ */}
        <FadeUp delay={0.55} className="mb-5">
          <div className="rounded-2xl bg-gradient-to-br from-amber-500/10 to-yellow-500/10 dark:from-amber-500/[0.06] dark:to-yellow-500/[0.06] border border-amber-500/20 dark:border-amber-400/15 p-4">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                <Star className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-sm text-gray-900 dark:text-white/85">Seeking Laylat al-Qadr</h2>
            </div>
            <ul className="ml-[42px] space-y-1.5">
              {[
                'Most likely on odd nights: 21st, 23rd, 25th, 27th, 29th',
                'Signs: calm night, moderate weather, sun rises gently next morning',
                'Make a du\u2019a list in advance so you don\u2019t forget',
                'Quality of heart matters more than quantity of deeds',
              ].map((text) => (
                <li key={text} className="flex items-start gap-2">
                  <div className="w-1 h-1 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                  <span className="text-[11px] text-gray-600 dark:text-white/50" style={{ lineHeight: '1.5' }}>{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </FadeUp>

        {/* ━━━ CLOSING ━━━ */}
        <FadeUp delay={0.6}>
          <div className="text-center pt-4 pb-8">
            <div className="w-8 h-px bg-gray-200 dark:bg-white/10 mx-auto mb-4" />
            <p className="text-xs text-gray-400 dark:text-white/25 italic" style={{ lineHeight: '1.6' }}>
              &ldquo;Whoever established prayers on the night of Qadr out of sincere faith and hoping for a reward from Allah, then all his previous sins will be forgiven.&rdquo;
            </p>
            <p className="text-xs text-gray-300 dark:text-white/15 mt-1">
              &mdash; <SourceLink source="Sahih Bukhari 1901" className="text-gray-300 dark:text-white/15" />
            </p>
          </div>
        </FadeUp>
      </div>
    </div>
  );
}