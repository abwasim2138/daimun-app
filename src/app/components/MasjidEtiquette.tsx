import { useState, useRef, useCallback } from 'react';
import {
  ArrowLeft, ChevronRight, Heart, Droplets, Car, Footprints,
  DoorOpen, BookOpen, Handshake, Smartphone, VolumeX, Eye,
  Circle, HeartHandshake,
  type LucideIcon,
} from 'lucide-react';
import { motion } from 'motion/react';

/* ─── Hadith source URL helper ─── */
function getHadithUrl(source: string): string | null {
  const collections: [string, string][] = [
    ['Sahih Muslim', 'muslim'],
    ['Sahih Bukhari', 'bukhari'],
    ['Abu Dawud', 'abudawud'],
    ['Tirmidhi', 'tirmidhi'],
    ['Musnad Ahmad', 'ahmad'],
  ];
  for (const [key, slug] of collections) {
    if (source.startsWith(key)) {
      const number = source.replace(key, '').trim();
      return number
        ? `https://sunnah.com/${slug}:${number}`
        : `https://sunnah.com/${slug}`;
    }
  }
  return null;
}

/* ─── Linked source sub-component ─── */
function SourceLink({ source, className }: { source: string; className?: string }) {
  const url = getHadithUrl(source);
  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`underline decoration-dotted underline-offset-2 hover:decoration-solid transition-all ${className ?? ''}`}
      >
        {source}
      </a>
    );
  }
  return <span className={className}>{source}</span>;
}

interface MasjidEtiquetteProps {
  onBack: () => void;
}

interface Dua {
  label: string;
  arabic: string;
  transliteration: string;
  meaning: string;
  source: string;
}

interface EtiquetteItem {
  id: string;
  title: string;
  subtitle: string;
  color: string;
  iconBg: string;
  borderColor: string;
  dotColor: string;
  icon: LucideIcon;
  points: string[];
  hadith?: { text: string; source: string };
  duas?: Dua[];
}

