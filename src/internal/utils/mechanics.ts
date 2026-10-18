import { useEffect, useState } from 'react';
import { readSharedSetting, saveSharedSetting, SHARED_SETTINGS } from '../../lib/sharedSettings';

/**
 * Workshop mechanics are names only — they have no account or login.
 * Staff assign them to jobs; the list is shared across devices via app_settings.
 */
export function getMechanics(): string[] {
  const list = readSharedSetting<unknown>(SHARED_SETTINGS.mechanics, []);
  return Array.isArray(list) ? list.filter((n): n is string => typeof n === 'string' && n.trim() !== '') : [];
}

export function saveMechanics(names: string[], actor?: string) {
  const unique = Array.from(new Map(names.map((n) => [n.trim().toLowerCase(), n.trim()])).values()).filter(Boolean);
  unique.sort((a, b) => a.localeCompare(b));
  return saveSharedSetting(SHARED_SETTINGS.mechanics, unique, actor);
}

/** Adds a mechanic typed during dispatch so it can be picked next time. */
export function rememberMechanic(name: string, actor?: string) {
  const clean = name.trim();
  const current = getMechanics();
  if (!clean || current.some((n) => n.toLowerCase() === clean.toLowerCase())) return;
  saveMechanics([...current, clean], actor);
}

/** Live mechanic names (updates when another device edits the list). */
export function useMechanics(): string[] {
  const [names, setNames] = useState<string[]>(() => getMechanics());
  useEffect(() => {
    const onChange = () => setNames(getMechanics());
    window.addEventListener(SHARED_SETTINGS.mechanics.event, onChange);
    return () => window.removeEventListener(SHARED_SETTINGS.mechanics.event, onChange);
  }, []);
  return names;
}
