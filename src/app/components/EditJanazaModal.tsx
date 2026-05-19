import { X, AlertCircle, MapPin, Calendar, Clock, StickyNote } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Mosque } from '../App';

interface EditJanazaModalProps {
  isOpen: boolean;
  onClose: () => void;
  janaza: {
    id: string;
    mosqueId: string;
    dateTime: string;
    notes: string;
  };
  mosques: Mosque[];
  onSubmit: (id: string, mosqueId: string, dateTime: string, notes: string) => Promise<void>;
}

export function EditJanazaModal({ isOpen, onClose, janaza, mosques, onSubmit }: EditJanazaModalProps) {
  const [selectedMosqueId, setSelectedMosqueId] = useState(janaza.mosqueId);
  const [notes, setNotes] = useState(janaza.notes);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Parse existing dateTime
  const existingDate = new Date(janaza.dateTime);
  const [date, setDate] = useState(existingDate.toISOString().split('T')[0]);
  const [time, setTime] = useState(
    existingDate.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    })
  );

  // Reset form when janaza changes
  useEffect(() => {
    setSelectedMosqueId(janaza.mosqueId);
    setNotes(janaza.notes);
    const existingDate = new Date(janaza.dateTime);
    setDate(existingDate.toISOString().split('T')[0]);
    setTime(
      existingDate.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      })
    );
  }, [janaza]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMosqueId || !date || !time) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      // Combine date and time
      const dateTime = `${date}T${time}`;
      
      await onSubmit(janaza.id, selectedMosqueId, dateTime, notes);
      onClose();
    } catch (error) {
      console.error('Error updating janaza:', error);
      alert('Failed to update janaza alert. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-white/[0.1] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Edit Janaza Alert
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-white/60" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Masjid Selection */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
              <MapPin className="w-4 h-4" />
              Masjid *
            </label>
            <select
              value={selectedMosqueId}
              onChange={(e) => setSelectedMosqueId(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 text-gray-900 dark:text-white"
              required
            >
              <option value="">Select a masjid</option>
              {mosques.map(mosque => (
                <option key={mosque.id} value={mosque.id}>
                  {mosque.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
              <Calendar className="w-4 h-4" />
              Date *
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 text-gray-900 dark:text-white"
              required
            />
          </div>

          {/* Time */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
              <Clock className="w-4 h-4" />
              Time *
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 text-gray-900 dark:text-white"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
              <StickyNote className="w-4 h-4" />
              Additional Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Name of deceased, special instructions..."
              rows={3}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 resize-none"
            />
          </div>

          {/* Info Message */}
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-xl p-4">
            <p className="text-sm text-red-800 dark:text-red-300 leading-relaxed">
              إِنَّا لِلَّٰهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ
              <br />
              <span className="text-xs opacity-75">
                "Indeed, to Allah we belong and to Allah we shall return."
              </span>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-100 dark:bg-white/[0.08] hover:bg-gray-200 dark:hover:bg-white/[0.12] text-gray-700 dark:text-white font-medium rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Updating...' : 'Update Alert'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
