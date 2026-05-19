import { useState } from 'react';
import { X, Lock, Loader, CheckCircle, KeyRound, Eye, EyeOff } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface ResetPasswordModalProps {
  accessToken: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ResetPasswordModal({ accessToken, onClose, onSuccess }: ResetPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const SUPABASE_URL = `https://${projectId}.supabase.co`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'apikey': publicAnonKey,
        },
        body: JSON.stringify({
          password,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error_description || data.msg || 'Failed to reset password');
      }

      setSuccess(true);

      // Redirect to login after 2.5 seconds
      setTimeout(() => {
        onSuccess();
      }, 2500);
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
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">You're All Set!</h3>
            <p className="text-gray-600 dark:text-white/70 mb-4">
              Your password has been updated. You can now log in to your <span className="font-medium">Daimun</span> contributor account.
            </p>
            <p className="text-sm text-gray-500 dark:text-white/50">
              Redirecting to login...
            </p>
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
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
              <KeyRound className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Set Your Password</h2>
              <p className="text-[12px] text-gray-500 dark:text-white/40">Daimun Contributor Account</p>
            </div>
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
            Choose a password for your contributor account. You'll use this to log in and manage iqama times for your assigned masajid.
          </p>

          {error && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-lg p-3">
              <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 pr-11 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-[#282828] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                placeholder="Choose a secure password"
                autoComplete="new-password"
                autoFocus
                disabled={isLoading}
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/70 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-white/50 mt-1">At least 6 characters</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 pr-11 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-[#282828] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                placeholder="Re-enter your password"
                autoComplete="new-password"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/70 transition-colors"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-white/[0.03] text-gray-900 dark:text-white rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.08] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 bg-blue-600 dark:bg-blue-500 text-white rounded-xl hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
            >
              {isLoading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Set Password
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}