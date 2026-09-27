import { WorkshopStaffMember, WorkshopAdminAccount } from '../types/admin';
import { recordAuditLog } from './auditLogger';
import { supabase } from '../lib/supabase';

const STAFF_STORAGE_KEY = 'motocare_workshop_staff_roster';
const ADMIN_STORAGE_KEY = 'motocare_workshop_admin_accounts';

// Walang pre-existing fake accounts; magsisimula sa malinis na estado (Clean Slate)
const INITIAL_STAFF_MEMBERS: WorkshopStaffMember[] = [];
const INITIAL_ADMIN_ACCOUNTS: WorkshopAdminAccount[] = [];

/**
 * Kunin ang listahan ng mga nakarehistrong Admin / Manager accounts
 */
export function getAdminAccounts(): WorkshopAdminAccount[] {
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (!raw) return INITIAL_ADMIN_ACCOUNTS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_ADMIN_ACCOUNTS;
  } catch (err) {
    console.error('Error reading admin accounts:', err);
    return INITIAL_ADMIN_ACCOUNTS;
  }
}

/**
 * I-save ang listahan ng Admin accounts
 */
export function saveAdminAccounts(admins: WorkshopAdminAccount[]): void {
  try {
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(admins));
  } catch (err) {
    console.error('Error saving admin accounts:', err);
  }
}

/**
 * Lumikha ng Admin / Owner / Manager account bago mag-login
 */
export async function createAdminAccount(params: {
  fullName: string;
  email: string;
  phone: string;
  position: string;
  password?: string;
}): Promise<{ success: boolean; admin?: WorkshopAdminAccount; error?: string }> {
  try {
    const cleanEmail = params.email.trim().toLowerCase();
    const existing = getAdminAccounts();

    // Suriin kung mayroon nang nakarehistro gamit ang email na ito
    if (existing.some((a) => a.email.trim().toLowerCase() === cleanEmail)) {
      return {
        success: false,
        error: `Mayroon nang nakarehistrong Admin account gamit ang email na "${cleanEmail}". Mangyaring mag-Sign In na lamang.`,
      };
    }

    const newAdmin: WorkshopAdminAccount = {
      id: `admin-${Date.now()}`,
      fullName: params.fullName.trim(),
      email: cleanEmail,
      phone: params.phone.trim() || 'N/A',
      role: 'admin',
      position: params.position.trim() || 'Shop Owner / Admin',
      password: params.password,
      createdAt: new Date().toISOString(),
    };

    // 1. Subukang i-rehistro sa Supabase Auth
    try {
      if (params.password) {
        await supabase.auth.signUp({
          email: cleanEmail,
          password: params.password,
          options: {
            data: {
              full_name: newAdmin.fullName,
              phone_number: newAdmin.phone,
              role: 'admin',
              position: newAdmin.position,
            },
          },
        });
      }

      // Upsert din sa profiles table
      await supabase.from('profiles').upsert(
        {
          id: newAdmin.id,
          full_name: newAdmin.fullName,
          phone_number: newAdmin.phone,
          role: 'admin',
        },
        { onConflict: 'id' }
      );
    } catch (sbErr) {
      console.warn('Supabase auth sign-up note:', sbErr);
    }

    // 2. I-save sa local storage registry
    const updated = [newAdmin, ...existing];
    saveAdminAccounts(updated);

    // 3. Awtomatikong itala sa Immutable Audit Log
    await recordAuditLog({
      ticketCode: 'ADMIN-AUTH',
      action: 'ADMIN_ACCOUNT_CREATED',
      actor: newAdmin.fullName,
      details: `Inirehistro ang bagong Workshop Admin account para kay ${newAdmin.fullName} (${newAdmin.email}) na may posisyong ${newAdmin.position}.`,
      previousValue: 'None',
      newValue: `Active Admin (${newAdmin.email})`,
    });

    return { success: true, admin: newAdmin };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Nabigong lumikha ng Admin account.';
    return { success: false, error: msg };
  }
}

/**
 * I-verify ang credentials ng Admin account
 */
export function verifyAdminCredentials(
  email: string,
  password?: string
): { success: boolean; admin?: WorkshopAdminAccount; error?: string } {
  const cleanEmail = email.trim().toLowerCase();
  const admins = getAdminAccounts();
  const found = admins.find((a) => a.email.trim().toLowerCase() === cleanEmail);

  if (!found) {
    return {
      success: false,
      error: 'Account not found: Hindi rehistrado ang Admin account na ito. Mangyaring gumawa muna ng account gamit ang "Create Admin Account" tab bago mag-login.',
    };
  }

  if (password && found.password && found.password !== password) {
    return {
      success: false,
      error: 'Invalid password: Maling password. Pakisuri at subukan muli.',
    };
  }

  return { success: true, admin: found };
}

/**
 * Kunin ang buong listahan ng workshop staff (Tanging mga ginawa ng Admin ang lilitaw)
 */
export function getStaffMembers(): WorkshopStaffMember[] {
  try {
    const raw = localStorage.getItem(STAFF_STORAGE_KEY);
    if (!raw) {
      return INITIAL_STAFF_MEMBERS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Linisin ang mga dating dummy accounts (kung may 'staff-001' to 'staff-004' mula sa nakaraang test)
      const clean = parsed.filter(
        (s) => !['staff-001', 'staff-002', 'staff-003', 'staff-004'].includes(s.id)
      );
      if (clean.length !== parsed.length) {
        localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(clean));
      }
      return clean;
    }
    return INITIAL_STAFF_MEMBERS;
  } catch (err) {
    console.error('Error reading staff members from storage:', err);
    return INITIAL_STAFF_MEMBERS;
  }
}

