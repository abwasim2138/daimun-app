import { useState } from 'react';
import { X } from 'lucide-react';
import { Announcement } from '../App';

interface AddAnnouncementModalProps {
  mosqueId: string;
  mosqueName: string;
  onClose: () => void;
  onSubmit: (mosqueId: string, announcement: Omit<Announcement, 'id'>) => Promise<void>;
}

export function AddAnnouncementModal({
  mosqueId,
  mosqueName,
  onClose,
  onSubmit
}: AddAnnouncementModalProps) {
  const [formData, setFormData] = useState<{
    prayers: ('fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' | 'jumuah')[];
    newTime: string;
    message: string;
    startDate: string;
    endDate: string;
  }>({
    prayers: [],
    newTime: '',
    message: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const togglePrayer = (prayer: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' | 'jumuah') => {
    setFormData(prev => ({
      ...prev,
      prayers: prev.prayers.includes(prayer)
        ? prev.prayers.filter(p => p !== prayer)
        : [...prev.prayers, prayer]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.prayers.length === 0) {
      alert('Please select at least one prayer');
      return;
    }

    if (!formData.newTime) {
      alert('Please enter the new iqama time');
      return;
    }
    
    setIsSubmitting(true);

    try {
      await onSubmit(mosqueId, {
        prayers: formData.prayers,
        newTime: formData.newTime,
        message: formData.message,
        startDate: formData.startDate,
        ...(formData.endDate && { endDate: formData.endDate })
      });
      onClose();
    } catch (error) {
      console.error('Error adding announcement:', error);
      alert('Failed to add announcement. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-[#1C1C1C] rounded-lg max-w-md w-full">
        <div className="border-b border-gray-200 dark:border-white/[0.1] px-4 py-3 flex items-center justify-between">
          <h2 className="font-medium text-gray-900 dark:text-white">Add Announcement</h2>
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
            <label className="block text-xs text-gray-600 dark:text-white/60 mb-1.5 font-medium">Masjid</label>
            <div className="text-sm text-gray-900 dark:text-white font-medium">{mosqueName}</div>
          </div>

          <div>
            <label className="block text-xs text-gray-600 dark:text-white/60 mb-1.5 font-medium">Prayer *</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => togglePrayer('fajr')}
                className={`px-3 py-1 border rounded-lg ${formData.prayers.includes('fajr') ? 'bg-blue-600 text-white' : 'bg-white dark:bg-[#282828] text-gray-900 dark:text-white border-gray-300 dark:border-white/[0.15]'}`}
              >
                Fajr
              </button>
              <button
                type="button"
                onClick={() => togglePrayer('dhuhr')}
                className={`px-3 py-1 border rounded-lg ${formData.prayers.includes('dhuhr') ? 'bg-blue-600 text-white' : 'bg-white dark:bg-[#282828] text-gray-900 dark:text-white border-gray-300 dark:border-white/[0.15]'}`}
              >
                Dhuhr
              </button>
              <button
                type="button"
                onClick={() => togglePrayer('asr')}
                className={`px-3 py-1 border rounded-lg ${formData.prayers.includes('asr') ? 'bg-blue-600 text-white' : 'bg-white dark:bg-[#282828] text-gray-900 dark:text-white border-gray-300 dark:border-white/[0.15]'}`}
              >
                Asr
              </button>
              <button
                type="button"
                onClick={() => togglePrayer('maghrib')}
                className={`px-3 py-1 border rounded-lg ${formData.prayers.includes('maghrib') ? 'bg-blue-600 text-white' : 'bg-white dark:bg-[#282828] text-gray-900 dark:text-white border-gray-300 dark:border-white/[0.15]'}`}
              >
                Maghrib
              </button>
              <button
                type="button"
                onClick={() => togglePrayer('isha')}
                className={`px-3 py-1 border rounded-lg ${formData.prayers.includes('isha') ? 'bg-blue-600 text-white' : 'bg-white dark:bg-[#282828] text-gray-900 dark:text-white border-gray-300 dark:border-white/[0.15]'}`}
              >
                Isha
              </button>
              <button
                type="button"
                onClick={() => togglePrayer('jumuah')}
                className={`px-3 py-1 border rounded-lg ${formData.prayers.includes('jumuah') ? 'bg-blue-600 text-white' : 'bg-white dark:bg-[#282828] text-gray-900 dark:text-white border-gray-300 dark:border-white/[0.15]'}`}
              >
                Jumuah
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-600 dark:text-white/60 mb-1.5 font-medium">New Time *</label>
            <input
              type="time"
              required
              value={formData.newTime}
              onChange={(e) => setFormData(prev => ({ ...prev, newTime: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-[#282828] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white/40 transition-all"
            />
            <p className="text-xs text-gray-500 dark:text-white/50 mt-1.5">
              The new iqama time for the selected prayers
            </p>
          </div>

          <div>
            <label className="block text-xs text-gray-600 dark:text-white/60 mb-1.5 font-medium">Message *</label>
            <textarea
              required
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-[#282828] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white/40 transition-all resize-none"
              placeholder="e.g., Time changes to 8:30 PM"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 dark:text-white/60 mb-1.5 font-medium">Start Date *</label>
            <input
              type="date"
              required
              value={formData.startDate}
              onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-[#282828] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white/40 transition-all"
            />
            <p className="text-xs text-gray-500 dark:text-white/50 mt-1.5">
              When this announcement should start showing
            </p>
          </div>

          <div>
            <label className="block text-xs text-gray-600 dark:text-white/60 mb-1.5 font-medium">End Date (Optional)</label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-[#282828] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white/40 transition-all"
            />
            <p className="text-xs text-gray-500 dark:text-white/50 mt-1.5">
              When to stop showing this announcement (leave blank for permanent)
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-white/[0.03] text-gray-900 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.08] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isSubmitting && (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z\"></path>
                </svg>
              )}
              {isSubmitting ? 'Adding...' : 'Add Announcement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}