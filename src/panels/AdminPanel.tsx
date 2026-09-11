import { useEffect, useState, useCallback } from 'react';
import {
  BarChart3, Truck, Users, Wallet, TrendingUp, TrendingDown, MapPin,
  Package, FileText, CheckCircle2, Clock, AlertTriangle, Fuel, Receipt, IndianRupee,
  Plus, Pencil, Trash2, X, UserPlus, Navigation, Building2, History, PlusCircle,
  Eye, EyeOff, Download,
} from 'lucide-react';
import type { Booking, Driver, ExpenseLog, Hub, Invoice, Profile, Quote, ShiftLog, Vehicle, BookingStatus } from '../lib/types';
import { supabase } from '../lib/supabase';

function genStaffPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  let pwd = '';
  for (let i = 0; i < 12; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}
import { PageHeader, Spinner, Toast, EmptyState, Select } from '../components/ui';
import { DriverHistoryModal } from '../components/DriverHistoryModal';
import { RouteMap } from '../components/RouteMap';
import CounterBookingForm from '../components/CounterBookingForm';
import CustomersDirectory from '../components/CustomersDirectory';
import { generateInvoicePDF } from '../lib/invoicePdf';
import { STATUS_META, formatINR, formatDateTime, formatDate, VEHICLE_LABELS, genOTP } from '../lib/ui';

const NEXT_STATUS: Record<BookingStatus, BookingStatus | null> = {
  pending: null,
  placed: 'picked_up',
  picked_up: 'in_transit',
  in_transit: 'out_for_delivery',
  out_for_delivery: 'delivered',
  delivered: null,
  cancelled: null,
};

interface PanelProps { profile: Profile }

