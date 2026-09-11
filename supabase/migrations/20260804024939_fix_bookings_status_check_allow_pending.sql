/*
# Allow 'pending' status in bookings check constraint

The application creates bookings with status='pending' (awaiting owner
approval) before they transition to 'placed' (approved). The original
check constraint only allowed post-approval statuses, causing inserts
to fail. Add 'pending' to the allowed list.
*/

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'placed'::text, 'picked_up'::text, 'in_transit'::text, 'out_for_delivery'::text, 'delivered'::text, 'cancelled'::text]));
