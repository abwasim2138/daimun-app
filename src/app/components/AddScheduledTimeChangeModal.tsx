import { useState, useCallback, useRef, useMemo } from 'react';
import { X, Clock, Plus, Trash2, Image, Calendar, ChevronDown, ChevronUp, Check, Upload, AlertCircle } from 'lucide-react';
import { ScheduledTimeChange, Mosque } from '../App';
import { parseLocalDate } from '../utils/dateUtils';

const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
const PRAYER_LABELS: Record<string, string> = {
  fajr: 'Fajr', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha',
};

/** One "row" in the schedule builder — a prayer + its new time */
interface PrayerEntry {
  prayer: typeof PRAYERS[number];
  enabled: boolean;
  time: string;
}

/** A complete schedule block: date range + set of prayer changes */
interface ScheduleBlock {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  entries: PrayerEntry[];
}

function createEmptyBlock(): ScheduleBlock {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  // Use local date components to avoid UTC shift from toISOString()
  const yyyy = tomorrow.getFullYear();
  const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const dd = String(tomorrow.getDate()).padStart(2, '0');
  return {
    id: crypto.randomUUID(),
    label: '',
    startDate: `${yyyy}-${mm}-${dd}`,
    endDate: '',
    entries: PRAYERS.map(p => ({ prayer: p, enabled: false, time: '' })),
  };
}

/** Parse "7:30 AM" / "7:30 PM" / "7:30" / "19:30" into a normalized "H:MM AM/PM" string */
function normalizeTimeInput(raw: string): string | null {
  const cleaned = raw.trim().replace(/\s+/g, ' ');
  if (!cleaned) return null;

  // Try "H:MM AM/PM"
  const ampm = cleaned.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    const m = parseInt(ampm[2], 10);
    const period = ampm[3].toUpperCase();
    if (m > 59) return null;
    if (period === 'PM' && h < 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    const dispH = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${dispH}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  }

  // Try 24-hour "HH:MM"
  const mil = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (mil) {
    const h = parseInt(mil[1], 10);
    const m = parseInt(mil[2], 10);
    if (h > 23 || m > 59) return null;
    const dispH = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${dispH}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  }

  return null;
}

/** Try to extract prayer times from pasted text (handles common formats) */
function parseScheduleText(text: string): Partial<Record<typeof PRAYERS[number], string>> {
  const result: Partial<Record<typeof PRAYERS[number], string>> = {};
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    for (const prayer of PRAYERS) {
      // Match lines like "Fajr 6:30 AM" or "Fajr: 6:30 AM" or "FAJR - 6:30am"
      const regex = new RegExp(`${prayer}[:\\s\\-–]+([\\d]{1,2}:[\\d]{2}\\s*(?:am|pm)?)`, 'i');
      const match = line.match(regex);
      if (match) {
        const normalized = normalizeTimeInput(match[1]);
        if (normalized) result[prayer] = normalized;
      }
    }
  }

  return result;
}

interface AddScheduledTimeChangeModalProps {
  mosque: Mosque;
  onClose: () => void;
  onSave: (mosqueId: string, changes: Omit<ScheduledTimeChange, 'id'>[]) => Promise<void>;
  onDelete: (mosqueId: string, changeId: string) => Promise<void>;
  editingGroup?: ScheduledTimeChange[]; // Pre-populate with existing group for editing
}

/** Create a pre-populated block from an existing group of scheduled changes */
function createBlockFromGroup(changes: ScheduledTimeChange[]): ScheduleBlock {
  const first = changes[0];
  return {
    id: crypto.randomUUID(),
    label: first.reason || '',
    startDate: first.startDate,
    endDate: first.endDate || '',
    entries: PRAYERS.map(p => {
      const match = changes.find(c => c.prayer === p);
      return { prayer: p, enabled: !!match, time: match?.newTime || '' };
    }),
  };
}

