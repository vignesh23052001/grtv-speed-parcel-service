/*
# Add owner approval fields to bookings

1. Modified Tables
- `bookings`: Added columns for owner approval workflow:
  - `approval_type` (text): 'pickup' = team will pick up, 'branch' = customer drops at branch, 'rejected' = rejected
  - `approval_message` (text): The message the owner sends to the customer
  - `pickup_datetime` (timestamptz): When the team will pick up the parcel (for pickup type)
  - `pickup_phone` (text): Phone number for customer to call for help (for pickup type)
  - `branch_id` (uuid): Which branch the customer should take the parcel to (for branch type)
  - `branch_phone` (text): Phone number of the branch (for branch type)
  - `rejected_message` (text): Rejection message with good text (for rejected type)

2. Security
- No new tables, no RLS policy changes needed. Existing booking policies already cover these columns.
*/

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS approval_type text,
  ADD COLUMN IF NOT EXISTS approval_message text,
  ADD COLUMN IF NOT EXISTS pickup_datetime timestamptz,
  ADD COLUMN IF NOT EXISTS pickup_phone text,
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES hubs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS branch_phone text,
  ADD COLUMN IF NOT EXISTS rejected_message text;
