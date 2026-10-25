import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  authenticateInternal, 
  getRememberedEmail,
  getInternalSession
} from '../utils/internalAuth';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  Loader2, 
  AlertCircle,
} from '../../components/icons';
import { useThemePreference } from '../../utils/theme';
import { CAPTCHA_ENABLED } from '../../lib/captcha';
import TurnstileWidget, { type TurnstileHandle } from '../../components/auth/TurnstileWidget';
import MotoCareLogo from '../../components/brand/MotoCareLogo';

export default function InternalLogin() {
  const navigate = useNavigate();

  // Same look as the console: saved light/dark choice and the iOS system font
  const [, , isDarkTheme] = useThemePreference();
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('ios-ui');
    return () => root.classList.remove('ios-ui');
  }, []);

  // Prefill the remembered workstation email
  const [email, setEmail] = useState(getRememberedEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => Boolean(getRememberedEmail()));

  const [loading, setLoading] = useState(false);
  // Cloudflare check (only when a site key is set): one token per sign-in try
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<TurnstileHandle>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);

  // Already logged in on this tab: go straight to the console
  useEffect(() => {
    const active = getInternalSession();
    if (active && active.isActive !== false) {
      navigate('/internal', { replace: true });
    }
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    // Quick checks before asking the server
    if (!cleanEmail) {
      setErrorMessage('Enter your work email.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMessage('Enter a valid email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Enter your password.');
      return;
    }
    if (CAPTCHA_ENABLED && !captchaToken) {
      setErrorMessage('Please finish the security check above the button.');
      return;
    }
    setLoading(true);
    setErrorMessage(null);

    try {
      const result = await authenticateInternal(cleanEmail, password, rememberMe, captchaToken ?? undefined);

      if (!result.success || !result.session) {
        throw new Error(result.error || 'Wrong email or password.');
      }

      // Signed in: go straight to the console (the button keeps its spinner until the page changes)
      setOpening(true);
      navigate('/internal', { replace: true });
    } catch (err: unknown) {
      console.error('Internal auth error:', err);
      setErrorMessage(
        err instanceof Error ? err.message : 'Wrong email or password.'
      );
      setLoading(false);
      // The token was used up: get a fresh check for the next try
      captchaRef.current?.reset();
    }
  };

  return (
    <div className="theme-page min-h-screen bg-page text-slate-900 flex items-center justify-center p-4 sm:p-6 selection:bg-orange-500 selection:text-white">
      <div className="max-w-md w-full bg-white border border-slate-200/70 rounded-[1.75rem] p-6 sm:p-8 card-elevated">
        
        {/* Brand Logo */}
        <div className="flex justify-center mb-6">
          <Link to="/" className="group" aria-label="MotoCare home">
            <MotoCareLogo className="h-16 sm:h-20 w-auto text-slate-900 transition-transform group-hover:scale-[1.03]" />
          </Link>
        </div>

        {/* Header Titles */}
        <div className="text-center mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Staff sign in
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            For MotoCare owner and staff only
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="flex-1 leading-relaxed" role="alert">{errorMessage}</span>
          </div>
        )}

        {/* Form with Native Keyboard Enter Submission */}
        <form onSubmit={handleSignIn} className="space-y-4 text-xs" noValidate>
          {/* Work Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Work Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                autoFocus
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrorMessage(null);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-3 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMessage(null);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-11 py-3 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember Workstation Checkbox */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 h-3.5 w-3.5 cursor-pointer"
              />
              <span>Remember this workstation</span>
            </label>
          </div>

          {/* Cloudflare security check (shows only when a site key is set) */}
          <TurnstileWidget ref={captchaRef} action="staff_login" onToken={setCaptchaToken} theme={isDarkTheme ? 'dark' : 'light'} />

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || (CAPTCHA_ENABLED && !captchaToken)}
            className="w-full bg-orange-500 hover:bg-orange-600 active:scale-[0.99] text-white font-semibold py-3 rounded-full text-sm transition cursor-pointer shadow-md shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{opening ? 'Opening console…' : 'Signing in…'}</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        {/* Footer Note */}
        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500 font-medium">
            MotoCare · Santa Maria, Bulacan
          </p>
        </div>

      </div>
    </div>
  );
}
