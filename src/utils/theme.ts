import { useCallback, useEffect, useLayoutEffect, useState } from 'react';

/**
 * Light / dark appearance. The choice is saved on this device only (no database),
 * and "system" follows the phone or computer setting.
 *
 * Rider, staff and owner each keep their own choice, so switching one (e.g. testing all
 * three in the same browser) never changes the others.
 */
export type ThemePreference = 'light' | 'dark' | 'system';
export type ThemeScope = 'rider' | 'staff' | 'admin';

const STORAGE_KEYS: Record<ThemeScope, string> = {
  rider: 'motocare_theme',
  staff: 'motocare_staff_theme',
  admin: 'motocare_admin_theme',
};
// Who last used the console on this device, so the sign-in page uses their look
const LAST_CONSOLE_ROLE_KEY = 'motocare_console_last_role';

export function rememberConsoleScope(scope: 'staff' | 'admin') {
  try {
    localStorage.setItem(LAST_CONSOLE_ROLE_KEY, scope);
  } catch {
    // Not remembered; the sign-in page falls back to the staff look
  }
}

export function getLastConsoleScope(): 'staff' | 'admin' {
  try {
    return localStorage.getItem(LAST_CONSOLE_ROLE_KEY) === 'admin' ? 'admin' : 'staff';
  } catch {
    return 'staff';
  }
}
const CHANGE_EVENT = 'motocare-theme-change';

const isPreference = (v: unknown): v is ThemePreference => v === 'light' || v === 'dark' || v === 'system';

export function getThemePreference(scope: ThemeScope): ThemePreference {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS[scope]);
    if (isPreference(saved)) return saved;
  } catch {
    // Storage blocked (private mode): fall back to the default
  }
  return 'system';
}

export function setThemePreference(scope: ThemeScope, preference: ThemePreference) {
  try {
    localStorage.setItem(STORAGE_KEYS[scope], preference);
  } catch {
    // Not saved, but still applied for this visit
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { scope, preference } }));
}

const prefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

/**
 * Applies the saved appearance to the page while the calling screen is open
 * (adds the `dark` class on <html>, removes it again on leave).
 * Returns the preference, a setter for the Appearance switch, and whether dark is showing now.
 */
export function useThemePreference(
  scope: ThemeScope
): [ThemePreference, (preference: ThemePreference) => void, boolean] {
  const [preference, setPreference] = useState<ThemePreference>(() => getThemePreference(scope));
  const [systemDark, setSystemDark] = useState<boolean>(prefersDark);

  // Follow changes from the switch, other tabs, and the device setting
  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<{ scope: ThemeScope; preference: ThemePreference }>).detail;
      if (detail.scope === scope) setPreference(detail.preference);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS[scope]) setPreference(getThemePreference(scope));
    };
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onMedia = () => setSystemDark(media.matches);
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener('storage', onStorage);
    media.addEventListener('change', onMedia);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener('storage', onStorage);
      media.removeEventListener('change', onMedia);
    };
  }, [scope]);

  const isDark = preference === 'dark' || (preference === 'system' && systemDark);

  // Layout effect: applied before the first paint, so there is no light flash
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', isDark);
    return () => root.classList.remove('dark');
  }, [isDark]);

  const setForScope = useCallback((next: ThemePreference) => setThemePreference(scope, next), [scope]);
  return [preference, setForScope, isDark];
}
