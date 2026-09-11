/*
# Add Total Parcels to Shift Logs

## Purpose
Allow drivers to manually enter the total number of parcels in their vehicle when starting a trip,
even when no bookings have been assigned to them by the hub/admin.

## Changes
1. Modified table: `shift_logs`
   - `total_parcels` (integer, default 0): Manually entered parcel count by the driver at trip start

2. Security
   - No policy changes needed; existing RLS on shift_logs already covers driver access
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shift_logs' AND column_name = 'total_parcels'
  ) THEN
    ALTER TABLE shift_logs ADD COLUMN total_parcels integer NOT NULL DEFAULT 0;
  END IF;
END $$;
