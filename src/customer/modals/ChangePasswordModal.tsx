import { createPortal } from 'react-dom';
import { useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import {
  KeyRound,
  Eye,
  EyeOff,
  Loader2,
  X,
  AlertCircle,
  CheckCircle2,
  Check
} from '../../components/icons';
import { ScrollLock } from '../../hooks/useLockBodyScroll';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [touched, setTouched] = useState({
    newPassword: false,
    confirmPassword: false,
  });

  // Concise 6-Point Strict Password Criteria (Zero text-wrapping across all screen widths)
  const passwordCriteria = useMemo(() => [
    { id: 'length', label: '8+ characters', valid: newPassword.length >= 8 },
    { id: 'uppercase', label: 'Uppercase (A-Z)', valid: /[A-Z]/.test(newPassword) },
    { id: 'lowercase', label: 'Lowercase (a-z)', valid: /[a-z]/.test(newPassword) },
    { id: 'number', label: 'Number (0-9)', valid: /[0-9]/.test(newPassword) },
    { id: 'special', label: 'Special symbol', valid: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~]/.test(newPassword) },
    { id: 'nospace', label: 'No spaces', valid: !/\s/.test(newPassword) && newPassword.length > 0 },
  ], [newPassword]);

  const passwordScore = useMemo(() => {
    return passwordCriteria.filter((c) => c.valid).length;
  }, [passwordCriteria]);

  const isPasswordValid = passwordScore === passwordCriteria.length;
  const isPasswordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;

  if (!isOpen) return null;

  const fieldBase =
    'w-full bg-white border rounded-xl pl-3.5 pr-11 py-2.5 text-sm text-slate-900 placeholder:not-italic placeholder:text-slate-400 focus:outline-none focus:ring-4 transition';
  const eyeButton =
    'absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!isPasswordValid) {
      setPasswordError('Please fulfill all password security requirements below.');
      return;
    }

    if (!isPasswordsMatch) {
      setPasswordError('Passwords do not match. Please re-enter.');
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setPasswordSuccess('Password successfully updated!');
      setNewPassword('');
      setConfirmPassword('');
      setTouched({ newPassword: false, confirmPassword: false });
      setTimeout(() => {
        onClose();
        setPasswordSuccess(null);
      }, 1500);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to change password.';
      setPasswordError(errorMsg);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleClose = () => {
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
    setPasswordSuccess(null);
    setTouched({ newPassword: false, confirmPassword: false });
    onClose();
  };

  // Rendered at the end of <body> so the dark overlay always covers the whole screen
  return createPortal(
    <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <ScrollLock />
      <form
        onSubmit={handleSubmit}
        className="bg-white w-full max-w-md rounded-[1.75rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-slate-200/80 flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-11 h-11 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-lg font-bold tracking-tight text-slate-900">Change password</h3>
              <p className="text-sm text-slate-500">Use one you don&apos;t use anywhere else.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">

        {/* Error Alert */}
        {passwordError && (
          <div className="p-3 bg-rose-50 border border-rose-200/80 rounded-2xl flex items-center gap-2 text-rose-700 text-sm animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{passwordError}</span>
          </div>
        )}

        {/* Success Alert */}
        {passwordSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-2xl flex items-center gap-2 text-emerald-700 text-sm animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="flex-1">{passwordSuccess}</span>
          </div>
        )}

          {/* New Password Field */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              New password
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onBlur={() => setTouched((p) => ({ ...p, newPassword: true }))}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter at least 8 characters"
                className={`${fieldBase} ${
                  isPasswordValid
                    ? 'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500/10'
                    : touched.newPassword && newPassword.length > 0
                    ? 'border-amber-300 focus:border-orange-500 focus:ring-orange-500/10'
                    : 'border-slate-200 focus:border-orange-500 focus:ring-orange-500/10'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className={eyeButton}
                title={showNewPassword ? 'Hide password' : 'Show password'}
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Dynamic Strength Meter & 2-Column Checklist (Only appears when user starts typing) */}
            {newPassword.length > 0 && (
              <div className="mt-2 p-3 bg-slate-50 rounded-xl space-y-2 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
                {/* Strength Bar */}
                <div>
                  <div className="flex justify-between items-center text-[10px] sm:text-[11px] mb-1">
                    <span className="text-slate-500">Strength</span>
                    <span
                      className={`font-bold ${
                        passwordScore <= 2
                          ? 'text-rose-500'
                          : passwordScore <= 4
                          ? 'text-amber-500'
                          : passwordScore === 5
                          ? 'text-sky-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      {passwordScore <= 2
                        ? 'Weak'
                        : passwordScore <= 4
                        ? 'Moderate'
                        : passwordScore === 5
                        ? 'Good'
                        : 'Strong'}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden flex gap-0.5">
                    {[1, 2, 3, 4, 5, 6].map((step) => (
                      <div
                        key={step}
                        className={`h-full flex-1 transition-all duration-300 ${
                          step <= passwordScore
                            ? passwordScore <= 2
                              ? 'bg-rose-500'
                              : passwordScore <= 4
                              ? 'bg-amber-500'
                              : passwordScore === 5
                              ? 'bg-sky-500'
                              : 'bg-emerald-500'
                            : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* 2-Column Requirements Grid (Zero wrap, 3 compact rows on both mobile and desktop) */}
                <div className="grid grid-cols-2 gap-x-2.5 gap-y-1 pt-0.5 text-[10.5px] sm:text-[11px]">
                  {passwordCriteria.map((criterion) => (
                    <div
                      key={criterion.id}
                      className={`flex items-center gap-1.5 transition-colors whitespace-nowrap truncate ${
                        criterion.valid
                          ? 'text-emerald-700 font-medium'
                          : 'text-slate-400'
                      }`}
                    >
                      {criterion.valid ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0" />
                      )}
                      <span className="truncate leading-tight">{criterion.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password Field */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Confirm new password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onBlur={() => setTouched((p) => ({ ...p, confirmPassword: true }))}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                className={`${fieldBase} ${
                  confirmPassword.length > 0 && isPasswordsMatch
                    ? 'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500/10'
                    : confirmPassword.length > 0 && !isPasswordsMatch
                    ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10'
                    : 'border-slate-200 focus:border-orange-500 focus:ring-orange-500/10'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className={eyeButton}
                title={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Real-time Matching Feedback */}
            {confirmPassword.length > 0 && !isPasswordsMatch && (
              <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1 font-medium leading-tight animate-in fade-in">
                <X className="w-3.5 h-3.5 shrink-0" /> Passwords do not match.
              </p>
            )}
            {confirmPassword.length > 0 && isPasswordsMatch && (
              <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-medium leading-tight animate-in fade-in">
                <Check className="w-3.5 h-3.5 shrink-0" /> Passwords match.
              </p>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-slate-200/80 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={passwordLoading || !isPasswordValid || !isPasswordsMatch}
            className="px-5 py-2 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold shadow-md shadow-orange-500/25 transition cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed disabled:active:scale-100 disabled:hover:bg-orange-500"
          >
            {passwordLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Update password
          </button>
        </div>
      </form>
    </div>
    ,
    document.body
  );
}
