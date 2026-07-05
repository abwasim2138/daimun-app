import { Smartphone } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { AppStoreBadge } from './AppStoreBadge';
import { navigate } from '../utils/router';
import { SITE_URL } from '../utils/api';

interface GetAppPanelProps {
  /** Hide the QR/scan row below `lg` — pointless to scan your own screen on mobile. */
  qrOnlyOnDesktop?: boolean;
  className?: string;
}

/**
 * Shared "get the app" card — store badge, Android beta button, and a QR
 * code that opens /get-app on whatever device scans it. Used both in the
 * desktop hero and as the mobile/footer download row so the pitch looks the
 * same everywhere instead of two different ad-hoc button rows.
 */
export function GetAppPanel({ qrOnlyOnDesktop = false, className = '' }: GetAppPanelProps) {
  return (
    <div className={`relative rounded-2xl bg-white/70 dark:bg-white/[0.05] backdrop-blur-xl border border-gray-200/70 dark:border-white/10 p-5 shadow-sm dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] ${className}`}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 dark:via-white/25 to-transparent rounded-t-2xl" aria-hidden="true" />

      <p className="text-[11px] uppercase tracking-wider mb-3 text-gray-400 dark:text-white/35">Get the app</p>
      <div className="flex items-center gap-3 flex-wrap">
        <AppStoreBadge />
        <button
          onClick={() => navigate('/android')}
          className="h-[40px] flex items-center gap-1.5 px-4 border border-emerald-500/50 dark:border-emerald-400/50 text-emerald-700 dark:text-emerald-300 rounded-lg text-sm font-medium hover:border-emerald-600 dark:hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 active:scale-[0.98] transition-all"
        >
          <Smartphone className="w-4 h-4" />
          Join Android Beta
        </button>
      </div>

      <div className={qrOnlyOnDesktop ? 'hidden lg:block lg:mt-4' : 'mt-4'}>
        <div className="h-px mb-4 bg-gray-200 dark:bg-white/10" aria-hidden="true" />
        <div className="flex items-center gap-3">
          <div className="bg-white p-2 rounded-lg flex-shrink-0 border border-gray-200 dark:border-transparent">
            <QRCodeSVG value={`${SITE_URL}/get-app`} size={52} level="M" bgColor="#ffffff" fgColor="#0b0f1a" />
          </div>
          <span className="text-xs leading-snug text-gray-500 dark:text-white/40">
            Scan with your phone<br />to open &amp; install
          </span>
        </div>
      </div>
    </div>
  );
}
