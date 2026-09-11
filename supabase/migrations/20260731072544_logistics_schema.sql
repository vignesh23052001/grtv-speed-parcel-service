/*
# Transport & Logistics — Core Schema

## Overview
Creates the full data model for a parcel & freight transport business handling
both LTL (single parcel / less-than-truckload) and FTL (full truckload) shipments.
Designed as a single-tenant demo with shared operational data, so policies allow
anon + authenticated CRUD (the app uses a role switcher to act as customer /
driver / hub / admin rather than real auth).

## New Tables
- `profiles` — people in the system (customers, drivers, hub staff, admins). `role` distinguishes them.
- `vehicles` — trucks in the fleet, with registration, type, capacity, live lat/lng.
- `drivers` — driver records linked to a profile, with license + duty status.
- `hubs` — warehouses / branches with coordinates for the fleet map.
- `bookings` — the core shipment record (LTL or FTL), with pickup/delivery geo,
  package details, computed freight charge, e-way bill, assigned driver/vehicle,
  status, delivery OTP, current hub, ETA, and delay info.
- `tracking_logs` — timeline entries per booking (status + hub + note + geo + timestamp).
- `hub_scans` — parcel scan events at hubs (arrived / dispatched) for transit tracking.
- `shift_logs` — driver duty sessions: start/end time, vehicle, start/end odometer KM.
- `expense_logs` — trip expenses (fuel / toll / maintenance) with receipt URL, tied to a shift.
- `invoices` — freight invoices generated from bookings.
- `quotes` — B2B quotation requests with estimated charge and approval state.

## Security
- RLS enabled on every table.
- All policies are `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)`
  because this is an intentionally shared operational dataset for a single-tenant demo.
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE,
  phone text,
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','driver','hub','admin')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_number text UNIQUE NOT NULL,
  type text NOT NULL CHECK (type IN ('bike','pickup','truck_14ft','truck_20ft','truck_32ft','container')),
  capacity_kg numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'idle' CHECK (status IN ('idle','on_duty','maintenance')),
  lat double precision,
  lng double precision,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  license_number text,
  on_duty boolean NOT NULL DEFAULT false,
  current_vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  city text NOT NULL,
  address text,
  lat double precision,
  lng double precision,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id text UNIQUE NOT NULL DEFAULT ('TRK' || lpad((floor(random()*9000000+1000000))::text,7,'0')),
  customer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  service_type text NOT NULL CHECK (service_type IN ('ltl','ftl')),
  status text NOT NULL DEFAULT 'placed' CHECK (status IN ('placed','picked_up','in_transit','out_for_delivery','delivered','cancelled')),
  pickup_address text NOT NULL,
  delivery_address text NOT NULL,
  pickup_lat double precision,
  pickup_lng double precision,
  delivery_lat double precision,
  delivery_lng double precision,
  distance_km numeric,
  weight_kg numeric NOT NULL DEFAULT 0,
  length_cm numeric DEFAULT 0,
  width_cm numeric DEFAULT 0,
  height_cm numeric DEFAULT 0,
  goods_class text,
  declared_value numeric DEFAULT 0,
  freight_charge numeric,
  eway_bill_number text,
  doorstep_pickup boolean DEFAULT false,
  driver_id uuid REFERENCES drivers(id) ON DELETE SET NULL,
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  current_hub_id uuid REFERENCES hubs(id) ON DELETE SET NULL,
  delivery_otp text,
  eta timestamptz,
  delay_reason text,
  delay_note text,
  pod_signature text,
  pod_photo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tracking_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  status text NOT NULL,
  hub_id uuid REFERENCES hubs(id) ON DELETE SET NULL,
  note text,
  lat double precision,
  lng double precision,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hub_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  hub_id uuid NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('arrived','dispatched')),
  scanned_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shift_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  start_time timestamptz DEFAULT now(),
  end_time timestamptz,
  start_km numeric,
  end_km numeric,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','ended')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expense_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_log_id uuid REFERENCES shift_logs(id) ON DELETE SET NULL,
  driver_id uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('fuel','toll','maintenance')),
  amount numeric NOT NULL DEFAULT 0,
  receipt_url text,
  note text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid','paid','overdue')),
  generated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  service_type text NOT NULL CHECK (service_type IN ('ltl','ftl')),
  pickup_address text NOT NULL,
  delivery_address text NOT NULL,
  weight_kg numeric NOT NULL DEFAULT 0,
  distance_km numeric,
  estimated_charge numeric,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at timestamptz DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_driver ON bookings(driver_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_tracking_logs_booking ON tracking_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_hub_scans_booking ON hub_scans(booking_id);
CREATE INDEX IF NOT EXISTS idx_shift_logs_driver ON shift_logs(driver_id);
CREATE INDEX IF NOT EXISTS idx_expense_logs_driver ON expense_logs(driver_id);

-- ============ RLS ============
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE hubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- Helper to apply full CRUD to a table for anon+authenticated
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','vehicles','drivers','hubs','bookings','tracking_logs','hub_scans','shift_logs','expense_logs','invoices','quotes'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "anon_crud_%s" ON %I;', t, t);
    EXECUTE format('CREATE POLICY "anon_crud_%s" ON %I FOR SELECT TO anon, authenticated USING (true);', t, t);
    EXECUTE format('CREATE POLICY "anon_insert_%s" ON %I FOR INSERT TO anon, authenticated WITH CHECK (true);', t, t);
    EXECUTE format('CREATE POLICY "anon_update_%s" ON %I FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);', t, t);
    EXECUTE format('CREATE POLICY "anon_delete_%s" ON %I FOR DELETE TO anon, authenticated USING (true);', t, t);
  END LOOP;
END $$;

-- updated_at trigger for bookings
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bookings_updated_at ON bookings;
CREATE TRIGGER trg_bookings_updated_at BEFORE UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
