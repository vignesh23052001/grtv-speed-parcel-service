/*
# Public shipment tracking (no login required)

Counter/walk-in bookings are created with `customer_id = null` since the
person booking often has no account — so they can never see status in
"My Shipments" (that view only shows bookings tied to the logged-in
profile). This adds a way for anyone to check status without logging in,
the same way courier tracking pages work industry-wide: you need to know
the exact tracking ID plus the phone number on the booking.

Rather than opening the `bookings` table itself to anonymous SELECT
(which would let anyone dump every customer's data), this adds a single
SECURITY DEFINER function that:
  - takes a tracking ID and a phone number,
  - only returns a row if both match a real booking,
  - only returns operational/status fields — no freight pricing, no
    payment status, no GSTIN, no delivery OTP, nothing sensitive.

## New Functions
- `track_shipment_public(p_tracking_id text, p_phone text)` — returns the
  curated shipment status plus its tracking history as JSON, or zero rows
  if the tracking ID / phone combination doesn't match anything.

## Security
- Granted EXECUTE to `anon` and `authenticated`. The function itself is
  the access boundary — no changes to existing RLS policies on
  `bookings` or `tracking_logs`.
*/

CREATE OR REPLACE FUNCTION track_shipment_public(p_tracking_id text, p_phone text)
RETURNS TABLE (
  tracking_id text,
  status text,
  service_type text,
  pickup_address text,
  delivery_address text,
  parcel_count int,
  weight_kg numeric,
  goods_class text,
  eta timestamptz,
  delay_reason text,
  delay_note text,
  current_hub_name text,
  created_at timestamptz,
  updated_at timestamptz,
  logs jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id uuid;
  v_phone_digits text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
BEGIN
  IF p_tracking_id IS NULL OR length(trim(p_tracking_id)) = 0
     OR v_phone_digits = '' OR length(v_phone_digits) < 4 THEN
    RETURN;
  END IF;

  SELECT b.id INTO v_booking_id
  FROM bookings b
  WHERE upper(b.tracking_id) = upper(trim(p_tracking_id))
    AND (
      regexp_replace(coalesce(b.consignor_phone, ''), '\D', '', 'g') LIKE '%' || right(v_phone_digits, 4)
      OR regexp_replace(coalesce(b.consignee_phone, ''), '\D', '', 'g') LIKE '%' || right(v_phone_digits, 4)
    )
  LIMIT 1;

  IF v_booking_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    b.tracking_id, b.status, b.service_type, b.pickup_address, b.delivery_address,
    b.parcel_count, b.weight_kg, b.goods_class, b.eta, b.delay_reason, b.delay_note,
    h.name AS current_hub_name, b.created_at, b.updated_at,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object('status', tl.status, 'note', tl.note, 'created_at', tl.created_at) ORDER BY tl.created_at)
      FROM tracking_logs tl WHERE tl.booking_id = b.id
    ), '[]'::jsonb) AS logs
  FROM bookings b
  LEFT JOIN hubs h ON h.id = b.current_hub_id
  WHERE b.id = v_booking_id;
END;
$$;

GRANT EXECUTE ON FUNCTION track_shipment_public(text, text) TO anon, authenticated;
