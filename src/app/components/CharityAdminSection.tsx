import { useState, useEffect, useCallback } from 'react';
import { HandHeart, Plus, Edit2, Trash2, ExternalLink, Loader, Building2 } from 'lucide-react';
import { useAuth } from './AuthContext';
import { API_URL, publicAnonKey } from '../utils/api';
import type { Mosque } from '../App';
import type { CharityLink } from './CharityPage';

// ── Cache helpers ─────────────────────────────────────────────────────────────
const CACHE_KEY = 'daimun-charities-cache';
function loadFromCache(): CharityLink[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveToCache(data: CharityLink[]) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch {}
}

const CATEGORIES = [
  { value: '', label: 'None' },
  { value: 'zakat', label: 'Zakat' },
  { value: 'sadaqah', label: 'Sadaqah' },
  { value: 'building-fund', label: 'Building Fund' },
  { value: 'zakat-ul-fitr', label: 'Zakat ul-Fitr' },
  { value: 'other', label: 'Other' },
];

interface CharityAdminSectionProps {
  mosques: Mosque[];
}

export function CharityAdminSection({ mosques }: CharityAdminSectionProps) {
  const { accessToken } = useAuth();
  const [charities, setCharities] = useState<CharityLink[]>(loadFromCache);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [category, setCategory] = useState('');
  const [mosqueId, setMosqueId] = useState('');

  // Fetch on mount
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
            saveToCache(data.charities);
          }
        }
      } catch (err) {
        console.log('Failed to fetch charities, using cache:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetchCharities();
    return () => { cancelled = true; };
  }, []);

  const resetForm = useCallback(() => {
    setTitle('');
    setDescription('');
    setLink('');
    setCategory('');
    setMosqueId('');
    setShowForm(false);
    setEditingId(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!title.trim() || !link.trim()) return;
    const token = accessToken || publicAnonKey;
    const selectedMosque = mosques.find(m => m.id === mosqueId);

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      link: link.trim(),
      category: category || null,
      mosqueId: mosqueId || null,
      mosqueName: selectedMosque?.name || null,
    };

    if (editingId) {
      try {
        const res = await fetch(`${API_URL}/charities/${editingId}`, {
          method: 'PUT',
          headers: {
            'apikey': publicAnonKey,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          setCharities(prev => {
            const updated = prev.map(c => c.id === editingId ? data.charity : c);
            saveToCache(updated);
            return updated;
          });
        }
      } catch (err) {
        console.error('Failed to update charity:', err);
      }
    } else {
      try {
        const res = await fetch(`${API_URL}/charities`, {
          method: 'POST',
          headers: {
            'apikey': publicAnonKey,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          setCharities(prev => {
            const updated = [data.charity, ...prev];
            saveToCache(updated);
            return updated;
          });
        }
      } catch (err) {
        console.error('Failed to add charity:', err);
      }
    }
    resetForm();
  }, [title, description, link, category, mosqueId, editingId, resetForm, accessToken, mosques]);

  const handleEdit = useCallback((c: CharityLink) => {
    setEditingId(c.id);
    setTitle(c.title);
    setDescription(c.description || '');
    setLink(c.link);
    setCategory(c.category || '');
    setMosqueId(c.mosqueId || '');
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    const token = accessToken || publicAnonKey;
    setCharities(prev => {
      const updated = prev.filter(c => c.id !== id);
      saveToCache(updated);
      return updated;
    });
    try {
      await fetch(`${API_URL}/charities/${id}`, {
        method: 'DELETE',
        headers: {
          'apikey': publicAnonKey,
          'Authorization': `Bearer ${token}`,
        },
      });
    } catch (err) {
      console.error('Failed to delete charity:', err);
    }
  }, [accessToken]);

  return (
    <div>
      <div className="flex items-center justify-between px-1 mb-3">
        <div className="flex items-center gap-2">
          <HandHeart className="w-4 h-4 text-gray-400 dark:text-white/30" />
          <h3 className="text-sm font-medium text-gray-500 dark:text-white/40">Charity & Donations</h3>
          {isLoading && (
            <Loader className="w-3 h-3 text-gray-400 dark:text-white/25 animate-spin" />
          )}
          {charities.length > 0 && !isLoading && (
            <span className="text-[11px] text-gray-400 dark:text-white/25">({charities.length})</span>
          )}
        </div>
        {!showForm && (
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-lg transition-colors active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        )}
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div className="bg-white dark:bg-[#1C1C1C] rounded-2xl border border-gray-200 dark:border-white/[0.1] p-4 mb-3">
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-500 dark:text-white/40 uppercase tracking-wider mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Masjid Building Fund"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.1] rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 dark:focus:border-emerald-400 transition-colors"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-500 dark:text-white/40 uppercase tracking-wider mb-1">Link</label>
              <input
                type="url"
                value={link}
                onChange={e => setLink(e.target.value)}
                placeholder="https://donate.example.com/..."
                className="w-full px-3 py-2 bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.1] rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 dark:focus:border-emerald-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-500 dark:text-white/40 uppercase tracking-wider mb-1">
                Description <span className="normal-case text-gray-400 dark:text-white/20">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Help fund the new expansion project..."
                rows={2}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.1] rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 dark:focus:border-emerald-400 transition-colors resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-500 dark:text-white/40 uppercase tracking-wider mb-1">Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.1] rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 dark:focus:border-emerald-400 transition-colors"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 dark:text-white/40 uppercase tracking-wider mb-1">Masjid</label>
                <select
                  value={mosqueId}
                  onChange={e => setMosqueId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.1] rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 dark:focus:border-emerald-400 transition-colors"
                >
                  <option value="">Community-wide</option>
                  {mosques
                    .filter(m => !m.temporarilyHidden)
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))
                  }
                </select>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={handleSave}
              disabled={!title.trim() || !link.trim()}
              className="flex-1 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
            >
              {editingId ? 'Update' : 'Add Link'}
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

      {/* Charity list */}
      {charities.length === 0 && !showForm ? (
        <div className="bg-white dark:bg-[#1C1C1C] rounded-2xl border border-gray-200 dark:border-white/[0.1] p-6 text-center">
          <HandHeart className="w-8 h-8 text-gray-300 dark:text-white/15 mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-white/40 mb-1">No charity links yet</p>
          <p className="text-xs text-gray-400 dark:text-white/25">Post donation pages, Zakat portals, or fundraising links</p>
        </div>
      ) : (
        <div className="space-y-2">
          {charities.map(c => (
            <div
              key={c.id}
              className="bg-white dark:bg-[#1C1C1C] rounded-2xl border border-gray-200 dark:border-white/[0.1] overflow-hidden"
            >
              <div className="p-4 flex items-start gap-3">
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.title}</div>
                  {c.description && (
                    <div className="text-[12px] text-gray-500 dark:text-white/40 mt-0.5 line-clamp-2">{c.description}</div>
                  )}
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {c.category && (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full">
                        {CATEGORIES.find(cat => cat.value === c.category)?.label || c.category}
                      </span>
                    )}
                    {c.mosqueName ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 px-2 py-0.5 rounded-full">
                        <Building2 className="w-3 h-3" />
                        {c.mosqueName}
                      </span>
                    ) : (
                      <span className="text-[11px] text-gray-400 dark:text-white/25 bg-gray-50 dark:bg-white/[0.04] px-2 py-0.5 rounded-full">Community-wide</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <a
                    href={c.link.startsWith('http') ? c.link : `https://${c.link}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-lg transition-colors active:scale-95"
                    aria-label="Open link"
                  >
                    <ExternalLink className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </a>
                  <button
                    onClick={() => handleEdit(c)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-lg transition-colors active:scale-95"
                    aria-label="Edit"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-gray-400 dark:text-white/30" />
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors active:scale-95"
                    aria-label="Delete"
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
