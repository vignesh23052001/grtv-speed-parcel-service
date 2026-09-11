/*
# Add Trip Earnings Tracking to Shift Logs

## Purpose
Track how much each driver trip earned, how much has been paid to the driver, and the remaining balance.
This information is visible only to drivers and admins (controlled by existing RLS policies on shift_logs).

## Changes
1. Modified table: `shift_logs`
   - `trip_earnings` (numeric, default 0): Total amount earned for this trip (sum of freight charges from bookings assigned to this shift's driver)
   - `amount_paid` (numeric, default 0): Amount already paid to the driver for this trip
   - `balance` is computed as `trip_earnings - amount_paid` (not stored, calculated in app)

2. Security
   - No new tables created
   - Existing RLS policies on `shift_logs` already restrict access to authenticated staff (drivers and admins)
   - No policy changes needed

## Notes
- `trip_earnings` is set when a trip ends (or updated by admin)
- `amount_paid` is updated when admin records a payment to the driver
- Balance = trip_earnings - amount_paid (calculated in frontend, not stored)
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shift_logs' AND column_name = 'trip_earnings'
  ) THEN
    ALTER TABLE shift_logs ADD COLUMN trip_earnings numeric NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shift_logs' AND column_name = 'amount_paid'
  ) THEN
    ALTER TABLE shift_logs ADD COLUMN amount_paid numeric NOT NULL DEFAULT 0;
  END IF;
END $$;
