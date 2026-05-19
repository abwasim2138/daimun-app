import { useState, useEffect, useMemo } from 'react';
import { BarChart3, Users, Eye, TrendingUp, TrendingDown, Minus, Loader, ChevronDown, MapPin } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { API_URL, publicAnonKey } from '../utils/api';

// Helper: format a Date as YYYY-MM-DD in the user's local timezone
function toLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// User's IANA timezone (e.g. "America/New_York")
const CLIENT_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

interface DailyRecord {
  date: string;
  views: number;
  visitors: number;
  pages: Record<string, number>;
  cities: Record<string, number>;
}

interface AnalyticsSummary {
  today: { views: number; visitors: number };
  last7: { views: number; visitors: number };
  last30: { views: number; visitors: number };
}

interface AnalyticsData {
  summary: AnalyticsSummary;
  daily: DailyRecord[];
}

function StatCard({ label, value, icon: Icon, subValue, trend }: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  subValue?: string;
  trend?: 'up' | 'down' | 'flat';
}) {
  return (
    <div className="bg-white dark:bg-[#1C1C1C] rounded-2xl border border-gray-200 dark:border-white/[0.1] p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-3.5 h-3.5 text-gray-400 dark:text-white/30" />
        <span className="text-[11px] uppercase tracking-wider text-gray-400 dark:text-white/30 font-medium">{label}</span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className="text-2xl tabular-nums text-gray-900 dark:text-white">{value.toLocaleString()}</span>
        {trend && (
          <div className={`flex items-center gap-0.5 text-[11px] font-medium ${
            trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' :
            trend === 'down' ? 'text-red-500 dark:text-red-400' :
            'text-gray-400 dark:text-white/30'
          }`}>
            {trend === 'up' && <TrendingUp className="w-3 h-3" />}
            {trend === 'down' && <TrendingDown className="w-3 h-3" />}
            {trend === 'flat' && <Minus className="w-3 h-3" />}
          </div>
        )}
      </div>
      {subValue && (
        <span className="text-[11px] text-gray-400 dark:text-white/25 mt-1 block">{subValue}</span>
      )}
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-[#2A2A2A] border border-gray-200 dark:border-white/[0.15] rounded-xl px-3 py-2.5 shadow-lg text-[12px]">
      <div className="text-gray-500 dark:text-white/40 mb-1.5">
        {new Date(label + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400" />
        <span className="text-gray-600 dark:text-white/60">Views:</span>
        <span className="font-medium text-gray-900 dark:text-white tabular-nums">{payload[0]?.value?.toLocaleString()}</span>
      </div>
      <div className="flex items-center gap-2 mt-0.5">
        <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
        <span className="text-gray-600 dark:text-white/60">Visitors:</span>
        <span className="font-medium text-gray-900 dark:text-white tabular-nums">{payload[1]?.value?.toLocaleString()}</span>
      </div>
    </div>
  );
}

export function AnalyticsSection({ accessToken }: { accessToken: string | null }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    if (!accessToken || !expanded) return;
    if (hasFetched) return;
    let cancelled = false;
    const fetchAnalytics = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_URL}/analytics/summary?tz=${encodeURIComponent(CLIENT_TZ)}`, {
          headers: {
            'apikey': publicAnonKey,
            'Authorization': `Bearer ${accessToken}`,
          },
        });
        if (res.ok && !cancelled) {
          const json = await res.json();
          setData(json);
          setHasFetched(true);
        } else if (!cancelled) {
          setError(true);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetchAnalytics();
    return () => { cancelled = true; };
  }, [accessToken, expanded, hasFetched]);

  // Compute 7-day trend: compare current 7d to previous 7d
  const trend7d = useMemo<'up' | 'down' | 'flat'>(() => {
    if (!data?.daily || data.daily.length < 8) return 'flat';
    const today = new Date();
    const sevenDaysAgo = toLocalDateStr(new Date(today.getTime() - 7 * 86400000));
    const fourteenDaysAgo = toLocalDateStr(new Date(today.getTime() - 14 * 86400000));
    const curr = data.daily.filter(d => d.date >= sevenDaysAgo).reduce((s, d) => s + d.visitors, 0);
    const prev = data.daily.filter(d => d.date >= fourteenDaysAgo && d.date < sevenDaysAgo).reduce((s, d) => s + d.visitors, 0);
    if (curr > prev) return 'up';
    if (curr < prev) return 'down';
    return 'flat';
  }, [data]);

  // Chart data: last 30 days, fill missing days with 0
  const chartData = useMemo(() => {
    if (!data?.daily) return [];
    const map = new Map(data.daily.map(d => [d.date, d]));
    const days: { date: string; views: number; visitors: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = toLocalDateStr(new Date(Date.now() - i * 86400000));
      const record = map.get(d);
      days.push({ date: d, views: record?.views || 0, visitors: record?.visitors || 0 });
    }
    return days;
  }, [data]);

  // Top pages from last 7 days
  const topPages = useMemo(() => {
    if (!data?.daily) return [];
    const sevenDaysAgo = toLocalDateStr(new Date(Date.now() - 7 * 86400000));
    const pageCounts: Record<string, number> = {};
    data.daily.filter(d => d.date >= sevenDaysAgo).forEach(d => {
      Object.entries(d.pages || {}).forEach(([page, count]) => {
        pageCounts[page] = (pageCounts[page] || 0) + count;
      });
    });
    return Object.entries(pageCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([page, count]) => ({
        page: page === '/' ? 'Home' : page.replace('#/', '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Home',
        count,
      }));
  }, [data]);

  // Top cities from last 7 days
  const topCities = useMemo(() => {
    if (!data?.daily) return [];
    const sevenDaysAgo = toLocalDateStr(new Date(Date.now() - 7 * 86400000));
    const cityCounts: Record<string, number> = {};
    data.daily.filter(d => d.date >= sevenDaysAgo).forEach(d => {
      Object.entries(d.cities || {}).forEach(([city, count]) => {
        cityCounts[city] = (cityCounts[city] || 0) + count;
      });
    });
    const total = Object.values(cityCounts).reduce((s, c) => s + c, 0);
    return Object.entries(cityCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([city, count]) => ({
        city,
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
      }));
  }, [data]);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 px-1 mb-3 w-full"
      >
        <BarChart3 className="w-4 h-4 text-gray-400 dark:text-white/30" />
        <h3 className="text-sm font-medium text-gray-500 dark:text-white/40">Analytics</h3>
        {isLoading && <Loader className="w-3 h-3 text-gray-400 dark:text-white/25 animate-spin" />}
        {data && !isLoading && (
          <span className="text-[11px] text-gray-400 dark:text-white/25">
            {data.summary.today.visitors} today
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 dark:text-white/30 ml-auto transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader className="w-5 h-5 text-gray-400 dark:text-white/30 animate-spin" />
            </div>
          ) : data ? (
            <>
              {/* Stat cards */}
              <div className="grid grid-cols-3 gap-2">
                <StatCard
                  label="Today"
                  value={data.summary.today.visitors}
                  icon={Users}
                  subValue={`${data.summary.today.views} views`}
                />
                <StatCard
                  label="7 Days"
                  value={data.summary.last7.visitors}
                  icon={Eye}
                  subValue={`${data.summary.last7.views} views`}
                  trend={trend7d}
                />
                <StatCard
                  label="30 Days"
                  value={data.summary.last30.visitors}
                  icon={TrendingUp}
                  subValue={`${data.summary.last30.views} views`}
                />
              </div>

              {/* Chart */}
              {chartData.length > 0 && (
                <div className="bg-white dark:bg-[#1C1C1C] rounded-2xl border border-gray-200 dark:border-white/[0.1] p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-[11px] uppercase tracking-wider text-gray-400 dark:text-white/30 font-medium">Last 30 Days</span>
                    <div className="flex items-center gap-3 ml-auto">
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-400 dark:bg-blue-500" />
                        <span className="text-[10px] text-gray-400 dark:text-white/25">Views</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 dark:bg-emerald-500" />
                        <span className="text-[10px] text-gray-400 dark:text-white/25">Visitors</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ width: '100%', height: 160 }}>
                    <ResponsiveContainer width="100%" height={160} minWidth={0} minHeight={0}>
                      <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.2} />
                            <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="visitorsGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10B981" stopOpacity={0.2} />
                            <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-100 dark:text-white/[0.06]" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10 }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(d: string) => {
                            const date = new Date(d + 'T12:00:00');
                            return date.getDate() === 1 || chartData.findIndex(c => c.date === d) % 7 === 0
                              ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                              : '';
                          }}
                          className="text-gray-400 dark:text-white/25"
                        />
                        <YAxis
                          tick={{ fontSize: 10 }}
                          tickLine={false}
                          axisLine={false}
                          allowDecimals={false}
                          className="text-gray-400 dark:text-white/25"
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="views"
                          stroke="#3B82F6"
                          strokeWidth={1.5}
                          fill="url(#viewsGrad)"
                        />
                        <Area
                          type="monotone"
                          dataKey="visitors"
                          stroke="#10B981"
                          strokeWidth={1.5}
                          fill="url(#visitorsGrad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Top pages */}
              {topPages.length > 0 && (
                <div className="bg-white dark:bg-[#1C1C1C] rounded-2xl border border-gray-200 dark:border-white/[0.1] overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-white/[0.06]">
                    <span className="text-[11px] uppercase tracking-wider text-gray-400 dark:text-white/30 font-medium">Top Pages (7d)</span>
                  </div>
                  <div className="divide-y divide-gray-50 dark:divide-white/[0.03]">
                    {topPages.map((p, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-[13px] text-gray-700 dark:text-white/70">{p.page}</span>
                        <span className="text-[12px] tabular-nums text-gray-400 dark:text-white/30 font-medium">{p.count.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top cities */}
              {topCities.length > 0 && (
                <div className="bg-white dark:bg-[#1C1C1C] rounded-2xl border border-gray-200 dark:border-white/[0.1] overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-white/[0.06]">
                    <span className="text-[11px] uppercase tracking-wider text-gray-400 dark:text-white/30 font-medium">Top Cities (7d)</span>
                  </div>
                  <div className="divide-y divide-gray-50 dark:divide-white/[0.03]">
                    {topCities.map((c, i) => (
                      <div key={i} className="px-4 py-2.5">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-gray-400 dark:text-white/25 flex-shrink-0" strokeWidth={2} />
                            <span className="text-[13px] text-gray-700 dark:text-white/70">{c.city}</span>
                          </div>
                          <span className="text-[12px] tabular-nums text-gray-400 dark:text-white/30 font-medium">{c.count.toLocaleString()} <span className="text-gray-300 dark:text-white/20">({c.pct}%)</span></span>
                        </div>
                        <div className="h-1 rounded-full bg-gray-100 dark:bg-white/[0.06] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-400/60 dark:bg-blue-500/40"
                            style={{ width: `${c.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white dark:bg-[#1C1C1C] rounded-2xl border border-gray-200 dark:border-white/[0.1] p-6 text-center">
              <BarChart3 className="w-8 h-8 text-gray-300 dark:text-white/15 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-white/40">{error ? 'Unable to load analytics' : 'No analytics data yet'}</p>
              <p className="text-xs text-gray-400 dark:text-white/25 mt-1">{error ? 'Check that the edge function is deployed' : 'Data will appear after visitors start using the app'}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}