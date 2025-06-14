export interface Client {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: 'client' | 'admin';
  created_at: string;
}

export interface Professional {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  location: string | null;
  services: Service[];
  stripe_account_id: string | null;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration: number;
  professional_id: string;
}

export interface Payment {
  id: string;
  amount: number;
  created_at: string;
  client_id: string;
  professional_id: string;
  booking_id: string;
  client_name?: string;
  professional_name?: string;
}

export interface Booking {
  id: string;
  client_id: string;
  professional_id: string;
  service_id: string;
  start_time: string;
  end_time: string;
  status: string;
  notes?: string;
  location?: string;
  created_at: string;
  updated_at: string;
} 