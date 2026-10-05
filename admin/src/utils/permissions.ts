import { AdminTab, UserRole } from '../types/admin';

/**
 * MotoCare Role Model (3 roles):
 *  - customer : Rider app only (no workshop console access)
 *  - staff    : Workshop operations (queue, bays, chat, hardcopies) — no analytics, no account management
 *  - admin    : Full workshop control, including creating & managing staff accounts
 */

export function canAccessTab(role: UserRole, tab: AdminTab): boolean {
  if (tab === 'analytics' || tab === 'staff') {
    return role === 'admin';
  }
  return true;
}

export function canManageStaff(role: UserRole): boolean {
  return role === 'admin';
}

export function canCreateStaffAccount(role: UserRole): boolean {
  return role === 'admin';
}

export function canViewFinancialRevenue(role: UserRole): boolean {
  return role === 'admin';
}

export function canEditTicket(role: UserRole): boolean {
  return role === 'staff' || role === 'admin';
}

export function canDeleteTicket(role: UserRole): boolean {
  return role === 'staff' || role === 'admin';
}
