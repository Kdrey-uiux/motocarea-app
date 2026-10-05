import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  LogIn,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Mail,
  Wrench,
  Eye,
  EyeOff,
  ArrowLeft,
  KeyRound
} from 'lucide-react';

type AuthMode = 'signin' | 'register' | 'forgot_password';

export default function Login() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [mode, setMode] = useState<AuthMode>('signin');
  
  // Form States
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Visibility States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & Feedback States
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    const authChannel = new BroadcastChannel('motocare_auth_sync');

    // 1. Email Verification Sync
    if (
      searchParams.get('verified') === 'true' ||
      hash.includes('type=signup') ||
      hash.includes('type=email_verification')
    ) {
      supabase.auth.signOut().then(() => {
        setSuccessMessage('Email confirmed successfully! You may now sign in.');
        setMode('signin');
        authChannel.postMessage({ action: 'EMAIL_VERIFIED_SUCCESS' });
        window.history.replaceState(null, '', '/login');
      });
    }

    // 2. Makinig sa tapos na Reset Password mula sa kabilang tab
    authChannel.onmessage = (event) => {
      if (event.data?.action === 'EMAIL_VERIFIED_SUCCESS') {
        setVerificationSent(false);
        setMode('signin');
        setSuccessMessage('Email confirmed successfully! You may now sign in.');
      } else if (event.data?.action === 'PASSWORD_RESET_SUCCESS') {
        setMode('signin');
        setErrorMessage(null);
        setSuccessMessage('Password successfully updated from your email! You may now sign in.');
      }
    };

    return () => {
      authChannel.close();
    };
  }, [searchParams]);

  const checkUserRoleAndRedirect = async (userId: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    const role = profile?.role?.toLowerCase();
    if (['admin', 'staff'].includes(role || '')) {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (mode === 'register') {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match. Please verify and try again.');
        }

        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters long.');
        }

        const fullName = `${firstName.trim()} ${lastName.trim()}`;

        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              full_name: fullName,
              phone_number: phone.trim(),
            },
            emailRedirectTo: `${window.location.origin}/login?verified=true`,
          },
        });

        if (error) throw error;
        setVerificationSent(true);

      } else if (mode === 'signin') {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (authError) throw authError;

        if (authData.user) {
          await checkUserRoleAndRedirect(authData.user.id);
        }

      } else if (mode === 'forgot_password') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) throw error;
        setSuccessMessage('Password recovery link sent! Please check your email inbox.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/60 text-slate-900 flex items-center justify-center p-4 sm:p-6 selection:bg-orange-500 selection:text-white">
      <div className="max-w-md w-full bg-white border border-slate-200/80 rounded-2xl sm:rounded-[2rem] p-6 sm:p-8 shadow-xs">
        
        {/* Brand Logo */}
        <div className="flex justify-center mb-6">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center shadow-sm shadow-orange-500/20 text-white group-hover:scale-105 transition-transform">
              <Wrench className="w-5 h-5" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              Moto<span className="text-orange-500">Care</span>
            </span>
          </Link>
        </div>

        {/* Verification Sent Screen */}
        {verificationSent ? (
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 bg-orange-50 text-orange-600 border border-orange-200/80 rounded-full flex items-center justify-center mx-auto shadow-2xs animate-pulse">
              <Mail className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Check Your Email</h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              We sent a verification link to <br />
              <span className="text-orange-600 font-semibold">{email}</span>
            </p>
            <p className="text-slate-500 text-xs">
              Click the link in your email. This page will automatically update once verified.
            </p>
            <button
              onClick={() => {
                setVerificationSent(false);
                setMode('signin');
              }}
              className="mt-4 w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-full text-xs sm:text-sm transition cursor-pointer"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <>
            {/* Titles */}
            <div className="text-center mb-6">
              {mode === 'forgot_password' ? (
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-1 mx-auto mb-2 font-semibold cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                  </button>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Reset Password</h2>
                  <p className="text-slate-500 text-xs mt-1">
                    Enter your email to receive recovery instructions
                  </p>
                </div>
              ) : (
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                    {mode === 'register' ? 'Create an Account' : 'Welcome Back'}
                  </h2>
                  <p className="text-slate-500 text-xs mt-1">
                    {mode === 'register'
                      ? 'Register your profile to access workshop services'
                      : 'Sign in to access your MotoCare portal'}
                  </p>
                </div>
              )}
            </div>

            {/* Success Alert */}
            {successMessage && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-700 text-xs font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Error Alert */}
            {errorMessage && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5 text-sm">
              
              {/* REGISTER ONLY */}
              {mode === 'register' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">First Name</label>
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Juan"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 focus:bg-white text-xs sm:text-sm transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name</label>
                      <input
                        type="text"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Dela Cruz"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 focus:bg-white text-xs sm:text-sm transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number</label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="09171234567"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 focus:bg-white text-xs sm:text-sm transition"
                    />
                  </div>
                </>
              )}

              {/* Email Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rider@example.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 focus:bg-white text-xs sm:text-sm transition"
                />
              </div>

              {/* Password Field (Sign In at Register lamang) */}
              {mode !== 'forgot_password' && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-slate-700">Password</label>
                    {mode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('forgot_password');
                          setErrorMessage(null);
                          setSuccessMessage(null);
                        }}
                        className="text-[11px] text-orange-600 hover:text-orange-700 font-semibold hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
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
              )}

              {/* Confirm Password (Register lamang) */}
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
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
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-3 rounded-full transition flex items-center justify-center gap-2 shadow-sm shadow-orange-500/20 active:scale-[0.98] cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : mode === 'register' ? (
                  <>
                    <UserPlus className="w-4 h-4" /> Create Account
                  </>
                ) : mode === 'forgot_password' ? (
                  <>
                    <KeyRound className="w-4 h-4" /> Send Recovery Link
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" /> Sign In
                  </>
                )}
              </button>
            </form>

            {/* Bottom Switcher */}
            {mode !== 'forgot_password' && (
              <div className="mt-6 text-center text-xs text-slate-500 border-t border-slate-200/80 pt-4">
                {mode === 'register' ? (
                  <>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signin');
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className="text-orange-600 font-bold hover:underline ml-1 cursor-pointer"
                    >
                      Sign In
                    </button>
                  </>
                ) : (
                  <>
                    Don't have an account yet?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('register');
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className="text-orange-600 font-bold hover:underline ml-1 cursor-pointer"
                    >
                      Create Account
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}