import { toast } from 'sonner@2.0.3';
import { useState } from 'react';
import { X } from 'lucide-react';
import { Mosque, IqamaTimes, IqamaTime } from '../App';
import { PrayerTimePicker } from './PrayerTimePicker';
import { validateAllIqamaTimes } from '../utils/iqamaValidation';

interface AddMosqueModalProps {
  onClose: () => void;
  onAdd: (mosque: Omit<Mosque, 'id'>) => void;
}

export function AddMosqueModal({ onClose, onAdd }: AddMosqueModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    website: '',
    calculationMethod: 'NorthAmerica',
    fajr: { type: 'fixed' as const, time: '6:00 AM' },
    dhuhr: { type: 'fixed' as const, time: '1:30 PM' },
    asr: { type: 'fixed' as const, time: '4:30 PM' },
    maghrib: { type: 'offset' as const, minutes: 5 },
    isha: { type: 'offset' as const, minutes: 10 },
    jumuah: { type: 'fixed' as const, time: '1:00 PM' }
  });

  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsGeocoding(true);
    const coords = await geocodeAddress(formData.address);
    setIsGeocoding(false);

    if (!coords) {
      alert('Could not find coordinates for this address. Please check the address and try again.');
      return;
    }

    const mosque: Omit<Mosque, 'id'> = {
      name: formData.name,
      address: formData.address,
      latitude: coords.lat,
      longitude: coords.lng,
      iqamaTimes: {
        fajr: formData.fajr,
        dhuhr: formData.dhuhr,
        asr: formData.asr,
        maghrib: formData.maghrib,
        isha: formData.isha,
        jumuah: formData.jumuah
      },
      events: [],
      calculationMethod: formData.calculationMethod,
      ...(formData.website && { website: formData.website })
    };

    // AM/PM validation (no adhan times available yet — we don't have lat/lng until geocoding)
    const prayerConfigs: Record<string, { type: 'fixed' | 'offset'; time?: string; minutes?: number }> = {
      fajr: formData.fajr,
      dhuhr: formData.dhuhr,
      asr: formData.asr,
      maghrib: formData.maghrib,
      isha: formData.isha,
    };
    const validationErrors = validateAllIqamaTimes(prayerConfigs);
    if (Object.keys(validationErrors).length > 0) {
      const firstErr = Object.values(validationErrors)[0];
      toast.error(firstErr.message);
      return;
    }

    setIsSaving(true);
    onAdd(mosque);
    setIsSaving(false);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePrayerTimeChange = (field: string, value: IqamaTime) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-[#1C1C1C] rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-[#1C1C1C] border-b border-gray-200 dark:border-white/[0.1] px-4 py-3 flex items-center justify-between backdrop-blur-sm">
          <h2 className="font-medium text-gray-900 dark:text-white">Add Masjid</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-900 dark:text-white/80" />
          </button>
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
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1.5">Website</label>
            <input
              type="text"
              value={formData.website}
              onChange={(e) => handleChange('website', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-[#282828] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white/40 transition-all"
              placeholder="e.g., https://www.masjidalnoor.org"
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
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Iqama Times *</h3>
            <div className="space-y-3">
              <PrayerTimePicker
                label="Fajr"
                value={formData.fajr}
                onChange={(value) => handlePrayerTimeChange('fajr', value)}
                required
                prayerKey="fajr"
              />
              <PrayerTimePicker
                label="Dhuhr"
                value={formData.dhuhr}
                onChange={(value) => handlePrayerTimeChange('dhuhr', value)}
                required
                prayerKey="dhuhr"
              />
              <PrayerTimePicker
                label="Asr"
                value={formData.asr}
                onChange={(value) => handlePrayerTimeChange('asr', value)}
                required
                prayerKey="asr"
              />
              <PrayerTimePicker
                label="Maghrib"
                value={formData.maghrib}
                onChange={(value) => handlePrayerTimeChange('maghrib', value)}
                required
                prayerKey="maghrib"
              />
              <PrayerTimePicker
                label="Isha"
                value={formData.isha}
                onChange={(value) => handlePrayerTimeChange('isha', value)}
                required
                prayerKey="isha"
              />
              <PrayerTimePicker
                label="Jumuah"
                value={formData.jumuah}
                onChange={(value) => handlePrayerTimeChange('jumuah', value)}
                required
                prayerKey="jumuah"
              />
            </div>
          </div>

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
              {(isGeocoding || isSaving) && (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {isGeocoding ? 'Finding Location...' : isSaving ? 'Saving...' : 'Add Masjid'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}