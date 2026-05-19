import { useState } from 'react';
import { X, LogIn, Loader } from 'lucide-react';
import { useAuth } from './AuthContext';

interface LoginModalProps {
  onClose: () => void;
  onLoginSuccess?: () => void;
  onSwitchToRequestAccess?: () => void;
  onSwitchToForgotPassword?: () => void;
}

export function LoginModal({ onClose, onLoginSuccess, onSwitchToRequestAccess, onSwitchToForgotPassword }: LoginModalProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email, password);
      if (onLoginSuccess) {
        onLoginSuccess();
      } else {
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-[#1C1C1C] rounded-2xl max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-white/[0.1] px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Admin Login</h2>
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
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-2">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-[#282828] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center justify-end">
            {onSwitchToForgotPassword && (
              <button
                type="button"
                onClick={onSwitchToForgotPassword}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                disabled={isLoading}
              >
                Forgot password?
              </button>
            )}
          </div>

          <div className="flex gap-3 pt-4">
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
              className="flex-1 px-4 py-2.5 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
            >
              {isLoading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Login
                </>
              )}
            </button>
          </div>
        </form>

        {/* Footer */}
        {onSwitchToRequestAccess && (
          <div className="border-t border-gray-200 dark:border-white/[0.1] px-6 py-4 bg-gray-50 dark:bg-white/[0.02] rounded-b-2xl">
            <p className="text-sm text-gray-600 dark:text-white/60 text-center">
              Need an account?{' '}
              <button
                onClick={onSwitchToRequestAccess}
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                disabled={isLoading}
              >
                Request access
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}