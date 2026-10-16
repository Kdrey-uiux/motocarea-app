export type UserRole = 'admin' | 'staff' | 'customer';

export type InternalTab =
  | 'actions'
  | 'dashboard'
  | 'queue'
  | 'bays'
  | 'billing'
  | 'analytics'
  | 'staff'
  | 'audit'
  | 'messages'
  | 'fleet'
  | 'services';

export interface BillingLineItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  isAdditional?: boolean;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'DECLINED';
  reason?: string;
  requestedAt?: string;
  respondedAt?: string;
}

export interface InternalTicket {
  id: string;
  ticket_code: string;
  service_type: string;
  stage: number; // 1 to 5
  status: string; // PENDING_DROPOFF, IN_PROGRESS, READY_FOR_PICKUP, COMPLETED, CANCELLED_BY_ADMIN, MISSED, NO_SHOW
  assigned_bay?: string;
  assigned_mechanic?: string;
  estimated_pickup?: string;
  total_estimate?: string;
  notes?: string;
  dropoff_date?: string;
  dropoff_window?: string;
  created_at: string;
  updated_at?: string;
  user_id?: string;
  customer_name?: string;
  customer_phone?: string;
  is_walk_in?: boolean;
  odometer?: string;
  // Over-The-Counter Billing Fields
  parts_cost?: number;
  labor_cost?: number;
  discount_amount?: number;
  discount_type?: 'NONE' | 'SENIOR_PWD' | 'PROMO' | 'CUSTOM';
  total_amount?: number;
  billing_breakdown?: BillingLineItem[];
  payment_method?: 'CASH' | 'GCASH' | 'MAYA' | 'OVER_THE_COUNTER';
  payment_status?: 'UNPAID' | 'PAID';
  paid_at?: string;
  released_by?: string;
  // Soft Cancellation Fields
  cancellation_reason?: string;
  cancelled_by?: string;
  cancelled_at?: string;
  // Related Models
  motorcycles?: {
    id: string;
    model: string;
    plate_number: string;
    year_model?: string;
    odometer?: string;
  };
  profiles?: {
    full_name: string;
    phone_number: string;
    role?: string;
  };
}

export interface InternalStaffMember {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  position: string;
  role: 'staff' | 'admin';
  isActive: boolean;
  createdAt: string;
  createdBy?: string;
  password?: string;
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

export interface WorkshopBay {
  id: string;
  bayNumber: string;
  name: string;
  type: string;
  liftType: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
  activeTicketId?: string;
  activeTicketCode?: string;
  activeBikeModel?: string;
  activePlateNumber?: string;
  activeCustomerName?: string;
  assignedMechanic?: string;
  currentStage?: number;
  maintenanceReason?: string;
}

export interface WorkshopServiceItem {
  id: string;
  name: string;
  estimatedTime: string;
  priceRange: string;
  basePrice?: number;
  recommendedBay: string;
  description: string;
  checklist: string[];
  isActive?: boolean;
}

export interface NotificationAlert {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'ticket' | 'chat' | 'system';
  read: boolean;
  ticketCode?: string;
}
