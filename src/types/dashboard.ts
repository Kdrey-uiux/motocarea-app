export type TabType = 'overview' | 'book' | 'history' | 'profile' | 'settings';

export interface BikeModel {
  id?: string;
  brand: string;
  name: string;
}

export interface Motorcycle {
  id: string;
  model: string;
  plate_number: string;
  year_model: string;
  odometer: string;
  status: string;
  next_service: string;
}

export interface AdditionalAuthorizationItem {
  id: string;
  name: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  isAdditional?: boolean;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'DECLINED';
  reason?: string;
  requestedAt?: string;
  respondedAt?: string;
}

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
  paid_at?: string | null;
  user_id?: string;
  motorcycle_id?: string;
  dropoff_date?: string;
  notes?: string;
  billing_breakdown?: AdditionalAuthorizationItem[];
  cancellation_reason?: string;
  cancelled_by?: string;
  cancelled_at?: string;
  motorcycles?: {
    model: string;
    plate_number: string;
  } | null;
}

export interface UserProfile {
  full_name: string;
  email: string;
  phone_number: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  sender_role: 'customer' | 'admin';
  message: string;
  created_at: string;
  is_read?: boolean;
}