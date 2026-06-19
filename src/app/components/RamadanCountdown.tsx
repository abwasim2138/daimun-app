import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Moon, Star, Utensils, BookOpen, Rows3, ExternalLink, HandPlatter, Gift, Eye, HandCoins, ArrowRight } from 'lucide-react';
import { toHijri, toGregorian } from 'hijri-converter';
import { Mosque } from '../App';
import { calculatePrayerTimes, formatPrayerTime, timeToMinutes } from '../utils/prayerTimes';
import { calculateIqamaTimes } from '../utils/iqamaCalculator';
import lunarCalendarImg from 'figma:asset/811924842f4bfbf4e40da822750ba0aaf91644d0.png';
import { ShimmerImage } from '../utils/ShimmerImage';
import { navigate } from '../utils/router';

interface RamadanCountdownProps {
  mosques?: Mosque[];
  favorites?: Set<string>;
}

/**
 * Compute time remaining string from minutes
 */
function formatCountdown(totalMinutes: number): string {
  if (totalMinutes <= 0) return 'Now';
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

/**
 * RamadanCountdown / RamadanMode
 * 
 * - If we're > 30 days before Ramadan, renders nothing.
 * - If we're within 30 days BEFORE Ramadan, shows "When is Ramadan?" card.
 * - If we're IN Ramadan, shows Ramadan Mode with iftar/suhoor countdowns + taraweeh TBD.
 * - If Ramadan just ended (first few days of Shawwal), shows Eid Mubarak briefly.
 */
export function RamadanCountdown({ mosques = [], favorites = new Set() }: RamadanCountdownProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Determine the Islamic date, accounting for the day starting at Maghrib
  const todayHijri = useMemo(() => {
    // Get a representative mosque for calculating Maghrib time
    const representative = mosques.find(m => favorites.has(m.id)) || mosques[0];
    
    // If we have a mosque, check if we're past Maghrib
    let adjustedDate = new Date(now);
    if (representative) {
      try {
        const prayerTimes = calculatePrayerTimes(
          representative.latitude,
          representative.longitude,
          now,
          representative.calculationMethod || 'NorthAmerica',
          representative.asrMethod || 'Standard'
        );
        const maghribTime = formatPrayerTime(prayerTimes.maghrib);
        const maghribMinutes = timeToMinutes(maghribTime);
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        
        // If we're past Maghrib, we're in the next Islamic day
        if (currentMinutes >= maghribMinutes) {
          adjustedDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Add 1 day
        }
      } catch (e) {
        // If prayer time calculation fails, fall back to midnight-based conversion
        console.warn('Failed to calculate Maghrib time for Islamic date adjustment:', e);
      }
    }
    
    return toHijri(adjustedDate.getFullYear(), adjustedDate.getMonth() + 1, adjustedDate.getDate());
  }, [now, mosques, favorites]);

  const isRamadan = todayHijri.hm === 9;
  const isEarlyShawwal = todayHijri.hm === 10 && todayHijri.hd <= 3;
  const ramadanDay = todayHijri.hd;
  const ramadanYear = todayHijri.hy;

  // --- RAMADAN MODE ---
  if (isRamadan) {
    return (
      <RamadanModeCard
        now={now}
        ramadanDay={ramadanDay}
        ramadanYear={ramadanYear}
        mosques={mosques}
        favorites={favorites}
      />
    );
  }

  // --- EID MUBARAK ---
  if (isEarlyShawwal) {
    return (
      <button
        onClick={() => navigate('/eid-times')}
        className="block w-full mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 dark:from-emerald-600 dark:via-emerald-700 dark:to-teal-800 p-6 shadow-xl shadow-emerald-500/30 dark:shadow-emerald-900/40 animate-card-enter transition-all active:scale-[0.98] hover:shadow-2xl hover:shadow-emerald-500/40"
      >
        <div className="flex flex-col gap-4">
          {/* Icon & Title */}
          <div className="flex items-center gap-3.5">
            <div className="bg-white/25 rounded-full p-3 shadow-lg">
              <Star className="w-7 h-7 text-white fill-white drop-shadow" />
            </div>
            <div className="text-left flex-1">
              <div className="text-white font-bold text-xl tracking-tight">Eid Mubarak!</div>
              <div className="text-white/90 text-sm mt-0.5">
                {todayHijri.hd === 1 ? 'Shawwal 1, 1447 AH' : `Day ${todayHijri.hd} of Shawwal`}
              </div>
            </div>
            <ArrowRight className="w-6 h-6 text-white/70 flex-shrink-0" />
          </div>
          
          {/* CTA */}
          <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20">
            <div className="text-white/95 font-medium text-sm mb-1">
              Find Eid Prayer Times
            </div>
            <div className="text-white/70 text-xs">
              View times, locations, and activities at local masajid
            </div>
          </div>
        </div>
      </button>
    );
  }

  // --- PRE-RAMADAN: "WHEN IS RAMADAN?" CARD ---
  let targetRamadanYear = todayHijri.hy;
  if (todayHijri.hm >= 9) {
    targetRamadanYear = todayHijri.hy + 1;
  }

  const ramadanStart = toGregorian(targetRamadanYear, 9, 1);
  const ramadanDate = new Date(ramadanStart.gy, ramadanStart.gm - 1, ramadanStart.gd);
  const diffTime = ramadanDate.getTime() - now.getTime();
  const daysUntil = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Only show if within 30 days
  if (daysUntil > 30 || daysUntil < 0) {
    return null;
  }

  // The two possible start dates: Wed Feb 18 or Thu Feb 19, 2026
  // Ramadan depends on moon sighting on the 29th of Sha'ban
  const optionA = new Date(2026, 1, 18); // Wed Feb 18
  const optionB = new Date(2026, 1, 19); // Thu Feb 19

  const dayNameA = optionA.toLocaleDateString('en-US', { weekday: 'short' });
  const dateStrA = optionA.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const dayNameB = optionB.toLocaleDateString('en-US', { weekday: 'short' });
  const dateStrB = optionB.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="mb-4 rounded-2xl overflow-hidden bg-gradient-to-br from-[#6B2F4A] to-[#4A1E35] dark:from-[#5A2840] dark:to-[#3D1A2D] shadow-lg">
      {/* Image section — lunarCalendarImg is only available in the Figma Make environment */}
      {lunarCalendarImg && (
        <div className="relative">
          <ShimmerImage
            src={lunarCalendarImg}
            alt="When is Ramadan? — Lunar calendar showing moon phases"
            className="w-full h-40 object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#4A1E35]/90 dark:to-[#3D1A2D]/90" />
          <a href="https://www.aljazeera.com/wp-content/uploads/2026/02/Screenshot-2026-02-12-at-7.44.34-PM-1770914689.png?resize=770%2C513&quality=80" target="_blank" rel="noopener noreferrer" className="absolute top-2 right-2.5 text-[9px] text-white/30 no-underline hover:text-white/50 transition-colors">Al Jazeera</a>
        </div>
      )}

      {/* Content section */}
      <div className="px-4 pb-4 pt-2 space-y-3">
        {/* Explanation */}
        <p className="text-white/70 text-xs leading-relaxed">
          The Islamic calendar follows the lunar cycle. Ramadan begins after the
          new moon is sighted on the 29th of Sha'ban — so the exact start date
          depends on the moon sighting.
        </p>

        {/* Decision tree */}
        <div className="flex flex-col items-center">
          {/* Root node: Moon sighting on Tuesday */}
          <div className="bg-white/[0.12] border border-white/[0.1] rounded-xl px-4 py-2 text-center">
            <div className="flex items-center justify-center gap-1.5">
              <Moon className="w-3 h-3 text-amber-300/70" />
              <span className="text-[10px] text-white/50 uppercase tracking-wider">Moon sighting</span>
            </div>
            <div className="text-white text-xs mt-0.5">Tue evening at sunset</div>
          </div>

          {/* Trunk line */}
          <div className="w-px h-3 bg-white/20" />

          {/* Branch split */}
          <div className="relative w-full max-w-[280px]">
            {/* Horizontal connector */}
            <div className="absolute top-0 left-1/4 right-1/4 h-px bg-white/20" />
            {/* Left vertical drop */}
            <div className="absolute top-0 left-1/4 w-px h-3 bg-white/20" />
            {/* Right vertical drop */}
            <div className="absolute top-0 right-1/4 w-px h-3 bg-white/20" />

            {/* Branch nodes */}
            <div className="grid grid-cols-2 gap-3 pt-3">
              {/* Left branch: Sighted → Wednesday */}
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-[10px] text-white/50 uppercase tracking-wider font-medium">Sighted</span>
                <div className="w-px h-2 bg-white/15" />
                <div className="bg-white/[0.07] border border-white/[0.08] rounded-xl px-3 py-2.5 text-center w-full">
                  <div className="text-white font-semibold text-sm">{dayNameA}</div>
                  <div className="text-white/60 text-xs">{dateStrA}</div>
                  <div className="text-white/40 text-[10px] mt-1">1st day of fasting</div>
                </div>
              </div>

              {/* Right branch: Not sighted → Thursday */}
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-[10px] text-white/40 uppercase tracking-wider font-medium">Not sighted</span>
                <div className="w-px h-2 bg-white/15" />
                <div className="bg-white/[0.07] border border-white/[0.08] rounded-xl px-3 py-2.5 text-center w-full">
                  <div className="text-white font-semibold text-sm">{dayNameB}</div>
                  <div className="text-white/60 text-xs">{dateStrB}</div>
                  <div className="text-white/40 text-[10px] mt-1">1st day of fasting</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Moon sighting CTA */}
        <a
          href="https://hilalcommittee.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.1] rounded-xl px-3 py-2.5 transition-colors active:scale-[0.98]"
        >
          <span className="text-xs text-white/80">Follow the Hilal Committee for updates</span>
          <ExternalLink className="w-3 h-3 text-white/50" />
        </a>
      </div>
    </div>
  );
}

