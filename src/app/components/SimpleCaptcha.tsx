import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';

interface SimpleCaptchaProps {
  /** Called when the user solves the challenge correctly */
  onVerified: (verified: boolean) => void;
}

function generateChallenge(): { question: string; answer: number } {
  const ops = ['+', '-', 'x'] as const;
  const op = ops[Math.floor(Math.random() * ops.length)];

  let a: number, b: number, answer: number;

  switch (op) {
    case '+':
      a = Math.floor(Math.random() * 20) + 1;
      b = Math.floor(Math.random() * 20) + 1;
      answer = a + b;
      break;
    case '-':
      a = Math.floor(Math.random() * 20) + 5;
      b = Math.floor(Math.random() * a) + 1; // keep positive
      answer = a - b;
      break;
    case 'x':
      a = Math.floor(Math.random() * 9) + 2;
      b = Math.floor(Math.random() * 9) + 2;
      answer = a * b;
      break;
    default:
      a = 2; b = 3; answer = 5;
  }

  return { question: `${a} ${op === 'x' ? '×' : op} ${b}`, answer };
}

/**
 * SimpleCaptcha — lightweight math challenge to deter bots on public forms.
 * No external service required.
 */
export function SimpleCaptcha({ onVerified }: SimpleCaptchaProps) {
  const [challenge, setChallenge] = useState(generateChallenge);
  const [input, setInput] = useState('');
  const [verified, setVerified] = useState(false);
  const [wrong, setWrong] = useState(false);

  // Notify parent when verified state changes
  useEffect(() => {
    onVerified(verified);
  }, [verified, onVerified]);

  const refresh = useCallback(() => {
    setChallenge(generateChallenge());
    setInput('');
    setVerified(false);
    setWrong(false);
    onVerified(false);
  }, [onVerified]);

  const handleChange = (value: string) => {
    setInput(value);
    setWrong(false);

    const num = parseInt(value, 10);
    if (!isNaN(num) && num === challenge.answer) {
      setVerified(true);
    }
  };

  const handleBlur = () => {
    if (input && !verified) {
      setWrong(true);
    }
  };

  if (verified) {
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30 rounded-xl">
        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Verified</span>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-medium text-gray-500 dark:text-white/40 uppercase tracking-wider">
        Quick check
      </label>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 flex-1 px-3 py-2.5 bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.1] rounded-xl">
          <span className="text-sm text-gray-700 dark:text-white/70 font-medium whitespace-nowrap tabular-nums">
            {challenge.question} =
          </span>
          <input
            type="number"
            inputMode="numeric"
            value={input}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            placeholder="?"
            className={`w-16 bg-transparent text-sm font-medium text-center outline-none placeholder-gray-400 dark:placeholder-white/25 ${
              wrong
                ? 'text-red-600 dark:text-red-400'
                : 'text-gray-900 dark:text-white'
            }`}
            // hide spinner arrows
            style={{ MozAppearance: 'textfield' } as any}
          />
        </div>
        <button
          type="button"
          onClick={refresh}
          className="p-2 hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-lg transition-colors flex-shrink-0"
          aria-label="New challenge"
          title="New challenge"
        >
          <RefreshCw className="w-3.5 h-3.5 text-gray-400 dark:text-white/30" />
        </button>
      </div>
      {wrong && (
        <p className="text-[11px] text-red-500 dark:text-red-400 pl-1">
          Incorrect — try again or tap refresh for a new problem
        </p>
      )}
    </div>
  );
}
