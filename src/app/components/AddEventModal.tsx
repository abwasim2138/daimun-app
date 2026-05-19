import { useState } from 'react';
import { X } from 'lucide-react';
import { Event } from '../App';

interface AddEventModalProps {
  mosqueId: string;
  mosqueName: string;
  onClose: () => void;
  onAdd: (mosqueId: string, event: Omit<Event, 'id'>) => void;
}

export function AddEventModal({ mosqueId, mosqueName, onClose, onAdd }: AddEventModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    timeType: 'specific' as 'specific' | 'after-prayer' | 'before-prayer',
    afterPrayer: 'fajr' as 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha',
    beforePrayer: 'maghrib' as 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha',
    beforeMinutes: '30',
    description: '',
    isRecurring: false,
    recurringFrequency: 'weekly' as 'daily' | 'weekly' | 'monthly' | 'nth-day',
    dayOfWeek: '5', // Friday by default
    dayOfMonth: '1',
    nthWeek: 'last' as 'first' | 'second' | 'third' | 'fourth' | 'last',
    nthDayOfWeek: '0' // Sunday by default
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const event: Omit<Event, 'id'> = {
      title: formData.title,
      date: formData.isRecurring ? '' : formData.date,
      time: formData.timeType === 'after-prayer' 
        ? `After ${formData.afterPrayer.charAt(0).toUpperCase() + formData.afterPrayer.slice(1)}`
        : formData.timeType === 'before-prayer'
        ? `${formData.beforeMinutes} min before ${formData.beforePrayer.charAt(0).toUpperCase() + formData.beforePrayer.slice(1)}`
        : formData.time,
      description: formData.description,
      recurring: formData.isRecurring ? {
        enabled: true,
        frequency: formData.recurringFrequency,
        dayOfWeek: formData.recurringFrequency === 'weekly' ? parseInt(formData.dayOfWeek) : undefined,
        dayOfMonth: formData.recurringFrequency === 'monthly' ? parseInt(formData.dayOfMonth) : undefined,
        nthWeek: formData.recurringFrequency === 'nth-day' ? formData.nthWeek : undefined,
        nthDayOfWeek: formData.recurringFrequency === 'nth-day' ? parseInt(formData.nthDayOfWeek) : undefined
      } : undefined
    };

    onAdd(mosqueId, event);
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getDayName = (day: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day];
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-[#1C1C1C] rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="border-b border-gray-200 dark:border-white/[0.1] px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="font-medium text-gray-900 dark:text-white">Add Event</h2>
            <p className="text-sm text-gray-600 dark:text-white/60 mt-0.5">{mosqueName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-900 dark:text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm text-gray-700 dark:text-white/70 mb-1">Event Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-white/[0.03] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white/30"
              placeholder="Friday Khutbah"
            />
          </div>

          {/* Recurring Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isRecurring"
              checked={formData.isRecurring}
              onChange={(e) => handleChange('isRecurring', e.target.checked)}
              className="w-4 h-4 text-gray-900 dark:text-white border-gray-300 dark:border-white/[0.15] rounded focus:ring-2 focus:ring-gray-900 dark:focus:ring-white/30"
            />
            <label htmlFor="isRecurring" className="text-sm text-gray-700 dark:text-white/70">
              Recurring Event
            </label>
          </div>

          {formData.isRecurring ? (
            <>
              {/* Recurring Frequency */}
              <div>
                <label className="block text-sm text-gray-700 dark:text-white/70 mb-1">Frequency *</label>
                <select
                  value={formData.recurringFrequency}
                  onChange={(e) => handleChange('recurringFrequency', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-white/[0.03] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white/30"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="nth-day">Nth Day of Month</option>
                </select>
              </div>

              {formData.recurringFrequency === 'daily' ? (
                <div className="text-sm text-gray-500 dark:text-white/50 py-1">
                  This event will show every day.
                </div>
              ) : formData.recurringFrequency === 'weekly' ? (
                <div>
                  <label className="block text-sm text-gray-700 dark:text-white/70 mb-1">Day of Week *</label>
                  <select
                    value={formData.dayOfWeek}
                    onChange={(e) => handleChange('dayOfWeek', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-white/[0.03] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white/30"
                  >
                    {[0, 1, 2, 3, 4, 5, 6].map(day => (
                      <option key={day} value={day}>{getDayName(day)}</option>
                    ))}
                  </select>
                </div>
              ) : formData.recurringFrequency === 'monthly' ? (
                <div>
                  <label className="block text-sm text-gray-700 dark:text-white/70 mb-1">Day of Month *</label>
                  <select
                    value={formData.dayOfMonth}
                    onChange={(e) => handleChange('dayOfMonth', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-white/[0.03] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white/30"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-sm text-gray-700 dark:text-white/70 mb-1">Nth Day of Month *</label>
                  <div className="flex gap-2">
                    <select
                      value={formData.nthWeek}
                      onChange={(e) => handleChange('nthWeek', e.target.value)}
                      className="w-1/2 px-3 py-2 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-white/[0.03] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white/30"
                    >
                      <option value="first">First</option>
                      <option value="second">Second</option>
                      <option value="third">Third</option>
                      <option value="fourth">Fourth</option>
                      <option value="last">Last</option>
                    </select>
                    <select
                      value={formData.nthDayOfWeek}
                      onChange={(e) => handleChange('nthDayOfWeek', e.target.value)}
                      className="w-1/2 px-3 py-2 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-white/[0.03] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white/30"
                    >
                      {[0, 1, 2, 3, 4, 5, 6].map(day => (
                        <option key={day} value={day}>{getDayName(day)}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div>
              <label className="block text-sm text-gray-700 dark:text-white/70 mb-1">Date *</label>
              <input
                type="date"
                required={!formData.isRecurring}
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-white/[0.03] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white/30"
              />
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-700 dark:text-white/70 mb-1">Time *</label>
            
            {/* Time Type Selection */}
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => handleChange('timeType', 'specific')}
                className={`flex-1 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  formData.timeType === 'specific'
                    ? 'bg-gray-900 dark:bg-white/[0.15] text-white border-gray-900 dark:border-white/[0.15]'
                    : 'bg-white dark:bg-white/[0.03] text-gray-700 dark:text-white/70 border-gray-300 dark:border-white/[0.15] hover:border-gray-400 dark:hover:border-white/[0.2]'
                }`}
              >
                Specific
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, timeType: 'after-prayer' }))}
                className={`flex-1 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  formData.timeType === 'after-prayer'
                    ? 'bg-gray-900 dark:bg-white/[0.15] text-white border-gray-900 dark:border-white/[0.15]'
                    : 'bg-white dark:bg-white/[0.03] text-gray-700 dark:text-white/70 border-gray-300 dark:border-white/[0.15] hover:border-gray-400 dark:hover:border-white/[0.2]'
                }`}
              >
                After Salah
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, timeType: 'before-prayer' }))}
                className={`flex-1 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  formData.timeType === 'before-prayer'
                    ? 'bg-gray-900 dark:bg-white/[0.15] text-white border-gray-900 dark:border-white/[0.15]'
                    : 'bg-white dark:bg-white/[0.03] text-gray-700 dark:text-white/70 border-gray-300 dark:border-white/[0.15] hover:border-gray-400 dark:hover:border-white/[0.2]'
                }`}
              >
                Before Salah
              </button>
            </div>

            {formData.timeType === 'specific' ? (
              <input
                type="time"
                required
                value={formData.time.includes(':') ? (() => {
                  // Convert 12-hour to 24-hour for input
                  try {
                    const match = formData.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
                    if (!match) return '';
                    let hours = parseInt(match[1]);
                    const minutes = match[2];
                    const period = match[3].toUpperCase();
                    if (period === 'PM' && hours !== 12) hours += 12;
                    else if (period === 'AM' && hours === 12) hours = 0;
                    return `${hours.toString().padStart(2, '0')}:${minutes}`;
                  } catch (e) {
                    return '';
                  }
                })() : ''}
                onChange={(e) => {
                  const timeValue = e.target.value;
                  const [hours, minutes] = timeValue.split(':').map(Number);
                  const period = hours >= 12 ? 'PM' : 'AM';
                  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
                  const formattedTime = `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
                  handleChange('time', formattedTime);
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-white/[0.03] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white/30"
              />
            ) : formData.timeType === 'after-prayer' ? (
              <select
                value={formData.afterPrayer}
                onChange={(e) => handleChange('afterPrayer', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-white/[0.03] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white/30"
              >
                <option value="fajr">After Fajr</option>
                <option value="dhuhr">After Dhuhr</option>
                <option value="asr">After Asr</option>
                <option value="maghrib">After Maghrib</option>
                <option value="isha">After Isha</option>
              </select>
            ) : (
              <div className="space-y-2">
                <select
                  value={formData.beforePrayer}
                  onChange={(e) => handleChange('beforePrayer', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-white/[0.03] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white/30"
                >
                  <option value="fajr">Before Fajr</option>
                  <option value="dhuhr">Before Dhuhr</option>
                  <option value="asr">Before Asr</option>
                  <option value="maghrib">Before Maghrib</option>
                  <option value="isha">Before Isha</option>
                </select>
                <div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="5"
                      max="120"
                      value={formData.beforeMinutes}
                      onChange={(e) => handleChange('beforeMinutes', e.target.value)}
                      className="w-20 px-3 py-2 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-white/[0.03] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white/30 text-center"
                    />
                    <span className="text-sm text-gray-500 dark:text-white/50">minutes before</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-700 dark:text-white/70 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-white/[0.03] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white/30 resize-none"
              rows={3}
              placeholder="Optional event description"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-white/[0.03] text-gray-900 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.08] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-gray-900 dark:bg-white/[0.15] text-white rounded-lg hover:bg-gray-800 dark:hover:bg-white/[0.2] transition-colors"
            >
              Add Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}