import { useState } from 'react';
import { X, Mail, Loader, ArrowLeft } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { SITE_URL } from '../utils/api';

interface ForgotPasswordModalProps {
  onClose: () => void;
  onSwitchToLogin: () => void;
}

export function ForgotPasswordModal({ onClose, onSwitchToLogin }: ForgotPasswordModalProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const SUPABASE_URL = `https://${projectId}.supabase.co`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': publicAnonKey,
        },
        body: JSON.stringify({
          email,
          redirect_to: SITE_URL,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error_description || data.msg || 'Failed to send reset email');
      }

      setSuccess(true);
    } catch (err: any) {
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
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Check Your Email</h3>
            <p className="text-gray-600 dark:text-white/70 mb-2">
              We've sent a password reset link from <span className="font-medium">Daimun</span> to:
            </p>
            <p className="text-gray-900 dark:text-white font-medium mb-4">{email}</p>
            <p className="text-sm text-gray-500 dark:text-white/50 mb-6">
              Click the link in the email to set your password. If you don't see it, check your spam folder — the email comes from Supabase (noreply@mail.app.supabase.io).
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-white/[0.03] text-gray-900 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.08] transition-colors font-medium"
              >
                Close
              </button>
              <button
                onClick={onSwitchToLogin}
                className="flex-1 px-4 py-2.5 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors font-medium"
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-[#1C1C1C] rounded-2xl max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-white/[0.1] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={onSwitchToLogin}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-lg transition-colors"
              aria-label="Back to Login"
            >
              <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-white/60" />
            </button>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Reset Password</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-900 dark:text-white/80" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-gray-600 dark:text-white/60">
            Enter the email address associated with your admin account and we'll send you a link to reset your password.
          </p>

          {error && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-lg p-3">
              <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-2">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-[#282828] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
              placeholder="admin@example.com"
              autoComplete="email"
              autoFocus
              disabled={isLoading}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onSwitchToLogin}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-white/[0.03] text-gray-900 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.08] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
            >
              {isLoading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  Send Reset Link
                </>
              )}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-white/[0.1] px-6 py-4 bg-gray-50 dark:bg-white/[0.02] rounded-b-2xl">
          <p className="text-sm text-gray-600 dark:text-white/60 text-center">
            Remember your password?{' '}
            <button
              onClick={onSwitchToLogin}
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              disabled={isLoading}
            >
              Log in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}