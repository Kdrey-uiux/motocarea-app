import { useState, useEffect, useMemo } from 'react';
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
  KeyRound,
  Check,
  X,
  Phone,
  RefreshCw
} from 'lucide-react';
import {
  registerPhoneMapping,
  resolveEmailFromPhone,
  isPhoneFormat,
  extract10DigitPhone
} from '../utils/authPhoneRegistry';
import LegalTermsModal from '../components/legal/LegalTermsModal';

type AuthMode = 'signin' | 'register' | 'forgot_password';

// Whitelist of valid 2-letter surnames in the Philippines (mostly Chinese-Filipino roots)
const VALID_2_LETTER_SURNAMES = new Set([
  'sy', 'uy', 'po', 'yu', 'co', 'go', 'ng', 'ho', 'lo', 'do', 'wu', 'li', 'lu', 'su', 'ku'
]);

// Whitelist of valid 2-letter first names
const VALID_2_LETTER_FIRST_NAMES = new Set([
  'jo', 'al', 'ed', 'ty', 'bo', 'cy', 'vy', 'lu', 'li', 'an', 'aj', 'cj', 'dj', 'rj', 'pj', 'tj', 'mj', 'bj', 'jj', 'kc'
]);

// Common keyboard mashing / spam patterns
const KEYBOARD_MASH_REGEX = /(?:asdf|wasd|qwer|zxcv|hjkl|dfgh|jkl;|poiu|poa|qwe|zxc|asd|fgh|jkl|lkj|mnb|poi)/i;

