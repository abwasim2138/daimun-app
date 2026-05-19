import { useState, useEffect } from 'react';
import { X, Check, XCircle, Trash2, Loader, Building2, MapPin, Globe, Mail, User, Clock, MessageSquare, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { API_URL } from '../utils/api';
import { useAuth } from './AuthContext';

interface MasjidRequest {
  id: string;
  masjidName: string;
  address: string;
  city: string;
  state: string;
  website: string | null;
  submitterName: string | null;
  submitterEmail: string | null;
  notes: string | null;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt?: string;
}

interface MasjidRequestsDashboardProps {
  onClose: () => void;
  onConvertToMasjid: (request: MasjidRequest) => Promise<void>;
}

export function MasjidRequestsDashboard({ onClose, onConvertToMasjid }: MasjidRequestsDashboardProps) {
  const { accessToken } = useAuth();
  const [requests, setRequests] = useState<MasjidRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // API_URL imported from /utils/api.ts

  // Admin headers: user JWT in Authorization for requireAuth, apikey for Supabase gateway
  const adminHeaders = {
    'Authorization': `Bearer ${accessToken}`,
    'apikey': publicAnonKey,
  };

  const fetchRequests = async () => {
    try {
      setError(null);
      console.group('[MasjidRequests] Fetching requests');
      console.log('URL:', `${API_URL}/masjid-requests`);
      console.log('accessToken present:', !!accessToken);
      const response = await fetch(`${API_URL}/masjid-requests`, {
        headers: adminHeaders,
      });

      console.log('Status:', response.status, response.statusText);
      if (!response.ok) {
        const raw = await response.text();
        console.error('Error response body:', raw);
        console.groupEnd();
        throw new Error(`Failed to fetch requests (${response.status})`);
      }

      const data = await response.json();
      console.log('Requests received:', data.requests?.length ?? 0);
      console.groupEnd();
      setRequests(data.requests || []);
    } catch (err: any) {
      console.error('[MasjidRequests] Error:', err);
      console.groupEnd();
      setError(err.message || 'Failed to load requests');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const updateStatus = async (id: string, status: 'approved' | 'rejected') => {
    setActionLoading(id);
    try {
      const response = await fetch(`${API_URL}/masjid-requests/${id}`, {
        method: 'PUT',
        headers: {
          ...adminHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      setRequests(prev =>
        prev.map(r => r.id === id ? { ...r, status, updatedAt: new Date().toISOString() } : r)
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const deleteRequest = async (id: string) => {
    setActionLoading(id);
    try {
      const response = await fetch(`${API_URL}/masjid-requests/${id}`, {
        method: 'DELETE',
        headers: adminHeaders,
      });

      if (!response.ok) throw new Error('Failed to delete request');

      setRequests(prev => prev.filter(r => r.id !== id));
      setConfirmDelete(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveAndConvert = async (request: MasjidRequest) => {
    setActionLoading(request.id);
    setError(null);
    try {
      // Step 1: Update status to approved
      const response = await fetch(`${API_URL}/masjid-requests/${request.id}`, {
        method: 'PUT',
        headers: {
          ...adminHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'approved' }),
      });
      if (!response.ok) throw new Error('Failed to approve request');

      // Step 2: Convert to masjid (geocode + create) — awaited so we know it succeeded
      await onConvertToMasjid(request);

      // Both succeeded — update local state
      setRequests(prev =>
        prev.map(r => r.id === request.id ? { ...r, status: 'approved' as const, updatedAt: new Date().toISOString() } : r)
      );
    } catch (err: any) {
      console.error('[MasjidRequests] Approve & convert failed:', err);
      setError(err.message || 'Failed to approve and add masjid');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredRequests = requests.filter(r => filter === 'all' || r.status === filter);

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400">Pending</span>;
      case 'approved':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">Approved</span>;
      case 'rejected':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400">Rejected</span>;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-[#1C1C1C] rounded-2xl max-w-lg w-full shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-white/[0.1] px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
              <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Masjid Requests</h2>
              <p className="text-xs text-gray-500 dark:text-white/50">
                {requests.length} total &middot; {pendingCount} pending
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-900 dark:text-white/80" />
          </button>
        </div>

        {/* Filter tabs */}
        <div className="px-6 pt-3 pb-2 flex gap-2 shrink-0">
          {[
            { key: 'pending' as const, label: 'Pending', count: pendingCount },
            { key: 'approved' as const, label: 'Approved', count: approvedCount },
            { key: 'rejected' as const, label: 'Rejected', count: rejectedCount },
            { key: 'all' as const, label: 'All', count: requests.length },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === tab.key
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                  : 'text-gray-500 dark:text-white/50 hover:bg-gray-100 dark:hover:bg-white/[0.05]'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-3">
          {error && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-lg p-3 mb-3">
              <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-6 h-6 animate-spin text-gray-400 dark:text-white/40" />
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-10 h-10 text-gray-300 dark:text-white/20 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-white/50 text-sm">
                {filter === 'pending' ? 'No pending requests' :
                 filter === 'approved' ? 'No approved requests' :
                 filter === 'rejected' ? 'No rejected requests' :
                 'No requests yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map(request => {
                const isExpanded = expandedId === request.id;
                const isActionLoading = actionLoading === request.id;

                return (
                  <div
                    key={request.id}
                    className="border border-gray-200 dark:border-white/[0.1] rounded-xl overflow-hidden transition-colors"
                  >
                    {/* Summary row */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : request.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-medium text-gray-900 dark:text-white truncate">{request.masjidName}</span>
                          {statusBadge(request.status)}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-white/50">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{request.city}, {request.state}</span>
                          <span className="shrink-0">&middot;</span>
                          <Clock className="w-3 h-3 shrink-0" />
                          <span className="shrink-0">{formatDate(request.createdAt)}</span>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400 dark:text-white/40 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400 dark:text-white/40 shrink-0" />
                      )}
                    </button>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 dark:border-white/[0.05] px-4 py-3 bg-gray-50/50 dark:bg-white/[0.02] space-y-3">
                        {/* Full address */}
                        <div className="flex items-start gap-2.5">
                          <MapPin className="w-4 h-4 text-gray-400 dark:text-white/40 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs text-gray-400 dark:text-white/30 uppercase tracking-wider mb-0.5">Address</p>
                            <p className="text-sm text-gray-900 dark:text-white">{request.address}</p>
                            <p className="text-sm text-gray-900 dark:text-white">{request.city}, {request.state}</p>
                          </div>
                        </div>

                        {/* Website */}
                        {request.website && (
                          <div className="flex items-start gap-2.5">
                            <Globe className="w-4 h-4 text-gray-400 dark:text-white/40 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs text-gray-400 dark:text-white/30 uppercase tracking-wider mb-0.5">Website</p>
                              <a
                                href={request.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                              >
                                {request.website.replace(/^https?:\/\//, '')}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                        )}

                        {/* Submitter info */}
                        {(request.submitterName || request.submitterEmail) && (
                          <div className="flex items-start gap-2.5">
                            <User className="w-4 h-4 text-gray-400 dark:text-white/40 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs text-gray-400 dark:text-white/30 uppercase tracking-wider mb-0.5">Submitted by</p>
                              {request.submitterName && (
                                <p className="text-sm text-gray-900 dark:text-white">{request.submitterName}</p>
                              )}
                              {request.submitterEmail && (
                                <a
                                  href={`mailto:${request.submitterEmail}`}
                                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                                >
                                  <Mail className="w-3 h-3" />
                                  {request.submitterEmail}
                                </a>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Notes */}
                        {request.notes && (
                          <div className="flex items-start gap-2.5">
                            <MessageSquare className="w-4 h-4 text-gray-400 dark:text-white/40 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs text-gray-400 dark:text-white/30 uppercase tracking-wider mb-0.5">Notes</p>
                              <p className="text-sm text-gray-700 dark:text-white/70">{request.notes}</p>
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-white/[0.05]">
                          {request.status === 'pending' ? (
                            <>
                              <button
                                onClick={() => handleApproveAndConvert(request)}
                                disabled={isActionLoading}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 dark:bg-emerald-500 text-white rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors text-sm font-medium disabled:opacity-60"
                              >
                                {isActionLoading ? (
                                  <Loader className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                                Approve & Add Masjid
                              </button>
                              <button
                                onClick={() => updateStatus(request.id, 'rejected')}
                                disabled={isActionLoading}
                                className="flex items-center justify-center gap-1.5 px-3 py-2 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors text-sm font-medium disabled:opacity-60"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Reject
                              </button>
                            </>
                          ) : (
                            <>
                              {request.status === 'rejected' && (
                                <button
                                  onClick={() => handleApproveAndConvert(request)}
                                  disabled={isActionLoading}
                                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 dark:bg-emerald-500 text-white rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors text-sm font-medium disabled:opacity-60"
                                >
                                  {isActionLoading ? (
                                    <Loader className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5" />
                                  )}
                                  Approve & Add Masjid
                                </button>
                              )}
                              {request.status === 'approved' && (
                                <div className="flex-1 flex items-center gap-1.5 px-3 py-2 text-sm text-green-600 dark:text-green-400">
                                  <Check className="w-3.5 h-3.5" />
                                  Approved & converted
                                </div>
                              )}
                            </>
                          )}
                          {confirmDelete === request.id ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => deleteRequest(request.id)}
                                disabled={isActionLoading}
                                className="px-3 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-700 dark:hover:bg-red-600 transition-colors disabled:opacity-60"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setConfirmDelete(null)}
                                className="px-3 py-2 text-gray-500 dark:text-white/50 text-xs hover:bg-gray-100 dark:hover:bg-white/[0.05] rounded-lg transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDelete(request.id)}
                              disabled={isActionLoading}
                              className="p-2 text-gray-400 dark:text-white/30 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors disabled:opacity-60"
                              title="Delete request"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}