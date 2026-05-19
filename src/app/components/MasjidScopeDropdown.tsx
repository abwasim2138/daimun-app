import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Building2, Search } from 'lucide-react';
import { Mosque } from '../App';

interface MasjidScopeDropdownProps {
  mosques: Mosque[];
  selectedIds: Set<string>;
  onToggle: (mosqueId: string) => void;
  label?: string;
  disabled?: boolean;
}

export function MasjidScopeDropdown({
  mosques,
  selectedIds,
  onToggle,
  label = 'Assign masjids',
  disabled = false,
}: MasjidScopeDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = search
    ? mosques.filter(m => m.name.toLowerCase().includes(search.toLowerCase()))
    : mosques;

  const selectedNames = mosques
    .filter(m => selectedIds.has(m.id))
    .map(m => m.name);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => { if (!disabled) { setOpen(!open); setSearch(''); } }}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-[12px] rounded-xl border transition-colors ${
          open
            ? 'border-blue-300 dark:border-blue-700/50 bg-blue-50/50 dark:bg-blue-950/10'
            : 'border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] hover:border-gray-300 dark:hover:border-white/[0.12]'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className="flex-1 min-w-0">
          {selectedIds.size === 0 ? (
            <span className="text-gray-400 dark:text-white/30">{label}</span>
          ) : (
            <span className="text-gray-700 dark:text-white/70 truncate block">
              {selectedIds.size === 1
                ? selectedNames[0]
                : `${selectedIds.size} masjid${selectedIds.size !== 1 ? 's' : ''} selected`}
            </span>
          )}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 dark:text-white/30 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-[#1C1C1C] rounded-xl border border-gray-200 dark:border-white/[0.1] shadow-lg dark:shadow-black/40 overflow-hidden">
          {/* Search */}
          {mosques.length > 5 && (
            <div className="p-2 border-b border-gray-100 dark:border-white/[0.06]">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 dark:text-white/30" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search masjids..."
                  autoFocus
                  className="w-full pl-7 pr-2 py-1.5 text-[11px] bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06] rounded-lg text-gray-700 dark:text-white/70 placeholder:text-gray-400 dark:placeholder:text-white/25 outline-none focus:border-blue-300 dark:focus:border-blue-700/50"
                />
              </div>
            </div>
          )}

          {/* Selection summary */}
          {selectedIds.size > 0 && (
            <div className="px-3 py-1.5 border-b border-gray-100 dark:border-white/[0.06] bg-gray-50/50 dark:bg-white/[0.02]">
              <span className="text-[10px] text-gray-500 dark:text-white/40">
                {selectedIds.size} of {mosques.length} selected
              </span>
            </div>
          )}

          {/* List */}
          <div className="max-h-[200px] overflow-y-auto overscroll-contain">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-[11px] text-gray-400 dark:text-white/30">
                No masjids found
              </div>
            ) : (
              filtered.map(m => {
                const isSelected = selectedIds.has(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onToggle(m.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                      isSelected
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/15'
                        : 'hover:bg-gray-50 dark:hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-colors ${
                      isSelected
                        ? 'bg-emerald-500 dark:bg-emerald-600 border-emerald-500 dark:border-emerald-600'
                        : 'border-gray-300 dark:border-white/20 bg-white dark:bg-white/[0.05]'
                    }`}>
                      {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <Building2 className="w-3 h-3 text-gray-400 dark:text-white/30 flex-shrink-0" />
                    <span className={`text-[12px] truncate ${
                      isSelected
                        ? 'text-emerald-700 dark:text-emerald-300 font-medium'
                        : 'text-gray-600 dark:text-white/60'
                    }`}>
                      {m.name}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
