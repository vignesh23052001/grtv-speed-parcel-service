/*
# Manual payment tracking for bookings

Freight charges for counter/offline bookings are entered manually by staff
rather than auto-calculated, and payment is often collected in stages
(partial at booking, balance on delivery). This adds the fields needed to
record that.

## Modified Tables
- `bookings`:
  - `payment_status` (text) — 'unpaid', 'partial', or 'paid'. Defaults to
    'unpaid' so existing rows are unaffected.
  - `amount_paid` (numeric) — amount collected so far, in rupees. Defaults
    to 0. Balance due is `freight_charge - amount_paid`, computed in the
    application rather than stored.
*/

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  ADD COLUMN IF NOT EXISTS amount_paid numeric NOT NULL DEFAULT 0;
