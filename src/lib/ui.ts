import type { BookingStatus } from './types';

export const STATUS_META: Record<BookingStatus, { label: string; color: string; dot: string }> = {
  pending: { label: 'Pending Approval', color: 'bg-warning-100 text-warning-700', dot: 'bg-warning-500' },
  placed: { label: 'Approved', color: 'bg-ink-100 text-ink-700', dot: 'bg-ink-400' },
  picked_up: { label: 'Picked Up', color: 'bg-brand-100 text-brand-700', dot: 'bg-brand-500' },
  in_transit: { label: 'In Transit', color: 'bg-brand-100 text-brand-700', dot: 'bg-brand-500' },
  out_for_delivery: { label: 'Out for Delivery', color: 'bg-accent-500/15 text-accent-600', dot: 'bg-accent-500' },
  delivered: { label: 'Delivered', color: 'bg-success-100 text-success-700', dot: 'bg-success-500' },
  cancelled: { label: 'Rejected', color: 'bg-danger-100 text-danger-700', dot: 'bg-danger-500' },
};

export const TRACKING_STEPS: { key: BookingStatus; label: string }[] = [
  { key: 'pending', label: 'Pending Approval' },
  { key: 'placed', label: 'Approved' },
  { key: 'picked_up', label: 'Picked Up' },
  { key: 'in_transit', label: 'In Transit' },
  { key: 'out_for_delivery', label: 'Out for Delivery' },
  { key: 'delivered', label: 'Delivered' },
];

export const STEP_ORDER: BookingStatus[] = ['pending', 'placed', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered'];

export function stepIndex(status: BookingStatus): number {
  return STEP_ORDER.indexOf(status);
}

export function formatINR(n: number | null | undefined): string {
  if (n == null) return '—';
  return '₹' + n.toLocaleString('en-IN');
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export const VEHICLE_LABELS: Record<string, string> = {
  bike: 'Two-Wheeler',
  pickup: 'Pickup Truck',
  truck_14ft: '14ft Truck',
  truck_20ft: '20ft Truck',
  truck_32ft: '32ft Truck',
  container: 'Container',
};

export const DELAY_REASONS = ['Vehicle Breakdown', 'Traffic Congestion', 'Severe Weather', 'Route Diversion', 'Other'];

export function genOTP(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function genTrackingId(): string {
  return 'TRK' + String(Math.floor(1000000 + Math.random() * 9000000));
}
