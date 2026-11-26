export type BarberLiveStatus = "available" | "busy" | "off";

export type BookingStatus =
  | "confirmed"
  | "arrived"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

export type BookingSource = "online" | "walk_in";

export type PaymentQrMode = "vietqr" | "image" | "off";

export interface ShopSettings {
  id: number;
  name: string;
  tagline: string;
  address: string;
  phone: string;
  slot_interval_minutes: number;
  admin_pin: string;
  payment_qr_mode: PaymentQrMode;
  payment_bank_bin: string | null;
  payment_account_no: string | null;
  payment_account_name: string | null;
  payment_qr_url: string | null;
  payment_note: string | null;
}

export interface Barber {
  id: number;
  name: string;
  title: string;
  bio: string;
  avatar_url: string | null;
  specialty: string;
  is_active: boolean;
  current_status: BarberLiveStatus;
  estimated_free_at: string | null;
  sort_order: number;
}

export interface Service {
  id: number;
  name: string;
  description: string;
  category: string;
  duration_minutes: number;
  price: number;
  is_popular: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface Customer {
  id: number;
  phone: string;
  name: string;
  notes: string | null;
  last_barber_id: number | null;
  last_service_ids: number[];
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: number;
  code: string;
  customer_id: number;
  barber_id: number;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  total_duration: number;
  total_price: number;
  service_ids: number[];
  service_names: string[];
  status: BookingStatus;
  source: BookingSource;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingWithDetails extends Booking {
  customer_name: string;
  customer_phone: string;
  barber_name: string;
  barber_title: string;
  latest_hair_record?: HairRecord | null;
}

export interface HairRecord {
  id: number;
  customer_id: number;
  booking_id: number | null;
  barber_id: number | null;
  barber_name?: string;
  style_name: string;
  tags: string[];
  technical_note: string;
  photo_urls: string[];
  service_ids: number[];
  cut_date: string; // YYYY-MM-DD
  created_at: string;
}

export interface WorkingHour {
  id: number;
  day_of_week: number; // 0 = Sun, 1 = Mon, ... 6 = Sat
  is_open: boolean;
  open_time: string; // HH:mm
  close_time: string; // HH:mm
}

export interface TimeOff {
  id: number;
  barber_id: number | null;
  barber_name?: string | null;
  date: string; // YYYY-MM-DD
  start_time: string | null; // null = whole day
  end_time: string | null;
  reason: string;
  created_at: string;
}

export interface TimeSlot {
  time: string; // HH:mm
  end_time: string; // HH:mm
  period: "morning" | "afternoon" | "evening";
  available: boolean;
  available_barber_ids: number[];
}

export interface LiveChairBarberInfo {
  id: number;
  name: string;
  title: string;
  current_status: BarberLiveStatus;
  estimated_free_at: string | null;
  waiting_count: number;
  next_slot_today: string | null;
  auto_busy_range?: string | null;
}

export interface LiveChairSummary {
  shop_open: boolean;
  open_time: string;
  close_time: string;
  overall_status: "available" | "busy" | "closed";
  headline: string;
  subline: string;
  waiting_count: number;
  active_barber_count: number;
  available_chair_count: number;
  busy_chair_count: number;
  earliest_free_at: string | null;
  barbers: LiveChairBarberInfo[];
  updated_at: string;
}

export interface CustomerLookupResponse {
  found: boolean;
  customer?: Customer & {
    last_barber_name?: string | null;
    last_services?: Service[];
    days_since_last_cut?: number | null;
    total_visits?: number;
  };
  upcoming_bookings: BookingWithDetails[];
  past_bookings: BookingWithDetails[];
  hair_records: HairRecord[];
  quick_slots: Array<{
    date: string;
    date_label: string;
    time: string;
    barber_id: number;
  }>;
}
