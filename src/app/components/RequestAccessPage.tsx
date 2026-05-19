import { useState, useEffect } from 'react';
import { ArrowLeft, Send, Loader, CheckCircle, Shield, Clock, Users, Heart, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { API_URL } from '../utils/api';

interface RequestAccessPageProps {
  onBack: () => void;
  onSwitchToLogin: () => void;
}

const RESPONSIBILITIES = [
  {
    icon: Clock,
    title: 'Keep iqama times accurate',
    description: 'When your masjid updates their iqama schedule, you update it here — ideally the same day.',
  },
  {
    icon: Shield,
    title: 'Only edit masajid you attend',
    description: 'Stick to the masajid you personally pray at and can verify times for.',
  },
  {
    icon: Users,
    title: 'Serve your community',
    description: 'Hundreds of community members rely on accurate times to plan their day and get to salah on time.',
  },
  {
    icon: Heart,
    title: 'Act with amanah',
    description: 'This is a trust. Incorrect times mean people miss jama\'ah. Take it seriously, and earn reward for every person you help pray on time.',
  },
];

export function RequestAccessPage({ onBack, onSwitchToLogin }: RequestAccessPageProps) {
  const [step, setStep] = useState<'info' | 'form' | 'success'>('info');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedMosques, setSelectedMosques] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mosques, setMosques] = useState<{ id: string; name: string }[]>([]);

  // Fetch mosque list on mount
  useEffect(() => {
    const fetchMosques = async () => {
      try {
        const res = await fetch(`${API_URL}/mosques`, {
          headers: { 'apikey': publicAnonKey, 'Authorization': `Bearer ${publicAnonKey}` },
        });
        if (res.ok) {
          const data = await res.json();
          setMosques((data.mosques || []).map((m: any) => ({ id: m.id, name: m.name })));
        }
      } catch (err) {
        console.error('Failed to fetch mosques:', err);
      }
    };
    fetchMosques();
  }, []);

  // Reset scroll when step changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  const toggleMosque = (id: string) => {
    setSelectedMosques(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim()) {
      setError('Name and email are required.');
      return;
    }

    if (selectedMosques.length === 0) {
      setError('Please select at least one masjid you\'re associated with.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/request-access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': publicAnonKey,
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          mosqueIds: selectedMosques,
          mosqueNames: selectedMosques.map(id => {
            const m = mosques.find(mosque => mosque.id === id);
            return m?.name || id;
          }),
          message: message.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit request.');
      }

      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Success state ──
  if (step === 'success') {
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
            <h2 className="text-gray-900 dark:text-white mb-3">Request Submitted</h2>
            <p className="text-gray-600 dark:text-white/60 mb-2 max-w-sm mx-auto">
              JazakAllahu khairan for stepping up. An admin will review your request and get back to you at <span className="text-gray-900 dark:text-white/90">{email}</span>.
            </p>
            <p className="text-sm text-gray-400 dark:text-white/30 mb-8">
              This usually takes 1–2 days.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={onBack}
                className="px-5 py-2.5 bg-gray-100 dark:bg-white/[0.08] text-gray-700 dark:text-white/70 rounded-xl hover:bg-gray-200 dark:hover:bg-white/[0.12] transition-colors text-sm"
              >
                Back to home
              </button>
              <button
                onClick={onSwitchToLogin}
                className="px-5 py-2.5 bg-blue-600 dark:bg-blue-500 text-white rounded-xl hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm"
              >
                Already approved? Log in
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Info step: responsibilities ──
  if (step === 'info') {
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
            <span className="text-sm text-gray-400 dark:text-white/40">Request Access</span>
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
              <div className="w-14 h-14 bg-gradient-to-br from-amber-500/20 to-orange-500/20 dark:from-amber-500/15 dark:to-orange-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-7 h-7 text-amber-600 dark:text-amber-400" />
              </div>
              <h1 className="text-gray-900 dark:text-white mb-2">Become a Contributor</h1>
              <p className="text-gray-500 dark:text-white/50 max-w-sm mx-auto">
                Contributors keep iqama times accurate for their community. It's a responsibility and an ongoing sadaqah.
              </p>
            </div>

            {/* Responsibility cards */}
            <div className="space-y-3 mb-8">
              {RESPONSIBILITIES.map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 + i * 0.08 }}
                  className="rounded-2xl bg-white/70 dark:bg-white/[0.04] border border-gray-200/60 dark:border-white/[0.06] p-4 flex gap-4"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-gray-600 dark:text-white/60" />
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-900 dark:text-white/90 mb-1">{item.title}</div>
                    <p className="text-xs text-gray-500 dark:text-white/45">{item.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Amanah note */}
            <div className="rounded-2xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/30 p-4 mb-8">
              <p className="text-xs text-amber-800 dark:text-amber-300/80 text-center">
                "And who is better in speech than one who invites to Allah and does righteousness and says, 'Indeed, I am of the Muslims.'"
                <span className="block text-amber-600/70 dark:text-amber-400/50 mt-1">— Surah Fussilat 41:33</span>
              </p>
              <p className="text-xs text-amber-800 dark:text-amber-300/80 text-center mt-3 pt-3 border-t border-amber-200/40 dark:border-amber-800/20">
                "Whoever guides someone to goodness will have a reward similar to the one who does it."
                <span className="block text-amber-600/70 dark:text-amber-400/50 mt-1">— Prophet ﷺ (Sahih Muslim 1893)</span>
              </p>
            </div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col gap-3"
            >
              <button
                onClick={() => setStep('form')}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-xl hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm active:scale-[0.98]"
              >
                I understand — continue
              </button>
              <p className="text-xs text-gray-400 dark:text-white/30 text-center">
                Already have an account?{' '}
                <button onClick={onSwitchToLogin} className="text-blue-600 dark:text-blue-400 hover:underline">
                  Log in
                </button>
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Form step ──
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a]">
      <div className="bg-white/80 dark:bg-black/80 border-b border-gray-200/50 dark:border-white/[0.06] sticky top-0 z-20 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center justify-between">
          <button
            onClick={() => setStep('info')}
            className="flex items-center gap-2 text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white transition-colors -ml-1 p-1"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Back</span>
          </button>
          <span className="text-sm text-gray-400 dark:text-white/40">Your Details</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-8">
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-5"
        >
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl p-3"
              >
                <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

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
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-[#1C1C1C] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
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
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-[#1C1C1C] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              placeholder="you@example.com"
              autoComplete="email"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-400 dark:text-white/30 mt-1.5">We'll notify you when your request is approved.</p>
          </div>

          {/* Masjid association */}
          <div>
            <label className="block text-sm text-gray-700 dark:text-white/70 mb-2">
              Which masajid will you keep updated?
            </label>
            {mosques.length > 0 ? (
              <div className="space-y-2 max-h-56 overflow-y-auto rounded-xl border border-gray-200/60 dark:border-white/[0.08] p-2 bg-white dark:bg-[#1C1C1C]">
                {mosques.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleMosque(m.id)}
                    disabled={isLoading}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors text-sm ${
                      selectedMosques.includes(m.id)
                        ? 'bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-800 dark:text-blue-300'
                        : 'bg-gray-50 dark:bg-white/[0.03] border border-transparent text-gray-700 dark:text-white/60 hover:bg-gray-100 dark:hover:bg-white/[0.06]'
                    }`}
                  >
                    <Building2 className={`w-4 h-4 flex-shrink-0 ${
                      selectedMosques.includes(m.id) ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-white/30'
                    }`} />
                    <span className="flex-1 truncate">{m.name}</span>
                    {selectedMosques.includes(m.id) && (
                      <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 dark:text-white/30 py-3 text-center">Loading masajid...</p>
            )}
            {selectedMosques.length > 0 && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                {selectedMosques.length} masjid{selectedMosques.length > 1 ? '' : ''} selected
              </p>
            )}
          </div>

          {/* Optional message */}
          <div>
            <label className="block text-sm text-gray-700 dark:text-white/70 mb-2">
              Anything else? <span className="text-gray-400 dark:text-white/30">(optional)</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-[#1C1C1C] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none"
              placeholder="E.g. I'm the secretary at Masjid Al-Rahman and can keep the times current..."
              disabled={isLoading}
            />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || selectedMosques.length === 0}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-xl hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
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

          <p className="text-xs text-gray-400 dark:text-white/30 text-center pt-1">
            Already have an account?{' '}
            <button type="button" onClick={onSwitchToLogin} className="text-blue-600 dark:text-blue-400 hover:underline">
              Log in
            </button>
          </p>
        </motion.form>
      </div>
    </div>
  );
}