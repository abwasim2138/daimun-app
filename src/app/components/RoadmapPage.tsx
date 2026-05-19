import { useState } from 'react';
import {
  ArrowLeft,
  Globe,
  Smartphone,
  Bell,
  Users,
  Shield,
  ChevronDown,
  ChevronUp,
  Clock,
  Tv,
  Palette,
  MessageSquarePlus,
  Sun,
  Calendar,
  Target,
  Send,
  Settings,
  CalendarCheck,
  RefreshCw,
  Heart,
  Award,
  Megaphone,
  FileText,
  Building2,
  Bot,
  Copy,
  Radio,
  Accessibility,
  Languages,
  Mic,
  BarChart3,
  Type,
  Contrast,
  Volume2,
} from 'lucide-react';

interface RoadmapPageProps {
  onBack: () => void;
  onOpenFeedback?: () => void;
}

type Status = 'in-progress' | 'planned' | 'exploring';

interface RoadmapItem {
  title: string;
  status: Status;
  icon?: React.ElementType;
}

interface RoadmapGroup {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  accent: string;
  items: RoadmapItem[];
}

const STATUS_CONFIG: Record<Status, { label: string; dot: string; badge: string }> = {
  'in-progress': {
    label: 'In Progress',
    dot: 'bg-blue-500 animate-pulse',
    badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/40',
  },
  planned: {
    label: 'Planned',
    dot: 'bg-amber-400',
    badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/40',
  },
  exploring: {
    label: 'Exploring',
    dot: 'bg-purple-400',
    badge: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800/40',
  },
};

const GROUPS: RoadmapGroup[] = [
  {
    id: 'in-app',
    label: 'In-App Features',
    icon: Smartphone,
    color: 'text-emerald-600 dark:text-emerald-400',
    accent: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/40',
    items: [
      { title: 'WhatsApp Copy/Paste Current Times', status: 'planned', icon: Copy },
      { title: 'Duha Calculation & Suggestions', status: 'planned', icon: Sun },
      { title: 'Events Calendar', status: 'planned', icon: Calendar },
      { title: 'Android TV App', status: 'in-progress', icon: Tv },
      { title: 'Native iOS App', status: 'exploring', icon: Smartphone },
      { title: 'Native Android App', status: 'exploring', icon: Smartphone },
      { title: 'Apple Watch App', status: 'exploring', icon: Clock },
      { title: 'Goal Setting (Fajr & Isha)', status: 'planned', icon: Target },
      { title: 'WhatsApp API Auto-Posting', status: 'planned', icon: Send },
      { title: 'AI Chat Admin System', status: 'in-progress', icon: Bot },
      { title: 'Admin Notification System', status: 'planned', icon: Bell },
      { title: 'Focus Mode Deep-Linking', status: 'exploring', icon: Settings },
      { title: 'Live Streaming (Talks & Ḥalaqas)', status: 'exploring', icon: Radio },
      { title: 'Volunteer Sign-Up System', status: 'planned', icon: Users },
      { title: 'Event Sign-Up System', status: 'planned', icon: CalendarCheck },
      { title: 'Recurring Program Sign-Up', status: 'planned', icon: RefreshCw },
      { title: 'Project-Based Giving', status: 'planned', icon: Heart },
      { title: 'Workshop Sponsoring', status: 'planned', icon: Award },
      { title: 'Community Polling', status: 'exploring', icon: BarChart3 },
    ],
  },
  {
    id: 'accessibility',
    label: 'Accessibility',
    icon: Accessibility,
    color: 'text-violet-600 dark:text-violet-400',
    accent: 'bg-violet-50 dark:bg-violet-950/30 border-violet-100 dark:border-violet-900/40',
    items: [
      { title: 'VoiceOver & TalkBack Support', status: 'planned', icon: Volume2 },
      { title: 'High Contrast Mode', status: 'planned', icon: Contrast },
      { title: 'Dynamic Text Scaling', status: 'planned', icon: Type },
      { title: 'Reduce Motion Option', status: 'planned', icon: Settings },
    ],
  },
  {
    id: 'languages',
    label: 'Multi-Language Support',
    icon: Languages,
    color: 'text-orange-600 dark:text-orange-400',
    accent: 'bg-orange-50 dark:bg-orange-950/30 border-orange-100 dark:border-orange-900/40',
    items: [
      { title: 'Arabic', status: 'planned', icon: Languages },
      { title: 'Urdu', status: 'planned', icon: Languages },
      { title: 'Bengali', status: 'exploring', icon: Languages },
      { title: 'Spanish', status: 'exploring', icon: Languages },
    ],
  },
  {
    id: 'integrations',
    label: 'Voice & Integrations',
    icon: Mic,
    color: 'text-rose-600 dark:text-rose-400',
    accent: 'bg-rose-50 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/40',
    items: [
      { title: 'Alexa Skill', status: 'exploring', icon: Mic },
      { title: 'Google Assistant Action', status: 'exploring', icon: Mic },
    ],
  },
  {
    id: 'outside-app',
    label: 'Outside the App',
    icon: Globe,
    color: 'text-sky-600 dark:text-sky-400',
    accent: 'bg-sky-50 dark:bg-sky-950/30 border-sky-100 dark:border-sky-900/40',
    items: [
      { title: 'Ambassador Program', status: 'planned', icon: Megaphone },
      { title: 'Two-Tier Admin Model (L1 & L2)', status: 'planned', icon: Shield },
      { title: 'Masjid Design Service', status: 'planned', icon: Palette },
      { title: 'Jama\'ah Establishment Service', status: 'planned', icon: Building2 },
      { title: 'R&D Audits & Research Papers', status: 'exploring', icon: FileText },
    ],
  },
];

