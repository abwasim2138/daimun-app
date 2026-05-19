import { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';
import { Event } from '../App';
import { formatDateForInput } from '../utils/dateUtils';

interface EditEventModalProps {
  mosqueId: string;
  mosqueName: string;
  event: Event;
  onClose: () => void;
  onUpdate: (mosqueId: string, eventId: string, event: Omit<Event, 'id'>) => void;
}

export function EditEventModal({ mosqueId, mosqueName, event, onClose, onUpdate }: EditEventModalProps) {
  // Parse the existing event data
  const isAfterPrayer = event.time?.toLowerCase().includes('after');
  const afterPrayerMatch = event.time?.toLowerCase().match(/after\s+(\w+)/);
  const afterPrayerName = afterPrayerMatch ? afterPrayerMatch[1].toLowerCase() : 'fajr';

  const isBeforePrayer = event.time?.toLowerCase().includes('before');
  const beforePrayerMatch = event.time?.toLowerCase().match(/(\d+)\s*min\s*before\s+(\w+)/);
  const beforePrayerName = beforePrayerMatch ? beforePrayerMatch[2].toLowerCase() : 'maghrib';
  const beforeMinutesVal = beforePrayerMatch ? beforePrayerMatch[1] : '30';

  const [formData, setFormData] = useState({
    title: event.title,
    date: formatDateForInput(event.date || ''),
    time: (isAfterPrayer || isBeforePrayer) ? '' : (event.time || ''),
    timeType: (isBeforePrayer ? 'before-prayer' : isAfterPrayer ? 'after-prayer' : 'specific') as 'specific' | 'after-prayer' | 'before-prayer',
    afterPrayer: afterPrayerName as 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha',
    beforePrayer: beforePrayerName as 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha',
    beforeMinutes: beforeMinutesVal,
    description: event.description || '',
    isRecurring: event.recurring?.enabled || false,
    recurringFrequency: (event.recurring?.frequency || 'weekly') as 'daily' | 'weekly' | 'monthly' | 'nth-day',
    dayOfWeek: event.recurring?.dayOfWeek?.toString() || '5',
    dayOfMonth: event.recurring?.dayOfMonth?.toString() || '1',
    nthWeek: (event.recurring?.nthWeek || 'last') as 'first' | 'second' | 'third' | 'fourth' | 'last',
    nthDayOfWeek: event.recurring?.nthDayOfWeek?.toString() || '0'
  });

  // Reset form when event changes
  useEffect(() => {
    const isAfterPrayer = event.time?.toLowerCase().includes('after');
    const afterPrayerMatch = event.time?.toLowerCase().match(/after\s+(\w+)/);
    const afterPrayerName = afterPrayerMatch ? afterPrayerMatch[1].toLowerCase() : 'fajr';

    const isBeforePrayer = event.time?.toLowerCase().includes('before');
    const beforePrayerMatch = event.time?.toLowerCase().match(/(\d+)\s*min\s*before\s+(\w+)/);
    const beforePrayerName = beforePrayerMatch ? beforePrayerMatch[2].toLowerCase() : 'maghrib';
    const beforeMinutesVal = beforePrayerMatch ? beforePrayerMatch[1] : '30';

    setFormData({
      title: event.title,
      date: formatDateForInput(event.date || ''),
      time: (isAfterPrayer || isBeforePrayer) ? '' : (event.time || ''),
      timeType: isBeforePrayer ? 'before-prayer' : isAfterPrayer ? 'after-prayer' : 'specific',
      afterPrayer: afterPrayerName as 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha',
      beforePrayer: beforePrayerName as 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha',
      beforeMinutes: beforeMinutesVal,
      description: event.description || '',
      isRecurring: event.recurring?.enabled || false,
      recurringFrequency: (event.recurring?.frequency || 'weekly') as 'daily' | 'weekly' | 'monthly' | 'nth-day',
      dayOfWeek: event.recurring?.dayOfWeek?.toString() || '5',
      dayOfMonth: event.recurring?.dayOfMonth?.toString() || '1',
      nthWeek: (event.recurring?.nthWeek || 'last') as 'first' | 'second' | 'third' | 'fourth' | 'last',
      nthDayOfWeek: event.recurring?.nthDayOfWeek?.toString() || '0'
    });
  }, [event]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedEvent: Omit<Event, 'id'> = {
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

    onUpdate(mosqueId, event.id, updatedEvent);
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
            <h2 className="font-medium text-gray-900 dark:text-white">Edit Event</h2>
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
              className="w-full px-3 py-2 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            />
          </div>

          {/* Recurring Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isRecurring"
              checked={formData.isRecurring}
              onChange={(e) => handleChange('isRecurring', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="isRecurring" className="text-sm text-gray-700 dark:text-white/70">
              Recurring Event
            </label>
          </div>

          {/* Recurring Options */}
          {formData.isRecurring ? (
            <>
              <div>
                <label className="block text-sm text-gray-700 dark:text-white/70 mb-1">Frequency *</label>
                <select
                  value={formData.recurringFrequency}
                  onChange={(e) => handleChange('recurringFrequency', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="nth-day">Nth Day of Month</option>
                </select>
              </div>

              {formData.recurringFrequency === 'daily' && (
                <div className="text-sm text-gray-500 dark:text-white/50 py-1">
                  This event will show every day.
                </div>
              )}

              {formData.recurringFrequency === 'weekly' && (
                <div>
                  <label className="block text-sm text-gray-700 dark:text-white/70 mb-1">Day of Week *</label>
                  <select
                    value={formData.dayOfWeek}
                    onChange={(e) => handleChange('dayOfWeek', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                  >
                    {[0, 1, 2, 3, 4, 5, 6].map(day => (
                      <option key={day} value={day}>{getDayName(day)}</option>
                    ))}
                  </select>
                </div>
              )}

              {formData.recurringFrequency === 'monthly' && (
                <div>
                  <label className="block text-sm text-gray-700 dark:text-white/70 mb-1">Day of Month *</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={formData.dayOfMonth}
                    onChange={(e) => handleChange('dayOfMonth', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                  />
                </div>
              )}

              {formData.recurringFrequency === 'nth-day' && (
                <>
                  <div>
                    <label className="block text-sm text-gray-700 dark:text-white/70 mb-1">Nth Week *</label>
                    <select
                      value={formData.nthWeek}
                      onChange={(e) => handleChange('nthWeek', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                    >
                      <option value="first">First</option>
                      <option value="second">Second</option>
                      <option value="third">Third</option>
                      <option value="fourth">Fourth</option>
                      <option value="last">Last</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 dark:text-white/70 mb-1">Day of Week *</label>
                    <select
                      value={formData.nthDayOfWeek}
                      onChange={(e) => handleChange('nthDayOfWeek', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                    >
                      {[0, 1, 2, 3, 4, 5, 6].map(day => (
                        <option key={day} value={day}>{getDayName(day)}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </>
          ) : (
            <div>
              <label className="block text-sm text-gray-700 dark:text-white/70 mb-1">Date *</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
              />
            </div>
          )}

          {/* Time Type Toggle */}
          <div>
            <label className="block text-sm text-gray-700 dark:text-white/70 mb-2">Time Type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleChange('timeType', 'specific')}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  formData.timeType === 'specific'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-white/[0.05] text-gray-700 dark:text-white/70 hover:bg-gray-200 dark:hover:bg-white/[0.08]'
                }`}
              >
                Specific Time
              </button>
              <button
                type="button"
                onClick={() => handleChange('timeType', 'after-prayer')}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  formData.timeType === 'after-prayer'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-white/[0.05] text-gray-700 dark:text-white/70 hover:bg-gray-200 dark:hover:bg-white/[0.08]'
                }`}
              >
                After Prayer
              </button>
              <button
                type="button"
                onClick={() => handleChange('timeType', 'before-prayer')}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  formData.timeType === 'before-prayer'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-white/[0.05] text-gray-700 dark:text-white/70 hover:bg-gray-200 dark:hover:bg-white/[0.08]'
                }`}
              >
                Before Prayer
              </button>
            </div>
          </div>

          {/* Time Input */}
          {formData.timeType === 'specific' ? (
            <div>
              <label className="block text-sm text-gray-700 dark:text-white/70 mb-1">Time *</label>
              <input
                type="time"
                required
                value={formData.time}
                onChange={(e) => handleChange('time', e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
              />
            </div>
          ) : formData.timeType === 'after-prayer' ? (
            <div>
              <label className="block text-sm text-gray-700 dark:text-white/70 mb-1">After Salah *</label>
              <select
                value={formData.afterPrayer}
                onChange={(e) => handleChange('afterPrayer', e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
              >
                <option value="fajr">Fajr</option>
                <option value="dhuhr">Dhuhr</option>
                <option value="asr">Asr</option>
                <option value="maghrib">Maghrib</option>
                <option value="isha">Isha</option>
              </select>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-sm text-gray-700 dark:text-white/70 mb-1">Before Salah *</label>
              <select
                value={formData.beforePrayer}
                onChange={(e) => handleChange('beforePrayer', e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
              >
                <option value="fajr">Before Fajr</option>
                <option value="dhuhr">Before Dhuhr</option>
                <option value="asr">Before Asr</option>
                <option value="maghrib">Before Maghrib</option>
                <option value="isha">Before Isha</option>
              </select>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="5"
                  max="120"
                  required
                  value={formData.beforeMinutes}
                  onChange={(e) => handleChange('beforeMinutes', e.target.value)}
                  className="w-20 px-3 py-2 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white text-center"
                />
                <span className="text-sm text-gray-500 dark:text-white/50">minutes before</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-700 dark:text-white/70 mb-1">Description (Optional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white resize-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 dark:bg-white/[0.08] hover:bg-gray-200 dark:hover:bg-white/[0.12] text-gray-900 dark:text-white rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              Update Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}