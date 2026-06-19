import { useState, useEffect } from 'react';
import { X, Smartphone, Users } from 'lucide-react';
import { navigate } from '../utils/router';
import { AppStoreBadge } from './AppStoreBadge';
import { API_URL } from '../utils/api';
import { publicAnonKey } from '../utils/supabase/info';

const DISMISSED_KEY = 'daimun-get-app-banner-dismissed';
// Google Play requires 12 testers opted in for 14 continuous days
// before a new app can be promoted to production.
const TESTER_GOAL = 12;

export function GetTheAppBanner() {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISSED_KEY) === '1'; } catch { return false; }
  });
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (dismissed) return;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/early-access/count`, {
          headers: {
            'apikey': publicAnonKey,
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        });
        const data = await res.json();
        if (typeof data.total === 'number') setCount(data.total);
      } catch (err) {
        console.error('Failed to fetch tester count for banner:', err);
      }
    })();
  }, [dismissed]);

  if (dismissed) return null;

  const pct = count !== null ? Math.min((count / TESTER_GOAL) * 100, 100) : 0;
  const reached = count !== null && count >= TESTER_GOAL;

  return (
    <div className="mb-4 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-gray-200/70 dark:border-white/[0.09] overflow-hidden shadow-sm">
      <div className="px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* iOS — official Apple badge, per Apple marketing guidelines */}
          <AppStoreBadge />

          {/* Android — ghost style */}
          <button
            onClick={() => navigate('/android')}
            className="h-[40px] flex items-center gap-1.5 px-3 border border-emerald-400/60 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-medium hover:border-emerald-500 dark:hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 active:scale-[0.98] transition-all"
          >
            <Smartphone className="w-3.5 h-3.5" />
            Join Android Beta
          </button>
        </div>

        <button
          onClick={() => {
            setDismissed(true);
            try { localStorage.setItem(DISMISSED_KEY, '1'); } catch {}
          }}
          className="-mr-1 p-1.5 rounded-lg text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60 hover:bg-gray-100 dark:hover:bg-white/[0.07] transition-colors flex-shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Android tester progress — encourages QA signups */}
      {count !== null && !reached && (
        <button
          onClick={() => navigate('/android')}
          className="w-full text-left px-4 pb-3 -mt-0.5"
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Users className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs text-gray-600 dark:text-white/55">
                {count} of {TESTER_GOAL} Android testers — help us launch
              </span>
            </div>
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              {Math.round(pct)}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-100 dark:bg-white/[0.07] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
        </button>
      )}
    </div>
  );
}
