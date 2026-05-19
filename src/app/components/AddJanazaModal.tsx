import { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { Mosque } from '../App';

interface AddJanazaModalProps {
  isOpen: boolean;
  onClose: () => void;
  mosques: Mosque[];
  onSubmit: (mosqueId: string, dateTime: string, notes: string) => Promise<void>;
}

export function AddJanazaModal({ isOpen, onClose, mosques, onSubmit }: AddJanazaModalProps) {
  const [selectedMosqueId, setSelectedMosqueId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMosqueId || !date || !time) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      const dateTime = `${date}T${time}`;
      await onSubmit(selectedMosqueId, dateTime, notes);
      
      // Reset form
      setSelectedMosqueId('');
      setDate('');
      setTime('');
      setNotes('');
      onClose();
    } catch (error) {
      console.error('Error adding janaza:', error);
      alert('Failed to add janaza alert. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedMosqueId('');
      setDate('');
      setTime('');
      setNotes('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-neutral-900 border-b border-gray-200 dark:border-white/[0.08] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" strokeWidth={2} />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Add Janaza Alert
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-full transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-400 dark:text-white/30" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Masjid Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white/60 mb-2">
              Masjid Location *
            </label>
            <select
              value={selectedMosqueId}
              onChange={(e) => setSelectedMosqueId(e.target.value)}
              required
              disabled={isSubmitting}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400 focus:border-transparent transition-all disabled:opacity-50"
            >
              <option value="">Select a masjid</option>
              {mosques.map((mosque) => (
                <option key={mosque.id} value={mosque.id}>
                  {mosque.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white/60 mb-2">
              Date *
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              disabled={isSubmitting}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400 focus:border-transparent transition-all disabled:opacity-50"
            />
          </div>

          {/* Time Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white/60 mb-2">
              Time *
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
              disabled={isSubmitting}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400 focus:border-transparent transition-all disabled:opacity-50"
            />
          </div>

          {/* Notes Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white/60 mb-2">
              Additional Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
              rows={3}
              placeholder="e.g., Burial at Mountain View Cemetery"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400 focus:border-transparent transition-all resize-none disabled:opacity-50"
            />
          </div>

          {/* Info Box */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-xl p-4">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              ⏰ This alert will automatically hide after the janaza time has passed.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-gray-100 dark:bg-white/[0.08] text-gray-700 dark:text-white/60 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-white/[0.12] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-600 to-amber-500 text-white rounded-xl font-medium hover:from-amber-700 hover:to-amber-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Adding...' : 'Add Alert'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