export function AddScheduledTimeChangeModal({
  mosque,
  onClose,
  onSave,
  onDelete,
  editingGroup,
}: AddScheduledTimeChangeModalProps) {
  const existingChanges = mosque.scheduledTimeChanges || [];
  const isEditing = !!editingGroup && editingGroup.length > 0;

  // Group existing changes by label+date for display (exclude the group being edited)
  const editingIds = useMemo(() => new Set((editingGroup || []).map(c => c.id)), [editingGroup]);
  const groupedExisting = useMemo(() => {
    const filtered = existingChanges.filter(c => !editingIds.has(c.id));
    const groups = new Map<string, ScheduledTimeChange[]>();
    for (const c of filtered) {
      const key = `${c.reason || ''}|${c.startDate}|${c.endDate || ''}`;
      const arr = groups.get(key) || [];
      arr.push(c);
      groups.set(key, arr);
    }
    return [...groups.entries()].map(([key, changes]) => ({
      key,
      label: changes[0].reason || 'Schedule Change',
      startDate: changes[0].startDate,
      endDate: changes[0].endDate,
      changes,
    }));
  }, [existingChanges, editingIds]);

  const [blocks, setBlocks] = useState<ScheduleBlock[]>([
    isEditing ? createBlockFromGroup(editingGroup!) : createEmptyBlock()
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [activeBlockIdx, setActiveBlockIdx] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateBlock = useCallback((idx: number, partial: Partial<ScheduleBlock>) => {
    setBlocks(prev => prev.map((b, i) => i === idx ? { ...b, ...partial } : b));
  }, []);

  const updateEntry = useCallback((blockIdx: number, prayerIdx: number, partial: Partial<PrayerEntry>) => {
    setBlocks(prev => prev.map((b, bi) => {
      if (bi !== blockIdx) return b;
      return {
        ...b,
        entries: b.entries.map((e, ei) => ei === prayerIdx ? { ...e, ...partial } : e),
      };
    }));
  }, []);

  const addBlock = useCallback(() => {
    setBlocks(prev => [...prev, createEmptyBlock()]);
    setActiveBlockIdx(blocks.length);
  }, [blocks.length]);

  const removeBlock = useCallback((idx: number) => {
    setBlocks(prev => {
      const next = prev.filter((_, i) => i !== idx);
      return next.length === 0 ? [createEmptyBlock()] : next;
    });
    setActiveBlockIdx(a => Math.min(a, blocks.length - 2));
  }, [blocks.length]);

  // Apply parsed text to the active block
  const applyImport = useCallback(() => {
    const parsed = parseScheduleText(importText);
    const keys = Object.keys(parsed) as Array<typeof PRAYERS[number]>;
    if (keys.length === 0) return;

    setBlocks(prev => prev.map((b, i) => {
      if (i !== activeBlockIdx) return b;
      return {
        ...b,
        entries: b.entries.map(e => {
          const parsedTime = parsed[e.prayer];
          return parsedTime ? { ...e, enabled: true, time: parsedTime } : e;
        }),
      };
    }));
    setShowImport(false);
    setImportText('');
  }, [importText, activeBlockIdx]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setReferenceImage(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleSave = async () => {
    // Collect all enabled entries from all blocks
    const changes: Omit<ScheduledTimeChange, 'id'>[] = [];

    for (const block of blocks) {
      if (!block.startDate) continue;
      for (const entry of block.entries) {
        if (!entry.enabled || !entry.time.trim()) continue;
        const normalized = normalizeTimeInput(entry.time);
        if (!normalized) continue;
        changes.push({
          prayer: entry.prayer,
          newTime: normalized,
          startDate: block.startDate,
          ...(block.endDate ? { endDate: block.endDate } : {}),
          ...(block.label.trim() ? { reason: block.label.trim() } : {}),
        });
      }
    }

    if (changes.length === 0) {
      return; // Nothing to save
    }

    setIsSaving(true);
    try {
      // If editing, delete the old group entries first
      if (isEditing && editingGroup) {
        for (const c of editingGroup) {
          await onDelete(mosque.id, c.id);
        }
      }
      await onSave(mosque.id, changes);
      onClose();
    } catch (err) {
      console.error('Failed to save scheduled changes:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGroup = async (changes: ScheduledTimeChange[]) => {
    const ids = changes.map(c => c.id);
    setDeletingIds(prev => new Set([...prev, ...ids]));
    try {
      for (const c of changes) {
        await onDelete(mosque.id, c.id);
      }
    } catch (err) {
      console.error('Failed to delete scheduled changes:', err);
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        ids.forEach(id => next.delete(id));
        return next;
      });
    }
  };

  const enabledCount = blocks.reduce(
    (sum, b) => sum + b.entries.filter(e => e.enabled && e.time.trim()).length,
    0
  );

  const block = blocks[activeBlockIdx] || blocks[0];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white dark:bg-[#1A1A1A] rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-white/[0.08] flex-shrink-0">
          <div>
            <h2 className="text-gray-900 dark:text-white font-semibold">{isEditing ? 'Edit Schedule' : 'Schedule Changes'}</h2>
            <p className="text-xs text-gray-500 dark:text-white/40 mt-0.5">{mosque.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-xl transition-colors active:scale-95">
            <X className="w-5 h-5 text-gray-500 dark:text-white/50" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Existing Scheduled Changes */}
          {groupedExisting.length > 0 && (
            <div className="px-5 pt-4 pb-2">
              <h3 className="text-[11px] font-medium text-gray-400 dark:text-white/30 uppercase tracking-wider mb-2">Current Schedules</h3>
              <div className="space-y-2">
                {groupedExisting.map(group => {
                  const isDeleting = group.changes.some(c => deletingIds.has(c.id));
                  const now = new Date(); now.setHours(0, 0, 0, 0);
                  // Use parseLocalDate to avoid UTC midnight shift (new Date("YYYY-MM-DD") is UTC)
                  const start = parseLocalDate(group.startDate); start.setHours(0, 0, 0, 0);
                  const isActive = start <= now && (!group.endDate || parseLocalDate(group.endDate) >= now);
                  const isPast = group.endDate && parseLocalDate(group.endDate) < now;

                  return (
                    <div
                      key={group.key}
                      className={`rounded-xl border p-3 ${
                        isPast
                          ? 'bg-gray-50 dark:bg-white/[0.02] border-gray-200 dark:border-white/[0.06] opacity-60'
                          : isActive
                            ? 'bg-emerald-50 dark:bg-emerald-950/15 border-emerald-200 dark:border-emerald-800/30'
                            : 'bg-blue-50 dark:bg-blue-950/15 border-blue-200 dark:border-blue-800/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`text-xs font-semibold ${
                              isActive ? 'text-emerald-800 dark:text-emerald-300' : 'text-blue-800 dark:text-blue-300'
                            }`}>
                              {group.label}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                              isPast
                                ? 'bg-gray-200 dark:bg-white/[0.08] text-gray-500 dark:text-white/40'
                                : isActive
                                  ? 'bg-emerald-200 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-blue-200 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                            }`}>
                              {isPast ? 'Expired' : isActive ? 'Active' : 'Upcoming'}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-500 dark:text-white/40 mb-1.5">
                            {parseLocalDate(group.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            {group.endDate && ` – ${parseLocalDate(group.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                            {!group.endDate && ' onward'}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {group.changes.map(c => (
                              <span
                                key={c.id}
                                className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg font-medium ${
                                  isActive
                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                }`}
                              >
                                {PRAYER_LABELS[c.prayer]} → {c.newTime}
                              </span>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteGroup(group.changes)}
                          disabled={isDeleting}
                          className="p-1.5 text-gray-400 dark:text-white/30 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors active:scale-95 flex-shrink-0 disabled:opacity-40"
                          aria-label="Delete schedule"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Divider */}
          {groupedExisting.length > 0 && (
            <div className="border-t border-gray-100 dark:border-white/[0.06] mx-5 my-2" />
          )}

          {/* New Schedule Builder */}
          <div className="px-5 pt-3 pb-5">
            <h3 className="text-[11px] font-medium text-gray-400 dark:text-white/30 uppercase tracking-wider mb-3">
              {isEditing ? 'Edit Schedule' : groupedExisting.length > 0 ? 'Add New Schedule' : 'Create Schedule'}
            </h3>

            {/* Block tabs (if multiple) */}
            {blocks.length > 1 && (
              <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1">
                {blocks.map((b, i) => (
                  <button
                    key={b.id}
                    onClick={() => setActiveBlockIdx(i)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                      i === activeBlockIdx
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                        : 'bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-white/50 hover:bg-gray-200 dark:hover:bg-white/[0.1]'
                    }`}
                  >
                    <Calendar className="w-3 h-3" />
                    {b.label || `Schedule ${i + 1}`}
                  </button>
                ))}
                <button
                  onClick={addBlock}
                  className="p-1.5 rounded-lg bg-gray-100 dark:bg-white/[0.06] text-gray-400 dark:text-white/30 hover:bg-gray-200 dark:hover:bg-white/[0.1] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Active block form */}
            <div className="space-y-3">
              {/* Label */}
              <div>
                <label className="block text-[11px] font-medium text-gray-500 dark:text-white/40 uppercase tracking-wider mb-1">
                  Label / Reason
                </label>
                <input
                  type="text"
                  value={block.label}
                  onChange={e => updateBlock(activeBlockIdx, { label: e.target.value })}
                  placeholder="e.g., Summer Schedule, DST Adjustment"
                  className="w-full px-3 py-2.5 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-white/20 transition-all"
                />
              </div>

              {/* Date range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 dark:text-white/40 uppercase tracking-wider mb-1">
                    Start Date <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={block.startDate}
                    onChange={e => updateBlock(activeBlockIdx, { startDate: e.target.value })}
                    className="w-full px-3 py-2.5 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-white/20 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 dark:text-white/40 uppercase tracking-wider mb-1">
                    End Date <span className="text-gray-300 dark:text-white/15 normal-case">(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={block.endDate}
                    onChange={e => updateBlock(activeBlockIdx, { endDate: e.target.value })}
                    min={block.startDate}
                    className="w-full px-3 py-2.5 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-white/20 transition-all"
                  />
                </div>
              </div>

              {/* Prayer grid */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-white/40 uppercase tracking-wider">
                    New Iqama Times
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowImport(!showImport)}
                      className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg transition-colors"
                    >
                      <Upload className="w-3 h-3" />
                      Paste Text
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/20 rounded-lg transition-colors"
                    >
                      <Image className="w-3 h-3" />
                      Reference
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Paste text import */}
                {showImport && (
                  <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-950/15 border border-blue-200 dark:border-blue-800/20 rounded-xl">
                    <p className="text-[11px] text-blue-700 dark:text-blue-300 mb-2">
                      Paste a schedule (e.g., &ldquo;Fajr 6:30 AM, Dhuhr 1:30 PM&rdquo;) and we&apos;ll extract the times:
                    </p>
                    <textarea
                      value={importText}
                      onChange={e => setImportText(e.target.value)}
                      placeholder={"Fajr 6:30 AM\nDhuhr 1:30 PM\nAsr 5:00 PM\nMaghrib 7:45 PM\nIsha 9:15 PM"}
                      rows={4}
                      className="w-full px-3 py-2 bg-white dark:bg-white/[0.06] border border-blue-200 dark:border-blue-800/30 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none font-mono"
                    />
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={applyImport}
                        disabled={!importText.trim()}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
                      >
                        <Check className="w-3 h-3" />
                        Extract & Apply
                      </button>
                      <button
                        onClick={() => { setShowImport(false); setImportText(''); }}
                        className="px-3 py-1.5 text-xs text-gray-500 dark:text-white/50 hover:bg-gray-100 dark:hover:bg-white/[0.06] rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Reference image preview */}
                {referenceImage && (
                  <div className="mb-3 relative">
                    <img
                      src={referenceImage}
                      alt="Schedule reference"
                      className="w-full max-h-48 object-contain rounded-xl border border-gray-200 dark:border-white/[0.1] bg-gray-50 dark:bg-white/[0.03]"
                    />
                    <button
                      onClick={() => setReferenceImage(null)}
                      className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/70 rounded-lg transition-colors"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                    <p className="text-[10px] text-gray-400 dark:text-white/25 mt-1 text-center">
                      Reference only — enter times below to match this schedule
                    </p>
                  </div>
                )}

                {/* Prayer rows */}
                <div className="space-y-2">
                  {block.entries.map((entry, ei) => (
                    <div
                      key={entry.prayer}
                      className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                        entry.enabled
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-800/25'
                          : 'bg-gray-50 dark:bg-white/[0.02] border-gray-200 dark:border-white/[0.06]'
                      }`}
                    >
                      {/* Toggle */}
                      <button
                        onClick={() => updateEntry(activeBlockIdx, ei, { enabled: !entry.enabled })}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all active:scale-90 ${
                          entry.enabled
                            ? 'bg-emerald-500 dark:bg-emerald-600 text-white'
                            : 'bg-gray-200 dark:bg-white/[0.08] text-gray-400 dark:text-white/25'
                        }`}
                      >
                        {entry.enabled && <Check className="w-4 h-4" />}
                      </button>

                      {/* Prayer name */}
                      <span className={`text-sm font-medium w-16 ${
                        entry.enabled ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-white/30'
                      }`}>
                        {PRAYER_LABELS[entry.prayer]}
                      </span>

                      {/* Time input */}
                      <input
                        type="text"
                        value={entry.time}
                        onChange={e => updateEntry(activeBlockIdx, ei, { time: e.target.value, enabled: true })}
                        onFocus={() => { if (!entry.enabled) updateEntry(activeBlockIdx, ei, { enabled: true }); }}
                        placeholder="e.g., 6:30 AM"
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-mono transition-all focus:outline-none focus:ring-2 ${
                          entry.enabled
                            ? 'bg-white dark:bg-white/[0.06] border border-emerald-200 dark:border-emerald-800/30 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/20 focus:ring-emerald-500/30'
                            : 'bg-gray-100 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] text-gray-400 dark:text-white/20 placeholder-gray-300 dark:placeholder-white/10 focus:ring-gray-900/10'
                        }`}
                      />

                      {/* Validation indicator */}
                      {entry.enabled && entry.time.trim() && (
                        normalizeTimeInput(entry.time)
                          ? <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                          : <AlertCircle className="w-4 h-4 text-amber-500 dark:text-amber-400 flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Add another schedule block */}
              {blocks.length < 5 && (
                <button
                  onClick={addBlock}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-medium text-gray-500 dark:text-white/40 border border-dashed border-gray-300 dark:border-white/[0.1] rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors active:scale-[0.99]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add another date range
                </button>
              )}

              {/* Remove current block (if >1) */}
              {blocks.length > 1 && (
                <button
                  onClick={() => removeBlock(activeBlockIdx)}
                  className="w-full flex items-center justify-center gap-2 py-2 text-xs text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/10 rounded-xl transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Remove this schedule
                </button>
              )}

              {/* Info */}
              <div className="bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-3">
                <div className="flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-gray-400 dark:text-white/30 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-gray-500 dark:text-white/40 leading-relaxed">
                    Scheduled times automatically override base iqama times on the start date and appear in the monthly timetable. Leave end date blank for a permanent change.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-5 py-4 border-t border-gray-200 dark:border-white/[0.08] flex-shrink-0 bg-gray-50 dark:bg-white/[0.02]">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-white/[0.06] text-gray-700 dark:text-white/70 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-white/[0.1] active:scale-[0.98] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || enabledCount === 0}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
          >
            {isSaving ? (
              <span className="animate-pulse">Saving...</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                {isEditing ? 'Update' : 'Save'} {enabledCount} Change{enabledCount !== 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}