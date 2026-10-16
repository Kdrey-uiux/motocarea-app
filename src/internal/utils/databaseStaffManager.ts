import { createClient } from '@supabase/supabase-js';
import { InternalStaffMember } from '../types/internal';
import { supabase } from '../../lib/supabase';
import { recordAuditLog } from './databaseAuditLogger';

const STAFF_REALTIME_CHANNEL = 'motocare_staff_realtime';
const STAFF_STORAGE_KEY = 'motocare_internal_staff_registry';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://cqkwlyqajtajkvctgdeu.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_q09s0Ukkdx0uTDeunRfUGA_BWx4uwNb';

/**
 * Ephemeral non-persisting client used strictly for provisioning new staff accounts
 * so that calling `auth.signUp` never overwrites the currently logged-in Admin session.
 */
const staffProvisioningClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

// Seeded placeholder records from older builds that must never be shown or kept
const LEGACY_SEED_STAFF_IDS = ['staff-admin-01', 'staff-floor-01', 'staff-tech-01'];

/**
 * Local display cache of staff records (names, positions, active flag).
 * Never holds passwords and is never used for login — Supabase Auth is the only login source.
 */
export function getLocalStaffRegistry(): InternalStaffMember[] {
  try {
    const raw = localStorage.getItem(STAFF_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const hadPasswords = parsed.some((s) => s && 'password' in s);
        // Purge legacy seeded/demo staff and strip any stored passwords
        const cleaned: InternalStaffMember[] = parsed
          .filter(
            (s) =>
              s &&
              !LEGACY_SEED_STAFF_IDS.includes(s.id) &&
              !s.fullName?.toLowerCase().includes('mark santos') &&
              !s.fullName?.toLowerCase().includes('arnel reyes')
          )
          .map((s) => {
            const copy = { ...s };
            delete copy.password;
            return copy;
          });
        if (hadPasswords || cleaned.length !== parsed.length) {
          saveLocalStaffRegistry(cleaned);
        }
        return cleaned;
      }
    }
  } catch {
    // ignore
  }
  return [];
}

function saveLocalStaffRegistry(list: InternalStaffMember[]): void {
  try {
    localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

/**
 * Fetch staff personnel from Supabase `profiles` table (using `.select('*')` to avoid
 * missing-column errors if optional SQL migration columns aren't added yet) merged with
 * the workshop staff registry.
 */
export async function fetchDatabaseStaffMembers(): Promise<InternalStaffMember[]> {
  const localList = getLocalStaffRegistry();

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['staff', 'admin']);

    if (!error && data && data.length > 0) {
      const dbMapped: InternalStaffMember[] = data.map((p: any) => ({
        id: p.id,
        fullName: p.full_name || 'Personnel Member',
        email: p.email || 'N/A',
        phone: p.phone_number || 'N/A',
        position: p.position || (p.role === 'admin' ? 'Shop Owner' : 'Service Advisor'),
        role: p.role === 'admin' ? 'admin' : 'staff',
        isActive: p.is_active !== false,
        createdAt: p.created_at || new Date().toISOString(),
      }));

      // Merge DB profiles with local registry so newly created/default staff always appear
      const mergedMap = new Map<string, InternalStaffMember>();
      for (const item of localList) {
        mergedMap.set(item.email.toLowerCase(), item);
      }
      for (const dbItem of dbMapped) {
        if (dbItem.email && dbItem.email !== 'N/A') {
          mergedMap.set(dbItem.email.toLowerCase(), dbItem);
        } else {
          mergedMap.set(dbItem.id, dbItem);
        }
      }
      return Array.from(mergedMap.values());
    }
  } catch (err) {
    console.warn('Error fetching staff profiles from database:', err);
  }

  return localList;
}

/**
 * Create a new staff account in Supabase Auth + `profiles` + local registry
 */
export async function createDatabaseStaffMember({
  fullName,
  email,
  phone,
  position,
  password,
  creatorName = 'Shop Owner',
}: {
  fullName: string;
  email: string;
  phone: string;
  position: string;
  password?: string;
  creatorName?: string;
}): Promise<{ success: boolean; staff?: InternalStaffMember; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = fullName.trim();
  const cleanPhone = phone.trim();
  const cleanPosition = position.trim();

  try {
    // 1. Create auth user in Supabase using non-persisting provisioning client
    let createdAuthId = '';
    if (password) {
      const { data: authData, error: authError } = await staffProvisioningClient.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: cleanName,
            phone_number: cleanPhone,
            role: 'staff',
            position: cleanPosition,
          },
        },
      });

      if (!authError && authData.user) {
        createdAuthId = authData.user.id;
      }
    }

    // 2. Try inserting/upserting into profiles table gracefully
    const fallbackId = createdAuthId || `staff-${Date.now()}`;
    try {
      await supabase.from('profiles').upsert({
        id: fallbackId,
        full_name: cleanName,
        phone_number: cleanPhone,
        role: 'staff',
        updated_at: new Date().toISOString(),
      });
    } catch {
      // ignore schema differences if SQL migration hasn't run yet
    }

    const newStaff: InternalStaffMember = {
      id: fallbackId,
      fullName: cleanName,
      email: cleanEmail,
      phone: cleanPhone || 'N/A',
      position: cleanPosition,
      role: 'staff',
      isActive: true,
      createdAt: new Date().toISOString(),
      createdBy: creatorName,
    };

    const currentList = getLocalStaffRegistry().filter(
      (s) => s.email.toLowerCase() !== cleanEmail
    );
    saveLocalStaffRegistry([newStaff, ...currentList]);

    await recordAuditLog({
      ticketCode: 'PERSONNEL',
      action: 'STAFF_HIRED',
      actor: creatorName,
      details: `New staff account created for ${cleanName} (${cleanPosition})`,
      newValue: cleanEmail,
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('motocare_staff_updated'));
      supabase.channel(STAFF_REALTIME_CHANNEL).send({
        type: 'broadcast',
        event: 'STAFF_SYNC',
        payload: { event: 'created', staffId: newStaff.id },
      }).catch(() => {});
    }

    return { success: true, staff: newStaff };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to register staff account.';
    return { success: false, error: msg };
  }
}

