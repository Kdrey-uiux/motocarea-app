import { createClient } from '@supabase/supabase-js';
import { InternalStaffMember } from '../types/internal';
import { db, supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../../lib/supabase';
import { recordAuditLog } from './databaseAuditLogger';

const STAFF_REALTIME_CHANNEL = 'motocare_staff_realtime';
const STAFF_STORAGE_KEY = 'motocare_internal_staff_registry';

/**
 * Ephemeral non-persisting client used strictly for provisioning new staff accounts
 * so that calling `auth.signUp` never overwrites the currently logged-in Admin session.
 */
const staffProvisioningClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    storageKey: 'motocare_staff_provisioning',
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
    const client = db();
    const { data, error } = await client
      .from('profiles')
      .select('id, full_name, email, phone_number, position, role, is_active, created_at')
      .in('role', ['staff', 'admin']);

    if (!error && data) {
      const dbMapped: InternalStaffMember[] = data.map((p) => ({
        id: p.id,
        fullName: p.full_name || 'Personnel Member',
        email: p.email || 'N/A',
        phone: p.phone_number || 'N/A',
        // New profiles start with position "Customer"; never show that for a staff/admin account
        position:
          p.position && p.position !== 'Customer'
            ? p.position
            : p.role === 'admin'
            ? 'Shop Owner'
            : 'Service Advisor',
        role: p.role === 'admin' ? 'admin' : 'staff',
        isActive: p.is_active !== false,
        createdAt: p.created_at || new Date().toISOString(),
      }));

      // The database is the source of truth; refresh the local display cache from it
      saveLocalStaffRegistry(dbMapped);
      return dbMapped;
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

  if (!password || password.length < 8) {
    return { success: false, error: 'Set a password of at least 8 characters for the staff account.' };
  }

  try {
    // 1. Never turn an existing account (e.g. a customer) into staff
    const client = db();
    const { data: existing } = await client
      .from('profiles')
      .select('id, role')
      .eq('email', cleanEmail)
      .maybeSingle();
    if (existing) {
      return {
        success: false,
        error:
          existing.role === 'customer'
            ? 'This email belongs to a customer account. Use a different email for the staff member.'
            : 'A staff or admin account with this email already exists.',
      };
    }

    // 2. Create the Supabase Auth user with a non-persisting provisioning client
    const { data: authData, error: authError } = await staffProvisioningClient.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: cleanName,
          phone_number: cleanPhone,
          position: cleanPosition,
        },
      },
    });
    if (authError) {
      return { success: false, error: authError.message };
    }
    // Supabase returns a user without identities when the email is already registered
    if (!authData.user || authData.user.identities?.length === 0) {
      return { success: false, error: 'An account with this email already exists.' };
    }
    const createdAuthId = authData.user.id;

    // 3. Promote the new profile (auto-created as customer by the signup trigger) to staff
    const { error: profileError } = await client.from('profiles').upsert({
      id: createdAuthId,
      full_name: cleanName,
      email: cleanEmail,
      phone_number: cleanPhone || 'N/A',
      role: 'staff',
      position: cleanPosition || 'Service Advisor',
      is_active: true,
      updated_at: new Date().toISOString(),
    });
    if (profileError) {
      return { success: false, error: `Account created, but the staff profile could not be saved: ${profileError.message}` };
    }

    const newStaff: InternalStaffMember = {
      id: createdAuthId,
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
      db().channel(STAFF_REALTIME_CHANNEL).send({
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

    const client = db();
    const { error } = await client
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        phone_number: phone.trim() || 'N/A',
        position: position.trim(),
      })
      .eq('id', id);
    if (error) {
      return { success: false, error: error.message };
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
      db().channel(STAFF_REALTIME_CHANNEL).send({
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
    const client = db();
    const { data: profile, error: readError } = await client
      .from('profiles')
      .select('id, full_name, role, is_active')
      .eq('id', staffId)
      .maybeSingle();
    if (readError || !profile) {
      return { success: false, error: readError?.message || 'Staff account not found in the database.' };
    }
    if (profile.role === 'admin') {
      return { success: false, error: 'The Shop Owner (admin) account cannot be deactivated.' };
    }

    const currentStatus = profile.is_active !== false;
    const newStatus = !currentStatus;
    const target = { fullName: profile.full_name as string };

    const { error: updateError } = await client
      .from('profiles')
      .update({ is_active: newStatus })
      .eq('id', staffId);
    if (updateError) {
      return { success: false, error: updateError.message };
    }

    saveLocalStaffRegistry(
      getLocalStaffRegistry().map((s) => (s.id === staffId ? { ...s, isActive: newStatus } : s))
    );

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
      db().channel(STAFF_REALTIME_CHANNEL).send({
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
    const siteUrl = (import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/$/, '');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${siteUrl}/reset-password`,
    });
    if (error) {
      return { success: false, error: error.message };
    }

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



