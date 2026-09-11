/*
# Add extended consignor/consignee fields to bookings

Adds per-party GSTIN, email, pincode, city, state, and consignee contact
person so the new VRL-style booking form can store all collected fields.

1. Modified Tables
- `bookings`:
  - consignor_gstin (text) — sender GST number (optional)
  - consignor_email (text) — sender email
  - consignor_pincode (text) — sender pincode
  - consignor_city (text) — sender city
  - consignor_state (text) — sender state
  - consignee_gstin (text) — receiver GST number (optional)
  - consignee_contact_person (text) — receiver contact person name
  - consignee_pincode (text) — receiver pincode
  - consignee_city (text) — receiver city
  - consignee_state (text) — receiver state
*/

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS consignor_gstin text,
  ADD COLUMN IF NOT EXISTS consignor_email text,
  ADD COLUMN IF NOT EXISTS consignor_pincode text,
  ADD COLUMN IF NOT EXISTS consignor_city text,
  ADD COLUMN IF NOT EXISTS consignor_state text,
  ADD COLUMN IF NOT EXISTS consignee_gstin text,
  ADD COLUMN IF NOT EXISTS consignee_contact_person text,
  ADD COLUMN IF NOT EXISTS consignee_pincode text,
  ADD COLUMN IF NOT EXISTS consignee_city text,
  ADD COLUMN IF NOT EXISTS consignee_state text;
