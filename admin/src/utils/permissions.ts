import { AdminTab, UserRole } from '../types/admin';

export function canAccessTab(role: UserRole, tab: AdminTab): boolean {
  if (tab === 'analytics' || tab === 'staff') {
    return role === 'admin' || role === 'superadmin';
  }
  return true;
}

export function canManageStaff(role: UserRole): boolean {
  return role === 'admin' || role === 'superadmin';
}

export function canCreateStaffAccount(role: UserRole): boolean {
  return role === 'admin' || role === 'superadmin';
}

export function canViewFinancialRevenue(role: UserRole): boolean {
  return role === 'admin' || role === 'superadmin';
}

export function canEditTicket(role: UserRole): boolean {
  return role === 'staff' || role === 'admin' || role === 'superadmin';
}

export function canDeleteTicket(role: UserRole): boolean {
  return role === 'staff' || role === 'admin' || role === 'superadmin';
}
