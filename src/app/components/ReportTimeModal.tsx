import { useState, useCallback } from 'react';
import { X, Flag, Send, Loader, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { Mosque } from '../App';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { API_URL } from '../utils/api';
import { calculateIqamaTimes } from '../utils/iqamaCalculator';
import { SimpleCaptcha } from './SimpleCaptcha';

interface ReportTimeModalProps {
  mosque: Mosque;
  onClose: () => void;
}

const PRAYER_LABELS: Record<string, string> = {
  fajr: 'Fajr',
  dhuhr: 'Dhuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
  jumuah: 'Jumuah',
};

type ReportStatus = 'form' | 'submitting' | 'success' | 'error';

export function ReportTimeModal({ mosque, onClose }: ReportTimeModalProps) {
  const [selectedPrayers, setSelectedPrayers] = useState<Set<string>>(new Set());
  const [reportType, setReportType] = useState<'wrong-time' | 'outdated' | 'other'>('wrong-time');
  const [correctTime, setCorrectTime] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<ReportStatus>('form');
  const [error, setError] = useState<string | null>(null);
  const [captchaVerified, setCaptchaVerified] = useState(false);

  // API_URL imported from /utils/api.ts

  // Calculate current displayed times
  const calculated = calculateIqamaTimes(
    mosque.latitude, mosque.longitude, mosque.iqamaTimes, new Date(),
    mosque.calculationMethod || 'NorthAmerica',
    mosque.asrMethod || 'Standard',
    mosque.scheduledTimeChanges
  );

  const togglePrayer = useCallback((prayer: string) => {
    setSelectedPrayers(prev => {
      const next = new Set(prev);
      if (next.has(prayer)) next.delete(prayer);
      else next.add(prayer);
      return next;
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (selectedPrayers.size === 0 && reportType !== 'other') return;

    if (!captchaVerified) {
      setError('Please complete the verification challenge before submitting.');
      setStatus('error');
      return;
    }

    setStatus('submitting');
    setError(null);

    const url = `${API_URL}/time-corrections`;
    const report = {
      mosqueId: mosque.id,
      mosqueName: mosque.name,
      prayers: Array.from(selectedPrayers),
      reportType,
      correctTime: correctTime || null,
      notes: notes || null,
      currentTimes: Object.fromEntries(
        Array.from(selectedPrayers).map(p => [
          p,
          p === 'jumuah' ? 'Jumuah' : (calculated as any)[p]?.iqama || 'N/A',
        ])
      ),
    };

    console.group('[ReportTime] Submitting correction');
    console.log('URL:', url);
    console.log('Payload:', report);
    console.time('[ReportTime] fetch');

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
          'apikey': publicAnonKey,
        },
        body: JSON.stringify(report),
      });

      console.timeEnd('[ReportTime] fetch');
      console.log('Status:', response.status, response.statusText);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      const data = await response.json().catch(() => null);
      console.log('Response body:', data);

      if (!response.ok) {
        throw new Error(data?.error || data?.details || `Server error (${response.status})`);
      }

      console.groupEnd();
      setStatus('success');
    } catch (err: any) {
      console.error('[ReportTime] Error:', err);
      console.groupEnd();
      setError(err?.message || 'Unable to submit report. Please try again.');
      setStatus('error');
    }
  }, [selectedPrayers, reportType, correctTime, notes, mosque, calculated, captchaVerified]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full max-w-md bg-white dark:bg-[#1C1C1C] rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-y-auto z-10 shadow-xl">
        {/* Handle bar (mobile) */}
        <div className="sm:hidden flex justify-center pt-2 pb-1">
          <div className="w-9 h-1 rounded-full bg-gray-300 dark:bg-white/20" />
        </div>

        <div className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                <Flag className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h2 className="text-gray-900 dark:text-white font-medium">Report Incorrect Time</h2>
                <p className="text-xs text-gray-500 dark:text-white/40">{mosque.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-lg transition-colors"
            >
              <X className="w-4.5 h-4.5 text-gray-400 dark:text-white/40" />
            </button>
          </div>

          {/* Success state */}
          {status === 'success' && (
            <div className="text-center py-8">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-gray-900 dark:text-white font-medium mb-1">JazākAllāhu Khairan!</h3>
              <p className="text-sm text-gray-500 dark:text-white/50 max-w-xs mx-auto">
                Your report has been sent to the admin team. They'll review it and update the times if needed.
              </p>
              <button
                onClick={onClose}
                className="mt-6 px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-sm font-medium active:scale-[0.98] transition-transform"
              >
                Done
              </button>
            </div>
          )}

          {/* Form */}
          {(status === 'form' || status === 'submitting' || status === 'error') && (
            <>
              {/* Report type */}
              <div className="mb-5">
                <label className="block text-[11px] font-medium text-gray-500 dark:text-white/40 uppercase tracking-wider mb-2">
                  What's wrong?
                </label>
                <div className="space-y-2">
                  {[
                    { value: 'wrong-time' as const, label: 'Iqama time is incorrect', icon: Clock },
                    { value: 'outdated' as const, label: "Times haven\u2019t been updated", icon: AlertTriangle },
                    { value: 'other' as const, label: 'Other issue', icon: Flag },
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setReportType(option.value)}
                      className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left transition-all active:scale-[0.99] ${
                        reportType === option.value
                          ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/30'
                          : 'bg-gray-50 dark:bg-white/[0.04] border-gray-200 dark:border-white/[0.08] hover:border-gray-300 dark:hover:border-white/[0.15]'
                      }`}
                    >
                      <option.icon className={`w-4 h-4 ${
                        reportType === option.value
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-gray-400 dark:text-white/30'
                      }`} />
                      <span className={`text-sm ${
                        reportType === option.value
                          ? 'text-amber-800 dark:text-amber-300'
                          : 'text-gray-600 dark:text-white/60'
                      }`}>
                        {option.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Prayer selection */}
              {reportType !== 'other' && (
                <div className="mb-5">
                  <label className="block text-[11px] font-medium text-gray-500 dark:text-white/40 uppercase tracking-wider mb-2">
                    Which prayer(s)?
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'jumuah'].map(prayer => {
                      const isSelected = selectedPrayers.has(prayer);
                      const displayTime = prayer === 'jumuah' ? '' : calculated[prayer]?.iqama || '';
                      return (
                        <button
                          key={prayer}
                          onClick={() => togglePrayer(prayer)}
                          className={`flex flex-col items-center py-2.5 px-2 rounded-xl border transition-all active:scale-[0.97] ${
                            isSelected
                              ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/30'
                              : 'bg-gray-50 dark:bg-white/[0.04] border-gray-200 dark:border-white/[0.08]'
                          }`}
                        >
                          <span className={`text-xs font-medium ${
                            isSelected ? 'text-amber-700 dark:text-amber-300' : 'text-gray-700 dark:text-white/70'
                          }`}>
                            {PRAYER_LABELS[prayer]}
                          </span>
                          {displayTime && (
                            <span className={`text-[10px] mt-0.5 ${
                              isSelected ? 'text-amber-500 dark:text-amber-400/60' : 'text-gray-400 dark:text-white/30'
                            }`}>
                              {displayTime}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Correct time (optional) */}
              {reportType === 'wrong-time' && selectedPrayers.size > 0 && (
                <div className="mb-5">
                  <label className="block text-[11px] font-medium text-gray-500 dark:text-white/40 uppercase tracking-wider mb-1.5">
                    What's the correct time? <span className="normal-case text-gray-400 dark:text-white/20">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={correctTime}
                    onChange={e => setCorrectTime(e.target.value)}
                    placeholder="e.g. 6:30 AM"
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.1] rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 dark:focus:border-amber-400 transition-colors"
                  />
                </div>
              )}

              {/* Notes */}
              <div className="mb-5">
                <label className="block text-[11px] font-medium text-gray-500 dark:text-white/40 uppercase tracking-wider mb-1.5">
                  Additional details <span className="normal-case text-gray-400 dark:text-white/20">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="How do you know the correct time? (e.g., I pray there regularly, I saw the sign at the masjid)"
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.1] rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 dark:focus:border-amber-400 transition-colors resize-none"
                />
              </div>

              {/* Captcha */}
              <div className="mb-5">
                <SimpleCaptcha onVerified={setCaptchaVerified} />
              </div>

              {/* Error message */}
              {status === 'error' && error && (
                <div className="mb-4 px-3 py-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/30 rounded-xl">
                  <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={status === 'submitting' || (selectedPrayers.size === 0 && reportType !== 'other')}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
              >
                {status === 'submitting' ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Submitting…</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Report</span>
                  </>
                )}
              </button>

              <p className="text-[11px] text-gray-400 dark:text-white/25 text-center mt-3">
                Reports are anonymous and reviewed by masjid admins
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}