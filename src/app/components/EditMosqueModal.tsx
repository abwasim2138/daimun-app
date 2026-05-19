import { toast } from 'sonner@2.0.3';
import { useState, useMemo, useRef, useEffect } from 'react';
import { X, MapPin, Pencil, Trash2, Plus, Bell, Calendar, Clock, Edit, Moon, ExternalLink, Upload, Image, Loader, PartyPopper } from 'lucide-react';
import { Mosque, IqamaTime, JumuahTime, Event, Announcement, RamadanProgram, EidInfo, ScheduledTimeChange } from '../App';
import { PrayerTimePicker } from './PrayerTimePicker';
import { parseLocalDate } from '../utils/dateUtils';
import { formatNthDay } from '../utils/nthDayUtils';
import { sortEventsByProximity } from '../utils/eventSorter';
import { recordPrayerAdjustment, serializeIqamaConfig } from '../utils/adminSuggestions';
import { calculatePrayerTimes, formatPrayerTime } from '../utils/prayerTimes';
import { validateAllIqamaTimes } from '../utils/iqamaValidation';
import { traceImageToSvg, svgByteSize } from '../utils/imageToSvg';

interface EditMosqueModalProps {
  mosque: Mosque;
  onClose: () => void;
  onEdit: (id: string, updates: Partial<Mosque>) => void;
  onDeleteEvent?: (mosqueId: string, eventId: string) => void;
  onEditEvent?: (mosqueId: string, event: Event) => void;
  onAddEvent?: (mosqueId: string) => void;
  onAddAnnouncement?: (mosqueId: string) => void;
  onAddScheduledTimeChange?: (mosqueId: string) => void;
  onEditScheduledTimeChangeGroup?: (mosqueId: string, changes: ScheduledTimeChange[]) => void;
  onDeleteAnnouncement?: (mosqueId: string, announcementId: string) => void;
  onDelete?: (id: string) => void;
  asPage?: boolean; // If true, render without modal overlay
}

