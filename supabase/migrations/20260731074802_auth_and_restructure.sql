/*
# Auth, Multi-Parcel Bookings, Vehicle & Driver Management

## Overview
Adds real auth linkage and restructures bookings to match a VRL-style pickup
request (consignor/consignee details + multiple parcels, godown delivery only).
Also adds admin-managed vehicle records and driver-account provisioning.

## Changes
1. `profiles` — add `user_id` linking to auth.users so each login maps to a role.
2. `bookings` — add consignor/consignee name+phone, parcel_count, parcel_details
   (jsonb array of parcels), delivery_type (default 'godown'). Doorstep pickup
   is removed from use (kept column for compatibility, forced false).
3. `vehicles` — now fully admin-managed (added/edited from admin panel).
4. RLS rewritten: now auth-scoped. Customers see only their own bookings; staff
   (admin/driver/hub) see all operational data for their duties; admin sees all.

## Security
- `is_staff()` helper returns true if the current user's profile role is
  admin, driver, or hub.
- `is_admin()` helper returns true for admin role.
- Bookings SELECT: own customer OR any staff.
- Bookings INSERT: customer inserts own (customer_id = their profile id), or staff.
- Bookings UPDATE: staff only (drivers update status; admin manages).
- Vehicles/drivers/hubs/shifts/expenses/invoices/quotes: staff read all, admin write.
- Profiles: user reads own; admin reads all & writes all (to provision drivers).
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS consignor_name text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS consignor_phone text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS consignee_name text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS consignee_phone text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS parcel_count integer NOT NULL DEFAULT 1;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS parcel_details jsonb DEFAULT '[]'::jsonb;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivery_type text NOT NULL DEFAULT 'godown' CHECK (delivery_type IN ('godown','door'));

-- Doorstep delivery no longer offered; force existing data consistent
UPDATE bookings SET doorstep_pickup = false WHERE doorstep_pickup = true;

-- Helper functions for role-based RLS
CREATE OR REPLACE FUNCTION is_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('admin','driver','hub')
  );
$$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  );
$$;

-- ============ Rewrite RLS policies ============

-- profiles: user reads own; admin reads all & writes all
DROP POLICY IF EXISTS "anon_crud_profiles" ON profiles;
DROP POLICY IF EXISTS "anon_insert_profiles" ON profiles;
DROP POLICY IF EXISTS "anon_update_profiles" ON profiles;
DROP POLICY IF EXISTS "anon_delete_profiles" ON profiles;

CREATE POLICY "profiles_select_own_or_admin" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "profiles_insert_admin" ON profiles FOR INSERT
  TO authenticated WITH CHECK (is_admin());
CREATE POLICY "profiles_update_admin" ON profiles FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "profiles_delete_admin" ON profiles FOR DELETE
  TO authenticated USING (is_admin());

-- bookings: customer sees own; staff see all; staff update; customer insert own
DROP POLICY IF EXISTS "anon_crud_bookings" ON bookings;
DROP POLICY IF EXISTS "anon_insert_bookings" ON bookings;
DROP POLICY IF EXISTS "anon_update_bookings" ON bookings;
DROP POLICY IF EXISTS "anon_delete_bookings" ON bookings;

CREATE POLICY "bookings_select_own_or_staff" ON bookings FOR SELECT
  TO authenticated USING (
    customer_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR is_staff()
  );
CREATE POLICY "bookings_insert_own_or_staff" ON bookings FOR INSERT
  TO authenticated WITH CHECK (
    customer_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR is_staff()
  );
CREATE POLICY "bookings_update_staff" ON bookings FOR UPDATE
  TO authenticated USING (is_staff()) WITH CHECK (is_staff());
CREATE POLICY "bookings_delete_admin" ON bookings FOR DELETE
  TO authenticated USING (is_admin());

-- tracking_logs: staff read/write; customer reads own bookings' logs
DROP POLICY IF EXISTS "anon_crud_tracking_logs" ON tracking_logs;
DROP POLICY IF EXISTS "anon_insert_tracking_logs" ON tracking_logs;
DROP POLICY IF EXISTS "anon_update_tracking_logs" ON tracking_logs;
DROP POLICY IF EXISTS "anon_delete_tracking_logs" ON tracking_logs;

CREATE POLICY "tracking_logs_select_own_or_staff" ON tracking_logs FOR SELECT
  TO authenticated USING (
    booking_id IN (SELECT id FROM bookings WHERE customer_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
    OR is_staff()
  );
CREATE POLICY "tracking_logs_insert_staff" ON tracking_logs FOR INSERT
  TO authenticated WITH CHECK (is_staff());
CREATE POLICY "tracking_logs_delete_admin" ON tracking_logs FOR DELETE
  TO authenticated USING (is_admin());

-- hub_scans: staff only
DROP POLICY IF EXISTS "anon_crud_hub_scans" ON hub_scans;
DROP POLICY IF EXISTS "anon_insert_hub_scans" ON hub_scans;
DROP POLICY IF EXISTS "anon_update_hub_scans" ON hub_scans;
DROP POLICY IF EXISTS "anon_delete_hub_scans" ON hub_scans;

CREATE POLICY "hub_scans_staff_select" ON hub_scans FOR SELECT
  TO authenticated USING (is_staff());
CREATE POLICY "hub_scans_staff_insert" ON hub_scans FOR INSERT
  TO authenticated WITH CHECK (is_staff());
CREATE POLICY "hub_scans_admin_delete" ON hub_scans FOR DELETE
  TO authenticated USING (is_admin());

-- vehicles: staff read; admin write
DROP POLICY IF EXISTS "anon_crud_vehicles" ON vehicles;
DROP POLICY IF EXISTS "anon_insert_vehicles" ON vehicles;
DROP POLICY IF EXISTS "anon_update_vehicles" ON vehicles;
DROP POLICY IF EXISTS "anon_delete_vehicles" ON vehicles;

CREATE POLICY "vehicles_staff_select" ON vehicles FOR SELECT
  TO authenticated USING (is_staff());
CREATE POLICY "vehicles_admin_insert" ON vehicles FOR INSERT
  TO authenticated WITH CHECK (is_admin());
CREATE POLICY "vehicles_admin_update" ON vehicles FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "vehicles_admin_delete" ON vehicles FOR DELETE
  TO authenticated USING (is_admin());

-- drivers: staff read; admin write
DROP POLICY IF EXISTS "anon_crud_drivers" ON drivers;
DROP POLICY IF EXISTS "anon_insert_drivers" ON drivers;
DROP POLICY IF EXISTS "anon_update_drivers" ON drivers;
DROP POLICY IF EXISTS "anon_delete_drivers" ON drivers;

CREATE POLICY "drivers_staff_select" ON drivers FOR SELECT
  TO authenticated USING (is_staff());
CREATE POLICY "drivers_admin_insert" ON drivers FOR INSERT
  TO authenticated WITH CHECK (is_admin());
CREATE POLICY "drivers_admin_update" ON drivers FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "drivers_admin_delete" ON drivers FOR DELETE
  TO authenticated USING (is_admin());

-- hubs: staff read; admin write
DROP POLICY IF EXISTS "anon_crud_hubs" ON hubs;
DROP POLICY IF EXISTS "anon_insert_hubs" ON hubs;
DROP POLICY IF EXISTS "anon_update_hubs" ON hubs;
DROP POLICY IF EXISTS "anon_delete_hubs" ON hubs;

CREATE POLICY "hubs_staff_select" ON hubs FOR SELECT
  TO authenticated USING (is_staff());
CREATE POLICY "hubs_admin_insert" ON hubs FOR INSERT
  TO authenticated WITH CHECK (is_admin());
CREATE POLICY "hubs_admin_update" ON hubs FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "hubs_admin_delete" ON hubs FOR DELETE
  TO authenticated USING (is_admin());

-- shift_logs: staff read; driver/admin write own
DROP POLICY IF EXISTS "anon_crud_shift_logs" ON shift_logs;
DROP POLICY IF EXISTS "anon_insert_shift_logs" ON shift_logs;
DROP POLICY IF EXISTS "anon_update_shift_logs" ON shift_logs;
DROP POLICY IF EXISTS "anon_delete_shift_logs" ON shift_logs;

CREATE POLICY "shift_logs_staff_select" ON shift_logs FOR SELECT
  TO authenticated USING (is_staff());
CREATE POLICY "shift_logs_staff_insert" ON shift_logs FOR INSERT
  TO authenticated WITH CHECK (is_staff());
CREATE POLICY "shift_logs_staff_update" ON shift_logs FOR UPDATE
  TO authenticated USING (is_staff()) WITH CHECK (is_staff());
CREATE POLICY "shift_logs_admin_delete" ON shift_logs FOR DELETE
  TO authenticated USING (is_admin());

-- expense_logs: staff read; driver/admin write
DROP POLICY IF EXISTS "anon_crud_expense_logs" ON expense_logs;
DROP POLICY IF EXISTS "anon_insert_expense_logs" ON expense_logs;
DROP POLICY IF EXISTS "anon_update_expense_logs" ON expense_logs;
DROP POLICY IF EXISTS "anon_delete_expense_logs" ON expense_logs;

CREATE POLICY "expense_logs_staff_select" ON expense_logs FOR SELECT
  TO authenticated USING (is_staff());
CREATE POLICY "expense_logs_staff_insert" ON expense_logs FOR INSERT
  TO authenticated WITH CHECK (is_staff());
CREATE POLICY "expense_logs_staff_update" ON expense_logs FOR UPDATE
  TO authenticated USING (is_staff()) WITH CHECK (is_staff());
CREATE POLICY "expense_logs_admin_delete" ON expense_logs FOR DELETE
  TO authenticated USING (is_admin());

-- invoices: admin read/write; customer reads own
DROP POLICY IF EXISTS "anon_crud_invoices" ON invoices;
DROP POLICY IF EXISTS "anon_insert_invoices" ON invoices;
DROP POLICY IF EXISTS "anon_update_invoices" ON invoices;
DROP POLICY IF EXISTS "anon_delete_invoices" ON invoices;

CREATE POLICY "invoices_select_own_or_admin" ON invoices FOR SELECT
  TO authenticated USING (
    customer_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR is_admin()
  );
CREATE POLICY "invoices_admin_insert" ON invoices FOR INSERT
  TO authenticated WITH CHECK (is_admin());
CREATE POLICY "invoices_admin_update" ON invoices FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "invoices_admin_delete" ON invoices FOR DELETE
  TO authenticated USING (is_admin());

-- quotes: admin read/write; customer reads own, inserts own
DROP POLICY IF EXISTS "anon_crud_quotes" ON quotes;
DROP POLICY IF EXISTS "anon_insert_quotes" ON quotes;
DROP POLICY IF EXISTS "anon_update_quotes" ON quotes;
DROP POLICY IF EXISTS "anon_delete_quotes" ON quotes;

CREATE POLICY "quotes_select_own_or_admin" ON quotes FOR SELECT
  TO authenticated USING (
    customer_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR is_admin()
  );
CREATE POLICY "quotes_insert_own_or_admin" ON quotes FOR INSERT
  TO authenticated WITH CHECK (
    customer_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR is_admin()
  );
CREATE POLICY "quotes_admin_update" ON quotes FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "quotes_admin_delete" ON quotes FOR DELETE
  TO authenticated USING (is_admin());
