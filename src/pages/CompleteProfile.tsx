import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  AlertCircle,
  ArrowRight,
  Bell,
  Check,
  Loader2,
  Lock,
  Phone,
  ShieldCheck,
  ArrowLeft,
} from '../components/icons';
import MotoCareLogo from '../components/brand/MotoCareLogo';
import LoadingScreen from '../components/brand/LoadingScreen';
import LegalTermsModal from '../components/legal/LegalTermsModal';
import {
  validateFirstName,
  validateLastName,
  validatePHMobile,
  phMobileDigits,
  toPHMobileInput,
} from '../utils/validators';
import { isRiderProfileComplete, TERMS_VERSION } from '../utils/riderProfile';

/** "Juan Dela Cruz" -> first "Juan Dela", last "Cruz" (riders can fix it on the form) */
function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return { first: parts[0] || '', last: '' };
  return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] };
}

const inputBase =
  'w-full bg-slate-50 border rounded-2xl px-4 py-3 text-base sm:text-[15px] text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 transition';
const inputOk = `${inputBase} border-slate-200 hover:border-slate-300 focus:border-orange-500 focus:ring-orange-500/10`;
const inputBad = `${inputBase} border-rose-300 focus:border-rose-500 focus:ring-rose-500/10`;
const labelClass = 'block text-sm font-semibold text-slate-700 mb-1.5';

function FieldError({ id, message }: { id: string; message: string | null }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 flex items-start gap-1 text-xs text-rose-600">
      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
      {message}
    </p>
  );
}

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

// Why the shop asks (shown beside the form on big screens)
const REASONS = [
  { icon: Bell, title: 'Booking updates', text: 'We confirm your booking and remind you the day before drop-off.' },
  { icon: Phone, title: 'Calls or texts from the shop', text: 'The shop can call or text you if your motorcycle is ready or needs a part.' },
  { icon: ShieldCheck, title: 'Kept private', text: 'Only MotoCare sees your number. We never sell or share it.' },
];

/**
 * One last step for riders whose account is missing details the shop needs, mostly
 * "Continue with Google" sign-ups (no mobile number, no Terms consent yet). The dashboard
 * sends incomplete profiles here, and this page sends complete ones on to the dashboard.
 */