export function EditMosqueModal({ mosque, onClose, onEdit, onDeleteEvent, onEditEvent, onAddEvent, onAddAnnouncement, onAddScheduledTimeChange, onEditScheduledTimeChangeGroup, onDeleteAnnouncement, onDelete, asPage }: EditMosqueModalProps) {
  // Convert existing jumuah to array format for editing
  const initializeJumuahTimes = (): JumuahTime[] => {
    const jumuah = mosque.iqamaTimes.jumuah;
    
    // If it's already an array, use it
    if (Array.isArray(jumuah)) {
      return jumuah;
    }
    
    // If it's a JumuahTime object with khutbah, convert to array
    if (jumuah && typeof jumuah === 'object' && 'khutbah' in jumuah) {
      return [jumuah];
    }
    
    // If it's old format (string or IqamaTime), convert to new format
    if (jumuah && typeof jumuah === 'object' && 'type' in jumuah) {
      return [{
        khutbah: jumuah.type === 'fixed' && jumuah.time ? { type: 'fixed' as const, time: jumuah.time } : { type: 'fixed' as const, time: '12:30 PM' }
      }];
    }
    
    if (typeof jumuah === 'string') {
      return [{
        khutbah: { type: 'fixed' as const, time: jumuah }
      }];
    }
    
    // Default: one Jumuah prayer
    return [{
      khutbah: { type: 'fixed' as const, time: '12:30 PM' }
    }];
  };

  // Store original address for comparison
  const originalAddress = mosque.address;

  const [formData, setFormData] = useState({
    name: mosque.name,
    address: mosque.address,
    website: mosque.website || '',
    whatsappChannel: mosque.whatsappChannel || '',
    note: mosque.note || '', // Special notes field
    calculationMethod: mosque.calculationMethod || 'NorthAmerica',
    asrMethod: mosque.asrMethod || 'Standard',
    fajr: typeof mosque.iqamaTimes.fajr === 'string' 
      ? { type: 'fixed' as const, time: mosque.iqamaTimes.fajr } 
      : mosque.iqamaTimes.fajr,
    dhuhr: typeof mosque.iqamaTimes.dhuhr === 'string'
      ? { type: 'fixed' as const, time: mosque.iqamaTimes.dhuhr }
      : mosque.iqamaTimes.dhuhr,
    asr: typeof mosque.iqamaTimes.asr === 'string'
      ? { type: 'fixed' as const, time: mosque.iqamaTimes.asr }
      : mosque.iqamaTimes.asr,
    maghrib: typeof mosque.iqamaTimes.maghrib === 'string'
      ? { type: 'fixed' as const, time: mosque.iqamaTimes.maghrib }
      : mosque.iqamaTimes.maghrib,
    isha: typeof mosque.iqamaTimes.isha === 'string'
      ? { type: 'fixed' as const, time: mosque.iqamaTimes.isha }
      : mosque.iqamaTimes.isha,
    jumuahPrayers: initializeJumuahTimes(),
    ramadanProgram: mosque.ramadanProgram || {} as RamadanProgram,
    eidInfo: mosque.eidInfo || {} as EidInfo,
  });

  // Offered prayers toggle state — defaults to all five if not set
  const [offeredPrayers, setOfferedPrayers] = useState<Set<'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'>>(
    () => new Set(mosque.offeredPrayers || ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'])
  );

  const toggleOfferedPrayer = (prayer: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha') => {
    setOfferedPrayers(prev => {
      const next = new Set(prev);
      if (next.has(prayer)) {
        next.delete(prayer);
      } else {
        next.add(prayer);
      }
      return next;
    });
  };

  // Sync form data when mosque prop changes (e.g., after scheduled change operations refresh the data)
  // Uses mosque.updatedAt as a stable change indicator to avoid overwriting user edits
  const lastSyncedAt = useRef(mosque.updatedAt);
  useEffect(() => {
    if (mosque.updatedAt && mosque.updatedAt !== lastSyncedAt.current) {
      lastSyncedAt.current = mosque.updatedAt;
      const coerce = (v: any): IqamaTime =>
        typeof v === 'string' ? { type: 'fixed' as const, time: v } : v;
      setFormData(prev => ({
        ...prev,
        fajr: coerce(mosque.iqamaTimes.fajr),
        dhuhr: coerce(mosque.iqamaTimes.dhuhr),
        asr: coerce(mosque.iqamaTimes.asr),
        maghrib: coerce(mosque.iqamaTimes.maghrib),
        isha: coerce(mosque.iqamaTimes.isha),
        jumuahPrayers: initializeJumuahTimes(),
      }));
      setOfferedPrayers(new Set(mosque.offeredPrayers || ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']));
    }
  }, [mosque.updatedAt]);

  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ── Logo SVG state ─────────────────────────────────────────────────────
  const [logoSvg, setLogoSvg] = useState<string | null>(mosque.logoSvg || null);
  const [isTracingLogo, setIsTracingLogo] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [logoRasterPreview, setLogoRasterPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);

  const processLogoFile = async (file: File) => {
    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.svg')) {
      setLogoError('Please upload a PNG, JPG, WebP, or SVG image.');
      return;
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setLogoError('Image must be under 5 MB.');
      return;
    }

    setLogoError(null);

    const isSvgFile = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');

    // For raster images: show instant preview + tracing spinner
    // For SVGs: processing is near-instant (sanitize + flatten to monochrome), no preview needed
    let previewUrl: string | null = null;
    if (!isSvgFile) {
      previewUrl = URL.createObjectURL(file);
      setLogoRasterPreview(previewUrl);
      setIsTracingLogo(true);
      toast('Processing logo…', { duration: 2000 });
    }

    try {
      const svg = await traceImageToSvg(file);

      // Warn if the SVG is unusually large (> 200KB)
      const size = svgByteSize(svg);
      if (size > 200_000) {
        setLogoError(`SVG is large (${Math.round(size / 1024)} KB). Consider a simpler image.`);
      }

      setLogoSvg(svg);
      toast.success(isSvgFile ? 'Logo added' : 'Logo converted to SVG');
    } catch (err) {
      console.error('Logo processing error:', err);
      setLogoError(isSvgFile ? 'Failed to process SVG.' : 'Failed to trace image. Try a simpler, flat-colored logo.');
      toast.error(isSvgFile ? 'SVG processing failed' : 'Logo conversion failed');
    } finally {
      setIsTracingLogo(false);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setLogoRasterPreview(null);
      // Reset input so the same file can be re-uploaded
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processLogoFile(file);
  };

  const handleLogoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingLogo(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    processLogoFile(file);
  };

  const handleLogoDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleLogoDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingLogo(true);
  };

  const handleLogoDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only leave if we're actually exiting the drop zone (not entering a child)
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingLogo(false);
  };

  const removeLogo = () => {
    setLogoSvg(null);
    setLogoError(null);
    if (logoRasterPreview) {
      URL.revokeObjectURL(logoRasterPreview);
      setLogoRasterPreview(null);
    }
  };

  // Compute today's adhan times for validation (memoized, recalculates if calc method changes)
  const adhanTimeStrings = useMemo(() => {
    const adhan = calculatePrayerTimes(
      mosque.latitude,
      mosque.longitude,
      new Date(),
      formData.calculationMethod,
      (formData.asrMethod as 'Standard' | 'Hanafi') || 'Standard'
    );
    return {
      fajr: formatPrayerTime(adhan.fajr),
      dhuhr: formatPrayerTime(adhan.dhuhr),
      asr: formatPrayerTime(adhan.asr),
      maghrib: formatPrayerTime(adhan.maghrib),
      isha: formatPrayerTime(adhan.isha),
    };
  }, [mosque.latitude, mosque.longitude, formData.calculationMethod, formData.asrMethod]);

  const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
        {
          headers: {
            'User-Agent': 'Daimun-Masjid-App'
          }
        }
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
      }
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  };

  const getDayName = (day: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ── Iqama time validation ──
    const prayerConfigs: Record<string, { type: 'fixed' | 'offset'; time?: string; minutes?: number }> = {
      fajr: formData.fajr,
      dhuhr: formData.dhuhr,
      asr: formData.asr,
      maghrib: formData.maghrib,
      isha: formData.isha,
    };
    const validationErrors = validateAllIqamaTimes(prayerConfigs, adhanTimeStrings);
    if (Object.keys(validationErrors).length > 0) {
      const firstErr = Object.values(validationErrors)[0];
      toast.error(firstErr.message);
      return;
    }

    const updates: Partial<Mosque> = {
      name: formData.name,
      address: formData.address,
      latitude: mosque.latitude,
      longitude: mosque.longitude,
      iqamaTimes: {
        fajr: formData.fajr,
        dhuhr: formData.dhuhr,
        asr: formData.asr,
        maghrib: formData.maghrib,
        isha: formData.isha,
        jumuah: formData.jumuahPrayers
      },
      website: formData.website.trim() || '',
      whatsappChannel: formData.whatsappChannel.trim() || '',
      note: formData.note.trim() || '',
      calculationMethod: formData.calculationMethod,
      asrMethod: formData.asrMethod,
      ramadanProgram: formData.ramadanProgram,
      eidInfo: formData.eidInfo,
      offeredPrayers: Array.from(offeredPrayers),
      logoSvg: logoSvg || '',  // Empty string clears the logo on the server
    };

    if (formData.address !== originalAddress) {
      setIsGeocoding(true);
      const coordinates = await geocodeAddress(formData.address);
      if (coordinates) {
        updates.latitude = coordinates.lat;
        updates.longitude = coordinates.lng;
      }
      setIsGeocoding(false);
    }

    setIsSaving(true);
    try {
      // Track which individual prayers changed for the suggestions engine
      const prayerKeys = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
      for (const prayer of prayerKeys) {
        const oldSerialized = serializeIqamaConfig(mosque.iqamaTimes[prayer]);
        const newSerialized = serializeIqamaConfig(formData[prayer]);
        if (oldSerialized !== newSerialized) {
          recordPrayerAdjustment(mosque.id, prayer, oldSerialized, newSerialized);
        }
      }

      await onEdit(mosque.id, updates);
    } catch (error) {
      console.error('Error saving mosque:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePrayerTimeChange = (field: string, value: IqamaTime) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleJumuahTimeChange = (index: number, field: 'khutbah', value: IqamaTime) => {
    setFormData(prev => {
      const newJumuahPrayers = [...prev.jumuahPrayers];
      newJumuahPrayers[index][field] = value;
      return { ...prev, jumuahPrayers: newJumuahPrayers };
    });
  };

  const addJumuahPrayer = () => {
    if (formData.jumuahPrayers.length >= 3) {
      alert('Maximum 3 Jumuah prayers allowed');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      jumuahPrayers: [
        ...prev.jumuahPrayers,
        {
          khutbah: { type: 'fixed' as const, time: '12:30 PM' }
        }
      ]
    }));
  };

  const removeJumuahPrayer = (index: number) => {
    if (formData.jumuahPrayers.length <= 1) {
      alert('At least one Jumuah prayer is required');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      jumuahPrayers: prev.jumuahPrayers.filter((_, i) => i !== index)
    }));
  };

  const formContent = (
    <>
      <div className="sticky top-0 bg-white dark:bg-[#1C1C1C] border-b border-gray-200 dark:border-white/[0.1] px-4 py-3 flex items-center justify-between backdrop-blur-sm">
        <h2 className="font-medium text-gray-900 dark:text-white">Edit Masjid</h2>
        {!asPage && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-900 dark:text-white/80" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1.5">Masjid Name *</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-[#282828] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white/40 transition-all"
            placeholder="e.g., Masjid Al-Noor"
          />
        </div>

        {/* ── Logo Upload ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1.5">
            Masjid Logo
          </label>

          {logoSvg ? (
            <div
              className="space-y-2"
              onDrop={handleLogoDrop}
              onDragOver={handleLogoDragOver}
              onDragEnter={handleLogoDragEnter}
              onDragLeave={handleLogoDragLeave}
            >
              {/* SVG Preview */}
              <div className={`relative bg-gray-50 dark:bg-[#282828] border rounded-lg p-4 flex items-center justify-center transition-colors ${isDraggingLogo ? 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-white/[0.1]'}`}>
                <div
                  className="max-h-24 w-full [&>svg]:max-h-24 [&>svg]:w-auto [&>svg]:mx-auto brightness-0 dark:brightness-0 dark:invert"
                  dangerouslySetInnerHTML={{ __html: logoSvg }}
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-white/70 bg-gray-100 dark:bg-white/[0.08] border border-gray-200 dark:border-white/[0.1] rounded-lg hover:bg-gray-200 dark:hover:bg-white/[0.12] transition-colors active:scale-95"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Replace
                </button>
                <button
                  type="button"
                  onClick={removeLogo}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove
                </button>
                <span className="text-[10px] text-gray-400 dark:text-white/30 ml-auto">
                  {Math.round(svgByteSize(logoSvg) / 1024)} KB
                </span>
              </div>
            </div>
          ) : logoRasterPreview ? (
            <div className="space-y-2">
              {/* Instant raster preview shown while SVG is being traced */}
              <div className="relative bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-white/[0.1] rounded-lg p-4 flex items-center justify-center overflow-hidden">
                <img
                  src={logoRasterPreview}
                  alt="Logo preview"
                  className="max-h-24 w-auto object-contain"
                />
                {/* Processing overlay */}
                <div className="absolute inset-0 bg-white/70 dark:bg-black/50 flex flex-col items-center justify-center gap-2 rounded-lg">
                  <Loader className="w-5 h-5 text-blue-500 dark:text-blue-400 animate-spin" />
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Converting to SVG…</span>
                </div>
              </div>
            </div>
          ) : (
            <div
              role="button"
              tabIndex={0}
              onClick={() => !isTracingLogo && logoInputRef.current?.click()}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); logoInputRef.current?.click(); } }}
              onDrop={handleLogoDrop}
              onDragOver={handleLogoDragOver}
              onDragEnter={handleLogoDragEnter}
              onDragLeave={handleLogoDragLeave}
              className={`w-full flex flex-col items-center justify-center gap-2 py-6 border-2 border-dashed rounded-lg transition-all cursor-pointer ${
                isTracingLogo ? 'opacity-50 cursor-not-allowed' : ''
              } ${
                isDraggingLogo
                  ? 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/10'
                  : 'border-gray-300 dark:border-white/[0.15] hover:border-gray-400 dark:hover:border-white/[0.25] hover:bg-gray-50 dark:hover:bg-white/[0.03]'
              }`}
            >
              {isTracingLogo ? (
                <>
                  <Loader className="w-5 h-5 text-gray-400 dark:text-white/40 animate-spin" />
                  <span className="text-xs text-gray-500 dark:text-white/50">Converting to SVG...</span>
                </>
              ) : isDraggingLogo ? (
                <>
                  <Upload className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                  <span className="text-xs text-blue-600 dark:text-blue-400">Drop image here</span>
                </>
              ) : (
                <>
                  <Image className="w-5 h-5 text-gray-400 dark:text-white/40" />
                  <span className="text-xs text-gray-500 dark:text-white/50">Drop image here or click to upload</span>
                  <span className="text-[10px] text-gray-400 dark:text-white/30">PNG, JPG, or SVG — flat logos work best</span>
                </>
              )}
            </div>
          )}

          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg"
            onChange={handleLogoUpload}
            className="hidden"
          />

          {logoError && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">{logoError}</p>
          )}

          <p className="text-xs text-gray-500 dark:text-white/40 mt-1">
            Upload your masjid's logo. Raster images will be auto-traced to SVG. Displayed on the masjid's landing page.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1.5">Address *</label>
          <input
            type="text"
            required
            value={formData.address}
            onChange={(e) => handleChange('address', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-[#282828] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white/40 transition-all"
            placeholder="e.g., 123 Main St, City, State 12345"
          />
          {isGeocoding && (
            <div className="text-xs text-gray-500 dark:text-white/50 mt-1.5 flex items-center gap-1.5">
              <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Geocoding address...
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1.5">Website</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={formData.website}
              onChange={(e) => handleChange('website', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-[#282828] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white/40 transition-all"
              placeholder="e.g., https://www.masjidalnoor.org"
            />
            {formData.website.trim() && (
              <a
                href={formData.website.startsWith('http') ? formData.website : `https://${formData.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-white/[0.15] bg-gray-50 dark:bg-white/[0.06] text-gray-700 dark:text-white/70 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.1] active:scale-95 transition-all flex-shrink-0"
                title="Open website to compare times"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="text-xs font-medium">View</span>
              </a>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-white/40 mt-1">Open the masjid's website to compare their posted times with yours</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1.5">WhatsApp Channel</label>
          <input
            type="text"
            value={formData.whatsappChannel}
            onChange={(e) => handleChange('whatsappChannel', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-[#282828] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white/40 transition-all"
            placeholder="e.g., https://chat.whatsapp.com/ABC123"
          />
          {formData.whatsappChannel.trim() && (
            <a
              href={formData.whatsappChannel.startsWith('http') ? formData.whatsappChannel : `https://${formData.whatsappChannel}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-white/[0.15] bg-gray-50 dark:bg-white/[0.06] text-gray-700 dark:text-white/70 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.1] active:scale-95 transition-all flex-shrink-0"
              title="Open WhatsApp channel"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="text-xs font-medium">Join</span>
            </a>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1.5">Special Notes</label>
          <textarea
            value={formData.note}
            onChange={(e) => handleChange('note', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-[#282828] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white/40 transition-all resize-none"
            placeholder="e.g., Jumuah held at different location, contact info, special instructions"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1.5">Adhan Calculation Method</label>
          <select
            value={formData.calculationMethod}
            onChange={(e) => handleChange('calculationMethod', e.target.value)}
            className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-[#282828] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white/40 transition-all"
          >
            <option value="NorthAmerica">North America (ISNA)</option>
            <option value="MuslimWorldLeague">Muslim World League</option>
            <option value="Egyptian">Egyptian General Authority</option>
            <option value="Karachi">University of Islamic Sciences, Karachi</option>
            <option value="UmmAlQura">Umm Al-Qura, Makkah</option>
            <option value="Dubai">Dubai</option>
            <option value="Qatar">Qatar</option>
            <option value="Kuwait">Kuwait</option>
            <option value="MoonsightingCommittee">Moonsighting Committee Worldwide</option>
            <option value="Singapore">Singapore</option>
            <option value="Turkey">Turkey</option>
            <option value="Tehran">Institute of Geophysics, Tehran</option>
          </select>
          <p className="text-xs text-gray-500 dark:text-white/50 mt-1.5">
            Different methods calculate Fajr and Isha times differently. Choose the method your masjid follows.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1.5">Asr Calculation Method</label>
          <select
            value={formData.asrMethod || 'Standard'}
            onChange={(e) => handleChange('asrMethod', e.target.value)}
            className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-[#282828] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white/40 transition-all"
          >
            <option value="Standard">Standard (Shafi, Maliki, Hanbali)</option>
            <option value="Hanafi">Hanafi (Later Asr)</option>
          </select>
          <p className="text-xs text-gray-500 dark:text-white/50 mt-1.5">
            Hanafi method calculates Asr later (shadow = 2× object length). Most masajid use Standard.
          </p>
        </div>

        <div className="border-t border-gray-200 dark:border-white/[0.1] pt-4">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Iqama Times</h3>
          <p className="text-xs text-gray-500 dark:text-white/40 mb-3">
            Toggle off prayers this masjid does not hold. Fajr & Isha are always required.
          </p>

          {/* Offered prayers toggles — only for the optional middle three */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {(['dhuhr', 'asr', 'maghrib'] as const).map(prayer => {
              const labels = { dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib' };
              const active = offeredPrayers.has(prayer);
              return (
                <button
                  key={prayer}
                  type="button"
                  onClick={() => toggleOfferedPrayer(prayer)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all active:scale-95 ${
                    active
                      ? 'bg-gray-900 dark:bg-white/[0.15] text-white border-gray-900 dark:border-white/[0.25]'
                      : 'bg-gray-100 dark:bg-white/[0.04] text-gray-400 dark:text-white/30 border-gray-200 dark:border-white/[0.08] line-through'
                  }`}
                >
                  {labels[prayer]}
                </button>
              );
            })}
          </div>

          {/* Active scheduled override banner */}
          {(() => {
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            const activeOverrides = (mosque.scheduledTimeChanges || []).filter(c => {
              const start = parseLocalDate(c.startDate); start.setHours(0, 0, 0, 0);
              if (start > now) return false;
              if (c.endDate) {
                const end = parseLocalDate(c.endDate); end.setHours(23, 59, 59, 999);
                return now <= end;
              }
              return true;
            });
            if (activeOverrides.length === 0) return null;
            const prayerLabels: Record<string,string> = { fajr:'Fajr', dhuhr:'Dhuhr', asr:'Asr', maghrib:'Maghrib', isha:'Isha', jumuah:'Jumuah' };
            return (
              <div className="mb-3 p-2.5 bg-amber-50 dark:bg-amber-950/15 border border-amber-200 dark:border-amber-800/30 rounded-xl">
                <p className="text-[11px] text-amber-800 dark:text-amber-300">
                  <strong>Note:</strong> Scheduled overrides are active for{' '}
                  {activeOverrides.map(c => prayerLabels[c.prayer]).filter((v,i,a) => a.indexOf(v) === i).join(', ')}.
                  The times shown below are base times. The detail page shows the overridden times.
                </p>
              </div>
            );
          })()}

          <div className="space-y-3">
            <PrayerTimePicker
              label="Fajr"
              value={formData.fajr}
              onChange={(value) => handlePrayerTimeChange('fajr', value)}
              required
              prayerKey="fajr"
              adhanTime={adhanTimeStrings.fajr}
            />
            {offeredPrayers.has('dhuhr') && (
              <PrayerTimePicker
                label="Dhuhr"
                value={formData.dhuhr}
                onChange={(value) => handlePrayerTimeChange('dhuhr', value)}
                required
                prayerKey="dhuhr"
                adhanTime={adhanTimeStrings.dhuhr}
              />
            )}
            {offeredPrayers.has('asr') && (
              <PrayerTimePicker
                label="Asr"
                value={formData.asr}
                onChange={(value) => handlePrayerTimeChange('asr', value)}
                required
                prayerKey="asr"
                adhanTime={adhanTimeStrings.asr}
              />
            )}
            {offeredPrayers.has('maghrib') && (
              <PrayerTimePicker
                label="Maghrib"
                value={formData.maghrib}
                onChange={(value) => handlePrayerTimeChange('maghrib', value)}
                required
                prayerKey="maghrib"
                adhanTime={adhanTimeStrings.maghrib}
              />
            )}
            <PrayerTimePicker
              label="Isha"
              value={formData.isha}
              onChange={(value) => handlePrayerTimeChange('isha', value)}
              required
              prayerKey="isha"
              adhanTime={adhanTimeStrings.isha}
            />
            {formData.jumuahPrayers.map((jumuah, index) => (
              <div key={index} className="space-y-2">
                <PrayerTimePicker
                  label="Jumuah Khutbah"
                  value={jumuah.khutbah}
                  onChange={(value) => handleJumuahTimeChange(index, 'khutbah', value)}
                  required
                  prayerKey="jumuah"
                  adhanTime={adhanTimeStrings.dhuhr}
                />
              </div>
            ))}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={addJumuahPrayer}
                className="flex items-center gap-1.5 px-2 py-1.5 bg-gray-900 dark:bg-white/[0.15] text-white dark:text-white rounded-lg text-xs font-medium active:scale-95 transition-transform hover:bg-gray-800 dark:hover:bg-white/[0.2]"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Jumuah Prayer
              </button>
              {formData.jumuahPrayers.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeJumuahPrayer(formData.jumuahPrayers.length - 1)}
                  className="flex items-center gap-1.5 px-2 py-1.5 text-gray-500 dark:text-white/50 hover:text-red-600 dark:hover:text-red-400 rounded-lg text-xs transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove Jumuah Prayer
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Ramadan Program Section */}
        <div className="border-t border-gray-200 dark:border-white/[0.1] pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Moon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Ramadan Program</h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-white/50 mb-3">
            Configure your masjid's Ramadan offerings. This info appears on your card during Ramadan.
          </p>
          <div className="space-y-3">
            {/* Iftar */}
            <div className="bg-gray-50 dark:bg-[#282828] rounded-lg p-3 border border-gray-200 dark:border-white/[0.1] space-y-2.5">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.ramadanProgram.iftarProvided || false}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    ramadanProgram: { ...prev.ramadanProgram, iftarProvided: e.target.checked }
                  }))}
                  className="w-4 h-4 rounded border-gray-300 dark:border-white/30 text-purple-600 focus:ring-purple-500 accent-purple-600"
                />
                <span className="text-sm text-gray-900 dark:text-white">Iftar provided</span>
              </label>
              {formData.ramadanProgram.iftarProvided && (
                <>
                  <label className="flex items-center gap-3 cursor-pointer ml-7">
                    <input
                      type="checkbox"
                      checked={formData.ramadanProgram.iftarEveryNight || false}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        ramadanProgram: { ...prev.ramadanProgram, iftarEveryNight: e.target.checked }
                      }))}
                      className="w-4 h-4 rounded border-gray-300 dark:border-white/30 text-purple-600 focus:ring-purple-500 accent-purple-600"
                    />
                    <span className="text-xs text-gray-700 dark:text-white/70">Every night</span>
                  </label>
                  <input
                    type="text"
                    value={formData.ramadanProgram.iftarNotes || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      ramadanProgram: { ...prev.ramadanProgram, iftarNotes: e.target.value }
                    }))}
                    className="w-full ml-7 max-w-[calc(100%-1.75rem)] px-2.5 py-1.5 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-[#1C1C1C] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 transition-all text-xs"
                    placeholder="e.g., Fridays & weekends only, Donations welcome"
                  />
                </>
              )}
            </div>

            {/* Tarawih */}
            <div className="bg-gray-50 dark:bg-[#282828] rounded-lg p-3 border border-gray-200 dark:border-white/[0.1] space-y-2.5">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.ramadanProgram.tarawih || false}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    ramadanProgram: { ...prev.ramadanProgram, tarawih: e.target.checked }
                  }))}
                  className="w-4 h-4 rounded border-gray-300 dark:border-white/30 text-purple-600 focus:ring-purple-500 accent-purple-600"
                />
                <span className="text-sm text-gray-900 dark:text-white">Tarawih prayers</span>
              </label>
              {formData.ramadanProgram.tarawih && (
                <>
                  <div className="flex items-center gap-3 ml-7">
                    <span className="text-xs text-gray-700 dark:text-white/70">Rakat:</span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          ramadanProgram: { ...prev.ramadanProgram, tarawihRakat: 8 }
                        }))}
                        className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                          formData.ramadanProgram.tarawihRakat === 8
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-white dark:bg-[#1C1C1C] text-gray-700 dark:text-white/70 border-gray-300 dark:border-white/[0.15] hover:bg-gray-50 dark:hover:bg-white/[0.05]'
                        }`}
                      >
                        8
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          ramadanProgram: { ...prev.ramadanProgram, tarawihRakat: 20 }
                        }))}
                        className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                          formData.ramadanProgram.tarawihRakat === 20
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-white dark:bg-[#1C1C1C] text-gray-700 dark:text-white/70 border-gray-300 dark:border-white/[0.15] hover:bg-gray-50 dark:hover:bg-white/[0.05]'
                        }`}
                      >
                        20
                      </button>
                    </div>
                  </div>
                  <div className="ml-7">
                    <input
                      type="text"
                      value={formData.ramadanProgram.tarawihTime || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        ramadanProgram: { ...prev.ramadanProgram, tarawihTime: e.target.value }
                      }))}
                      className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-[#1C1C1C] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 transition-all text-xs"
                      placeholder="e.g., 9:30 PM"
                    />
                  </div>
                </>
              )}
            </div>

            {/* I'tikaf */}
            <div className="bg-gray-50 dark:bg-[#282828] rounded-lg p-3 border border-gray-200 dark:border-white/[0.1]">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.ramadanProgram.itikaf || false}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    ramadanProgram: { ...prev.ramadanProgram, itikaf: e.target.checked }
                  }))}
                  className="w-4 h-4 rounded border-gray-300 dark:border-white/30 text-purple-600 focus:ring-purple-500 accent-purple-600"
                />
                <div>
                  <span className="text-sm text-gray-900 dark:text-white">I'tikaf available</span>
                  <p className="text-[10px] text-gray-500 dark:text-white/40">Last 10 nights</p>
                </div>
              </label>
            </div>

            {/* Qiyam al-Layl */}
            <div className="bg-gray-50 dark:bg-[#282828] rounded-lg p-3 border border-gray-200 dark:border-white/[0.1] space-y-2.5">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.ramadanProgram.qiyam || false}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    ramadanProgram: { ...prev.ramadanProgram, qiyam: e.target.checked }
                  }))}
                  className="w-4 h-4 rounded border-gray-300 dark:border-white/30 text-purple-600 focus:ring-purple-500 accent-purple-600"
                />
                <div>
                  <span className="text-sm text-gray-900 dark:text-white">Qiyam al-Layl</span>
                  <p className="text-[10px] text-gray-500 dark:text-white/40">Last 10 nights</p>
                </div>
              </label>
              {formData.ramadanProgram.qiyam && (
                <div className="ml-7">
                  <input
                    type="text"
                    value={formData.ramadanProgram.qiyamTime || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      ramadanProgram: { ...prev.ramadanProgram, qiyamTime: e.target.value }
                    }))}
                    className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-[#1C1C1C] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 transition-all text-xs"
                    placeholder="e.g., 2:00 AM"
                  />
                </div>
              )}
            </div>

            {/* Khatm al-Quran */}
            <div className="bg-gray-50 dark:bg-[#282828] rounded-lg p-3 border border-gray-200 dark:border-white/[0.1]">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.ramadanProgram.khatmQuran || false}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    ramadanProgram: { ...prev.ramadanProgram, khatmQuran: e.target.checked }
                  }))}
                  className="w-4 h-4 rounded border-gray-300 dark:border-white/30 text-purple-600 focus:ring-purple-500 accent-purple-600"
                />
                <div>
                  <span className="text-sm text-gray-900 dark:text-white">Khatm al-Quran</span>
                  <p className="text-[10px] text-gray-500 dark:text-white/40">Quran completion program during tarawih</p>
                </div>
              </label>
              {formData.ramadanProgram.khatmQuran && (
                <div className="mt-3 ml-7">
                  <label className="text-[11px] text-gray-500 dark:text-white/40 block mb-1">Khatm Date (optional)</label>
                  <input
                    type="date"
                    value={formData.ramadanProgram.khatmQuranDate || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      ramadanProgram: { ...prev.ramadanProgram, khatmQuranDate: e.target.value || undefined }
                    }))}
                    className="w-full text-sm bg-white dark:bg-[#1C1C1C] px-3 py-2 rounded-lg border border-gray-200 dark:border-white/[0.1] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 dark:focus:border-purple-500/40 transition-all"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Eid Info Section */}
        <div className="border-t border-gray-200 dark:border-white/[0.1] pt-4">
          <div className="flex items-center gap-2 mb-3">
            <PartyPopper className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Eid Prayer Times & Info</h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-white/50 mb-3">
            Configure Eid prayer times and activities. This appears on the Eid times page.
          </p>
          <div className="space-y-3">
            {/* Prayer Times */}
            <div className="bg-gray-50 dark:bg-[#282828] rounded-lg p-3 border border-gray-200 dark:border-white/[0.1] space-y-2.5">
              <label className="text-sm text-gray-900 dark:text-white block mb-2">Prayer Times</label>
              <div className="space-y-2">
                {(formData.eidInfo.prayerTimes || ['']).map((time, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={time}
                      onChange={(e) => {
                        const newTimes = [...(formData.eidInfo.prayerTimes || [''])];
                        newTimes[idx] = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          eidInfo: { ...prev.eidInfo, prayerTimes: newTimes.filter(t => t.trim()) }
                        }));
                      }}
                      className="flex-1 px-2.5 py-1.5 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-[#1C1C1C] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 transition-all text-xs"
                      placeholder="e.g., 8:00 AM"
                    />
                    {idx === (formData.eidInfo.prayerTimes || ['']).length - 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newTimes = [...(formData.eidInfo.prayerTimes || ['']), ''];
                          setFormData(prev => ({
                            ...prev,
                            eidInfo: { ...prev.eidInfo, prayerTimes: newTimes }
                          }));
                        }}
                        className="px-2.5 py-1.5 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {(formData.eidInfo.prayerTimes || ['']).length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newTimes = (formData.eidInfo.prayerTimes || ['']).filter((_, i) => i !== idx);
                          setFormData(prev => ({
                            ...prev,
                            eidInfo: { ...prev.eidInfo, prayerTimes: newTimes.length ? newTimes : undefined }
                          }));
                        }}
                        className="px-2.5 py-1.5 text-red-600 dark:text-red-400 text-xs rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Checkboxes */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-50 dark:bg-[#282828] rounded-lg p-3 border border-gray-200 dark:border-white/[0.1]">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.eidInfo.sistersAccommodation || false}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      eidInfo: { ...prev.eidInfo, sistersAccommodation: e.target.checked }
                    }))}
                    className="mt-0.5 w-4 h-4 rounded border-gray-300 dark:border-white/30 text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                  />
                  <span className="text-xs text-gray-900 dark:text-white">Sisters space</span>
                </label>
              </div>
              <div className="bg-gray-50 dark:bg-[#282828] rounded-lg p-3 border border-gray-200 dark:border-white/[0.1]">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.eidInfo.refreshments || false}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      eidInfo: { ...prev.eidInfo, refreshments: e.target.checked }
                    }))}
                    className="mt-0.5 w-4 h-4 rounded border-gray-300 dark:border-white/30 text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                  />
                  <span className="text-xs text-gray-900 dark:text-white">Refreshments</span>
                </label>
              </div>
            </div>

            {/* Carnival/Activities */}
            <div className="bg-gray-50 dark:bg-[#282828] rounded-lg p-3 border border-gray-200 dark:border-white/[0.1] space-y-2.5">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.eidInfo.carnival || false}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    eidInfo: { ...prev.eidInfo, carnival: e.target.checked }
                  }))}
                  className="w-4 h-4 rounded border-gray-300 dark:border-white/30 text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                />
                <span className="text-sm text-gray-900 dark:text-white">Carnival / Activities</span>
              </label>
              {formData.eidInfo.carnival && (
                <input
                  type="text"
                  value={formData.eidInfo.carnivalDetails || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    eidInfo: { ...prev.eidInfo, carnivalDetails: e.target.value }
                  }))}
                  className="w-full ml-7 max-w-[calc(100%-1.75rem)] px-2.5 py-1.5 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-[#1C1C1C] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 transition-all text-xs"
                  placeholder="e.g., Sat 3/21, 5 pm to 11 pm"
                />
              )}
            </div>

            {/* Notes */}
            <div className="bg-gray-50 dark:bg-[#282828] rounded-lg p-3 border border-gray-200 dark:border-white/[0.1]">
              <label className="text-xs text-gray-700 dark:text-white/70 block mb-1.5">Additional Notes</label>
              <textarea
                value={formData.eidInfo.notes || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  eidInfo: { ...prev.eidInfo, notes: e.target.value }
                }))}
                className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-[#1C1C1C] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 transition-all text-xs resize-none"
                rows={2}
                placeholder="e.g., Bring your own prayer mat, Gifts for children"
              />
            </div>

            {/* Contact Info */}
            <div className="bg-gray-50 dark:bg-[#282828] rounded-lg p-3 border border-gray-200 dark:border-white/[0.1] space-y-2">
              <label className="text-xs text-gray-700 dark:text-white/70 block mb-1">Contact Person (optional)</label>
              <input
                type="text"
                value={formData.eidInfo.contact?.name || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  eidInfo: {
                    ...prev.eidInfo,
                    contact: { ...prev.eidInfo.contact, name: e.target.value, phone: prev.eidInfo.contact?.phone || '' }
                  }
                }))}
                className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-[#1C1C1C] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 transition-all text-xs"
                placeholder="Contact name"
              />
              <input
                type="tel"
                value={formData.eidInfo.contact?.phone || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  eidInfo: {
                    ...prev.eidInfo,
                    contact: { name: prev.eidInfo.contact?.name || '', phone: e.target.value }
                  }
                }))}
                className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-[#1C1C1C] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 transition-all text-xs"
                placeholder="Phone number"
              />
            </div>

            {/* WhatsApp */}
            <div className="bg-gray-50 dark:bg-[#282828] rounded-lg p-3 border border-gray-200 dark:border-white/[0.1]">
              <label className="text-xs text-gray-700 dark:text-white/70 block mb-1.5">Eid WhatsApp Link (optional)</label>
              <input
                type="text"
                value={formData.eidInfo.whatsapp || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  eidInfo: { ...prev.eidInfo, whatsapp: e.target.value }
                }))}
                className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-[#1C1C1C] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 transition-all text-xs"
                placeholder="https://chat.whatsapp.com/..."
              />
            </div>
          </div>
        </div>

        {/* Scheduled Time Changes Section */}
        <div className="border-t border-gray-200 dark:border-white/[0.1] pt-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Scheduled Time Changes</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Schedule future iqama time changes</p>
            </div>
            {onAddScheduledTimeChange && (
              <button
                type="button"
                onClick={() => onAddScheduledTimeChange(mosque.id)}
                className="flex items-center gap-1.5 px-2 py-1.5 bg-gray-900 dark:bg-white/[0.15] text-white dark:text-white rounded-lg text-xs font-medium active:scale-95 transition-transform hover:bg-gray-800 dark:hover:bg-white/[0.2]"
              >
                <Plus className="w-3.5 h-3.5" />
                Manage Schedules
              </button>
            )}
          </div>
          
          {(() => {
            const PRAYER_LABELS: Record<string, string> = {
              fajr: 'Fajr', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha', jumuah: 'Jumuah'
            };
            // Filter to pending changes only (startDate > today)
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            const pendingChanges = (mosque.scheduledTimeChanges || []).filter(change => {
              const startDate = parseLocalDate(change.startDate);
              startDate.setHours(0, 0, 0, 0);
              return startDate > now;
            });

            // Group by reason|startDate|endDate
            const groupMap = new Map<string, ScheduledTimeChange[]>();
            for (const c of pendingChanges) {
              const key = `${c.reason || ''}|${c.startDate}|${c.endDate || ''}`;
              const arr = groupMap.get(key) || [];
              arr.push(c);
              groupMap.set(key, arr);
            }
            const groups = [...groupMap.entries()].map(([key, changes]) => ({
              key,
              label: changes[0].reason || 'Schedule Change',
              startDate: changes[0].startDate,
              endDate: changes[0].endDate,
              changes,
            }));

            return groups.length === 0 ? (
            <div className="text-center py-6 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-900/30">
              <Clock className="w-8 h-8 mx-auto mb-2 text-blue-500 dark:text-blue-400" />
              <p className="text-xs text-blue-700 dark:text-blue-400 font-medium mb-1">No scheduled changes</p>
              <p className="text-xs text-blue-600 dark:text-blue-500/80 px-4">
                Schedule iqama time changes in advance and they'll automatically update
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {groups.map(group => (
                <div key={group.key} className="rounded-lg p-3 border bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900/30">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-semibold text-blue-800 dark:text-blue-300">
                          {group.label}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded text-blue-600 dark:text-blue-500 bg-blue-200 dark:bg-blue-900/30">
                          Scheduled
                        </span>
                      </div>
                      <p className="text-xs text-blue-700 dark:text-blue-400 mb-1.5">
                        {parseLocalDate(group.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {group.endDate ? ` – ${parseLocalDate(group.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ' onward'}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {group.changes.map(c => (
                          <span
                            key={c.id}
                            className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                          >
                            {PRAYER_LABELS[c.prayer]} → {c.newTime}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {onEditScheduledTimeChangeGroup && (
                        <button
                          type="button"
                          onClick={() => onEditScheduledTimeChangeGroup(mosque.id, group.changes)}
                          className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded active:scale-95 transition-all"
                          aria-label="Edit scheduled change group"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      {onDeleteAnnouncement && (
                        <button
                          type="button"
                          onClick={async () => {
                            for (const c of group.changes) {
                              await onDeleteAnnouncement(mosque.id, c.id);
                            }
                          }}
                          className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded active:scale-95 transition-all"
                          aria-label="Delete scheduled change group"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
          })()}
        </div>

        {/* Events Section */}
        {(mosque.events.length > 0 || onAddEvent) && (
          <div className="border-t border-gray-200 dark:border-white/[0.1] pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Events</h3>
              {onAddEvent && (
                <button
                  type="button"
                  onClick={() => onAddEvent(mosque.id)}
                  className="flex items-center gap-1.5 px-2 py-1.5 bg-gray-900 dark:bg-white/[0.15] text-white dark:text-white rounded-lg text-xs font-medium active:scale-95 transition-transform hover:bg-gray-800 dark:hover:bg-white/[0.2]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Event
                </button>
              )}
            </div>
            
            {mosque.events.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 dark:bg-white/[0.05] rounded-lg border border-gray-100 dark:border-white/[0.1]">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-400 dark:text-white/40" />
                <p className="text-xs text-gray-600 dark:text-white/60">No events scheduled</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sortEventsByProximity(mosque.events).map(event => (
                  <div key={event.id} className="bg-gray-50 dark:bg-[#282828] rounded-lg p-3 border border-gray-200 dark:border-white/[0.1]">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 dark:text-white text-sm truncate">{event.title}</h4>
                        <div className="text-xs text-gray-600 dark:text-white/65 mt-1">
                          {event.recurring?.enabled ? (
                            <>
                              {event.recurring.frequency === 'daily' && (
                                <div>Every day at {event.time}</div>
                              )}
                              {event.recurring.frequency === 'weekly' && event.recurring.dayOfWeek !== undefined && (
                                <div>Every {getDayName(event.recurring.dayOfWeek)} at {event.time}</div>
                              )}
                              {event.recurring.frequency === 'monthly' && event.recurring.dayOfMonth !== undefined && (
                                <div>Every month on day {event.recurring.dayOfMonth} at {event.time}</div>
                              )}
                              {event.recurring.frequency === 'nth-day' && event.recurring.nthWeek && event.recurring.nthDayOfWeek !== undefined && (
                                <div>Every {formatNthDay(event.recurring.nthDayOfWeek, event.recurring.nthWeek)} at {event.time}</div>
                              )}
                            </>
                          ) : (
                            <div>
                              {parseLocalDate(event.date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })} at {event.time}
                            </div>
                          )}
                        </div>
                      </div>
                      {onDeleteEvent && (
                        <button
                          type="button"
                          onClick={() => onDeleteEvent(mosque.id, event.id)}
                          className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded active:scale-95 transition-all ml-2 flex-shrink-0"
                          aria-label="Delete event"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      {onEditEvent && (
                        <button
                          type="button"
                          onClick={() => onEditEvent(mosque.id, event)}
                          className="p-1.5 text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white/80 rounded active:scale-95 transition-all ml-2 flex-shrink-0"
                          aria-label="Edit event"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-white/[0.03] text-gray-900 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.08] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSaving && (
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Subtle Delete Button */}
        {onDelete && (
          <div className="pt-2 border-t border-gray-200 dark:border-white/[0.1]">
            <button
              type="button"
              onClick={() => onDelete(mosque.id)}
              className="w-full px-4 py-2 text-sm text-gray-500 dark:text-white/40 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              Delete Masjid
            </button>
          </div>
        )}
      </form>
    </>
  );

  return (
    <div className={asPage ? "p-4" : "fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50"}>
      <div className="bg-white dark:bg-[#1C1C1C] rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto relative">
        {formContent}
      </div>
    </div>
  );
}