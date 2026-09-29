import { WorkshopStaffMember, WorkshopAdminAccount } from '../types/admin';
import { recordAuditLog } from './auditLogger';
import { supabase } from '../lib/supabase';

const STAFF_STORAGE_KEY = 'motocare_workshop_staff_roster';
const ADMIN_STORAGE_KEY = 'motocare_workshop_admin_accounts';

export function getAdminAccounts(): WorkshopAdminAccount[] {
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Error reading admin accounts:', err);
    return [];
  }
}

export function saveAdminAccounts(admins: WorkshopAdminAccount[]): void {
  try {
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(admins));
  } catch (err) {
    console.error('Error saving admin accounts:', err);
  }
}

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
      error: 'Account not found: Hindi rehistrado ang Admin account na ito. Tanging ang Super Admin (Owner) lamang ang may karapatang gumawa ng Admin account.',
    };
  }

  if (found.status === 'disabled') {
    return {
      success: false,
      error: 'Account Deactivated: Ang iyong Admin account ay na-deactivate ng Super Admin (Owner). Makipag-ugnayan sa pamunuan.',
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

export function getStaffMembers(): WorkshopStaffMember[] {
  try {
    const raw = localStorage.getItem(STAFF_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const clean = parsed.filter(
        (s) => !['staff-001', 'staff-002', 'staff-003', 'staff-004'].includes(s.id)
      );
      return clean;
    }
    return [];
  } catch (err) {
    console.error('Error reading staff members from storage:', err);
    return [];
  }
}

export function saveStaffMembers(members: WorkshopStaffMember[]): void {
  try {
    localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(members));
  } catch (err) {
    console.error('Error saving staff members:', err);
  }
}

export function isStaffEmailDisabled(email: string): boolean {
  const clean = email.trim().toLowerCase();
  const staff = getStaffMembers().find(
    (s) => s.email.trim().toLowerCase() === clean
  );
  return staff?.status === 'disabled';
}

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
      error: 'Account not found: Wala pang staff account para sa email na ito. Kailangang gawan muna ito ng account ng Workshop Admin bago makapag-login.',
    };
  }

  if (found.status === 'disabled') {
    return {
      success: false,
      error: 'Account Deactivated: Ang iyong staff account ay kasalukuyang naka-disable. Makipag-ugnayan sa iyong Admin o Workshop Manager para sa re-activation.',
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
      createdBy: params.creatorName || 'Workshop Admin / Manager',
    };

    const updated = [newStaff, ...existing];
    saveStaffMembers(updated);

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
      // Offline fallback
    }

    await recordAuditLog({
      ticketCode: 'STAFF-AUTH',
      action: 'STAFF_ACCOUNT_CREATED',
      actor: params.creatorName || 'Workshop Admin / Manager',
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

export async function toggleStaffStatus(
  staffId: string,
  actorName = 'Workshop Admin / Manager',
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
