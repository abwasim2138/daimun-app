import { useEffect } from 'react';
import { navigate } from '../utils/router';
import { APP_STORE_URL } from './AppStoreBadge';

function isIOS(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isAndroid(): boolean {
  return /Android/i.test(navigator.userAgent);
}

/**
 * Universal "get the app" link — QR codes and share links point here so one
 * code works for any device. iOS goes straight to the App Store; Android
 * goes to the beta signup (no production Play listing yet); anything else
 * (a QR scanned from a desktop camera, etc.) falls back to the homepage.
 */
export function GetAppRedirect() {
  useEffect(() => {
    if (isIOS()) {
      window.location.replace(APP_STORE_URL);
    } else if (isAndroid()) {
      navigate('/android', true);
    } else {
      navigate('/', true);
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0A0A0A]">
      <div className="text-gray-400 dark:text-white/30 text-sm">Redirecting…</div>
    </div>
  );
}