/**
 * I-save ang updated roster sa storage
 */
export function saveStaffMembers(members: WorkshopStaffMember[]): void {
  try {
    localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(members));
  } catch (err) {
    console.error('Error saving staff members:', err);
  }
}

/**
 * Tinitingnan kung disabled ang isang email address
 */
export function isStaffEmailDisabled(email: string): boolean {
  const clean = email.trim().toLowerCase();
  const staff = getStaffMembers().find(
    (s) => s.email.trim().toLowerCase() === clean
  );
  return staff?.status === 'disabled';
}

/**
 * I-verify ang credentials ng Staff bago mag-login
 */
export function verifyStaffCredentials(
  email: string,
  password?: string
): { success: boolean; staff?: WorkshopStaffMember; error?: string } {
  const cleanEmail = email.trim().toLowerCase();
  const staffList = getStaffMembers();
  const found = staffList.find((s) => s.email.trim().toLowerCase() === cleanEmail);

  if (!found) {
    return {
      success: false,
      error: 'Account not found: Wala pang staff account para sa email na ito. Kailangang gawan muna ito ng account ng Shop Admin bago makapag-login.',
    };
  }

  if (found.status === 'disabled') {
    return {
      success: false,
      error: 'Account Deactivated: Ang iyong staff account ay kasalukuyang naka-disable. Makipag-ugnayan sa iyong Admin o Shop Manager para sa re-activation.',
    };
  }

  if (password && found.password && found.password !== password) {
    return {
      success: false,
      error: 'Invalid password: Maling password para sa staff account na ito.',
    };
  }

  return { success: true, staff: found };
}

/**
 * Lumikha ng bagong staff account (Admin / Owner / Manager only)
 */
export async function createStaffMember(params: {
  fullName: string;
  email: string;
  phone: string;
  position: string;
  password?: string;
  creatorName?: string;
}): Promise<{ success: boolean; staff?: WorkshopStaffMember; error?: string }> {
  try {
    const existing = getStaffMembers();
    const cleanEmail = params.email.trim().toLowerCase();

    // Check duplicate
    if (existing.some((s) => s.email.trim().toLowerCase() === cleanEmail)) {
      return {
        success: false,
        error: `Mayroon nang nakarehistrong staff account gamit ang email na "${cleanEmail}".`,
      };
    }

    const newStaff: WorkshopStaffMember = {
      id: `staff-${Date.now()}`,
      fullName: params.fullName.trim(),
      email: cleanEmail,
      phone: params.phone.trim() || 'N/A',
      position: params.position.trim() || 'Workshop Staff',
      role: 'staff',
      status: 'active',
      password: params.password,
      createdAt: new Date().toISOString(),
      createdBy: params.creatorName || 'Workshop Admin / Owner',
    };

    const updated = [newStaff, ...existing];
    saveStaffMembers(updated);

    // Subukan din i-insert sa profiles table sa Supabase para sa database consistency
    try {
      await supabase.from('profiles').upsert(
        {
          id: newStaff.id,
          full_name: newStaff.fullName,
          phone_number: newStaff.phone,
          role: 'staff',
        },
        { onConflict: 'id' }
      );
    } catch {
      // Tahimik kung offline o simulated
    }

    // Awtomatikong mag-tala sa Immutable Audit Log
    await recordAuditLog({
      ticketCode: 'STAFF-AUTH',
      action: 'STAFF_ACCOUNT_CREATED',
      actor: params.creatorName || 'Workshop Admin / Owner',
      details: `Lumikha ng bagong staff account para kay ${newStaff.fullName} (${newStaff.email}) na may posisyong ${newStaff.position}. Initial Status: Active`,
      previousValue: 'None',
      newValue: `Active Staff (${newStaff.email})`,
    });

    return { success: true, staff: newStaff };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Nabigong lumikha ng staff account.';
    return { success: false, error: msg };
  }
}

/**
 * I-toggle ang status ng staff account (Active <-> Disabled)
 */
export async function toggleStaffStatus(
  staffId: string,
  actorName = 'Workshop Admin / Owner',
  reason?: string
): Promise<{ success: boolean; staff?: WorkshopStaffMember; error?: string }> {
  try {
    const currentList = getStaffMembers();
    const targetIndex = currentList.findIndex((s) => s.id === staffId);

    if (targetIndex === -1) {
      return { success: false, error: 'Hindi natagpuan ang staff account.' };
    }

    const target = currentList[targetIndex];
    const newStatus: 'active' | 'disabled' = target.status === 'active' ? 'disabled' : 'active';
    const updatedStaff: WorkshopStaffMember = {
      ...target,
      status: newStatus,
    };

    currentList[targetIndex] = updatedStaff;
    saveStaffMembers(currentList);

    // Mag-tala sa Immutable Audit Log
    const action = newStatus === 'disabled' ? 'STAFF_ACCOUNT_DISABLED' : 'STAFF_ACCOUNT_ENABLED';
    const details = newStatus === 'disabled'
      ? `Na-DISABLE ang staff account ni ${target.fullName} (${target.email}). Hindi na siya makakapag-login sa workshop system.${reason ? ` Dahilan: ${reason}` : ''}`
      : `Muling binuksan (ENABLED) ang staff account ni ${target.fullName} (${target.email}). Maaari na siyang mag-login muli.`;

    await recordAuditLog({
      ticketCode: 'STAFF-AUTH',
      action,
      actor: actorName,
      details,
      previousValue: target.status.toUpperCase(),
      newValue: newStatus.toUpperCase(),
    });

    return { success: true, staff: updatedStaff };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Nabigong palitan ang status ng account.';
    return { success: false, error: msg };
  }
}
