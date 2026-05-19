import { LogOut } from 'lucide-react';

interface LogoutConfirmDialogProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export function LogoutConfirmDialog({ onConfirm, onCancel }: LogoutConfirmDialogProps) {
  return (
    <div
      className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-white dark:bg-[#1C1C1C] rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden">
        <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/40 flex items-center justify-center mb-4">
            <LogOut className="w-6 h-6 text-red-500 dark:text-red-400" />
          </div>
          <h3 className="text-gray-900 dark:text-white text-lg">Log out?</h3>
          <p className="text-gray-500 dark:text-white/50 text-sm mt-1.5">
            You'll need to sign in again to access the admin dashboard.
          </p>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/[0.1] text-gray-700 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/[0.06] transition-colors active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 dark:bg-red-600 text-white hover:bg-red-600 dark:hover:bg-red-700 transition-colors active:scale-[0.98]"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
