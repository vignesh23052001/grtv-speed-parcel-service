export type Role = 'customer' | 'driver' | 'hub' | 'admin';

export type ServiceType = 'ltl' | 'ftl';

export type BookingStatus =
  | 'pending'
  | 'placed'
  | 'picked_up'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export type VehicleType =
  | 'bike'
  | 'pickup'
  | 'truck_14ft'
  | 'truck_20ft'
  | 'truck_32ft'
  | 'container';

export type VehicleStatus = 'idle' | 'on_duty' | 'maintenance';

export type ExpenseType = 'fuel' | 'toll' | 'maintenance';

export type InvoiceStatus = 'unpaid' | 'paid' | 'overdue';

export type QuoteStatus = 'pending' | 'approved' | 'rejected';

export type ScanAction = 'arrived' | 'dispatched';

export interface Profile {
  id: string;
  user_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  role: Role;
  created_at: string;
}

export interface Vehicle {
  id: string;
  registration_number: string;
  type: VehicleType;
  capacity_kg: number;
  status: VehicleStatus;
  lat: number | null;
  lng: number | null;
  created_at: string;
}

export interface Driver {
  id: string;
  profile_id: string | null;
  license_number: string | null;
  on_duty: boolean;
  current_vehicle_id: string | null;
  created_at: string;
}

export interface Hub {
  id: string;
  name: string;
  code: string;
  city: string;
  address: string | null;
  phone: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
}

export interface ParcelItem {
  description: string;
  quantity: number;
}

export interface Booking {
  id: string;
  tracking_id: string;
  customer_id: string | null;
  service_type: ServiceType;
  status: BookingStatus;
  pickup_address: string;
  delivery_address: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  delivery_lat: number | null;
  delivery_lng: number | null;
  distance_km: number | null;
  weight_kg: number;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  goods_class: string | null;
  declared_value: number;
  freight_charge: number | null;
  eway_bill_number: string | null;
  doorstep_pickup: boolean;
  consignor_name: string | null;
  consignor_phone: string | null;
  consignor_gstin: string | null;
  consignor_email: string | null;
  consignor_pincode: string | null;
  consignor_city: string | null;
  consignor_state: string | null;
  consignee_name: string | null;
  consignee_phone: string | null;
  consignee_gstin: string | null;
  consignee_contact_person: string | null;
  consignee_pincode: string | null;
  consignee_city: string | null;
  consignee_state: string | null;
  parcel_count: number;
  parcel_details: ParcelItem[] | null;
  delivery_type: 'godown' | 'door';
  driver_id: string | null;
  vehicle_id: string | null;
  current_hub_id: string | null;
  delivery_otp: string | null;
  eta: string | null;
  delay_reason: string | null;
  delay_note: string | null;
  pod_signature: string | null;
  pod_photo_url: string | null;
  approval_type: 'pickup' | 'branch' | 'rejected' | null;
  approval_message: string | null;
  pickup_datetime: string | null;
  pickup_phone: string | null;
  branch_id: string | null;
  branch_phone: string | null;
  rejected_message: string | null;
  booking_source: 'online' | 'counter';
  created_by: string | null;
  payment_status: 'unpaid' | 'partial' | 'paid';
  amount_paid: number;
  rating: number | null;
  rating_comment: string | null;
  rated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SavedAddress {
  id: string;
  customer_id: string | null;
  label: string;
  contact_name: string | null;
  phone: string | null;
  address: string;
  city: string | null;
  state: string | null;
  pincode: string | null;
  is_default: boolean;
  created_at: string;
}

export interface TrackingLog {
  id: string;
  booking_id: string;
  status: BookingStatus | string;
  hub_id: string | null;
  note: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
}

export interface HubScan {
  id: string;
  booking_id: string;
  hub_id: string;
  action: ScanAction;
  scanned_by: string | null;
  created_at: string;
}

export interface ShiftLog {
  id: string;
  driver_id: string;
  vehicle_id: string | null;
  start_time: string;
  end_time: string | null;
  start_km: number | null;
  end_km: number | null;
  status: 'active' | 'ended';
  trip_earnings: number | null;
  amount_paid: number | null;
  total_parcels: number | null;
  created_at: string;
}

export interface ExpenseLog {
  id: string;
  shift_log_id: string | null;
  driver_id: string;
  type: ExpenseType;
  amount: number;
  receipt_url: string | null;
  note: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  booking_id: string;
  customer_id: string | null;
  amount: number;
  status: InvoiceStatus;
  generated_at: string;
}

export interface Quote {
  id: string;
  customer_id: string | null;
  service_type: ServiceType;
  pickup_address: string;
  delivery_address: string;
  weight_kg: number;
  distance_km: number | null;
  estimated_charge: number | null;
  status: QuoteStatus;
  created_at: string;
}
