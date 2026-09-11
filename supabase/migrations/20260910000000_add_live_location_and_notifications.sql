/*
# Live driver location + status-change notification log

## New columns on `bookings`
- `current_lat`, `current_lng` (numeric) — last known live location of the
  driver actively handling this shipment (updated from the driver app while
  status is picked_up / in_transit / out_for_delivery).
- `location_updated_at` (timestamptz) — when that location was last pushed.

## New table: `notification_log`
Audit trail of every SMS/WhatsApp notification attempt triggered by a
booking status change. Written by the `send-status-notification` edge
function (service role), read by staff.

## Changed function: `track_shipment_public`
Now also returns pickup/delivery coordinates and the live driver location
(when available) so the public tracking page can plot the shipment on a
map, not just show a status timeline.

## Security
- `notification_log` has RLS enabled; only admin/hub/driver profiles can
  read it. All writes go through the edge function using the service role
  key, so no insert policy is needed for authenticated/anon.
- `current_lat`/`current_lng`/`location_updated_at` are plain columns on
  `bookings`, governed by the same RLS already in place on that table for
  writes (driver updates their own active booking); the public tracking
  function exposes them read-only through SECURITY DEFINER, same boundary
  as the rest of that function.
*/

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS current_lat numeric,
  ADD COLUMN IF NOT EXISTS current_lng numeric,
  ADD COLUMN IF NOT EXISTS location_updated_at timestamptz;

CREATE TABLE IF NOT EXISTS notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('sms', 'whatsapp')),
  phone text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed', 'skipped_no_provider')),
  provider_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read notification log"
  ON notification_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'hub', 'driver')
    )
  );

-- Extend the public tracking function with coordinates for map display.
DROP FUNCTION IF EXISTS track_shipment_public(text, text);

CREATE OR REPLACE FUNCTION track_shipment_public(p_tracking_id text DEFAULT NULL, p_phone text DEFAULT NULL)
RETURNS TABLE (
  tracking_id text,
  status text,
  service_type text,
  pickup_address text,
  delivery_address text,
  pickup_lat numeric,
  pickup_lng numeric,
  delivery_lat numeric,
  delivery_lng numeric,
  current_lat numeric,
  current_lng numeric,
  location_updated_at timestamptz,
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
      b.pickup_lat, b.pickup_lng, b.delivery_lat, b.delivery_lng,
      b.current_lat, b.current_lng, b.location_updated_at,
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
      b.pickup_lat, b.pickup_lng, b.delivery_lat, b.delivery_lng,
      b.current_lat, b.current_lng, b.location_updated_at,
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
