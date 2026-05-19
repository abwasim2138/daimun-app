import { useState, useCallback } from 'react';
import { X, Bug, Send, Loader, CheckCircle } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { API_URL } from '../utils/api';
import { SimpleCaptcha } from './SimpleCaptcha';

interface BugReportModalProps {
  onClose: () => void;
}

type ReportStatus = 'form' | 'submitting' | 'success' | 'error';

const CATEGORY_OPTIONS = [
  { value: 'wrong-data', label: 'Wrong data displayed' },
  { value: 'ui-bug', label: 'UI / layout issue' },
  { value: 'crash', label: 'App crash or freeze' },
  { value: 'feature-broken', label: 'Feature not working' },
  { value: 'other', label: 'Other' },
] as const;

type Category = typeof CATEGORY_OPTIONS[number]['value'];

export function BugReportModal({ onClose }: BugReportModalProps) {
  const [category, setCategory] = useState<Category>('ui-bug');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState('');
  const [status, setStatus] = useState<ReportStatus>('form');
  const [error, setError] = useState<string | null>(null);
  const [captchaVerified, setCaptchaVerified] = useState(false);

  // API_URL imported from /utils/api.ts

  const handleSubmit = useCallback(async () => {
    if (!description.trim()) return;

    if (!captchaVerified) {
      setError('Please complete the verification challenge before submitting.');
      setStatus('error');
      return;
    }

    setStatus('submitting');
    setError(null);

    const url = `${API_URL}/bug-reports`;
    const report = {
      category,
      description: description.trim(),
      steps: steps.trim() || null,
      userAgent: navigator.userAgent,
      screenSize: `${window.innerWidth}x${window.innerHeight}`,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    };

    console.group('[BugReport] Submitting report');
    console.log('URL:', url);
    console.log('Payload:', report);
    console.time('[BugReport] fetch');

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

      console.timeEnd('[BugReport] fetch');
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
      console.error('[BugReport] Error:', err);
      console.groupEnd();
      setError(err?.message || 'Unable to submit report. Please try again.');
      setStatus('error');
    }
  }, [category, description, steps, captchaVerified]);

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
              <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                <Bug className="w-4.5 h-4.5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-gray-900 dark:text-white font-medium">Report a Bug</h2>
                <p className="text-xs text-gray-500 dark:text-white/40">Help us improve Daimun</p>
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
              <h3 className="text-gray-900 dark:text-white font-medium mb-1">JazakAllahu Khairan!</h3>
              <p className="text-sm text-gray-500 dark:text-white/50 max-w-xs mx-auto">
                Your bug report has been sent. We'll look into it and fix it as soon as possible.
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
              {/* Category */}
              <div className="mb-5">
                <label className="block text-[11px] font-medium text-gray-500 dark:text-white/40 uppercase tracking-wider mb-2">
                  Category
                </label>
                <div className="space-y-2">
                  {CATEGORY_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      onClick={() => setCategory(option.value)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-left transition-all active:scale-[0.99] ${
                        category === option.value
                          ? 'bg-red-50 dark:bg-red-500/10 border-red-300 dark:border-red-500/30'
                          : 'bg-gray-50 dark:bg-white/[0.04] border-gray-200 dark:border-white/[0.08] hover:border-gray-300 dark:hover:border-white/[0.15]'
                      }`}
                    >
                      <span className={`text-sm ${
                        category === option.value
                          ? 'text-red-800 dark:text-red-300'
                          : 'text-gray-600 dark:text-white/60'
                      }`}>
                        {option.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="mb-5">
                <label className="block text-[11px] font-medium text-gray-500 dark:text-white/40 uppercase tracking-wider mb-1.5">
                  What happened? <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe the issue you experienced..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.1] rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 dark:focus:border-red-400 transition-colors resize-none"
                />
              </div>

              {/* Steps to reproduce */}
              <div className="mb-5">
                <label className="block text-[11px] font-medium text-gray-500 dark:text-white/40 uppercase tracking-wider mb-1.5">
                  Steps to reproduce <span className="normal-case text-gray-400 dark:text-white/20">(optional)</span>
                </label>
                <textarea
                  value={steps}
                  onChange={e => setSteps(e.target.value)}
                  placeholder="1. Go to...&#10;2. Tap on...&#10;3. See error"
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.1] rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 dark:focus:border-red-400 transition-colors resize-none"
                />
              </div>

              {/* Auto-captured info note */}
              <div className="mb-5 px-3 py-2 bg-gray-50 dark:bg-white/[0.03] rounded-xl">
                <p className="text-[11px] text-gray-400 dark:text-white/25">
                  Device info and screen size are automatically included to help us debug.
                </p>
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
                disabled={status === 'submitting' || !description.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
              >
                {status === 'submitting' ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Report</span>
                  </>
                )}
              </button>

              <p className="text-[11px] text-gray-400 dark:text-white/25 text-center mt-3">
                Bug reports are anonymous and reviewed by the dev team
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}