/*
# Public tracking: search by tracking ID OR phone number

Replaces `track_shipment_public` (which required both a tracking ID and a
phone number) with a more flexible version that accepts either one alone:

- Tracking ID given → returns that single shipment (no phone needed —
  a tracking ID is effectively a bearer token already, same as how most
  courier tracking pages work with just the tracking number).
- Phone number given → returns every shipment where that phone appears
  as the sender OR the receiver (full history), tagged with a
  `role_match` column ('sent', 'received', or 'both') so the UI can
  filter between them.

Only operational/status fields are returned — no freight pricing, no
payment status, no GSTIN, no delivery OTP.

## Changed Functions
- `track_shipment_public(p_tracking_id text DEFAULT NULL, p_phone text DEFAULT NULL)`
  now returns a SET of rows (one for ID search, many for phone search)
  and adds `role_match`. Old two-required-argument version is dropped.

## Security
- SECURITY DEFINER, EXECUTE granted to `anon` and `authenticated`, same
  boundary approach as before — no RLS changes on `bookings` or
  `tracking_logs`. Phone search requires a full 10-digit number match
  (not a partial/last-4 match) to avoid pulling in the wrong person's
  shipment history.
*/

DROP FUNCTION IF EXISTS track_shipment_public(text, text);

CREATE OR REPLACE FUNCTION track_shipment_public(p_tracking_id text DEFAULT NULL, p_phone text DEFAULT NULL)
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
  role_match text,
  logs jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tracking text := nullif(trim(coalesce(p_tracking_id, '')), '');
  v_phone_digits text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
BEGIN
  -- Search by tracking ID: exact match, no phone required.
  IF v_tracking IS NOT NULL THEN
    RETURN QUERY
    SELECT
      b.tracking_id, b.status, b.service_type, b.pickup_address, b.delivery_address,
      b.parcel_count, b.weight_kg, b.goods_class, b.eta, b.delay_reason, b.delay_note,
      h.name AS current_hub_name, b.created_at, b.updated_at,
      NULL::text AS role_match,
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object('status', tl.status, 'note', tl.note, 'created_at', tl.created_at) ORDER BY tl.created_at)
        FROM tracking_logs tl WHERE tl.booking_id = b.id
      ), '[]'::jsonb) AS logs
    FROM bookings b
    LEFT JOIN hubs h ON h.id = b.current_hub_id
    WHERE upper(b.tracking_id) = upper(v_tracking)
    LIMIT 1;
    RETURN;
  END IF;

  -- Search by phone number: full history, requires a full number match.
  IF length(v_phone_digits) >= 10 THEN
    RETURN QUERY
    SELECT
      b.tracking_id, b.status, b.service_type, b.pickup_address, b.delivery_address,
      b.parcel_count, b.weight_kg, b.goods_class, b.eta, b.delay_reason, b.delay_note,
      h.name AS current_hub_name, b.created_at, b.updated_at,
      CASE
        WHEN regexp_replace(coalesce(b.consignor_phone, ''), '\D', '', 'g') = v_phone_digits
         AND regexp_replace(coalesce(b.consignee_phone, ''), '\D', '', 'g') = v_phone_digits THEN 'both'
        WHEN regexp_replace(coalesce(b.consignor_phone, ''), '\D', '', 'g') = v_phone_digits THEN 'sent'
        WHEN regexp_replace(coalesce(b.consignee_phone, ''), '\D', '', 'g') = v_phone_digits THEN 'received'
      END AS role_match,
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object('status', tl.status, 'note', tl.note, 'created_at', tl.created_at) ORDER BY tl.created_at)
        FROM tracking_logs tl WHERE tl.booking_id = b.id
      ), '[]'::jsonb) AS logs
    FROM bookings b
    LEFT JOIN hubs h ON h.id = b.current_hub_id
    WHERE regexp_replace(coalesce(b.consignor_phone, ''), '\D', '', 'g') = v_phone_digits
       OR regexp_replace(coalesce(b.consignee_phone, ''), '\D', '', 'g') = v_phone_digits
    ORDER BY b.created_at DESC;
    RETURN;
  END IF;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION track_shipment_public(text, text) TO anon, authenticated;
