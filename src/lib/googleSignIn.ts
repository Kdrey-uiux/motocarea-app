/**
 * Google sign-in on our own page (Google Identity Services).
 *
 * Google's button gives us an ID token and we hand it to Supabase (signInWithIdToken), so
 * the Google window says "to continue to motocare.live" instead of the Supabase project
 * address. Needs VITE_GOOGLE_CLIENT_ID (the same Web client ID set in Supabase → Auth →
 * Providers → Google). Without it the login page keeps the old redirect sign-in.
 */

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleButtonOptions {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: number;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
            nonce?: string;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
            ux_mode?: 'popup' | 'redirect';
            context?: 'signin' | 'signup' | 'use';
          }) => void;
          renderButton: (parent: HTMLElement, options: GoogleButtonOptions) => void;
          cancel: () => void;
        };
      };
    };
  }
}

const CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim();

/** True when the on-page Google button can be used */
export const GOOGLE_BUTTON_ENABLED = Boolean(CLIENT_ID);

export function getGoogleClientId(): string | undefined {
  return CLIENT_ID;
}

const SCRIPT_URL = 'https://accounts.google.com/gsi/client';
let scriptLoading: Promise<void> | null = null;

export function loadGoogleIdentity(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!scriptLoading) {
    scriptLoading = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SCRIPT_URL;
      script.async = true;
      script.onload = () => (window.google?.accounts?.id ? resolve() : reject(new Error('Google sign-in did not load.')));
      script.onerror = () => {
        scriptLoading = null;
        reject(new Error('Google sign-in did not load.'));
      };
      document.head.appendChild(script);
    });
  }
  return scriptLoading;
}

/**
 * A one-time code for one sign-in. Google puts the hashed code inside the ID token and
 * Supabase checks it against the raw code, so a copied token can't be reused elsewhere.
 */
export async function createNonce(): Promise<{ raw: string; hashed: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const raw = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  const hashed = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  return { raw, hashed };
}
