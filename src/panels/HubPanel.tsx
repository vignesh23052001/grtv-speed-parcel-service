import { useEffect, useState, useCallback } from 'react';
import {
  Warehouse, ScanLine, ArrowRightLeft, FileText, Package, MapPin, CheckCircle2, Download, X,
  Truck, Clock, Navigation, User as UserIcon, History, PlusCircle, ClipboardList,
} from 'lucide-react';
import type { Booking, Driver, Hub, HubScan, Profile, ScanAction, ShiftLog, Vehicle } from '../lib/types';
import { supabase } from '../lib/supabase';
import { PageHeader, EmptyState, Spinner, Toast, Select } from '../components/ui';
import { DriverHistoryModal } from '../components/DriverHistoryModal';
import CounterBookingForm from '../components/CounterBookingForm';
import CustomersDirectory from '../components/CustomersDirectory';
import { STATUS_META, formatINR, formatDateTime, formatDate } from '../lib/ui';

interface PanelProps { profile: Profile }

export default function HubPanel({ profile }: PanelProps) {
  const [tab, setTab] = useState<'scan' | 'transit' | 'lr' | 'journeys' | 'counter' | 'orders' | 'customers'>('scan');
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ show: boolean; kind: 'success' | 'error' | 'info'; msg: string }>({ show: false, kind: 'success', msg: '' });

  const showToast = useCallback((kind: 'success' | 'error' | 'info', msg: string) => {
    setToast({ show: true, kind, msg });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 2800);
  }, []);

  const load = useCallback(async () => {
    const [h, b, p] = await Promise.all([
      supabase.from('hubs').select('*'),
      supabase.from('bookings').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*'),
    ]);
    setHubs((h.data as Hub[]) ?? []);
    setBookings((b.data as Booking[]) ?? []);
    setProfiles((p.data as Profile[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="animate-fade-in">
        <PageHeader title="Hub Operations" subtitle="Scan parcels, track warehouse transit, and generate Lorry Receipts." />
      </div>

      <div className="grid grid-cols-3 sm:inline-grid sm:grid-flow-col gap-1 sm:gap-1.5 bg-white border border-ink-100 rounded-xl p-1 sm:w-fit mb-6 shadow-card sticky top-[84px] z-20 overflow-x-auto scrollbar-none animate-slide-up">
        {([
          { k: 'scan', label: 'Scan Parcels', shortLabel: 'Scan', icon: ScanLine },
          { k: 'counter', label: 'Counter Booking', shortLabel: 'Counter', icon: PlusCircle },
          { k: 'transit', label: 'Transit Tracking', shortLabel: 'Transit', icon: ArrowRightLeft },
          { k: 'journeys', label: 'Driver Journeys', shortLabel: 'Journeys', icon: Truck },
          { k: 'lr', label: 'LR Generator', shortLabel: 'LR', icon: FileText },
          { k: 'orders', label: 'Orders', shortLabel: 'Orders', icon: ClipboardList },
          { k: 'customers', label: 'Customers', shortLabel: 'Customers', icon: UserIcon },
        ] as const).map((t) => {
          const Icon = t.icon;
          const active = tab === t.k;
          return (
            <button key={t.k} onClick={() => setTab(t.k)}
              className={`relative flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg text-[11px] sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap ${active ? 'bg-brand-600 text-white shadow-sm scale-[1.02]' : 'text-ink-500 hover:bg-ink-50'}`}>
              <Icon className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{t.label}</span>
              <span className="sm:hidden">{t.shortLabel}</span>
            </button>
          );
        })}
      </div>

      {loading ? <Spinner label="Loading hub data…" /> : (
        <div key={tab} className="animate-fade-in">
          {tab === 'scan' && <ScanView hubs={hubs} profileId={profile.id} showToast={showToast} />}
          {tab === 'counter' && <CounterBookingForm staffProfile={profile} hubs={hubs} onCreated={load} showToast={showToast} />}
          {tab === 'transit' && <TransitView hubs={hubs} />}
          {tab === 'journeys' && <DriverJourneysView />}
          {tab === 'lr' && <LRView hubs={hubs} showToast={showToast} />}
          {tab === 'orders' && <OrdersView bookings={bookings} profiles={profiles} />}
          {tab === 'customers' && <CustomersDirectory bookings={bookings} profiles={profiles} />}
        </div>
      )}

      <Toast show={toast.show} kind={toast.kind}>{toast.msg}</Toast>
    </main>
  );
}

/* ---------- Orders View ---------- */

function OrdersView({ bookings, profiles }: { bookings: Booking[]; profiles: Profile[] }) {
  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  const pending = bookings.filter((b) => b.status === 'pending');
  const active = bookings.filter((b) => !['pending', 'delivered', 'cancelled'].includes(b.status));

  if (bookings.length === 0) return <EmptyState icon={<ClipboardList className="w-7 h-7" />} title="No orders yet" desc="Bookings will show here once customers start placing them." />;

  return (
    <div className="card p-5">
      <p className="font-bold text-ink-800 mb-1">All Orders</p>
      <p className="text-xs text-ink-400 mb-4">{pending.length} pending · {active.length} in progress</p>
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-ink-400 uppercase border-b border-ink-100">
              <th className="py-2 font-semibold">Tracking</th>
              <th className="py-2 font-semibold">Customer</th>
              <th className="py-2 font-semibold">Route</th>
              <th className="py-2 font-semibold">Service</th>
              <th className="py-2 font-semibold">Parcels</th>
              <th className="py-2 font-semibold">Status</th>
              <th className="py-2 font-semibold">Payment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-50">
            {bookings.map((b) => {
              const meta = STATUS_META[b.status];
              const customer = b.customer_id ? profileMap.get(b.customer_id) : null;
              const payMeta = b.payment_status === 'paid'
                ? { label: 'Paid', color: 'bg-success-100 text-success-700' }
                : b.payment_status === 'partial'
                ? { label: 'Partial', color: 'bg-warning-100 text-warning-700' }
                : { label: 'Not Paid', color: 'bg-danger-100 text-danger-700' };
              return (
                <tr key={b.id} className="hover:bg-ink-50/50">
                  <td className="py-3 font-mono font-semibold text-ink-800">{b.tracking_id}</td>
                  <td className="py-3 text-ink-600">{customer?.name ?? '—'}</td>
                  <td className="py-3 text-ink-500 max-w-[180px] truncate">{b.pickup_address} → {b.delivery_address}</td>
                  <td className="py-3"><span className="chip bg-ink-100 text-ink-600">{b.service_type === 'ltl' ? 'LTL' : 'FTL'}</span></td>
                  <td className="py-3"><span className="chip bg-brand-100 text-brand-700">{b.parcel_count ?? 1} pc</span></td>
                  <td className="py-3"><span className={`chip ${meta.color}`}><span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />{meta.label}</span></td>
                  <td className="py-3"><span className={`chip ${payMeta.color}`}>{payMeta.label} · {formatINR(b.freight_charge)}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-3">
        {bookings.map((b) => {
          const meta = STATUS_META[b.status];
          const customer = b.customer_id ? profileMap.get(b.customer_id) : null;
          const payMeta = b.payment_status === 'paid'
            ? { label: 'Paid', color: 'bg-success-100 text-success-700' }
            : b.payment_status === 'partial'
            ? { label: 'Partial', color: 'bg-warning-100 text-warning-700' }
            : { label: 'Not Paid', color: 'bg-danger-100 text-danger-700' };
          return (
            <div key={b.id} className="p-4 rounded-xl border border-ink-100">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono font-bold text-sm text-ink-900">{b.tracking_id}</p>
                  <p className="text-xs text-ink-500 mt-0.5">{customer?.name ?? '—'}</p>
                </div>
                <span className={`chip ${meta.color} shrink-0`}><span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />{meta.label}</span>
              </div>
              <p className="text-xs text-ink-500 mt-2 truncate">{b.pickup_address} → {b.delivery_address}</p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-ink-100 gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="chip bg-ink-100 text-ink-600 shrink-0">{b.service_type === 'ltl' ? 'LTL' : 'FTL'}</span>
                  <span className="chip bg-brand-100 text-brand-700 shrink-0">{b.parcel_count ?? 1} pc</span>
                  <span className={`chip ${payMeta.color} truncate`}>{payMeta.label} · {formatINR(b.freight_charge)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Scan View ---------- */

function ScanView({ hubs, profileId, showToast }: {
  hubs: Hub[];
  profileId: string;
  showToast: (k: 'success' | 'error' | 'info', m: string) => void;
}) {
  const [trackingId, setTrackingId] = useState('');
  const [action, setAction] = useState<ScanAction>('arrived');
  const [hubId, setHubId] = useState<string>(hubs[0]?.id ?? '');
  const [scans, setScans] = useState<HubScan[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from('hub_scans').select('*, bookings!inner(tracking_id, pickup_address, delivery_address)').order('created_at', { ascending: false }).limit(20);
    setScans((data as HubScan[]) ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function scan() {
    if (!trackingId) { showToast('error', 'Enter a tracking ID.'); return; }
    setBusy(true);
    const { data: booking } = await supabase.from('bookings').select('id, status').eq('tracking_id', trackingId.trim()).maybeSingle();
    if (!booking) { showToast('error', 'Tracking ID not found.'); setBusy(false); return; }

    await supabase.from('hub_scans').insert({
      booking_id: booking.id, hub_id: hubId, action, scanned_by: profileId,
    });
    await supabase.from('tracking_logs').insert({
      booking_id: booking.id, status: (booking as Booking).status, hub_id: hubId,
      note: action === 'arrived' ? 'Parcel arrived at hub' : 'Parcel dispatched from hub',
    });
    await supabase.from('bookings').update({ current_hub_id: hubId }).eq('id', booking.id);
    setBusy(false);
    showToast('success', `Parcel ${action === 'arrived' ? 'arrived' : 'dispatched'} at ${hubs.find((h) => h.id === hubId)?.name}.`);
    setTrackingId('');
    load();
  }

  return (
    <div className="grid lg:grid-cols-[400px_1fr] gap-6 animate-fade-in">
      <div className="card p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center">
            <ScanLine className="w-5 h-5 text-brand-600" />
          </div>
          <p className="font-bold text-ink-800">Scan Parcel</p>
        </div>
        <div>
          <p className="label">Tracking ID / Barcode</p>
          <input className="input font-mono" placeholder="TRK4827191" value={trackingId} onChange={(e) => setTrackingId(e.target.value)} />
        </div>
        <div>
          <p className="label">Action</p>
          <div className="grid grid-cols-2 gap-2">
            {(['arrived', 'dispatched'] as ScanAction[]).map((a) => (
              <button key={a} onClick={() => setAction(a)}
                className={`p-3 rounded-xl border-2 text-sm font-semibold capitalize transition ${action === a ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-500'}`}>
                {a === 'arrived' ? 'Arrived' : 'Dispatched'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="label">Hub</p>
          <Select value={hubId} onChange={setHubId} options={hubs.map((h) => ({ value: h.id, label: `${h.name} (${h.code})` }))} />
        </div>
        <button onClick={scan} disabled={busy} className="btn-primary w-full">
          <ScanLine className="w-4 h-4" /> Scan & Log
        </button>
      </div>

      <div className="card divide-y divide-ink-50">
        <div className="p-4 border-b border-ink-100">
          <p className="font-bold text-ink-800 text-sm">Recent Scans</p>
        </div>
        {scans.length === 0 ? (
          <EmptyState icon={<Package className="w-7 h-7" />} title="No scans yet" desc="Scanned parcels will appear here." />
        ) : scans.map((s) => {
          const join = s as HubScan & { bookings?: { tracking_id: string; pickup_address: string; delivery_address: string } };
          const b = join.bookings;
          const hub = hubs.find((h) => h.id === s.hub_id);
          return (
            <div key={s.id} className="p-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.action === 'arrived' ? 'bg-success-100 text-success-600' : 'bg-brand-100 text-brand-600'}`}>
                  {s.action === 'arrived' ? <CheckCircle2 className="w-4 h-4" /> : <ArrowRightLeft className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <p className="font-mono font-semibold text-sm text-ink-800">{b?.tracking_id ?? '—'}</p>
                  <p className="text-xs text-ink-400 truncate">{s.action === 'arrived' ? 'Arrived' : 'Dispatched'} · {hub?.name}</p>
                </div>
              </div>
              <span className="text-xs text-ink-400 shrink-0">{formatDateTime(s.created_at)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Transit View ---------- */

function TransitView({ hubs }: { hubs: Hub[] }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('bookings').select('*').in('status', ['picked_up', 'in_transit', 'out_for_delivery']).order('created_at', { ascending: false });
      setBookings((data as Booking[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const hubMap = new Map(hubs.map((h) => [h.id, h]));

  if (loading) return <Spinner label="Loading transit data…" />;
  if (bookings.length === 0) return <EmptyState icon={<ArrowRightLeft className="w-7 h-7" />} title="No parcels in transit" desc="Parcels currently moving between hubs will show here." />;

  return (
    <div className="space-y-3 animate-fade-in">
      {bookings.map((b) => {
        const meta = STATUS_META[b.status];
        const hub = b.current_hub_id ? hubMap.get(b.current_hub_id) : null;
        return (
          <div key={b.id} className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${meta.color}`}>
                <Package className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="font-mono font-bold text-sm text-ink-900">{b.tracking_id}</p>
                <p className="text-xs text-ink-500 truncate">{b.pickup_address} → {b.delivery_address}</p>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
              {hub && (
                <div className="text-left sm:text-right">
                  <p className="text-xs text-ink-400">Current Hub</p>
                  <p className="text-sm font-semibold text-ink-800 flex items-center gap-1 sm:justify-end">
                    <MapPin className="w-3.5 h-3.5 text-brand-600 shrink-0" /> {hub.name}
                  </p>
                </div>
              )}
              <span className={`chip ${meta.color} shrink-0`}><span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />{meta.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- LR Generator ---------- */

function LRView({ hubs, showToast }: { hubs: Hub[]; showToast: (k: 'success' | 'error' | 'info', m: string) => void }) {
  const [trackingId, setTrackingId] = useState('');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);

  async function lookup() {
    if (!trackingId) return;
    setLoading(true);
    const { data } = await supabase.from('bookings').select('*').eq('tracking_id', trackingId.trim()).maybeSingle();
    setBooking((data as Booking) ?? null);
    setLoading(false);
    if (!data) showToast('error', 'Tracking ID not found.');
  }

  function printLR() {
    if (!booking) return;
    const win = window.open('', '_blank', 'width=800,height=600');
    if (!win) { showToast('error', 'Popup blocked. Allow popups to print.'); return; }
    const lrNo = 'LR' + booking.tracking_id.slice(3);
    win.document.write(`
      <html><head><title>Lorry Receipt ${lrNo}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #1e2536; }
        .header { display:flex; justify-content:space-between; border-bottom: 3px solid #1556e1; padding-bottom: 16px; margin-bottom: 24px; }
        .logo { font-size: 24px; font-weight: 800; color: #1556e1; }
        .lr-no { font-size: 14px; text-align: right; }
        .lr-no b { font-size: 20px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 32px; margin-bottom: 24px; }
        .field { font-size: 13px; }
        .field .lbl { color: #7a8dab; font-size: 11px; text-transform: uppercase; font-weight: 600; }
        .field .val { font-weight: 600; margin-top: 2px; }
        .section { margin-top: 20px; border: 1px solid #cfd8e6; border-radius: 8px; padding: 16px; }
        .section h3 { font-size: 13px; color: #1556e1; margin: 0 0 12px; text-transform: uppercase; }
        .total { margin-top: 24px; text-align: right; font-size: 22px; font-weight: 800; color: #1556e1; }
        .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; color: #7a8dab; }
        .stamp { border: 2px dashed #10b981; padding: 8px 16px; display: inline-block; color: #10b981; font-weight: 700; transform: rotate(-5deg); }
      </style></head><body>
      <div class="header">
        <div class="logo">GRTV Speed Parcel Service</div>
        <div class="lr-no">Lorry Receipt (Bilty)<br><b>${lrNo}</b><br>${formatDate(booking.created_at)}</div>
      </div>
      <div class="grid">
        <div class="field"><div class="lbl">Consignor (From)</div><div class="val">${booking.pickup_address}</div></div>
        <div class="field"><div class="lbl">Consignee (To)</div><div class="val">${booking.delivery_address}</div></div>
        <div class="field"><div class="lbl">Service Type</div><div class="val">${booking.service_type === 'ltl' ? 'LTL / Single Parcel' : 'FTL / Full Truckload'}</div></div>
        <div class="field"><div class="lbl">Distance</div><div class="val">${booking.distance_km ?? '—'} km</div></div>
        <div class="field"><div class="lbl">Weight</div><div class="val">${booking.weight_kg} kg</div></div>
        <div class="field"><div class="lbl">Dimensions (L×W×H)</div><div class="val">${booking.length_cm} × ${booking.width_cm} × ${booking.height_cm} cm</div></div>
        <div class="field"><div class="lbl">Goods Class</div><div class="val">${booking.goods_class ?? 'General'}</div></div>
        <div class="field"><div class="lbl">Declared Value</div><div class="val">${formatINR(booking.declared_value)}</div></div>
        <div class="field"><div class="lbl">E-Way Bill</div><div class="val">${booking.eway_bill_number ?? 'N/A'}</div></div>
        <div class="field"><div class="lbl">Doorstep Pickup</div><div class="val">${booking.doorstep_pickup ? 'Yes' : 'No'}</div></div>
      </div>
      <div class="section">
        <h3>Freight Charges</h3>
        <div class="field"><div class="lbl">Total Freight</div><div class="val">${formatINR(booking.freight_charge)}</div></div>
      </div>
      <div class="total">Total: ${formatINR(booking.freight_charge)}</div>
      <div class="footer">
        <div>This is a system-generated Lorry Receipt for legal & tax records.</div>
        <div class="stamp">PICKED UP</div>
      </div>
      </body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
    showToast('success', 'LR generated for printing.');
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="card p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-brand-600" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-ink-800">Consignment Note (LR / Bilty)</p>
            <p className="text-xs text-ink-400">Generate a printable Lorry Receipt upon pickup.</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input className="input font-mono" placeholder="Enter Tracking ID (e.g. TRK4827191)" value={trackingId} onChange={(e) => setTrackingId(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && lookup()} />
          <button onClick={lookup} disabled={loading} className="btn-secondary whitespace-nowrap w-full sm:w-auto">
            <ScanLine className="w-4 h-4" /> Lookup
          </button>
        </div>
      </div>

      {booking && (
        <div className="card p-4 sm:p-6 animate-slide-up">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
            <div>
              <p className="text-xs text-ink-400 uppercase font-semibold">Lorry Receipt</p>
              <p className="font-mono text-2xl font-extrabold text-brand-700">LR{booking.tracking_id.slice(3)}</p>
            </div>
            <button onClick={printLR} className="btn-primary w-full sm:w-auto">
              <Download className="w-4 h-4" /> Print / PDF
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <LRField label="Consignor" value={booking.pickup_address} />
            <LRField label="Consignee" value={booking.delivery_address} />
            <LRField label="Service" value={booking.service_type === 'ltl' ? 'LTL' : 'FTL'} />
            <LRField label="Distance" value={`${booking.distance_km ?? '—'} km`} />
            <LRField label="Weight" value={`${booking.weight_kg} kg`} />
            <LRField label="Dimensions" value={`${booking.length_cm}×${booking.width_cm}×${booking.height_cm} cm`} />
            <LRField label="Goods Class" value={booking.goods_class ?? 'General'} />
            <LRField label="Declared Value" value={formatINR(booking.declared_value)} />
            <LRField label="E-Way Bill" value={booking.eway_bill_number ?? 'N/A'} />
            <LRField label="Freight" value={formatINR(booking.freight_charge)} />
          </div>
          <div className="mt-5 p-4 rounded-xl bg-success-50 border border-success-100 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-success-600" />
            <p className="text-sm font-semibold text-success-700">Status: {STATUS_META[booking.status].label}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function LRField({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl bg-ink-50">
      <p className="text-[11px] text-ink-400 uppercase font-semibold">{label}</p>
      <p className="font-semibold text-ink-800 mt-0.5">{value}</p>
    </div>
  );
}

/* ---------- Driver Journeys View ---------- */

function DriverJourneysView() {
  const [shifts, setShifts] = useState<ShiftLog[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<{ driver: Driver; profile: Profile | null } | null>(null);

  useEffect(() => {
    (async () => {
      const [s, d, p, v, b] = await Promise.all([
        supabase.from('shift_logs').select('*').order('start_time', { ascending: false }).limit(50),
        supabase.from('drivers').select('*'),
        supabase.from('profiles').select('*'),
        supabase.from('vehicles').select('*'),
        supabase.from('bookings').select('*').in('status', ['placed','picked_up','in_transit','out_for_delivery']),
      ]);
      setShifts((s.data as ShiftLog[]) ?? []);
      setDrivers((d.data as Driver[]) ?? []);
      setProfiles((p.data as Profile[]) ?? []);
      setVehicles((v.data as Vehicle[]) ?? []);
      setBookings((b.data as Booking[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));

  if (loading) return <Spinner label="Loading driver journeys…" />;
  if (shifts.length === 0) return <EmptyState icon={<Truck className="w-7 h-7" />} title="No driver journeys yet" desc="Driver trip data will appear here once drivers start their duty." />;

  return (
    <div className="space-y-3 animate-fade-in">
      <p className="text-xs text-ink-400 flex items-center gap-1.5 mb-2">
        <Navigation className="w-3.5 h-3.5" /> Driver journey data — when they started, vehicle used, and trip times. Click a driver name to see full history.
      </p>
      {shifts.map((s) => {
        const driver = drivers.find((d) => d.id === s.driver_id);
        const profile = driver?.profile_id ? profileMap.get(driver.profile_id) : null;
        const vehicle = s.vehicle_id ? vehicleMap.get(s.vehicle_id) : null;
        const isActive = s.status === 'active';
        return (
          <div key={s.id} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isActive ? 'bg-success-100 text-success-600' : 'bg-ink-100 text-ink-400'}`}>
                  <Truck className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  {driver && profile ? (
                    <button onClick={() => setSelectedDriver({ driver, profile })} className="font-bold text-sm text-ink-900 hover:text-brand-600 hover:underline transition flex items-center gap-1">
                      {profile?.name ?? 'Driver'}
                      <History className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                    </button>
                  ) : (
                    <p className="font-bold text-sm text-ink-900">{profile?.name ?? 'Driver'}</p>
                  )}
                  <p className="text-xs text-ink-500 truncate">{vehicle?.registration_number ?? 'No vehicle'} · {vehicle ? vehicle.type.replace('_', ' ').toUpperCase() : ''}</p>
                  {driver?.license_number && <p className="text-[11px] text-ink-400">License: {driver.license_number}</p>}
                </div>
              </div>
              <span className={`chip ${isActive ? 'bg-success-100 text-success-700' : 'bg-ink-100 text-ink-600'} shrink-0`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-success-500 animate-pulse-soft' : 'bg-ink-400'}`} />
                {isActive ? 'On Trip' : 'Ended'}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs">
              <JourneyField icon={Clock} label="Started" value={formatDateTime(s.start_time)} />
              <JourneyField icon={Clock} label="Ended" value={s.end_time ? formatDateTime(s.end_time) : 'In progress'} />
              <JourneyField icon={Navigation} label="Start KM" value={s.start_km?.toString() ?? '—'} />
              <JourneyField icon={Navigation} label="End KM" value={s.end_km?.toString() ?? '—'} />
            </div>
            {(() => {
              const shiftBookings = bookings.filter((bk) => bk.driver_id === s.driver_id);
              const parcelCount = shiftBookings.reduce((sum, bk) => sum + bk.parcel_count, 0);
              if (shiftBookings.length === 0) return null;
              return (
                <div className="mt-3 p-3 rounded-xl bg-brand-50 border border-brand-100">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-700">
                      <Package className="w-3.5 h-3.5" /> Parcels in Vehicle
                    </div>
                    <span className="chip bg-brand-100 text-brand-700">{parcelCount} pc · {shiftBookings.length} {shiftBookings.length === 1 ? 'booking' : 'bookings'}</span>
                  </div>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {shiftBookings.map((bk) => (
                      <div key={bk.id} className="flex items-center justify-between gap-2 text-xs">
                        <div className="min-w-0 truncate">
                          <span className="font-mono font-semibold text-ink-700">{bk.tracking_id}</span>
                          <span className="text-ink-400 ml-2">{bk.pickup_address} → {bk.delivery_address}</span>
                        </div>
                        <span className="font-bold text-ink-600 shrink-0">{bk.parcel_count} pc · {bk.weight_kg}kg</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
            {s.end_km && s.start_km && (
              <div className="mt-3 p-2 rounded-lg bg-brand-50 text-xs font-semibold text-brand-700">
                Total Distance: {s.end_km - s.start_km} km
              </div>
            )}
          </div>
        );
      })}

      {selectedDriver && (
        <DriverHistoryModal
          driver={selectedDriver.driver}
          profile={selectedDriver.profile}
          vehicles={vehicles}
          shifts={shifts}
          bookings={bookings}
          onClose={() => setSelectedDriver(null)}
        />
      )}
    </div>
  );
}

function JourneyField({ icon: Icon, label, value }: { icon: typeof Truck; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-3.5 h-3.5 text-ink-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-ink-400 font-medium">{label}</p>
        <p className="font-semibold text-ink-800 mt-0.5">{value}</p>
      </div>
    </div>
  );
}