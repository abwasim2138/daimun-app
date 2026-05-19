import { useState, useEffect } from 'react';
import { ArrowLeft, ExternalLink, HandHeart, Loader } from 'lucide-react';
import { API_URL, publicAnonKey } from '../utils/api';

export interface CharityLink {
  id: string;
  title: string;
  description?: string | null;
  link: string;
  category?: string | null;
  mosqueId?: string | null;
  mosqueName?: string | null;
  createdAt: string;
  updatedAt?: string;
}

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  zakat: { label: 'Zakat', color: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/30' },
  sadaqah: { label: 'Sadaqah', color: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/30' },
  'building-fund': { label: 'Building Fund', color: 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/30' },
  'zakat-ul-fitr': { label: 'Zakat ul-Fitr', color: 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800/30' },
  other: { label: 'Other', color: 'bg-gray-50 dark:bg-white/[0.06] text-gray-600 dark:text-white/50 border-gray-200 dark:border-white/[0.1]' },
};

interface CharityPageProps {
  onBack: () => void;
}

export function CharityPage({ onBack }: CharityPageProps) {
  const [charities, setCharities] = useState<CharityLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'general' | 'masjid'>('all');

  useEffect(() => {
    let cancelled = false;
    const fetchCharities = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_URL}/charities`, {
          headers: {
            'apikey': publicAnonKey,
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && Array.isArray(data.charities)) {
            setCharities(data.charities);
          }
        } else {
          if (!cancelled) setError('Failed to load charity links');
        }
      } catch {
        if (!cancelled) setError('Failed to load charity links');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetchCharities();
    return () => { cancelled = true; };
  }, []);

  const filtered = filter === 'all'
    ? charities
    : filter === 'general'
      ? charities.filter(c => !c.mosqueId)
      : charities.filter(c => !!c.mosqueId);

  // Group masjid-specific ones by mosque name
  const generalLinks = filtered.filter(c => !c.mosqueId);
  const masjidLinks = filtered.filter(c => !!c.mosqueId);
  const masjidGroups = masjidLinks.reduce<Record<string, CharityLink[]>>((acc, c) => {
    const key = c.mosqueName || c.mosqueId || 'Unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0A0A0A]">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-gray-200/60 dark:border-white/[0.06]">
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.08] transition-colors active:scale-95"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-white/70" />
          </button>
          <div className="flex-1">
            <h1 className="text-[17px] font-semibold text-gray-900 dark:text-white">Give</h1>
            <p className="text-[12px] text-gray-500 dark:text-white/40">Support your community</p>
          </div>
          <HandHeart className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-5">
        {/* Motivational ayah */}
        <div className="mb-6 p-4 bg-emerald-50/60 dark:bg-emerald-950/15 border border-emerald-200/40 dark:border-emerald-800/20 rounded-2xl text-center">
          <p className="text-[13px] text-emerald-800 dark:text-emerald-300 leading-relaxed italic">
            "Who is it that would loan Allah a goodly loan so He may multiply it for him many times over?"
          </p>
          <p className="text-[11px] text-emerald-600/70 dark:text-emerald-400/50 mt-1.5">— Al-Baqarah 2:245</p>
        </div>

        {/* Filter tabs */}
        {charities.length > 0 && (
          <div className="flex items-center gap-2 mb-5">
            {(['all', 'general', 'masjid'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3.5 py-1.5 rounded-full text-[13px] transition-all active:scale-95 ${
                  filter === f
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium'
                    : 'bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-white/50 hover:bg-gray-200 dark:hover:bg-white/[0.1]'
                }`}
              >
                {f === 'all' ? 'All' : f === 'general' ? 'Community-wide' : 'Masjid-specific'}
              </button>
            ))}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader className="w-5 h-5 text-gray-400 dark:text-white/30 animate-spin" />
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-2xl p-5 text-center">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && charities.length === 0 && (
          <div className="text-center py-16">
            <HandHeart className="w-10 h-10 text-gray-300 dark:text-white/15 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-white/40 mb-1">No donation links yet</p>
            <p className="text-sm text-gray-400 dark:text-white/25">Check back later — admins will post charity links here.</p>
          </div>
        )}

        {/* No results for filter */}
        {!isLoading && !error && charities.length > 0 && filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-gray-500 dark:text-white/40">No links in this category</p>
          </div>
        )}

        {/* General (community-wide) links */}
        {!isLoading && generalLinks.length > 0 && (
          <div className="mb-6">
            {filter === 'all' && masjidLinks.length > 0 && (
              <div className="text-[13px] uppercase tracking-widest text-gray-400 dark:text-white/35 font-medium mb-3">Community-wide</div>
            )}
            <div className="space-y-3">
              {generalLinks.map(c => (
                <CharityCard key={c.id} charity={c} />
              ))}
            </div>
          </div>
        )}

        {/* Masjid-specific links grouped */}
        {!isLoading && Object.keys(masjidGroups).length > 0 && (
          <div>
            {filter === 'all' && generalLinks.length > 0 && (
              <div className="text-[13px] uppercase tracking-widest text-gray-400 dark:text-white/35 font-medium mb-3">Masjid-specific</div>
            )}
            <div className="space-y-4">
              {Object.entries(masjidGroups).map(([mosqueName, links]) => (
                <div key={mosqueName}>
                  <div className="flex items-center gap-2 mb-2">
                    <MosqueIcon className="w-3.5 h-3.5 text-gray-400 dark:text-white/30" />
                    <span className="text-[13px] font-medium text-gray-600 dark:text-white/50">{mosqueName}</span>
                  </div>
                  <div className="space-y-3">
                    {links.map(c => (
                      <CharityCard key={c.id} charity={c} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CharityCard({ charity }: { charity: CharityLink }) {
  const catMeta = charity.category ? CATEGORY_META[charity.category] : null;

  return (
    <a
      href={charity.link.startsWith('http') ? charity.link : `https://${charity.link}`}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-white dark:bg-[#1C1C1C] rounded-2xl border border-gray-200 dark:border-white/[0.08] p-4 hover:border-emerald-300 dark:hover:border-emerald-500/30 hover:shadow-sm transition-all active:scale-[0.98] group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-[15px] text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
            {charity.title}
          </h3>
          {charity.description && (
            <p className="text-[13px] text-gray-500 dark:text-white/50 mt-1 leading-relaxed">
              {charity.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {catMeta && (
              <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full border ${catMeta.color}`}>
                {catMeta.label}
              </span>
            )}
            {charity.mosqueName && (
              <span className="inline-flex items-center gap-1 text-[11px] text-gray-400 dark:text-white/30">
                <MosqueIcon className="w-3 h-3" />
                {charity.mosqueName}
              </span>
            )}
          </div>
        </div>
        <ExternalLink className="w-4 h-4 text-gray-400 dark:text-white/25 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 flex-shrink-0 mt-0.5 transition-colors" />
      </div>
    </a>
  );
}

// Simple mosque dome icon matching lucide style
function MosqueIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="4.5" r="1.5" />
      <path d="M5 14 C5 8.5 8 6.5 12 6.5 C16 6.5 19 8.5 19 14" />
      <rect x="5" y="14" width="14" height="6" rx="0.5" />
      <path d="M10 20 v-3.5 a2 2 0 0 1 4 0 V20" />
    </svg>
  );
}
