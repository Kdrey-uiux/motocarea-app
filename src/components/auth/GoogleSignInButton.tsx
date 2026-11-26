import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { createNonce, getGoogleClientId, loadGoogleIdentity } from '../../lib/googleSignIn';

interface GoogleSignInButtonProps {
  /** Gets Google's ID token and the raw one-time code to pass to Supabase */
  onCredential: (idToken: string, rawNonce: string) => void;
  /** Sign-in in progress: the button is covered and can't be pressed */
  busy?: boolean;
  /** Shown while Google's button loads, and kept if it can't load (the old redirect button) */
  fallback: ReactNode;
}

/**
 * Google's own "Continue with Google" button, drawn by Google on our page. The Google
 * window then names motocare.live, not the Supabase project address.
 */
export default function GoogleSignInButton({ onCredential, busy = false, fallback }: GoogleSignInButtonProps) {
  const slot = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  // Latest handler without drawing the button again on every parent render
  const onCredentialRef = useRef(onCredential);
  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  const clientId = getGoogleClientId();

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;

    (async () => {
      try {
        const [nonce] = await Promise.all([createNonce(), loadGoogleIdentity()]);
        const google = window.google;
        if (cancelled || !slot.current || !google) return;

        google.accounts.id.initialize({
          client_id: clientId,
          nonce: nonce.hashed,
          ux_mode: 'popup',
          context: 'signin',
          callback: (response) => {
            if (response.credential) onCredentialRef.current(response.credential, nonce.raw);
          },
        });
        // Google's button is at most 400px wide
        const width = Math.max(200, Math.min(400, Math.floor(slot.current.offsetWidth || 400)));
        google.accounts.id.renderButton(slot.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          logo_alignment: 'center',
          width,
        });
        setReady(true);
      } catch (err) {
        // Script blocked or offline: the redirect button stays
        console.warn('Google button unavailable, using redirect sign-in:', err);
      }
    })();

    return () => {
      cancelled = true;
      window.google?.accounts.id.cancel();
    };
  }, [clientId]);

  if (!clientId) return <>{fallback}</>;

  return (
    <div className="relative">
      {!ready && fallback}
      {/* Google draws its button inside this box; kept in the page so it doesn't need drawing again */}
      <div
        ref={slot}
        className={ready ? 'flex justify-center w-full min-h-[44px]' : 'absolute inset-x-0 top-0 opacity-0 pointer-events-none'}
        aria-hidden={!ready}
      />
      {ready && busy && (
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-white/80 cursor-wait">
          <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
          <span className="sr-only">Signing in with Google…</span>
        </div>
      )}
    </div>
  );
}
