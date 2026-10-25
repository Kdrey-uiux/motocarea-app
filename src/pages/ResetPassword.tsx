import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ShieldCheck, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import MotoCareLogo from '../components/brand/MotoCareLogo';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      const { data: updated, error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      // Staff/admin links come from the Team page; send them back to the workshop login
      let loginPath = '/login';
      if (updated.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', updated.user.id)
          .maybeSingle();
        if (profile?.role === 'admin' || profile?.role === 'staff') loginPath = '/internal/login';
      }
      // The reset link signed this browser in; sign out so the new password is used to log in
      await supabase.auth.signOut({ scope: 'local' });

      // Magpadala ng signal sa lumang Tab 1 na tapos na ang reset
      const authChannel = new BroadcastChannel('motocare_auth_sync');
      authChannel.postMessage({ action: 'PASSWORD_RESET_SUCCESS' });
      authChannel.close();

      setSuccessMessage('Password successfully updated! Redirecting to Sign In...');
      setTimeout(() => {
        navigate(loginPath, { replace: true });
      }, 1500);
    } catch (err: unknown) {
      setErrorMessage((err instanceof Error && err.message) || 'Failed to update password. Link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/60 text-slate-900 flex items-center justify-center p-4 sm:p-6 selection:bg-orange-500 selection:text-white">
      <div className="max-w-md w-full bg-white border border-slate-200/80 rounded-2xl sm:rounded-[2rem] p-6 sm:p-8 shadow-xs space-y-6">
        
        <div className="flex justify-center">
          <Link to="/" className="group" aria-label="MotoCare home">
            <MotoCareLogo className="h-16 sm:h-20 w-auto text-slate-900 transition-transform group-hover:scale-[1.03]" />
          </Link>
        </div>

        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto mb-2 border border-orange-200/80 shadow-2xs">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Set New Password</h2>
          <p className="text-xs text-slate-500">
            Enter and confirm your new account password below.
          </p>
        </div>

        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-700 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="space-y-4 text-xs sm:text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3.5 pr-10 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 focus:bg-white text-xs sm:text-sm transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type new password"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3.5 pr-10 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 focus:bg-white text-xs sm:text-sm transition"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-3 rounded-full transition flex items-center justify-center gap-2 shadow-sm shadow-orange-500/20 active:scale-[0.98] cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Update Password</span>}
          </button>
        </form>

        <div className="text-center pt-2">
          <Link to="/login" className="text-xs text-orange-600 hover:text-orange-700 hover:underline font-semibold">
            Cancel & Back to Sign In
          </Link>
        </div>

      </div>
    </div>
  );
}