import { ArrowLeft, Gift, Zap, Bug, Wrench, Newspaper } from 'lucide-react';
import { useLayoutEffect } from 'react';

interface WhatsNewPageProps {
  onBack: () => void;
}

type EntryType = 'feature' | 'improvement' | 'fix' | 'update';

interface ChangelogEntry {
  date: string;
  entries: {
    type: EntryType;
    text: string;
  }[];
}

const TYPE_CONFIG: Record<EntryType, { icon: typeof Gift; label: string; color: string; bg: string; dotColor: string }> = {
  feature: {
    icon: Gift,
    label: 'New',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/30',
    dotColor: 'bg-emerald-500 dark:bg-emerald-400',
  },
  improvement: {
    icon: Zap,
    label: 'Improved',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/30',
    dotColor: 'bg-blue-500 dark:bg-blue-400',
  },
  fix: {
    icon: Bug,
    label: 'Fixed',
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/30',
    dotColor: 'bg-red-500 dark:bg-red-400',
  },
  update: {
    icon: Wrench,
    label: 'Updated',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/30',
    dotColor: 'bg-amber-500 dark:bg-amber-400',
  },
};

// Order in which types are displayed
const TYPE_ORDER: EntryType[] = ['feature', 'improvement', 'fix', 'update'];

// ─── Add new entries at the top ────────────────────────────────────────────────
const CHANGELOG: ChangelogEntry[] = [
  {
    date: '2026-02-23',
    entries: [
      { type: 'improvement', text: 'Admin Dashboard restructured — community reports & requests now appear at the top for faster action' },
      { type: 'improvement', text: 'Timezone-aware analytics — tracking, summaries, and charts now use your local timezone instead of UTC' },
      { type: 'update', text: 'Removed tips section from Health Overview to keep focus on actionable items' },
    ],
  },
  {
    date: '2026-02-22',
    entries: [
      { type: 'feature', text: 'Masjid logo upload with drag-and-drop, automatic SVG tracing, and monochrome rendering' },
      { type: 'feature', text: 'Masjid Landing Pages — shareable standalone page for each masjid with iqama times, address, and quick actions' },
      { type: 'improvement', text: 'Logo uploader supports raster-to-SVG conversion with frosted overlay preview and three-state feedback' },
    ],
  },
  {
    date: '2026-02-20',
    entries: [
      { type: 'feature', text: 'Volunteers feature — public volunteer opportunities page and admin CRUD management' },
      { type: 'feature', text: 'City-level geo analytics — "Top Cities (7d)" card in the Analytics section powered by IP-to-city lookups' },
      { type: 'improvement', text: 'Khateeb directory now server-persisted with SMS invitation templates' },
    ],
  },
  {
    date: '2026-02-18',
    entries: [
      { type: 'feature', text: 'Atomic masjid request approve-and-convert flow in admin dashboard' },
      { type: 'improvement', text: 'Search bar moved inside the sticky header — no more gap between header and search' },
      { type: 'improvement', text: 'Schedule change reminders now only display the day before the change takes effect' },
      { type: 'fix', text: 'parseLocalDate() timezone fix for date handling across time zones' },
    ],
  },
  {
    date: '2026-02-16',
    entries: [
      { type: 'feature', text: 'Bug report form — report issues directly from the app' },
      { type: 'feature', text: 'What\'s New page — see the latest updates and fixes' },
      { type: 'feature', text: 'Bug report inbox in Admin Dashboard' },
      { type: 'fix', text: 'Time correction submissions now surface actual server errors' },
      { type: 'update', text: 'Ramadan decision tree uses short day names (Tue, Wed, Thu)' },
    ],
  },
  {
    date: '2026-02-15',
    entries: [
      { type: 'feature', text: 'Ramadan "When is Ramadan?" decision-tree card with moon sighting branches' },
      { type: 'feature', text: 'TV Display page now shows the same Ramadan decision tree' },
      { type: 'feature', text: 'Request Access flow replaces direct sign-up' },
      { type: 'improvement', text: 'Access requests stored in KV with admin management endpoints' },
    ],
  },
  {
    date: '2026-02-14',
    entries: [
      { type: 'feature', text: 'Masjid Etiquette page with guidelines for visitors' },
      { type: 'feature', text: 'Marketing / Share page for community outreach' },
      { type: 'improvement', text: 'Printable timetable generation for masajid' },
    ],
  },
  {
    date: '2026-02-13',
    entries: [
      { type: 'feature', text: 'Push notification support with prayer time reminders' },
      { type: 'feature', text: 'Sunnah fasting reminders (Mon/Thu, Ayyam al-Bidh)' },
      { type: 'feature', text: 'Tahajjud time card with last-third calculation' },
      { type: 'improvement', text: 'Time-aware ambient theming with parallax background' },
    ],
  },
  {
    date: '2026-02-12',
    entries: [
      { type: 'feature', text: 'Qibla Compass with device orientation support' },
      { type: 'feature', text: 'Janaza alerts with masjid-linked notifications' },
      { type: 'feature', text: 'Admin Dashboard with 18-analyzer suggestions engine' },
      { type: 'improvement', text: 'Khateeb directory in admin panel (localStorage)' },
    ],
  },
  {
    date: '2026-02-11',
    entries: [
      { type: 'feature', text: 'TV Display mode for masjid lobby screens' },
      { type: 'feature', text: 'Jumuah silence overlay during khutbah window' },
      { type: 'feature', text: 'Community time correction reporting (Flag button)' },
      { type: 'improvement', text: 'Correction inbox for admins with accept/dismiss workflow' },
    ],
  },
  {
    date: '2026-02-10',
    entries: [
      { type: 'feature', text: 'Ramadan Mode with iftar/suhoor countdowns' },
      { type: 'feature', text: 'Ramadan program info (taraweeh, iftar, i\'tikaf)' },
      { type: 'feature', text: 'Scheduled time changes with date ranges' },
      { type: 'improvement', text: 'Cross-masjid iqama time comparison table' },
    ],
  },
  {
    date: '2026-02-09',
    entries: [
      { type: 'feature', text: 'Initial launch — real-time iqama times for masajid' },
      { type: 'feature', text: 'Location-based sorting with distance display' },
      { type: 'feature', text: 'Favorites system with localStorage persistence' },
      { type: 'feature', text: 'Dark mode with system preference detection' },
      { type: 'feature', text: 'Adhan time calculations (ISNA, MWL, Egyptian methods)' },
    ],
  },
];

