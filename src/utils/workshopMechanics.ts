import { useSyncExternalStore } from 'react';
import { readSharedSetting, saveSharedSetting, setSharedSettingCache, SHARED_SETTINGS } from '../lib/sharedSettings';
import { db } from '../lib/supabase';

/**
 * The shop's mechanics. Mechanics don't have accounts: the owner keeps this list on the
 * Team page and staff pick from it when they assign a job, so every ticket spells a
 * mechanic's name the same way. The ticket still stores the name (assigned_mechanic).
 *
 * Stored in app_settings ('workshop_mechanics'), readable by staff and the owner only
 * (migration 25), and live on every device.
 */

export interface WorkshopMechanic {
  /** Stable id, ready for a real mechanics table later */
  id: string;
  name: string;
  /** False when the mechanic no longer works at the shop (never deleted, so history stays) */
  active: boolean;
}

export interface MechanicRoster {
  mechanics: WorkshopMechanic[];
  /** The day the "In today" marks below belong to (YYYY-MM-DD, this device's date) */
  presentDate: string | null;
  presentIds: string[];
}

const EMPTY_ROSTER: MechanicRoster = { mechanics: [], presentDate: null, presentIds: [] };

export const MECHANIC_NAME_MAX = 60;

// Texts older screens wrote when no mechanic was chosen yet: not people
const PLACEHOLDER_NAMES = new Set(['queued for assignment', 'assigned tech', 'mechanic', 'n/a', 'na', 'none', 'tba', 'to be assigned']);

// A job that is finished or no longer coming does not keep its mechanic busy
const CLOSED_STATUSES = new Set(['COMPLETED', 'CANCELLED', 'CANCELLED_BY_ADMIN', 'MISSED', 'NO_SHOW']);

/** "  juan   dela cruz " -> "juan dela cruz" (spacing only; capital letters are kept) */
export function cleanMechanicName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

/** Compares names without caring about capital letters or extra spaces */
export function mechanicKey(name?: string | null): string {
  return cleanMechanicName(name || '').toLowerCase();
}

export function isPlaceholderMechanic(name?: string | null): boolean {
  const key = mechanicKey(name);
  return !key || PLACEHOLDER_NAMES.has(key);
}

