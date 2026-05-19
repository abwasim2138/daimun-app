import { useState, useMemo } from 'react';
import { IqamaTime } from '../App';
import { Clock, Timer, AlertCircle } from 'lucide-react';
import { validateIqamaTime, IqamaValidationError } from '../utils/iqamaValidation';

interface PrayerTimePickerProps {
  label: string;
  value: IqamaTime | string; // Support legacy string format
  onChange: (value: IqamaTime) => void;
  required?: boolean;
  /** Which prayer this picker is for — enables AM/PM and adhan guardrails */
  prayerKey?: string;
  /** Adhan time string (e.g. "5:42 AM") — enables "not before adhan" check */
  adhanTime?: string;
}

export function PrayerTimePicker({ label, value, onChange, required, prayerKey, adhanTime }: PrayerTimePickerProps) {
  // Handle legacy string format by converting to IqamaTime
  const getInitialValue = (): IqamaTime => {
    if (typeof value === 'string') {
      return { type: 'fixed', time: value };
    }
    return value;
  };

  const [config, setConfig] = useState<IqamaTime>(getInitialValue());

  // Live inline validation
  const validationError: IqamaValidationError | null = useMemo(() => {
    if (!prayerKey) return null;
    return validateIqamaTime(prayerKey, config, adhanTime);
  }, [prayerKey, config, adhanTime]);

  const handleTypeChange = (type: 'fixed' | 'offset') => {
    const newConfig: IqamaTime = {
      type,
      time: type === 'fixed' ? (config.time || '12:00 PM') : undefined,
      minutes: type === 'offset' ? (config.minutes || 10) : undefined
    };
    setConfig(newConfig);
    onChange(newConfig);
  };

  const handleTimeChange = (time: string) => {
    const newConfig = { ...config, time };
    setConfig(newConfig);
    onChange(newConfig);
  };

  const handleMinutesChange = (minutes: number) => {
    const clamped = Math.max(0, Math.min(60, minutes));
    const newConfig = { ...config, minutes: clamped };
    setConfig(newConfig);
    onChange(newConfig);
  };

  const hasError = validationError?.severity === 'error';
  const hasWarning = validationError?.severity === 'warning';

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-white/70">{label}</label>
      
      {/* Type Toggle */}
      <div className="flex gap-2 mb-2">
        <button
          type="button"
          onClick={() => handleTypeChange('fixed')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
            config.type === 'fixed'
              ? 'bg-gray-900 dark:bg-white/[0.2] text-white border-gray-900 dark:border-white/[0.2]'
              : 'bg-white dark:bg-[#282828] text-gray-700 dark:text-white/70 border-gray-300 dark:border-white/[0.15] hover:bg-gray-50 dark:hover:bg-white/[0.08]'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span className="text-sm">Fixed Time</span>
        </button>
        <button
          type="button"
          onClick={() => handleTypeChange('offset')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
            config.type === 'offset'
              ? 'bg-gray-900 dark:bg-white/[0.2] text-white border-gray-900 dark:border-white/[0.2]'
              : 'bg-white dark:bg-[#282828] text-gray-700 dark:text-white/70 border-gray-300 dark:border-white/[0.15] hover:bg-gray-50 dark:hover:bg-white/[0.08]'
          }`}
        >
          <Timer className="w-4 h-4" />
          <span className="text-sm">After Adhan</span>
        </button>
      </div>

      {/* Input Field */}
      {config.type === 'fixed' ? (
        <input
          type="text"
          required={required}
          value={config.time || ''}
          onChange={(e) => handleTimeChange(e.target.value)}
          className={`w-full px-3 py-2 border bg-white dark:bg-[#282828] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 rounded-lg focus:outline-none focus:ring-2 transition-all ${
            hasError
              ? 'border-red-400 dark:border-red-500/60 focus:ring-red-500/40'
              : hasWarning
                ? 'border-amber-400 dark:border-amber-500/60 focus:ring-amber-500/40'
                : 'border-gray-300 dark:border-white/[0.15] focus:ring-gray-900 dark:focus:ring-white/40'
          }`}
          placeholder="e.g., 6:00 AM"
        />
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="number"
            required={required}
            min="0"
            max="60"
            value={config.minutes || 0}
            onChange={(e) => handleMinutesChange(parseInt(e.target.value) || 0)}
            className={`flex-1 px-3 py-2 border bg-white dark:bg-[#282828] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 transition-all ${
              hasError
                ? 'border-red-400 dark:border-red-500/60 focus:ring-red-500/40'
                : hasWarning
                  ? 'border-amber-400 dark:border-amber-500/60 focus:ring-amber-500/40'
                  : 'border-gray-300 dark:border-white/[0.15] focus:ring-gray-900 dark:focus:ring-white/40'
            }`}
          />
          <span className="text-sm text-gray-600 dark:text-white/60">minutes after adhan</span>
        </div>
      )}

      {/* Adhan reference hint */}
      {adhanTime && !validationError && config.type === 'fixed' && (
        <p className="text-[11px] text-gray-400 dark:text-white/30">
          Adhan: {adhanTime}
        </p>
      )}

      {/* Inline validation message */}
      {validationError && (
        <div className={`flex items-start gap-1.5 text-[12px] ${
          hasError ? 'text-red-500 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
        }`}>
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>{validationError.message}</span>
        </div>
      )}
    </div>
  );
}