/* ─── Etiquette items ─── */
const etiquetteItems: EtiquetteItem[] = [
  {
    id: 'wudu',
    title: 'Make Wudu Before You Arrive',
    subtitle: 'Start your visit with intention',
    color: 'from-cyan-500 to-blue-500',
    iconBg: 'bg-cyan-500/12',
    borderColor: 'border-cyan-500/20',
    dotColor: 'bg-cyan-500',
    icon: Droplets,
    points: [
      'If you can, try to make wudu at home so you arrive ready for worship \u2014 no rush, no stress',
      'Here\u2019s the beautiful part: from the moment you step out, you\u2019re already earning reward. Every step to the masjid in wudu erases a sin and raises your rank',
      'The Prophet \uFDFA said: \u201cWhen one of you performs wudu well, then goes to the masjid, with each step one sin is erased and another good deed is recorded\u201d (Muslim)',
    ],
    hadith: {
      text: '\u201cShall I not tell you something by which Allah erases sins and raises ranks? Performing wudu well despite difficulty...\u201d',
      source: 'Sahih Muslim 251',
    },
  },
  {
    id: 'parking',
    title: 'Parking Lot Kindness',
    subtitle: 'Your patience here is sadaqah',
    color: 'from-emerald-500 to-green-500',
    iconBg: 'bg-emerald-500/12',
    borderColor: 'border-emerald-500/20',
    dotColor: 'bg-emerald-500',
    icon: Car,
    points: [
      'Parking within the lines helps everyone \u2014 double parking can accidentally block someone rushing to work or an emergency',
      'Keep driveways, fire lanes, and handicapped spots clear for those who need them most',
      'During Jumu\u2019ah and Tarawih it gets busy \u2014 the extra walk is extra reward, in sha\u2019 Allah',
      'Drive gently in the lot \u2014 little ones are often around, and their safety is our shared responsibility',
    ],
    hadith: {
      text: '\u201cRemoving harm from the road is charity.\u201d',
      source: 'Sahih Muslim 35',
    },
  },
  {
    id: 'shoes',
    title: 'The Shoe Rack',
    subtitle: 'A small act with big reward',
    color: 'from-amber-500 to-orange-500',
    iconBg: 'bg-amber-500/12',
    borderColor: 'border-amber-500/20',
    dotColor: 'bg-amber-500',
    icon: Footprints,
    points: [
      'Placing shoes neatly on the rack keeps the masjid welcoming for everyone who walks in after you',
      'If the rack is full, lining them against the wall works great too',
      'Straightening someone else\u2019s shoes? That\u2019s sadaqah \u2014 you\u2019re caring for Allah\u2019s house',
      'During busy nights like Tarawih, a small bag for your shoes can be a lifesaver',
    ],
    hadith: {
      text: '\u201cCleanliness is half of faith.\u201d',
      source: 'Sahih Muslim 223',
    },
  },
  {
    id: 'entering',
    title: 'Entering & Exiting Duas',
    subtitle: 'Beautiful words for every visit',
    color: 'from-purple-500 to-violet-500',
    iconBg: 'bg-purple-500/12',
    borderColor: 'border-purple-500/20',
    dotColor: 'bg-purple-500',
    icon: DoorOpen,
    points: [
      'Step in with your right foot \u2014 a gentle Sunnah to begin your visit',
      'Step out with your left foot \u2014 and carry the peace of the masjid with you',
    ],
    duas: [
      {
        label: 'Entering the Masjid',
        arabic: '\u0627\u0644\u0644\u0651\u064E\u0647\u064F\u0645\u0651\u064E \u0627\u0641\u0652\u062A\u064E\u062D\u0652 \u0644\u0650\u064A \u0623\u064E\u0628\u0652\u0648\u064E\u0627\u0628\u064E \u0631\u064E\u062D\u0652\u0645\u064E\u062A\u0650\u0643\u064E',
        transliteration: 'All\u0101humma-fta\u1E25 l\u012B abw\u0101ba ra\u1E25matik',
        meaning: '\u201cO Allah, open the doors of Your mercy for me.\u201d',
        source: 'Sahih Muslim 713',
      },
      {
        label: 'Exiting the Masjid',
        arabic: '\u0627\u0644\u0644\u0651\u064E\u0647\u064F\u0645\u0651\u064E \u0625\u0650\u0646\u0651\u0650\u064A \u0623\u064E\u0633\u0652\u0623\u064E\u0644\u064F\u0643\u064E \u0645\u0650\u0646\u0652 \u0641\u064E\u0636\u0652\u0644\u0650\u0643\u064E',
        transliteration: 'All\u0101humma inn\u012B as\'aluka min fa\u1E0Dlik',
        meaning: '\u201cO Allah, I ask You from Your bounty.\u201d',
        source: 'Sahih Muslim 713',
      },
    ],
  },
  {
    id: 'phone',
    title: 'Give Your Phone a Break',
    subtitle: 'This moment is just for you and Allah',
    color: 'from-slate-500 to-gray-600',
    iconBg: 'bg-slate-500/12',
    borderColor: 'border-slate-500/20',
    dotColor: 'bg-slate-500',
    icon: Smartphone,
    points: [
      'Switching to silent or Do Not Disturb before you enter is one of the kindest things you can do for everyone around you',
      'A ringing phone during salah can break the concentration of the entire row \u2014 and the person praying will feel terrible',
      'If you forget and it rings, don\u2019t worry \u2014 just silence it quickly. It happens to all of us',
      'Consider leaving it in the car or your pocket. The khushu\u2019 you gain is worth it',
    ],
    hadith: {
      text: '\u201cAllah continues to turn towards a servant while he is in prayer, as long as he does not turn away.\u201d',
      source: 'Abu Dawud 909',
    },
  },
  {
    id: 'tahiyyah',
    title: 'Tahiyyat al-Masjid',
    subtitle: 'The masjid\u2019s greeting back to you',
    color: 'from-indigo-500 to-blue-600',
    iconBg: 'bg-indigo-500/12',
    borderColor: 'border-indigo-500/20',
    dotColor: 'bg-indigo-500',
    icon: BookOpen,
    points: [
      'Before you sit, pray 2 rak\u2019ah \u2014 think of it as a beautiful exchange: you greeted the masjid, and it greets you back with reward',
      'The Prophet \uFDFA encouraged this even if you arrive during a khutbah (according to the majority of scholars)',
      'Try to fill in the front rows first and stand shoulder-to-shoulder \u2014 it\u2019s a Sunnah and it makes the congregation feel unified',
    ],
    hadith: {
      text: '\u201cWhen one of you enters the masjid, let him not sit until he prays two rak\u2019ah.\u201d',
      source: 'Sahih Bukhari 1167',
    },
  },
  {
    id: 'quiet',
    title: 'Speak Softly',
    subtitle: 'Preserve the peace for everyone',
    color: 'from-violet-500 to-purple-600',
    iconBg: 'bg-violet-500/12',
    borderColor: 'border-violet-500/20',
    dotColor: 'bg-violet-500',
    icon: VolumeX,
    points: [
      'The masjid is a place of tranquility \u2014 keeping your voice gentle helps everyone stay focused in their worship and du\u2019a',
      'If you need to have a conversation, a soft voice or stepping to the lobby goes a long way',
      'Someone near you might be making the du\u2019a that changes their life \u2014 let\u2019s protect that moment for them',
      'Between prayers, a warm whisper with your neighbor is perfectly fine \u2014 just be mindful of those still praying',
    ],
    hadith: {
      text: '\u201cEach of you is conversing privately with his Lord, so do not disturb one another, and do not raise your voices above one another in recitation.\u201d',
      source: 'Abu Dawud 1332',
    },
  },
  {
    id: 'space',
    title: 'Respect the Prayer Space',
    subtitle: 'Be mindful of those in salah',
    color: 'from-sky-500 to-blue-500',
    iconBg: 'bg-sky-500/12',
    borderColor: 'border-sky-500/20',
    dotColor: 'bg-sky-500',
    icon: Eye,
    points: [
      'If someone is praying, try to walk behind them rather than in front \u2014 it\u2019s a small detour that protects their focus',
      'The Prophet \uFDFA said walking in front of someone in prayer is serious \u2014 out of love for your brother or sister, take the longer path',
      'If there\u2019s truly no other way, it\u2019s okay \u2014 Allah sees your intention. Just be gentle and quick',
      'When you find your spot, try to leave enough room for others to pass behind comfortably',
    ],
    hadith: {
      text: '\u201cIf the one who passes in front of a person praying knew what burden he carries, he would rather wait forty than pass in front of him.\u201d',
      source: 'Sahih Bukhari 510',
    },
  },
  {
    id: 'salams',
    title: 'Give Salams to Everyone',
    subtitle: 'You might make someone\u2019s day',
    color: 'from-rose-500 to-pink-500',
    iconBg: 'bg-rose-500/12',
    borderColor: 'border-rose-500/20',
    dotColor: 'bg-rose-500',
    icon: Handshake,
    points: [
      'Say \u201cAs-salamu alaykum\u201d to those you know AND those you don\u2019t \u2014 you might be the first friendly face someone sees today',
      'Shake hands \u2014 the Prophet \uFDFA said sins fall away like leaves from a tree when two Muslims shake hands',
      'A smile is charity, and it costs nothing \u2014 it can make the masjid feel like home for a newcomer',
      'Greet the elders, the youth, the newcomers \u2014 everyone deserves to feel they belong',
    ],
    hadith: {
      text: '\u201cYou will not enter Paradise until you believe, and you will not believe until you love one another. Shall I not tell you of something that, if you do it, you will love one another? Spread salaam amongst yourselves.\u201d',
      source: 'Sahih Muslim 54',
    },
  },
  {
    id: 'elders',
    title: 'Honor Our Elders',
    subtitle: 'They paved the way for us',
    color: 'from-warm-500 to-amber-600',
    iconBg: 'bg-amber-600/12',
    borderColor: 'border-amber-600/20',
    dotColor: 'bg-amber-600',
    icon: HeartHandshake,
    points: [
      'Our elders built these masajid, kept them running, and prayed in them long before we arrived \u2014 honor that legacy with patience and love',
      'If an uncle or auntie corrects you in a way that feels blunt, remember they grew up in a different time \u2014 their intention is almost always good, even if the delivery isn\u2019t perfect',
      'Offer them the best seats, help them with their shoes, open doors for them \u2014 these small acts of service are beloved in our deen',
      'Sometimes they may not know the latest etiquette or customs \u2014 that\u2019s okay. A gentle, patient response is always the better path',
      'The Prophet \uFDFA said the one who doesn\u2019t respect our elders isn\u2019t one of us \u2014 and respect means patience, gentleness, and genuine care',
    ],
    hadith: {
      text: '\u201cHe is not one of us who does not show mercy to our young ones and respect to our old ones.\u201d',
      source: 'Tirmidhi 1919',
    },
  },
  {
    id: 'kids',
    title: 'Welcome the Little Ones',
    subtitle: 'The masjid is their home too',
    color: 'from-teal-500 to-emerald-500',
    iconBg: 'bg-teal-500/12',
    borderColor: 'border-teal-500/20',
    dotColor: 'bg-teal-500',
    icon: Circle,
    points: [
      'The Prophet \uFDFA prayed while carrying his grandchild Umamah \u2014 children have always belonged in the masjid',
      'He \uFDFA once shortened the prayer because he heard a child crying, so the mother wouldn\u2019t be distressed. That\u2019s our example',
      'A harsh word to a child at the masjid may keep them away for a lifetime \u2014 a kind word could bring them back forever',
      'Parents, you\u2019re doing your best \u2014 and everyone else, a patient smile goes further than you\u2019d think',
      'These little ones are the future of our ummah \u2014 let them grow up loving this place',
    ],
    hadith: {
      text: '\u201cHe is not one of us who does not show mercy to our young ones and respect to our old ones.\u201d',
      source: 'Tirmidhi 1919',
    },
  },
];