export default function AdminPanel({ profile }: PanelProps) {
  const [tab, setTab] = useState<'overview' | 'fleet' | 'orders' | 'invoices' | 'quotes' | 'manage' | 'counter' | 'customers'>('overview');
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [shifts, setShifts] = useState<ShiftLog[]>([]);
  const [expenses, setExpenses] = useState<ExpenseLog[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [toast, setToast] = useState<{ show: boolean; kind: 'success' | 'error' | 'info'; msg: string }>({ show: false, kind: 'success', msg: '' });

  const showToast = useCallback((kind: 'success' | 'error' | 'info', msg: string) => {
    setToast({ show: true, kind, msg });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 2800);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const [b, v, d, p, h, s, e, i, q] = await Promise.all([
      supabase.from('bookings').select('*').order('created_at', { ascending: false }),
      supabase.from('vehicles').select('*'),
      supabase.from('drivers').select('*'),
      supabase.from('profiles').select('*'),
      supabase.from('hubs').select('*'),
      supabase.from('shift_logs').select('*').order('start_time', { ascending: false }),
      supabase.from('expense_logs').select('*').order('created_at', { ascending: false }),
      supabase.from('invoices').select('*').order('generated_at', { ascending: false }),
      supabase.from('quotes').select('*').order('created_at', { ascending: false }),
    ]);
    setBookings((b.data as Booking[]) ?? []);
    setVehicles((v.data as Vehicle[]) ?? []);
    setDrivers((d.data as Driver[]) ?? []);
    setProfiles((p.data as Profile[]) ?? []);
    setHubs((h.data as Hub[]) ?? []);
    setShifts((s.data as ShiftLog[]) ?? []);
    setExpenses((e.data as ExpenseLog[]) ?? []);
    setInvoices((i.data as Invoice[]) ?? []);
    setQuotes((q.data as Quote[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="animate-fade-in">
        <PageHeader title="Admin Dashboard" subtitle="Fleet, revenue, driver metrics, and business operations." />
      </div>

      <div className="mb-6 -mx-4 px-4 sm:mx-0 sm:px-0 animate-slide-up">
        <div className="flex gap-1.5 bg-white border border-ink-100 rounded-xl p-1 shadow-card overflow-x-auto scrollbar-none sm:w-fit sticky top-[84px] z-20">
          {([
            { k: 'overview', label: 'Overview', icon: BarChart3 },
            { k: 'fleet', label: 'Fleet & Drivers', icon: Truck },
            { k: 'manage', label: 'Manage Fleet', icon: Plus },
            { k: 'counter', label: 'Counter Booking', icon: PlusCircle },
            { k: 'orders', label: 'Orders', icon: Package },
            { k: 'customers', label: 'Customers', icon: Users },
            { k: 'invoices', label: 'Invoices', icon: FileText },
            { k: 'quotes', label: 'B2B Quotes', icon: Receipt },
          ] as const).map((t) => {
            const Icon = t.icon;
            const active = tab === t.k;
            return (
              <button key={t.k} onClick={() => setTab(t.k)}
                className={`shrink-0 flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-lg text-[13px] sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap ${active ? 'bg-brand-600 text-white shadow-sm scale-[1.02]' : 'text-ink-500 hover:bg-ink-50'}`}>
                <Icon className="w-4 h-4 shrink-0" /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? <Spinner label="Loading dashboard…" /> : (
        <div key={tab} className="animate-fade-in">
          {tab === 'overview' && <Overview bookings={bookings} vehicles={vehicles} drivers={drivers} expenses={expenses} invoices={invoices} hubs={hubs} />}
          {tab === 'fleet' && <FleetView vehicles={vehicles} drivers={drivers} profiles={profiles} shifts={shifts} expenses={expenses} hubs={hubs} bookings={bookings} onUpdated={load} showToast={showToast} />}
          {tab === 'manage' && <ManageView vehicles={vehicles} drivers={drivers} profiles={profiles} onUpdated={load} showToast={showToast} />}
          {tab === 'counter' && <CounterBookingForm staffProfile={profile} hubs={hubs} onCreated={load} showToast={showToast} />}
          {tab === 'orders' && <OrdersView bookings={bookings} profiles={profiles} hubs={hubs} onUpdated={load} showToast={showToast} />}
          {tab === 'customers' && <CustomersDirectory bookings={bookings} profiles={profiles} />}
          {tab === 'invoices' && <InvoicesView invoices={invoices} bookings={bookings} profiles={profiles} onUpdated={load} showToast={showToast} />}
          {tab === 'quotes' && <QuotesView quotes={quotes} profiles={profiles} onUpdated={load} showToast={showToast} />}
        </div>
      )}

      <Toast show={toast.show} kind={toast.kind}>{toast.msg}</Toast>
    </main>
  );
}

/* ---------- Overview ---------- */

function Overview({ bookings, vehicles, drivers, expenses, invoices, hubs }: {
  bookings: Booking[];
  vehicles: Vehicle[];
  drivers: Driver[];
  expenses: ExpenseLog[];
  invoices: Invoice[];
  hubs: Hub[];
}) {
  const revenue = bookings.filter((b) => b.status === 'delivered').reduce((s, b) => s + (b.freight_charge ?? 0), 0);
  const pendingRevenue = bookings.filter((b) => b.status !== 'delivered' && b.status !== 'cancelled').reduce((s, b) => s + (b.freight_charge ?? 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = revenue - totalExpenses;
  const delivered = bookings.filter((b) => b.status === 'delivered').length;
  const completionRate = bookings.length > 0 ? Math.round((delivered / bookings.length) * 100) : 0;
  const delayed = bookings.filter((b) => b.delay_reason).length;
  const activeDrivers = drivers.filter((d) => d.on_duty).length;
  const onDutyVehicles = vehicles.filter((v) => v.status === 'on_duty').length;

  // fleet map points
  const fleetPoints = [
    ...vehicles.filter((v) => v.lat && v.lng).map((v) => ({
      lat: v.lat!, lng: v.lng!, label: v.registration_number, color: v.status === 'on_duty' ? '#338cff' : '#a8b6cc', pulse: v.status === 'on_duty',
    })),
    ...hubs.filter((h) => h.lat && h.lng).map((h) => ({
      lat: h.lat!, lng: h.lng!, label: h.code, color: '#1c6df5',
    })),
  ];

  // simple bar chart of bookings by status
  const statusCounts: Record<string, number> = {};
  bookings.forEach((b) => { statusCounts[b.status] = (statusCounts[b.status] ?? 0) + 1; });
  const maxCount = Math.max(1, ...Object.values(statusCounts));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KPI icon={IndianRupee} label="Revenue (Delivered)" value={formatINR(revenue)} trend="up" color="success" />
        <KPI icon={Wallet} label="Net Profit" value={formatINR(netProfit)} trend={netProfit >= 0 ? 'up' : 'down'} color={netProfit >= 0 ? 'brand' : 'danger'} />
        <KPI icon={Package} label="Total Orders" value={String(bookings.length)} sub={`${delivered} delivered`} color="brand" />
        <KPI icon={TrendingUp} label="Completion Rate" value={`${completionRate}%`} sub={`${delayed} delayed`} color="accent" />
      </div>

      <div className="grid lg:grid-cols-[1fr_400px] gap-6">
        {/* Fleet map */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-brand-600" />
              <p className="font-bold text-ink-800">Live Fleet Map</p>
            </div>
            <div className="flex gap-3 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-brand-500" /> On Duty ({onDutyVehicles})</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-ink-300" /> Idle</span>
            </div>
          </div>
          <RouteMap points={fleetPoints} height={300} />
        </div>

        {/* Status breakdown */}
        <div className="card p-5">
          <p className="font-bold text-ink-800 mb-4">Orders by Status</p>
          <div className="space-y-3">
            {Object.entries(STATUS_META).map(([key, meta]) => {
              const count = statusCounts[key] ?? 0;
              const pct = (count / maxCount) * 100;
              return (
                <div key={key}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-ink-600">{meta.label}</span>
                    <span className="font-bold text-ink-800">{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-ink-100 overflow-hidden">
                    <div className={`h-full rounded-full ${meta.dot} transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="border-t border-ink-100 mt-5 pt-4 grid grid-cols-2 gap-3 text-sm">
            <MiniStat icon={Users} label="Active Drivers" value={String(activeDrivers)} />
            <MiniStat icon={Truck} label="On-Duty Vehicles" value={String(onDutyVehicles)} />
            <MiniStat icon={Clock} label="Pending Revenue" value={formatINR(pendingRevenue)} />
            <MiniStat icon={AlertTriangle} label="Delayed" value={String(delayed)} />
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div className="card p-5">
        <p className="font-bold text-ink-800 mb-4">Recent Orders</p>
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-400 uppercase border-b border-ink-100">
                <th className="py-2 font-semibold">Tracking ID</th>
                <th className="py-2 font-semibold">Route</th>
                <th className="py-2 font-semibold">Service</th>
                <th className="py-2 font-semibold">Status</th>
                <th className="py-2 font-semibold text-right">Freight</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {bookings.slice(0, 8).map((b) => {
                const meta = STATUS_META[b.status];
                return (
                  <tr key={b.id} className="hover:bg-ink-50/50">
                    <td className="py-3 font-mono font-semibold text-ink-800">{b.tracking_id}</td>
                    <td className="py-3 text-ink-600 max-w-[200px] truncate">{b.pickup_address} → {b.delivery_address}</td>
                    <td className="py-3"><span className="chip bg-ink-100 text-ink-600">{b.service_type === 'ltl' ? 'LTL' : 'FTL'}</span></td>
                    <td className="py-3"><span className={`chip ${meta.color}`}><span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />{meta.label}</span></td>
                    <td className="py-3 text-right font-bold text-ink-800">{formatINR(b.freight_charge)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="sm:hidden space-y-2.5">
          {bookings.slice(0, 8).map((b) => {
            const meta = STATUS_META[b.status];
            return (
              <div key={b.id} className="p-3.5 rounded-xl border border-ink-100">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono font-bold text-sm text-ink-900">{b.tracking_id}</p>
                  <span className={`chip ${meta.color} shrink-0`}><span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />{meta.label}</span>
                </div>
                <p className="text-xs text-ink-500 mt-1.5 truncate">{b.pickup_address} → {b.delivery_address}</p>
                <div className="flex items-center justify-between mt-2.5">
                  <span className="chip bg-ink-100 text-ink-600">{b.service_type === 'ltl' ? 'LTL' : 'FTL'}</span>
                  <span className="font-bold text-ink-800 text-sm">{formatINR(b.freight_charge)}</span>
                </div>
              </div>
            );
          })}
          {bookings.length === 0 && <p className="text-center text-ink-400 text-sm py-6">No orders yet.</p>}
        </div>
      </div>
    </div>
  );
}

function KPI({ icon: Icon, label, value, sub, trend, color }: {
  icon: typeof BarChart3; label: string; value: string; sub?: string; trend?: 'up' | 'down'; color: 'brand' | 'success' | 'accent' | 'danger';
}) {
  const colors = { brand: 'bg-brand-100 text-brand-700', success: 'bg-success-100 text-success-700', accent: 'bg-accent-500/15 text-accent-600', danger: 'bg-danger-100 text-danger-700' };
  return (
    <div className="card p-3.5 sm:p-5">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
        </div>
        {trend && (trend === 'up' ? <TrendingUp className="w-4 h-4 text-success-500" /> : <TrendingDown className="w-4 h-4 text-danger-500" />)}
      </div>
      <p className="text-lg sm:text-2xl font-extrabold text-ink-900 truncate">{value}</p>
      <p className="text-[11px] sm:text-xs text-ink-500 mt-1">{label}</p>
      {sub && <p className="text-[10px] sm:text-[11px] text-ink-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: typeof BarChart3; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-ink-400" />
      <div>
        <p className="text-[11px] text-ink-400">{label}</p>
        <p className="font-bold text-ink-800 text-sm">{value}</p>
      </div>
    </div>
  );
}

/* ---------- Fleet & Drivers ---------- */

function FleetView({ vehicles, drivers, profiles, shifts, expenses, hubs, bookings, onUpdated, showToast }: {
  vehicles: Vehicle[];
  drivers: Driver[];
  profiles: Profile[];
  shifts: ShiftLog[];
  expenses: ExpenseLog[];
  hubs: Hub[];
  bookings: Booking[];
  onUpdated: () => void;
  showToast: (k: 'success' | 'error' | 'info', m: string) => void;
}) {
  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));
  const hubMap = new Map(hubs.map((h) => [h.id, h]));
  const [selectedDriver, setSelectedDriver] = useState<{ driver: Driver; profile: Profile | null } | null>(null);
  const [earningsShift, setEarningsShift] = useState<ShiftLog | null>(null);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Vehicles */}
      <div className="card p-5">
        <p className="font-bold text-ink-800 mb-4">Vehicle Fleet</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {vehicles.map((v) => {
            const statusColor = v.status === 'on_duty' ? 'bg-brand-100 text-brand-700' : v.status === 'maintenance' ? 'bg-warning-100 text-warning-600' : 'bg-ink-100 text-ink-600';
            return (
              <div key={v.id} className="p-4 rounded-xl border border-ink-100 hover:border-brand-200 transition">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-mono font-bold text-ink-900">{v.registration_number}</p>
                  <span className={`chip ${statusColor} capitalize`}>{v.status.replace('_', ' ')}</span>
                </div>
                <p className="text-sm text-ink-600">{VEHICLE_LABELS[v.type] ?? v.type}</p>
                <p className="text-xs text-ink-400 mt-1">Capacity: {v.capacity_kg} kg</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Driver activity history */}
      <div className="card p-5">
        <p className="font-bold text-ink-800 mb-4">Driver Activity History</p>
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-400 uppercase border-b border-ink-100">
                <th className="py-2 font-semibold">Driver</th>
                <th className="py-2 font-semibold">Vehicle</th>
                <th className="py-2 font-semibold">Parcels</th>
                <th className="py-2 font-semibold">Trip Cost</th>
                <th className="py-2 font-semibold">Start</th>
                <th className="py-2 font-semibold">End</th>
                <th className="py-2 font-semibold">Distance</th>
                <th className="py-2 font-semibold">Expenses</th>
                <th className="py-2 font-semibold">Paid</th>
                <th className="py-2 font-semibold">Balance</th>
                <th className="py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {shifts.map((s) => {
                const driver = drivers.find((d) => d.id === s.driver_id);
                const profile = driver?.profile_id ? profileMap.get(driver.profile_id) : null;
                const vehicle = s.vehicle_id ? vehicleMap.get(s.vehicle_id) : null;
                const distance = s.end_km && s.start_km ? s.end_km - s.start_km : null;
                const shiftExpenses = expenses.filter((e) => e.shift_log_id === s.id).reduce((sum, e) => sum + e.amount, 0);
                const shiftBookings = bookings.filter((bk) => bk.driver_id === s.driver_id && ['placed','picked_up','in_transit','out_for_delivery'].includes(bk.status));
                const parcelCount = shiftBookings.reduce((sum, bk) => sum + bk.parcel_count, 0);
                return (
                  <tr key={s.id} className="hover:bg-ink-50/50">
                    <td className="py-3 font-semibold text-ink-800">
                      {driver && profile ? (
                        <button onClick={() => setSelectedDriver({ driver, profile })} className="hover:text-brand-600 hover:underline flex items-center gap-1 text-left">
                          {profile?.name ?? '—'}
                          <History className="w-3 h-3 text-brand-500" />
                        </button>
                      ) : (profile?.name ?? '—')}
                    </td>
                    <td className="py-3 font-mono text-ink-600">{vehicle?.registration_number ?? '—'}</td>
                    <td className="py-3">
                      {Math.max(s.total_parcels ?? 0, parcelCount) > 0 ? (
                        <span className="chip bg-brand-100 text-brand-700"><Package className="w-3 h-3" /> {Math.max(s.total_parcels ?? 0, parcelCount)} pc</span>
                      ) : <span className="text-ink-400 text-xs">—</span>}
                    </td>
                    <td className="py-3 font-semibold text-ink-800">{s.trip_earnings ? formatINR(s.trip_earnings) : '—'}</td>
                    <td className="py-3 text-ink-500">{formatDateTime(s.start_time)}</td>
                    <td className="py-3 text-ink-500">{s.end_time ? formatDateTime(s.end_time) : '—'}</td>
                    <td className="py-3 font-semibold text-ink-800">{distance != null ? `${distance} km` : '—'}</td>
                    <td className="py-3 font-semibold text-ink-800">{shiftExpenses > 0 ? formatINR(shiftExpenses) : '—'}</td>
                    <td className="py-3 font-semibold text-success-600">{s.amount_paid ? formatINR(s.amount_paid) : '—'}</td>
                    <td className="py-3">
                      {(() => {
                        const bal = (s.trip_earnings ?? 0) - (s.amount_paid ?? 0);
                        return bal > 0 ? (
                          <span className="font-bold text-danger-600">{formatINR(bal)}</span>
                        ) : (
                          <span className="text-ink-400">{formatINR(0)}</span>
                        );
                      })()}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`chip ${s.status === 'active' ? 'bg-success-100 text-success-700' : 'bg-ink-100 text-ink-600'}`}>{s.status}</span>
                        <button onClick={() => setEarningsShift(s)} className="text-brand-600 hover:text-brand-800 transition" title="Edit earnings">
                          <IndianRupee className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {shifts.length === 0 && (
                <tr><td colSpan={11} className="py-8 text-center text-ink-400">No shift logs yet. Drivers will appear here after starting duty.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="lg:hidden space-y-3">
          {shifts.map((s) => {
            const driver = drivers.find((d) => d.id === s.driver_id);
            const profile = driver?.profile_id ? profileMap.get(driver.profile_id) : null;
            const vehicle = s.vehicle_id ? vehicleMap.get(s.vehicle_id) : null;
            const distance = s.end_km && s.start_km ? s.end_km - s.start_km : null;
            const shiftExpenses = expenses.filter((e) => e.shift_log_id === s.id).reduce((sum, e) => sum + e.amount, 0);
            const shiftBookings = bookings.filter((bk) => bk.driver_id === s.driver_id && ['placed','picked_up','in_transit','out_for_delivery'].includes(bk.status));
            const parcelCount = shiftBookings.reduce((sum, bk) => sum + bk.parcel_count, 0);
            const bal = (s.trip_earnings ?? 0) - (s.amount_paid ?? 0);
            return (
              <div key={s.id} className="p-4 rounded-xl border border-ink-100">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {driver && profile ? (
                      <button onClick={() => setSelectedDriver({ driver, profile })} className="font-semibold text-sm text-ink-800 hover:text-brand-600 hover:underline flex items-center gap-1 text-left">
                        {profile?.name ?? '—'} <History className="w-3 h-3 text-brand-500 shrink-0" />
                      </button>
                    ) : <p className="font-semibold text-sm text-ink-800">{profile?.name ?? '—'}</p>}
                    <p className="text-xs text-ink-400 font-mono mt-0.5">{vehicle?.registration_number ?? 'No vehicle'}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`chip ${s.status === 'active' ? 'bg-success-100 text-success-700' : 'bg-ink-100 text-ink-600'}`}>{s.status}</span>
                    <button onClick={() => setEarningsShift(s)} className="text-brand-600 hover:text-brand-800 transition p-1" title="Edit earnings">
                      <IndianRupee className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-2 mt-3 pt-3 border-t border-ink-100 text-xs">
                  <div><p className="text-ink-400">Parcels</p><p className="font-semibold text-ink-800">{Math.max(s.total_parcels ?? 0, parcelCount) > 0 ? `${Math.max(s.total_parcels ?? 0, parcelCount)} pc` : '—'}</p></div>
                  <div><p className="text-ink-400">Distance</p><p className="font-semibold text-ink-800">{distance != null ? `${distance} km` : '—'}</p></div>
                  <div><p className="text-ink-400">Trip Cost</p><p className="font-semibold text-ink-800">{s.trip_earnings ? formatINR(s.trip_earnings) : '—'}</p></div>
                  <div><p className="text-ink-400">Expenses</p><p className="font-semibold text-ink-800">{shiftExpenses > 0 ? formatINR(shiftExpenses) : '—'}</p></div>
                  <div><p className="text-ink-400">Paid</p><p className="font-semibold text-success-600">{s.amount_paid ? formatINR(s.amount_paid) : '—'}</p></div>
                  <div><p className="text-ink-400">Balance</p><p className={`font-bold ${bal > 0 ? 'text-danger-600' : 'text-ink-400'}`}>{formatINR(Math.max(bal, 0))}</p></div>
                  <div><p className="text-ink-400">Start</p><p className="font-medium text-ink-600">{formatDateTime(s.start_time)}</p></div>
                  <div><p className="text-ink-400">End</p><p className="font-medium text-ink-600">{s.end_time ? formatDateTime(s.end_time) : '—'}</p></div>
                </div>
              </div>
            );
          })}
          {shifts.length === 0 && <p className="text-center text-ink-400 text-sm py-6">No shift logs yet. Drivers will appear here after starting duty.</p>}
        </div>
      </div>

      {selectedDriver && (
        <DriverHistoryModal
          driver={selectedDriver.driver}
          profile={selectedDriver.profile}
          vehicles={vehicles}
          shifts={shifts}
          bookings={bookings}
          expenses={expenses}
          onClose={() => setSelectedDriver(null)}
        />
      )}
      {earningsShift && (
        <EarningsEditModal shift={earningsShift} onClose={() => setEarningsShift(null)} onDone={() => { setEarningsShift(null); onUpdated(); }} showToast={showToast} />
      )}
    </div>
  );
}

/* ---------- Orders (approve / reject pickup requests) ---------- */

function OrdersView({ bookings, profiles, hubs, onUpdated, showToast }: {
  bookings: Booking[];
  profiles: Profile[];
  hubs: Hub[];
  onUpdated: () => void;
  showToast: (k: 'success' | 'error' | 'info', m: string) => void;
}) {
  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  const pending = bookings.filter((b) => b.status === 'pending');
  const active = bookings.filter((b) => b.status !== 'pending' && b.status !== 'cancelled' && b.status !== 'delivered');
  const [approvalBooking, setApprovalBooking] = useState<Booking | null>(null);
  const [paymentBooking, setPaymentBooking] = useState<Booking | null>(null);

  async function advance(b: Booking) {
    const next = NEXT_STATUS[b.status];
    if (!next) return;
    let otp = b.delivery_otp;
    if (next === 'out_for_delivery' && !otp) {
      otp = genOTP();
      await supabase.from('bookings').update({ delivery_otp: otp }).eq('id', b.id);
    }
    await supabase.from('bookings').update({ status: next }).eq('id', b.id);
    await supabase.from('tracking_logs').insert({
      booking_id: b.id, status: next, note: `Status updated to ${STATUS_META[next].label}`,
    });
    if (next === 'out_for_delivery') {
      showToast('info', `Out for Delivery. OTP: ${otp}`);
    } else if (next === 'delivered') {
      showToast('success', 'Order delivered!');
    } else {
      showToast('success', `Status: ${STATUS_META[next].label}`);
    }
    onUpdated();
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Pending approval requests */}
      {pending.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-warning-600" />
            <p className="font-bold text-ink-800">Pending Pickup Requests</p>
            <span className="chip bg-warning-100 text-warning-700">{pending.length}</span>
          </div>
          <div className="space-y-3">
            {pending.map((b) => {
              const customer = b.customer_id ? profileMap.get(b.customer_id) : null;
              return (
                <div key={b.id} className="p-4 rounded-xl border border-warning-200 bg-warning-50/30">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
                    <div className="min-w-0">
                      <p className="font-mono font-bold text-sm text-ink-900">{b.tracking_id}</p>
                      <p className="text-xs text-ink-500 mt-0.5">{customer?.name ?? '—'} · {b.consignor_phone ?? ''}</p>
                      <p className="text-xs text-ink-500 mt-0.5 truncate">{b.pickup_address} → {b.delivery_address}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-ink-400">
                        <span>{b.service_type === 'ltl' ? 'LTL' : 'FTL'}</span>
                        <span>{b.weight_kg} kg</span>
                        <span>{b.parcel_count} parcels</span>
                        <span>{b.goods_class ?? 'General'}</span>
                      </div>
                    </div>
                    <button onClick={() => setApprovalBooking(b)} className="btn-primary text-xs shrink-0 w-full sm:w-auto">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Review
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All orders */}
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
                <th className="py-2 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {bookings.map((b) => {
                const meta = STATUS_META[b.status];
                const customer = b.customer_id ? profileMap.get(b.customer_id) : null;
                const next = NEXT_STATUS[b.status];
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
                    <td className="py-3">
                      <button onClick={() => setPaymentBooking(b)} className={`chip ${payMeta.color} hover:opacity-80 transition`}>
                        {payMeta.label} · {formatINR(b.freight_charge)}
                      </button>
                    </td>
                    <td className="py-3">
                      {b.status === 'pending' ? (
                        <button onClick={() => setApprovalBooking(b)} className="btn-secondary text-xs py-1.5 px-3">Review</button>
                      ) : next ? (
                        <button onClick={() => advance(b)} className="btn-secondary text-xs py-1.5 px-3">
                          <Navigation className="w-3 h-3" /> Mark {STATUS_META[next].label}
                        </button>
                      ) : null}
                    </td>
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
            const next = NEXT_STATUS[b.status];
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
                    <button onClick={() => setPaymentBooking(b)} className={`chip ${payMeta.color} hover:opacity-80 transition truncate`}>
                      {payMeta.label} · {formatINR(b.freight_charge)}
                    </button>
                  </div>
                </div>
                {(b.status === 'pending' || next) && (
                  <div className="mt-2.5">
                    {b.status === 'pending' ? (
                      <button onClick={() => setApprovalBooking(b)} className="btn-secondary text-xs py-1.5 px-3 w-full">Review</button>
                    ) : next ? (
                      <button onClick={() => advance(b)} className="btn-secondary text-xs py-1.5 px-3 w-full">
                        <Navigation className="w-3 h-3" /> Mark {STATUS_META[next].label}
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
          {bookings.length === 0 && <p className="text-center text-ink-400 text-sm py-6">No orders yet.</p>}
        </div>
      </div>

      {approvalBooking && (
        <ApprovalModal booking={approvalBooking} hubs={hubs} onClose={() => setApprovalBooking(null)} onDone={() => { setApprovalBooking(null); onUpdated(); }} showToast={showToast} />
      )}
      {paymentBooking && (
        <PaymentModal booking={paymentBooking} onClose={() => setPaymentBooking(null)} onDone={() => { setPaymentBooking(null); onUpdated(); }} showToast={showToast} />
      )}
    </div>
  );
}

/* ---------- Payment Editor Modal ---------- */

function PaymentModal({ booking, onClose, onDone, showToast }: {
  booking: Booking;
  onClose: () => void;
  onDone: () => void;
  showToast: (k: 'success' | 'error' | 'info', m: string) => void;
}) {
  const [freightAmount, setFreightAmount] = useState<number>(booking.freight_charge ?? 0);
  const [status, setStatus] = useState<'unpaid' | 'partial' | 'paid'>(booking.payment_status);
  const [amountPaid, setAmountPaid] = useState<number>(booking.amount_paid ?? 0);
  const [busy, setBusy] = useState(false);

  function changeStatus(s: 'unpaid' | 'partial' | 'paid') {
    setStatus(s);
    if (s === 'unpaid') setAmountPaid(0);
    if (s === 'paid') setAmountPaid(freightAmount);
    if (s === 'partial' && amountPaid >= freightAmount) setAmountPaid(0);
  }

  const finalAmountPaid = status === 'unpaid' ? 0 : status === 'paid' ? freightAmount : amountPaid;
  const balance = Math.max(freightAmount - finalAmountPaid, 0);

  async function save() {
    if (freightAmount <= 0) { showToast('error', 'Enter the freight amount.'); return; }
    if (status === 'partial' && (amountPaid <= 0 || amountPaid >= freightAmount)) { showToast('error', 'Partial amount must be less than the total freight.'); return; }
    setBusy(true);
    const { error } = await supabase.from('bookings').update({
      freight_charge: freightAmount, payment_status: status, amount_paid: finalAmountPaid,
    }).eq('id', booking.id);
    setBusy(false);
    if (error) { showToast('error', 'Update failed: ' + error.message); return; }
    showToast('success', 'Payment details updated.');
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/50 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-elevated w-full max-w-md p-5 sm:p-6 max-h-[90vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="font-bold text-ink-900">Freight & Payment</p>
            <p className="text-xs text-ink-400 font-mono">{booking.tracking_id}</p>
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-700"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-5">
          <div>
            <p className="label">Freight Amount (₹)</p>
            <input
              type="number"
              className="input text-lg font-bold"
              value={freightAmount || ''}
              onChange={(e) => {
                const v = +e.target.value;
                setFreightAmount(v);
                if (status === 'paid') setAmountPaid(v);
              }}
            />
          </div>

          <div>
            <p className="label">Payment Status</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { k: 'unpaid', label: 'Not Paid' },
                { k: 'partial', label: 'Partially Paid' },
                { k: 'paid', label: 'Paid in Full' },
              ] as const).map((opt) => (
                <button
                  key={opt.k}
                  onClick={() => changeStatus(opt.k)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition ${
                    status === opt.k
                      ? opt.k === 'paid' ? 'bg-success-600 text-white border-success-600'
                      : opt.k === 'partial' ? 'bg-warning-500 text-white border-warning-500'
                      : 'bg-danger-500 text-white border-danger-500'
                      : 'border-ink-200 text-ink-600 hover:bg-ink-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {status === 'partial' && (
            <div>
              <p className="label">Amount Paid (₹)</p>
              <input type="number" className="input" value={amountPaid || ''} onChange={(e) => setAmountPaid(+e.target.value)} />
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-ink-100 text-center">
            <div><p className="text-base font-extrabold text-ink-900">{formatINR(freightAmount)}</p><p className="text-[10px] text-ink-400 uppercase">Freight</p></div>
            <div><p className="text-base font-extrabold text-success-600">{formatINR(finalAmountPaid)}</p><p className="text-[10px] text-ink-400 uppercase">Paid</p></div>
            <div><p className={`text-base font-extrabold ${balance > 0 ? 'text-danger-600' : 'text-ink-400'}`}>{formatINR(balance)}</p><p className="text-[10px] text-ink-400 uppercase">Balance</p></div>
          </div>

          <button onClick={save} disabled={busy} className="btn-primary w-full">
            <CheckCircle2 className="w-4 h-4" /> {busy ? 'Saving…' : 'Save Payment Details'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Approval Modal (3 options) ---------- */

function ApprovalModal({ booking, hubs, onClose, onDone, showToast }: {
  booking: Booking;
  hubs: Hub[];
  onClose: () => void;
  onDone: () => void;
  showToast: (k: 'success' | 'error' | 'info', m: string) => void;
}) {
  const [mode, setMode] = useState<'pickup' | 'branch' | 'reject'>('pickup');
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [pickupPhone, setPickupPhone] = useState('');
  const [message, setMessage] = useState('');
  const [branchId, setBranchId] = useState<string>(hubs[0]?.id ?? '');
  const [branchPhone, setBranchPhone] = useState('');
  const [rejectMsg, setRejectMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const selectedBranch = hubs.find((h) => h.id === branchId);

  async function submit() {
    setBusy(true);
    if (mode === 'pickup') {
      if (!pickupDate || !pickupTime || !pickupPhone) { showToast('error', 'Fill in date, time, and phone number.'); setBusy(false); return; }
      const dt = new Date(`${pickupDate}T${pickupTime}`).toISOString();
      const msg = message || `Your parcel will be picked up by our team on ${pickupDate} at ${pickupTime}. For any help, please call ${pickupPhone}.`;
      await supabase.from('bookings').update({
        status: 'placed', approval_type: 'pickup', approval_message: msg,
        pickup_datetime: dt, pickup_phone: pickupPhone,
      }).eq('id', booking.id);
      await supabase.from('tracking_logs').insert({
        booking_id: booking.id, status: 'placed', note: `Approved — Team pickup scheduled for ${pickupDate} ${pickupTime}`,
      });
      showToast('success', 'Pickup request approved. Customer notified with pickup details.');
    } else if (mode === 'branch') {
      if (!branchId) { showToast('error', 'Select a branch.'); setBusy(false); return; }
      const msg = message || `Please take your parcel to our nearest branch: ${selectedBranch?.name}. For help, call ${branchPhone || selectedBranch?.phone || 'our office'}.`;
      await supabase.from('bookings').update({
        status: 'placed', approval_type: 'branch', approval_message: msg,
        branch_id: branchId, branch_phone: branchPhone || selectedBranch?.phone || null,
      }).eq('id', booking.id);
      await supabase.from('tracking_logs').insert({
        booking_id: booking.id, status: 'placed', note: `Approved — Drop at branch: ${selectedBranch?.name}`,
      });
      showToast('success', 'Pickup request approved. Customer notified with branch details.');
    } else {
      if (!rejectMsg) { showToast('error', 'Write a rejection message.'); setBusy(false); return; }
      await supabase.from('bookings').update({
        status: 'cancelled', approval_type: 'rejected', rejected_message: rejectMsg,
      }).eq('id', booking.id);
      await supabase.from('tracking_logs').insert({
        booking_id: booking.id, status: 'cancelled', note: `Rejected: ${rejectMsg}`,
      });
      showToast('info', 'Pickup request rejected. Customer notified.');
    }
    setBusy(false);
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="card p-6 w-full max-w-lg animate-slide-up max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="font-bold text-ink-900">Review Pickup Request</p>
            <p className="text-xs text-ink-400 font-mono mt-0.5">{booking.tracking_id} · {booking.pickup_address} → {booking.delivery_address}</p>
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-700"><X className="w-4 h-4" /></button>
        </div>

        {/* Mode selector */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {([
            { k: 'pickup' as const, label: 'Team Pickup', icon: Truck, desc: 'We pick up' },
            { k: 'branch' as const, label: 'Branch Drop', icon: Building2, desc: 'Customer drops' },
            { k: 'reject' as const, label: 'Reject', icon: X, desc: 'Decline request' },
          ]).map((opt) => {
            const Icon = opt.icon;
            const active = mode === opt.k;
            return (
              <button key={opt.k} onClick={() => setMode(opt.k)}
                className={`p-3 rounded-xl border-2 text-center transition ${active ? (opt.k === 'reject' ? 'border-danger-500 bg-danger-50' : 'border-brand-500 bg-brand-50') : 'border-ink-200 hover:border-ink-300'}`}>
                <Icon className={`w-5 h-5 mx-auto mb-1.5 ${active ? (opt.k === 'reject' ? 'text-danger-600' : 'text-brand-600') : 'text-ink-400'}`} />
                <p className={`text-xs font-bold ${active ? (opt.k === 'reject' ? 'text-danger-700' : 'text-brand-700') : 'text-ink-600'}`}>{opt.label}</p>
                <p className="text-[10px] text-ink-400">{opt.desc}</p>
              </button>
            );
          })}
        </div>

        {/* Pickup mode */}
        {mode === 'pickup' && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-brand-50 border border-brand-100 flex items-start gap-2">
              <Truck className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
              <p className="text-xs text-brand-700">Tell the customer that your team will pick up the parcel. Set the date, time, and a help phone number.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="label">Pickup Date</p>
                <input type="date" className="input" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} />
              </div>
              <div>
                <p className="label">Pickup Time</p>
                <input type="time" className="input" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} />
              </div>
            </div>
            <div>
              <p className="label">Help Phone Number</p>
              <input className="input" placeholder="10-digit mobile number" value={pickupPhone} onChange={(e) => setPickupPhone(e.target.value)} />
            </div>
            <div>
              <p className="label">Custom Message (optional)</p>
              <textarea className="input min-h-[70px]" placeholder="Leave blank to use auto-generated message" value={message} onChange={(e) => setMessage(e.target.value)} />
              <p className="text-[11px] text-ink-400 mt-1">Default: "Your parcel will be picked up by our team on [date] at [time]. For help, call [number]."</p>
            </div>
          </div>
        )}

        {/* Branch mode */}
        {mode === 'branch' && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-accent-500/5 border border-l-4 border-l-accent-500 flex items-start gap-2">
              <Building2 className="w-4 h-4 text-accent-600 shrink-0 mt-0.5" />
              <p className="text-xs text-accent-700">Ask the customer to take the parcel to the nearest branch. Select the branch and provide its phone number.</p>
            </div>
            <div>
              <p className="label">Select Branch</p>
              <Select
                value={branchId}
                onChange={setBranchId}
                placeholder="Choose a branch…"
                options={hubs.map((h) => ({ value: h.id, label: `${h.name} (${h.code}) — ${h.address ?? 'No address'}` }))}
              />
            </div>
            {selectedBranch && (
              <div className="p-3 rounded-xl bg-ink-50 text-sm space-y-1">
                <p className="font-semibold text-ink-800">{selectedBranch.name}</p>
                <p className="text-xs text-ink-500">{selectedBranch.address ?? 'No address on file'}</p>
                <p className="text-xs text-ink-500">Phone: {selectedBranch.phone ?? 'Not set'}</p>
              </div>
            )}
            <div>
              <p className="label">Branch Phone Number</p>
              <input className="input" placeholder="Branch contact number" value={branchPhone} onChange={(e) => setBranchPhone(e.target.value)} />
            </div>
            <div>
              <p className="label">Custom Message (optional)</p>
              <textarea className="input min-h-[70px]" placeholder="Leave blank to use auto-generated message" value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>
          </div>
        )}

        {/* Reject mode */}
        {mode === 'reject' && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-danger-50 border border-danger-100 flex items-start gap-2">
              <X className="w-4 h-4 text-danger-600 shrink-0 mt-0.5" />
              <p className="text-xs text-danger-700">Write a polite rejection message to the customer.</p>
            </div>
            <div>
              <p className="label">Rejection Message</p>
              <textarea className="input min-h-[100px]" placeholder="e.g. We're sorry, but we're unable to service this route at the moment. Please try again later or contact us at…" value={rejectMsg} onChange={(e) => setRejectMsg(e.target.value)} />
            </div>
          </div>
        )}

        <button onClick={submit} disabled={busy} className={`btn-primary w-full mt-5 ${mode === 'reject' ? '!bg-danger-600 hover:!bg-danger-700' : ''}`}>
          {busy ? 'Submitting…' : mode === 'reject' ? 'Reject Request' : 'Approve & Notify Customer'}
        </button>
      </div>
    </div>
  );
}

/* ---------- Invoices ---------- */

function InvoicesView({ invoices, bookings, profiles, onUpdated, showToast }: {
  invoices: Invoice[];
  bookings: Booking[];
  profiles: Profile[];
  onUpdated: () => void;
  showToast: (k: 'success' | 'error' | 'info', m: string) => void;
}) {
  const bookingMap = new Map(bookings.map((b) => [b.id, b]));
  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  const totalPaid = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
  const totalUnpaid = invoices.filter((i) => i.status === 'unpaid').reduce((s, i) => s + i.amount, 0);

  async function generate(booking: Booking) {
    const existing = invoices.find((i) => i.booking_id === booking.id);
    if (existing) { showToast('info', 'Invoice already exists for this booking.'); return; }
    await supabase.from('invoices').insert({
      booking_id: booking.id, customer_id: booking.customer_id, amount: booking.freight_charge ?? 0, status: 'unpaid',
    });
    showToast('success', 'Invoice generated.');
    onUpdated();
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <div className="stat-card"><Wallet className="w-5 h-5 text-success-600 mb-1" /><p className="text-[11px] sm:text-xs text-ink-400">Collected</p><p className="text-base sm:text-xl font-bold text-ink-900 truncate">{formatINR(totalPaid)}</p></div>
        <div className="stat-card"><Clock className="w-5 h-5 text-accent-600 mb-1" /><p className="text-[11px] sm:text-xs text-ink-400">Outstanding</p><p className="text-base sm:text-xl font-bold text-ink-900 truncate">{formatINR(totalUnpaid)}</p></div>
        <div className="stat-card"><FileText className="w-5 h-5 text-brand-600 mb-1" /><p className="text-[11px] sm:text-xs text-ink-400">Total Invoices</p><p className="text-base sm:text-xl font-bold text-ink-900">{String(invoices.length)}</p></div>
      </div>

      <div className="card p-5">
        <p className="font-bold text-ink-800 mb-4">Invoices</p>
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-400 uppercase border-b border-ink-100">
                <th className="py-2 font-semibold">Invoice</th>
                <th className="py-2 font-semibold">Tracking</th>
                <th className="py-2 font-semibold">Customer</th>
                <th className="py-2 font-semibold">Amount</th>
                <th className="py-2 font-semibold">Status</th>
                <th className="py-2 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {invoices.map((inv) => {
                const b = bookingMap.get(inv.booking_id);
                const cust = inv.customer_id ? profileMap.get(inv.customer_id) : null;
                return (
                  <tr key={inv.id} className="hover:bg-ink-50/50">
                    <td className="py-3 font-mono font-semibold text-ink-800">INV{inv.id.slice(0, 8).toUpperCase()}</td>
                    <td className="py-3 font-mono text-ink-600">{b?.tracking_id ?? '—'}</td>
                    <td className="py-3 text-ink-600">{cust?.name ?? '—'}</td>
                    <td className="py-3 font-bold text-ink-800">{formatINR(inv.amount)}</td>
                    <td className="py-3"><span className={`chip ${inv.status === 'paid' ? 'bg-success-100 text-success-700' : inv.status === 'overdue' ? 'bg-danger-100 text-danger-700' : 'bg-warning-100 text-warning-600'}`}>{inv.status}</span></td>
                    <td className="py-3">
                      <button
                        onClick={() => generateInvoicePDF(inv, b, cust)}
                        className="chip bg-ink-100 text-ink-700 hover:bg-ink-200 transition inline-flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" /> PDF
                      </button>
                    </td>
                  </tr>
                );
              })}
              {invoices.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-ink-400">No invoices yet. Generate one from a delivered order below.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="sm:hidden space-y-2.5">
          {invoices.map((inv) => {
            const b = bookingMap.get(inv.booking_id);
            const cust = inv.customer_id ? profileMap.get(inv.customer_id) : null;
            return (
              <div key={inv.id} className="p-3.5 rounded-xl border border-ink-100">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono font-bold text-sm text-ink-900">INV{inv.id.slice(0, 8).toUpperCase()}</p>
                  <span className={`chip ${inv.status === 'paid' ? 'bg-success-100 text-success-700' : inv.status === 'overdue' ? 'bg-danger-100 text-danger-700' : 'bg-warning-100 text-warning-600'} shrink-0`}>{inv.status}</span>
                </div>
                <p className="text-xs text-ink-500 mt-1">{cust?.name ?? '—'} · {b?.tracking_id ?? '—'}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <p className="font-bold text-ink-800">{formatINR(inv.amount)}</p>
                  <button
                    onClick={() => generateInvoicePDF(inv, b, cust)}
                    className="chip bg-ink-100 text-ink-700 inline-flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" /> PDF
                  </button>
                </div>
              </div>
            );
          })}
          {invoices.length === 0 && <p className="text-center text-ink-400 text-sm py-6">No invoices yet. Generate one from a delivered order below.</p>}
        </div>
      </div>

      {/* Generate from delivered bookings */}
      <div className="card p-5">
        <p className="font-bold text-ink-800 mb-3">Generate Invoice from Delivered Orders</p>
        <div className="space-y-2">
          {bookings.filter((b) => b.status === 'delivered').map((b) => {
            const has = invoices.some((i) => i.booking_id === b.id);
            return (
              <div key={b.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-ink-50">
                <div>
                  <p className="font-mono font-semibold text-sm text-ink-800">{b.tracking_id}</p>
                  <p className="text-xs text-ink-400">{formatINR(b.freight_charge)} · {formatDate(b.created_at)}</p>
                </div>
                {has ? <span className="chip bg-success-100 text-success-700 w-fit"><CheckCircle2 className="w-3 h-3" /> Invoiced</span>
                  : <button onClick={() => generate(b)} className="btn-primary text-xs py-1.5 px-3 w-full sm:w-auto">Generate</button>}
              </div>
            );
          })}
          {bookings.filter((b) => b.status === 'delivered').length === 0 && (
            <p className="text-sm text-ink-400 text-center py-4">No delivered orders to invoice yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- B2B Quotes ---------- */

function QuotesView({ quotes, profiles, onUpdated, showToast }: {
  quotes: Quote[];
  profiles: Profile[];
  onUpdated: () => void;
  showToast: (k: 'success' | 'error' | 'info', m: string) => void;
}) {
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  async function approve(q: Quote) {
    await supabase.from('quotes').update({ status: 'approved' }).eq('id', q.id);
    showToast('success', 'Quote approved. Customer notified.');
    onUpdated();
  }
  async function reject(q: Quote) {
    await supabase.from('quotes').update({ status: 'rejected' }).eq('id', q.id);
    showToast('info', 'Quote rejected.');
    onUpdated();
  }

  if (quotes.length === 0) {
    return <EmptyState icon={<Receipt className="w-7 h-7" />} title="No B2B quotes" desc="Quotation requests from business accounts will appear here for approval." />;
  }

  return (
    <div className="space-y-3 animate-fade-in">
      {quotes.map((q) => {
        const cust = q.customer_id ? profileMap.get(q.customer_id) : null;
        const statusColor = q.status === 'approved' ? 'bg-success-100 text-success-700' : q.status === 'rejected' ? 'bg-danger-100 text-danger-700' : 'bg-warning-100 text-warning-600';
        return (
          <div key={q.id} className="card p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
              <div className="min-w-0">
                <p className="font-semibold text-ink-800">{cust?.name ?? 'B2B Account'}</p>
                <p className="text-xs text-ink-400 mt-0.5">{q.pickup_address} → {q.delivery_address} · {q.service_type === 'ltl' ? 'LTL' : 'FTL'} · {q.weight_kg} kg</p>
              </div>
              <span className={`chip ${statusColor} capitalize w-fit shrink-0`}>{q.status}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-4 text-sm">
              <div><p className="text-[11px] sm:text-xs text-ink-400">Distance</p><p className="font-semibold text-ink-800 text-xs sm:text-sm">{q.distance_km ? `${q.distance_km} km` : '—'}</p></div>
              <div><p className="text-[11px] sm:text-xs text-ink-400">Est. Charge</p><p className="font-semibold text-ink-800 text-xs sm:text-sm">{formatINR(q.estimated_charge)}</p></div>
              <div><p className="text-[11px] sm:text-xs text-ink-400">Requested</p><p className="font-semibold text-ink-800 text-xs sm:text-sm">{formatDate(q.created_at)}</p></div>
            </div>
            {q.status === 'pending' && (
              <div className="flex gap-2 mt-4">
                <button onClick={() => approve(q)} className="btn-primary text-xs flex-1 sm:flex-none"><CheckCircle2 className="w-3.5 h-3.5" /> Approve</button>
                <button onClick={() => reject(q)} className="btn-secondary text-xs flex-1 sm:flex-none">Reject</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Manage Fleet (Vehicles & Drivers) ---------- */

function ManageView({ vehicles, drivers, profiles, onUpdated, showToast }: {
  vehicles: Vehicle[];
  drivers: Driver[];
  profiles: Profile[];
  onUpdated: () => void;
  showToast: (k: 'success' | 'error' | 'info', m: string) => void;
}) {
  const [vehicleModal, setVehicleModal] = useState<{ mode: 'add' | 'edit'; vehicle: Vehicle | null } | null>(null);
  const [driverModal, setDriverModal] = useState(false);
  const [hubStaffModal, setHubStaffModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<{ driver: Driver; profile: Profile | null } | null>(null);
  const hubStaff = profiles.filter((p) => p.role === 'hub');

  async function deleteVehicle(v: Vehicle) {
    if (!confirm(`Delete vehicle ${v.registration_number}? This cannot be undone.`)) return;
    const { error } = await supabase.from('vehicles').delete().eq('id', v.id);
    if (error) showToast('error', 'Delete failed: ' + error.message);
    else { showToast('success', 'Vehicle deleted.'); onUpdated(); }
  }

  async function deleteDriver(d: Driver) {
    const label = profiles.find((pr) => pr.id === d.profile_id)?.name ?? 'this unlinked driver record';
    if (!confirm(`Remove ${label}? This deletes the driver record (their login, if any, is not affected). This cannot be undone.`)) return;
    const { error } = await supabase.from('drivers').delete().eq('id', d.id);
    if (error) showToast('error', 'Delete failed: ' + error.message);
    else { showToast('success', 'Driver record removed.'); onUpdated(); }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Vehicles management */}
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <p className="font-bold text-ink-800">Vehicle Fleet Management</p>
          <button onClick={() => setVehicleModal({ mode: 'add', vehicle: null })} className="btn-primary text-sm">
            <Plus className="w-4 h-4" /> Add Vehicle
          </button>
        </div>
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-400 uppercase border-b border-ink-100">
                <th className="py-2 font-semibold">Reg. Number</th>
                <th className="py-2 font-semibold">Type</th>
                <th className="py-2 font-semibold">Capacity</th>
                <th className="py-2 font-semibold">Status</th>
                <th className="py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {vehicles.map((v) => {
                const statusColor = v.status === 'on_duty' ? 'bg-brand-100 text-brand-700' : v.status === 'maintenance' ? 'bg-warning-100 text-warning-600' : 'bg-ink-100 text-ink-600';
                return (
                  <tr key={v.id} className="hover:bg-ink-50/50">
                    <td className="py-3 font-mono font-semibold text-ink-800">{v.registration_number}</td>
                    <td className="py-3 text-ink-600">{VEHICLE_LABELS[v.type] ?? v.type}</td>
                    <td className="py-3 text-ink-600">{v.capacity_kg} kg</td>
                    <td className="py-3"><span className={`chip ${statusColor} capitalize`}>{v.status.replace('_', ' ')}</span></td>
                    <td className="py-3">
                      <div className="flex gap-1.5">
                        <button onClick={() => setVehicleModal({ mode: 'edit', vehicle: v })} className="p-1.5 rounded-lg hover:bg-ink-100 text-ink-500"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => deleteVehicle(v)} className="p-1.5 rounded-lg hover:bg-danger-50 text-ink-400 hover:text-danger-500"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {vehicles.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-ink-400">No vehicles yet. Add your first vehicle.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="sm:hidden space-y-2.5">
          {vehicles.map((v) => {
            const statusColor = v.status === 'on_duty' ? 'bg-brand-100 text-brand-700' : v.status === 'maintenance' ? 'bg-warning-100 text-warning-600' : 'bg-ink-100 text-ink-600';
            return (
              <div key={v.id} className="p-3.5 rounded-xl border border-ink-100">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono font-bold text-sm text-ink-900">{v.registration_number}</p>
                  <span className={`chip ${statusColor} capitalize shrink-0`}>{v.status.replace('_', ' ')}</span>
                </div>
                <p className="text-xs text-ink-500 mt-1">{VEHICLE_LABELS[v.type] ?? v.type} · {v.capacity_kg} kg</p>
                <div className="flex gap-1.5 mt-2.5 pt-2.5 border-t border-ink-100">
                  <button onClick={() => setVehicleModal({ mode: 'edit', vehicle: v })} className="btn-secondary text-xs py-1.5 px-3 flex-1"><Pencil className="w-3.5 h-3.5" /> Edit</button>
                  <button onClick={() => deleteVehicle(v)} className="p-1.5 rounded-lg hover:bg-danger-50 text-ink-400 hover:text-danger-500 border border-ink-200"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            );
          })}
          {vehicles.length === 0 && <p className="text-center text-ink-400 text-sm py-6">No vehicles yet. Add your first vehicle.</p>}
        </div>
      </div>

      {/* Drivers management */}
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <p className="font-bold text-ink-800">Driver Accounts</p>
          <button onClick={() => setDriverModal(true)} className="btn-primary text-sm">
            <UserPlus className="w-4 h-4" /> Add Driver
          </button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {drivers.map((d) => {
            const p = d.profile_id ? profiles.find((pr) => pr.id === d.profile_id) : null;
            const v = d.current_vehicle_id ? vehicles.find((ve) => ve.id === d.current_vehicle_id) : null;
            return (
              <div key={d.id} className="p-4 rounded-xl border border-ink-100 hover:border-brand-200 transition">
                <div className="flex items-center justify-between mb-2">
                  <button onClick={() => setSelectedDriver({ driver: d, profile: p ?? null })} className="font-semibold text-sm text-ink-800 hover:text-brand-600 hover:underline flex items-center gap-1">
                    {p?.name ?? 'Unlinked'}
                    <History className="w-3 h-3 text-brand-500" />
                  </button>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`chip ${d.on_duty ? 'bg-success-100 text-success-700' : 'bg-ink-100 text-ink-600'}`}>{d.on_duty ? 'On Duty' : 'Off'}</span>
                    <button onClick={() => deleteDriver(d)} className="p-1 rounded-lg hover:bg-danger-50 text-ink-300 hover:text-danger-500" title="Remove driver record">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-ink-400">{p?.email ?? 'No email'}</p>
                <p className="text-xs text-ink-500 mt-1">License: {d.license_number ?? '—'}</p>
                <p className="text-xs text-ink-500">Vehicle: {v?.registration_number ?? 'None assigned'}</p>
                {!p && (
                  <p className="text-[11px] text-warning-600 mt-1.5 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> No linked account — safe to remove.</p>
                )}
              </div>
            );
          })}
          {drivers.length === 0 && (
            <p className="col-span-full text-sm text-ink-400 text-center py-6">No drivers yet.</p>
          )}
        </div>
      </div>

      {/* Hub operator management */}
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <p className="font-bold text-ink-800">Hub Operator Accounts</p>
          <button onClick={() => setHubStaffModal(true)} className="btn-primary text-sm">
            <UserPlus className="w-4 h-4" /> Add Hub Operator
          </button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {hubStaff.map((p) => (
            <div key={p.id} className="p-4 rounded-xl border border-ink-100 hover:border-brand-200 transition">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-sm text-ink-800">{p.name}</p>
                <span className="chip bg-brand-100 text-brand-700">Hub Ops</span>
              </div>
              <p className="text-xs text-ink-400">{p.email ?? 'No email'}</p>
              <p className="text-xs text-ink-500 mt-1">{p.phone ?? 'No phone on file'}</p>
            </div>
          ))}
          {hubStaff.length === 0 && (
            <p className="col-span-full text-sm text-ink-400 text-center py-6">No hub operators yet.</p>
          )}
        </div>
      </div>

      {vehicleModal && (
        <VehicleModal mode={vehicleModal.mode} vehicle={vehicleModal.vehicle} onClose={() => setVehicleModal(null)} onDone={() => { setVehicleModal(null); onUpdated(); }} showToast={showToast} />
      )}
      {driverModal && (
        <DriverModal profiles={profiles} drivers={drivers} onClose={() => setDriverModal(false)} onDone={() => { setDriverModal(false); onUpdated(); }} showToast={showToast} />
      )}
      {hubStaffModal && (
        <HubStaffModal onClose={() => setHubStaffModal(false)} onDone={() => { setHubStaffModal(false); onUpdated(); }} showToast={showToast} />
      )}
      {selectedDriver && (
        <DriverHistoryModal
          driver={selectedDriver.driver}
          profile={selectedDriver.profile}
          vehicles={vehicles}
          onClose={() => setSelectedDriver(null)}
        />
      )}
    </div>
  );
}

function VehicleModal({ mode, vehicle, onClose, onDone, showToast }: {
  mode: 'add' | 'edit';
  vehicle: Vehicle | null;
  onClose: () => void;
  onDone: () => void;
  showToast: (k: 'success' | 'error' | 'info', m: string) => void;
}) {
  const [reg, setReg] = useState(vehicle?.registration_number ?? '');
  const [type, setType] = useState<Vehicle['type']>(vehicle?.type ?? 'truck_20ft');
  const [capacity, setCapacity] = useState(vehicle?.capacity_kg ?? 8000);
  const [status, setStatus] = useState<Vehicle['status']>(vehicle?.status ?? 'idle');
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!reg.trim()) { showToast('error', 'Registration number is required.'); return; }
    setBusy(true);
    if (mode === 'add') {
      const { error } = await supabase.from('vehicles').insert({
        registration_number: reg.trim().toUpperCase(), type, capacity_kg: capacity, status,
      });
      if (error) showToast('error', 'Failed: ' + error.message);
      else showToast('success', 'Vehicle added.');
    } else if (vehicle) {
      const { error } = await supabase.from('vehicles').update({
        type, capacity_kg: capacity, status,
      }).eq('id', vehicle.id);
      if (error) showToast('error', 'Failed: ' + error.message);
      else showToast('success', 'Vehicle updated.');
    }
    setBusy(false);
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="card p-5 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <p className="font-bold text-ink-900">{mode === 'add' ? 'Add Vehicle' : 'Edit Vehicle'}</p>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-700"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <p className="label">Registration Number</p>
            <input className="input font-mono uppercase" placeholder="MH01AB1234" value={reg} onChange={(e) => setReg(e.target.value)} disabled={mode === 'edit'} />
          </div>
          <div>
            <p className="label">Vehicle Type</p>
            <Select
              value={type}
              onChange={(v) => setType(v as Vehicle['type'])}
              options={Object.entries(VEHICLE_LABELS).map(([k, v]) => ({ value: k, label: v }))}
            />
          </div>
          <div>
            <p className="label">Capacity (kg)</p>
            <input type="number" className="input" value={capacity} onChange={(e) => setCapacity(+e.target.value)} />
          </div>
          <div>
            <p className="label">Status</p>
            <Select
              value={status}
              onChange={(v) => setStatus(v as Vehicle['status'])}
              options={[
                { value: 'idle', label: 'Idle' },
                { value: 'on_duty', label: 'On Duty' },
                { value: 'maintenance', label: 'Maintenance' },
              ]}
            />
          </div>
          <button onClick={save} disabled={busy} className="btn-primary w-full">
            {mode === 'add' ? 'Add Vehicle' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DriverModal({ profiles, drivers, onClose, onDone, showToast }: {
  profiles: Profile[];
  drivers: Driver[];
  onClose: () => void;
  onDone: () => void;
  showToast: (k: 'success' | 'error' | 'info', m: string) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [license, setLicense] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  function generatePassword() {
    setPassword(genStaffPassword());
    setShowPassword(true);
  }

  async function save() {
    if (!name.trim() || !email.trim() || !license.trim()) { showToast('error', 'Name, email, and license are required.'); return; }
    if (password.length < 6) { showToast('error', 'Set a password with at least 6 characters.'); return; }
    setBusy(true);

    // Creating a new auth user swaps the browser's active session to that user.
    // Capture the admin's session first, then restore it right after signUp — BEFORE
    // any table inserts — since inserting into `drivers` requires an admin session
    // (RLS: drivers_admin_insert checks is_admin()), not the new driver's own session.
    const { data: { session: adminSession } } = await supabase.auth.getSession();

    const { data: authData, error: authError } = await supabase.auth.signUp({ email: email.trim(), password });
    if (authError) { showToast('error', 'Auth failed: ' + authError.message); setBusy(false); return; }
    if (!authData.user) { showToast('error', 'Failed to create user.'); setBusy(false); return; }

    if (adminSession) {
      await supabase.auth.setSession({ access_token: adminSession.access_token, refresh_token: adminSession.refresh_token });
    }

    // Create profile
    const { data: profData, error: profError } = await supabase.from('profiles').insert({
      user_id: authData.user.id, name: name.trim(), email: email.trim(), phone: phone.trim(), role: 'driver',
    }).select().single();

    // Create driver record
    let drvError: string | null = null;
    if (!profError && profData) {
      const { error } = await supabase.from('drivers').insert({
        profile_id: profData.id, license_number: license.trim(), on_duty: false,
      });
      drvError = error?.message ?? null;
    }

    setBusy(false);
    if (profError) { showToast('error', 'Profile failed: ' + profError.message); return; }
    if (drvError) { showToast('error', 'Driver record failed: ' + drvError); return; }
    showToast('success', `Driver account created for ${email.trim()}. Share the password with them securely.`);
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="card p-5 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="font-bold text-ink-900">Add Driver Account</p>
            <p className="text-xs text-ink-400 mt-0.5">Set a login and password for this driver.</p>
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-700"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <p className="label">Driver Name</p>
            <input className="input" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <p className="label">Email (Login ID)</p>
            <input type="email" className="input" placeholder="driver@logix.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <p className="label">Phone</p>
            <input className="input" placeholder="Mobile number" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <p className="label">License Number</p>
            <input className="input" placeholder="DL-XXXX-YYYY" value={license} onChange={(e) => setLicense(e.target.value)} />
          </div>
          <div>
            <p className="label">Password</p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-9"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button type="button" onClick={generatePassword} className="btn-secondary text-xs !px-3 shrink-0">Generate</button>
            </div>
            <p className="text-[11px] text-ink-400 mt-1">You set this password and share it with the driver directly — they'll log in with the email and password above.</p>
          </div>
          <button onClick={save} disabled={busy} className="btn-primary w-full">
            {busy ? 'Creating…' : 'Create Driver Account'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Hub Staff Modal (admin only) ---------- */

function HubStaffModal({ onClose, onDone, showToast }: {
  onClose: () => void;
  onDone: () => void;
  showToast: (k: 'success' | 'error' | 'info', m: string) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  function generatePassword() {
    setPassword(genStaffPassword());
    setShowPassword(true);
  }

  async function save() {
    if (!name.trim() || !email.trim()) { showToast('error', 'Name and email are required.'); return; }
    if (password.length < 6) { showToast('error', 'Set a password with at least 6 characters.'); return; }
    setBusy(true);

    const { data: { session: adminSession } } = await supabase.auth.getSession();

    const { data: authData, error: authError } = await supabase.auth.signUp({ email: email.trim(), password });
    if (authError) { showToast('error', 'Auth failed: ' + authError.message); setBusy(false); return; }
    if (!authData.user) { showToast('error', 'Failed to create user.'); setBusy(false); return; }

    if (adminSession) {
      await supabase.auth.setSession({ access_token: adminSession.access_token, refresh_token: adminSession.refresh_token });
    }

    const { error: profError } = await supabase.from('profiles').insert({
      user_id: authData.user.id, name: name.trim(), email: email.trim(), phone: phone.trim(), role: 'hub',
    });

    setBusy(false);
    if (profError) { showToast('error', 'Profile failed: ' + profError.message); return; }
    showToast('success', `Hub operator account created for ${email.trim()}. Share the password with them securely.`);
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="card p-5 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="font-bold text-ink-900">Add Hub Operator Account</p>
            <p className="text-xs text-ink-400 mt-0.5">Set a login and password for this operator.</p>
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-700"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <p className="label">Operator Name</p>
            <input className="input" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <p className="label">Email (Login ID)</p>
            <input type="email" className="input" placeholder="hub@logix.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <p className="label">Phone</p>
            <input className="input" placeholder="Mobile number" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <p className="label">Password</p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-9"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button type="button" onClick={generatePassword} className="btn-secondary text-xs !px-3 shrink-0">Generate</button>
            </div>
            <p className="text-[11px] text-ink-400 mt-1">You set this password and share it with the operator directly — they'll log in with the email and password above.</p>
          </div>
          <button onClick={save} disabled={busy} className="btn-primary w-full">
            {busy ? 'Creating…' : 'Create Hub Operator Account'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Earnings Edit Modal (admin only) ---------- */

function EarningsEditModal({ shift, onClose, onDone, showToast }: {
  shift: ShiftLog;
  onClose: () => void;
  onDone: () => void;
  showToast: (k: 'success' | 'error' | 'info', m: string) => void;
}) {
  const [tripEarnings, setTripEarnings] = useState(shift.trip_earnings?.toString() ?? '');
  const [amountPaid, setAmountPaid] = useState(shift.amount_paid?.toString() ?? '');
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const { error } = await supabase
      .from('shift_logs')
      .update({
        trip_earnings: parseFloat(tripEarnings) || 0,
        amount_paid: parseFloat(amountPaid) || 0,
      })
      .eq('id', shift.id);
    setBusy(false);
    if (error) {
      showToast('error', 'Failed to update earnings');
      return;
    }
    showToast('success', 'Trip earnings updated');
    onDone();
  }

  const balance = (parseFloat(tripEarnings) || 0) - (parseFloat(amountPaid) || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="card p-5 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-success-100 flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-success-600" />
            </div>
            <div>
              <p className="font-bold text-ink-900">Trip Earnings</p>
              <p className="text-xs text-ink-400">Shift started {formatDateTime(shift.start_time)}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-700"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="label">Trip Earnings (Total amount for this trip)</p>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
              <input className="input pl-9" type="number" placeholder="0" value={tripEarnings} onChange={(e) => setTripEarnings(e.target.value)} />
            </div>
          </div>
          <div>
            <p className="label">Amount Paid to Driver (Received)</p>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
              <input className="input pl-9" type="number" placeholder="0" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} />
            </div>
          </div>
          <div className="p-3 rounded-xl bg-ink-50 flex items-center justify-between">
            <span className="text-sm font-semibold text-ink-600">Balance Due</span>
            <span className={`text-lg font-extrabold ${balance > 0 ? 'text-danger-600' : 'text-ink-500'}`}>{formatINR(balance)}</span>
          </div>
          <button onClick={save} disabled={busy} className="btn-primary w-full">
            {busy ? 'Saving…' : 'Save Earnings'}
          </button>
        </div>
      </div>
    </div>
  );
}
