/*
# Track booking origin (online vs staff-entered counter bookings)

Most real-world parcel volume for a transport business arrives offline —
phone calls and walk-in customers at a branch counter — rather than through
self-service customer booking. This adds the fields needed for hub/admin
staff to log those bookings on a walk-in customer's behalf and for the
business to report the online/counter split.

## Modified Tables
- `bookings`:
  - `booking_source` (text) — 'online' (customer self-service) or
    'counter' (entered by hub/admin staff on behalf of a walk-in customer).
    Defaults to 'online' so existing rows are unaffected.
  - `created_by` (uuid) — the staff profile who entered a counter booking.
    Null for online bookings placed by the customer themselves.
*/

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS booking_source text NOT NULL DEFAULT 'online'
    CHECK (booking_source IN ('online', 'counter')),
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_source ON bookings(booking_source);
