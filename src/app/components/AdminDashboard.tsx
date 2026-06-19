import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Edit2, AlertTriangle, AlertCircle, Info, Clock, 
  CheckCircle, RefreshCw, ChevronRight, TrendingUp, Calendar,
  Zap, X, MapPin, Bell, Inbox, Plus, Loader,
  EyeOff, Eye, ChevronDown, Phone, Trash2, UserPlus, Mic,
  Moon, Utensils, Star, BookOpen, DoorClosed, Rows3, Mail, Building2,
  Search, MessageSquare, LogOut, Megaphone, Check, ShieldCheck, Users, Pencil, ShieldOff,
  KeyRound, Share2, Smartphone
} from 'lucide-react';
import { toHijri } from 'hijri-converter';
import { Mosque } from '../App';
import { calculateIqamaTimes, getNextPrayer } from '../utils/iqamaCalculator';
import { timeToMinutes } from '../utils/prayerTimes';
import { generateAdminSuggestions, getSuggestionSummary, AdminSuggestion } from '../utils/adminSuggestions';
import { getMosqueStabilityScore, MosqueStabilityScore } from '../utils/adminSuggestions';
import { CorrectionInbox } from './CorrectionInbox';
import { BugReportInbox } from './BugReportInbox';
import { useAuth } from './AuthContext';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { API_URL, SITE_URL } from '../utils/api';
import { motion } from 'motion/react';
import { AnalyticsSection } from './AnalyticsSection';
import { VolunteerAdminSection } from './VolunteerAdminSection';
import { CharityAdminSection } from './CharityAdminSection';
import { MasjidScopeDropdown } from './MasjidScopeDropdown';
import { AdminHelpChat } from './AdminHelpChat';

interface AdminDashboardProps {
  mosques: Mosque[];
  isLoading?: boolean;
  onBack: () => void;
  onEditMosque: (mosque: Mosque) => void;
  onAddMosque: () => void;
  onAddJanaza: () => void;
  onViewRequests: () => void;
  onRefresh: () => Promise<void>;
  onLogout?: () => void;
}

function SeverityIcon({ severity }: { severity: 'urgent' | 'warning' | 'info' }) {
  switch (severity) {
    case 'urgent':
      return <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0" />;
    case 'warning':
      return <AlertCircle className="w-4 h-4 text-amber-500 dark:text-amber-400 flex-shrink-0" />;
    case 'info':
      return <Info className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />;
  }
}

function SeverityBadge({ severity }: { severity: 'urgent' | 'warning' | 'info' }) {
  const styles = {
    urgent: 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900/40',
    warning: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/40',
    info: 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/40',
  };
  const labels = { urgent: 'Urgent', warning: 'Attention', info: 'Tip' };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full border ${styles[severity]}`}>
      {labels[severity]}
    </span>
  );
}

function MosqueQuickCard({ 
  mosque, 
  suggestions,
  stabilityScore,
  onEdit,
  onHide,
  onToggleUserVisibility,
  isTogglingVisibility,
  isFirst
}: { 
  mosque: Mosque;
  suggestions: AdminSuggestion[];
  stabilityScore: MosqueStabilityScore;
  onEdit: () => void;
  onHide: () => void;
  onToggleUserVisibility: () => void;
  isTogglingVisibility?: boolean;
  isFirst?: boolean;
}) {
  const [shareLabel, setShareLabel] = useState('Share');
  const now = new Date();
  const calculated = calculateIqamaTimes(
    mosque.latitude, mosque.longitude, mosque.iqamaTimes, now,
    mosque.calculationMethod || 'NorthAmerica',
    mosque.asrMethod || 'Standard',
    mosque.scheduledTimeChanges
  );
  const nextPrayer = getNextPrayer(calculated, mosque.offeredPrayers);

  // Check if it's Ramadan
  const hijri = toHijri(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const isRamadan = hijri.hm === 9;
  const rp = mosque.ramadanProgram;
  const hasRamadanProgram = rp && (rp.tarawih || rp.iftarProvided || rp.itikaf || rp.qiyam || rp.khatmQuran);

  // Get update freshness
  const localTs = typeof window !== 'undefined' ? localStorage.getItem(`mosque-updated:${mosque.id}`) : null;
  const updatedAtStr = mosque.updatedAt || localTs;
  let freshnessLabel = 'Never updated';
  let freshnessColor = 'text-gray-400 dark:text-white/30';
  
  if (updatedAtStr) {
    const diffHours = (Date.now() - new Date(updatedAtStr).getTime()) / (1000 * 60 * 60);
    if (diffHours < 1) {
      freshnessLabel = 'Just updated';
      freshnessColor = 'text-emerald-600 dark:text-emerald-400';
    } else if (diffHours < 24) {
      freshnessLabel = `${Math.floor(diffHours)}h ago`;
      freshnessColor = 'text-emerald-600 dark:text-emerald-400';
    } else if (diffHours < 168) {
      freshnessLabel = `${Math.floor(diffHours / 24)}d ago`;
      freshnessColor = 'text-gray-500 dark:text-white/50';
    } else {
      freshnessLabel = `${Math.floor(diffHours / 168)}w ago`;
      freshnessColor = 'text-amber-500 dark:text-amber-400';
    }
  }

  const mosqueUrgent = suggestions.filter(s => s.severity === 'urgent').length;
  const mosqueWarning = suggestions.filter(s => s.severity === 'warning').length;

  return (
    <div {...(isFirst ? { 'data-onboard': 'masjid-card' } : {})} className={`bg-white dark:bg-[#1C1C1C] border rounded-2xl overflow-hidden ${mosque.temporarilyHidden ? 'border-orange-300 dark:border-orange-700/40' : 'border-gray-200 dark:border-white/[0.1]'}`}>
      {/* Temporarily Hidden from Users Banner */}
      {mosque.temporarilyHidden && (
        <div className="bg-orange-50 dark:bg-orange-950/20 border-b border-orange-200 dark:border-orange-800/30 px-4 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <EyeOff className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
            <span className="text-[12px] font-medium text-orange-600 dark:text-orange-400">Hidden from users</span>
          </div>
          <button
            onClick={onToggleUserVisibility}
            disabled={isTogglingVisibility}
            className="text-[12px] font-medium text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 underline underline-offset-2 transition-colors disabled:opacity-50"
          >
            {isTogglingVisibility ? 'Restoring…' : 'Make visible'}
          </button>
        </div>
      )}
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 dark:text-white truncate">{mosque.name}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Clock className="w-3 h-3 text-gray-400 dark:text-white/30" />
              <span className={`text-[12px] ${freshnessColor}`}>{freshnessLabel}</span>
              <span className="text-gray-200 dark:text-white/10">·</span>
              <div className="flex items-center gap-1">
                <div className={`w-1.5 h-1.5 rounded-full ${
                  stabilityScore.overall >= 90 ? 'bg-emerald-500 dark:bg-emerald-400' :
                  stabilityScore.overall >= 75 ? 'bg-blue-500 dark:bg-blue-400' :
                  stabilityScore.overall >= 55 ? 'bg-amber-500 dark:bg-amber-400' :
                  stabilityScore.overall >= 35 ? 'bg-orange-500 dark:bg-orange-400' :
                  'bg-red-500 dark:bg-red-400'
                }`} />
                <span className={`text-[11px] ${stabilityScore.color}`}>{stabilityScore.label}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {mosqueUrgent > 0 && (
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-100 dark:bg-red-950/40 text-[11px] font-medium text-red-600 dark:text-red-400">
                {mosqueUrgent}
              </span>
            )}
            {mosqueWarning > 0 && (
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                {mosqueWarning}
              </span>
            )}
            <button
              onClick={onEdit}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-lg transition-colors active:scale-95"
              aria-label="Edit mosque"
            >
              <Edit2 className="w-4 h-4 text-gray-500 dark:text-white/50" />
            </button>
            <button
              onClick={onHide}
              {...(isFirst ? { 'data-onboard': 'hide-btn' } : {})}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-lg transition-colors active:scale-95"
              aria-label="Hide mosque"
            >
              <EyeOff className="w-4 h-4 text-gray-500 dark:text-white/50" />
            </button>
          </div>
        </div>
      </div>

      {/* Compact prayer times grid */}
      <div className="px-4 pb-3">
        <div className="grid grid-cols-5 gap-1">
          {(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const).map(prayer => {
            const isOffered = !mosque.offeredPrayers || mosque.offeredPrayers.length === 0 || mosque.offeredPrayers.includes(prayer);
            const isNext = isOffered && nextPrayer.name.toLowerCase() === prayer;
            return (
              <div 
                key={prayer} 
                className={`text-center py-1.5 px-1 rounded-lg ${
                  isNext 
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/30' 
                    : 'bg-gray-50 dark:bg-white/[0.03]'
                }`}
              >
                <div className={`text-[10px] uppercase tracking-wider ${
                  isNext ? 'text-emerald-600 dark:text-emerald-400' : isOffered ? 'text-gray-400 dark:text-white/30' : 'text-gray-300 dark:text-white/15'
                }`}>
                  {prayer === 'maghrib' ? 'Mgrb' : prayer.charAt(0).toUpperCase() + prayer.slice(1)}
                </div>
                <div className={`text-[12px] mt-0.5 ${
                  isNext ? 'text-emerald-700 dark:text-emerald-300 font-medium' : isOffered ? 'text-gray-700 dark:text-white/70' : 'text-gray-300 dark:text-white/15'
                }`}>
                  {isOffered ? calculated[prayer].iqama : '—'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ramadan Program Status — show whenever program data exists */}
      {(hasRamadanProgram || isRamadan) && (
        <div className="px-4 pb-3">
          {hasRamadanProgram && rp ? (
            <div className="bg-purple-50/80 dark:bg-purple-950/20 border border-purple-200/50 dark:border-purple-800/20 rounded-xl p-2.5">
              <div className="flex items-center gap-1.5 mb-2">
                <Moon className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                <span className="text-[10px] uppercase tracking-widest text-purple-600/80 dark:text-purple-400/60 font-medium">Ramadan Program</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {rp.tarawih && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-purple-700 dark:text-purple-300 bg-purple-100/80 dark:bg-purple-800/25 px-2 py-0.5 rounded-full">
                    <Rows3 className="w-2.5 h-2.5" />
                    Tarawih{rp.tarawihRakat ? ` ${rp.tarawihRakat}R` : ''}{rp.tarawihTime ? ` · ${rp.tarawihTime}` : ''}
                  </span>
                )}
                {rp.iftarProvided && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-800/25 px-2 py-0.5 rounded-full">
                    <Utensils className="w-2.5 h-2.5" />
                    Iftar{rp.iftarEveryNight ? ' nightly' : ''}
                  </span>
                )}
                {rp.qiyam && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-indigo-700 dark:text-indigo-300 bg-indigo-100/80 dark:bg-indigo-800/25 px-2 py-0.5 rounded-full">
                    <Star className="w-2.5 h-2.5" />
                    Qiyam{rp.qiyamTime ? ` ${rp.qiyamTime}` : ''}
                  </span>
                )}
                {rp.itikaf && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-teal-700 dark:text-teal-300 bg-teal-100/80 dark:bg-teal-800/25 px-2 py-0.5 rounded-full">
                    <DoorClosed className="w-2.5 h-2.5" />
                    I'tikaf
                  </span>
                )}
                {rp.khatmQuran && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-800/25 px-2 py-0.5 rounded-full">
                    <BookOpen className="w-2.5 h-2.5" />
                    Khatm
                  </span>
                )}
              </div>
            </div>
          ) : (
            <button
              onClick={onEdit}
              className="w-full flex items-center gap-2.5 bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/20 rounded-xl p-2.5 hover:bg-amber-100/80 dark:hover:bg-amber-950/30 transition-colors active:scale-[0.98]"
            >
              <div className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-800/30 flex items-center justify-center flex-shrink-0">
                <Moon className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="text-[12px] font-medium text-amber-800 dark:text-amber-300">Configure Ramadan program</div>
                <div className="text-[11px] text-amber-600/70 dark:text-amber-400/50">Add tarawih, iftar & more for your community</div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-amber-400 dark:text-amber-500/50 flex-shrink-0" />
            </button>
          )}
        </div>
      )}

      {/* Quick action row */}
      <div className="border-t border-gray-100 dark:border-white/[0.06] flex">
        <button
          onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-2 py-3 text-sm text-gray-600 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors active:scale-[0.98]"
        >
          <Edit2 className="w-3.5 h-3.5" />
          <span>Edit Times</span>
        </button>
        <div className="w-px bg-gray-100 dark:bg-white/[0.06]" />
        <button
          onClick={onToggleUserVisibility}
          disabled={isTogglingVisibility}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm transition-colors active:scale-[0.98] disabled:opacity-50 ${
            mosque.temporarilyHidden
              ? 'text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/10'
              : 'text-gray-600 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/[0.04]'
          }`}
        >
          {isTogglingVisibility ? (
            <Loader className="w-3.5 h-3.5 animate-spin" />
          ) : mosque.temporarilyHidden ? (
            <Eye className="w-3.5 h-3.5" />
          ) : (
            <EyeOff className="w-3.5 h-3.5" />
          )}
          <span>{isTogglingVisibility ? 'Saving…' : mosque.temporarilyHidden ? 'Show to Users' : 'Hide from Users'}</span>
        </button>
        <div className="w-px bg-gray-100 dark:bg-white/[0.06]" />
        <button
          onClick={() => {
            const url = `${SITE_URL}?masjid=${mosque.id}`;
            if (navigator.share) {
              navigator.share({ title: mosque.name, text: `${mosque.name} — Iqama Times`, url }).catch(() => {});
            } else {
              navigator.clipboard.writeText(url);
              setShareLabel('Copied!');
              setTimeout(() => setShareLabel('Share'), 1500);
            }
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm transition-colors active:scale-[0.98] ${
            shareLabel === 'Copied!'
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-gray-600 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/[0.04]'
          }`}
        >
          {shareLabel === 'Copied!' ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Share2 className="w-3.5 h-3.5" />
          )}
          <span>{shareLabel}</span>
        </button>
      </div>
    </div>
  );
}