/* Quick checklist items with icons */
const checklistItems: { icon: LucideIcon; text: string; color: string }[] = [
  { icon: Droplets, text: 'Wudu at home', color: 'text-cyan-500' },
  { icon: Car, text: 'Park kindly', color: 'text-emerald-500' },
  { icon: Footprints, text: 'Shoes on rack', color: 'text-amber-500' },
  { icon: DoorOpen, text: 'Say the dua', color: 'text-purple-500' },
  { icon: Smartphone, text: 'Phone on silent', color: 'text-slate-500' },
  { icon: BookOpen, text: '2 rak\u2019ah first', color: 'text-indigo-500' },
  { icon: VolumeX, text: 'Speak softly', color: 'text-violet-500' },
  { icon: Eye, text: 'Mind the rows', color: 'text-sky-500' },
  { icon: Handshake, text: 'Salam everyone', color: 'text-rose-500' },
  { icon: HeartHandshake, text: 'Honor elders', color: 'text-amber-600' },
  { icon: Circle, text: 'Welcome kids', color: 'text-teal-500' },
];

/* ─── Dua card sub-component ─── */
function DuaCard({ dua }: { dua: Dua }) {
  return (
    <div className="rounded-xl bg-white/60 dark:bg-white/[0.04] border border-gray-200/60 dark:border-white/[0.06] p-4 space-y-2">
      <div className="text-xs text-gray-400 dark:text-white/35 uppercase tracking-wider">{dua.label}</div>
      <div className="text-right text-xl text-gray-900 dark:text-white/90 py-2" style={{ fontFamily: "'Amiri', 'Traditional Arabic', serif", lineHeight: '2' }}>
        {dua.arabic}
      </div>
      <div className="text-sm text-gray-600 dark:text-white/60 italic">{dua.transliteration}</div>
      <div className="text-sm text-gray-700 dark:text-white/70">{dua.meaning}</div>
      <div className="text-xs text-gray-400 dark:text-white/30">
        <SourceLink source={dua.source} className="text-gray-400 dark:text-white/30" />
      </div>
    </div>
  );
}

