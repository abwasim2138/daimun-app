import { useState, useEffect, useCallback } from 'react';
import { Bug, Trash2, Clock, Loader, ChevronDown, Monitor, Smartphone, Tablet, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { API_URL } from '../utils/api';

interface BugReport {
  id: string;
  category: string;
  description: string;
  steps: string | null;
  userAgent: string;
  screenSize: string;
  url: string;
  status: 'open' | 'resolved';
  createdAt: string;
  resolvedAt?: string;
}

interface BugReportInboxProps {
  accessToken: string | null;
  hideHeader?: boolean;
  onCountChange?: (open: number, total: number) => void;
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  'wrong-data': { label: 'Wrong data', color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/30' },
  'ui-bug': { label: 'UI issue', color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800/30' },
  'crash': { label: 'Crash', color: 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-950/40 border-red-300 dark:border-red-800/40' },
  'feature-broken': { label: 'Broken feature', color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/30' },
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

function getDeviceIcon(userAgent: string) {
  const ua = userAgent.toLowerCase();
  if (ua.includes('ipad') || ua.includes('tablet')) return Tablet;
  if (ua.includes('mobile') || ua.includes('iphone') || ua.includes('android')) return Smartphone;
  return Monitor;
}

function getDeviceLabel(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes('iphone')) return 'iPhone';
  if (ua.includes('ipad')) return 'iPad';
  if (ua.includes('android')) {
    if (ua.includes('tablet')) return 'Android Tablet';
    return 'Android';
  }
  if (ua.includes('macintosh') || ua.includes('mac os')) return 'Mac';
  if (ua.includes('windows')) return 'Windows';
  if (ua.includes('linux')) return 'Linux';
  return 'Unknown';
}

export function BugReportInbox({ accessToken, hideHeader, onCountChange }: BugReportInboxProps) {
  const [reports, setReports] = useState<BugReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'open' | 'all'>('open');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [isExpanded, setIsExpanded] = useState(false);

  // API_URL imported from /utils/api.ts

  // Admin headers: user JWT in Authorization for requireAuth, apikey for Supabase gateway
  const adminHeaders = {
    'Authorization': `Bearer ${accessToken}`,
    'apikey': publicAnonKey,
  };

  const fetchReports = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/bug-reports`, {
        headers: adminHeaders,
      });
      if (response.ok) {
        const data = await response.json();
        setReports(data.reports || []);
      }
    } catch (err) {
      console.error('Failed to fetch bug reports:', err);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const updateStatus = useCallback(async (id: string, status: 'open' | 'resolved') => {
    if (!accessToken) return;
    setProcessingIds(prev => new Set(prev).add(id));

    try {
      const response = await fetch(`${API_URL}/bug-reports/${id}`, {
        method: 'PUT',
        headers: { ...adminHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (response.ok) {
        setReports(prev => prev.map(r =>
          r.id === id ? { ...r, status, resolvedAt: status === 'resolved' ? new Date().toISOString() : undefined } : r
        ));
      }
    } catch (err) {
      console.error('Failed to update bug report:', err);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [accessToken]);

  const deleteReport = useCallback(async (id: string) => {
    if (!accessToken) return;
    setProcessingIds(prev => new Set(prev).add(id));

    try {
      const response = await fetch(`${API_URL}/bug-reports/${id}`, {
        method: 'DELETE',
        headers: adminHeaders,
      });
      if (response.ok) {
        setReports(prev => prev.filter(r => r.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete bug report:', err);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [accessToken]);

  const openCount = reports.filter(r => r.status === 'open').length;
  const filtered = filter === 'open' ? reports.filter(r => r.status === 'open') : reports;

  useEffect(() => {
    if (onCountChange) {
      onCountChange(openCount, reports.length);
    }
  }, [openCount, reports.length, onCountChange]);

  // When embedded (hideHeader), always show content directly
  // When standalone, don't render if no reports
  if (!hideHeader && !isLoading && reports.length === 0) return null;

  // In embedded mode, render content directly without the collapsible header
  if (hideHeader) {
    return (
      <div className="space-y-3">
        {/* Inline toolbar */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('open')}
            className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all ${
              filter === 'open'
                ? 'bg-red-500 dark:bg-red-600 text-white'
                : 'bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-white/50'
            }`}
          >
            Open ({openCount})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all ${
              filter === 'all'
                ? 'bg-gray-700 dark:bg-white/20 text-white'
                : 'bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-white/50'
            }`}
          >
            All ({reports.length})
          </button>
          <button
            onClick={() => fetchReports()}
            className="ml-auto p-1.5 hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-lg transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-gray-400 dark:text-white/30 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {isLoading && reports.length === 0 ? (
          <div className="flex items-center justify-center py-6">
            <Loader className="w-5 h-5 text-gray-400 dark:text-white/30 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-[#1C1C1C] rounded-2xl border border-gray-200 dark:border-white/[0.1] p-6 text-center">
            <CheckCircle className="w-6 h-6 text-emerald-500 dark:text-emerald-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-white/40">No open bug reports</p>
          </div>
        ) : (
          filtered.map(report => {
            const isOpen = expandedId === report.id;
            const isProcessing = processingIds.has(report.id);
            const categoryInfo = CATEGORY_LABELS[report.category] || CATEGORY_LABELS.other;
            const DeviceIcon = getDeviceIcon(report.userAgent);

            return (
              <div
                key={report.id}
                className={`bg-white dark:bg-[#1C1C1C] rounded-2xl border overflow-hidden transition-colors ${
                  report.status === 'resolved'
                    ? 'border-gray-200 dark:border-white/[0.06] opacity-60'
                    : 'border-gray-200 dark:border-white/[0.1]'
                }`}
              >
                <button
                  onClick={() => setExpandedId(isOpen ? null : report.id)}
                  className="w-full text-left p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full border ${categoryInfo.color}`}>
                          {categoryInfo.label}
                        </span>
                        {report.status === 'resolved' && (
                          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full border text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/30">
                            Resolved
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-900 dark:text-white line-clamp-2 mt-1">
                        {report.description}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-400 dark:text-white/25" />
                          <span className="text-[11px] text-gray-400 dark:text-white/25">{timeAgo(report.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DeviceIcon className="w-3 h-3 text-gray-400 dark:text-white/25" />
                          <span className="text-[11px] text-gray-400 dark:text-white/25">{getDeviceLabel(report.userAgent)}</span>
                        </div>
                        <span className="text-[11px] text-gray-400 dark:text-white/25">{report.screenSize}</span>
                      </div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 dark:text-white/30 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 border-t border-gray-100 dark:border-white/[0.06] pt-3 space-y-3">
                    <div>
                      <label className="text-[11px] font-medium text-gray-400 dark:text-white/30 uppercase tracking-wider">Description</label>
                      <p className="text-sm text-gray-700 dark:text-white/70 mt-1 whitespace-pre-wrap">{report.description}</p>
                    </div>
                    {report.steps && (
                      <div>
                        <label className="text-[11px] font-medium text-gray-400 dark:text-white/30 uppercase tracking-wider">Steps to Reproduce</label>
                        <p className="text-sm text-gray-700 dark:text-white/70 mt-1 whitespace-pre-wrap">{report.steps}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-[11px] font-medium text-gray-400 dark:text-white/30 uppercase tracking-wider">Device Info</label>
                      <p className="text-[12px] text-gray-500 dark:text-white/40 mt-1 break-all font-mono">{report.userAgent}</p>
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-gray-400 dark:text-white/30 uppercase tracking-wider">URL</label>
                      <p className="text-[12px] text-gray-500 dark:text-white/40 mt-1 font-mono">{report.url}</p>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      {report.status === 'open' ? (
                        <button
                          onClick={() => updateStatus(report.id, 'resolved')}
                          disabled={isProcessing}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-950/30 active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                          {isProcessing ? <Loader className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                          Mark Resolved
                        </button>
                      ) : (
                        <button
                          onClick={() => updateStatus(report.id, 'open')}
                          disabled={isProcessing}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-950/30 active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                          {isProcessing ? <Loader className="w-3 h-3 animate-spin" /> : <AlertTriangle className="w-3 h-3" />}
                          Reopen
                        </button>
                      )}
                      <button
                        onClick={() => deleteReport(report.id)}
                        disabled={isProcessing}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 dark:text-white/60 bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.08] active:scale-[0.98] transition-all disabled:opacity-50"
                      >
                        {isProcessing ? <Loader className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-1 mb-3 w-full"
      >
        <Bug className="w-4 h-4 text-gray-400 dark:text-white/30" />
        <h3 className="text-sm font-medium text-gray-500 dark:text-white/40">Bug Reports</h3>
        {openCount > 0 && (
          <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-100 dark:bg-red-950/40 text-[11px] font-medium text-red-600 dark:text-red-400">
            {openCount}
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 dark:text-white/30 ml-auto transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {isExpanded && (
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader className="w-5 h-5 text-gray-400 dark:text-white/30 animate-spin" />
            </div>
          ) : (
            <>
              {/* Filter tabs */}
              {reports.length > 0 && (
                <div className="flex items-center gap-2 px-1">
                  <button
                    onClick={() => setFilter('open')}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all ${
                      filter === 'open'
                        ? 'bg-red-500 dark:bg-red-600 text-white'
                        : 'bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-white/50'
                    }`}
                  >
                    Open ({openCount})
                  </button>
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all ${
                      filter === 'all'
                        ? 'bg-gray-700 dark:bg-white/20 text-white'
                        : 'bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-white/50'
                    }`}
                  >
                    All ({reports.length})
                  </button>
                  <button
                    onClick={() => fetchReports()}
                    className="ml-auto p-1.5 hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-lg transition-colors"
                    aria-label="Refresh"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-gray-400 dark:text-white/30 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              )}

              {filtered.length === 0 ? (
                <div className="bg-white dark:bg-[#1C1C1C] rounded-2xl border border-gray-200 dark:border-white/[0.1] p-6 text-center">
                  <CheckCircle className="w-6 h-6 text-emerald-500 dark:text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-white/40">No open bug reports</p>
                </div>
              ) : (
                filtered.map(report => {
                  const isOpen = expandedId === report.id;
                  const isProcessing = processingIds.has(report.id);
                  const categoryInfo = CATEGORY_LABELS[report.category] || CATEGORY_LABELS.other;
                  const DeviceIcon = getDeviceIcon(report.userAgent);

                  return (
                    <div
                      key={report.id}
                      className={`bg-white dark:bg-[#1C1C1C] rounded-2xl border overflow-hidden transition-colors ${
                        report.status === 'resolved'
                          ? 'border-gray-200 dark:border-white/[0.06] opacity-60'
                          : 'border-gray-200 dark:border-white/[0.1]'
                      }`}
                    >
                      <button
                        onClick={() => setExpandedId(isOpen ? null : report.id)}
                        className="w-full text-left p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full border ${categoryInfo.color}`}>
                                {categoryInfo.label}
                              </span>
                              {report.status === 'resolved' && (
                                <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full border text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/30">
                                  Resolved
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-900 dark:text-white line-clamp-2 mt-1">
                              {report.description}
                            </p>
                            <div className="flex items-center gap-3 mt-2">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-gray-400 dark:text-white/25" />
                                <span className="text-[11px] text-gray-400 dark:text-white/25">{timeAgo(report.createdAt)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <DeviceIcon className="w-3 h-3 text-gray-400 dark:text-white/25" />
                                <span className="text-[11px] text-gray-400 dark:text-white/25">{getDeviceLabel(report.userAgent)}</span>
                              </div>
                              <span className="text-[11px] text-gray-400 dark:text-white/25">{report.screenSize}</span>
                            </div>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-gray-400 dark:text-white/30 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </div>
                      </button>

                      {isOpen && (
                        <div className="px-4 pb-4 border-t border-gray-100 dark:border-white/[0.06] pt-3 space-y-3">
                          {/* Full description */}
                          <div>
                            <label className="text-[11px] font-medium text-gray-400 dark:text-white/30 uppercase tracking-wider">Description</label>
                            <p className="text-sm text-gray-700 dark:text-white/70 mt-1 whitespace-pre-wrap">{report.description}</p>
                          </div>

                          {/* Steps */}
                          {report.steps && (
                            <div>
                              <label className="text-[11px] font-medium text-gray-400 dark:text-white/30 uppercase tracking-wider">Steps to Reproduce</label>
                              <p className="text-sm text-gray-700 dark:text-white/70 mt-1 whitespace-pre-wrap">{report.steps}</p>
                            </div>
                          )}

                          {/* Device details */}
                          <div>
                            <label className="text-[11px] font-medium text-gray-400 dark:text-white/30 uppercase tracking-wider">Device Info</label>
                            <p className="text-[12px] text-gray-500 dark:text-white/40 mt-1 break-all font-mono">{report.userAgent}</p>
                          </div>

                          {/* URL */}
                          <div>
                            <label className="text-[11px] font-medium text-gray-400 dark:text-white/30 uppercase tracking-wider">URL</label>
                            <p className="text-[12px] text-gray-500 dark:text-white/40 mt-1 font-mono">{report.url}</p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 pt-1">
                            {report.status === 'open' ? (
                              <button
                                onClick={() => updateStatus(report.id, 'resolved')}
                                disabled={isProcessing}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-950/30 active:scale-[0.98] transition-all disabled:opacity-50"
                              >
                                {isProcessing ? (
                                  <Loader className="w-3 h-3 animate-spin" />
                                ) : (
                                  <CheckCircle className="w-3 h-3" />
                                )}
                                Mark Resolved
                              </button>
                            ) : (
                              <button
                                onClick={() => updateStatus(report.id, 'open')}
                                disabled={isProcessing}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-950/30 active:scale-[0.98] transition-all disabled:opacity-50"
                              >
                                {isProcessing ? (
                                  <Loader className="w-3 h-3 animate-spin" />
                                ) : (
                                  <AlertTriangle className="w-3 h-3" />
                                )}
                                Reopen
                              </button>
                            )}
                            <button
                              onClick={() => deleteReport(report.id)}
                              disabled={isProcessing}
                              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 dark:text-white/60 bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.08] active:scale-[0.98] transition-all disabled:opacity-50"
                            >
                              {isProcessing ? (
                                <Loader className="w-3 h-3 animate-spin" />
                              ) : (
                                <Trash2 className="w-3 h-3" />
                              )}
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}