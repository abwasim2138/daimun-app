import { useState, useEffect, useCallback } from 'react';
import { Inbox, Check, X, Trash2, Clock, Flag, AlertTriangle, Loader, ChevronDown, ChevronUp, RefreshCw, CheckCircle } from 'lucide-react';
import { Mosque } from '../App';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { API_URL } from '../utils/api';

interface TimeCorrection {
  id: string;
  mosqueId: string;
  mosqueName: string;
  prayers: string[];
  reportType: 'wrong-time' | 'outdated' | 'other';
  correctTime: string | null;
  notes: string | null;
  currentTimes: Record<string, string>;
  status: 'pending' | 'accepted' | 'dismissed';
  createdAt: string;
  reviewedAt?: string;
}

interface CorrectionInboxProps {
  mosques: Mosque[];
  accessToken: string | null;
  onEditMosque: (mosque: Mosque) => void;
  hideHeader?: boolean;
  onCountChange?: (pending: number, total: number) => void;
}

const PRAYER_LABELS: Record<string, string> = {
  fajr: 'Fajr', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha', jumuah: 'Jumuah',
};

const REPORT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  'wrong-time': { label: 'Incorrect time', color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/30' },
  'outdated': { label: 'Outdated', color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/30' },
  'other': { label: 'Other', color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/30' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function CorrectionInbox({ mosques, accessToken, onEditMosque, hideHeader, onCountChange }: CorrectionInboxProps) {
  const [corrections, setCorrections] = useState<TimeCorrection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  // API_URL imported from /utils/api.ts

  // Admin headers: user JWT in Authorization for requireAuth, apikey for Supabase gateway
  const adminHeaders = {
    'Authorization': `Bearer ${accessToken}`,
    'apikey': publicAnonKey,
  };

  const fetchCorrections = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/time-corrections`, {
        headers: adminHeaders,
      });
      if (response.ok) {
        const data = await response.json();
        setCorrections(data.corrections || []);
      }
    } catch (err) {
      console.error('Error fetching corrections:', err);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchCorrections();
  }, [fetchCorrections]);

  const updateStatus = useCallback(async (id: string, status: 'accepted' | 'dismissed') => {
    if (!accessToken) return;
    setProcessingIds(prev => new Set(prev).add(id));

    try {
      const response = await fetch(`${API_URL}/time-corrections/${id}`, {
        method: 'PUT',
        headers: {
          ...adminHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        setCorrections(prev =>
          prev.map(c => c.id === id ? { ...c, status, reviewedAt: new Date().toISOString() } : c)
        );
      }
    } catch (err) {
      console.error('Error updating correction:', err);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [accessToken]);

  const deleteCorrection = useCallback(async (id: string) => {
    if (!accessToken) return;
    setProcessingIds(prev => new Set(prev).add(id));

    try {
      const response = await fetch(`${API_URL}/time-corrections/${id}`, {
        method: 'DELETE',
        headers: adminHeaders,
      });

      if (response.ok) {
        setCorrections(prev => prev.filter(c => c.id !== id));
      }
    } catch (err) {
      console.error('Error deleting correction:', err);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [accessToken]);

  const filteredCorrections = filter === 'pending'
    ? corrections.filter(c => c.status === 'pending')
    : corrections;

  const pendingCount = corrections.filter(c => c.status === 'pending').length;

  useEffect(() => {
    if (onCountChange) {
      onCountChange(pendingCount, corrections.length);
    }
  }, [pendingCount, corrections.length, onCountChange]);

  return (
    <div>
      {/* Section header */}
      {!hideHeader && (
        <div className="flex items-center justify-between px-1 mb-3">
          <div className="flex items-center gap-2">
            <Inbox className="w-4 h-4 text-gray-400 dark:text-white/30" />
            <h3 className="text-sm font-medium text-gray-500 dark:text-white/40">Community Reports</h3>
            {pendingCount > 0 && (
              <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                {pendingCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter(f => f === 'pending' ? 'all' : 'pending')}
              className="text-[12px] text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/60 transition-colors"
            >
              {filter === 'pending' ? 'Show all' : 'Pending only'}
            </button>
            <button
              onClick={fetchCorrections}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-lg transition-colors active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-gray-400 dark:text-white/30 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      )}

      {hideHeader && (
        <div className="flex items-center justify-end gap-2 mb-3">
          <button
            onClick={() => setFilter(f => f === 'pending' ? 'all' : 'pending')}
            className="text-[12px] text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/60 transition-colors"
          >
            {filter === 'pending' ? 'Show all' : 'Pending only'}
          </button>
          <button
            onClick={fetchCorrections}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-lg transition-colors active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-gray-400 dark:text-white/30 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      )}

      {/* Loading */}
      {isLoading && corrections.length === 0 && (
        <div className="bg-white dark:bg-[#1C1C1C] rounded-2xl border border-gray-200 dark:border-white/[0.1] p-6 text-center">
          <Loader className="w-5 h-5 text-gray-400 dark:text-white/30 mx-auto animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filteredCorrections.length === 0 && (
        <div className="bg-white dark:bg-[#1C1C1C] rounded-2xl border border-gray-200 dark:border-white/[0.1] p-6 text-center">
          <CheckCircle className="w-8 h-8 text-emerald-300 dark:text-emerald-800/50 mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-white/40 mb-1">
            {filter === 'pending' ? 'No pending reports' : 'No reports yet'}
          </p>
          <p className="text-xs text-gray-400 dark:text-white/25">
            {filter === 'pending' ? 'All community reports have been reviewed' : 'Reports from community members will appear here'}
          </p>
        </div>
      )}

      {/* Report cards */}
      {filteredCorrections.length > 0 && (
        <div className="space-y-2">
          {filteredCorrections.map(correction => {
            const isExpanded = expandedId === correction.id;
            const isProcessing = processingIds.has(correction.id);
            const mosque = mosques.find(m => m.id === correction.mosqueId);
            const typeInfo = REPORT_TYPE_LABELS[correction.reportType] || REPORT_TYPE_LABELS['other'];

            return (
              <div
                key={correction.id}
                className={`bg-white dark:bg-[#1C1C1C] rounded-2xl border overflow-hidden transition-colors ${
                  correction.status === 'pending'
                    ? 'border-amber-200 dark:border-amber-800/20'
                    : 'border-gray-200 dark:border-white/[0.1]'
                }`}
              >
                {/* Header — tap to expand */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : correction.id)}
                  className="w-full p-4 flex items-start gap-3 text-left"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    correction.status === 'pending'
                      ? 'bg-amber-50 dark:bg-amber-950/30'
                      : correction.status === 'accepted'
                        ? 'bg-emerald-50 dark:bg-emerald-950/30'
                        : 'bg-gray-100 dark:bg-white/[0.06]'
                  }`}>
                    {correction.status === 'pending' ? (
                      <Flag className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                    ) : correction.status === 'accepted' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-gray-400 dark:text-white/30" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm text-gray-900 dark:text-white font-medium truncate">
                        {correction.mosqueName}
                      </span>
                      <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded-full border ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-white/40">
                      <span>
                        {correction.prayers.map(p => PRAYER_LABELS[p] || p).join(', ') || 'General'}
                      </span>
                      <span className="text-gray-200 dark:text-white/10">·</span>
                      <span>{timeAgo(correction.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex-shrink-0 pt-1">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-400 dark:text-white/30" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400 dark:text-white/30" />
                    )}
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-100 dark:border-white/[0.06] pt-3">
                    {/* Current vs reported times */}
                    {correction.prayers.length > 0 && Object.keys(correction.currentTimes).length > 0 && (
                      <div className="mb-3">
                        <div className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-white/30 mb-1.5">Current displayed times</div>
                        <div className="flex flex-wrap gap-1.5">
                          {correction.prayers.map(p => (
                            <span key={p} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-white/[0.06] rounded-lg text-xs text-gray-600 dark:text-white/60">
                              <span className="font-medium">{PRAYER_LABELS[p]}</span>
                              {correction.currentTimes[p] && (
                                <span className="text-gray-400 dark:text-white/30">{correction.currentTimes[p]}</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Suggested correct time */}
                    {correction.correctTime && (
                      <div className="mb-3">
                        <div className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-white/30 mb-1">Suggested time</div>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/30 rounded-lg text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                          <Clock className="w-3 h-3" />
                          {correction.correctTime}
                        </span>
                      </div>
                    )}

                    {/* Notes */}
                    {correction.notes && (
                      <div className="mb-3">
                        <div className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-white/30 mb-1">Notes</div>
                        <p className="text-sm text-gray-600 dark:text-white/60 bg-gray-50 dark:bg-white/[0.04] rounded-xl px-3 py-2">
                          {correction.notes}
                        </p>
                      </div>
                    )}

                    {/* Review status badge */}
                    {correction.status !== 'pending' && (
                      <div className="mb-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                          correction.status === 'accepted'
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'
                            : 'bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-white/40'
                        }`}>
                          {correction.status === 'accepted' ? (
                            <><Check className="w-3 h-3" /> Accepted</>
                          ) : (
                            <><X className="w-3 h-3" /> Dismissed</>
                          )}
                          {correction.reviewedAt && (
                            <span className="text-[10px] opacity-60 ml-1">{timeAgo(correction.reviewedAt)}</span>
                          )}
                        </span>
                      </div>
                    )}

                    {/* Action buttons */}
                    {correction.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        {/* Accept + Edit */}
                        <button
                          onClick={() => {
                            updateStatus(correction.id, 'accepted');
                            if (mosque) onEditMosque(mosque);
                          }}
                          disabled={isProcessing}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 dark:bg-emerald-500 text-white rounded-xl text-sm font-medium disabled:opacity-50 active:scale-[0.98] transition-all"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Accept & Edit
                        </button>

                        {/* Dismiss */}
                        <button
                          onClick={() => updateStatus(correction.id, 'dismissed')}
                          disabled={isProcessing}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-white/[0.08] text-gray-600 dark:text-white/60 rounded-xl text-sm font-medium disabled:opacity-50 active:scale-[0.98] transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                          Dismiss
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => deleteCorrection(correction.id)}
                          disabled={isProcessing}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors disabled:opacity-50 active:scale-95"
                          title="Delete permanently"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400 dark:text-red-500/50" />
                        </button>
                      </div>
                    )}

                    {/* Already reviewed — just delete option */}
                    {correction.status !== 'pending' && (
                      <button
                        onClick={() => deleteCorrection(correction.id)}
                        disabled={isProcessing}
                        className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-white/25 hover:text-red-500 dark:hover:text-red-400 transition-colors active:scale-95"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}