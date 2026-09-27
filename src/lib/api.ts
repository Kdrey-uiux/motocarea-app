import { supabase } from './supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Helper para magpadala ng HTTP request sa Node.js backend na may kalakip na Supabase auth token
 */
export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; message?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const result = await response.json();
    return result;
  } catch (error: any) {
    console.error(`API Fetch Error (${endpoint}):`, error);
    return {
      success: false,
      message: error.message || 'Network error occurred connecting to backend.',
    };
  }
}

// 1. Tickets API
export const ticketsApi = {
  trackByCode: (code: string) => apiFetch(`/tickets/track/${code}`),
  getMyTickets: () => apiFetch('/tickets/my-tickets'),
  bookService: (payload: {
    motorcycle_id: string;
    service_type: string;
    dropoff_date?: string;
    notes?: string;
    total_estimate?: string;
  }) =>
    apiFetch('/tickets/book', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

// 2. Admin API
export const adminApi = {
  getAllTickets: () => apiFetch('/admin/tickets'),
  updateStatus: (ticketId: string, updates: {
    status?: string;
    stage?: number;
    assigned_bay?: string;
    assigned_mechanic?: string;
    estimated_pickup?: string;
  }) =>
    apiFetch(`/admin/tickets/${ticketId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
  getMetrics: () => apiFetch('/admin/metrics'),
};

// 3. Motorcycles API
export const motorcyclesApi = {
  getCatalog: (q?: string) =>
    apiFetch<Array<{ id: string; brand: string; name: string }>>(
      q ? `/motorcycles/catalog?q=${encodeURIComponent(q)}` : '/motorcycles/catalog'
    ),
  getMyBikes: () => apiFetch('/motorcycles'),
  addBike: (payload: {
    model: string;
    plate_number: string;
    year_model?: string;
    odometer?: string;
  }) =>
    apiFetch('/motorcycles', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  removeBike: (id: string) =>
    apiFetch(`/motorcycles/${id}`, {
      method: 'DELETE',
    }),
};

// 4. Messages API
export const messagesApi = {
  getMessages: () => apiFetch('/messages'),
  sendMessage: (message: string) =>
    apiFetch('/messages', {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),
};

// 5. Profile API
export const profileApi = {
  getProfile: () => apiFetch('/profile'),
  updateProfile: (payload: { full_name?: string; phone_number?: string }) =>
    apiFetch('/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
};