const ALL_STATUSES: Status[] = ['in-progress', 'planned', 'exploring'];

function StatusBadge({ status }: { status: Status }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function RoadmapItemCard({ item }: { item: RoadmapItem }) {
  const Icon = item.icon;
  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 dark:border-white/[0.06] last:border-0">
      {Icon && (
        <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center flex-shrink-0">
          <Icon className="w-3.5 h-3.5 text-gray-500 dark:text-white/50" />
        </div>
      )}
      <span className="flex-1 text-sm text-gray-900 dark:text-white/90">{item.title}</span>
    </div>
  );
}

function GroupSection({ group, filterStatus }: { group: RoadmapGroup; filterStatus: Status | 'all' }) {
  const [open, setOpen] = useState(true);
  const Icon = group.icon;
  const visibleItems = filterStatus === 'all' ? group.items : group.items.filter(i => i.status === filterStatus);

  if (visibleItems.length === 0) return null;

  return (
    <section className={`rounded-2xl border ${group.accent} overflow-hidden`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
        aria-expanded={open}
      >
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${group.accent}`}>
          <Icon className={`w-4 h-4 ${group.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm text-gray-900 dark:text-white/90">{group.label}</span>
          <span className="ml-2 text-xs text-gray-400 dark:text-white/30">
            {visibleItems.length} item{visibleItems.length !== 1 ? 's' : ''}
          </span>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-gray-400 dark:text-white/30 flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-gray-400 dark:text-white/30 flex-shrink-0" />
        }
      </button>

      {open && (
        <div className="px-4 pb-2 bg-white/60 dark:bg-black/20">
          {visibleItems.map((item, i) => (
            <RoadmapItemCard key={i} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}

export function RoadmapPage({ onBack, onOpenFeedback }: RoadmapPageProps) {
  const totalItems = GROUPS.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0A0A0A]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-black/60 backdrop-blur-xl border-b border-gray-200/60 dark:border-white/[0.06]">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/[0.08] transition-colors -ml-1"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-white/60" />
          </button>
          <h1 className="flex-1 text-sm text-gray-900 dark:text-white/90 truncate">Dāimūn Roadmap</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pb-16 pt-6 space-y-5">

        {/* Hero */}
        <div className="relative rounded-2xl bg-gradient-to-br from-black via-[#04110E] to-[#031918] overflow-hidden ring-1 ring-white/5">
          <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-teal-400/10 blur-3xl pointer-events-none" />
          <div className="relative p-6">
            <p className="text-[10px] tracking-[0.2em] uppercase text-emerald-300 mb-3">
              Dāimūn · The Next Era
            </p>
            <h2 className="text-2xl text-white leading-tight mb-1">
              The digital <span className="text-emerald-300">catalyst</span><br />
              for good deeds.
            </h2>
            <div className="mt-3 space-y-1.5">
              <p className="text-sm text-white/85 leading-relaxed">
                Establishing Salah, nurturing generosity, mobilizing volunteers, and gathering communities — across every device, language, and major city in the US.
              </p>
              <p className="text-sm text-white/65 leading-relaxed">
                We're building the operating system for good deeds: every tap, every reminder, every gathering — engineered to multiply the ḥasanāt of the ummah.
              </p>
            </div>
            <div className="mt-5 border-t border-white/10 pt-4">
              <p className="text-xs text-white/50">{totalItems} initiatives across {GROUPS.length} frontiers</p>
            </div>
          </div>
        </div>

        {/* Groups */}
        <div className="space-y-3">
          {GROUPS.map(group => (
            <GroupSection key={group.id} group={group} filterStatus="all" />
          ))}
        </div>

        {/* Footer note */}
        <div className="text-center text-xs text-gray-400 dark:text-white/25 px-4 space-y-3 pt-2">
          <p>Roadmap reflects current thinking and is subject to change.</p>
          {onOpenFeedback && (
            <button
              onClick={onOpenFeedback}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-gray-200 dark:border-white/10 text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/60 hover:border-gray-300 dark:hover:border-white/20 transition-colors"
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
              Suggest a feature
            </button>
          )}
        </div>
      </main>
    </div>
  );
}