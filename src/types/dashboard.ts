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
  dropoff_date?: string;
  notes?: string;
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