export default function CompleteProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [isGoogle, setIsGoogle] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState(''); // the 10 digits after +63
  const [agreed, setAgreed] = useState(false);
  // Read both Terms and Privacy to the end in the modal (needed before the box can be ticked)
  const [hasRead, setHasRead] = useState(false);
  const [legalTab, setLegalTab] = useState<'terms' | 'privacy' | null>(null);

  const [touched, setTouched] = useState({ first: false, last: false, phone: false });
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load what we already know (Google name, any saved number) and skip the page if nothing is missing
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login', { replace: true });
        return;
      }
      const user = session.user;
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone_number, terms_accepted_at')
        .eq('id', user.id)
        .maybeSingle();
      if (!isMounted) return;

      if (isRiderProfileComplete(profile)) {
        navigate('/dashboard', { replace: true });
        return;
      }

      const meta = user.user_metadata || {};
      const savedName = profile?.full_name && profile.full_name !== 'Rider Customer' ? profile.full_name : '';
      const fromName = splitName(savedName || meta.full_name || meta.name || '');
      setUserId(user.id);
      setEmail(user.email || '');
      setIsGoogle(user.app_metadata?.provider === 'google');
      setFirstName(meta.given_name || meta.first_name || fromName.first);
      setLastName(meta.family_name || meta.last_name || fromName.last);
      setPhone(phMobileDigits(profile?.phone_number || '') || '');
      setLoading(false);
    })().catch(() => navigate('/login', { replace: true }));
    return () => {
      isMounted = false;
    };
  }, [navigate]);

  if (loading) return <LoadingScreen />;

  const firstCheck = validateFirstName(firstName);
  const lastCheck = validateLastName(lastName);
  const phoneError = validatePHMobile(phone);
  const show = (field: keyof typeof touched) => touched[field] || triedSubmit;
  const firstError = show('first') ? firstCheck.error : null;
  const lastError = show('last') ? lastCheck.error : null;
  const phoneShown = show('phone') ? phoneError : null;
  const termsError =
    triedSubmit && !agreed ? 'Please read the Terms and Privacy Policy, then agree to continue.' : null;
  const greetingName = firstName.trim().split(/\s+/)[0] || 'rider';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!firstCheck.isValid || !lastCheck.isValid || phoneError || !agreed) {
      setTriedSubmit(true);
      const firstBad = !firstCheck.isValid
        ? 'cp-first'
        : !lastCheck.isValid
          ? 'cp-last'
          : phoneError
            ? 'cp-phone'
            : 'cp-terms';
      document.getElementById(firstBad)?.focus();
      return;
    }
    if (!userId) return;

    setSaving(true);
    const fullName = `${firstName.trim().replace(/\s+/g, ' ')} ${lastName.trim().replace(/\s+/g, ' ')}`;
    const canonicalPhone = `+63${phone}`; // same format as the normal sign-up
    try {
      const { error } = await supabase.from('profiles').upsert(
        {
          id: userId,
          full_name: fullName,
          phone_number: canonicalPhone,
          terms_accepted_at: new Date().toISOString(),
          terms_version: TERMS_VERSION,
        },
        { onConflict: 'id' }
      );
      if (error) throw error;
      // Keep the sign-in record in step (best effort; the profile is what the app reads)
      supabase.auth
        .updateUser({
          data: { first_name: firstName.trim(), last_name: lastName.trim(), full_name: fullName, phone_number: canonicalPhone },
        })
        .catch(() => {});
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Could not save the profile:', err);
      setErrorMessage('We couldn’t save your details. Check your internet and try again.');
      setSaving(false);
    }
  };

  // Back to the sign-in page. The half-made login is signed out, or the login page would send them back here.
  const handleBack = async () => {
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    navigate('/login', { replace: true });
  };

  return (
    <div className="relative min-h-[100dvh] bg-white text-slate-900 flex flex-col overflow-hidden selection:bg-orange-500 selection:text-white">
      {/* Soft shapes, same family as the sign-in page (bigger screens only) */}
      <div aria-hidden="true" className="hidden md:block pointer-events-none absolute -top-40 -right-40 w-[34rem] h-[34rem] rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.10)_0%,rgba(249,115,22,0)_65%)]" />
      <div aria-hidden="true" className="hidden lg:block pointer-events-none absolute left-[5%] bottom-10 w-32 h-16 rounded-t-full border-[22px] border-b-0 border-orange-500/90" />
      <div aria-hidden="true" className="hidden lg:flex pointer-events-none absolute right-[6%] bottom-24 flex-col gap-2">
        <div className="w-12 h-12 rounded-tl-full bg-orange-200" />
        <div className="w-12 h-12 rounded-bl-full bg-amber-200" />
      </div>

      {/* Top bar */}
      <header className="relative z-10 max-w-6xl w-full mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
        <Link to="/" className="group" aria-label="MotoCare home">
          <MotoCareLogo className="h-10 sm:h-14 w-auto text-slate-900 transition-transform group-hover:scale-[1.03]" />
        </Link>
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 h-9 sm:h-10 px-3.5 sm:px-4 rounded-full border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      </header>

      <main className="relative z-10 flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-2 pb-10 sm:pb-14 grid lg:grid-cols-[1fr_minmax(0,30rem)] gap-8 lg:gap-16 items-center">
        {/* Intro: centered above the form on phones, beside it on desktop */}
        <section className="text-center lg:text-left max-w-xl mx-auto lg:mx-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold bg-orange-100/70 text-orange-700">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            One last step
          </span>
          <h1 className="mt-3 text-[2rem] leading-[1.05] sm:text-5xl lg:text-6xl font-extrabold tracking-[-0.035em] text-slate-900">
            Almost there, <span className="text-orange-500 break-words">{greetingName}</span>
          </h1>
          <p className="mt-3 text-slate-500 text-[15px] sm:text-base leading-relaxed">
            Add your mobile number so the shop can reach you about your bookings and your motorcycle.
          </p>

          <ul className="hidden lg:block mt-8 space-y-4">
            {REASONS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-start gap-3.5">
                <span className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-slate-900">{title}</span>
                  <span className="block text-sm text-slate-500 leading-relaxed">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="w-full max-w-md lg:max-w-none mx-auto bg-white border border-slate-200/80 rounded-[1.75rem] sm:rounded-[2rem] p-5 sm:p-7 shadow-xl shadow-slate-900/[0.05] animate-in fade-in slide-in-from-bottom-3 duration-500"
        >
          {/* Progress: account made, profile left */}
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="inline-flex items-center gap-1.5 text-emerald-600">
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                <Check className="w-3 h-3" />
              </span>
              Account
            </span>
            <span className="flex-1 h-px bg-gradient-to-r from-emerald-300 to-orange-300" />
            <span className="inline-flex items-center gap-1.5 text-orange-600">
              <span className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[11px]">2</span>
              Your details
            </span>
          </div>

          {/* Who is signed in */}
          {email && (
            <div className="mt-5 flex items-center gap-2.5 rounded-2xl bg-slate-50 border border-slate-200/70 px-3.5 py-2.5 min-w-0">
              {isGoogle ? (
                <span className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0">
                  <GoogleMark className="w-4 h-4" />
                </span>
              ) : (
                <span className="w-7 h-7 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {email.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block text-[11px] text-slate-400">Signed in{isGoogle ? ' with Google' : ''}</span>
                <span className="block text-sm font-medium text-slate-700 truncate">{email}</span>
              </span>
            </div>
          )}

          {errorMessage && (
            <div role="alert" className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2 text-rose-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="mt-5 space-y-4">
            {/* Name: side by side from small tablets up, stacked on phones */}
            <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-4 min-[420px]:gap-3">
              <div className="min-w-0">
                <label htmlFor="cp-first" className={labelClass}>
                  First name <span className="text-orange-500">*</span>
                </label>
                <input
                  id="cp-first"
                  type="text"
                  autoComplete="given-name"
                  maxLength={40}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, first: true }))}
                  aria-invalid={Boolean(firstError)}
                  aria-describedby={firstError ? 'cp-first-error' : undefined}
                  placeholder="Juan"
                  className={firstError ? inputBad : inputOk}
                />
                <FieldError id="cp-first-error" message={firstError} />
              </div>
              <div className="min-w-0">
                <label htmlFor="cp-last" className={labelClass}>
                  Last name <span className="text-orange-500">*</span>
                </label>
                <input
                  id="cp-last"
                  type="text"
                  autoComplete="family-name"
                  maxLength={40}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, last: true }))}
                  aria-invalid={Boolean(lastError)}
                  aria-describedby={lastError ? 'cp-last-error' : undefined}
                  placeholder="Dela Cruz"
                  className={lastError ? inputBad : inputOk}
                />
                <FieldError id="cp-last-error" message={lastError} />
              </div>
            </div>

            {/* Mobile: fixed +63, 10 digits after it (same as the normal sign-up) */}
            <div>
              <label htmlFor="cp-phone" className={labelClass}>
                Mobile number <span className="text-orange-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-1.5 inset-y-1.5 flex items-center gap-1.5 px-3 rounded-xl bg-white border border-slate-200/80 text-sm font-semibold text-slate-700 pointer-events-none select-none">
                  <Phone className="w-3.5 h-3.5 text-orange-500" />
                  +63
                </span>
                <input
                  id="cp-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  value={phone}
                  onChange={(e) => setPhone(toPHMobileInput(e.target.value))}
                  onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
                  aria-invalid={Boolean(phoneShown)}
                  aria-describedby={phoneShown ? 'cp-phone-error' : 'cp-phone-hint'}
                  placeholder="917 123 4567"
                  className={`${phoneShown ? inputBad : inputOk} pl-[5.75rem] tabular-nums tracking-wide`}
                />
              </div>
              {phoneShown ? (
                <FieldError id="cp-phone-error" message={phoneShown} />
              ) : (
                <p id="cp-phone-hint" className="mt-1.5 text-xs text-slate-400">
                  For booking updates and calls or texts from the shop only.
                </p>
              )}
            </div>

            {/* Consent card: plain white, only the box shows the tick (proof is saved with the profile) */}
            <div
              className={`rounded-2xl border bg-white p-3.5 sm:p-4 transition ${
                termsError && !agreed ? 'border-rose-300' : 'border-slate-200'
              }`}
            >
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  id="cp-terms"
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => {
                    // They tick it only after reading both (the modal's "I agree" ticks it for them)
                    if (e.target.checked && !hasRead) {
                      setLegalTab('terms');
                      return;
                    }
                    setAgreed(e.target.checked);
                  }}
                  aria-invalid={Boolean(termsError)}
                  aria-describedby={termsError ? 'cp-terms-error' : undefined}
                  className="peer sr-only"
                />
                {/* Our own box instead of the browser's checkbox */}
                <span
                  aria-hidden="true"
                  className={`mt-px w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition peer-focus-visible:ring-4 peer-focus-visible:ring-orange-500/20 ${
                    agreed
                      ? 'bg-orange-500 border-orange-500 text-white'
                      : termsError
                        ? 'bg-white border-rose-400'
                        : 'bg-white border-slate-300'
                  }`}
                >
                  {agreed && <Check className="w-3 h-3" />}
                </span>
                <span className="text-sm text-slate-600 leading-relaxed">
                  I have read and agree to the MotoCare{' '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setLegalTab('terms');
                    }}
                    className="font-semibold text-slate-900 hover:text-orange-600 hover:underline underline-offset-2 cursor-pointer"
                  >
                    Terms of Service
                  </button>{' '}
                  and{' '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setLegalTab('privacy');
                    }}
                    className="font-semibold text-slate-900 hover:text-orange-600 hover:underline underline-offset-2 cursor-pointer"
                  >
                    Privacy Policy
                  </button>
                  .
                </span>
              </label>
            </div>
            <FieldError id="cp-terms-error" message={termsError} />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-6 w-full h-12 sm:h-[3.25rem] bg-orange-500 hover:bg-orange-600 active:scale-[0.99] text-white font-semibold rounded-full text-base transition cursor-pointer shadow-lg shadow-orange-500/25 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                Continue to dashboard
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-400 text-center">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            Protected by the Data Privacy Act
          </p>
        </form>
      </main>

      <LegalTermsModal
        // Remount per tab so it opens on the link that was tapped
        key={legalTab || 'closed'}
        isOpen={legalTab !== null}
        onClose={() => setLegalTab(null)}
        initialTab={legalTab || 'terms'}
        hasAgreed={hasRead}
        onAccept={() => {
          setHasRead(true);
          setAgreed(true);
          setLegalTab(null);
        }}
      />
    </div>
  );
}
