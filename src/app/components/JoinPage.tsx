import { useState, useMemo } from 'react';
import { ArrowLeft, UserPlus, Loader, CheckCircle, Eye, EyeOff, Shield } from 'lucide-react';
import { motion } from 'motion/react';
import { API_URL } from '../utils/api';
import { publicAnonKey } from '../utils/supabase/info';

interface JoinPageProps {
  onBack: () => void;
  onSwitchToLogin: () => void;
}

/**
 * Hidden sign-up page for approved contributors.
 * URL: #/join?email=user@example.com&name=John
 *
 * The admin sends this link after approving an access request.
 * It calls the existing /auth/signup endpoint which uses the
 * Supabase Admin API to create the user.
 */
export function JoinPage({ onBack, onSwitchToLogin }: JoinPageProps) {
  // Parse URL params from pathname query string or hash fallback
  const params = useMemo(() => {
    // Modern: /join?email=a@b.com&name=John
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has('email') || searchParams.has('name')) return searchParams;
    // Legacy hash fallback: #/join?email=a@b.com&name=John
    const hash = window.location.hash;
    const qIdx = hash.indexOf('?');
    if (qIdx === -1) return new URLSearchParams();
    return new URLSearchParams(hash.slice(qIdx + 1));
  }, []);

  const [name, setName] = useState(params.get('name') || '');
  const [email, setEmail] = useState(params.get('email') || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const passwordsMatch = password === confirmPassword;
  const passwordLongEnough = password.length >= 6;
  const canSubmit = name.trim() && email.trim() && passwordLongEnough && passwordsMatch && !isLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!passwordsMatch) {
      setError('Passwords do not match.');
      return;
    }
    if (!passwordLongEnough) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': publicAnonKey,
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account.');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Success state ──
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a]">
        <div className="bg-white/80 dark:bg-black/80 border-b border-gray-200/50 dark:border-white/[0.06] sticky top-0 z-20 backdrop-blur-xl">
          <div className="max-w-2xl mx-auto px-5 py-3 flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white transition-colors -ml-1 p-1"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">Back</span>
            </button>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-5 py-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-center"
          >
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-gray-900 dark:text-white mb-3">Account Created</h2>
            <p className="text-gray-600 dark:text-white/60 mb-2 max-w-sm mx-auto">
              As-salamu alaykum! Your contributor account is ready. You can now log in and start keeping iqama times accurate for the community.
            </p>
            <p className="text-sm text-gray-400 dark:text-white/30 mb-8">
              Use <span className="text-gray-700 dark:text-white/70">{email}</span> to sign in.
            </p>
            <button
              onClick={onSwitchToLogin}
              className="px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-xl hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm active:scale-[0.98]"
            >
              Log in now
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Sign-up form ──
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a]">
      <div className="bg-white/80 dark:bg-black/80 border-b border-gray-200/50 dark:border-white/[0.06] sticky top-0 z-20 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white transition-colors -ml-1 p-1"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Back</span>
          </button>
          <span className="text-sm text-gray-400 dark:text-white/40">Set Up Account</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 dark:from-emerald-500/15 dark:to-teal-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h1 className="text-gray-900 dark:text-white mb-2">Welcome to Daimun</h1>
            <p className="text-gray-500 dark:text-white/50 max-w-sm mx-auto">
              Your access request has been approved. Set a password below to activate your contributor account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl p-3"
              >
                <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
              </motion.div>
            )}

            {/* Name */}
            <div>
              <label className="block text-sm text-gray-700 dark:text-white/70 mb-2">
                Full name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-[#1C1C1C] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                placeholder="Your name"
                autoComplete="name"
                disabled={isLoading}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm text-gray-700 dark:text-white/70 mb-2">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-[#1C1C1C] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                placeholder="you@example.com"
                autoComplete="email"
                disabled={isLoading}
              />
              <p className="text-xs text-gray-400 dark:text-white/30 mt-1.5">
                Use the same email you submitted your access request with.
              </p>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm text-gray-700 dark:text-white/70 mb-2">
                Create a password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 pr-11 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-[#1C1C1C] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password.length > 0 && !passwordLongEnough && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">
                  At least 6 characters needed
                </p>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-sm text-gray-700 dark:text-white/70 mb-2">
                Confirm password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full px-4 py-2.5 border bg-white dark:bg-[#1C1C1C] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 rounded-xl focus:outline-none focus:ring-2 transition-all ${
                  confirmPassword.length > 0 && !passwordsMatch
                    ? 'border-red-300 dark:border-red-800/50 focus:ring-red-500/50'
                    : 'border-gray-300 dark:border-white/[0.15] focus:ring-emerald-500/50'
                }`}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                disabled={isLoading}
              />
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-xs text-red-500 dark:text-red-400 mt-1.5">
                  Passwords don't match
                </p>
              )}
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 dark:bg-emerald-500 text-white rounded-xl hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {isLoading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Create Account
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-gray-400 dark:text-white/30 text-center pt-1">
              Already have an account?{' '}
              <button type="button" onClick={onSwitchToLogin} className="text-blue-600 dark:text-blue-400 hover:underline">
                Log in
              </button>
            </p>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
