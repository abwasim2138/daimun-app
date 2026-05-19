import { useState, useEffect } from 'react';
import {
  ArrowLeft, Share2, Copy, Check, MessageCircle, Mail,
  Clock, Bell, Moon, Compass, Utensils,
  Printer, ChevronRight, Users, Heart
} from 'lucide-react';
import { navigate } from '../utils/router';
import { motion } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { FaviconSVG } from './FaviconSVG';

const DOMAIN = 'TampaRamadan.com';
const SITE_URL = 'https://tamparamadan.com';
const QR_URL = 'https://daimun.app';

interface MarketingPageProps {
  onBack: () => void;
}

/* ─── Robust copy helper ─── */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

/* ─── Share button ─── */
function ShareBtn({ icon: Icon, label, onClick, className }: {
  icon: typeof Copy;
  label: string;
  onClick: () => void;
  className: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl text-sm transition-all active:scale-[0.96] ${className}`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span>{label}</span>
    </button>
  );
}

/* ─── Animated counter ─── */
function CountUp({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (target === 0) { setVal(0); return; }
    const dur = 1200;
    const steps = 30;
    const inc = target / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += inc;
      if (current >= target) {
        setVal(target);
        clearInterval(interval);
      } else {
        setVal(Math.floor(current));
      }
    }, dur / steps);
    return () => clearInterval(interval);
  }, [target]);

  return <span>{val}{suffix}</span>;
}

export function MarketingPage({ onBack }: MarketingPageProps) {
  const [copied, setCopied] = useState(false);
  const [msgCopied, setMsgCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const shareMessage = `Ramadan Mubarak!\n\nCheck out ${DOMAIN} \u2014 the best way to find iqama times, Tarawih schedules, iftar info & more for Tampa Bay masajid.\n\n\u2022 Live iqama times\n\u2022 Ramadan programs\n\u2022 Smart notifications\n\u2022 Qibla compass\n\u2022 Free & community-driven\n\n${SITE_URL}`;

  const doCopy = async (text: string, setter: (v: boolean) => void) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setter(true);
      setTimeout(() => setter(false), 2000);
    }
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`, '_blank');
  };
  const shareSMS = () => {
    window.open(`sms:?&body=${encodeURIComponent(shareMessage)}`, '_blank');
  };
  const shareEmail = () => {
    const subject = encodeURIComponent(`Ramadan in Tampa Bay \u2014 ${DOMAIN}`);
    const body = encodeURIComponent(shareMessage);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };
  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Ramadan in Tampa Bay \u2014 ${DOMAIN}`,
          text: `Check out ${DOMAIN} for live iqama times, Ramadan programs & more for Tampa Bay masajid.`,
          url: SITE_URL,
        });
        return;
      } catch {}
    }
    doCopy(SITE_URL, setCopied);
  };

  const handlePrint = () => {
    setTimeout(() => window.print(), 200);
  };

  const highlights = [
    { icon: Clock, text: 'Live iqama times for every masjid', color: 'text-blue-400' },
    { icon: Moon, text: 'Tarawih, Qiyam, I\u2019tikaf & Khatm al-Quran', color: 'text-purple-400' },
    { icon: Bell, text: 'Smart notifications before each iqama', color: 'text-amber-400' },
    { icon: Utensils, text: 'Find masajid serving iftar tonight', color: 'text-orange-400' },
    { icon: Compass, text: 'Precision Qibla compass', color: 'text-cyan-400' },
    { icon: Users, text: 'Community-updated in real-time', color: 'text-emerald-400' },
  ];

  return (
    <>
      <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] print:hidden">
        {/* ─── Sticky header ─── */}
        <div className="bg-white/80 dark:bg-black/80 border-b border-gray-200/50 dark:border-white/[0.06] sticky top-0 z-20 backdrop-blur-xl">
          <div className="max-w-2xl mx-auto px-5 py-3 flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white transition-colors -ml-1 p-1"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">Back</span>
            </button>
            <button
              onClick={nativeShare}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs rounded-full hover:from-amber-600 hover:to-orange-600 transition-all active:scale-[0.96] shadow-sm shadow-amber-500/20"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-5 pb-16">

          {/* ━━━ HERO ━━━ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="pt-8 pb-6 text-center"
          >
            {/* Favicon mihrab icon */}
            <div className="flex justify-center mb-4">
              <motion.div
                initial={{ y: 30, scale: 0.6, opacity: 0 }}
                animate={{ y: 0, scale: 1, opacity: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 120,
                  damping: 14,
                  delay: 0.15,
                }}
                className="w-20 h-20 rounded-2xl flex items-center justify-center p-3"
                style={{
                  background: 'linear-gradient(160deg, #1e2a4a, #152041, #0f1730)',
                }}
              >
                <div className="w-full h-full [&_svg]:w-full [&_svg]:h-full">
                  <FaviconSVG />
                </div>
              </motion.div>
            </div>

            {/* Day-to-night gradient title */}
            <h1
              className="text-3xl sm:text-4xl tracking-wide mb-1.5"
              style={{
                fontFamily: "'Righteous', 'Exo 2', sans-serif",
                background: 'linear-gradient(135deg, #D4AF37, #C8963E, #B8860B)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {DOMAIN}
            </h1>
            <p className="text-gray-900 dark:text-white/80 text-lg mb-1" style={{ lineHeight: '1.4' }}>
              Helping your community succeed, together.
            </p>
            <p className="text-gray-500 dark:text-white/40 text-sm">
              Free &middot; No download &middot; Updated by the community
            </p>
          </motion.div>

          {/* ━━━ PRIMARY CTA: QR + SHARE ━━━ */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08 }}
            className="rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-white/[0.08] dark:via-white/[0.05] dark:to-white/[0.08] border border-gray-700/50 dark:border-white/[0.08] p-5 mb-5"
          >
            <p className="text-center text-white/60 dark:text-white/40 text-xs uppercase tracking-wider mb-4">
              Share with your community
            </p>

            {/* QR + link row */}
            <div className="flex items-center gap-5 mb-5">
              <div className="bg-white p-2.5 rounded-xl shadow-sm flex-shrink-0">
                <QRCodeSVG
                  value={QR_URL}
                  size={96}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#1a1a1a"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white/90 text-sm mb-2">Scan or share the link</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 bg-white/10 rounded-lg border border-white/10 truncate">
                    <span className="text-sm text-white/70">{DOMAIN}</span>
                  </div>
                  <button
                    onClick={() => doCopy(SITE_URL, setLinkCopied)}
                    className={`px-3 py-2 rounded-lg text-xs transition-all active:scale-[0.96] flex-shrink-0 ${
                      linkCopied
                        ? 'bg-emerald-500 text-white'
                        : 'bg-white/15 text-white hover:bg-white/25'
                    }`}
                  >
                    {linkCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Share buttons */}
            <div className="grid grid-cols-2 gap-2">
              <ShareBtn
                icon={MessageCircle}
                label="WhatsApp"
                onClick={shareWhatsApp}
                className="bg-[#25D366]/15 text-[#25D366] hover:bg-[#25D366]/25 border border-[#25D366]/20"
              />
              <ShareBtn
                icon={MessageCircle}
                label="Text Message"
                onClick={shareSMS}
                className="bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 border border-blue-500/20"
              />
              <ShareBtn
                icon={Mail}
                label="Email"
                onClick={shareEmail}
                className="bg-white/5 text-white/60 hover:bg-white/10 border border-white/10"
              />
              <ShareBtn
                icon={Share2}
                label={typeof navigator !== 'undefined' && navigator.share ? 'More...' : 'Copy Link'}
                onClick={nativeShare}
                className="bg-purple-500/15 text-purple-400 hover:bg-purple-500/25 border border-purple-500/20"
              />
            </div>
          </motion.div>

          {/* ━━━ WHAT PEOPLE GET ━━━ */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.16 }}
            className="rounded-2xl bg-white/70 dark:bg-white/[0.04] border border-gray-200/60 dark:border-white/[0.06] p-5 mb-5"
          >
            <p className="text-xs text-gray-400 dark:text-white/35 uppercase tracking-wider mb-4">
              What they'll get
            </p>
            <div className="space-y-3">
              {highlights.map((h, i) => (
                <motion.div
                  key={h.text}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 + i * 0.05 }}
                  className="flex items-center gap-3"
                >
                  <h.icon className={`w-4 h-4 ${h.color} flex-shrink-0`} />
                  <span className="text-sm text-gray-700 dark:text-white/70">{h.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* ━━━ TRUST STATS ━━━ */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.24 }}
            className="grid grid-cols-2 gap-3 mb-5"
          >
            {[
              { value: <CountUp target={100} suffix="%" />, label: 'Free' },
              { value: <><span>&lt;1</span><span className="text-xs">min</span></>, label: 'To get started' },
            ].map((s, i) => (
              <div
                key={i}
                className="text-center p-4 rounded-2xl bg-white/70 dark:bg-white/[0.04] border border-gray-200/60 dark:border-white/[0.06]"
              >
                <div className="text-xl text-gray-900 dark:text-white/85 mb-0.5">{s.value}</div>
                <div className="text-xs text-gray-400 dark:text-white/35">{s.label}</div>
              </div>
            ))}
          </motion.div>

          {/* ━━━ COPY-PASTE MESSAGE ━━━ */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="mb-5"
          >
            <div className="relative rounded-2xl bg-white/70 dark:bg-white/[0.04] border border-gray-200/60 dark:border-white/[0.06] p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-400 dark:text-white/35 uppercase tracking-wider">
                  Ready-to-send message
                </p>
                <button
                  onClick={() => doCopy(shareMessage, setMsgCopied)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all active:scale-[0.96] ${
                    msgCopied
                      ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : 'bg-gray-100 dark:bg-white/[0.08] text-gray-500 dark:text-white/50 hover:bg-gray-200 dark:hover:bg-white/[0.12]'
                  }`}
                >
                  {msgCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{msgCopied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
              <pre className="text-xs text-gray-600 dark:text-white/50 whitespace-pre-wrap" style={{ fontFamily: 'inherit', lineHeight: '1.6' }}>
                {shareMessage}
              </pre>
            </div>
          </motion.div>

          {/* ━━━ PRINT FLYER ━━━ */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.36 }}
            className="mb-8"
          >
            <button
              onClick={handlePrint}
              className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-white/70 dark:bg-white/[0.04] border border-gray-200/60 dark:border-white/[0.06] hover:bg-white dark:hover:bg-white/[0.06] transition-all active:scale-[0.98] group"
            >
              <div className="flex items-center gap-3">
                <div className="bg-indigo-500/10 rounded-lg p-2.5">
                  <Printer className="w-5 h-5 text-indigo-500" />
                </div>
                <div className="text-left">
                  <div className="text-sm text-gray-900 dark:text-white/85">Print a flyer for your masjid</div>
                  <p className="text-xs text-gray-500 dark:text-white/40">Bulletin board, lobby, or hand out</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 dark:text-white/20 group-hover:text-gray-500 dark:group-hover:text-white/40 transition-colors" />
            </button>
          </motion.div>

          {/* ━━━ MASJID ETIQUETTE LINK ━━━ */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="mb-8"
          >
            <a
              href="/etiquette"
              onClick={(e) => { e.preventDefault(); navigate('/etiquette'); window.scrollTo(0, 0); }}
              className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-white/70 dark:bg-white/[0.04] border border-gray-200/60 dark:border-white/[0.06] hover:bg-white dark:hover:bg-white/[0.06] transition-all active:scale-[0.98] group no-underline"
            >
              <div className="flex items-center gap-3">
                <div className="bg-emerald-500/10 rounded-lg p-2.5">
                  <Heart className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="text-left">
                  <div className="text-sm text-gray-900 dark:text-white/85">Masjid Etiquette Guide</div>
                  <p className="text-xs text-gray-500 dark:text-white/40">Parking, shoes, duas, salams & more</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 dark:text-white/20 group-hover:text-gray-500 dark:group-hover:text-white/40 transition-colors" />
            </a>
          </motion.div>

          {/* ━━━ HADITH ━━━ */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-center pb-8"
          >
            <div className="w-8 h-px bg-gray-200 dark:bg-white/10 mx-auto mb-4" />
            <p className="text-xs text-gray-400 dark:text-white/25 italic" style={{ lineHeight: '1.6' }}>
              "Whoever guides someone to goodness will have a reward like the one who did it."
            </p>
            <p className="text-xs text-gray-300 dark:text-white/15 mt-1">&mdash; Sahih Muslim 1893</p>
          </motion.div>
        </div>
      </div>

      {/* Printable Flyer */}
      <PrintableFlyer />
    </>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Printable flyer — hidden on screen, shown when printing.
 * Single page, high-impact layout with QR code.
 * Clean icon-based design (no emojis).
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/* Simple SVG icon for print (inline, no external deps) */
function PrintIcon({ d, color = '#333' }: { d: string; color?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d={d} />
    </svg>
  );
}

function PrintableFlyer() {
  const featureIconPaths: Record<string, { d: string; color: string }> = {
    clock:    { d: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM12 6v6l4 2', color: '#2563eb' },
    bell:     { d: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9ZM13.73 21a2 2 0 0 1-3.46 0', color: '#d97706' },
    moon:     { d: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z', color: '#7c3aed' },
    utensils: { d: 'M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7', color: '#ea580c' },
    compass:  { d: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z', color: '#0891b2' },
    calendar: { d: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', color: '#059669' },
    tv:       { d: 'M4 7h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2ZM6 21h12M10 17v4M14 17v4', color: '#6366f1' },
    users:    { d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75', color: '#10b981' },
  };

  const features = [
    { key: 'clock',    title: 'Live Iqama Times',      desc: 'Real-time schedules updated by the community' },
    { key: 'bell',     title: 'Smart Reminders',        desc: 'Notifications before each iqama' },
    { key: 'moon',     title: 'Ramadan Programs',       desc: 'Tarawih, Qiyam, I\'tikaf & Khatm al-Quran info' },
    { key: 'utensils', title: 'Iftar Info',             desc: 'Find masajid serving iftar nightly' },
    { key: 'compass',  title: 'Qibla Compass',          desc: 'Accurate Qibla direction on your phone' },
    { key: 'calendar', title: 'Printable Timetable',    desc: 'Monthly schedule for your fridge' },
    { key: 'tv',       title: 'TV Display Mode',        desc: 'Full-screen display for masjid lobbies' },
    { key: 'users',    title: 'Community-Driven',       desc: 'Updated in real-time by local volunteers' },
  ];

  return (
    <div className="hidden print:block" style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", color: '#1a1a1a' }}>
      <style>{`@media print { @page { size: letter; margin: 0; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`}</style>
      <div
        style={{
          width: '100%',
          maxWidth: '7.5in',
          maxHeight: '10in',
          overflow: 'hidden',
          margin: '0 auto',
          padding: '0.5in 0.6in',
          boxSizing: 'border-box',
          pageBreakAfter: 'avoid' as const,
          pageBreakInside: 'avoid' as const,
        }}
      >
        {/* Header with logo */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(145deg, #1a1a2e, #16213e, #0f3460)',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <FaviconSVG />
            </div>
          </div>
          <div style={{ fontSize: '13px', letterSpacing: '3px', textTransform: 'uppercase', color: '#888', marginBottom: '6px' }}>
            This Ramadan in Tampa Bay
          </div>
          <div
            style={{
              fontSize: '38px',
              fontWeight: 700,
              letterSpacing: '1px',
              background: 'linear-gradient(135deg, #D4AF37, #C8963E, #B8860B)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '4px',
              fontFamily: "'Righteous', 'Exo 2', sans-serif",
            }}
          >
            TampaRamadan.com
          </div>
          <div style={{ fontSize: '14px', color: '#555' }}>
            Your free digital companion for Ramadan &mdash; live iqama times, Tarawih schedules & more
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: '2px', background: 'linear-gradient(to right, transparent, #D4AF37, #B8860B, #D4AF37, transparent)', marginBottom: '16px' }} />

        {/* Features in 2 columns with icons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px', marginBottom: '16px' }}>
          {features.map((f) => {
            const icon = featureIconPaths[f.key];
            return (
              <div key={f.key} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '6px 0' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: `${icon.color}10`,
                    border: `1px solid ${icon.color}30`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <PrintIcon d={icon.d} color={icon.color} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a1a' }}>{f.title}</div>
                  <div style={{ fontSize: '11px', color: '#666', lineHeight: '1.4' }}>{f.desc}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Big CTA with QR */}
        <div
          style={{
            background: '#f8f8f8',
            border: '1.5px solid #e0e0e0',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '28px' }}>
            <QRCodeSVG
              value={QR_URL}
              size={100}
              level="M"
              bgColor="#ffffff"
              fgColor="#1a1a1a"
            />
            <div>
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 700,
                  padding: '10px 28px',
                  border: '2.5px solid #D4AF37',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #D4AF37, #C8963E, #B8860B)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  marginBottom: '8px',
                  fontFamily: "'Righteous', 'Exo 2', sans-serif",
                }}
              >
                TampaRamadan.com
              </div>
              <div style={{ fontSize: '12px', color: '#888', textAlign: 'center' }}>
                Scan the QR code or visit the site
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', borderTop: '1px solid #e5e5e5', paddingTop: '14px' }}>
          <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px', fontWeight: 600 }}>
            TampaRamadan.com
          </div>
          <div style={{ fontSize: '11px', color: '#999', lineHeight: '1.6' }}>
            Free &bull; Works on any phone, tablet, or computer &bull; No app download required
          </div>
          <div style={{ fontSize: '10px', color: '#bbb', marginTop: '4px', fontStyle: 'italic' }}>
            "Whoever guides someone to goodness will have a reward like the one who did it." &mdash; Sahih Muslim 1893
          </div>
        </div>
      </div>
    </div>
  );
}