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
} from 'lucide-react';

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

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-[2rem] max-w-md w-full p-4 sm:p-5 space-y-3 sm:space-y-3.5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 my-auto max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 sm:pb-3">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-orange-50 text-orange-600 border border-orange-200/80 flex items-center justify-center shadow-xs shrink-0">
              <KeyRound className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">Change Password</h3>
              <p className="text-[11px] sm:text-xs text-slate-400">Protect your MotoCare account security</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Alert */}
        {passwordError && (
          <div className="p-2.5 sm:p-3 bg-rose-50 border border-rose-200/80 rounded-xl sm:rounded-2xl flex items-center gap-2 text-rose-700 text-xs font-medium animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{passwordError}</span>
          </div>
        )}

        {/* Success Alert */}
        {passwordSuccess && (
          <div className="p-2.5 sm:p-3 bg-emerald-50 border border-emerald-200/80 rounded-xl sm:rounded-2xl flex items-center gap-2 text-emerald-700 text-xs font-medium animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="flex-1">{passwordSuccess}</span>
          </div>
        )}

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3 text-xs sm:text-sm">
          {/* New Password Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              New Password <span className="text-orange-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onBlur={() => setTouched((p) => ({ ...p, newPassword: true }))}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter at least 8 characters"
                className={`w-full bg-slate-50/70 border rounded-xl pl-3 pr-9 py-2 sm:py-2.5 text-slate-900 focus:outline-none focus:bg-white text-xs sm:text-sm transition ${
                  isPasswordValid
                    ? 'border-emerald-300 bg-emerald-50/10 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
                    : touched.newPassword && newPassword.length > 0
                    ? 'border-amber-300 bg-amber-50/10 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10'
                    : 'border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                title={showNewPassword ? 'Hide password' : 'Show password'}
              >
                {showNewPassword ? <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              </button>
            </div>

            {/* Dynamic Strength Meter & 2-Column Checklist (Only appears when user starts typing) */}
            {newPassword.length > 0 && (
              <div className="mt-2 p-2.5 sm:p-3 bg-slate-50/90 border border-slate-200/80 rounded-xl space-y-1.5 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
                {/* Strength Bar */}
                <div>
                  <div className="flex justify-between items-center text-[10px] sm:text-[11px] mb-1">
                    <span className="text-slate-500 font-medium">Password Strength:</span>
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Confirm New Password <span className="text-orange-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onBlur={() => setTouched((p) => ({ ...p, confirmPassword: true }))}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                className={`w-full bg-slate-50/70 border rounded-xl pl-3 pr-9 py-2 sm:py-2.5 text-slate-900 focus:outline-none focus:bg-white text-xs sm:text-sm transition ${
                  confirmPassword.length > 0 && isPasswordsMatch
                    ? 'border-emerald-400 bg-emerald-50/10 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
                    : confirmPassword.length > 0 && !isPasswordsMatch
                    ? 'border-rose-300 bg-rose-50/10 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10'
                    : 'border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                title={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
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

          {/* Action Buttons with equalized heights & high-contrast disabled state */}
          <div className="pt-1.5 flex gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 h-9 sm:h-10 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs sm:text-sm hover:bg-slate-50 transition cursor-pointer active:scale-95 flex items-center justify-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={passwordLoading || !isPasswordValid || !isPasswordsMatch}
              className={`flex-1 h-9 sm:h-10 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-1.5 ${
                !isPasswordValid || !isPasswordsMatch || passwordLoading
                  ? 'bg-slate-100 text-slate-400 border border-slate-200/90 cursor-not-allowed shadow-none'
                  : 'bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/20 active:scale-95 cursor-pointer'
              }`}
            >
              {passwordLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              ) : (
                <span>Update Password</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
