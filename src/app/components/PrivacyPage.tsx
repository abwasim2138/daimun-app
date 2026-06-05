import { useCallback } from 'react';
import { ArrowLeft, Share2, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { SITE_URL } from '../utils/api';

/**
 * Privacy policy page. Required for App Store submission — the URL to
 * this route is what we paste into App Store Connect → App Privacy →
 * Privacy Policy URL.
 *
 * The content is the canonical version, mirrored from
 * `daimuniOS/PRIVACY_POLICY.md`. Keep them in sync on every change so
 * the iOS app and the marketing site never contradict each other.
 *
 * Layout follows the existing static-page convention (ZakatAlFitrPage,
 * EidGuidePage) — sticky header with back + share, motion fade-up
 * content, max-w-2xl reading column, dark-mode aware.
 */

function FadeUp({ children, delay = 0, className = '', id }: { children: React.ReactNode; delay?: number; className?: string; id?: string }) {
  return (
    <motion.div
      id={id}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface PrivacyPageProps {
  onBack: () => void;
}

export function PrivacyPage({ onBack }: PrivacyPageProps) {
  const handleShare = useCallback(async () => {
    const url = `${SITE_URL}/privacy`;
    const shareData = {
      title: 'Privacy Policy — Dāimūn',
      text: 'How Dāimūn handles your data.',
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
            className="flex items-center gap-1.5 text-gray-700 dark:text-white/70 hover:text-gray-900 dark:hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>
          <button onClick={handleShare}
            className="text-gray-700 dark:text-white/70 hover:text-gray-900 dark:hover:text-white transition-colors p-1.5 -m-1.5"
            aria-label="Share">
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-8 sm:py-12 text-gray-800 dark:text-white/85">
        <FadeUp>
          <div className="flex items-center gap-2.5 mb-2 text-emerald-700 dark:text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
            <span className="text-xs uppercase tracking-wider font-medium">Privacy</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-gray-900 dark:text-white mb-2">
            D&#x101;im&#x16B;n Privacy Policy
          </h1>
          <p className="text-sm text-gray-500 dark:text-white/40 mb-8">Last updated: 4 June 2026</p>
        </FadeUp>

        <FadeUp delay={0.05}>
          <p className="text-[15px] leading-relaxed mb-6">
            This document explains what data D&#x101;im&#x16B;n (the &ldquo;App&rdquo;) collects, how
            it&rsquo;s used, and the choices you have. D&#x101;im&#x16B;n is built to be useful with
            as little data as possible. <strong>The default experience requires no account,
            no sign-up, and no personal information.</strong>
          </p>
        </FadeUp>

        <Section title="1. What stays on your device" delay={0.1}>
          The following are stored only on your iPhone, iPad, or Apple Watch &mdash; never
          sent to our servers:
          <ul className="list-disc pl-5 mt-3 space-y-2">
            <li><strong>Your location.</strong> Used to sort masjid listings by distance and
              compute Qibla direction. Never leaves the device.</li>
            <li><strong>Favorites and preferences.</strong> Which mas&#x101;jid you&rsquo;ve favorited,
              theme choice, dismissed prompts, reminder configuration.</li>
            <li><strong>Cached masjid data.</strong> A copy of the masjid list and last fetched
              prayer times so the app works briefly without a network connection.</li>
            <li><strong>Watch snapshot.</strong> A small payload sent from your iPhone to your
              paired Apple Watch over Apple&rsquo;s WatchConnectivity framework. We don&rsquo;t
              see this payload.</li>
          </ul>
          <p className="mt-3">
            We use Apple&rsquo;s <code className="text-xs bg-gray-100 dark:bg-white/[0.06] px-1.5 py-0.5 rounded">UserDefaults</code> for
            this storage. Uninstalling the App removes it all.
          </p>
        </Section>

        <Section title="2. What is sent to our servers" delay={0.15}>
          <h3 className="text-base font-medium mt-2 mb-2 text-gray-900 dark:text-white">2a. Public reads (everyone)</h3>
          <p>The App fetches the public masjid list, iqama times, and janaza notices from
          our backend. These requests are anonymous and don&rsquo;t carry any personal
          identifier.</p>

          <h3 className="text-base font-medium mt-5 mb-2 text-gray-900 dark:text-white">2b. Anonymous community reports</h3>
          <p>When you tap &ldquo;Report inaccurate time&rdquo; on a masjid&rsquo;s detail screen, the App
          submits an anonymous report: the masjid&rsquo;s ID, the prayer(s) you flagged, your
          suggested correct time, and any notes you typed. No user identifier, no device
          identifier, no location.</p>

          <h3 className="text-base font-medium mt-5 mb-2 text-gray-900 dark:text-white">2c. Admin sign-in (admins only)</h3>
          <p>Masjid administrators sign in with an <strong>email address and password</strong> to
          authenticate with our backend (Supabase) and determine which masjid(s) they may
          edit. Credentials are stored in the iOS Keychain on your phone. We don&rsquo;t link
          your email to advertising, analytics, or any third party.</p>
        </Section>

        <Section title="3. What we don't do" delay={0.2}>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>No tracking.</strong> No IDFA, no advertising identifier, no App
              Tracking Transparency prompt.</li>
            <li><strong>No analytics SDKs.</strong> No Firebase, Mixpanel, Amplitude, or any
              other third-party analytics.</li>
            <li><strong>No ad networks.</strong></li>
            <li><strong>No selling your data.</strong> We have no commercial relationship that
              involves user data.</li>
          </ul>
        </Section>

        <Section title="4. Permissions" delay={0.25}>
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm border-separate border-spacing-y-2">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-gray-400 dark:text-white/35">
                  <th className="px-2 font-medium">Permission</th>
                  <th className="px-2 font-medium">When asked</th>
                  <th className="px-2 font-medium">Used for</th>
                </tr>
              </thead>
              <tbody className="text-gray-700 dark:text-white/75">
                <tr><td className="px-2 py-1.5">Location (When In Use)</td><td className="px-2 py-1.5">First launch / settings</td><td className="px-2 py-1.5">Sort masjids by distance, Qibla direction. Stays on device.</td></tr>
                <tr><td className="px-2 py-1.5">Notifications</td><td className="px-2 py-1.5">Tap &ldquo;Notifications&rdquo;</td><td className="px-2 py-1.5">Local prayer reminders scheduled by your iPhone.</td></tr>
                <tr><td className="px-2 py-1.5">Calendar (write)</td><td className="px-2 py-1.5">&ldquo;Add to Calendar&rdquo;</td><td className="px-2 py-1.5">Save a masjid event to your iOS calendar.</td></tr>
                <tr><td className="px-2 py-1.5">Camera</td><td className="px-2 py-1.5">Admin &ldquo;Scan times&rdquo;</td><td className="px-2 py-1.5">Photograph a sign-board for on-device OCR. The photo never leaves your phone.</td></tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-gray-500 dark:text-white/50">
            Every permission can be revoked at any time in <strong>iOS Settings &rarr; D&#x101;im&#x16B;n</strong>.
          </p>
        </Section>

        <Section title="5. Children" delay={0.3}>
          D&#x101;im&#x16B;n is suitable for all ages. We do not knowingly collect personal
          information from children under 13. The consumer experience requires no
          information of any kind.
        </Section>

        <Section title="6. Security" delay={0.35}>
          Network requests are made over HTTPS. Admin credentials are stored in the iOS
          Keychain. Cached data on-device sits in App-Group <code className="text-xs bg-gray-100 dark:bg-white/[0.06] px-1.5 py-0.5 rounded">UserDefaults</code>,
          protected by iOS data-protection by default.
        </Section>

        <Section title="7. Your choices" delay={0.4}>
          <ul className="list-disc pl-5 space-y-2">
            <li>Uninstall the App to remove all on-device data.</li>
            <li>For admins: request deletion of your admin account &mdash; see <a href="#delete-account"
              className="text-emerald-700 dark:text-emerald-400 underline decoration-dotted underline-offset-2 hover:decoration-solid">
              &sect;8 below
            </a>.</li>
            <li>Revoke any permission at any time in iOS Settings or Android Settings &rarr; Apps &rarr; D&#x101;im&#x16B;n.</li>
          </ul>
        </Section>

        <Section title="8. Account and data deletion" delay={0.42} id="delete-account">
          <p className="mb-3">
            Most users of D&#x101;im&#x16B;n don&rsquo;t have an account &mdash; there&rsquo;s no sign-up
            for the consumer app. <strong>Uninstalling the App removes everything D&#x101;im&#x16B;n
            has stored locally</strong> (favorites, theme choice, cached masjid list, reminder
            configuration, location cache).
          </p>

          <h3 className="text-base font-medium mt-5 mb-2 text-gray-900 dark:text-white">
            For masjid administrators
          </h3>
          <p className="mb-3">
            If you signed in as a masjid admin, your email address and a hashed password live
            in our Supabase Auth backend. To request deletion of your admin account and any
            associated data:
          </p>
          <ol className="list-decimal pl-5 mb-3 space-y-1.5">
            <li>Email <a href="mailto:admin@TampaRamadan.com?subject=Daimun%20account%20deletion%20request"
              className="text-emerald-700 dark:text-emerald-400 underline decoration-dotted underline-offset-2 hover:decoration-solid">
              admin@TampaRamadan.com
            </a></li>
            <li>Subject line: <em>Daim&#x16B;n account deletion request</em></li>
            <li>Include the email address you signed in with so we can locate the account.</li>
          </ol>
          <p className="mb-3">
            We process requests within <strong>14 days</strong> and email confirmation when
            complete. Once deleted: your sign-in stops working, all admin scope is removed,
            and any time-correction reports linked to your account ID are anonymised.
          </p>

          <h3 className="text-base font-medium mt-5 mb-2 text-gray-900 dark:text-white">
            What we can&rsquo;t delete
          </h3>
          <p>
            Anonymous community reports (the &ldquo;Report inaccurate time&rdquo; submissions described
            in &sect;2b) carry no user identifier, so we can&rsquo;t connect them back to you to delete.
            They stay in our masjid-quality database.
          </p>
        </Section>

        <Section title="9. Changes to this policy" delay={0.45}>
          If we make material changes, we&rsquo;ll update the &ldquo;Last updated&rdquo; date above and
          (where appropriate) surface a notice in the App.
        </Section>

        <Section title="10. Contact" delay={0.5}>
          Questions? Reach us at <a href="mailto:admin@TampaRamadan.com"
            className="text-emerald-700 dark:text-emerald-400 underline decoration-dotted underline-offset-2 hover:decoration-solid">
            admin@TampaRamadan.com
          </a> or via <a href="https://github.com/abwasim2138/daimuniOS/issues"
            target="_blank" rel="noopener noreferrer"
            className="text-emerald-700 dark:text-emerald-400 underline decoration-dotted underline-offset-2 hover:decoration-solid">
            GitHub Issues
          </a>.
        </Section>

        <FadeUp delay={0.55}>
          <p className="mt-12 text-xs text-gray-400 dark:text-white/30 text-center">
            &copy; 2026 D&#x101;im&#x16B;n. This policy is also published in the iOS source repo at <code className="text-[10px]">PRIVACY_POLICY.md</code>.
          </p>
        </FadeUp>
      </div>
    </div>
  );
}

function Section({
  title, delay, children, id,
}: { title: string; delay: number; children: React.ReactNode; id?: string }) {
  return (
    <FadeUp delay={delay} className="mb-8" id={id}>
      <h2 className="text-xl font-medium tracking-tight text-gray-900 dark:text-white mb-3">
        {title}
      </h2>
      <div className="text-[15px] leading-relaxed text-gray-700 dark:text-white/75">
        {children}
      </div>
    </FadeUp>
  );
}
