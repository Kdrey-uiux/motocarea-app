import { InternalTab, UserRole } from '../types/internal';

/**
 * MotoCare Strict Role Model (3 Roles):
 *  - customer : Rider app only (/login, /dashboard) - 403 on /internal
 *  - staff    : Workshop Floor (Queue, Bays, Stage 1-5, Billing input, Print, Chat)
 *               Has their own Dashboard (same workshop overview, no team management).
 *               STRICTLY NO access to Ticket Voiding, Activity Logs, or Staff Management.
 *  - admin    : Shop Owner (Full control: Staff roster, Soft-void, System audit, Settings)
 *  Payments are handled outside the system, so there are no revenue/financial views.
 */

export function canAccessTab(role: UserRole, tab: InternalTab): boolean {
  if (role !== 'admin' && role !== 'staff') {
    return false;
  }
  // Strictly Admin-Only Tabs
  if (tab === 'staff' || tab === 'audit') {
    return role === 'admin';
  }
  // Tabs accessible by both Staff and Admin
  return true;
}

export function canManageStaff(role: UserRole): boolean {
  return role === 'admin';
}

export function canCreateStaffAccount(role: UserRole): boolean {
  return role === 'admin';
}

export function canToggleStaffStatus(role: UserRole): boolean {
  return role === 'admin';
}

export function canVoidTicket(role: UserRole): boolean {
  return role === 'admin'; // Only Shop Owner can soft-cancel / void tickets!
}

export function canProgressStages(role: UserRole): boolean {
  return role === 'admin' || role === 'staff';
}

export function canProcessBilling(role: UserRole): boolean {
  return role === 'admin' || role === 'staff';
}

export function canPrintReceipt(role: UserRole): boolean {
  return role === 'admin' || role === 'staff';
}

export function canViewAuditLogs(role: UserRole): boolean {
  return role === 'admin';
}

