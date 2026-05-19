import { useState, useEffect, useMemo, useCallback } from 'react';
import { ArrowLeft, Share2, MapPin, Users, Coffee, PartyPopper, Phone, Globe, MessageCircle, Clock, Search, BookOpen } from 'lucide-react';
import { motion } from 'motion/react';
import { SITE_URL, API_URL } from '../utils/api';
import { publicAnonKey } from '../utils/supabase/info';
import { Mosque } from '../App';
import { toast } from 'sonner@2.0.3';
import { navigate } from '../utils/router';

interface EidTimesPageProps {
  onBack: () => void;
}

/* ─── Fade-up wrapper ─── */
function FadeUp({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Calculate distance between two points (Haversine formula) ─── */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function EidTimesPage({ onBack }: EidTimesPageProps) {
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          // Silently fail if location is denied
        }
      );
    }
  }, []);

  useEffect(() => {
    const fetchMosques = async () => {
      try {
        const res = await fetch(`${API_URL}/mosques`, {
          headers: {
            'apikey': publicAnonKey,
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          // The API returns { mosques: [...] }, not an array directly
          const mosquesArray = data.mosques || data || [];
          // Ensure we have an array before filtering
          if (Array.isArray(mosquesArray)) {
            setMosques(mosquesArray.filter((m: Mosque) => !m.temporarilyHidden));
          } else {
            console.error('API did not return an array:', data);
            setMosques([]);
          }
        } else {
          console.error('Failed to fetch mosques:', res.status, res.statusText);
          setMosques([]);
        }
      } catch (err) {
        console.error('Failed to fetch mosques:', err);
        setMosques([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMosques();
  }, []);

  const handleShare = useCallback(async () => {
    const url = `${SITE_URL}/eid-times`;
    const shareData = {
      title: 'Eid al-Fitr Prayer Times — Dāimūn',
      text: 'Find Eid prayer times at your local masjid. Eid Mubarak!',
      url,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
    }
  }, []);

  // Extract Eid times from events or eidInfo
  const getEidTimes = useCallback((mosque: Mosque): string[] => {
    // Check for eidInfo field
    if (mosque.eidInfo?.prayerTimes && mosque.eidInfo.prayerTimes.length > 0) {
      return mosque.eidInfo.prayerTimes;
    }

    // Fallback: look for Eid events (events with "eid" in title on today or tomorrow)
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const eidEvents = mosque.events?.filter(e => {
      const isEidDate = e.date === today || e.date === tomorrow;
      const isEidEvent = e.title.toLowerCase().includes('eid');
      return isEidDate && isEidEvent;
    }) || [];

    return eidEvents.map(e => e.time);
  }, []);

  // Filter mosques by search and only show those with Eid info
  const filteredMosques = useMemo(() => {
    let result = mosques;
    
    // First filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.address.toLowerCase().includes(q)
      );
    }
    
    // Then filter to only show mosques with Eid info
    result = result.filter(m => {
      const eidTimes = getEidTimes(m);
      return eidTimes.length > 0 || !!m.eidInfo;
    });
    
    // Sort by distance if user location is available
    if (userLocation) {
      result = result.sort((a, b) => {
        const distA = calculateDistance(userLocation.lat, userLocation.lng, a.latitude, a.longitude);
        const distB = calculateDistance(userLocation.lat, userLocation.lng, b.latitude, b.longitude);
        return distA - distB;
      });
    }
    
    return result;
  }, [mosques, searchQuery, getEidTimes, userLocation]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a]">
      {/* ── Sticky header ─── */}
      <div className="bg-white/80 dark:bg-black/80 border-b border-gray-200/50 dark:border-white/[0.06] sticky top-0 z-20 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center justify-between">
          <button onClick={onBack}
            className="flex items-center gap-2 text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white transition-colors -ml-1 p-1">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Back</span>
          </button>
          <span className="text-sm text-gray-400 dark:text-white/40">Eid Prayer Times</span>
          <button onClick={handleShare}
            className="p-2 -mr-1 text-gray-400 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/70 transition-colors rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
            aria-label="Share this page">
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 pb-16">
        {/* ━━━ HERO ━━━ */}
        <FadeUp delay={0} className="pt-8 pb-4 text-center">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.1 }}
            className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 mx-auto mb-4">
            <PartyPopper className="w-7 h-7 text-white" />
          </motion.div>
          <h1 className="text-2xl sm:text-3xl tracking-wide mb-2 text-gray-900 dark:text-white/90">
            Eid al-Fitr 1447
          </h1>
          <p className="text-gray-500 dark:text-white/45 text-sm mb-1" style={{ lineHeight: '1.5' }}>
            Friday, March 20, 2026 (Shawwal 1, 1447 AH)
          </p>
          <p className="text-emerald-600 dark:text-emerald-400 text-lg font-medium">
            Eid Mubarak! 🌙
          </p>
        </FadeUp>

        {/* ━━━ EID GUIDE LINK ━━━ */}
        <FadeUp delay={0.05} className="mb-4">
          <button
            onClick={() => navigate('/eid-guide')}
            className="w-full rounded-xl bg-amber-50 dark:bg-amber-500/[0.08] border border-amber-200/60 dark:border-amber-500/20 px-4 py-3 hover:bg-amber-100 dark:hover:bg-amber-500/[0.12] transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <span className="text-sm text-amber-900 dark:text-amber-100 font-medium">
                  Eid Guide: Sunnahs, Prayer & More
                </span>
              </div>
              <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </FadeUp>

        {/* ━━━ SEARCH BAR ━━━ */}
        <FadeUp delay={0.1} className="mb-6">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-white/30 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by masjid name or city..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] text-gray-900 dark:text-white/90 text-sm placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:focus:ring-emerald-400/30"
            />
          </div>
        </FadeUp>

        {/* ━━━ MOSQUE LIST ━━━ */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-400 dark:text-white/30 text-sm">Loading mosques...</div>
          </div>
        ) : filteredMosques.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 dark:text-white/30 text-sm">
              {searchQuery ? 'No mosques found matching your search.' : 'No mosques available.'}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMosques.map((mosque, idx) => {
              const eidTimes = getEidTimes(mosque);
              const eidInfo = mosque.eidInfo;

              return (
                <FadeUp key={mosque.id} delay={0.15 + idx * 0.03}>
                  <div className="rounded-2xl bg-white/80 dark:bg-white/[0.04] border border-gray-200/60 dark:border-white/[0.06] p-4">
                    {/* Mosque name & location */}
                    <div className="mb-3">
                      <h3 className="text-base font-medium text-gray-900 dark:text-white/90 mb-1">
                        {mosque.name}
                      </h3>
                      <div className="flex items-start gap-1.5 text-xs text-gray-500 dark:text-white/45">
                        <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        <span style={{ lineHeight: '1.5' }}>{mosque.address}</span>
                      </div>
                    </div>

                    {/* Eid prayer times */}
                    {eidTimes.length > 0 && (
                      <div className="mb-3">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-xs text-gray-500 dark:text-white/45 uppercase tracking-wider">
                            Prayer Time{eidTimes.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {eidTimes.map((time, i) => (
                            <div
                              key={i}
                              className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/[0.08] border border-emerald-200/40 dark:border-emerald-500/20"
                            >
                              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                                {time}
                              </span>
                              {eidTimes.length > 1 && (
                                <span className="text-xs text-emerald-600/60 dark:text-emerald-400/60 ml-1">
                                  #{i + 1}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Additional info tags */}
                    {eidInfo && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {eidInfo.sistersAccommodation && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-500/[0.06] border border-sky-200/40 dark:border-sky-500/15">
                            <Users className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                            <span className="text-[11px] text-sky-700 dark:text-sky-300">Sisters space</span>
                          </div>
                        )}
                        {eidInfo.refreshments && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-500/[0.06] border border-amber-200/40 dark:border-amber-500/15">
                            <Coffee className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            <span className="text-[11px] text-amber-700 dark:text-amber-300">Refreshments</span>
                          </div>
                        )}
                        {eidInfo.carnival && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-50 dark:bg-violet-500/[0.06] border border-violet-200/40 dark:border-violet-500/15">
                            <PartyPopper className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                            <span className="text-[11px] text-violet-700 dark:text-violet-300">Activities</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Carnival/Activities details */}
                    {eidInfo?.carnival && eidInfo?.carnivalDetails && (
                      <div className="mb-3 ml-1">
                        <p className="text-xs text-violet-700 dark:text-violet-300" style={{ lineHeight: '1.6' }}>
                          🎉 {eidInfo.carnivalDetails}
                        </p>
                      </div>
                    )}

                    {/* Notes */}
                    {eidInfo?.notes && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-600 dark:text-white/50" style={{ lineHeight: '1.6' }}>
                          {eidInfo.notes}
                        </p>
                      </div>
                    )}

                    {/* Contact & links */}
                    <div className="flex flex-wrap gap-2 text-xs">
                      {eidInfo?.contact && (
                        <a
                          href={`tel:${eidInfo.contact.phone}`}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-white/50 hover:bg-gray-200 dark:hover:bg-white/[0.10] transition-colors"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{eidInfo.contact.name}</span>
                        </a>
                      )}
                      {mosque.website && (
                        <a
                          href={mosque.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-white/50 hover:bg-gray-200 dark:hover:bg-white/[0.10] transition-colors"
                        >
                          <Globe className="w-3 h-3" />
                          <span>Website</span>
                        </a>
                      )}
                      {(mosque.whatsappChannel || eidInfo?.whatsapp) && (
                        <a
                          href={mosque.whatsappChannel || eidInfo?.whatsapp}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-white/50 hover:bg-gray-200 dark:hover:bg-white/[0.10] transition-colors"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </div>
                  </div>
                </FadeUp>
              );
            })}
          </div>
        )}

        {/* ━━━ BOTTOM NOTICE ━━━ */}
        <FadeUp delay={0.3} className="mt-8">
          <div className="rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-white/[0.08] dark:via-white/[0.05] dark:to-white/[0.08] border border-gray-700/50 dark:border-white/[0.08] p-5 text-center">
            <p className="text-white/70 dark:text-white/60 text-xs" style={{ lineHeight: '1.7' }}>
              Times shown are based on available information. Please confirm with your local masjid before attending.
            </p>
          </div>
        </FadeUp>
      </div>
    </div>
  );
}