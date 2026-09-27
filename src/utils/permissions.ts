import { AdminTab, UserRole } from '../types/admin';

/**
 * RBAC Helper para sa Workshop Operations
 */

/**
 * Tinitingnan kung may access ang user role sa partikular na tab.
 * Ang 'analytics' (Revenue & Financial Metrics) ay eksklusibo lamang sa Admin / Superadmin.
 */
export function canAccessTab(role: UserRole, tab: AdminTab): boolean {
  if (tab === 'analytics' || tab === 'staff') {
    return role === 'admin' || role === 'superadmin';
  }
  return true;
}

/**
 * Tinitingnan kung may karapatan mag-manage ng staff accounts (create, enable, disable).
 * Eksklusibo lamang para sa Admin, Owner, o Manager.
 */
export function canManageStaff(role: UserRole): boolean {
  return role === 'admin' || role === 'superadmin';
}

/**
 * Tinitingnan kung may karapatan lumikha ng bagong staff account.
 */
export function canCreateStaffAccount(role: UserRole): boolean {
  return role === 'admin' || role === 'superadmin';
}

/**
 * Tinitingnan kung may karapatang makakita ng financial earnings at gross sales.
 */
export function canViewFinancialRevenue(role: UserRole): boolean {
  return role === 'admin' || role === 'superadmin';
}

/**
 * Parehong puwedeng mag-edit ng ticket ang Staff at Admin.
 */
export function canEditTicket(role: UserRole): boolean {
  return role === 'staff' || role === 'admin' || role === 'superadmin';
}

/**
 * Parehong puwedeng mag-delete / cancel ng ticket ang Staff at Admin
 * na may kaakibat na awtomatikong Audit Log entry para sa accountability.
 */
export function canDeleteTicket(role: UserRole): boolean {
  return role === 'staff' || role === 'admin' || role === 'superadmin';
}
