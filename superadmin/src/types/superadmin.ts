export type SuperAdminTab = 'analytics' | 'admins' | 'audit' | 'settings';

export interface SuperAdminProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'superadmin';
  createdAt: string;
}

export interface WorkshopAdminAccount {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'admin';
  position: string;
  status: 'active' | 'disabled';
  password?: string;
  createdAt: string;
  lastLogin?: string;
  createdBy?: string;
}

export interface WorkshopStaffMember {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  position: string;
  role: 'staff';
  status: 'active' | 'disabled';
  createdAt: string;
  createdBy?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  ticketCode: string;
  action: string;
  actor: string;
  details: string;
  previousValue?: string;
  newValue?: string;
}

export interface ExecutiveKpiMetrics {
  totalRevenue: number;
  completedTicketsCount: number;
  activeAdminsCount: number;
  activeStaffCount: number;
  registeredFleetCount: number;
  averageTicketValue: number;
  bayUtilizationRate: number;
  totalPendingOrders: number;
}

export interface SystemSettings {
  shopName: string;
  tagline: string;
  ownerName: string;
  ownerEmail: string;
  supportPhone: string;
  address: string;
  defaultBayCount: number;
  currencySymbol: string;
  taxRatePercent: number;
  emergencyMaintenanceMode: boolean;
}
