import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Truck, Play, Square, MapPin, Clock, Fuel, Receipt, Camera, PenLine,
  ShieldCheck, AlertTriangle, PackageCheck, Navigation, CheckCircle2, Wallet, History, IndianRupee, LocateFixed,
} from 'lucide-react';
import type { Booking, BookingStatus, Driver, ExpenseLog, ExpenseType, Profile, ShiftLog, Vehicle } from '../lib/types';
import { supabase } from '../lib/supabase';
import { PageHeader, EmptyState, Spinner, Toast, Select } from '../components/ui';
import { DriverHistoryModal } from '../components/DriverHistoryModal';
import { STATUS_META, formatINR, formatDateTime, DELAY_REASONS, genOTP } from '../lib/ui';

interface PanelProps { profile: Profile }

export default function DriverPanel({ profile }: PanelProps) {
  const [tab, setTab] = useState<'duty' | 'assignments' | 'expenses' | 'history'>('duty');
  const [driver, setDriver] = useState<Driver | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [shift, setShift] = useState<ShiftLog | null>(null);
  const [allShifts, setAllShifts] = useState<ShiftLog[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [allExpenses, setAllExpenses] = useState<ExpenseLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ show: boolean; kind: 'success' | 'error' | 'info'; msg: string }>({ show: false, kind: 'success', msg: '' });

  const showToast = useCallback((kind: 'success' | 'error' | 'info', msg: string) => {
    setToast({ show: true, kind, msg });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 2800);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: drv } = await supabase.from('drivers').select('*').eq('profile_id', profile.id).maybeSingle();
    const driverRec = drv as Driver | null;
    setDriver(driverRec);
    const v = await supabase.from('vehicles').select('*');
    setVehicles((v.data as Vehicle[]) ?? []);

    if (driverRec) {
      const b = await supabase.from('bookings').select('*').eq('driver_id', driverRec.id).in('status', ['placed','picked_up','in_transit','out_for_delivery']).order('created_at', { ascending: false });
      setBookings((b.data as Booking[]) ?? []);
      const s = await supabase.from('shift_logs').select('*').eq('driver_id', driverRec.id).eq('status', 'active').maybeSingle();
      setShift((s.data as ShiftLog) ?? null);
      const [allS, allB, allE] = await Promise.all([
        supabase.from('shift_logs').select('*').eq('driver_id', driverRec.id).order('start_time', { ascending: false }),
        supabase.from('bookings').select('*').eq('driver_id', driverRec.id).order('created_at', { ascending: false }),
        supabase.from('expense_logs').select('*').eq('driver_id', driverRec.id).order('created_at', { ascending: false }),
      ]);
      setAllShifts((allS.data as ShiftLog[]) ?? []);
      setAllBookings((allB.data as Booking[]) ?? []);
      setAllExpenses((allE.data as ExpenseLog[]) ?? []);
    }
    setLoading(false);
  }, [profile.id]);

  useEffect(() => { load(); }, [load]);

  return (
    <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="animate-fade-in">
        <PageHeader title="Driver Panel" subtitle="Manage your duty, deliveries, and trip expenses." />
      </div>

      <div className="grid grid-cols-4 sm:inline-grid sm:grid-flow-col gap-1 sm:gap-1.5 bg-white border border-ink-100 rounded-xl p-1 sm:w-fit mb-6 shadow-card sticky top-[84px] z-20 overflow-x-auto scrollbar-none animate-slide-up">
        {([
          { k: 'duty', label: 'Duty & Vehicle', shortLabel: 'Duty', icon: Truck },
          { k: 'assignments', label: 'Assignments', shortLabel: 'Jobs', icon: PackageCheck },
          { k: 'expenses', label: 'Expenses', shortLabel: 'Expenses', icon: Wallet },
          { k: 'history', label: 'My History', shortLabel: 'History', icon: History },
        ] as const).map((t) => {
          const Icon = t.icon;
          const active = tab === t.k;
          return (
            <button key={t.k} onClick={() => setTab(t.k)}
              className={`relative flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg text-[11px] sm:text-sm font-semibold transition-all duration-200 ${active ? 'bg-brand-600 text-white shadow-sm scale-[1.02]' : 'text-ink-500 hover:bg-ink-50'}`}>
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{t.label}</span>
              <span className="sm:hidden">{t.shortLabel}</span>
            </button>
          );
        })}
      </div>

      {loading ? <Spinner label="Loading driver data…" /> : (
        <div key={tab} className="animate-fade-in">
          {tab === 'duty' && <DutyView driver={driver} vehicles={vehicles} shift={shift} bookings={bookings} allShifts={allShifts} allExpenses={allExpenses} onUpdated={load} showToast={showToast} />}
          {tab === 'assignments' && <AssignmentsView bookings={bookings} driver={driver} onUpdated={load} showToast={showToast} />}
          {tab === 'expenses' && <ExpensesView driver={driver} shift={shift} onUpdated={load} showToast={showToast} />}
          {tab === 'history' && driver && (
            <DriverHistoryView driver={driver} profile={profile} vehicles={vehicles} shifts={allShifts} bookings={allBookings} expenses={allExpenses} />
          )}
        </div>
      )}

      <Toast show={toast.show} kind={toast.kind}>{toast.msg}</Toast>
    </main>
  );
}

/* ---------- Duty View ---------- */