/** Group entries by type within a single day, returning them in TYPE_ORDER */
function groupByType(entries: ChangelogEntry['entries']) {
  const grouped = new Map<EntryType, string[]>();
  for (const entry of entries) {
    if (!grouped.has(entry.type)) {
      grouped.set(entry.type, []);
    }
    grouped.get(entry.type)!.push(entry.text);
  }
  // Return in canonical order
  return TYPE_ORDER
    .filter(type => grouped.has(type))
    .map(type => ({ type, texts: grouped.get(type)! }));
}

export function WhatsNewPage({ onBack }: WhatsNewPageProps) {
  // Scroll to top on mount (fixes opening from footer showing page at bottom)
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  // Mark as seen
  if (typeof window !== 'undefined') {
    localStorage.setItem('daimun-whats-new-seen', CHANGELOG[0]?.date || '');
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a]">
      {/* Header */}
      <div className="bg-white/80 dark:bg-black/80 border-b border-gray-200/50 dark:border-white/[0.06] sticky top-0 z-30 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-xl transition-colors active:scale-95"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-white/60" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-amber-50 dark:bg-amber-500/10 rounded-lg">
              <Newspaper className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <h1 className="text-gray-900 dark:text-white font-medium">What's New</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="space-y-5">
          {CHANGELOG.map((group, groupIdx) => {
            const dateObj = new Date(group.date + 'T12:00:00');
            const formattedDate = dateObj.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            });
            const grouped = groupByType(group.entries);

            return (
              <div key={group.date}>
                {/* Date header */}
                <div className="flex items-center gap-3 mb-2.5">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    groupIdx === 0
                      ? 'bg-emerald-500 dark:bg-emerald-400'
                      : 'bg-gray-300 dark:bg-white/20'
                  }`} />
                  <h2 className={`text-sm font-medium ${
                    groupIdx === 0
                      ? 'text-gray-900 dark:text-white'
                      : 'text-gray-500 dark:text-white/50'
                  }`}>
                    {formattedDate}
                    {groupIdx === 0 && (
                      <span className="ml-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full">
                        Latest
                      </span>
                    )}
                  </h2>
                </div>

                {/* Grouped entries — one line per type */}
                <div className="ml-[18px] border-l-2 border-gray-200 dark:border-white/[0.08] pl-4 space-y-2 pb-1">
                  {grouped.map(({ type, texts }) => {
                    const config = TYPE_CONFIG[type];
                    const Icon = config.icon;

                    return (
                      <div key={type} className="flex items-start gap-2.5 py-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full border flex-shrink-0 mt-px ${config.bg} ${config.color}`}>
                          <Icon className="w-3 h-3" />
                          {config.label}
                        </span>
                        <span className="text-sm text-gray-700 dark:text-white/70 leading-relaxed">
                          {texts.join(' · ')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom note */}
        <div className="mt-10 text-center pb-10">
          <p className="text-[12px] text-gray-400 dark:text-white/25">
            Daimun is continuously improving.
          </p>
          <p className="text-[12px] text-gray-400 dark:text-white/25 mt-1">
            Have a feature request? Use the bug report form to let us know.
          </p>
        </div>
      </div>
    </div>
  );
}

/** Check if there are unseen updates */
export function hasUnseenUpdates(): boolean {
  if (typeof window === 'undefined') return false;
  const lastSeen = localStorage.getItem('daimun-whats-new-seen') || '';
  const latestDate = CHANGELOG[0]?.date || '';
  return latestDate > lastSeen;
}