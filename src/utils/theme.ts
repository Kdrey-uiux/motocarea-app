import { useEffect, useLayoutEffect, useState } from 'react';

/**
 * Light / dark appearance. The choice is saved on this device only (no database),
 * and "system" follows the phone or computer setting.
 */
export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'motocare_theme';
const CHANGE_EVENT = 'motocare-theme-change';

export function getThemePreference(): ThemePreference {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
  } catch {
    // Storage blocked (private mode): fall back to the default
  }
  return 'system';
}

export function setThemePreference(preference: ThemePreference) {
  try {
    localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // Not saved, but still applied for this visit
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: preference }));
}

const prefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

/**
 * Applies the saved appearance to the page while the calling screen is open
 * (adds the `dark` class on <html>, removes it again on leave).
 * Returns the preference, a setter for the Appearance switch, and whether dark is showing now.
 */
export function useThemePreference(): [ThemePreference, (preference: ThemePreference) => void, boolean] {
  const [preference, setPreference] = useState<ThemePreference>(getThemePreference);
  const [systemDark, setSystemDark] = useState<boolean>(prefersDark);

  // Follow changes from the switch, other tabs, and the device setting
  useEffect(() => {
    const onChange = (e: Event) => setPreference((e as CustomEvent<ThemePreference>).detail);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setPreference(getThemePreference());
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
  }, []);

  const isDark = preference === 'dark' || (preference === 'system' && systemDark);

  // Layout effect: applied before the first paint, so there is no light flash
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', isDark);
    return () => root.classList.remove('dark');
  }, [isDark]);

  return [preference, setThemePreference, isDark];
}
