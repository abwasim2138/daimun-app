import { useState } from 'react';
import { X, Send, Loader, MapPin, CheckCircle, Building2 } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { API_URL } from '../utils/api';
import { SimpleCaptcha } from './SimpleCaptcha';

interface RequestMasjidModalProps {
  onClose: () => void;
}

export function RequestMasjidModal({ onClose }: RequestMasjidModalProps) {
  const [masjidName, setMasjidName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [website, setWebsite] = useState('');
  const [submitterName, setSubmitterName] = useState('');
  const [submitterEmail, setSubmitterEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);

  // API_URL imported from /utils/api.ts

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!captchaVerified) {
      setError('Please complete the verification challenge before submitting.');
      return;
    }

    setIsLoading(true);

    const url = `${API_URL}/masjid-requests`;
    const payload = {
      masjidName,
      address,
      city,
      state,
      website: website || null,
      submitterName: submitterName || null,
      submitterEmail: submitterEmail || null,
      notes: notes || null,
    };

    console.group('[RequestMasjid] Submitting request');
    console.log('URL:', url);
    console.log('Payload:', payload);
    console.time('[RequestMasjid] fetch');

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
          'apikey': publicAnonKey,
        },
        cache: 'no-store',
        body: JSON.stringify(payload),
      });

      console.timeEnd('[RequestMasjid] fetch');
      console.log('Status:', response.status, response.statusText);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        let errorMessage = 'Failed to submit request';
        // Always try to read the response body for debugging — even on 404
        const raw = await response.text();
        console.log('Error response body (raw):', raw);
        try {
          const data = JSON.parse(raw);
          // If we get JSON with version, the new server IS deployed
          if (data.version) console.log('Server version from 404:', data.version);
          errorMessage = data.error || errorMessage;
          if (data.path) errorMessage += ` (server saw path: ${data.path})`;
        } catch {
          // text/plain means old server version — Hono default 404
          if (response.status === 404) {
            errorMessage = 'Server hasn\'t been redeployed yet (got text/plain 404). Check /health for version.';
          } else {
            errorMessage = `Server error (${response.status}). Please try again.`;
          }
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Success response:', data);
      console.groupEnd();
      setSuccess(true);
    } catch (err: any) {
      console.error('[RequestMasjid] Error:', err);
      console.groupEnd();
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-[#1C1C1C] rounded-2xl max-w-md w-full shadow-2xl p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Request Submitted!</h3>
            <p className="text-gray-600 dark:text-white/70 mb-2">
              JazakAllahu Khairan for helping grow the community.
            </p>
            <p className="text-sm text-gray-500 dark:text-white/50 mb-6">
              An admin will review your request and add <span className="font-medium text-gray-700 dark:text-white/70">{masjidName}</span> to Dāimūn soon, inshaAllah.
            </p>
            <button
              onClick={onClose}
              className="w-full px-4 py-2.5 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors font-medium"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-[#1C1C1C] rounded-2xl max-w-md w-full shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-white/[0.1] px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
              <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Request a Masjid</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-900 dark:text-white/80" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          <p className="text-sm text-gray-600 dark:text-white/60">
            Don't see your masjid listed? Submit a request and an admin will review it.
          </p>

          {error && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-lg p-3">
              <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Masjid Info Section */}
          <div className="space-y-3">
            <div className="text-xs uppercase tracking-wider text-gray-500 dark:text-white/40 font-semibold">
              Masjid Information
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1.5">
                Masjid Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={masjidName}
                onChange={(e) => setMasjidName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-[#282828] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 transition-all"
                placeholder="e.g. Masjid Al Khaliq"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1.5">
                Street Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-[#282828] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 transition-all"
                placeholder="1234 Greenville Ave"
                disabled={isLoading}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1.5">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-[#282828] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 transition-all"
                  placeholder="Richardson"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1.5">
                  State <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-[#282828] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 transition-all"
                  placeholder="TX"
                  maxLength={2}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1.5">
                Website
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-[#282828] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 transition-all"
                placeholder="https://masjidalkhaliq.org"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Your Info Section */}
          <div className="space-y-3 pt-2">
            <div className="text-xs uppercase tracking-wider text-gray-500 dark:text-white/40 font-semibold">
              Your Information (optional)
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1.5">
                Your Name
              </label>
              <input
                type="text"
                value={submitterName}
                onChange={(e) => setSubmitterName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-[#282828] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 transition-all"
                placeholder="Optional"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1.5">
                Your Email
              </label>
              <input
                type="email"
                value={submitterEmail}
                onChange={(e) => setSubmitterEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-[#282828] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 transition-all"
                placeholder="Optional — for follow-up"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1.5">
              Additional Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-[#282828] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 transition-all resize-none"
              placeholder="Any details about iqama times, salah schedule, etc."
              disabled={isLoading}
            />
          </div>

          {/* Captcha */}
          <div className="pt-2">
            <SimpleCaptcha onVerified={setCaptchaVerified} />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-white/[0.03] text-gray-900 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.08] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 bg-emerald-600/10 dark:bg-emerald-500/10 border border-emerald-600/20 dark:border-emerald-400/20 text-emerald-700 dark:text-emerald-400 rounded-lg hover:bg-emerald-600/[0.15] dark:hover:bg-emerald-500/[0.15] transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
            >
              {isLoading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}