// --- Khateeb Directory Types & Helpers ---

interface Khateeb {
  id: string;
  name: string;
  phone: string;
  notes: string;
}

function loadKhateebsFromCache(): Khateeb[] {
  try {
    const stored = localStorage.getItem('community-khateebs');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function cacheKhateebs(khateebs: Khateeb[]) {
  localStorage.setItem('community-khateebs', JSON.stringify(khateebs));
}

function formatPhoneForDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits[0] === '1') {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

/** Build an sms: URI with a pre-filled Jumuah khutbah invitation template */
function buildKhateebSmsUri(phone: string, name: string): string {
  const digits = phone.replace(/\D/g, '');
  const firstName = name.split(' ')[0];
  const nextFriday = new Date();
  nextFriday.setDate(nextFriday.getDate() + ((5 - nextFriday.getDay() + 7) % 7 || 7));
  const fridayStr = nextFriday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const body = `Assalamu Alaykum ${firstName}, I hope you're doing well. Would you be available to give the khutbah this Friday (${fridayStr})? JazakAllahu Khairan.`;
  // Use ?&body= for cross-platform compat (iOS uses &body, Android uses ?body)
  return `sms:${digits}?&body=${encodeURIComponent(body)}`;
}

function EarlyAccessSection() {
  const { accessToken } = useAuth();
  const [list, setList] = useState<{ email: string; signedUpAt: string }[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const load = async () => {
    if (list !== null) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/early-access`, {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'apikey': publicAnonKey },
      });
      const data = await res.json();
      setList(data.list || []);
    } catch {
      setList([]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggle = () => {
    if (!expanded) load();
    setExpanded(p => !p);
  };

  return (
    <div className="bg-white dark:bg-[#1C1C1C] rounded-2xl border border-gray-200 dark:border-white/[0.1] overflow-hidden">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-50 dark:bg-green-950/30 rounded-xl flex-shrink-0">
            <Smartphone className="w-4 h-4 text-green-600 dark:text-green-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-gray-900 dark:text-white">Android Early Access</p>
            <p className="text-xs text-gray-500 dark:text-white/40">
              {list !== null ? `${list.length} sign-up${list.length !== 1 ? 's' : ''}` : 'Beta testers waitlist'}
            </p>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 dark:text-white/30 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="border-t border-gray-100 dark:border-white/[0.06] px-4 py-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader className="w-4 h-4 animate-spin text-gray-400 dark:text-white/30" />
            </div>
          ) : list && list.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-white/40 text-center py-4">No sign-ups yet.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(list || []).map((item) => (
                <div key={item.email} className="flex items-center justify-between py-1.5 border-b border-gray-50 dark:border-white/[0.04] last:border-0">
                  <span className="text-sm text-gray-800 dark:text-white/80 font-mono">{item.email}</span>
                  <span className="text-xs text-gray-400 dark:text-white/30 ml-3 flex-shrink-0">
                    {new Date(item.signedUpAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/[0.06]">
            <button
              onClick={() => { setList(null); load(); }}
              className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/60 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function KhateebSection() {
  const { accessToken } = useAuth();
  const [khateebs, setKhateebs] = useState<Khateeb[]>(loadKhateebsFromCache);
  const [isLoadingKhateebs, setIsLoadingKhateebs] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  // Fetch from server on mount
  useEffect(() => {
    let cancelled = false;
    const fetchKhateebs = async () => {
      setIsLoadingKhateebs(true);
      try {
        const res = await fetch(`${API_URL}/khateebs`, {
          headers: {
            'apikey': publicAnonKey,
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && Array.isArray(data.khateebs)) {
            setKhateebs(data.khateebs);
            cacheKhateebs(data.khateebs);
          }
        }
      } catch (err) {
        console.log('Failed to fetch khateebs from server, using cache:', err);
      } finally {
        if (!cancelled) setIsLoadingKhateebs(false);
      }
    };
    fetchKhateebs();
    return () => { cancelled = true; };
  }, []);

  const resetForm = useCallback(() => {
    setName('');
    setPhone('');
    setNotes('');
    setShowAddForm(false);
    setEditingId(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!name.trim() || !phone.trim()) return;
    const token = accessToken || publicAnonKey;

    if (editingId) {
      // Update existing khateeb on server
      try {
        const res = await fetch(`${API_URL}/khateebs/${editingId}`, {
          method: 'PUT',
          headers: {
            'apikey': publicAnonKey,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: name.trim(), phone: phone.trim(), notes: notes.trim() }),
        });
        if (res.ok) {
          const data = await res.json();
          setKhateebs(prev => {
            const updated = prev.map(k => k.id === editingId ? data.khateeb : k);
            cacheKhateebs(updated);
            return updated;
          });
        }
      } catch (err) {
        console.error('Failed to update khateeb:', err);
      }
    } else {
      // Create new khateeb on server
      try {
        const res = await fetch(`${API_URL}/khateebs`, {
          method: 'POST',
          headers: {
            'apikey': publicAnonKey,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: name.trim(), phone: phone.trim(), notes: notes.trim() }),
        });
        if (res.ok) {
          const data = await res.json();
          setKhateebs(prev => {
            const updated = [...prev, data.khateeb];
            cacheKhateebs(updated);
            return updated;
          });
        }
      } catch (err) {
        console.error('Failed to add khateeb:', err);
      }
    }
    resetForm();
  }, [name, phone, notes, editingId, resetForm, accessToken]);

  const handleEdit = useCallback((k: Khateeb) => {
    setEditingId(k.id);
    setName(k.name);
    setPhone(k.phone);
    setNotes(k.notes);
    setShowAddForm(true);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    const token = accessToken || publicAnonKey;
    // Optimistic removal from UI
    setKhateebs(prev => {
      const updated = prev.filter(k => k.id !== id);
      cacheKhateebs(updated);
      return updated;
    });
    try {
      await fetch(`${API_URL}/khateebs/${id}`, {
        method: 'DELETE',
        headers: {
          'apikey': publicAnonKey,
          'Authorization': `Bearer ${token}`,
        },
      });
    } catch (err) {
      console.error('Failed to delete khateeb from server:', err);
    }
  }, [accessToken]);

  return (
    <div>
      <div className="flex items-center justify-between px-1 mb-3">
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-gray-400 dark:text-white/30" />
          <h3 className="text-sm font-medium text-gray-500 dark:text-white/40">Khateebs</h3>
          {isLoadingKhateebs && (
            <Loader className="w-3 h-3 text-gray-400 dark:text-white/25 animate-spin" />
          )}
          {khateebs.length > 0 && !isLoadingKhateebs && (
            <span className="text-[11px] text-gray-400 dark:text-white/25">({khateebs.length})</span>
          )}
        </div>
        {!showAddForm && (
          <button
            onClick={() => { resetForm(); setShowAddForm(true); }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-lg transition-colors active:scale-95"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Add
          </button>
        )}
      </div>

      {/* Add / Edit form */}
      {showAddForm && (
        <div className="bg-white dark:bg-[#1C1C1C] rounded-2xl border border-gray-200 dark:border-white/[0.1] p-4 mb-3">
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-500 dark:text-white/40 uppercase tracking-wider mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Sheikh Ahmad"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.1] rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 dark:focus:border-emerald-400 transition-colors"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-500 dark:text-white/40 uppercase tracking-wider mb-1">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.1] rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 dark:focus:border-emerald-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-500 dark:text-white/40 uppercase tracking-wider mb-1">Notes <span className="normal-case text-gray-400 dark:text-white/20">(optional)</span></label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Arabic & English, prefers Fajr khutbahs"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.1] rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 dark:focus:border-emerald-400 transition-colors"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={handleSave}
              disabled={!name.trim() || !phone.trim()}
              className="flex-1 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
            >
              {editingId ? 'Update' : 'Add Khateeb'}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 text-sm text-gray-500 dark:text-white/50 hover:bg-gray-100 dark:hover:bg-white/[0.06] rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Khateeb list */}
      {khateebs.length === 0 && !showAddForm ? (
        <div className="bg-white dark:bg-[#1C1C1C] rounded-2xl border border-gray-200 dark:border-white/[0.1] p-6 text-center">
          <Mic className="w-8 h-8 text-gray-300 dark:text-white/15 mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-white/40 mb-1">No khateebs added yet</p>
          <p className="text-xs text-gray-400 dark:text-white/25">Keep a list of community khateebs for quick Jumuah coordination</p>
        </div>
      ) : (
        <div className="space-y-2">
          {khateebs.map(k => (
            <div
              key={k.id}
              className="bg-white dark:bg-[#1C1C1C] rounded-2xl border border-gray-200 dark:border-white/[0.1] overflow-hidden"
            >
              <div className="p-4 flex items-center gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    {k.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{k.name}</div>
                  <div className="text-xs text-gray-500 dark:text-white/40 tabular-nums">{formatPhoneForDisplay(k.phone)}</div>
                  {k.notes && (
                    <div className="text-[11px] text-gray-400 dark:text-white/25 mt-0.5 truncate">{k.notes}</div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <a
                    href={buildKhateebSmsUri(k.phone, k.name)}
                    className="p-2 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg transition-colors active:scale-95"
                    aria-label={`Message ${k.name}`}
                  >
                    <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </a>
                  <a
                    href={`tel:${k.phone.replace(/\D/g, '')}`}
                    className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-lg transition-colors active:scale-95"
                    aria-label={`Call ${k.name}`}
                  >
                    <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </a>
                  <button
                    onClick={() => handleEdit(k)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-lg transition-colors active:scale-95"
                    aria-label={`Edit ${k.name}`}
                  >
                    <Edit2 className="w-3.5 h-3.5 text-gray-400 dark:text-white/30" />
                  </button>
                  <button
                    onClick={() => handleDelete(k.id)}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors active:scale-95"
                    aria-label={`Remove ${k.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-gray-400 dark:text-white/30 hover:text-red-500 dark:hover:text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminDashboard({
  mosques,
  isLoading,
  onBack,
  onEditMosque,
  onAddMosque,
  onAddJanaza,
  onViewRequests,
  onRefresh,
  onLogout,
}: AdminDashboardProps) {
  const { accessToken } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('admin-dismissed-suggestions');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [expandedSection, setExpandedSection] = useState<'urgent' | 'warning' | 'reports' | 'bugs' | 'requests' | null>(null);
  const [autoExpandDone, setAutoExpandDone] = useState(false);
  const [suggestionsLimit, setSuggestionsLimit] = useState(2);
  const [searchQuery, setSearchQuery] = useState('');
  const [hiddenMosqueIds, setHiddenMosqueIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('admin-hidden-mosques');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [showHiddenSection, setShowHiddenSection] = useState(false);
  const [togglingVisibilityId, setTogglingVisibilityId] = useState<string | null>(null);
  const [confirmHideMosque, setConfirmHideMosque] = useState<Mosque | null>(null);

  // Access requests state
  const [accessRequests, setAccessRequests] = useState<any[]>([]);
  const [accessRequestsLoading, setAccessRequestsLoading] = useState(false);
  const [dismissingRequestId, setDismissingRequestId] = useState<string | null>(null);
  // Masjid scope selection for access request approval
  const [scopeSelections, setScopeSelections] = useState<Record<string, Set<string>>>({});
  const [savingScopeId, setSavingScopeId] = useState<string | null>(null);
  const [scopeSavedIds, setScopeSavedIds] = useState<Set<string>>(new Set());
  // Account creation from access request
  const [creatingAccountId, setCreatingAccountId] = useState<string | null>(null);
  const [createdAccountInfo, setCreatedAccountInfo] = useState<{ reqId: string; email: string; resetSent: boolean } | null>(null);
  const [resendingResetId, setResendingResetId] = useState<string | null>(null);

  // Admin scope (per-user masjid visibility) — null = super admin (all)
  const [adminScope, setAdminScope] = useState<string[] | null>(null);
  const [scopeLoaded, setScopeLoaded] = useState(false);
  // Manage Scopes panel (super admin only)
  const [showManageScopes, setShowManageScopes] = useState(false);
  const [allScopes, setAllScopes] = useState<any[]>([]);
  const [scopesLoading, setScopesLoading] = useState(false);
  const [editingScopeEmail, setEditingScopeEmail] = useState<string | null>(null);
  const [editingScopeIds, setEditingScopeIds] = useState<Set<string>>(new Set());
  const [scopeActionLoading, setScopeActionLoading] = useState<string | null>(null);

  // Community reports count state (driven by child components)
  const [correctionCounts, setCorrectionCounts] = useState({ pending: 0, total: 0 });
  const [bugCounts, setBugCounts] = useState({ open: 0, total: 0 });

  const handleCorrectionCountChange = useCallback((pending: number, total: number) => {
    setCorrectionCounts(prev => prev.pending === pending && prev.total === total ? prev : { pending, total });
  }, []);
  const handleBugCountChange = useCallback((open: number, total: number) => {
    setBugCounts(prev => prev.open === open && prev.total === total ? prev : { open, total });
  }, []);

  // Total action-needed count across all community tabs
  // Scoped admins don't see access requests, so exclude from their count
  const requestCountForBadge = (adminScope === null && scopeLoaded) ? accessRequests.length : 0;
  const totalActionNeeded = correctionCounts.pending + bugCounts.open + requestCountForBadge;

  // API_URL imported from /utils/api.ts

  // Animation guard — entrance animations only play on the very first mount.
  // After that, sections appear instantly so state-driven re-renders don't flicker.
  const hasAnimatedRef = useRef(false);
  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => { hasAnimatedRef.current = true; }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  // Helper: staggered entrance props matching the home screen pattern.
  // delay is the base stagger offset for this section.
  const stagger = (delay: number) => ({
    initial: hasAnimatedRef.current ? false as const : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: hasAnimatedRef.current ? { duration: 0 } : { duration: 0.4, delay, ease: [0.25, 0.1, 0.25, 1] },
  });

  // Fetch admin scope + access requests on mount
  useEffect(() => {
    if (!accessToken) return;
    // Fetch current user's masjid scope
    const fetchScope = async () => {
      try {
        const res = await fetch(`${API_URL}/auth/my-scope`, {
          headers: { 'Authorization': `Bearer ${accessToken}`, 'apikey': publicAnonKey },
        });
        if (res.ok) {
          const data = await res.json();
          setAdminScope(data.scope?.allowedMosqueIds || null);
        }
      } catch (err) {
        console.error('Failed to fetch admin scope:', err);
      } finally {
        setScopeLoaded(true);
      }
    };
    fetchScope();
    const fetchRequests = async () => {
      setAccessRequestsLoading(true);
      try {
        const res = await fetch(`${API_URL}/auth/access-requests`, {
          headers: { 'Authorization': `Bearer ${accessToken}`, 'apikey': publicAnonKey },
        });
        if (res.ok) {
          const data = await res.json();
          setAccessRequests(data.requests || []);
        }
      } catch (err) {
        console.error('Failed to fetch access requests:', err);
      } finally {
        setAccessRequestsLoading(false);
      }
    };
    fetchRequests();
  }, [accessToken]);

  const dismissAccessRequest = async (id: string) => {
    setDismissingRequestId(id);
    try {
      await fetch(`${API_URL}/auth/access-requests/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'apikey': publicAnonKey },
      });
      setAccessRequests(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error('Failed to dismiss access request:', err);
    } finally {
      setDismissingRequestId(null);
    }
  };

  // Save masjid scope for an access request's email
  const saveAdminScope = async (reqId: string, email: string, selectedIds: Set<string>) => {
    setSavingScopeId(reqId);
    try {
      const res = await fetch(`${API_URL}/auth/admin-scope`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': publicAnonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, allowedMosqueIds: Array.from(selectedIds) }),
      });
      if (res.ok) {
        setScopeSavedIds(prev => new Set([...prev, reqId]));
      }
    } catch (err) {
      console.error('Failed to save admin scope:', err);
    } finally {
      setSavingScopeId(null);
    }
  };

  // Create account for an access request
  const createAccountForRequest = async (req: any) => {
    const currentSelection = scopeSelections[req.id] || new Set<string>(req.mosqueIds || []);
    if (currentSelection.size === 0) return;
    setCreatingAccountId(req.id);
    try {
      // 1. Save scope first
      await fetch(`${API_URL}/auth/admin-scope`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': publicAnonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: req.email, allowedMosqueIds: Array.from(currentSelection) }),
      });
      // 2. Generate an internal random password (user will reset via email)
      const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
      let internalPassword = '';
      for (let i = 0; i < 16; i++) internalPassword += chars[Math.floor(Math.random() * chars.length)];
      // 3. Create the account
      const res = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'apikey': publicAnonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: req.email, password: internalPassword, name: req.name }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to create account');
        return;
      }
      // 4. Send password reset email so the user sets their own password
      let resetSent = false;
      try {
        const resetRes = await fetch(`${API_URL}/auth/send-reset`, {
          method: 'POST',
          headers: { 'apikey': publicAnonKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: req.email }),
        });
        resetSent = resetRes.ok;
      } catch { /* non-fatal — user can resend */ }
      setCreatedAccountInfo({ reqId: req.id, email: req.email, resetSent });
    } catch (err) {
      console.error('Failed to create account:', err);
      alert('Failed to create account. Please try again.');
    } finally {
      setCreatingAccountId(null);
    }
  };

  // Resend password reset email
  const resendResetEmail = async (reqId: string, email: string) => {
    setResendingResetId(reqId);
    try {
      const res = await fetch(`${API_URL}/auth/send-reset`, {
        method: 'POST',
        headers: { 'apikey': publicAnonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setCreatedAccountInfo(prev => prev ? { ...prev, resetSent: true } : prev);
      } else {
        alert('Failed to resend reset email. Please try again.');
      }
    } catch {
      alert('Failed to resend reset email. Please try again.');
    } finally {
      setResendingResetId(null);
    }
  };

  // Fetch all admin scopes (for Manage Scopes panel)
  const fetchAllScopes = async () => {
    setScopesLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/admin-scopes`, {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'apikey': publicAnonKey },
      });
      if (res.ok) {
        const data = await res.json();
        setAllScopes(data.scopes || []);
      }
    } catch (err) {
      console.error('Failed to fetch admin scopes:', err);
    } finally {
      setScopesLoading(false);
    }
  };

  // Update an existing scope
  const updateExistingScope = async (email: string, newIds: Set<string>) => {
    setScopeActionLoading(email);
    try {
      const res = await fetch(`${API_URL}/auth/admin-scope`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': publicAnonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, allowedMosqueIds: Array.from(newIds) }),
      });
      if (res.ok) {
        setEditingScopeEmail(null);
        await fetchAllScopes();
      }
    } catch (err) {
      console.error('Failed to update scope:', err);
    } finally {
      setScopeActionLoading(null);
    }
  };

  // Remove a scope (grant full access)
  const removeScope = async (email: string) => {
    setScopeActionLoading(email);
    try {
      const res = await fetch(`${API_URL}/auth/admin-scope`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': publicAnonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, allowedMosqueIds: [] }),
      });
      if (res.ok) {
        await fetchAllScopes();
      }
    } catch (err) {
      console.error('Failed to remove scope:', err);
    } finally {
      setScopeActionLoading(null);
    }
  };

  // Toggle temporarily hidden from users (server-persisted)
  // When hiding: show confirmation dialog first. When restoring: execute immediately.
  const requestToggleUserVisibility = (mosque: Mosque) => {
    if (!mosque.temporarilyHidden) {
      setConfirmHideMosque(mosque); // Hiding → confirm first
    } else {
      executeToggleUserVisibility(mosque); // Restoring → no confirmation needed
    }
  };

  const executeToggleUserVisibility = async (mosque: Mosque) => {
    setConfirmHideMosque(null);
    setTogglingVisibilityId(mosque.id);
    const token = accessToken || publicAnonKey;
    const newValue = !mosque.temporarilyHidden;
    try {
      const res = await fetch(`${API_URL}/mosques/${mosque.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'apikey': publicAnonKey,
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ temporarilyHidden: newValue }),
      });
      if (res.ok) {
        await onRefresh();
      } else {
        console.error('Failed to toggle user visibility:', await res.text());
      }
    } catch (err) {
      console.error('Failed to toggle user visibility:', err);
    } finally {
      setTogglingVisibilityId(null);
    }
  };

  // Apply admin scope filter first (scoped admins only see assigned masjids)
  const scopedMosques = useMemo(() => {
    if (!adminScope) return mosques; // null = super admin, see all
    const allowed = new Set(adminScope);
    return mosques.filter(m => allowed.has(m.id));
  }, [mosques, adminScope]);

  const isSuperAdmin = adminScope === null && scopeLoaded;

  // Derive visible/hidden mosque lists (from scoped set)
  const visibleMosques = useMemo(() => scopedMosques.filter(m => !hiddenMosqueIds.has(m.id)), [scopedMosques, hiddenMosqueIds]);
  const hiddenMosques = useMemo(() => scopedMosques.filter(m => hiddenMosqueIds.has(m.id)), [scopedMosques, hiddenMosqueIds]);
  const userHiddenCount = useMemo(() => scopedMosques.filter(m => m.temporarilyHidden).length, [scopedMosques]);

  // Generate suggestions for ALL scoped mosques (cross-masjid analysis needs the full set)
  // but only display suggestions for visible ones
  const suggestions = useMemo(() => generateAdminSuggestions(scopedMosques), [scopedMosques]);

  const visibleSuggestions = suggestions.filter(s => {
    // Filter out info/tips — only show actionable urgent + warning items
    if (s.severity === 'info') return false;
    // For merged suggestions, check if any of the merged IDs are dismissed
    if (s.mergedIds) {
      return !dismissedSuggestions.has(s.id) && !s.mergedIds.every(mid => dismissedSuggestions.has(mid));
    }
    return !dismissedSuggestions.has(s.id) && !hiddenMosqueIds.has(s.mosqueId);
  });
  const activeSummary = getSuggestionSummary(visibleSuggestions);

  const dismissSuggestion = (suggestion: AdminSuggestion) => {
    setDismissedSuggestions(prev => {
      const next = new Set(prev);
      next.add(suggestion.id);
      // For consolidated suggestions, dismiss all underlying IDs too
      if (suggestion.mergedIds) {
        for (const mid of suggestion.mergedIds) next.add(mid);
      }
      localStorage.setItem('admin-dismissed-suggestions', JSON.stringify([...next]));
      return next;
    });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  };

  const groupedSuggestions = {
    urgent: visibleSuggestions.filter(s => s.severity === 'urgent'),
    warning: visibleSuggestions.filter(s => s.severity === 'warning'),
    info: visibleSuggestions.filter(s => s.severity === 'info'),
  };

  // Auto-expand the first category that has items on initial load
  useEffect(() => {
    if (autoExpandDone) return;
    if (groupedSuggestions.urgent.length > 0) {
      setExpandedSection('urgent');
      setAutoExpandDone(true);
    } else if (groupedSuggestions.warning.length > 0) {
      setExpandedSection('warning');
      setAutoExpandDone(true);
    }
  }, [autoExpandDone, groupedSuggestions.urgent.length, groupedSuggestions.warning.length]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#111111]">
      {/* Header */}
      <motion.div {...stagger(0)} className="sticky top-0 z-30 bg-gray-50 dark:bg-[#111111] border-b border-gray-200 dark:border-white/[0.1]">
        <div className="max-w-2xl lg:max-w-6xl mx-auto px-4 lg:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-lg transition-colors active:scale-95"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5 text-gray-900 dark:text-white" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Admin Dashboard</h1>
                {adminScope && scopeLoaded && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/30">
                    <ShieldCheck className="w-3 h-3" />
                    Scoped
                  </span>
                )}
              </div>
              <p className="text-[12px] text-gray-500 dark:text-white/40">
                {adminScope
                  ? `${scopedMosques.length} ${scopedMosques.length !== 1 ? 'masajid' : 'masjid'} assigned`
                  : hiddenMosques.length > 0
                  ? `${visibleMosques.length} of ${scopedMosques.length} ${scopedMosques.length !== 1 ? 'masajid' : 'masjid'} shown`
                  : `${scopedMosques.length} ${scopedMosques.length !== 1 ? 'masajid' : 'masjid'} managed`
                }
                {userHiddenCount > 0 && (
                  <span className="text-orange-500 dark:text-orange-400">{` · ${userHiddenCount} hidden from users`}</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-lg transition-colors active:scale-95 disabled:opacity-50"
              aria-label="Refresh"
            >
              <RefreshCw className={`w-5 h-5 text-gray-600 dark:text-white/60 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            {onLogout && (
              <button
                onClick={onLogout}
                className="p-2 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors active:scale-95"
                aria-label="Log out"
                title="Log out"
              >
                <LogOut className="w-5 h-5 text-gray-600 dark:text-white/60" />
              </button>
            )}
          </div>
        </div>
      </motion.div>

      <div className="max-w-2xl lg:max-w-6xl mx-auto px-4 lg:px-6 py-6 space-y-6">
        {/* Loading State */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader className="w-6 h-6 text-gray-400 dark:text-white/40 animate-spin" />
            <p className="text-sm text-gray-500 dark:text-white/40">Loading masjid data...</p>
          </div>
        ) : (
        <>
        {/* Health Overview Card */}
        <motion.div {...stagger(0.03)} data-onboard="health" className="bg-white dark:bg-[#1C1C1C] rounded-2xl border border-gray-200 dark:border-white/[0.1] p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-xl ${
              activeSummary.urgent > 0 || totalActionNeeded > 0
                ? 'bg-red-100 dark:bg-red-950/40' 
                : activeSummary.warning > 0 
                  ? 'bg-amber-100 dark:bg-amber-950/40' 
                  : 'bg-emerald-100 dark:bg-emerald-950/40'
            }`}>
              {activeSummary.urgent > 0 || totalActionNeeded > 0 ? (
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              ) : activeSummary.warning > 0 ? (
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              ) : (
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              )}
            </div>
            <div>
              <h2 className="font-medium text-gray-900 dark:text-white">
                {activeSummary.urgent > 0 || totalActionNeeded > 0
                  ? 'Action needed' 
                  : activeSummary.warning > 0 
                    ? 'A few things to review' 
                    : 'Everything looks good'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-white/50">
                {(() => {
                  const parts: string[] = [];
                  if (activeSummary.total > 0) {
                    parts.push(`${activeSummary.total} suggestion${activeSummary.total !== 1 ? 's' : ''}`);
                  }
                  if (correctionCounts.pending > 0) {
                    parts.push(`${correctionCounts.pending} report${correctionCounts.pending !== 1 ? 's' : ''}`);
                  }
                  if (bugCounts.open > 0) {
                    parts.push(`${bugCounts.open} bug${bugCounts.open !== 1 ? 's' : ''}`);
                  }
                  if (requestCountForBadge > 0) {
                    parts.push(`${requestCountForBadge} request${requestCountForBadge !== 1 ? 's' : ''}`);
                  }
                  return parts.length > 0 ? parts.join(', ') : 'All masjid times are up to date';
                })()}
              </p>
            </div>
          </div>

          {/* Summary pills */}
          {(activeSummary.total > 0 || totalActionNeeded > 0) && (
            <div className="flex gap-2 flex-wrap">
              {activeSummary.urgent > 0 && (
                <button
                  onClick={() => { setSuggestionsLimit(2); setExpandedSection(expandedSection === 'urgent' ? null : 'urgent'); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${
                    expandedSection === 'urgent' 
                      ? 'bg-red-500 dark:bg-red-600 text-white border-transparent' 
                      : 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/40'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  {activeSummary.urgent} urgent
                </button>
              )}
              {activeSummary.warning > 0 && (
                <button
                  onClick={() => { setSuggestionsLimit(2); setExpandedSection(expandedSection === 'warning' ? null : 'warning'); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${
                    expandedSection === 'warning' 
                      ? 'bg-amber-500 dark:bg-amber-600 text-white border-transparent' 
                      : 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/40'
                  }`}
                >
                  <AlertCircle className="w-3 h-3" />
                  {activeSummary.warning} attention
                </button>
              )}
              {correctionCounts.pending > 0 && (
                <button
                  onClick={() => setExpandedSection(expandedSection === 'reports' ? null : 'reports')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${
                    expandedSection === 'reports' 
                      ? 'bg-amber-500 dark:bg-amber-600 text-white border-transparent' 
                      : 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/40'
                  }`}
                >
                  <Inbox className="w-3 h-3" />
                  {correctionCounts.pending} report{correctionCounts.pending !== 1 ? 's' : ''}
                </button>
              )}
              {bugCounts.open > 0 && (
                <button
                  onClick={() => setExpandedSection(expandedSection === 'bugs' ? null : 'bugs')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${
                    expandedSection === 'bugs' 
                      ? 'bg-red-500 dark:bg-red-600 text-white border-transparent' 
                      : 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/40'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  {bugCounts.open} bug{bugCounts.open !== 1 ? 's' : ''}
                </button>
              )}
              {isSuperAdmin && accessRequests.length > 0 && (
                <button
                  onClick={() => setExpandedSection(expandedSection === 'requests' ? null : 'requests')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${
                    expandedSection === 'requests' 
                      ? 'bg-blue-500 dark:bg-blue-600 text-white border-transparent' 
                      : 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/40'
                  }`}
                >
                  <UserPlus className="w-3 h-3" />
                  {accessRequests.length} request{accessRequests.length !== 1 ? 's' : ''}
                </button>
              )}
            </div>
          )}

          {/* ── Expanded content rendered INSIDE the Health card ── */}
          {expandedSection && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/[0.06]">
              {/* Suggestion cards (urgent / warning) */}
              {(expandedSection === 'urgent' || expandedSection === 'warning') && groupedSuggestions[expandedSection].length > 0 && (() => {
                const sectionItems = groupedSuggestions[expandedSection!];
                const visibleItems = sectionItems.slice(0, suggestionsLimit);
                const hasMore = sectionItems.length > suggestionsLimit;
                const remaining = sectionItems.length - suggestionsLimit;

                return (
                <div data-onboard="suggestions" className="space-y-2.5 lg:grid lg:grid-cols-2 lg:gap-2.5 lg:space-y-0">
                  {visibleItems.map(suggestion => (
                    <div 
                      key={suggestion.id} 
                      className={`rounded-xl border overflow-hidden ${
                        suggestion.severity === 'urgent' 
                          ? 'bg-red-50/50 dark:bg-red-950/10 border-red-200/60 dark:border-red-900/20' 
                          : suggestion.severity === 'warning' 
                            ? 'bg-amber-50/50 dark:bg-amber-950/10 border-amber-200/60 dark:border-amber-900/20' 
                            : 'bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06]'
                      }`}
                    >
                      <div className="p-3.5">
                        <div className="flex items-start gap-2.5">
                          <SeverityIcon severity={suggestion.severity} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[13px] font-medium text-gray-900 dark:text-white">{suggestion.title}</span>
                              <SeverityBadge severity={suggestion.severity} />
                            </div>
                            <p className="text-[12px] text-gray-500 dark:text-white/50 leading-relaxed">
                              <span className="font-medium text-gray-700 dark:text-white/70">{suggestion.mosqueName}</span> — {suggestion.description}
                            </p>
                            {suggestion.suggestedTime && (
                              <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/30 rounded-md">
                                <Zap className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">Suggested: {suggestion.suggestedTime}</span>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => dismissSuggestion(suggestion)}
                            className="p-1 hover:bg-white/60 dark:hover:bg-white/[0.08] rounded transition-colors flex-shrink-0"
                            aria-label="Dismiss"
                          >
                            <X className="w-3.5 h-3.5 text-gray-400 dark:text-white/30" />
                          </button>
                        </div>
                        {suggestion.actionLabel && (
                          <div className="mt-2.5 ml-6">
                            <button
                              onClick={() => {
                                const mosque = scopedMosques.find(m => m.id === suggestion.mosqueId);
                                if (mosque) onEditMosque(mosque);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[12px] font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 active:scale-95 transition-all"
                            >
                              {suggestion.actionLabel}
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {hasMore && (
                    <button
                      onClick={() => setSuggestionsLimit(prev => prev + 5)}
                      className="w-full lg:col-span-2 flex items-center justify-center gap-2 py-2 text-[12px] font-medium text-gray-500 dark:text-white/50 bg-gray-50 dark:bg-white/[0.03] border border-gray-200/60 dark:border-white/[0.06] rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.06] active:scale-[0.99] transition-all"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                      Show {Math.min(remaining, 5)} more of {remaining}
                    </button>
                  )}
                </div>
                );
              })()}

              {/* Community Reports */}
              {expandedSection === 'reports' && (
                <CorrectionInbox
                  mosques={scopedMosques}
                  accessToken={accessToken}
                  onEditMosque={onEditMosque}
                  hideHeader
                  onCountChange={handleCorrectionCountChange}
                />
              )}

              {/* Bug Reports */}
              {expandedSection === 'bugs' && (
                <BugReportInbox
                  accessToken={accessToken}
                  hideHeader
                  onCountChange={handleBugCountChange}
                />
              )}

              {/* Access Requests */}
              {expandedSection === 'requests' && (
                <div className="space-y-2.5 lg:grid lg:grid-cols-2 lg:gap-2.5 lg:space-y-0">
                  {accessRequestsLoading ? (
                    <div className="flex items-center justify-center py-6 lg:col-span-2">
                      <Loader className="w-5 h-5 text-gray-400 dark:text-white/30 animate-spin" />
                    </div>
                  ) : accessRequests.length === 0 ? (
                    <div className="rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200/60 dark:border-white/[0.06] p-6 text-center lg:col-span-2">
                      <p className="text-sm text-gray-500 dark:text-white/40">No pending requests</p>
                    </div>
                  ) : (
                    accessRequests.map((req: any) => (
                      <div
                        key={req.id}
                        className="rounded-xl bg-blue-50/40 dark:bg-blue-950/10 border border-blue-200/50 dark:border-blue-900/20 overflow-hidden"
                      >
                        <div className="p-3.5">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-[13px] font-medium text-gray-900 dark:text-white">{req.name}</div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <Mail className="w-3 h-3 text-gray-400 dark:text-white/30" />
                                <span className="text-[11px] text-gray-500 dark:text-white/50">{req.email}</span>
                              </div>
                            </div>
                            <span className="text-[11px] text-gray-400 dark:text-white/25 flex-shrink-0">
                              {new Date(req.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          {req.mosqueNames && req.mosqueNames.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              <span className="text-[10px] text-gray-400 dark:text-white/25 uppercase tracking-wider">Requested:</span>
                              {req.mosqueNames.map((name: string, i: number) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center gap-1 text-[11px] text-blue-700 dark:text-blue-300 bg-blue-100/60 dark:bg-blue-950/30 px-2 py-0.5 rounded-full"
                                >
                                  <Building2 className="w-2.5 h-2.5" />
                                  {name}
                                </span>
                              ))}
                            </div>
                          )}
                          {req.message && (
                            <p className="text-[11px] text-gray-500 dark:text-white/40 bg-white/60 dark:bg-white/[0.03] rounded-lg px-2.5 py-1.5 mb-2.5">
                              &ldquo;{req.message}&rdquo;
                            </p>
                          )}
                          {/* ── Masjid scope dropdown ── */}
                          {isSuperAdmin && (() => {
                            const currentSelection = scopeSelections[req.id]
                              || new Set<string>(req.mosqueIds || []);
                            const toggleMosque = (mosqueId: string) => {
                              const next = new Set(currentSelection);
                              if (next.has(mosqueId)) next.delete(mosqueId);
                              else next.add(mosqueId);
                              setScopeSelections(prev => ({ ...prev, [req.id]: next }));
                              setScopeSavedIds(prev => { const n = new Set(prev); n.delete(req.id); return n; });
                            };
                            const isCreating = creatingAccountId === req.id;
                            const wasCreated = createdAccountInfo?.reqId === req.id;
                            return (
                              <div className="mb-2.5">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <ShieldCheck className="w-3 h-3 text-gray-400 dark:text-white/30" />
                                  <span className="text-[10px] text-gray-400 dark:text-white/30 uppercase tracking-wider">Assign masjids</span>
                                </div>
                                <MasjidScopeDropdown
                                  mosques={mosques}
                                  selectedIds={currentSelection}
                                  onToggle={toggleMosque}
                                  label="Select masjids to assign..."
                                  disabled={isCreating || wasCreated}
                                />
                              </div>
                            );
                          })()}
                          {/* ── Account created success card ── */}
                          {createdAccountInfo?.reqId === req.id && (
                            <div className="mb-2.5 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30 rounded-xl">
                              <div className="flex items-center gap-1.5 mb-2">
                                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span className="text-[12px] font-medium text-emerald-700 dark:text-emerald-300">Account created</span>
                              </div>
                              <div className="space-y-1.5 mb-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-emerald-600/60 dark:text-emerald-400/50 uppercase tracking-wider w-14">Email</span>
                                  <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-mono">{createdAccountInfo.email}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-emerald-600/60 dark:text-emerald-400/50 uppercase tracking-wider w-14">Reset</span>
                                  <span className="text-[11px] text-emerald-700 dark:text-emerald-300">
                                    {createdAccountInfo.resetSent ? 'Password reset email sent' : 'Reset email failed to send'}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mb-2">
                                <button
                                  onClick={() => resendResetEmail(req.id, createdAccountInfo.email)}
                                  disabled={resendingResetId === req.id}
                                  className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 rounded-md hover:bg-emerald-200 dark:hover:bg-emerald-900/50 active:scale-[0.98] transition-all disabled:opacity-50"
                                >
                                  {resendingResetId === req.id ? (
                                    <Loader className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Mail className="w-3 h-3" />
                                  )}
                                  {resendingResetId === req.id ? 'Sending…' : 'Resend Reset Email'}
                                </button>
                              </div>
                              <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/50">
                                {req.name} will receive an email to set their own password.
                              </p>
                            </div>
                          )}
                          {/* ── Action buttons ── */}
                          <div className="flex items-center gap-2">
                            {/* Create Account button — hidden once created */}
                            {isSuperAdmin && createdAccountInfo?.reqId !== req.id && (
                              <button
                                onClick={() => createAccountForRequest(req)}
                                disabled={
                                  creatingAccountId === req.id ||
                                  (scopeSelections[req.id] || new Set(req.mosqueIds || [])).size === 0
                                }
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-lg border transition-all active:scale-[0.98] disabled:opacity-50 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/30 hover:bg-emerald-100 dark:hover:bg-emerald-950/30"
                              >
                                {creatingAccountId === req.id ? (
                                  <Loader className="w-3 h-3 animate-spin" />
                                ) : (
                                  <KeyRound className="w-3 h-3" />
                                )}
                                {creatingAccountId === req.id ? 'Creating…' : 'Create Account'}
                              </button>
                            )}
                            {/* Email link */}
                            {(() => {
                              const joinUrl = SITE_URL + '/join';
                              const bodyLines = createdAccountInfo?.reqId === req.id
                                ? [
                                    'Assalamu alaykum ' + req.name + ',',
                                    '',
                                    'Your contributor account for Dāimūn has been created!',
                                    '',
                                    'You should have received a separate email to set your password.',
                                    'If you don\'t see it, check your spam folder or let me know and I\'ll resend it.',
                                    '',
                                    'Once your password is set, log in at: ' + SITE_URL,
                                    '',
                                    'JazakAllahu khairan for helping keep iqama times accurate for our community.',
                                  ]
                                : [
                                    'Assalamu alaykum ' + req.name + ',',
                                    '',
                                    'Your request for contributor access has been approved!',
                                    '',
                                    'Set up your account here:',
                                    joinUrl,
                                    '',
                                    'Use the email you requested access with (' + req.email + ').',
                                    '',
                                    'JazakAllahu khairan for helping keep iqama times accurate for our community.',
                                  ];
                              const mailHref = 'mailto:' + req.email + '?subject=' + encodeURIComponent('Dāimūn Access Approved') + '&body=' + encodeURIComponent(bodyLines.join('\n'));
                              return (
                                <a
                                  href={mailHref}
                                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-950/30 active:scale-[0.98] transition-all"
                                >
                                  <Mail className="w-3 h-3" />
                                  Email
                                </a>
                              );
                            })()}
                            <button
                              onClick={() => dismissAccessRequest(req.id)}
                              disabled={dismissingRequestId === req.id}
                              className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-gray-600 dark:text-white/60 bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.08] active:scale-[0.98] transition-all disabled:opacity-50"
                            >
                              {dismissingRequestId === req.id ? (
                                <Loader className="w-3 h-3 animate-spin" />
                              ) : (
                                <Trash2 className="w-3 h-3" />
                              )}
                              Dismiss
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Hidden mounts to keep counts accurate */}
          {expandedSection !== 'reports' && (
            <div style={{ display: 'none' }}>
              <CorrectionInbox mosques={scopedMosques} accessToken={accessToken} onEditMosque={onEditMosque} hideHeader onCountChange={handleCorrectionCountChange} />
            </div>
          )}
          {expandedSection !== 'bugs' && (
            <div style={{ display: 'none' }}>
              <BugReportInbox accessToken={accessToken} hideHeader onCountChange={handleBugCountChange} />
            </div>
          )}
        </motion.div>



        {/* Masjid List */}
        <motion.div {...stagger(0.15)}>
          <div className="flex items-center justify-between px-1 mb-3">
            <h3 className="text-sm font-medium text-gray-500 dark:text-white/40">Your Masajid</h3>
            {isSuperAdmin && (
              <button
                onClick={onAddMosque}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/30 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-950/40 active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Masjid
              </button>
            )}
          </div>
          {/* Search Bar */}
          {visibleMosques.length > 2 && (
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-white/30 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search masajid..."
                className="w-full pl-9 pr-8 py-2.5 bg-white dark:bg-[#1C1C1C] border border-gray-200 dark:border-white/[0.1] rounded-2xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-white/20 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-full transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5 text-gray-400 dark:text-white/30" />
                </button>
              )}
            </div>
          )}
          <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
            {(() => {
              const filteredMosques = searchQuery.trim()
                ? visibleMosques.filter(m =>
                    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    m.address.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                : visibleMosques;

              if (filteredMosques.length === 0 && searchQuery.trim()) {
                return (
                  <div className="bg-white dark:bg-[#1C1C1C] rounded-2xl border border-gray-200 dark:border-white/[0.1] p-6 text-center lg:col-span-2">
                    <Search className="w-6 h-6 text-gray-300 dark:text-white/15 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 dark:text-white/40">No masajid match &ldquo;{searchQuery}&rdquo;</p>
                  </div>
                );
              }

              return filteredMosques.map((mosque, idx) => {
                const mosqueSuggestions = visibleSuggestions.filter(s => s.mosqueId === mosque.id);
                const stabilityScore = getMosqueStabilityScore(mosque, suggestions);
                return (
                  <motion.div key={mosque.id} {...stagger(0.12 + Math.min(idx * 0.04, 0.6))}>
                  <MosqueQuickCard
                    mosque={mosque}
                    suggestions={mosqueSuggestions}
                    stabilityScore={stabilityScore}
                    isFirst={idx === 0}
                    onEdit={() => onEditMosque(mosque)}
                    onHide={() => {
                      setHiddenMosqueIds(prev => {
                        const next = new Set(prev);
                        next.add(mosque.id);
                        localStorage.setItem('admin-hidden-mosques', JSON.stringify([...next]));
                        return next;
                      });
                    }}
                    onToggleUserVisibility={() => requestToggleUserVisibility(mosque)}
                    isTogglingVisibility={togglingVisibilityId === mosque.id}
                  />
                  </motion.div>
                );
              });
            })()}
          </div>
        </motion.div>

        {/* Cross-Masjid Comparison — color-coded by deviation from median */}
        {scopedMosques.length > 1 && (() => {
          const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
          const PRAYER_LABELS = ['Fajr', 'Dhuhr', 'Asr', 'Mgrb', 'Isha'];

          // Pre-compute all iqama calc results once
          const calcMap = new Map<string, ReturnType<typeof calculateIqamaTimes>>();
          scopedMosques.forEach(m => {
            calcMap.set(m.id, calculateIqamaTimes(
              m.latitude, m.longitude, m.iqamaTimes, new Date(),
              m.calculationMethod || 'NorthAmerica', m.asrMethod || 'Standard',
              m.scheduledTimeChanges
            ));
          });

          // For each prayer, collect offered iqama times in minutes → compute median
          const medians: Record<string, number> = {};
          PRAYERS.forEach(prayer => {
            const mins: number[] = [];
            scopedMosques.forEach(m => {
              const offered = !m.offeredPrayers || m.offeredPrayers.length === 0 || m.offeredPrayers.includes(prayer);
              if (offered) {
                const calc = calcMap.get(m.id);
                if (calc) {
                  const t = timeToMinutes(calc[prayer].iqama);
                  if (t > 0) mins.push(t);
                }
              }
            });
            if (mins.length > 0) {
              mins.sort((a, b) => a - b);
              const mid = Math.floor(mins.length / 2);
              medians[prayer] = mins.length % 2 === 0 ? (mins[mid - 1] + mins[mid]) / 2 : mins[mid];
            }
          });

          // Deviation → color tier
          const getCellColor = (prayer: string, iqamaStr: string) => {
            const median = medians[prayer];
            if (median === undefined) return { bg: '', text: 'text-gray-600 dark:text-white/60', label: 'close' as const };
            const mins = timeToMinutes(iqamaStr);
            if (mins === 0) return { bg: '', text: 'text-gray-600 dark:text-white/60', label: 'close' as const };
            const diff = Math.abs(mins - median);
            if (diff <= 5)  return { bg: 'bg-emerald-50/80 dark:bg-emerald-500/[0.08]', text: 'text-emerald-700 dark:text-emerald-400', label: 'close' as const };
            if (diff <= 15) return { bg: 'bg-amber-50/80 dark:bg-amber-500/[0.08]', text: 'text-amber-700 dark:text-amber-400', label: 'moderate' as const };
            return { bg: 'bg-red-50/80 dark:bg-red-500/[0.08]', text: 'text-red-700 dark:text-red-400', label: 'outlier' as const };
          };

          const hasMultipleMethods = new Set(scopedMosques.map(m => m.calculationMethod || 'NorthAmerica')).size > 1;

          return (
            <motion.div {...stagger(0.18)} data-onboard="comparison" className="bg-white dark:bg-[#1C1C1C] rounded-2xl border border-gray-200 dark:border-white/[0.1] overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-gray-500 dark:text-white/50" />
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">Iqama Time Comparison</h3>
                </div>
                <p className="text-[12px] text-gray-500 dark:text-white/40 mt-1">Color shows deviation from the group median for each prayer</p>
                {hasMultipleMethods && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1.5">
                    Different adhan calculation methods in use — gaps may vary naturally
                  </p>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-white/[0.06]">
                      <th className="text-left text-[11px] font-medium text-gray-400 dark:text-white/30 uppercase tracking-wider py-2.5 px-4">Masjid</th>
                      {PRAYER_LABELS.map(p => (
                        <th key={p} className="text-center text-[11px] font-medium text-gray-400 dark:text-white/30 uppercase tracking-wider py-2.5 px-2">{p}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {scopedMosques.map((mosque, idx) => {
                      const calc = calcMap.get(mosque.id)!;
                      return (
                        <tr 
                          key={mosque.id} 
                          className={`${idx < scopedMosques.length - 1 ? 'border-b border-gray-50 dark:border-white/[0.03]' : ''}`}
                        >
                          <td className="py-2.5 px-4">
                            <span className="text-[12px] font-medium text-gray-700 dark:text-white/70 truncate block max-w-[120px] lg:max-w-[240px]">
                              {mosque.name}
                            </span>
                            {mosque.temporarilyHidden && (
                              <span className="text-[10px] text-orange-500 dark:text-orange-400 block">Hidden from users</span>
                            )}
                            {hasMultipleMethods && (
                              <span className="text-[10px] text-gray-400 dark:text-white/25 block">
                                {(mosque.calculationMethod || 'ISNA').replace('NorthAmerica', 'ISNA').replace('MuslimWorldLeague', 'MWL').replace('Egyptian', 'Egypt')}
                              </span>
                            )}
                          </td>
                          {PRAYERS.map(prayer => {
                            const isOffered = !mosque.offeredPrayers || mosque.offeredPrayers.length === 0 || mosque.offeredPrayers.includes(prayer);
                            if (!isOffered) {
                              return (
                                <td key={prayer} className="text-center py-2.5 px-2">
                                  <span className="text-[12px] font-mono block text-gray-300 dark:text-white/15">—</span>
                                </td>
                              );
                            }
                            const color = getCellColor(prayer, calc[prayer].iqama);
                            return (
                              <td key={prayer} className={`text-center py-2.5 px-1`}>
                                <div className={`rounded-lg px-1 py-1 ${color.bg}`}>
                                  <span className={`text-[12px] font-mono block ${color.text}`}>
                                    {calc[prayer].iqama}
                                  </span>
                                  <span className="text-[10px] text-gray-400 dark:text-white/25 font-mono block">
                                    {calc[prayer].adhan}
                                  </span>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Legend */}
              <div className="px-4 py-3 border-t border-gray-100 dark:border-white/[0.06] flex flex-wrap items-center gap-x-4 gap-y-1.5">
                <span className="text-[10px] text-gray-400 dark:text-white/30 uppercase tracking-wider">Key</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-200 dark:bg-emerald-500/30 flex-shrink-0" />
                  <span className="text-[11px] text-gray-500 dark:text-white/45">Within 5 min</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-200 dark:bg-amber-500/30 flex-shrink-0" />
                  <span className="text-[11px] text-gray-500 dark:text-white/45">5–15 min off</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-red-200 dark:bg-red-500/30 flex-shrink-0" />
                  <span className="text-[11px] text-gray-500 dark:text-white/45">&gt;15 min off</span>
                </div>
                <span className="text-[10px] text-gray-400 dark:text-white/25 ml-auto">vs. group median</span>
              </div>
            </motion.div>
          );
        })()}

        {/* Hidden Masajid Section */}
        {hiddenMosques.length > 0 && (
          <motion.div {...stagger(0.21)}>
            <button
              onClick={() => setShowHiddenSection(!showHiddenSection)}
              className="flex items-center gap-2 px-1 mb-3 group"
            >
              <EyeOff className="w-3.5 h-3.5 text-gray-400 dark:text-white/30" />
              <span className="text-sm font-medium text-gray-400 dark:text-white/30 group-hover:text-gray-500 dark:group-hover:text-white/40 transition-colors">
                {hiddenMosques.length} hidden {hiddenMosques.length !== 1 ? 'masajid' : 'masjid'}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 dark:text-white/30 transition-transform ${showHiddenSection ? 'rotate-180' : ''}`} />
            </button>
            {showHiddenSection && (
              <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
                {hiddenMosques.map(mosque => (
                  <div
                    key={mosque.id}
                    className={`flex items-center justify-between gap-3 py-2.5 px-4 bg-white dark:bg-[#1C1C1C] border rounded-2xl ${mosque.temporarilyHidden ? 'border-orange-300 dark:border-orange-700/40' : 'border-gray-200 dark:border-white/[0.1]'}`}
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-gray-500 dark:text-white/50 truncate block">{mosque.name}</span>
                      {mosque.temporarilyHidden && (
                        <span className="text-[11px] text-orange-500 dark:text-orange-400">Hidden from users</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onEditMosque(mosque)}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-lg transition-colors active:scale-95"
                        aria-label="Edit mosque"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-gray-400 dark:text-white/30" />
                      </button>
                      <button
                        onClick={() => {
                          setHiddenMosqueIds(prev => {
                            const next = new Set(prev);
                            next.delete(mosque.id);
                            localStorage.setItem('admin-hidden-mosques', JSON.stringify([...next]));
                            return next;
                          });
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium text-gray-600 dark:text-white/60 hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-lg transition-colors active:scale-95"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Show
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Volunteer Opportunities */}
          <motion.div {...stagger(0.24)}>
            <VolunteerAdminSection mosques={scopedMosques} />
          </motion.div>

          {/* Charity & Donations */}
          <motion.div {...stagger(0.27)}>
            <CharityAdminSection mosques={scopedMosques} />
          </motion.div>

          {/* Android Early Access */}
          <motion.div {...stagger(0.30)}>
            <EarlyAccessSection />
          </motion.div>

          {/* Khateeb Directory + Janaza */}
          <motion.div {...stagger(0.33)}>
            <KhateebSection />
            <div className="mt-4 bg-white dark:bg-[#1C1C1C] rounded-2xl border border-gray-200 dark:border-white/[0.1] p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-50 dark:bg-purple-950/30 rounded-xl flex-shrink-0 mt-0.5">
                  <Megaphone className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-gray-700 dark:text-white/70 mb-1">Janaza Announcements</p>
                  <p className="text-[12px] text-gray-400 dark:text-white/30 mb-3">Notify the community about an upcoming janaza prayer so they can attend.</p>
                  <button
                    onClick={onAddJanaza}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/30 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-950/30 active:scale-95 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Announce Janaza
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Manage Scopes — super admin only */}
        {isSuperAdmin && (
          <motion.div {...stagger(0.33)}>
            <div className="bg-white dark:bg-[#1C1C1C] rounded-2xl border border-gray-200 dark:border-white/[0.1] overflow-hidden">
              <button
                onClick={() => {
                  const next = !showManageScopes;
                  setShowManageScopes(next);
                  if (next && allScopes.length === 0) fetchAllScopes();
                }}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded-xl">
                    <Users className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-[13px] font-medium text-gray-900 dark:text-white">Contributor Scopes</p>
                    <p className="text-[11px] text-gray-400 dark:text-white/30">Manage which masjids each contributor can see</p>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 dark:text-white/30 transition-transform ${showManageScopes ? 'rotate-180' : ''}`} />
              </button>

              {showManageScopes && (
                <div className="border-t border-gray-100 dark:border-white/[0.06] p-4">
                  {scopesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader className="w-5 h-5 text-gray-400 dark:text-white/30 animate-spin" />
                    </div>
                  ) : allScopes.length === 0 ? (
                    <div className="text-center py-8">
                      <ShieldCheck className="w-8 h-8 text-gray-200 dark:text-white/10 mx-auto mb-2" />
                      <p className="text-sm text-gray-500 dark:text-white/40">No contributor scopes configured</p>
                      <p className="text-[11px] text-gray-400 dark:text-white/25 mt-1">Scopes are created when you approve an access request</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {allScopes.map((scope: any) => {
                        const isEditing = editingScopeEmail === scope.email;
                        const isActionLoading = scopeActionLoading === scope.email;
                        const scopedNames = (scope.allowedMosqueIds || []).map((id: string) => {
                          const m = mosques.find(m => m.id === id);
                          return m ? m.name : id;
                        });

                        return (
                          <div
                            key={scope.email}
                            className="rounded-xl border border-gray-200/60 dark:border-white/[0.06] bg-gray-50/50 dark:bg-white/[0.02] overflow-hidden"
                          >
                            <div className="p-3">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <Mail className="w-3 h-3 text-gray-400 dark:text-white/30 flex-shrink-0" />
                                    <span className="text-[12px] font-medium text-gray-700 dark:text-white/70 truncate">{scope.email}</span>
                                  </div>
                                  {scope.updatedAt && (
                                    <p className="text-[10px] text-gray-400 dark:text-white/20 mt-0.5 ml-[18px]">
                                      Updated {new Date(scope.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <button
                                    onClick={() => {
                                      if (isEditing) {
                                        setEditingScopeEmail(null);
                                      } else {
                                        setEditingScopeEmail(scope.email);
                                        setEditingScopeIds(new Set(scope.allowedMosqueIds || []));
                                      }
                                    }}
                                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
                                    title="Edit scope"
                                  >
                                    <Pencil className="w-3 h-3 text-gray-400 dark:text-white/30" />
                                  </button>
                                  <button
                                    onClick={() => removeScope(scope.email)}
                                    disabled={isActionLoading}
                                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors disabled:opacity-50"
                                    title="Remove scope (grant full access)"
                                  >
                                    {isActionLoading ? (
                                      <Loader className="w-3 h-3 animate-spin text-gray-400 dark:text-white/30" />
                                    ) : (
                                      <ShieldOff className="w-3 h-3 text-gray-400 dark:text-white/30 hover:text-red-500 dark:hover:text-red-400" />
                                    )}
                                  </button>
                                </div>
                              </div>

                              {/* Current assigned masjids */}
                              {!isEditing && (
                                <div className="flex flex-wrap gap-1 ml-[18px]">
                                  {scopedNames.map((name: string, i: number) => (
                                    <span
                                      key={i}
                                      className="inline-flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded-full"
                                    >
                                      <Building2 className="w-2.5 h-2.5" />
                                      {name}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Editing mode */}
                              {isEditing && (
                                <div className="mt-2 pt-2 border-t border-gray-100 dark:border-white/[0.05]">
                                  <MasjidScopeDropdown
                                    mosques={mosques}
                                    selectedIds={editingScopeIds}
                                    onToggle={(mosqueId) => {
                                      const next = new Set(editingScopeIds);
                                      if (next.has(mosqueId)) next.delete(mosqueId);
                                      else next.add(mosqueId);
                                      setEditingScopeIds(next);
                                    }}
                                    label="Select masjids..."
                                  />
                                  <div className="flex gap-2 mt-2.5">
                                    <button
                                      onClick={() => updateExistingScope(scope.email, editingScopeIds)}
                                      disabled={editingScopeIds.size === 0 || isActionLoading}
                                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-950/30 active:scale-[0.98] transition-all disabled:opacity-50"
                                    >
                                      {isActionLoading ? <Loader className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                      Save
                                    </button>
                                    <button
                                      onClick={() => setEditingScopeEmail(null)}
                                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-gray-500 dark:text-white/50 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.08] rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06] active:scale-[0.98] transition-all"
                                    >
                                      <X className="w-3 h-3" />
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Refresh button */}
                      <button
                        onClick={fetchAllScopes}
                        disabled={scopesLoading}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-medium text-gray-500 dark:text-white/40 hover:bg-gray-50 dark:hover:bg-white/[0.03] rounded-lg transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3 h-3 ${scopesLoading ? 'animate-spin' : ''}`} />
                        Refresh
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Analytics — collapsed by default, loads on expand */}
        <motion.div {...stagger(0.36)}>
          <AnalyticsSection accessToken={accessToken} />
        </motion.div>

        {/* Footer spacing */}
        <div className="h-8" />
        </>
        )}
      </div>

      {/* Admin Help Chat FAB */}
      <AdminHelpChat
        mosques={scopeLoaded ? (adminScope ? mosques.filter(m => adminScope.includes(m.id)) : mosques) : mosques}
        accessToken={accessToken}
        onRefresh={onRefresh}
      />

      {/* Confirm Hide from Users Dialog */}
      {confirmHideMosque && (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmHideMosque(null); }}
        >
          <div className="bg-white dark:bg-[#1C1C1C] rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden">
            <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-orange-50 dark:bg-orange-950/40 flex items-center justify-center mb-4">
                <EyeOff className="w-6 h-6 text-orange-500 dark:text-orange-400" />
              </div>
              <h3 className="text-gray-900 dark:text-white text-lg">Hide from users?</h3>
              <p className="text-gray-500 dark:text-white/50 text-sm mt-1.5">
                <span className="font-medium text-gray-700 dark:text-white/70">{confirmHideMosque.name}</span> will be temporarily hidden from the public listing. You can restore it at any time.
              </p>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setConfirmHideMosque(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/[0.1] text-gray-700 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/[0.06] transition-colors active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                onClick={() => executeToggleUserVisibility(confirmHideMosque)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-orange-500 dark:bg-orange-600 text-white hover:bg-orange-600 dark:hover:bg-orange-700 transition-colors active:scale-[0.98]"
              >
                Hide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}