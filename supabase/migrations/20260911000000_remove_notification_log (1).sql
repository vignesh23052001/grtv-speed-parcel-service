-- Removes the notification_log table (and its policy) that was created
-- for the SMS/WhatsApp notification feature, which is no longer in use.
-- Safe to run even if it's already gone.

DROP POLICY IF EXISTS "Staff can read notification log" ON notification_log;
DROP TABLE IF EXISTS notification_log;
