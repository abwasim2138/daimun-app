import { AlertCircle, MapPin, Clock, X, StickyNote, Edit2 } from 'lucide-react';
import { Mosque } from '../App';

interface JanazaAlert {
  id: string;
  mosqueId: string;
  dateTime: string;
  notes: string;
  createdAt: string;
}

interface JanazaAlertCardProps {
  janaza: JanazaAlert;
  mosque: Mosque | undefined;
  canEdit: boolean;
  onDelete: (id: string) => void;
  onEdit: (janaza: JanazaAlert) => void;
}

export function JanazaAlertCard({ janaza, mosque, canEdit, onDelete, onEdit }: JanazaAlertCardProps) {
  // Parse the date and time
  const janazaDateTime = new Date(janaza.dateTime);
  const now = new Date();

  // Check if janaza time has passed
  if (janazaDateTime < now) {
    return null; // Auto-hide after time passes
  }

  // Format date
  const formatDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long',
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  // Format time
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to remove this janaza alert?')) {
      onDelete(janaza.id);
    }
  };

  const handleEdit = () => {
    onEdit(janaza);
  };

  return (
    <div className="relative bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/40 dark:to-red-900/20 rounded-2xl p-5 border border-red-200 dark:border-red-800/50 shadow-lg">
      {/* Alert Icon Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-red-600 dark:bg-red-500 flex items-center justify-center shadow-md">
            <AlertCircle className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-red-900 dark:text-red-100">
              Janaza Alert
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300">
              إِنَّا لِلَّٰهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ
            </p>
          </div>
        </div>
        
        {canEdit && (
          <div className="flex gap-1">
            <button
              onClick={handleEdit}
              className="p-2 hover:bg-red-200 dark:hover:bg-red-800/40 rounded-full transition-colors"
              aria-label="Edit alert"
            >
              <Edit2 className="w-5 h-5 text-red-600 dark:text-red-400" strokeWidth={2} />
            </button>
            <button
              onClick={handleDelete}
              className="p-2 hover:bg-red-200 dark:hover:bg-red-800/40 rounded-full transition-colors"
              aria-label="Remove alert"
            >
              <X className="w-5 h-5 text-red-600 dark:text-red-400" strokeWidth={2} />
            </button>
          </div>
        )}
      </div>

      {/* Time Information */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-2 text-red-900 dark:text-red-100">
          <Clock className="w-5 h-5 flex-shrink-0" strokeWidth={2} />
          <div className="font-semibold">
            <span className="text-base">{formatDate(janazaDateTime)}</span>
            <span className="mx-2">•</span>
            <span className="text-lg">{formatTime(janazaDateTime)}</span>
          </div>
        </div>

        {/* Mosque Location */}
        {mosque && (
          <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
            <MapPin className="w-5 h-5 flex-shrink-0" strokeWidth={2} />
            <span className="font-medium">{mosque.name}</span>
          </div>
        )}

        {/* Additional Notes */}
        {janaza.notes && (
          <div className="flex items-start gap-2 text-red-800 dark:text-red-200 mt-3 pt-3 border-t border-red-200 dark:border-red-800/50">
            <StickyNote className="w-5 h-5 flex-shrink-0 mt-0.5" strokeWidth={2} />
            <p className="text-sm leading-relaxed">{janaza.notes}</p>
          </div>
        )}
      </div>

      {/* Prayer reminder */}
      <div className="bg-red-600/10 dark:bg-red-500/10 rounded-xl px-4 py-2 text-center">
        <p className="text-xs font-medium text-red-800 dark:text-red-300">
          May Allah grant them Jannah and give patience to their family
        </p>
      </div>
    </div>
  );
}