function DutyView({ driver, vehicles, shift, bookings, allShifts, allExpenses, onUpdated, showToast }: {
  driver: Driver | null;
  vehicles: Vehicle[];
  shift: ShiftLog | null;
  bookings: Booking[];
  allShifts: ShiftLog[];
  allExpenses: ExpenseLog[];
  onUpdated: () => void;
  showToast: (k: 'success' | 'error' | 'info', m: string) => void;
}) {
  const [vehicleId, setVehicleId] = useState<string>(driver?.current_vehicle_id ?? vehicles[0]?.id ?? '');
  const [startKm, setStartKm] = useState<number>(0);
  const [manualParcels, setManualParcels] = useState<number>(0);
  const [tripAmount, setTripAmount] = useState<number>(0);
  const [busy, setBusy] = useState(false);
  const [endTripShift, setEndTripShift] = useState<ShiftLog | null>(null);
  const [expenseShift, setExpenseShift] = useState<ShiftLog | null>(null);

  if (!driver) {
    return <EmptyState icon={<Truck className="w-7 h-7" />} title="No driver profile" desc="This demo profile isn't linked to a driver record." />;
  }

  const onDuty = driver.on_duty;
  const currentVehicle = vehicles.find((v) => v.id === vehicleId);

  async function startDuty() {
    if (!vehicleId) { showToast('error', 'Select a vehicle first.'); return; }
    setBusy(true);
    await supabase.from('shift_logs').insert({
      driver_id: driver!.id, vehicle_id: vehicleId, start_time: new Date().toISOString(),
      start_km: startKm, status: 'active',
      total_parcels: manualParcels,
      trip_earnings: tripAmount,
    });
    await supabase.from('drivers').update({ on_duty: true, current_vehicle_id: vehicleId }).eq('id', driver!.id);
    await supabase.from('vehicles').update({ status: 'on_duty' }).eq('id', vehicleId);
    setBusy(false);
    showToast('success', 'Duty started. Safe travels!');
    onUpdated();
  }

  const activeVehicle = onDuty ? vehicles.find((v) => v.id === driver.current_vehicle_id) : null;
  const totalParcels = bookings.reduce((s, b) => s + b.parcel_count, 0);
  const firstPickup = bookings.find((b) => b.status === 'placed' || b.status === 'picked_up');
  const lastDelivery = [...bookings].reverse().find((b) => b.status === 'in_transit' || b.status === 'out_for_delivery') ?? bookings[bookings.length - 1];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Active Trip banner */}
      {onDuty && shift && (
        <div className="card p-4 sm:p-6 bg-gradient-to-br from-brand-50 to-white border-brand-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center">
                <Navigation className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-ink-900">Active Trip</p>
                <p className="text-xs text-ink-500">Started {formatDateTime(shift.start_time)}</p>
              </div>
            </div>
            <span className="chip bg-success-100 text-success-700">
              <span className="w-1.5 h-1.5 rounded-full bg-success-500 animate-pulse-soft" /> In Progress
            </span>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center pt-1">
                <div className="w-3 h-3 rounded-full bg-brand-600 ring-4 ring-brand-100" />
                <div className="w-0.5 h-10 bg-brand-200" />
                <MapPin className="w-3.5 h-3.5 text-danger-500" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-brand-600">From</p>
                <p className="text-sm font-semibold text-ink-800">{firstPickup?.pickup_address ?? bookings[0]?.pickup_address ?? '—'}</p>
                {firstPickup && <p className="text-[11px] text-ink-400">{firstPickup.consignor_name ?? ''} {firstPickup.consignor_phone ? '· ' + firstPickup.consignor_phone : ''}</p>}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center pt-1">
                <MapPin className="w-3.5 h-3.5 text-danger-500" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-danger-600">To</p>
                <p className="text-sm font-semibold text-ink-800">{lastDelivery?.delivery_address ?? bookings[0]?.delivery_address ?? '—'}</p>
                {lastDelivery && <p className="text-[11px] text-ink-400">{lastDelivery.consignee_name ?? ''} {lastDelivery.consignee_phone ? '· ' + lastDelivery.consignee_phone : ''}</p>}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-brand-100">
            <TripStat icon={Truck} label="Vehicle" value={activeVehicle?.registration_number ?? '—'} />
            <TripStat icon={Clock} label="Start Time" value={shift.start_time ? new Date(shift.start_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'} />
            <TripStat icon={PackageCheck} label="Parcels" value={`${Math.max(manualParcels, shift.total_parcels ?? 0, totalParcels)} pc`} />
            <TripStat icon={Navigation} label="Start KM" value={shift.start_km != null ? `${shift.start_km} km` : '—'} />
          </div>
          {/* Trip cost / paid / balance - driver only */}
          <div className="mt-4 p-4 rounded-xl bg-white/70 border border-success-100">
            <div className="flex items-center gap-1.5 mb-3">
              <IndianRupee className="w-4 h-4 text-success-600" />
              <p className="text-xs font-bold text-success-700 uppercase">Trip Earnings</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-lg font-extrabold text-ink-900">{formatINR(shift.trip_earnings ?? 0)}</p>
                <p className="text-[10px] text-ink-400 uppercase font-semibold">Trip Cost</p>
              </div>
              <div className="border-x border-success-100">
                <p className="text-lg font-extrabold text-success-600">{formatINR(shift.amount_paid ?? 0)}</p>
                <p className="text-[10px] text-ink-400 uppercase font-semibold">Paid</p>
              </div>
              <div>
                <p className={`text-lg font-extrabold ${((shift.trip_earnings ?? 0) - (shift.amount_paid ?? 0)) > 0 ? 'text-danger-600' : 'text-ink-500'}`}>{formatINR((shift.trip_earnings ?? 0) - (shift.amount_paid ?? 0))}</p>
                <p className="text-[10px] text-ink-400 uppercase font-semibold">Balance</p>
              </div>
            </div>
          </div>
        </div>
      )}

    <div className="grid lg:grid-cols-[1fr_360px] gap-6">
      <div className="space-y-6">
        {/* Duty status card */}
        <div className={`card p-6 ${onDuty ? 'border-l-4 border-l-success-500' : 'border-l-4 border-l-ink-300'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${onDuty ? 'bg-success-100 text-success-600' : 'bg-ink-100 text-ink-400'}`}>
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-ink-900">{onDuty ? 'On Duty' : 'Off Duty'}</p>
                <p className="text-sm text-ink-500">{driver.license_number ?? 'License on file'}</p>
              </div>
            </div>
            <span className={`chip ${onDuty ? 'bg-success-100 text-success-700' : 'bg-ink-100 text-ink-600'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${onDuty ? 'bg-success-500 animate-pulse-soft' : 'bg-ink-400'}`} />
              {onDuty ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        {/* Vehicle + odometer */}
        <div className="card p-4 sm:p-6 space-y-4">
          <p className="label">Vehicle Assignment</p>
          <Select
            value={vehicleId}
            onChange={setVehicleId}
            disabled={onDuty}
            placeholder="Select vehicle…"
            options={vehicles.map((v) => ({ value: v.id, label: `${v.registration_number} · ${v.type.replace('_', ' ').toUpperCase()} · ${v.capacity_kg}kg` }))}
          />
          {currentVehicle && (
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Type" value={currentVehicle.type.replace('_', ' ')} />
              <Stat label="Capacity" value={`${currentVehicle.capacity_kg} kg`} />
              <Stat label="Status" value={currentVehicle.status} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="label">Start Odometer (KM)</p>
              <input type="number" className="input" value={startKm} onChange={(e) => setStartKm(+e.target.value)} disabled={onDuty} />
            </div>
            <div>
              <p className="label">Total Parcels in Vehicle</p>
              <input type="number" className="input" placeholder="0" value={manualParcels} onChange={(e) => setManualParcels(+e.target.value)} disabled={onDuty} />
            </div>
          </div>

          <div>
            <p className="label">Trip Amount (₹)</p>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
              <input type="number" className="input pl-9" placeholder="0" value={tripAmount} onChange={(e) => setTripAmount(+e.target.value)} disabled={onDuty} />
            </div>
          </div>

          {!onDuty ? (
            <button onClick={startDuty} disabled={busy} className="btn-primary w-full">
              <Play className="w-4 h-4" /> Start Duty
            </button>
          ) : (
            <button onClick={() => shift && setEndTripShift(shift)} disabled={busy || !shift} className="btn-danger w-full">
              <Square className="w-4 h-4" /> End Duty
            </button>
          )}
        </div>
      </div>

      {/* Parcels in vehicle + Shift summary */}
      <div className="space-y-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-brand-600" />
              <p className="font-bold text-ink-800">Parcels in Vehicle</p>
            </div>
            <span className="chip bg-brand-100 text-brand-700">{bookings.length} {bookings.length === 1 ? 'parcel' : 'parcels'}</span>
          </div>
          {bookings.length === 0 ? (
            <p className="text-sm text-ink-400 py-2">No parcels assigned to your vehicle yet.</p>
          ) : (
            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {bookings.map((b) => {
                const meta = STATUS_META[b.status];
                return (
                  <div key={b.id} className="flex items-center justify-between p-2.5 rounded-xl bg-ink-50">
                    <div className="min-w-0">
                      <p className="font-mono font-semibold text-xs text-ink-800">{b.tracking_id}</p>
                      <p className="text-[11px] text-ink-400 truncate">{b.pickup_address} → {b.delivery_address}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold text-ink-700">{b.parcel_count} pc</span>
                      <span className={`chip ${meta.color} text-[10px]`}>{meta.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {bookings.length > 0 && (
            <div className="border-t border-ink-100 mt-3 pt-3 grid grid-cols-3 gap-2 text-center">
              <div><p className="text-lg font-extrabold text-ink-900">{bookings.reduce((s, b) => s + b.parcel_count, 0)}</p><p className="text-[10px] text-ink-400">Total Pieces</p></div>
              <div><p className="text-lg font-extrabold text-ink-900">{bookings.reduce((s, b) => s + b.weight_kg, 0).toFixed(1)}</p><p className="text-[10px] text-ink-400">Total kg</p></div>
              <div><p className="text-lg font-extrabold text-ink-900">{bookings.length}</p><p className="text-[10px] text-ink-400">Bookings</p></div>
            </div>
          )}
        </div>

      <div className="card p-5 h-fit sticky top-24">
        <p className="font-bold text-ink-800 mb-4">Current Shift</p>
        {shift ? (
          <div className="space-y-3 text-sm">
            <Row label="Started" value={formatDateTime(shift.start_time)} />
            <Row label="Start KM" value={shift.start_km?.toString() ?? '—'} />
            <Row label="End KM" value={shift.end_km?.toString() ?? '—'} />
            <Row label="Distance" value={shift.end_km && shift.start_km ? `${shift.end_km - shift.start_km} km` : 'In progress'} />
            <div className="border-t border-ink-100 pt-3">
              <p className="text-xs text-ink-400">Vehicle</p>
              <p className="font-semibold text-ink-800">{vehicles.find((v) => v.id === shift.vehicle_id)?.registration_number ?? '—'}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-ink-400">No active shift. Start duty to begin logging.</p>
        )}
      </div>
      </div>
    </div>

    {/* Recent Trips */}
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="font-bold text-ink-800">Recent Trips</p>
        <span className="chip bg-ink-100 text-ink-600">{allShifts.length} total</span>
      </div>
      {allShifts.length === 0 ? (
        <EmptyState icon={<History className="w-7 h-7" />} title="No trips yet" desc="Start duty to begin logging your first trip." />
      ) : (
        <div className="space-y-3">
          {allShifts.slice(0, 8).map((s) => (
            <TripCard
              key={s.id}
              shiftLog={s}
              vehicle={vehicles.find((v) => v.id === s.vehicle_id) ?? null}
              expenses={allExpenses.filter((e) => e.shift_log_id === s.id)}
              from={s.status === 'active' ? (firstPickup?.pickup_address ?? bookings[0]?.pickup_address ?? null) : null}
              to={s.status === 'active' ? (lastDelivery?.delivery_address ?? bookings[0]?.delivery_address ?? null) : null}
              onEndTrip={() => setEndTripShift(s)}
              onAddExpense={() => setExpenseShift(s)}
            />
          ))}
        </div>
      )}
    </div>

    {endTripShift && (
      <EndTripModal
        shift={endTripShift}
        driver={driver}
        onClose={() => setEndTripShift(null)}
        onDone={() => { setEndTripShift(null); onUpdated(); }}
        showToast={showToast}
      />
    )}
    {expenseShift && (
      <AddExpenseModal
        shift={expenseShift}
        driver={driver}
        onClose={() => setExpenseShift(null)}
        onDone={() => { setExpenseShift(null); onUpdated(); }}
        showToast={showToast}
      />
    )}
    </div>
  );
}

function TripStat({ icon: Icon, label, value }: { icon: typeof Truck; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-brand-600 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-ink-400 uppercase font-semibold">{label}</p>
        <p className="text-sm font-bold text-ink-800 truncate">{value}</p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl bg-ink-50">
      <p className="text-[11px] text-ink-400 uppercase font-semibold">{label}</p>
      <p className="font-semibold text-ink-800 mt-0.5 capitalize">{value}</p>
    </div>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><span className="text-ink-500">{label}</span><span className="font-semibold text-ink-800">{value}</span></div>;
}

/* ---------- Trip Card (Recent Trips) ---------- */

function TripCard({ shiftLog, vehicle, expenses, from, to, onEndTrip, onAddExpense }: {
  shiftLog: ShiftLog;
  vehicle: Vehicle | null;
  expenses: ExpenseLog[];
  from: string | null;
  to: string | null;
  onEndTrip: () => void;
  onAddExpense: () => void;
}) {
  const isActive = shiftLog.status === 'active';
  const distance = shiftLog.end_km != null && shiftLog.start_km != null ? shiftLog.end_km - shiftLog.start_km : null;
  const expenseTotal = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className={`p-4 rounded-xl border ${isActive ? 'border-success-200 bg-success-50/30' : 'border-ink-100'}`}>
      {/* Header row: vehicle + status/action */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isActive ? 'bg-success-100 text-success-600' : 'bg-ink-100 text-ink-400'}`}>
            <Truck className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink-800 truncate">{vehicle?.registration_number ?? 'No vehicle'}</p>
            <p className="text-[11px] text-ink-400">{formatDateTime(shiftLog.start_time)}</p>
          </div>
        </div>
        {isActive ? (
          <button onClick={onEndTrip} className="btn-danger text-xs !px-3 !py-1.5 shrink-0">
            <Square className="w-3.5 h-3.5" /> <span className="hidden sm:inline">End Trip</span>
          </button>
        ) : (
          <span className="chip bg-ink-100 text-ink-600 text-[10px] shrink-0">Ended</span>
        )}
      </div>

      {/* From / To */}
      {(from || to) && (
        <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 mb-3 pb-3 border-b border-ink-100">
          <div className="flex items-start gap-1.5 flex-1 min-w-0">
            <MapPin className="w-3.5 h-3.5 text-brand-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-bold text-brand-600">From</p>
              <p className="text-sm font-semibold text-ink-800 truncate">{from ?? '—'}</p>
            </div>
          </div>
          <div className="flex items-start gap-1.5 flex-1 min-w-0">
            <MapPin className="w-3.5 h-3.5 text-danger-500 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-bold text-danger-600">To</p>
              <p className="text-sm font-semibold text-ink-800 truncate">{to ?? '—'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Odometer + parcels */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <HistoryField icon={Navigation} label="Start Odometer" value={shiftLog.start_km != null ? `${shiftLog.start_km} km` : '—'} />
        <HistoryField icon={Navigation} label="End Odometer" value={shiftLog.end_km != null ? `${shiftLog.end_km} km` : isActive ? 'In progress' : '—'} />
        <HistoryField icon={Navigation} label="Distance" value={distance != null ? `${distance} km` : '—'} />
        <HistoryField icon={PackageCheck} label="Parcels" value={`${shiftLog.total_parcels ?? 0} pc`} />
      </div>

      {/* Expenses for this particular trip */}
      <div className="mt-3 pt-3 border-t border-ink-100">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5 text-accent-600" />
            <p className="text-[11px] font-bold text-ink-600 uppercase">Trip Expenses</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-ink-900">{formatINR(expenseTotal)}</span>
            <button onClick={onAddExpense} className="btn-secondary text-[11px] !px-2.5 !py-1">
              <Receipt className="w-3.5 h-3.5" /> Add Expense
            </button>
          </div>
        </div>
        {expenses.length === 0 ? (
          <p className="text-[11px] text-ink-400">No expenses logged for this trip.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {expenses.map((e) => (
              <span key={e.id} className="chip bg-ink-100 text-ink-700 text-[10px]">
                {e.type === 'fuel' ? <Fuel className="w-3 h-3" /> : e.type === 'toll' ? <Receipt className="w-3 h-3" /> : <Truck className="w-3 h-3" />}
                {e.type} · {formatINR(e.amount)}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- End Trip Modal ---------- */

function EndTripModal({ shift, driver, onClose, onDone, showToast }: {
  shift: ShiftLog;
  driver: Driver;
  onClose: () => void;
  onDone: () => void;
  showToast: (k: 'success' | 'error' | 'info', m: string) => void;
}) {
  const [endKm, setEndKm] = useState<number>(shift.start_km ?? 0);
  const [busy, setBusy] = useState(false);

  async function confirmEndTrip() {
    if (shift.start_km != null && endKm < shift.start_km) {
      showToast('error', 'End odometer cannot be less than the start odometer.');
      return;
    }
    setBusy(true);
    await supabase.from('shift_logs').update({
      end_time: new Date().toISOString(), end_km: endKm, status: 'ended',
    }).eq('id', shift.id);
    await supabase.from('drivers').update({ on_duty: false }).eq('id', driver.id);
    if (shift.vehicle_id) {
      await supabase.from('vehicles').update({ status: 'idle' }).eq('id', shift.vehicle_id);
    }
    setBusy(false);
    showToast('success', 'Duty ended. Trip summary saved.');
    onDone();
  }

  return (
    <Modal onClose={onClose} title="End Trip" subtitle="Confirm closing odometer reading">
      <div className="space-y-4">
        <div className="p-3 rounded-xl bg-ink-50 flex items-center justify-between text-sm">
          <span className="text-ink-500">Starting Odometer</span>
          <span className="font-bold text-ink-900">{shift.start_km != null ? `${shift.start_km} km` : '—'}</span>
        </div>
        <div>
          <p className="label">End Odometer (KM)</p>
          <input
            type="number"
            autoFocus
            className="input"
            value={endKm}
            onChange={(e) => setEndKm(+e.target.value)}
            placeholder="Enter closing odometer reading"
          />
        </div>
        <button onClick={confirmEndTrip} disabled={busy} className="btn-danger w-full">
          <Square className="w-4 h-4" /> Confirm End Trip
        </button>
      </div>
    </Modal>
  );
}

/* ---------- Add Expense Modal (per trip) ---------- */

function AddExpenseModal({ shift, driver, onClose, onDone, showToast }: {
  shift: ShiftLog;
  driver: Driver;
  onClose: () => void;
  onDone: () => void;
  showToast: (k: 'success' | 'error' | 'info', m: string) => void;
}) {
  const [type, setType] = useState<ExpenseType>('fuel');
  const [amount, setAmount] = useState<number>(0);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  async function add() {
    if (amount <= 0) { showToast('error', 'Enter an amount.'); return; }
    setBusy(true);
    await supabase.from('expense_logs').insert({
      driver_id: driver.id, shift_log_id: shift.id,
      type, amount, note, receipt_url: 'uploaded',
    });
    setBusy(false);
    showToast('success', 'Expense logged for this trip.');
    onDone();
  }

  return (
    <Modal onClose={onClose} title="Add Trip Expense" subtitle={`Trip started ${formatDateTime(shift.start_time)}`}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="label">Type</p>
            <Select value={type} onChange={(v) => setType(v as ExpenseType)} options={[
              { value: 'fuel', label: 'Fuel' },
              { value: 'toll', label: 'Toll' },
              { value: 'maintenance', label: 'Maintenance' },
            ]} />
          </div>
          <div>
            <p className="label">Amount (₹)</p>
            <input type="number" className="input" placeholder="0" value={amount || ''} onChange={(e) => setAmount(+e.target.value)} />
          </div>
        </div>
        <div>
          <p className="label">Note</p>
          <input className="input" placeholder="e.g. receipt #, location" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <button onClick={add} disabled={busy} className="btn-primary w-full">
          <Receipt className="w-4 h-4" /> Add Expense
        </button>
      </div>
    </Modal>
  );
}

/* ---------- Assignments View ---------- */

const NEXT_STATUS: Record<BookingStatus, BookingStatus | null> = {
  pending: null,
  placed: 'picked_up',
  picked_up: 'in_transit',
  in_transit: 'out_for_delivery',
  out_for_delivery: 'delivered',
  delivered: null,
  cancelled: null,
};

function AssignmentsView({ bookings, driver, onUpdated, showToast }: {
  bookings: Booking[];
  driver: Driver | null;
  onUpdated: () => void;
  showToast: (k: 'success' | 'error' | 'info', m: string) => void;
}) {
  const [actionBooking, setActionBooking] = useState<Booking | null>(null);
  const [delayBooking, setDelayBooking] = useState<Booking | null>(null);
  const [sharingLocation, setSharingLocation] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const lastWriteRef = useRef(0);

  const activeIds = bookings
    .filter((b) => ['picked_up', 'in_transit', 'out_for_delivery'].includes(b.status))
    .map((b) => b.id);

  function toggleLocationSharing() {
    if (sharingLocation) {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      setSharingLocation(false);
      showToast('info', 'Live location sharing stopped.');
      return;
    }
    if (!('geolocation' in navigator)) {
      showToast('error', 'Location is not supported on this device.');
      return;
    }
    if (activeIds.length === 0) {
      showToast('error', 'No active pickup/delivery to share location for.');
      return;
    }
    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        const now = Date.now();
        if (now - lastWriteRef.current < 15000) return; // throttle writes to ~15s
        lastWriteRef.current = now;
        await supabase.from('bookings').update({
          current_lat: pos.coords.latitude,
          current_lng: pos.coords.longitude,
          location_updated_at: new Date().toISOString(),
        }).in('id', activeIds);
      },
      () => showToast('error', 'Could not get your location. Check location permissions.'),
      { enableHighAccuracy: true, maximumAge: 10000 },
    );
    setWatchId(id);
    setSharingLocation(true);
    showToast('success', 'Sharing your live location with customers on active deliveries.');
  }

  useEffect(() => {
    return () => { if (watchId !== null) navigator.geolocation.clearWatch(watchId); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!driver) return <EmptyState icon={<Truck className="w-7 h-7" />} title="No driver profile" desc="" />;
  if (bookings.length === 0) return <EmptyState icon={<PackageCheck className="w-7 h-7" />} title="No active assignments" desc="Assigned pickups and deliveries will appear here." />;

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
      booking_id: b.id, status: next, hub_id: b.current_hub_id,
      note: `Driver updated status to ${STATUS_META[next].label}`, lat: b.delivery_lat, lng: b.delivery_lng,
    });
    if (next === 'out_for_delivery') {
      showToast('info', `SMS sent to customer — Out for Delivery. OTP: ${otp}`);
    } else {
      showToast('success', `Status updated: ${STATUS_META[next].label}`);
    }
    onUpdated();
  }

  return (
    <div className="space-y-3 animate-fade-in">
      <button
        onClick={toggleLocationSharing}
        className={`w-full flex items-center justify-center gap-2 text-xs font-semibold rounded-xl px-4 py-2.5 transition ${
          sharingLocation ? 'bg-success-100 text-success-700 border border-success-200' : 'bg-ink-100 text-ink-700 hover:bg-ink-200'
        }`}
      >
        <LocateFixed className={`w-4 h-4 ${sharingLocation ? 'animate-pulse' : ''}`} />
        {sharingLocation ? 'Sharing live location — tap to stop' : 'Share live location with customers'}
      </button>

      {bookings.map((b) => {
        const meta = STATUS_META[b.status];
        const next = NEXT_STATUS[b.status];
        return (
          <div key={b.id} className="card p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${meta.color}`}>
                  <Truck className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-mono font-bold text-ink-900 text-sm">{b.tracking_id}</p>
                  <p className="text-xs text-ink-500 truncate">{b.pickup_address} → {b.delivery_address}</p>
                </div>
              </div>
              <span className={`chip ${meta.color} shrink-0`}><span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />{meta.label}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs">
              <Field label="Service" value={b.service_type === 'ltl' ? 'LTL' : 'FTL'} />
              <Field label="Parcels" value={String(b.parcel_count)} />
              <Field label="Weight" value={`${b.weight_kg} kg`} />
              <Field label="Distance" value={b.distance_km ? `${b.distance_km} km` : '—'} />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
              <Field label="Consignor" value={`${b.consignor_name ?? '—'} · ${b.consignor_phone ?? ''}`} />
              <Field label="Consignee" value={`${b.consignee_name ?? '—'} · ${b.consignee_phone ?? ''}`} />
            </div>

            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 mt-4">
              {next && (
                <button onClick={() => advance(b)} className="btn-primary text-xs w-full sm:w-auto">
                  <Navigation className="w-3.5 h-3.5" /> Mark {STATUS_META[next].label}
                </button>
              )}
              {b.status === 'out_for_delivery' && (
                <button onClick={() => setActionBooking(b)} className="btn-secondary text-xs w-full sm:w-auto">
                  <PenLine className="w-3.5 h-3.5" /> Complete Delivery (e-POD)
                </button>
              )}
              {b.status !== 'delivered' && b.status !== 'cancelled' && (
                <button onClick={() => setDelayBooking(b)} className="btn-ghost text-xs text-warning-600 hover:bg-warning-50 w-full sm:w-auto">
                  <AlertTriangle className="w-3.5 h-3.5" /> Report Delay
                </button>
              )}
            </div>
          </div>
        );
      })}

      {actionBooking && (
        <EPODModal booking={actionBooking} onClose={() => setActionBooking(null)} onDone={() => { setActionBooking(null); onUpdated(); }} showToast={showToast} />
      )}
      {delayBooking && (
        <DelayModal booking={delayBooking} onClose={() => setDelayBooking(null)} onDone={() => { setDelayBooking(null); onUpdated(); }} showToast={showToast} />
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return <div><p className="text-ink-400 font-medium">{label}</p><p className="font-semibold text-ink-800 mt-0.5">{value}</p></div>;
}

/* ---------- e-POD Modal ---------- */

function EPODModal({ booking, onClose, onDone, showToast }: {
  booking: Booking;
  onClose: () => void;
  onDone: () => void;
  showToast: (k: 'success' | 'error' | 'info', m: string) => void;
}) {
  const [otp, setOtp] = useState('');
  const [sig, setSig] = useState(false);
  const [photo, setPhoto] = useState(false);
  const [busy, setBusy] = useState(false);

  async function complete() {
    if (otp !== booking.delivery_otp) { showToast('error', 'Incorrect OTP. Ask customer for the delivery PIN.'); return; }
    if (!sig || !photo) { showToast('error', 'Capture signature and photo proof.'); return; }
    setBusy(true);
    await supabase.from('bookings').update({
      status: 'delivered', pod_signature: 'captured', pod_photo_url: 'captured',
    }).eq('id', booking.id);
    await supabase.from('tracking_logs').insert({
      booking_id: booking.id, status: 'delivered', hub_id: booking.current_hub_id,
      note: 'Delivered — e-POD captured (signature + photo + OTP verified)',
      lat: booking.delivery_lat, lng: booking.delivery_lng,
    });
    setBusy(false);
    showToast('success', 'Delivery complete! e-POD saved.');
    onDone();
  }

  return (
    <Modal onClose={onClose} title="Proof of Delivery" subtitle={booking.tracking_id}>
      <div className="space-y-4">
        <div>
          <p className="label">Customer Delivery OTP</p>
          <input className="input font-mono text-lg tracking-widest text-center" placeholder="••••" maxLength={4} value={otp} onChange={(e) => setOtp(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setSig(!sig)} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition ${sig ? 'border-success-500 bg-success-50' : 'border-ink-200'}`}>
            {sig ? <CheckCircle2 className="w-6 h-6 text-success-600" /> : <PenLine className="w-6 h-6 text-ink-400" />}
            <span className="text-xs font-semibold">{sig ? 'Signature Captured' : 'Tap to Sign'}</span>
          </button>
          <button onClick={() => setPhoto(!photo)} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition ${photo ? 'border-success-500 bg-success-50' : 'border-ink-200'}`}>
            {photo ? <CheckCircle2 className="w-6 h-6 text-success-600" /> : <Camera className="w-6 h-6 text-ink-400" />}
            <span className="text-xs font-semibold">{photo ? 'Photo Captured' : 'Take Photo'}</span>
          </button>
        </div>
        <button onClick={complete} disabled={busy} className="btn-primary w-full">
          <ShieldCheck className="w-4 h-4" /> Verify & Complete Delivery
        </button>
      </div>
    </Modal>
  );
}

/* ---------- Delay Modal ---------- */

function DelayModal({ booking, onClose, onDone, showToast }: {
  booking: Booking;
  onClose: () => void;
  onDone: () => void;
  showToast: (k: 'success' | 'error' | 'info', m: string) => void;
}) {
  const [reason, setReason] = useState(DELAY_REASONS[0]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  async function report() {
    setBusy(true);
    await supabase.from('bookings').update({
      delay_reason: reason, delay_note: note,
      eta: new Date(Date.now() + 36 * 3600000).toISOString(),
    }).eq('id', booking.id);
    await supabase.from('tracking_logs').insert({
      booking_id: booking.id, status: booking.status, hub_id: booking.current_hub_id,
      note: `Delay reported: ${reason}${note ? ' — ' + note : ''}`,
    });
    setBusy(false);
    showToast('info', 'Delay reported. Customer tracking updated with new ETA.');
    onDone();
  }

  return (
    <Modal onClose={onClose} title="Report Delay" subtitle={booking.tracking_id}>
      <div className="space-y-4">
        <div>
          <p className="label">Reason</p>
          <Select value={reason} onChange={setReason} options={DELAY_REASONS} />
        </div>
        <div>
          <p className="label">Note</p>
          <textarea className="input min-h-[80px]" placeholder="Add details…" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <button onClick={report} disabled={busy} className="btn-primary w-full">
          <AlertTriangle className="w-4 h-4" /> Report Delay
        </button>
      </div>
    </Modal>
  );
}

/* ---------- Expenses View ---------- */

function ExpensesView({ driver, shift, onUpdated, showToast }: {
  driver: Driver | null;
  shift: ShiftLog | null;
  onUpdated: () => void;
  showToast: (k: 'success' | 'error' | 'info', m: string) => void;
}) {
  const [expenses, setExpenses] = useState<ExpenseLog[]>([]);
  const [type, setType] = useState<ExpenseType>('fuel');
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!driver) return;
    const { data } = await supabase.from('expense_logs').select('*').eq('driver_id', driver.id).order('created_at', { ascending: false });
    setExpenses((data as ExpenseLog[]) ?? []);
  }, [driver]);

  useEffect(() => { load(); }, [load]);

  if (!driver) return <EmptyState icon={<Wallet className="w-7 h-7" />} title="No driver profile" desc="" />;

  async function add() {
    if (amount <= 0) { showToast('error', 'Enter an amount.'); return; }
    setBusy(true);
    await supabase.from('expense_logs').insert({
      driver_id: driver!.id, shift_log_id: shift?.id ?? null,
      type, amount, note, receipt_url: 'uploaded',
    });
    setBusy(false);
    setAmount(0); setNote('');
    showToast('success', 'Expense logged.');
    load(); onUpdated();
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byType = (t: ExpenseType) => expenses.filter((e) => e.type === t).reduce((s, e) => s + e.amount, 0);

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6 animate-fade-in">
      <div className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="stat-card"><Fuel className="w-5 h-5 text-brand-600 mb-1" /><p className="text-xs text-ink-400">Fuel</p><p className="text-lg font-bold text-ink-900">{formatINR(byType('fuel'))}</p></div>
          <div className="stat-card"><Receipt className="w-5 h-5 text-accent-600 mb-1" /><p className="text-xs text-ink-400">Toll</p><p className="text-lg font-bold text-ink-900">{formatINR(byType('toll'))}</p></div>
          <div className="stat-card"><Truck className="w-5 h-5 text-danger-600 mb-1" /><p className="text-xs text-ink-400">Maintenance</p><p className="text-lg font-bold text-ink-900">{formatINR(byType('maintenance'))}</p></div>
        </div>

        {/* Add expense */}
        <div className="card p-5 space-y-3">
          <p className="label">Log New Expense</p>
          <div className="grid grid-cols-2 gap-3">
            <Select value={type} onChange={(v) => setType(v as ExpenseType)} options={[
              { value: 'fuel', label: 'Fuel' },
              { value: 'toll', label: 'Toll' },
              { value: 'maintenance', label: 'Maintenance' },
            ]} />
            <input type="number" className="input" placeholder="Amount (₹)" value={amount || ''} onChange={(e) => setAmount(+e.target.value)} />
          </div>
          <input className="input" placeholder="Note (e.g. receipt #, location)" value={note} onChange={(e) => setNote(e.target.value)} />
          <button onClick={add} disabled={busy} className="btn-primary w-full">
            <Receipt className="w-4 h-4" /> Add Expense
          </button>
        </div>

        {/* History */}
        <div className="card divide-y divide-ink-50">
          {expenses.length === 0 ? (
            <p className="p-6 text-sm text-ink-400 text-center">No expenses logged yet.</p>
          ) : expenses.map((e) => (
            <div key={e.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-ink-100 flex items-center justify-center">
                  {e.type === 'fuel' ? <Fuel className="w-4 h-4 text-brand-600" /> : e.type === 'toll' ? <Receipt className="w-4 h-4 text-accent-600" /> : <Truck className="w-4 h-4 text-danger-600" />}
                </div>
                <div>
                  <p className="font-semibold text-sm text-ink-800 capitalize">{e.type}</p>
                  <p className="text-xs text-ink-400">{e.note ?? formatDateTime(e.created_at)}</p>
                </div>
              </div>
              <span className="font-bold text-ink-900">{formatINR(e.amount)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5 h-fit sticky top-24">
        <p className="font-bold text-ink-800 mb-3">Total Trip Expenses</p>
        <p className="text-3xl font-extrabold text-brand-700">{formatINR(total)}</p>
        <p className="text-xs text-ink-400 mt-2">{expenses.length} entries logged</p>
      </div>
    </div>
  );
}

/* ---------- Modal shell ---------- */

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="card p-5 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="font-bold text-ink-900">{title}</p>
            {subtitle && <p className="text-xs text-ink-400 font-mono mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-700"><Square className="w-4 h-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------- Driver History View ---------- */

function DriverHistoryView({ driver, profile, vehicles, shifts, bookings, expenses }: {
  driver: Driver;
  profile: Profile;
  vehicles: Vehicle[];
  shifts: ShiftLog[];
  bookings: Booking[];
  expenses: ExpenseLog[];
}) {
  const [showModal, setShowModal] = useState(false);

  const totalDistance = shifts.reduce((sum, s) => {
    if (s.end_km != null && s.start_km != null) return sum + (s.end_km - s.start_km);
    return sum;
  }, 0);
  const totalParcels = bookings.reduce((sum, b) => sum + b.parcel_count, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const completedTrips = shifts.filter((s) => s.status === 'ended').length;
  const activeShift = shifts.find((s) => s.status === 'active');
  const totalEarnings = shifts.reduce((sum, s) => sum + (s.trip_earnings ?? 0), 0);
  const totalPaid = shifts.reduce((sum, s) => sum + (s.amount_paid ?? 0), 0);
  const totalBalance = totalEarnings - totalPaid;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="card p-4 sm:p-6 bg-gradient-to-br from-brand-50 to-white border-brand-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-brand-600 flex items-center justify-center shrink-0">
              <History className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-lg text-ink-900 truncate">{profile.name}</p>
              <p className="text-xs text-ink-500 truncate">License: {driver.license_number ?? '—'} · {profile.email ?? ''}</p>
            </div>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-secondary text-sm w-full sm:w-auto shrink-0">
            <History className="w-4 h-4" /> Full History
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryStat icon={Truck} label="Total Trips" value={String(shifts.length)} />
          <SummaryStat icon={Navigation} label="Distance" value={`${totalDistance} km`} />
          <SummaryStat icon={PackageCheck} label="Parcels" value={`${totalParcels} pc`} />
          <SummaryStat icon={Wallet} label="Expenses" value={formatINR(totalExpenses)} />
        </div>
      </div>

      {/* Earnings summary - driver only */}
      <div className="card p-5 bg-gradient-to-br from-success-50 to-white border-success-200">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-xl bg-success-600 flex items-center justify-center">
            <IndianRupee className="w-5 h-5 text-white" />
          </div>
          <p className="font-bold text-ink-900">My Earnings</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-2xl font-extrabold text-ink-900">{formatINR(totalEarnings)}</p>
            <p className="text-[10px] text-ink-400 uppercase font-semibold mt-0.5">Total Earned</p>
          </div>
          <div className="text-center border-x border-success-100">
            <p className="text-2xl font-extrabold text-success-600">{formatINR(totalPaid)}</p>
            <p className="text-[10px] text-ink-400 uppercase font-semibold mt-0.5">Received</p>
          </div>
          <div className="text-center">
            <p className={`text-2xl font-extrabold ${totalBalance > 0 ? 'text-danger-600' : 'text-ink-500'}`}>{formatINR(totalBalance)}</p>
            <p className="text-[10px] text-ink-400 uppercase font-semibold mt-0.5">Balance Due</p>
          </div>
        </div>
      </div>

      {activeShift && (
        <div className="card p-5 border-l-4 border-l-success-500">
          <div className="flex items-center gap-2 mb-3">
            <span className="chip bg-success-100 text-success-700">
              <span className="w-1.5 h-1.5 rounded-full bg-success-500 animate-pulse-soft" /> Active Trip
            </span>
            <p className="text-sm font-semibold text-ink-800">Started {formatDateTime(activeShift.start_time)}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <HistoryField icon={Truck} label="Vehicle" value={activeShift.vehicle_id ? vehicles.find((v) => v.id === activeShift.vehicle_id)?.registration_number ?? '—' : '—'} />
            <HistoryField icon={Clock} label="Start Time" value={formatDateTime(activeShift.start_time)} />
            <HistoryField icon={Navigation} label="Start KM" value={activeShift.start_km != null ? `${activeShift.start_km} km` : '—'} />
          </div>
        </div>
      )}

      <div className="card p-5">
        <p className="font-bold text-ink-800 mb-4">Recent Trips</p>
        {shifts.length === 0 ? (
          <EmptyState icon={<History className="w-7 h-7" />} title="No trips yet" desc="Your trip history will appear here after you start and end duty." />
        ) : (
          <div className="space-y-3">
            {shifts.slice(0, 10).map((s) => {
              const vehicle = s.vehicle_id ? vehicles.find((v) => v.id === s.vehicle_id) : null;
              const isActive = s.status === 'active';
              const distance = s.end_km != null && s.start_km != null ? s.end_km - s.start_km : null;
              const shiftBookings = bookings.filter((b) => b.driver_id === s.driver_id);
              const firstPickup = shiftBookings[0]?.pickup_address;
              const lastDrop = shiftBookings.length > 0 ? shiftBookings[shiftBookings.length - 1].delivery_address : null;

              return (
                <div key={s.id} className={`p-4 rounded-xl border ${isActive ? 'border-success-200 bg-success-50/30' : 'border-ink-100'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive ? 'bg-success-100 text-success-600' : 'bg-ink-100 text-ink-400'}`}>
                        <Truck className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-ink-800">{vehicle?.registration_number ?? 'No vehicle'}</p>
                        <p className="text-[11px] text-ink-400">{vehicle ? vehicle.type.replace('_', ' ').toUpperCase() : ''}</p>
                      </div>
                    </div>
                    <span className={`chip ${isActive ? 'bg-success-100 text-success-700' : 'bg-ink-100 text-ink-600'} text-[10px]`}>
                      {isActive ? 'Active' : 'Ended'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                    <HistoryField icon={Clock} label="Start" value={formatDateTime(s.start_time)} />
                    <HistoryField icon={Clock} label="End" value={s.end_time ? formatDateTime(s.end_time) : 'In progress'} />
                    <HistoryField icon={Navigation} label="Distance" value={distance != null ? `${distance} km` : '—'} />
                    <HistoryField icon={PackageCheck} label="Parcels" value={`${s.total_parcels ?? 0} pc`} />
                  </div>
                  {/* Per-trip earnings - driver only */}
                  <div className="mt-3 p-3 rounded-lg bg-success-50 border border-success-100">
                    <div className="flex items-center gap-1.5 mb-2">
                      <IndianRupee className="w-3.5 h-3.5 text-success-600" />
                      <p className="text-[11px] font-bold text-success-700 uppercase">Trip Earnings</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-[10px] text-ink-400 uppercase font-semibold">Earned</p>
                        <p className="font-bold text-ink-800">{formatINR(s.trip_earnings ?? 0)}</p>
                      </div>
                      <div className="border-x border-success-100">
                        <p className="text-[10px] text-ink-400 uppercase font-semibold">Received</p>
                        <p className="font-bold text-success-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />{formatINR(s.amount_paid ?? 0)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-ink-400 uppercase font-semibold">Balance</p>
                        <p className={`font-bold ${(s.trip_earnings ?? 0) - (s.amount_paid ?? 0) > 0 ? 'text-danger-600' : 'text-ink-500'}`}>{formatINR((s.trip_earnings ?? 0) - (s.amount_paid ?? 0))}</p>
                      </div>
                    </div>
                  </div>
                  {(firstPickup || lastDrop) && (
                    <div className="mt-3 pt-3 border-t border-ink-100 flex items-start gap-3 text-xs">
                      <div className="flex items-start gap-1.5 flex-1 min-w-0">
                        <MapPin className="w-3 h-3 text-brand-600 shrink-0 mt-0.5" />
                        <div className="min-w-0"><p className="text-[10px] uppercase font-bold text-brand-600">From</p><p className="font-semibold text-ink-700 truncate">{firstPickup ?? '—'}</p></div>
                      </div>
                      <div className="flex items-start gap-1.5 flex-1 min-w-0">
                        <MapPin className="w-3 h-3 text-danger-500 shrink-0 mt-0.5" />
                        <div className="min-w-0"><p className="text-[10px] uppercase font-bold text-danger-600">To</p><p className="font-semibold text-ink-700 truncate">{lastDrop ?? '—'}</p></div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <DriverHistoryModal
          driver={driver}
          profile={profile}
          vehicles={vehicles}
          shifts={shifts}
          bookings={bookings}
          expenses={expenses}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

function SummaryStat({ icon: Icon, label, value }: { icon: typeof Truck; label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl bg-white/60 text-center">
      <Icon className="w-4 h-4 text-brand-600 mx-auto mb-1" />
      <p className="text-sm font-extrabold text-ink-900">{value}</p>
      <p className="text-[10px] text-ink-400 uppercase font-semibold">{label}</p>
    </div>
  );
}

function HistoryField({ icon: Icon, label, value }: { icon: typeof Truck; label: string; value: string }) {
  return (
    <div className="flex items-start gap-1.5">
      <Icon className="w-3.5 h-3.5 text-ink-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-ink-400 uppercase font-semibold">{label}</p>
        <p className="text-xs font-semibold text-ink-800 truncate">{value}</p>
      </div>
    </div>
  );
}
