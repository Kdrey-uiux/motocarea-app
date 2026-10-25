import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { getTurnstileSiteKey, loadTurnstile } from '../../lib/captcha';

export interface TurnstileHandle {
  /** Clears the box for a new check (each token works for one request only) */
  reset: () => void;
}

interface TurnstileWidgetProps {
  /** Labels the request in the Cloudflare dashboard (e.g. "login") */
  action?: string;
  /** Receives the token when the check passes, and null when it expires or fails */
  onToken: (token: string | null) => void;
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
}

/**
 * The visible Cloudflare Turnstile box ("Verify you are human") for sign-in forms.
 * Renders nothing when no site key is configured.
 */
const TurnstileWidget = forwardRef<TurnstileHandle, TurnstileWidgetProps>(function TurnstileWidget(
  { action, onToken, theme = 'light', className = '' },
  ref
) {
  const slot = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  // Latest callback without re-rendering the widget on every parent render
  const onTokenRef = useRef(onToken);
  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  const siteKey = getTurnstileSiteKey();

  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;
    loadTurnstile()
      .then(() => {
        if (cancelled || !slot.current || !window.turnstile) return;
        widgetId.current = window.turnstile.render(slot.current, {
          sitekey: siteKey,
          action,
          appearance: 'always',
          size: 'flexible',
          theme,
          callback: (token) => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(null),
          'error-callback': () => onTokenRef.current(null),
          'timeout-callback': () => onTokenRef.current(null),
        });
      })
      .catch(() => onTokenRef.current(null));
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetId.current);
        } catch {
          // Already removed
        }
      }
      widgetId.current = null;
    };
  }, [siteKey, action, theme]);

  useImperativeHandle(ref, () => ({
    reset: () => {
      onTokenRef.current(null);
      if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
    },
  }));

  if (!siteKey) return null;
  // Turnstile's own box is 65px tall; reserve it so the form doesn't jump while it loads
  return <div ref={slot} className={`min-h-[65px] w-full ${className}`} />;
});

export default TurnstileWidget;
