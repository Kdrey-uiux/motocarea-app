/**
 * Cloudflare Turnstile ("verify you are human") for Supabase Auth.
 *
 * Every sign-in, sign-up, and password-reset request asks for a fresh token with
 * getCaptchaToken() and passes it to Supabase as `captchaToken`; Supabase checks it on the
 * server once CAPTCHA protection is turned on (Dashboard → Authentication → Attack Protection).
 *
 * The check is usually invisible. Only when Cloudflare wants an interaction does a small card
 * with the Turnstile box appear at the bottom of the screen.
 *
 * Without VITE_TURNSTILE_SITE_KEY nothing changes: getCaptchaToken() returns undefined and
 * sign-in works as before (turn CAPTCHA on in Supabase only after the key is deployed).
 */

interface TurnstileRenderOptions {
  sitekey: string;
  action?: string;
  appearance?: 'always' | 'execute' | 'interaction-only';
  theme?: 'auto' | 'light' | 'dark';
  callback?: (token: string) => void;
  'error-callback'?: () => void;
  'expired-callback'?: () => void;
  'timeout-callback'?: () => void;
  'before-interactive-callback'?: () => void;
}

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
      remove: (widgetId: string) => void;
    };
  }
}

const SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim();
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const GIVE_UP_AFTER_MS = 90_000;

let scriptLoading: Promise<void> | null = null;

function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (!scriptLoading) {
    scriptLoading = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SCRIPT_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptLoading = null;
        reject(new Error('Could not load the security check. Check your internet connection and try again.'));
      };
      document.head.appendChild(script);
    });
  }
  return scriptLoading;
}

/**
 * A fresh, single-use Turnstile token, or undefined when CAPTCHA is not set up.
 * `action` labels the request in the Cloudflare dashboard (e.g. "login", "signup").
 */
export async function getCaptchaToken(action?: string): Promise<string | undefined> {
  if (!SITE_KEY) return undefined;
  await loadTurnstile();
  const turnstile = window.turnstile;
  if (!turnstile) throw new Error('Could not load the security check. Please reload the page.');

  return new Promise((resolve, reject) => {
    // The card stays empty and hidden unless Cloudflare asks for a click
    const host = document.createElement('div');
    host.className = 'captcha-host';
    host.setAttribute('role', 'dialog');
    host.setAttribute('aria-label', 'Security check');
    const note = document.createElement('p');
    note.className = 'captcha-host__note';
    note.textContent = 'Quick security check';
    const slot = document.createElement('div');
    host.append(note, slot);
    document.body.appendChild(host);

    let widgetId = '';
    let done = false;
    const finish = (token?: string, error?: Error) => {
      if (done) return;
      done = true;
      window.clearTimeout(giveUp);
      try {
        if (widgetId) turnstile.remove(widgetId);
      } catch {
        // Already removed
      }
      host.remove();
      if (token) resolve(token);
      else reject(error ?? new Error('Security check failed. Please try again.'));
    };
    const giveUp = window.setTimeout(
      () => finish(undefined, new Error('The security check took too long. Please try again.')),
      GIVE_UP_AFTER_MS
    );

    widgetId = turnstile.render(slot, {
      sitekey: SITE_KEY,
      action,
      appearance: 'interaction-only',
      theme: 'light',
      callback: (token) => finish(token),
      'error-callback': () => finish(undefined, new Error('Security check failed. Please reload the page and try again.')),
      'expired-callback': () => finish(undefined, new Error('The security check expired. Please try again.')),
      'timeout-callback': () => finish(undefined, new Error('The security check timed out. Please try again.')),
      'before-interactive-callback': () => host.classList.add('captcha-host--visible'),
    });
  });
}
