import { useState, useEffect } from 'react';
import { ArrowLeft, ExternalLink, Heart, Loader } from 'lucide-react';
import { API_URL, publicAnonKey } from '../utils/api';

export interface VolunteerOpportunity {
  id: string;
  title: string;
  description?: string | null;
  link: string;
  mosqueId?: string | null;
  mosqueName?: string | null;
  createdAt: string;
  updatedAt?: string;
}

interface VolunteersPageProps {
  onBack: () => void;
}

export function VolunteersPage({ onBack }: VolunteersPageProps) {
  const [volunteers, setVolunteers] = useState<VolunteerOpportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'general' | 'masjid'>('all');

  useEffect(() => {
    let cancelled = false;
    const fetchVolunteers = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_URL}/volunteers`, {
          headers: {
            'apikey': publicAnonKey,
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && Array.isArray(data.volunteers)) {
            setVolunteers(data.volunteers);
          }
        } else {
          if (!cancelled) setError('Failed to load opportunities');
        }
      } catch {
        if (!cancelled) setError('Failed to load opportunities');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetchVolunteers();
    return () => { cancelled = true; };
  }, []);

  const filtered = filter === 'all'
    ? volunteers
    : filter === 'general'
      ? volunteers.filter(v => !v.mosqueId)
      : volunteers.filter(v => !!v.mosqueId);

  // Group masjid-specific ones by mosque name
  const generalOpps = filtered.filter(v => !v.mosqueId);
  const masjidOpps = filtered.filter(v => !!v.mosqueId);
  const masjidGroups = masjidOpps.reduce<Record<string, VolunteerOpportunity[]>>((acc, v) => {
    const key = v.mosqueName || v.mosqueId || 'Unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(v);
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
            <h1 className="text-[17px] font-semibold text-gray-900 dark:text-white">Volunteer</h1>
            <p className="text-[12px] text-gray-500 dark:text-white/40">Serve your community</p>
          </div>
          <Heart className="w-5 h-5 text-rose-500 dark:text-rose-400" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-5">
        {/* Filter tabs */}
        {volunteers.length > 0 && (
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
        {!isLoading && !error && volunteers.length === 0 && (
          <div className="text-center py-16">
            <Heart className="w-10 h-10 text-gray-300 dark:text-white/15 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-white/40 mb-1">No volunteer opportunities yet</p>
            <p className="text-sm text-gray-400 dark:text-white/25">Check back later — admins will post opportunities here.</p>
          </div>
        )}

        {/* No results for filter */}
        {!isLoading && !error && volunteers.length > 0 && filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-gray-500 dark:text-white/40">No opportunities in this category</p>
          </div>
        )}

        {/* General (community-wide) opportunities */}
        {!isLoading && generalOpps.length > 0 && (
          <div className="mb-6">
            {filter === 'all' && masjidOpps.length > 0 && (
              <div className="text-[13px] uppercase tracking-widest text-gray-400 dark:text-white/35 font-medium mb-3">Community-wide</div>
            )}
            <div className="space-y-3">
              {generalOpps.map(v => (
                <VolunteerCard key={v.id} volunteer={v} />
              ))}
            </div>
          </div>
        )}

        {/* Masjid-specific opportunities grouped */}
        {!isLoading && Object.keys(masjidGroups).length > 0 && (
          <div>
            {filter === 'all' && generalOpps.length > 0 && (
              <div className="text-[13px] uppercase tracking-widest text-gray-400 dark:text-white/35 font-medium mb-3">Masjid-specific</div>
            )}
            <div className="space-y-4">
              {Object.entries(masjidGroups).map(([mosqueName, opps]) => (
                <div key={mosqueName}>
                  <div className="flex items-center gap-2 mb-2">
                    <MosqueIcon className="w-3.5 h-3.5 text-gray-400 dark:text-white/30" />
                    <span className="text-[13px] font-medium text-gray-600 dark:text-white/50">{mosqueName}</span>
                  </div>
                  <div className="space-y-3">
                    {opps.map(v => (
                      <VolunteerCard key={v.id} volunteer={v} />
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

function VolunteerCard({ volunteer }: { volunteer: VolunteerOpportunity }) {
  return (
    <a
      href={volunteer.link.startsWith('http') ? volunteer.link : `https://${volunteer.link}`}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-white dark:bg-[#1C1C1C] rounded-2xl border border-gray-200 dark:border-white/[0.08] p-4 hover:border-rose-300 dark:hover:border-rose-500/30 hover:shadow-sm transition-all active:scale-[0.98] group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-[15px] text-gray-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
            {volunteer.title}
          </h3>
          {volunteer.description && (
            <p className="text-[13px] text-gray-500 dark:text-white/50 mt-1 leading-relaxed">
              {volunteer.description}
            </p>
          )}
          {volunteer.mosqueName && (
            <div className="flex items-center gap-1.5 mt-2">
              <MosqueIcon className="w-3 h-3 text-gray-400 dark:text-white/25" />
              <span className="text-[12px] text-gray-400 dark:text-white/30">{volunteer.mosqueName}</span>
            </div>
          )}
        </div>
        <ExternalLink className="w-4 h-4 text-gray-400 dark:text-white/25 group-hover:text-rose-500 dark:group-hover:text-rose-400 flex-shrink-0 mt-0.5 transition-colors" />
      </div>
    </a>
  );
}

// Simple mosque dome icon matching lucide style
function MosqueIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Crescent finial */}
      <circle cx="12" cy="4.5" r="1.5" />
      {/* Dome */}
      <path d="M5 14 C5 8.5 8 6.5 12 6.5 C16 6.5 19 8.5 19 14" />
      {/* Base walls */}
      <rect x="5" y="14" width="14" height="6" rx="0.5" />
      {/* Door */}
      <path d="M10 20 v-3.5 a2 2 0 0 1 4 0 V20" />
    </svg>
  );
}