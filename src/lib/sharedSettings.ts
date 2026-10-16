import { supabase } from './supabase';

/**
 * Workshop-wide settings stored in the Supabase `app_settings` table.
 * Each value is mirrored into localStorage and announced with a window event,
 * so screens that read the cache synchronously keep working, and every device
 * receives changes through realtime.
 */
export interface SharedSettingDef {
  key: string;
  storageKey: string;
  event: string;
}

export const SHARED_SETTINGS = {
  serviceCatalog: {
    key: 'service_catalog',
    storageKey: 'motocare_shared_services_catalog_v2',
    event: 'motocare_services_updated',
  },
  bayMaintenance: {
    key: 'bay_maintenance',
    storageKey: 'motocare_bay_maintenance_flags',
    event: 'motocare_bay_maintenance_updated',
  },
  resolvedConversations: {
    key: 'resolved_conversations',
    storageKey: 'motocare_resolved_conversations',
    event: 'motocare_resolved_conversations_updated',
  },
} satisfies Record<string, SharedSettingDef>;

const SETTINGS_BY_KEY: Record<string, SharedSettingDef> = Object.fromEntries(
  Object.values(SHARED_SETTINGS).map((s) => [s.key, s])
);

function applyToCache(setting: SharedSettingDef, value: unknown): void {
  try {
    localStorage.setItem(setting.storageKey, JSON.stringify(value));
  } catch {
    // ignore (private mode / storage full) — the event still refreshes in-memory state
  }
  window.dispatchEvent(new Event(setting.event));
}

/**
 * Reads the cached value of a shared setting (synchronous), or the fallback.
 */
export function readSharedSetting<T>(setting: SharedSettingDef, fallback: T): T {
  try {
    const raw = localStorage.getItem(setting.storageKey);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Saves a shared setting: updates this screen instantly, then persists to Supabase
 * so all other devices receive it.
 */
export async function saveSharedSetting(
  setting: SharedSettingDef,
  value: unknown,
  updatedBy?: string
): Promise<{ success: boolean; error?: string }> {
  applyToCache(setting, value);
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .upsert({ key: setting.key, value, updated_by: updatedBy ?? null })
      .select('key');
    if (error) return { success: false, error: error.message };
    if (!data || data.length === 0) {
      return { success: false, error: 'Database write permission error. Please run migration 07_app_settings.sql.' };
    }
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to save shared setting.' };
  }
}

let syncStarted = false;

/**
 * Loads all shared settings from Supabase once and keeps them live via realtime.
 * Safe to call multiple times; only the first call starts the sync.
 */
export function startSharedSettingsSync(): void {
  if (syncStarted || typeof window === 'undefined') return;
  syncStarted = true;

  const applyRow = (row: { key?: string; value?: unknown } | null | undefined) => {
    const setting = row?.key ? SETTINGS_BY_KEY[row.key] : undefined;
    if (setting && row?.value !== undefined) applyToCache(setting, row.value);
  };

  supabase
    .from('app_settings')
    .select('key, value')
    .then(({ data, error }) => {
      if (error) {
        console.warn('Shared settings load failed; using cached values:', error.message);
        return;
      }
      data?.forEach(applyRow);
    });

  supabase
    .channel('motocare_app_settings_sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, (payload) => {
      applyRow(payload.new as { key?: string; value?: unknown });
    })
    .subscribe();
}
