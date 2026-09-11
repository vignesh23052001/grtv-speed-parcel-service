import { supabase } from './supabase';
import type { BookingStatus } from './types';

/**
 * Fire-and-forget: tells the send-status-notification edge function to
 * text/WhatsApp the consignor & consignee about a booking's new status.
 * Never throws — a notification failure should never block a status update
 * in the UI.
 */
export async function notifyStatusChange(bookingId: string, status: BookingStatus) {
  try {
    await supabase.functions.invoke('send-status-notification', {
      body: { booking_id: bookingId, status },
    });
  } catch {
    // Swallow errors — notifications are best-effort.
  }
}
