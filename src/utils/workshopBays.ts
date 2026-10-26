import { useSyncExternalStore } from 'react';
import { readSharedSetting, reloadSharedSetting, saveSharedSetting, SHARED_SETTINGS } from '../lib/sharedSettings';

/**
 * Number of service bays on the workshop floor. The owner sets it on the Bays page;
 * it is stored in app_settings ('workshop_bays', migration 15) and reaches every device live.
 * One bay = one online booking per day, so it is also the daily booking limit.
 * Bays 01–03 are the shop's fixed bays and can't be removed; only added bays (04+) can.
 */
export const MIN_BAYS = 3;
export const MAX_BAYS = 12;
export const DEFAULT_BAYS = 3;

const clamp = (n: number) => Math.min(MAX_BAYS, Math.max(MIN_BAYS, Math.round(n)));

/** Current bay count (cached copy of the shared setting; 3 until it loads) */
export function getBayCount(): number {
  const saved = readSharedSetting<{ count?: unknown } | null>(SHARED_SETTINGS.workshopBays, null);
  const count = Number(saved?.count);
  return Number.isFinite(count) && count > 0 ? clamp(count) : DEFAULT_BAYS;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(SHARED_SETTINGS.workshopBays.event, onChange);
  return () => window.removeEventListener(SHARED_SETTINGS.workshopBays.event, onChange);
}

/** Bay count that updates live when the owner adds or removes a bay */
export function useBayCount(): number {
  return useSyncExternalStore(subscribe, getBayCount, () => DEFAULT_BAYS);
}

/** "Bay 01", "Bay 02", ... (the label stored on tickets) */
export function bayLabel(num: number): string {
  return `Bay ${String(num).padStart(2, '0')}`;
}

/** The workshop's bays, numbered 1..count */
export function bayList(count: number): { id: string; num: number }[] {
  return Array.from({ length: count }, (_, i) => ({ id: bayLabel(i + 1), num: i + 1 }));
}

/**
 * Saves a new bay count (owner only; the database refuses anyone else).
 * On failure the stored value is loaded again so screens don't show the refused count.
 */
export async function saveBayCount(count: number, actorName?: string): Promise<{ success: boolean; error?: string }> {
  const next = clamp(count);
  const result = await saveSharedSetting(SHARED_SETTINGS.workshopBays, { count: next }, actorName);
  if (!result.success) await reloadSharedSetting(SHARED_SETTINGS.workshopBays);
  return result;
}