export function MasjidEtiquette({ onBack }: MasjidEtiquetteProps) {
  const [expandedId, setExpandedId] = useState<string | null>('wudu');
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const hasUserInteracted = useRef(false);

  const setItemRef = useCallback((id: string) => (el: HTMLDivElement | null) => {
    if (el) itemRefs.current.set(id, el);
    else itemRefs.current.delete(id);
  }, []);

  const handleToggle = useCallback((id: string, isExpanded: boolean) => {
    hasUserInteracted.current = true;
    if (isExpanded) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      // Scroll the card to near the top after it expands (account for sticky header ~48px + 12px gap)
      // Only auto-scroll on user-initiated toggles, not on initial mount
      requestAnimationFrame(() => {
        const el = itemRefs.current.get(id);
        if (el) {
          const headerOffset = 60;
          const top = el.getBoundingClientRect().top + window.scrollY - headerOffset;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a]">
      {/* ── Sticky header ─── */}
      <div className="bg-white/80 dark:bg-black/80 border-b border-gray-200/50 dark:border-white/[0.06] sticky top-0 z-20 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white transition-colors -ml-1 p-1"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Back</span>
          </button>
          <span className="text-sm text-gray-400 dark:text-white/40">Masjid Etiquette</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 pb-16">
        {/* ━━━ HERO ━━━ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="pt-8 pb-2 text-center"
        >
          <div className="flex justify-center mb-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.1 }}
              className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20"
            >
              <Heart className="w-7 h-7 text-white" />
            </motion.div>
          </div>

          <h1 className="text-2xl sm:text-3xl tracking-wide mb-1.5 text-gray-900 dark:text-white/90">
            Masjid Etiquette
          </h1>
          <p className="text-gray-500 dark:text-white/45 text-sm mb-1" style={{ lineHeight: '1.5' }}>
            A beautiful visit starts with beautiful adab
          </p>
          <p className="text-xs text-gray-400 dark:text-white/30">
            11 practices from the Sunnah
          </p>
        </motion.div>

        {/* ━━━ VISUAL JOURNEY ━━━ */}
        <div className="relative mt-6">
          <div className="space-y-4">
            {etiquetteItems.map((item, i) => {
              const isExpanded = expandedId === item.id;
              const IconComponent = item.icon;
              return (
                <motion.div
                  key={item.id}
                  ref={setItemRef(item.id)}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, delay: 0.08 + i * 0.06 }}
                >
                  <button
                    onClick={() => handleToggle(item.id, isExpanded)}
                    className="w-full text-left"
                  >
                    <div className={`relative rounded-2xl border transition-all duration-200 ${
                      isExpanded
                        ? `bg-white dark:bg-white/[0.06] ${item.borderColor} shadow-sm`
                        : 'bg-white/70 dark:bg-white/[0.03] border-gray-200/60 dark:border-white/[0.06] hover:bg-white dark:hover:bg-white/[0.05]'
                    }`}>
                      {/* Header row */}
                      <div className="flex items-center gap-4 p-4">
                        {/* Icon circle on timeline */}
                        <div className={`relative z-10 w-[46px] h-[46px] rounded-full bg-gradient-to-br ${item.color} flex items-center justify-center text-white flex-shrink-0 shadow-sm`}>
                          <IconComponent className="w-5 h-5" />
                        </div>

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-900 dark:text-white/85 mb-0.5">{item.title}</div>
                          <p className="text-xs text-gray-500 dark:text-white/40">{item.subtitle}</p>
                        </div>

                        {/* Expand chevron */}
                        <ChevronRight className={`w-4 h-4 text-gray-300 dark:text-white/20 transition-transform duration-200 flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`} />
                      </div>

                      {/* Expanded content */}
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          transition={{ duration: 0.2 }}
                          className="px-4 pb-4 pt-0"
                        >
                          <div className="border-t border-gray-100 dark:border-white/[0.06] pt-4 ml-[62px]">
                            {/* Points */}
                            <ul className="space-y-2.5 mb-4">
                              {item.points.map((point, pi) => (
                                <li key={pi} className="flex items-start gap-2.5">
                                  <div className={`w-1.5 h-1.5 rounded-full ${item.dotColor} mt-1.5 flex-shrink-0`} />
                                  <span className="text-sm text-gray-600 dark:text-white/60" style={{ lineHeight: '1.5' }}>{point}</span>
                                </li>
                              ))}
                            </ul>

                            {/* Duas (for entering/exiting) */}
                            {item.duas && (
                              <div className="space-y-3 mb-4">
                                {item.duas.map((dua) => (
                                  <DuaCard key={dua.label} dua={dua} />
                                ))}
                              </div>
                            )}

                            {/* Hadith */}
                            {item.hadith && (
                              <div className={`rounded-xl ${item.iconBg} border ${item.borderColor} p-3.5`}>
                                <p className="text-xs text-gray-600 dark:text-white/60 italic" style={{ lineHeight: '1.6' }}>
                                  {item.hadith.text}
                                </p>
                                <p className="text-xs text-gray-400 dark:text-white/30 mt-1.5">
                                  &mdash; <SourceLink source={item.hadith.source} />
                                </p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ━━━ SUMMARY CARD ━━━ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.7 }}
          className="mt-8 rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-white/[0.08] dark:via-white/[0.05] dark:to-white/[0.08] border border-gray-700/50 dark:border-white/[0.08] p-5"
        >
          <p className="text-white/80 text-sm text-center" style={{ lineHeight: '1.7' }}>
            The masjid is the house of Allah. Every act of care &mdash; from parking your car kindly to smiling at a child &mdash; is an act of worship. You belong here, and so does everyone around you.
          </p>
        </motion.div>

        {/* ━━━ QUICK REFERENCE ━━━ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.8 }}
          className="mt-5 rounded-2xl bg-white/70 dark:bg-white/[0.04] border border-gray-200/60 dark:border-white/[0.06] p-5"
        >
          <p className="text-xs text-gray-400 dark:text-white/35 uppercase tracking-wider mb-4">
            Quick Checklist
          </p>
          <div className="grid grid-cols-2 gap-2">
            {checklistItems.map((c) => {
              const CIcon = c.icon;
              return (
                <div key={c.text} className="flex items-center gap-2.5 py-2 px-3 rounded-lg bg-gray-50 dark:bg-white/[0.03]">
                  <CIcon className={`w-4 h-4 flex-shrink-0 ${c.color}`} />
                  <span className="text-xs text-gray-600 dark:text-white/60">{c.text}</span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* ━━━ CLOSING ━━━ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="text-center pt-8 pb-8"
        >
          <div className="w-8 h-px bg-gray-200 dark:bg-white/10 mx-auto mb-4" />
          <p className="text-xs text-gray-400 dark:text-white/25 italic" style={{ lineHeight: '1.6' }}>
            "The most beloved places to Allah are the masajid."
          </p>
          <p className="text-xs text-gray-300 dark:text-white/15 mt-1">
            &mdash; <SourceLink source="Sahih Muslim 671" className="text-gray-300 dark:text-white/15" />
          </p>
        </motion.div>
      </div>
    </div>
  );
}