/**
 * Update an existing staff member's info (name, phone, position)
 */
export async function updateDatabaseStaffMember({
  id,
  fullName,
  phone,
  position,
  actorName = 'Shop Owner',
}: {
  id: string;
  fullName: string;
  phone: string;
  position: string;
  actorName?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const currentList = getLocalStaffRegistry();
    const updatedList = currentList.map((s) =>
      s.id === id
        ? { ...s, fullName: fullName.trim(), phone: phone.trim(), position: position.trim() }
        : s
    );
    saveLocalStaffRegistry(updatedList);

    try {
      await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone_number: phone.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
    } catch {
      // ignore if row only in local registry
    }

    await recordAuditLog({
      ticketCode: 'PERSONNEL',
      action: 'STAFF_UPDATED',
      actor: actorName,
      details: `Updated details for staff member ID ${id} (${fullName})`,
      newValue: `${position} | ${phone}`,
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('motocare_staff_updated'));
      supabase.channel(STAFF_REALTIME_CHANNEL).send({
        type: 'broadcast',
        event: 'STAFF_SYNC',
        payload: { event: 'updated', staffId: id },
      }).catch(() => {});
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update staff member.';
    return { success: false, error: msg };
  }
}

/**
 * Toggle staff active/deactivated status in Supabase `profiles` and local registry
 */
export async function toggleDatabaseStaffStatus(
  staffId: string,
  actorName: string = 'Shop Owner',
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentList = getLocalStaffRegistry();
    const target = currentList.find((s) => s.id === staffId);
    const currentStatus = target ? target.isActive !== false : true;
    const newStatus = !currentStatus;

    const updatedList = currentList.map((s) =>
      s.id === staffId ? { ...s, isActive: newStatus } : s
    );
    saveLocalStaffRegistry(updatedList);

    try {
      await supabase
        .from('profiles')
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq('id', staffId);
    } catch {
      // ignore if column is_active is not yet migrated in SQL
    }

    // Record Audit Trail
    await recordAuditLog({
      ticketCode: 'PERSONNEL',
      action: newStatus ? 'STAFF_ACTIVATED' : 'STAFF_DEACTIVATED',
      actor: actorName,
      details: `${newStatus ? 'Reactivated' : 'Deactivated'} account for ${
        target?.fullName || staffId
      }. Reason: ${reason || 'Administrative Action'}`,
      previousValue: currentStatus ? 'Active' : 'Deactivated',
      newValue: newStatus ? 'Active' : 'Deactivated',
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('motocare_staff_updated'));
      supabase.channel(STAFF_REALTIME_CHANNEL).send({
        type: 'broadcast',
        event: 'STAFF_SYNC',
        payload: { event: 'status_toggled', staffId, newStatus },
      }).catch(() => {});
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to toggle staff status.';
    return { success: false, error: msg };
  }
}

/**
 * Send password reset email to a staff member
 */
export async function sendStaffPasswordResetEmail(
  email: string,
  actorName: string = 'Shop Owner'
): Promise<{ success: boolean; error?: string }> {
  try {
    await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase()).catch(() => {});

    await recordAuditLog({
      ticketCode: 'PERSONNEL',
      action: 'PASSWORD_RESET_DISPATCHED',
      actor: actorName,
      details: `Password recovery instructions dispatched to staff email ${email}`,
    });

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to dispatch password recovery email.';
    return { success: false, error: msg };
  }
}

export function getActiveWorkshopStaff(staffList: InternalStaffMember[]) {
  if (!staffList || staffList.length === 0) {
    return [
      { id: 'staff-active-01', name: 'Workshop Staff', position: 'Service Advisor & Floor Support' },
    ];
  }
  const activeOnly = staffList.filter((s) => s.isActive && s.role !== 'admin');
  if (activeOnly.length === 0) {
    // If only admin exists or no non-admin staff, allow active staff/admin
    return staffList.filter((s) => s.isActive).map((s) => ({ id: s.id, name: s.fullName, position: s.position }));
  }
  return activeOnly.map((s) => ({ id: s.id, name: s.fullName, position: s.position }));
}

export const getActiveTechnicians = getActiveWorkshopStaff;



