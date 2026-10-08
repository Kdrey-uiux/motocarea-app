export type UserRole = 'customer' | 'staff' | 'admin';

export type AdminTab =
  | 'queue'
  | 'bays'
  | 'audit'
  | 'analytics'
  | 'fleet'
  | 'messages'
  | 'services'
  | 'staff';

export interface ServiceTicket {
  id: string;
  ticket_code: string;
  service_type: string;
  stage: number;
  assigned_bay: string;
  assigned_mechanic: string;
  estimated_pickup: string;
  total_estimate: string;
  status: string;
  created_at: string;
  updated_at?: string;
  dropoff_date?: string;
  notes?: string;
  motorcycles?: {
    id?: string;
    model: string;
    plate_number: string;
    year_model?: string;
    odometer?: string;
  } | null;
}

export interface AdminTicket extends ServiceTicket {
  user_id?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  motorcycles?: {
    id?: string;
    model: string;
    plate_number: string;
    year_model?: string;
    odometer?: string;
  } | null;
  profiles?: {
    full_name: string;
    phone_number: string;
    email?: string;
    role?: UserRole;
  } | null;
}

export interface WorkshopBay {
  id: string;
  bayNumber: string;
  name: string;
  type: string;
  liftType: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
  activeTicketId?: string;
  activeTicketCode?: string;
  bikeModel?: string;
  plateNumber?: string;
  serviceType?: string;
  assignedMechanic?: string;
  stage?: number;
  timeStarted?: string;
}

export interface WorkshopMechanic {
  id: string;
  name: string;
  nickname: string;
  specialty: string;
  status: 'ON_DUTY' | 'BUSY' | 'ON_BREAK';
  activeTicketCode?: string;
  activeBay?: string;
  phone: string;
  completedJobsToday: number;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  ticketCode: string;
  action:
    | 'TICKET_CREATED'
    | 'STAGE_CHANGE'
    | 'BAY_ASSIGNMENT'
    | 'MECHANIC_ASSIGNMENT'
    | 'STATUS_CHANGE'
    | 'BOOKING_EXPIRED_MISSED'
    | 'LATE_CHECKIN_OVERRIDE'
    | 'GRACE_PERIOD_EXTENDED'
    | 'ADMIN_ASSISTED_RESCHEDULE'
    | 'ESTIMATE_UPDATED'
    | 'TICKET_DISPATCHED'
    | 'TICKET_COMPLETED'
    | 'TICKET_CANCELLED'
    | 'NOTE_ADDED'
    | 'STAFF_ACCOUNT_CREATED'
    | 'STAFF_ACCOUNT_DISABLED'
    | 'STAFF_ACCOUNT_ENABLED'
    | 'STAFF_ACCOUNT_UPDATED'
    | 'ADMIN_ACCOUNT_CREATED';
  actor: string;
  details: string;
  previousValue?: string;
  newValue?: string;
}

export interface WorkshopStaffMember {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  position: string;
  role: 'staff';
  status: 'active' | 'disabled';
  password?: string;
  createdAt: string;
  lastLogin?: string;
  createdBy?: string;
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

export interface FleetMotorcycle {
  id: string;
  model: string;
  plate_number: string;
  year_model: string;
  odometer: string;
  status: string;
  owner_id: string;
  owner_name: string;
  owner_phone: string;
  owner_email: string;
  total_services: number;
  last_service_date?: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  sender_role: 'customer' | 'admin';
  message: string;
  created_at: string;
  is_read?: boolean;
}