/** Today's date on this device, YYYY-MM-DD */
export function todayKey(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function newMechanicId(): string {
  const chars = '23456789ABCDEFGHJKMNPQRSTUVXYZ';
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return 'm-' + Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

// Older builds may have saved a plain list of names: give each a stable id from its name
function legacyId(name: string): string {
  let hash = 0;
  for (const ch of mechanicKey(name)) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return `m-legacy-${hash.toString(36)}`;
}

function normalize(raw: unknown): MechanicRoster {
  if (Array.isArray(raw)) {
    const mechanics = raw
      .filter((n): n is string => typeof n === 'string' && !isPlaceholderMechanic(n))
      .map((n) => ({ id: legacyId(n), name: cleanMechanicName(n), active: true }));
    return { ...EMPTY_ROSTER, mechanics };
  }
  if (!raw || typeof raw !== 'object') return EMPTY_ROSTER;
  const r = raw as Record<string, unknown>;
  const mechanics = (Array.isArray(r.mechanics) ? r.mechanics : [])
    .filter((m): m is Record<string, unknown> => !!m && typeof m === 'object')
    .filter((m) => typeof m.id === 'string' && typeof m.name === 'string' && cleanMechanicName(m.name as string))
    .map((m) => ({ id: m.id as string, name: cleanMechanicName(m.name as string), active: m.active !== false }));
  return {
    mechanics,
    presentDate: typeof r.presentDate === 'string' ? r.presentDate : null,
    presentIds: Array.isArray(r.presentIds) ? r.presentIds.filter((id): id is string => typeof id === 'string') : [],
  };
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(SHARED_SETTINGS.mechanics.event, onChange);
  return () => window.removeEventListener(SHARED_SETTINGS.mechanics.event, onChange);
}

// useSyncExternalStore needs the same object back until the list really changes
let cachedKey: string | null = null;
let cachedRoster: MechanicRoster = EMPTY_ROSTER;

export function getMechanicRoster(): MechanicRoster {
  const saved = readSharedSetting<unknown>(SHARED_SETTINGS.mechanics, null);
  const key = JSON.stringify(saved);
  if (key !== cachedKey) {
    cachedKey = key;
    cachedRoster = normalize(saved);
  }
  return cachedRoster;
}

/** The mechanic list, updating live when the owner changes it on any device */
export function useMechanicRoster(): MechanicRoster {
  return useSyncExternalStore(subscribe, getMechanicRoster, () => EMPTY_ROSTER);
}

/** True when someone marked who came in today (marks from earlier days don't count) */
export function hasAttendanceToday(roster: MechanicRoster): boolean {
  return roster.presentDate === todayKey() && roster.presentIds.length > 0;
}

export function isInToday(roster: MechanicRoster, id: string): boolean {
  return roster.presentDate === todayKey() && roster.presentIds.includes(id);
}

/** Error message for a name, or null when it can be used */
export function mechanicNameError(name: string, roster: MechanicRoster, ignoreId?: string): string | null {
  const clean = cleanMechanicName(name);
  if (clean.length < 2) return 'Enter the mechanic’s name.';
  if (clean.length > MECHANIC_NAME_MAX) return `Keep the name under ${MECHANIC_NAME_MAX} characters.`;
  if (!/^[\p{L} .'-]+$/u.test(clean)) return 'Use letters only (spaces, dots, dashes and apostrophes are fine).';
  if (isPlaceholderMechanic(clean)) return 'Enter the mechanic’s real name.';
  const key = mechanicKey(clean);
  if (roster.mechanics.some((m) => m.id !== ignoreId && mechanicKey(m.name) === key)) {
    return `${clean} is already on the list.`;
  }
  return null;
}

/**
 * Saves the whole list (owner screen). The change shows here at once; if the database
 * refuses it, this device goes back to the stored list.
 */
export async function saveMechanicRoster(
  next: MechanicRoster,
  actorName?: string
): Promise<{ success: boolean; error?: string }> {
  const previous = readSharedSetting<unknown>(SHARED_SETTINGS.mechanics, null);
  const result = await saveSharedSetting(SHARED_SETTINGS.mechanics, next, actorName);
  if (!result.success) setSharedSettingCache(SHARED_SETTINGS.mechanics, previous);
  return result;
}

/** Adds several names at once (one per item). Returns what was added and what was skipped. */
export function addMechanicsToRoster(
  roster: MechanicRoster,
  names: string[]
): { next: MechanicRoster; added: string[]; skipped: { name: string; reason: string }[] } {
  let next = roster;
  const added: string[] = [];
  const skipped: { name: string; reason: string }[] = [];
  for (const raw of names) {
    const name = cleanMechanicName(raw);
    if (!name) continue;
    const existing = next.mechanics.find((m) => mechanicKey(m.name) === mechanicKey(name));
    if (existing && !existing.active) {
      // Someone who left and came back: turn the old entry on instead of adding a twin
      next = { ...next, mechanics: next.mechanics.map((m) => (m.id === existing.id ? { ...m, active: true } : m)) };
      added.push(existing.name);
      continue;
    }
    const error = mechanicNameError(name, next);
    if (error) {
      skipped.push({ name, reason: error });
      continue;
    }
    next = { ...next, mechanics: [...next.mechanics, { id: newMechanicId(), name, active: true }] };
    added.push(name);
  }
  return { next, added, skipped };
}

/** Marks a mechanic in or out for today. Marks from an earlier day are cleared first. */
export function setInToday(roster: MechanicRoster, id: string, inToday: boolean): MechanicRoster {
  const today = todayKey();
  const current = roster.presentDate === today ? roster.presentIds : [];
  const presentIds = inToday ? Array.from(new Set([...current, id])) : current.filter((x) => x !== id);
  return { ...roster, presentDate: today, presentIds };
}

export interface MechanicLoad {
  /** Jobs on the floor right now (in the shop, not yet Ready) */
  active: number;
  /** Released jobs */
  done: number;
}

type TicketLike = { status: string; stage?: number | null; assigned_mechanic?: string | null };

/** Job counts per mechanic name (keyed by mechanicKey) */
export function mechanicLoads(tickets: TicketLike[]): Map<string, MechanicLoad> {
  const loads = new Map<string, MechanicLoad>();
  for (const t of tickets) {
    if (isPlaceholderMechanic(t.assigned_mechanic)) continue;
    const key = mechanicKey(t.assigned_mechanic);
    const load = loads.get(key) ?? { active: 0, done: 0 };
    if (t.status === 'COMPLETED') load.done += 1;
    else if (!CLOSED_STATUSES.has(t.status) && t.status !== 'READY_FOR_PICKUP' && (t.stage ?? 1) < 5) load.active += 1;
    loads.set(key, load);
  }
  return loads;
}

/** Names typed on tickets that are not on the list yet, most used first */
export function namesNotOnRoster(tickets: TicketLike[], roster: MechanicRoster): { name: string; tickets: number }[] {
  const onList = new Set(roster.mechanics.map((m) => mechanicKey(m.name)));
  const found = new Map<string, { name: string; tickets: number }>();
  for (const t of tickets) {
    if (isPlaceholderMechanic(t.assigned_mechanic)) continue;
    const key = mechanicKey(t.assigned_mechanic);
    if (onList.has(key)) continue;
    const entry = found.get(key) ?? { name: cleanMechanicName(t.assigned_mechanic || ''), tickets: 0 };
    entry.tickets += 1;
    found.set(key, entry);
  }
  return Array.from(found.values()).sort((a, b) => b.tickets - a.tickets || a.name.localeCompare(b.name));
}

/**
 * After a rename, open jobs (not released, cancelled or missed) show the new name.
 * Finished tickets keep the name they were released under. Returns how many changed.
 */
export async function renameMechanicOnOpenTickets(
  oldName: string,
  newName: string
): Promise<{ success: boolean; count: number; error?: string }> {
  // Names only hold letters, spaces, dots, dashes and apostrophes, so ilike matches the name
  // exactly while ignoring capital letters (no % or _ wildcards can appear in it)
  const { data, error } = await db()
    .from('service_tickets')
    .update({ assigned_mechanic: newName })
    .ilike('assigned_mechanic', cleanMechanicName(oldName))
    .not('status', 'in', '("COMPLETED","CANCELLED","CANCELLED_BY_ADMIN","MISSED","NO_SHOW")')
    .select('id');
  if (error) return { success: false, count: 0, error: error.message };
  return { success: true, count: data?.length ?? 0 };
}