const getAuthRedirectUrl = (path: string = '/login?verified=true') => {
  const base = (import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

export default function Login() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [mode, setMode] = useState<AuthMode>('signin');

  // Form States
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState(''); // 10 digits starting with 9 (following +63)
  const [email, setEmail] = useState('');
  const [loginIdentifier, setLoginIdentifier] = useState(''); // Email OR 10-digit Phone for Sign In & Forgot Password
  const [signInPassword, setSignInPassword] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [hasReviewedTerms, setHasReviewedTerms] = useState(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<'terms' | 'privacy'>('terms');

  const switchMode = (targetMode: AuthMode) => {
    setMode(targetMode);
    setSignInPassword('');
    setRegisterPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setErrorMessage(null);
    setSuccessMessage(null);
    setTouched((prev) => ({
      ...prev,
      password: false,
      confirmPassword: false,
    }));
  };

  // Field Touched / Dirty States
  const [touched, setTouched] = useState({
    firstName: false,
    lastName: false,
    phone: false,
    email: false,
    loginIdentifier: false,
    password: false,
    confirmPassword: false,
  });

  // Visibility States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & Feedback States
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  // Helper to mask email for privacy (e.g. r***r@gmail.com)
  const maskEmail = (rawEmail: string) => {
    const parts = rawEmail.split('@');
    if (parts.length !== 2) return rawEmail;
    const name = parts[0];
    const domain = parts[1];
    if (name.length <= 2) return `${name[0]}*@${domain}`;
    return `${name[0]}${'*'.repeat(name.length - 2)}${name[name.length - 1]}@${domain}`;
  };

  // --- Strict & Realistic Validation Functions ---

  // 1. Realistic First Name Validation
  const validateFirstName = (nameStr: string): { isValid: boolean; error: string | null } => {
    const trimmed = nameStr.trim();
    if (!trimmed) {
      return { isValid: false, error: 'First name is required.' };
    }
    if (trimmed.length < 2) {
      return { isValid: false, error: 'Must be at least 2 characters.' };
    }
    if (trimmed.length > 40) {
      return { isValid: false, error: 'Must be 40 characters or less.' };
    }
    // Only letters, spaces, hyphens, and apostrophes
    if (!/^[a-zA-ZñÑáéíóúÁÉÍÓÚ\s'-]+$/.test(trimmed)) {
      return { isValid: false, error: 'Letters and spaces only (no numbers or symbols).' };
    }
    // Check 2-letter first names
    if (trimmed.length === 2 && !VALID_2_LETTER_FIRST_NAMES.has(trimmed.toLowerCase())) {
      return { isValid: false, error: 'Please enter a valid first name (e.g. Juan, Maria, Mark).' };
    }
    // Block keyboard mashing patterns (like "poa", "asdf", "wasd")
    if (KEYBOARD_MASH_REGEX.test(trimmed)) {
      return { isValid: false, error: 'Please enter a realistic first name (no keyboard letters).' };
    }
    // Block repeating identical characters (e.g. "aaa", "xxx")
    if (/(.)\1{2,}/i.test(trimmed)) {
      return { isValid: false, error: 'Name cannot contain repeated identical letters.' };
    }
    // Must contain at least one vowel and one consonant
    if (!/[aeiouyAEIOUY]/.test(trimmed) || !/[bcdfghjklmnpqrstvwxzBCDFGHJKLMNPQRSTVWXZ]/i.test(trimmed)) {
      return { isValid: false, error: 'Please enter a realistic first name.' };
    }
    // Block 4+ consecutive consonants or 3+ consecutive vowels
    if (/[bcdfghjklmnpqrstvwxzBCDFGHJKLMNPQRSTVWXZ]{4,}/i.test(trimmed) || /[aeiouyAEIOUY]{3,}/i.test(trimmed)) {
      return { isValid: false, error: 'Invalid name pattern detected. Please enter a real name.' };
    }
    return { isValid: true, error: null };
  };

  // 2. Realistic Last Name Validation (rejection of "sa", "poa", etc.)
  const validateLastName = (nameStr: string): { isValid: boolean; error: string | null } => {
    const trimmed = nameStr.trim();
    if (!trimmed) {
      return { isValid: false, error: 'Last name is required.' };
    }
    if (trimmed.length < 2) {
      return { isValid: false, error: 'Must be at least 2 characters.' };
    }
    if (trimmed.length > 40) {
      return { isValid: false, error: 'Must be 40 characters or less.' };
    }
    // Only letters, spaces, hyphens, and apostrophes
    if (!/^[a-zA-ZñÑáéíóúÁÉÍÓÚ\s'-]+$/.test(trimmed)) {
      return { isValid: false, error: 'Letters and spaces only (no numbers or symbols).' };
    }
    // 2-letter surnames MUST be in the recognized Philippine list (Sy, Uy, Po, Yu, Co, etc.)
    if (trimmed.length === 2 && !VALID_2_LETTER_SURNAMES.has(trimmed.toLowerCase())) {
      return { isValid: false, error: 'Please enter a valid last name (e.g. Dela Cruz, Santos, Garcia, Sy).' };
    }
    // Block keyboard mashing patterns
    if (KEYBOARD_MASH_REGEX.test(trimmed)) {
      return { isValid: false, error: 'Please enter a realistic last name (no keyboard letters).' };
    }
    // Block repeating identical characters
    if (/(.)\1{2,}/i.test(trimmed)) {
      return { isValid: false, error: 'Last name cannot contain repeated identical letters.' };
    }
    // Must contain at least one vowel and one consonant (unless valid 2-letter like "Ng")
    if (trimmed.toLowerCase() !== 'ng') {
      if (!/[aeiouyAEIOUY]/.test(trimmed) || !/[bcdfghjklmnpqrstvwxzBCDFGHJKLMNPQRSTVWXZ]/i.test(trimmed)) {
        return { isValid: false, error: 'Please enter a realistic last name.' };
      }
    }
    // Block 4+ consecutive consonants or 3+ consecutive vowels
    if (/[bcdfghjklmnpqrstvwxzBCDFGHJKLMNPQRSTVWXZ]{4,}/i.test(trimmed) || /[aeiouyAEIOUY]{3,}/i.test(trimmed)) {
      return { isValid: false, error: 'Invalid name pattern detected. Please enter a real name.' };
    }
    return { isValid: true, error: null };
  };

  // 3. Philippine Mobile Number Validation (Strict 10 digits following +63: 9XXXXXXXXX)
  const validatePhone = (phoneStr: string): { isValid: boolean; error: string | null } => {
    const cleaned = phoneStr.replace(/\D/g, '');
    if (!cleaned) {
      return { isValid: false, error: 'Mobile number is required.' };
    }
    if (!cleaned.startsWith('9')) {
      return { isValid: false, error: 'Must start with 9 (e.g. 917...).' };
    }
    if (cleaned.length < 10) {
      return { isValid: false, error: `Incomplete: ${cleaned.length}/10 digits.` };
    }
    if (cleaned.length > 10) {
      return { isValid: false, error: 'Must be exactly 10 digits.' };
    }
    return { isValid: true, error: null };
  };

  // 4. Universal Email Validation (Supports Gmail, Yahoo, Outlook, iCloud, PH domains, and custom business domains)
  const validateEmail = (emailStr: string): { isValid: boolean; error: string | null } => {
    const trimmed = emailStr.trim().toLowerCase();
    if (!trimmed) {
      return { isValid: false, error: 'Email address is required.' };
    }
    if (!trimmed.includes('@')) {
      return { isValid: false, error: 'Email must contain @.' };
    }
    const parts = trimmed.split('@');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      return { isValid: false, error: 'Please enter a complete email address.' };
    }

    const [username, domain] = parts;

    // Block keyboard mashing in email username (e.g. "dsdasdwasd")
    if (/(?:asdf|wasd|qwer|zxcv|hjkl|dfgh){2,}/i.test(username)) {
      return { isValid: false, error: 'Please enter your real active email address.' };
    }

    if (!domain.includes('.')) {
      return { isValid: false, error: 'Domain must contain an extension (e.g. .com, .ph).' };
    }

    // Accepts all valid global, Philippine, and custom business email domains
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    if (!emailRegex.test(trimmed)) {
      return { isValid: false, error: 'Please enter a valid email format.' };
    }

    // Validate TLD has at least 2 letters
    const domainParts = domain.split('.');
    const tld = domainParts[domainParts.length - 1];
    if (tld.length < 2) {
      return { isValid: false, error: 'Invalid domain extension.' };
    }

    return { isValid: true, error: null };
  };

  // 5. Strict Password Criteria (Register Only)
  const passwordCriteria = useMemo(() => [
    { id: 'length', label: 'At least 8 characters', valid: registerPassword.length >= 8 },
    { id: 'uppercase', label: '1 uppercase letter (A-Z)', valid: /[A-Z]/.test(registerPassword) },
    { id: 'lowercase', label: '1 lowercase letter (a-z)', valid: /[a-z]/.test(registerPassword) },
    { id: 'number', label: '1 number (0-9)', valid: /[0-9]/.test(registerPassword) },
    { id: 'special', label: '1 special character (@$!%*?&#)', valid: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~]/.test(registerPassword) },
    { id: 'nospace', label: 'No spaces allowed', valid: !/\s/.test(registerPassword) && registerPassword.length > 0 },
  ], [registerPassword]);

  const passwordScore = useMemo(() => {
    return passwordCriteria.filter((c) => c.valid).length;
  }, [passwordCriteria]);

  const isPasswordValid = passwordScore === passwordCriteria.length;
  const isPasswordsMatch = confirmPassword.length > 0 && registerPassword === confirmPassword;

  // Real-time Errors for UI Display
  const firstNameValidation = useMemo(() => validateFirstName(firstName), [firstName]);
  const lastNameValidation = useMemo(() => validateLastName(lastName), [lastName]);
  const phoneValidation = useMemo(() => validatePhone(phone), [phone]);
  const emailValidation = useMemo(() => validateEmail(email), [email]);

  // Overall Form Validation for Register
  const isFormValid = useMemo(() => {
    if (mode !== 'register') return true;
    return (
      firstNameValidation.isValid &&
      lastNameValidation.isValid &&
      phoneValidation.isValid &&
      emailValidation.isValid &&
      isPasswordValid &&
      isPasswordsMatch &&
      agreedToTerms
    );
  }, [
    mode,
    firstNameValidation.isValid,
    lastNameValidation.isValid,
    phoneValidation.isValid,
    emailValidation.isValid,
    isPasswordValid,
    isPasswordsMatch,
    agreedToTerms
  ]);

  // Auth Sync Broadcast Channel
  useEffect(() => {
    const hash = window.location.hash;
    const authChannel = new BroadcastChannel('motocare_auth_sync');

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

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const checkUserRoleAndRedirect = async (userId: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, phone_number')
      .eq('id', userId)
      .maybeSingle();

    // Auto-link phone number into local directory if found
    if (profile?.phone_number && email) {
      registerPhoneMapping(profile.phone_number, email);
    }

    const role = profile?.role?.toLowerCase();
    if (['admin', 'staff'].includes(role || '')) {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
  };

  const handleResendVerification = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setErrorMessage(null);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: getAuthRedirectUrl('/login?verified=true'),
        },
      });

      if (error) throw error;
      setResendCooldown(60);
      setSuccessMessage('Verification link resent! Please check your email.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend verification link. Please wait a moment.');
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    // Mark fields touched
    setTouched({
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      loginIdentifier: true,
      password: true,
      confirmPassword: true,
    });

    try {
      if (mode === 'register') {
        if (!firstNameValidation.isValid) {
          throw new Error(firstNameValidation.error || 'Please enter a valid first name.');
        }

        if (!lastNameValidation.isValid) {
          throw new Error(lastNameValidation.error || 'Please enter a valid last name.');
        }

        if (!phoneValidation.isValid) {
          throw new Error(phoneValidation.error || 'Please enter a valid 10-digit mobile number.');
        }

        if (!emailValidation.isValid) {
          throw new Error(emailValidation.error || 'Please enter a valid email address.');
        }

        if (!isPasswordValid) {
          throw new Error('Password does not meet all security requirements.');
        }

        if (registerPassword !== confirmPassword) {
          throw new Error('Passwords do not match. Please verify your password confirmation.');
        }

        if (!agreedToTerms) {
          setIsLegalModalOpen(true);
          throw new Error('Please review and agree to the Terms of Service and Privacy Policy before creating an account.');
        }

        const clean10Phone = phone.replace(/\D/g, '').slice(0, 10);
        const canonicalPhone = `+63${clean10Phone}`;
        const cleanEmail = email.trim().toLowerCase();
        const fullName = `${firstName.trim()} ${lastName.trim()}`;

        // Create Account via Supabase
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail,
          password: registerPassword,
          options: {
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              full_name: fullName,
              phone_number: canonicalPhone,
            },
            emailRedirectTo: getAuthRedirectUrl('/login?verified=true'),
          },
        });

        if (signUpError) {
          const msg = signUpError.message.toLowerCase();
          if (msg.includes('already registered') || msg.includes('already in use')) {
            throw new Error('An account with this email already exists. Please sign in instead.');
          }
          if (msg.includes('rate limit')) {
            throw new Error('Too many registration attempts. Please wait a few moments before trying again.');
          }
          throw signUpError;
        }

        // Register and link 10-digit phone number to email for dual login (Facebook-style)
        registerPhoneMapping(clean10Phone, cleanEmail);

        // Direct session handling (if email confirmation is turned off in Supabase)
        if (signUpData.session && signUpData.user) {
          try {
            await supabase.from('profiles').upsert(
              {
                id: signUpData.user.id,
                full_name: fullName,
                phone_number: canonicalPhone,
                role: 'customer',
              },
              { onConflict: 'id' }
            );
          } catch (profileErr) {
            console.warn('Profile sync fallback:', profileErr);
          }

          setSuccessMessage('Account created successfully! Redirecting to your dashboard...');
          setTimeout(() => {
            navigate('/dashboard');
          }, 800);
          return;
        }

        // Email confirmation screen
        setVerificationSent(true);
        setResendCooldown(60);

      } else if (mode === 'signin') {
        const rawInput = loginIdentifier.trim();
        if (!rawInput) {
          throw new Error('Please enter your email address or mobile number.');
        }

        let targetEmail = '';

        // Check if user entered a phone number (e.g. 9171234567, 09171234567, or +639171234567)
        if (isPhoneFormat(rawInput)) {
          const base10 = extract10DigitPhone(rawInput);
          if (base10.length !== 10 || !base10.startsWith('9')) {
            throw new Error('Please enter a valid 10-digit mobile number (e.g. 9171234567).');
          }

          const resolved = resolveEmailFromPhone(base10);
          if (!resolved) {
            throw new Error(
              `No account found linked to mobile number ${base10}. Please check the number or sign in using your registered email address.`
            );
          }
          targetEmail = resolved;
        } else {
          // Standard email login
          targetEmail = rawInput.toLowerCase();
        }

        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: targetEmail,
          password: signInPassword,
        });

        if (authError) {
          const msg = authError.message.toLowerCase();
          if (msg.includes('invalid login credentials')) {
            throw new Error('Invalid credentials or password. Please verify your details.');
          }
          if (msg.includes('email not confirmed')) {
            throw new Error('Please confirm your email address first before signing in.');
          }
          throw authError;
        }

        if (authData.user) {
          // Auto-link phone number into registry if user metadata has phone_number
          const userPhone = authData.user.user_metadata?.phone_number;
          if (userPhone && authData.user.email) {
            registerPhoneMapping(userPhone, authData.user.email);
          }

          await checkUserRoleAndRedirect(authData.user.id);
        }

      } else if (mode === 'forgot_password') {
        const rawInput = loginIdentifier.trim();
        if (!rawInput) {
          throw new Error('Please enter your email address or registered mobile number.');
        }

        let recoveryEmail = '';

        if (isPhoneFormat(rawInput)) {
          const base10 = extract10DigitPhone(rawInput);
          const resolved = resolveEmailFromPhone(base10);
          if (!resolved) {
            throw new Error(
              `No account found for mobile number ${base10}. Please check your number or enter your registered email.`
            );
          }
          recoveryEmail = resolved;
        } else {
          if (!validateEmail(rawInput).isValid) {
            throw new Error('Please enter a valid email address.');
          }
          recoveryEmail = rawInput.toLowerCase();
        }

        const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail, {
          redirectTo: getAuthRedirectUrl('/reset-password'),
        });

        if (error) throw error;
        setSuccessMessage(
          `Password recovery link sent to your registered email (${maskEmail(recoveryEmail)})! Please check your inbox.`
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // Determine icon for Sign In / Forgot Password input
  const isInputPhone = isPhoneFormat(loginIdentifier);

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
            <h2 className="text-xl font-bold text-slate-900">Verify Your Email</h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              We sent an account confirmation link to: <br />
              <span className="text-orange-600 font-semibold break-all">{email}</span>
            </p>
            <p className="text-slate-500 text-xs">
              Click the link in your email to activate your rider account. Once verified, you can sign in with your email or mobile number immediately.
            </p>

            {/* Resend Action */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resendCooldown > 0 || isResending}
                className="text-xs font-semibold text-orange-600 hover:text-orange-700 disabled:text-slate-400 flex items-center justify-center gap-1.5 mx-auto transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                {resendCooldown > 0 ? `Resend email in ${resendCooldown}s` : 'Resend verification email'}
              </button>
            </div>

            <button
              onClick={() => {
                setVerificationSent(false);
                switchMode('signin');
              }}
              className="mt-4 w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-full text-xs sm:text-sm transition cursor-pointer"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <>
            {/* Header Titles */}
            <div className="text-center mb-6">
              {mode === 'forgot_password' ? (
                <div>
                  <button
                    type="button"
                    onClick={() => switchMode('signin')}
                    className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-1 mx-auto mb-2 font-semibold cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                  </button>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Reset Password</h2>
                  <p className="text-slate-500 text-xs mt-1">
                    Enter your email or registered mobile number to receive recovery instructions
                  </p>
                </div>
              ) : (
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                    {mode === 'register' ? 'Create Rider Account' : 'Welcome Back'}
                  </h2>
                  <p className="text-slate-500 text-xs mt-1">
                    {mode === 'register'
                      ? 'Register your profile to book motorcycle services & track repairs'
                      : 'Sign in to access your MotoCare portal'}
                  </p>
                </div>
              )}
            </div>

            {/* Success Alert */}
            {successMessage && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-700 text-xs font-medium animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Error Alert */}
            {errorMessage && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700 text-xs font-medium animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span>{errorMessage}</span>
                  {errorMessage.includes('already exists') && (
                    <button
                      type="button"
                      onClick={() => switchMode('signin')}
                      className="block mt-1 font-bold underline hover:text-rose-800 cursor-pointer"
                    >
                      Click here to Sign In with this email →
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5 text-sm" noValidate>
              
              {/* REGISTER ONLY: Name Fields */}
              {mode === 'register' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* First Name */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        First Name <span className="text-orange-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={firstName}
                        onBlur={() => setTouched((p) => ({ ...p, firstName: true }))}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder=""
                        className={`w-full bg-slate-50 border rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:bg-white text-xs sm:text-sm transition ${
                          touched.firstName && !firstNameValidation.isValid
                            ? 'border-rose-300 bg-rose-50/20 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10'
                            : 'border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10'
                        }`}
                      />
                      {touched.firstName && !firstNameValidation.isValid && (
                        <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1 font-medium leading-tight">
                          <AlertCircle className="w-3 h-3 shrink-0" /> {firstNameValidation.error}
                        </p>
                      )}
                    </div>

                    {/* Last Name */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Last Name <span className="text-orange-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={lastName}
                        onBlur={() => setTouched((p) => ({ ...p, lastName: true }))}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder=""
                        className={`w-full bg-slate-50 border rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:bg-white text-xs sm:text-sm transition ${
                          touched.lastName && !lastNameValidation.isValid
                            ? 'border-rose-300 bg-rose-50/20 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10'
                            : 'border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10'
                        }`}
                      />
                      {touched.lastName && !lastNameValidation.isValid && (
                        <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1 font-medium leading-tight">
                          <AlertCircle className="w-3 h-3 shrink-0" /> {lastNameValidation.error}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Philippine Mobile Number (Register: Integrated +63 Badge, 10 Digits) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mobile Number <span className="text-orange-500">*</span>
                    </label>
                    <div
                      className={`flex items-center bg-slate-50 border rounded-xl overflow-hidden focus-within:bg-white transition ${
                        touched.phone && !phoneValidation.isValid
                          ? 'border-rose-300 bg-rose-50/20 focus-within:border-rose-500 focus-within:ring-4 focus-within:ring-rose-500/10'
                          : 'border-slate-200 focus-within:border-orange-500 focus-within:ring-4 focus-within:ring-orange-500/10'
                      }`}
                    >
                      {/* Integrated +63 Badge */}
                      <div className="flex items-center gap-1 px-3 py-2.5 bg-slate-100/90 border-r border-slate-200 text-slate-700 font-semibold text-xs sm:text-sm select-none shrink-0">
                        <span className="text-xs">🇵🇭</span>
                        <span>+63</span>
                      </div>
                      <input
                        type="tel"
                        value={phone}
                        onBlur={() => setTouched((p) => ({ ...p, phone: true }))}
                        onChange={(e) => {
                          let val = e.target.value.replace(/\D/g, '');
                          // If user types leading 0, automatically strip it so it starts with 9
                          if (val.startsWith('0')) {
                            val = val.slice(1);
                          }
                          setPhone(val.slice(0, 10));
                        }}
                        placeholder=""
                        maxLength={10}
                        className="w-full bg-transparent px-3 py-2.5 text-slate-900 focus:outline-none text-xs sm:text-sm font-mono tracking-wider"
                      />
                    </div>
                    {touched.phone && !phoneValidation.isValid ? (
                      <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1 font-medium leading-tight">
                        <AlertCircle className="w-3 h-3 shrink-0" /> {phoneValidation.error}
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        10 digits starting with 9 (e.g. 9171234567)
                      </p>
                    )}
                  </div>

                  {/* Email Address (Register: Supports Gmail, Yahoo, Outlook, iCloud, PH domains, etc.) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email Address <span className="text-orange-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onBlur={() => setTouched((p) => ({ ...p, email: true }))}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder=""
                        className={`w-full bg-slate-50 border rounded-xl pl-9 pr-3.5 py-2.5 text-slate-900 focus:outline-none focus:bg-white text-xs sm:text-sm transition ${
                          touched.email && !emailValidation.isValid
                            ? 'border-rose-300 bg-rose-50/20 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10'
                            : 'border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10'
                        }`}
                      />
                    </div>
                    {touched.email && !emailValidation.isValid && (
                      <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1 font-medium leading-tight">
                        <AlertCircle className="w-3 h-3 shrink-0" /> {emailValidation.error}
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* SIGN IN & FORGOT PASSWORD: Email OR 10-Digit Mobile Number (Neutral Slate Styling) */}
              {mode !== 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email or Mobile Number <span className="text-orange-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      {isInputPhone ? (
                        <Phone className="w-3.5 h-3.5 text-orange-500" />
                      ) : (
                        <Mail className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <input
                      type="text"
                      value={loginIdentifier}
                      onBlur={() => setTouched((p) => ({ ...p, loginIdentifier: true }))}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder=""
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-slate-900 focus:outline-none focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 text-xs sm:text-sm transition"
                    />
                  </div>
                </div>
              )}

              {/* Password Field (Sign In & Register) */}
              {mode !== 'forgot_password' && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Password <span className="text-orange-500">*</span>
                    </label>
                    {mode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => switchMode('forgot_password')}
                        className="text-[11px] text-orange-600 hover:text-orange-700 font-semibold hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={mode === 'register' ? registerPassword : signInPassword}
                      onBlur={() => setTouched((p) => ({ ...p, password: true }))}
                      onChange={(e) => {
                        if (mode === 'register') {
                          setRegisterPassword(e.target.value);
                        } else {
                          setSignInPassword(e.target.value);
                        }
                      }}
                      placeholder=""
                      className={`w-full bg-slate-50 border rounded-xl pl-3.5 pr-10 py-2.5 text-slate-900 focus:outline-none focus:bg-white text-xs sm:text-sm transition ${
                        mode === 'register' && touched.password && !isPasswordValid
                          ? 'border-rose-300 bg-rose-50/20 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10'
                          : 'border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10'
                      }`}
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

                  {/* Password Strength Meter & Interactive Checklist (Register Only) */}
                  {mode === 'register' && registerPassword.length > 0 && (
                    <div className="mt-2.5 p-3 bg-slate-50/90 border border-slate-200/80 rounded-xl space-y-2 text-xs">
                      {/* Strength Bar */}
                      <div>
                        <div className="flex justify-between items-center text-[11px] mb-1">
                          <span className="text-slate-500">Password Strength:</span>
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

                      {/* Criteria Checklist */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[11px]">
                        {passwordCriteria.map((criterion) => (
                          <div
                            key={criterion.id}
                            className={`flex items-center gap-1.5 transition-colors ${
                              criterion.valid ? 'text-emerald-700 font-medium' : 'text-slate-400'
                            }`}
                          >
                            {criterion.valid ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <div className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0" />
                            )}
                            <span className="leading-tight">{criterion.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Confirm Password (Register Only) */}
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirm Password <span className="text-orange-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onBlur={() => setTouched((p) => ({ ...p, confirmPassword: true }))}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder=""
                      className={`w-full bg-slate-50 border rounded-xl pl-3.5 pr-10 py-2.5 text-slate-900 focus:outline-none focus:bg-white text-xs sm:text-sm transition ${
                        touched.confirmPassword && confirmPassword.length > 0 && !isPasswordsMatch
                          ? 'border-rose-300 bg-rose-50/20 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10'
                          : 'border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10'
                      }`}
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
                  {confirmPassword.length > 0 && !isPasswordsMatch && (
                    <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1 font-medium leading-tight">
                      <X className="w-3 h-3 shrink-0" /> Passwords do not match.
                    </p>
                  )}
                  {confirmPassword.length > 0 && isPasswordsMatch && (
                    <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-medium leading-tight">
                      <Check className="w-3 h-3 shrink-0" /> Passwords match.
                    </p>
                  )}
                </div>
              )}

              {/* Terms of Service & Privacy Policy Agreement (Register Only) */}
              {mode === 'register' && (
                <div className="pt-1">
                  <label 
                    className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer select-none"
                    onClick={(e) => {
                      if (!hasReviewedTerms) {
                        e.preventDefault();
                        setLegalModalTab('terms');
                        setIsLegalModalOpen(true);
                      }
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => {
                        if (!hasReviewedTerms) {
                          e.preventDefault();
                          setLegalModalTab('terms');
                          setIsLegalModalOpen(true);
                          return;
                        }
                        setAgreedToTerms(e.target.checked);
                      }}
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                    />
                    <span className="leading-relaxed">
                      I agree to the{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setLegalModalTab('terms');
                          setIsLegalModalOpen(true);
                        }}
                        className="font-semibold text-slate-900 hover:text-orange-600 hover:underline cursor-pointer"
                      >
                        MotoCare Terms of Service
                      </button>{' '}
                      and{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setLegalModalTab('privacy');
                          setIsLegalModalOpen(true);
                        }}
                        className="font-semibold text-slate-900 hover:text-orange-600 hover:underline cursor-pointer"
                      >
                        Privacy Policy
                      </button>
                      .
                    </span>
                  </label>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || (mode === 'register' && !isFormValid)}
                className="w-full mt-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-full transition flex items-center justify-center gap-2 shadow-sm shadow-orange-500/20 active:scale-[0.98] cursor-pointer"
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
                      onClick={() => switchMode('signin')}
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
                      onClick={() => switchMode('register')}
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

      {/* Philippine Law Compliant Terms of Service & Privacy Policy Modal */}
      <LegalTermsModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
        initialTab={legalModalTab}
        hasAgreed={agreedToTerms}
        onAccept={() => {
          setHasReviewedTerms(true);
          setAgreedToTerms(true);
        }}
      />
    </div>
  );
}