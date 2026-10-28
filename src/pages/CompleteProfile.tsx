import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AlertCircle, ArrowRight, Loader2, SignOutIcon } from '../components/icons';
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
  'w-full bg-slate-50 border rounded-xl px-3.5 py-3 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 transition';
const inputOk = `${inputBase} border-slate-200 focus:border-orange-500 focus:ring-orange-500/10`;
const inputBad = `${inputBase} border-rose-300 focus:border-rose-500 focus:ring-rose-500/10`;

function FieldError({ id, message }: { id: string; message: string | null }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1 flex items-start gap-1 text-xs text-rose-600">
      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
      {message}
    </p>
  );
}

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

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState(''); // the 10 digits after +63
  const [agreed, setAgreed] = useState(false);
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
  const termsError = triedSubmit && !agreed ? 'Please agree to the Terms and Privacy Policy to continue.' : null;

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

  const handleSignOut = async () => {
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    navigate('/login', { replace: true });
  };

  return (
    <div className="relative min-h-[100dvh] bg-white text-slate-900 flex flex-col selection:bg-orange-500 selection:text-white">
      {/* Top bar */}
      <header className="relative z-10 max-w-6xl w-full mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
        <Link to="/" className="group" aria-label="MotoCare home">
          <MotoCareLogo className="h-11 sm:h-14 w-auto text-slate-900 transition-transform group-hover:scale-[1.03]" />
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
        >
          <SignOutIcon className="w-4 h-4" />
          <span>Sign out</span>
        </button>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pb-10 pt-2 sm:pt-4">
        <form
          onSubmit={handleSubmit}
          noValidate
          className="max-w-md w-full bg-white border border-slate-200/80 rounded-[1.75rem] sm:rounded-[2rem] p-5 sm:p-8 shadow-xl shadow-slate-900/[0.04] animate-in fade-in slide-in-from-bottom-2 duration-500"
        >
          <div className="text-center mb-6">
            <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-medium bg-orange-100/70 text-orange-700">
              One last step
            </span>
            <h1 className="mt-3 text-[1.75rem] leading-tight sm:text-4xl font-extrabold tracking-[-0.03em] text-slate-900">
              Complete your <span className="text-orange-500">profile</span>
            </h1>
            <p className="text-slate-500 text-sm mt-2 leading-relaxed">
              The shop uses these to confirm your bookings and reach you about your motorcycle.
            </p>
            {email && (
              <p className="mt-2 text-xs text-slate-400 break-all">
                Signed in as <span className="font-medium text-slate-600">{email}</span>
              </p>
            )}
          </div>

          {errorMessage && (
            <div role="alert" className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-4">
            {/* Name: side by side on bigger screens, stacked on phones */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-3">
              <div>
                <label htmlFor="cp-first" className="block text-sm font-medium text-slate-700 mb-1.5">
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
                  placeholder="e.g. Juan"
                  className={firstError ? inputBad : inputOk}
                />
                <FieldError id="cp-first-error" message={firstError} />
              </div>
              <div>
                <label htmlFor="cp-last" className="block text-sm font-medium text-slate-700 mb-1.5">
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
                  placeholder="e.g. Dela Cruz"
                  className={lastError ? inputBad : inputOk}
                />
                <FieldError id="cp-last-error" message={lastError} />
              </div>
            </div>

            {/* Mobile: fixed +63, 10 digits after it (same as the normal sign-up) */}
            <div>
              <label htmlFor="cp-phone" className="block text-sm font-medium text-slate-700 mb-1.5">
                Mobile number <span className="text-orange-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-0 inset-y-0 flex items-center px-3.5 border-r border-slate-200 text-sm font-semibold text-slate-600 pointer-events-none select-none">
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
                  className={`${phoneShown ? inputBad : inputOk} pl-[4.25rem] tabular-nums tracking-wide`}
                />
              </div>
              {phoneShown ? (
                <FieldError id="cp-phone-error" message={phoneShown} />
              ) : (
                <p id="cp-phone-hint" className="mt-1 text-xs text-slate-400">
                  For booking updates and pickup calls only.
                </p>
              )}
            </div>

            {/* Consent (proof is saved with the profile) */}
            <div>
              <label className="flex items-start gap-3 cursor-pointer select-none rounded-xl p-3 -mx-1 hover:bg-slate-50 transition">
                <input
                  id="cp-terms"
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  aria-invalid={Boolean(termsError)}
                  className="mt-0.5 w-5 h-5 sm:w-4 sm:h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer shrink-0"
                />
                <span className="text-sm text-slate-600 leading-relaxed">
                  I agree to the{' '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setLegalTab('terms');
                    }}
                    className="font-semibold text-slate-900 hover:text-orange-600 underline-offset-2 hover:underline cursor-pointer"
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
                    className="font-semibold text-slate-900 hover:text-orange-600 underline-offset-2 hover:underline cursor-pointer"
                  >
                    Privacy Policy
                  </button>
                  .
                </span>
              </label>
              <FieldError id="cp-terms-error" message={termsError} />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-6 w-full bg-orange-500 hover:bg-orange-600 active:scale-[0.99] text-white font-semibold py-3.5 rounded-full text-base sm:text-sm transition cursor-pointer shadow-md shadow-orange-500/25 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
        </form>
      </main>

      <LegalTermsModal
        // Remount per tab so it opens on the link that was tapped
        key={legalTab || 'closed'}
        isOpen={legalTab !== null}
        onClose={() => setLegalTab(null)}
        initialTab={legalTab || 'terms'}
        hasAgreed={agreed}
        onAccept={() => {
          setAgreed(true);
          setLegalTab(null);
        }}
      />
    </div>
  );
}