// --- Ramadan Mode Sub-component ---

// Daily motivational reminders — one per day of Ramadan, rotating through
// Quran translations: Sahih International; Hadith translations: sunnah.com
const RAMADAN_REMINDERS: { arabic: string | null; translation: string; source: string; url: string | null }[] = [
  { arabic: 'شَهْرُ رَمَضَانَ الَّذِي أُنزِلَ فِيهِ الْقُرْآنُ هُدًى لِّلنَّاسِ وَبَيِّنَاتٍ مِّنَ الْهُدَىٰ وَالْفُرْقَانِ', translation: 'The month of Ramadan [is that] in which was revealed the Quran, a guidance for the people and clear proofs of guidance and criterion.', source: 'Al-Baqarah 2:185', url: 'https://quran.com/2/185' },
  { arabic: 'يَا أَيُّهَا الَّذِينَ آمَنُوا كُتِبَ عَلَيْكُمُ الصِّيَامُ كَمَا كُتِبَ عَلَى الَّذِينَ مِن قَبْلِكُمْ لَعَلَّكُمْ تَتَّقُونَ', translation: 'O you who have believed, decreed upon you is fasting as it was decreed upon those before you that you may become righteous.', source: 'Al-Baqarah 2:183', url: 'https://quran.com/2/183' },
  { arabic: null, translation: 'Whoever fasted the month of Ramadan out of sincere faith and hoping for a reward from Allah, then all his past sins will be forgiven.', source: 'Bukhari 38', url: 'https://sunnah.com/bukhari:38' },
  { arabic: null, translation: 'When the month of Ramadan starts, the gates of the heaven are opened and the gates of Hell are closed and the devils are chained.', source: 'Bukhari 1899', url: 'https://sunnah.com/bukhari:1899' },
  { arabic: 'وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ أُجِيبُ دَعْوَةَ الدَّاعِ إِذَا دَعَانِ', translation: 'And when My servants ask you concerning Me — indeed I am near. I respond to the invocation of the supplicant when he calls upon Me.', source: 'Al-Baqarah 2:186', url: 'https://quran.com/2/186' },
  { arabic: null, translation: 'The fasting person has two joys: one joy when he breaks his fast, and another joy when he meets his Lord.', source: 'Bukhari 1904', url: 'https://sunnah.com/bukhari:1904' },
  { arabic: null, translation: 'Fasting is a shield. So, the person observing fasting should avoid sexual relation with his wife and should not behave foolishly and impudently, and if somebody fights with him or abuses him, he should say twice, "I am fasting."', source: 'Bukhari 1894', url: 'https://sunnah.com/bukhari:1894' },
  { arabic: null, translation: 'Whoever prayed at night in it (the month of Ramadan) out of sincere faith and hoping for a reward from Allah, then all his previous sins will be forgiven.', source: 'Bukhari 37', url: 'https://sunnah.com/bukhari:37' },
  { arabic: null, translation: 'There is a gate in Paradise called Ar-Raiyan, and those who observe fasts will enter through it on the Day of Resurrection and none except them will enter through it.', source: 'Bukhari 1896', url: 'https://sunnah.com/bukhari:1896' },
  { arabic: null, translation: 'Every (good) deed of the son of Adam would be multiplied, a good deed receiving a tenfold to seven hundredfold reward. Allah, the Exalted and Majestic, has said: With the exception of fasting, for it is done for Me and I will give a reward for it.', source: 'Muslim 1151', url: 'https://sunnah.com/muslim:1151a' },
  { arabic: 'إِنَّا أَنزَلْنَاهُ فِي لَيْلَةِ الْقَدْرِ', translation: 'Indeed, We sent the Quran down during the Night of Decree.', source: 'Al-Qadr 97:1', url: 'https://quran.com/97/1' },
  { arabic: null, translation: 'Search for the Night of Qadr in the odd nights of the last ten days of Ramadan.', source: 'Bukhari 2017', url: 'https://sunnah.com/bukhari:2017' },
  { arabic: null, translation: 'Whoever provides the food for a fasting person to break his fast with, then for him is the same reward as his (the fasting person\'s), without anything being diminished from the reward of the fasting person.', source: 'Tirmidhi 807', url: 'https://sunnah.com/tirmidhi:807' },
  { arabic: null, translation: 'Protect yourself from Hell-fire even by giving half a date-fruit in charity.', source: 'Bukhari 1417', url: 'https://sunnah.com/bukhari:1417' },
  { arabic: null, translation: 'My servant does not draw near to Me with anything more beloved to Me than the religious duties I have obligated upon him.', source: 'Bukhari 6502', url: 'https://sunnah.com/bukhari:6502' },
  { arabic: null, translation: 'Whoever does not give up forged speech and evil actions, Allah is not in need of his leaving his food and drink.', source: 'Bukhari 1903', url: 'https://sunnah.com/bukhari:1903' },
  { arabic: null, translation: 'There are three whose supplication is not rejected: the fasting person when he breaks his fast, the just leader, and the supplication of the oppressed person.', source: 'Tirmidhi 3598', url: 'https://sunnah.com/tirmidhi:3598' },
  { arabic: 'لَيْلَةُ الْقَدْرِ خَيْرٌ مِّنْ أَلْفِ شَهْرٍ', translation: 'The Night of Decree is better than a thousand months.', source: 'Al-Qadr 97:3', url: 'https://quran.com/97/3' },
  { arabic: null, translation: 'There has come to you Ramadan, a blessed month, which Allah, the Mighty and Sublime, has enjoined you to fast. In it the gates of heavens are opened and the gates of Hell are closed, and every devil is chained up.', source: "Nasa'i 2106", url: 'https://sunnah.com/nasai:2106' },
  { arabic: null, translation: 'When the last ten nights of Ramadan began, the Prophet ﷺ would keep awake at night, wake his family, and prepare himself to be more diligent in worship.', source: 'Bukhari 2024', url: 'https://sunnah.com/bukhari:2024' },
  { arabic: null, translation: 'Whoever recites a letter from the Book of Allah, he will be credited with a good deed, and a good deed gets a tenfold reward.', source: 'Tirmidhi 2910', url: 'https://sunnah.com/tirmidhi:2910' },
  { arabic: null, translation: 'Whoever established prayers on the night of Qadr out of sincere faith and hoping for a reward from Allah, then all his previous sins will be forgiven.', source: 'Bukhari 1901', url: 'https://sunnah.com/bukhari:1901' },
  { arabic: null, translation: 'The Prophet ﷺ was the most generous of all the people, and he used to become more generous in Ramadan when Gabriel met him. Gabriel used to meet him every night of Ramadan to teach him the Quran.', source: 'Bukhari 6', url: 'https://sunnah.com/bukhari:6' },
  { arabic: null, translation: 'The people will remain on the right path as long as they hasten the breaking of the fast.', source: 'Bukhari 1957', url: 'https://sunnah.com/bukhari:1957' },
  { arabic: null, translation: 'Take Suhur as there is a blessing in it.', source: 'Bukhari 1923', url: 'https://sunnah.com/bukhari:1923' },
  { arabic: 'اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي', translation: 'O Allah, You are Pardoning and You love to pardon, so pardon me.', source: 'Tirmidhi 3513', url: 'https://sunnah.com/tirmidhi:3513' },
  { arabic: null, translation: 'Indeed there are chambers in Paradise whose outside can be seen from their inside, and their inside can be seen from their outside. They are for those who speak kindly, feed others, fast regularly, and pray at night while the people sleep.', source: 'Tirmidhi 1984', url: 'https://sunnah.com/tirmidhi:1984' },
  { arabic: null, translation: 'Whoever stood for the prayers in the night of Qadr out of sincere faith and hoping for a reward from Allah, then all his previous sins will be forgiven.', source: 'Bukhari 2014', url: 'https://sunnah.com/bukhari:2014' },
  { arabic: 'إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَّوْقُوتًا', translation: 'Indeed, prayer has been decreed upon the believers a decree of specified times.', source: 'An-Nisa 4:103', url: 'https://quran.com/4/103' },
  { arabic: null, translation: 'He who observes the fast of Ramadan and then follows it with six days of fasting in Shawwal, it will be as if he fasted the whole year.', source: 'Muslim 1164', url: 'https://sunnah.com/muslim:1164a' },
];

