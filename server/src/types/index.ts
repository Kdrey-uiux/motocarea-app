import { Request } from 'express';
import { User } from '@supabase/supabase-js';

export interface AuthenticatedRequest extends Request {
  user?: User;
  userRole?: string;
}

export interface TicketPayload {
  motorcycle_id: string;
  service_type: string;
  dropoff_date?: string;
  notes?: string;
  total_estimate?: string;
}

export interface MotorcyclePayload {
  model: string;
  plate_number: string;
  year_model?: string;
  odometer?: string;
}