function RamadanModeCard({
  now,
  ramadanDay,
  ramadanYear,
  mosques,
  favorites,
}: {
  now: Date;
  ramadanDay: number;
  ramadanYear: number;
  mosques: Mosque[];
  favorites: Set<string>;
}) {
  const [activeSlide, setActiveSlide] = useState(0);
  const slideCount = 4;
  const touchStartX = useRef<number | null>(null);
  const autoTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-advance every 8 seconds
  useEffect(() => {
    autoTimer.current = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % slideCount);
    }, 8000);
    return () => { if (autoTimer.current) clearInterval(autoTimer.current); };
  }, []);

  const resetAutoTimer = useCallback(() => {
    if (autoTimer.current) clearInterval(autoTimer.current);
    autoTimer.current = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % slideCount);
    }, 8000);
  }, []);

  const goToSlide = useCallback((idx: number) => {
    setActiveSlide(idx);
    resetAutoTimer();
  }, [resetAutoTimer]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) goToSlide((activeSlide + 1) % slideCount);
      else goToSlide((activeSlide - 1 + slideCount) % slideCount);
    }
    touchStartX.current = null;
  }, [activeSlide, goToSlide]);

  const representative = mosques.find(m => favorites.has(m.id)) || mosques[0];

  const prayerData = useMemo(() => {
    if (!representative) return null;

    const times = calculatePrayerTimes(
      representative.latitude,
      representative.longitude,
      now,
      representative.calculationMethod || 'NorthAmerica',
      representative.asrMethod || 'Standard'
    );

    // Also compute Maghrib iqama time so we can distinguish adhan→iqama vs iqama→Isha
    const iqamaTimes = calculateIqamaTimes(
      representative.latitude,
      representative.longitude,
      representative.iqamaTimes,
      now,
      representative.calculationMethod || 'NorthAmerica',
      representative.asrMethod || 'Standard',
      representative.scheduledTimeChanges
    );

    const fajrStr = formatPrayerTime(times.fajr);
    const maghribStr = formatPrayerTime(times.maghrib);
    const ishaStr = formatPrayerTime(times.isha);
    const maghribIqamaStr = iqamaTimes.maghrib.iqama;
    const fajrMin = timeToMinutes(fajrStr);
    const maghribMin = timeToMinutes(maghribStr);
    const maghribIqamaMin = timeToMinutes(maghribIqamaStr);
    const ishaMin = timeToMinutes(ishaStr);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Suhoor ends at Fajr
    // Iftar is at Maghrib
    const isFasting = currentMinutes >= fajrMin && currentMinutes < maghribMin;

    // Between Maghrib adhan and Maghrib iqama: "break your fast" window
    const isBreakingFast = !isFasting && currentMinutes >= maghribMin && currentMinutes < maghribIqamaMin;

    // Between Maghrib iqama and Isha: eat up & get ready for taraweeh window
    const isIftarWindow = !isFasting && !isBreakingFast && currentMinutes >= maghribIqamaMin && currentMinutes < ishaMin;

    // Taraweeh window: Isha adhan through Isha + 60 min
    const taraweehWindowEnd = ishaMin + 60;
    const isTaraweehWindow = !isFasting && !isBreakingFast && !isIftarWindow && currentMinutes >= ishaMin && currentMinutes < taraweehWindowEnd;

    // Taraweeh info from the representative mosque
    const rp = representative.ramadanProgram;

    let countdownMinutes: number;
    let countdownLabel: string;

    if (isFasting) {
      // During fast: count down to iftar (Maghrib)
      countdownMinutes = maghribMin - currentMinutes;
      countdownLabel = 'until Iftar';
    } else if (isBreakingFast) {
      // Between Maghrib adhan and iqama: count down to iqama
      countdownMinutes = maghribIqamaMin - currentMinutes;
      countdownLabel = 'until Iqama';
    } else if (isIftarWindow) {
      // Between Maghrib iqama and Isha: count down to Isha
      countdownMinutes = ishaMin - currentMinutes;
      countdownLabel = 'until Isha';
    } else if (isTaraweehWindow) {
      // Isha through Isha+60: no countdown needed, focus on taraweeh
      countdownMinutes = 0;
      countdownLabel = '';
    } else if (currentMinutes < fajrMin) {
      // Before Fajr: count down to suhoor end
      countdownMinutes = fajrMin - currentMinutes;
      countdownLabel = 'until Suhoor ends';
    } else {
      // After Isha: count to tomorrow's suhoor 
      countdownMinutes = (fajrMin + 1440) - currentMinutes;
      countdownLabel = 'until Suhoor ends';
    }

    // Focus state for single-purpose card
    let focusLabel: string;
    let focusTime: string;
    let focusIcon: 'sun' | 'moon' | 'utensils';

    if (isFasting) {
      focusLabel = 'Iftar';
      focusTime = maghribStr;
      focusIcon = 'sun';
    } else if (isBreakingFast) {
      focusLabel = 'Break Your Fast';
      focusTime = maghribIqamaStr;
      focusIcon = 'utensils';
    } else if (isIftarWindow) {
      focusLabel = 'Isha & Taraweeh';
      focusTime = ishaStr;
      focusIcon = 'moon';
    } else if (isTaraweehWindow) {
      focusLabel = 'Taraweeh';
      focusTime = rp?.tarawihTime || ishaStr;
      focusIcon = 'moon';
    } else {
      focusLabel = 'Suhoor ends';
      focusTime = fajrStr;
      focusIcon = 'moon';
    }

    return {
      fajrStr,
      maghribStr,
      ishaStr,
      isFasting,
      isBreakingFast,
      isIftarWindow,
      isTaraweehWindow,
      countdownMinutes,
      countdownLabel,
      mosqueName: representative.name,
      focusLabel,
      focusTime,
      focusIcon,
      tarawihRakat: rp?.tarawih ? rp.tarawihRakat : null,
      tarawihTime: rp?.tarawih ? rp.tarawihTime : null,
    };
  }, [representative, now]);

  return (
    <div className="mb-4 rounded-2xl bg-[#0c0a09] p-[1px] shadow-lg shadow-amber-900/20 overflow-hidden relative">
      {/* Gold-glass outer glow border */}
      <div className="rounded-2xl bg-gradient-to-br from-amber-400/25 via-orange-400/10 to-yellow-500/20 border border-amber-500/30 p-4 relative overflow-hidden">
        {/* Decorative crescent */}
        <div className="absolute -top-6 -right-6 opacity-[0.07]">
          <Moon className="w-24 h-24 text-amber-200" />
        </div>
        {/* Subtle radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(251,191,36,0.12)_0%,_transparent_60%)]" />

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-3 relative z-[1]">
          <div className="bg-amber-400/15 border border-amber-400/20 rounded-full p-2">
            <Moon className="w-4 h-4 text-amber-300/90" />
          </div>
          <div>
            <div className="text-amber-100/90 font-semibold text-sm">
              Ramadan Mubarak
            </div>
            <div className="text-[11px] text-amber-200/40">
              Day {ramadanDay} of 30
            </div>
          </div>
        </div>

        {/* ── Carousel ── */}
        <div
          className="relative z-[1] overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${activeSlide * 100}%)` }}
          >
            {/* ── Slide 0: Time-based content ── */}
            <div className="w-full flex-shrink-0">
              {prayerData ? (
                <div className="space-y-2.5">
                  {prayerData.isFasting ? (
                    (() => {
                      const reminder = RAMADAN_REMINDERS[(ramadanDay - 1) % RAMADAN_REMINDERS.length];
                      return (
                        <div className="bg-white/[0.06] border border-amber-400/10 rounded-xl px-4 py-3">
                          <div className="flex items-center gap-1.5 mb-2.5">
                            <BookOpen className="w-3 h-3 text-amber-300/80" />
                            <span className="text-[10px] text-amber-200/40 uppercase tracking-wider">Daily Reminder</span>
                          </div>
                          {reminder.arabic && (
                            <div className="text-right mb-2" dir="rtl">
                              <p className="text-amber-100/80 text-sm leading-relaxed font-arabic">
                                {reminder.arabic}
                              </p>
                            </div>
                          )}
                          <p className="text-amber-100/70 text-[13px] leading-relaxed italic">
                            &ldquo;{reminder.translation}&rdquo;
                          </p>
                          <p className="text-amber-200/30 text-[10px] mt-2">
                            —{' '}
                            {reminder.url ? (
                              <a
                                href={reminder.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline decoration-amber-200/20 hover:text-amber-200/50 transition-colors"
                              >
                                {reminder.source}
                              </a>
                            ) : (
                              reminder.source
                            )}
                          </p>
                        </div>
                      );
                    })()
                  ) : prayerData.isBreakingFast ? (
                    <div className="bg-white/[0.06] border border-amber-400/10 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <HandPlatter className="w-3 h-3 text-amber-300/80" />
                        <span className="text-[10px] text-amber-200/40 uppercase tracking-wider">Break Your Fast</span>
                      </div>
                      <p className="text-amber-100/90 text-sm leading-relaxed">
                        Bismillah — eat & drink before iqama!
                      </p>
                      <div className="flex items-baseline justify-between mt-2">
                        <span className="text-xl text-white font-semibold tabular-nums">
                          {formatCountdown(prayerData.countdownMinutes)}
                        </span>
                        <span className="text-xs text-amber-200/40">
                          Iqama at {prayerData.focusTime}
                        </span>
                      </div>
                      <div className="pt-2.5 mt-2.5 border-t border-amber-400/10">
                        <div className="text-right mb-1" dir="rtl">
                          <p className="text-amber-100/70 text-xs leading-relaxed font-arabic">
                            ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ وَثَبَتَ الأَجْرُ إِنْ شَاءَ اللَّهُ
                          </p>
                        </div>
                        <p className="text-amber-200/30 text-[10px] italic">
                          &ldquo;The thirst is gone, the veins are moistened, and the reward is assured, if Allah wills.&rdquo;
                        </p>
                      </div>
                    </div>
                  ) : prayerData.isIftarWindow ? (
                    <div className="bg-white/[0.06] border border-amber-400/10 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Utensils className="w-3 h-3 text-amber-300/80" />
                        <span className="text-[10px] text-amber-200/40 uppercase tracking-wider">Iftar Time</span>
                      </div>
                      <p className="text-amber-100/80 text-sm leading-relaxed">
                        Eat up & get ready for Isha{prayerData.tarawihRakat || prayerData.tarawihTime ? ' & Taraweeh' : ''}
                      </p>
                      {(prayerData.tarawihRakat || prayerData.tarawihTime) && (
                        <div className="flex items-center gap-2 mt-2 text-amber-200/40 text-xs">
                          <Rows3 className="w-3 h-3" />
                          <span>
                            {prayerData.tarawihRakat ? `${prayerData.tarawihRakat} Rakat` : 'Taraweeh'}
                            {prayerData.tarawihTime ? ` · ${prayerData.tarawihTime}` : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : prayerData.isTaraweehWindow ? (
                    <div className="bg-white/[0.06] border border-amber-400/10 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Rows3 className="w-3 h-3 text-amber-300/80" />
                        <span className="text-[10px] text-amber-200/40 uppercase tracking-wider">Taraweeh Tonight</span>
                      </div>
                      <p className="text-amber-100/80 text-sm leading-relaxed">
                        {prayerData.tarawihRakat
                          ? `${prayerData.tarawihRakat} Rakat Taraweeh`
                          : 'Taraweeh prayers'}
                        {prayerData.tarawihTime ? ` at ${prayerData.tarawihTime}` : ''}
                        {' · '}{prayerData.mosqueName ? prayerData.mosqueName.split(/\s+/).slice(0, 3).join(' ') : ''}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-white/[0.06] border border-amber-400/10 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Moon className="w-3 h-3 text-amber-200/70" />
                        <span className="text-[10px] text-amber-200/40 uppercase tracking-wider">{prayerData.focusLabel}</span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-2xl text-white font-semibold tabular-nums">
                          {formatCountdown(prayerData.countdownMinutes)}
                        </span>
                        <span className="text-sm text-amber-200/50">
                          {prayerData.focusTime}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white/[0.06] rounded-lg px-3 py-2.5 text-center">
                  <span className="text-xs text-amber-200/50">Add a masjid to see iftar & suhoor times</span>
                </div>
              )}
            </div>

            {/* ── Slide 1: Zakat al-Fitr ── */}
            <div className="w-full flex-shrink-0">
              <div className="bg-white/[0.06] border border-amber-400/10 rounded-xl px-4 py-3">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <HandCoins className="w-3 h-3 text-amber-300/80" />
                  <span className="text-[10px] text-amber-200/40 uppercase tracking-wider">Zakat al-Fitr</span>
                </div>
                <p className="text-amber-100/90 text-sm leading-relaxed">
                  Don't forget to pay Zakat al-Fitr before Eid prayer!
                </p>
                <p className="text-amber-100/60 text-xs leading-relaxed mt-2">
                  It must be paid before the Eid prayer for it to count as Zakat al-Fitr. Pay on behalf of every member of your household — including children.
                </p>
                <div className="pt-2.5 mt-2.5 border-t border-amber-400/10">
                  <div className="text-right mb-1" dir="rtl">
                    <p className="text-amber-100/70 text-xs leading-relaxed font-arabic">
                      فَرَضَ رَسُولُ اللَّهِ ﷺ زَكَاةَ الْفِطْرِ صَاعًا مِنْ تَمْرٍ أَوْ صَاعًا مِنْ شَعِيرٍ عَلَى الْعَبْدِ وَالْحُرِّ وَالذَّكَرِ وَالأُنْثَى وَالصَّغِيرِ وَالْكَبِيرِ مِنَ الْمُسْلِمِينَ
                    </p>
                  </div>
                  <p className="text-amber-200/30 text-[10px]">
                    — <a href="https://sunnah.com/bukhari:1503" target="_blank" rel="noopener noreferrer" className="underline decoration-amber-200/20 hover:text-amber-200/50 transition-colors">Bukhari 1503</a>
                  </p>
                </div>
              </div>
            </div>

            {/* ── Slide 2: Eid Preparation ── */}
            <div className="w-full flex-shrink-0">
              <div className="bg-white/[0.06] border border-amber-400/10 rounded-xl px-4 py-3">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <Gift className="w-3 h-3 text-amber-300/80" />
                  <span className="text-[10px] text-amber-200/40 uppercase tracking-wider">Prepare for Eid</span>
                </div>
                <p className="text-amber-100/90 text-sm leading-relaxed">
                  Eid al-Fitr could be <span className="text-amber-200">March 19–21</span> depending on your community's start date and moon sighting
                </p>
                <ul className="mt-2.5 space-y-1.5 text-amber-100/60 text-xs leading-relaxed">
                  <li className="flex items-start gap-2">
                    <Star className="w-3 h-3 text-amber-400/40 mt-0.5 flex-shrink-0" />
                    <span>Take a bath (ghusl) on the morning of Eid</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Star className="w-3 h-3 text-amber-400/40 mt-0.5 flex-shrink-0" />
                    <span>Wear your best clothes and apply perfume</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Star className="w-3 h-3 text-amber-400/40 mt-0.5 flex-shrink-0" />
                    <span>Eat an odd number of dates before Eid prayer</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Star className="w-3 h-3 text-amber-400/40 mt-0.5 flex-shrink-0" />
                    <span>Say takbir from Maghrib the night before until the Eid prayer</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Star className="w-3 h-3 text-amber-400/40 mt-0.5 flex-shrink-0" />
                    <span>Check with your masjid for the Eid prayer time</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* ── Slide 3: Moon Sighting ── */}
            <div className="w-full flex-shrink-0">
              <div className="bg-white/[0.06] border border-amber-400/10 rounded-xl px-4 py-3">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <Eye className="w-3 h-3 text-amber-300/80" />
                  <span className="text-[10px] text-amber-200/40 uppercase tracking-wider">Shawwal Moon Sighting</span>
                </div>
                <p className="text-amber-100/80 text-xs leading-relaxed mb-2.5">
                  Look for the crescent after Maghrib on your community's 29th day of Ramadan:
                </p>
                {/* Two-column: Started Feb 18 vs Feb 19 */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Started Wed Feb 18 */}
                  <div className="bg-white/[0.05] border border-amber-400/[0.07] rounded-lg px-2.5 py-2">
                    <div className="text-[10px] text-amber-200/35 uppercase tracking-wider mb-1">Started Feb 18</div>
                    <div className="text-amber-100/80 text-xs">
                      <div>29th → <span className="text-amber-200">Tue Mar 18</span></div>
                      <div className="mt-1 text-amber-100/50 text-[11px]">
                        Sighted → Eid <span className="text-amber-200/70">Wed 19th</span>
                      </div>
                      <div className="text-amber-100/50 text-[11px]">
                        Not → Eid <span className="text-amber-200/70">Thu 20th</span>
                      </div>
                    </div>
                  </div>
                  {/* Started Thu Feb 19 */}
                  <div className="bg-white/[0.05] border border-amber-400/[0.07] rounded-lg px-2.5 py-2">
                    <div className="text-[10px] text-amber-200/35 uppercase tracking-wider mb-1">Started Feb 19</div>
                    <div className="text-amber-100/80 text-xs">
                      <div>29th → <span className="text-amber-200">Wed Mar 19</span></div>
                      <div className="mt-1 text-amber-100/50 text-[11px]">
                        Sighted → Eid <span className="text-amber-200/70">Thu 20th</span>
                      </div>
                      <div className="text-amber-100/50 text-[11px]">
                        Not → Eid <span className="text-amber-200/70">Fri 21st</span>
                      </div>
                    </div>
                  </div>
                </div>
                <a
                  href="https://hilalcommittee.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-white/[0.06] hover:bg-white/[0.12] border border-amber-400/10 rounded-lg px-3 py-2 mt-2.5 transition-colors active:scale-[0.98]"
                >
                  <span className="text-xs text-amber-200/70">Hilal Committee updates</span>
                  <ExternalLink className="w-3 h-3 text-amber-200/40" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* ── Carousel dots ── */}
        <div className="flex items-center justify-center gap-1.5 mt-3 relative z-[1]">
          {Array.from({ length: slideCount }).map((_, i) => (
            <button
              key={i}
              onClick={() => goToSlide(i)}
              className={`rounded-full transition-all duration-300 ${
                i === activeSlide
                  ? 'w-4 h-1.5 bg-amber-400/60'
                  : 'w-1.5 h-1.5 bg-amber-400/20 hover:bg-amber-400/35'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}