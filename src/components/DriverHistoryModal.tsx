import { useEffect, useState } from 'react';
import { X, Truck, Clock, Navigation, Package, MapPin, Route as RouteIcon, Gauge, Wallet, IndianRupee, CheckCircle2 } from 'lucide-react';
import type { Booking, Driver, ExpenseLog, Profile, ShiftLog, Vehicle } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { Spinner } from '@/components/ui';
import { STATUS_META, formatDateTime, formatINR } from '@/lib/ui';

interface Props {
  driver: Driver;
  profile?: Profile | null;
  vehicles?: Vehicle[];
  shifts?: ShiftLog[];
  bookings?: Booking[];
  expenses?: ExpenseLog[];
  onClose: () => void;
}

export function DriverHistoryModal({ driver, profile, vehicles, shifts, bookings, expenses, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [driverShifts, setDriverShifts] = useState<ShiftLog[]>([]);
  const [driverBookings, setDriverBookings] = useState<Booking[]>([]);
  const [driverExpenses, setDriverExpenses] = useState<ExpenseLog[]>([]);
  const [vehicleMap, setVehicleMap] = useState<Map<string, Vehicle>>(new Map());

  useEffect(() => {
    (async () => {
      const vMap = new Map<string, Vehicle>();
      if (vehicles) {
        vehicles.forEach((v) => vMap.set(v.id, v));
      } else {
        const { data: vData } = await supabase.from('vehicles').select('*');
        (vData as Vehicle[] ?? []).forEach((v) => vMap.set(v.id, v));
      }
      setVehicleMap(vMap);

      if (shifts) {
        setDriverShifts(shifts.filter((s) => s.driver_id === driver.id));
      } else {
        const { data } = await supabase.from('shift_logs').select('*').eq('driver_id', driver.id).order('start_time', { ascending: false });
        setDriverShifts((data as ShiftLog[]) ?? []);
      }

      if (bookings) {
        setDriverBookings(bookings.filter((b) => b.driver_id === driver.id));
      } else {
        const { data } = await supabase.from('bookings').select('*').eq('driver_id', driver.id).order('created_at', { ascending: false });
        setDriverBookings((data as Booking[]) ?? []);
      }

      if (expenses) {
        setDriverExpenses(expenses.filter((e) => e.driver_id === driver.id));
      } else {
        const { data } = await supabase.from('expense_logs').select('*').eq('driver_id', driver.id).order('created_at', { ascending: false });
        setDriverExpenses((data as ExpenseLog[]) ?? []);
      }

      setLoading(false);
    })();
  }, [driver.id]);

  const activeShift = driverShifts.find((s) => s.status === 'active');
  const totalDistance = driverShifts.reduce((sum, s) => {
    if (s.end_km != null && s.start_km != null) return sum + (s.end_km - s.start_km);
    return sum;
  }, 0);
  const totalExpenses = driverExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalParcels = driverBookings.reduce((sum, b) => sum + b.parcel_count, 0);
  const totalEarnings = driverShifts.reduce((sum, s) => sum + (s.trip_earnings ?? 0), 0);
  const totalPaid = driverShifts.reduce((sum, s) => sum + (s.amount_paid ?? 0), 0);
  const totalBalance = totalEarnings - totalPaid;
  const totalParcelsManual = driverShifts.reduce((sum, s) => sum + (s.total_parcels ?? 0), 0);
  const completedTrips = driverShifts.filter((s) => s.status === 'ended').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white px-6 py-5 border-b border-ink-100 z-10">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-brand-100 flex items-center justify-center">
                <Truck className="w-6 h-6 text-brand-600" />
              </div>
              <div>
                <p className="font-bold text-lg text-ink-900">{profile?.name ?? 'Driver'}</p>
                <p className="text-xs text-ink-500">License: {driver.license_number ?? '—'} · {profile?.email ?? ''}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-ink-400 hover:text-ink-700"><X className="w-5 h-5" /></button>
          </div>
          <div className="flex gap-2 mt-3">
            <span className={`chip ${driver.on_duty ? 'bg-success-100 text-success-700' : 'bg-ink-100 text-ink-600'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${driver.on_duty ? 'bg-success-500 animate-pulse-soft' : 'bg-ink-400'}`} />
              {driver.on_duty ? 'On Duty' : 'Off Duty'}
            </span>
            {activeShift && (
              <span className="chip bg-brand-100 text-brand-700">
                <Navigation className="w-3 h-3" /> Trip in Progress
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="py-12"><Spinner label="Loading driver history…" /></div>
        ) : (
          <div className="px-6 py-5 space-y-5">
            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <SummaryStat icon={RouteIcon} label="Total Trips" value={String(driverShifts.length)} />
              <SummaryStat icon={Gauge} label="Distance" value={`${totalDistance} km`} />
              <SummaryStat icon={Package} label="Parcels" value={`${Math.max(totalParcels, totalParcelsManual)} pc`} />
              <SummaryStat icon={Wallet} label="Expenses" value={formatINR(totalExpenses)} />
            </div>

            {/* Earnings summary - driver & admin only */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-success-50 to-white border border-success-200">
              <div className="flex items-center gap-2 mb-3">
                <IndianRupee className="w-4 h-4 text-success-600" />
                <p className="font-bold text-sm text-success-800">Earnings Summary</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-lg font-extrabold text-ink-900">{formatINR(totalEarnings)}</p>
                  <p className="text-[10px] text-ink-400 uppercase font-semibold">Total Earned</p>
                </div>
                <div className="text-center border-x border-success-100">
                  <p className="text-lg font-extrabold text-success-600">{formatINR(totalPaid)}</p>
                  <p className="text-[10px] text-ink-400 uppercase font-semibold">Received</p>
                </div>
                <div className="text-center">
                  <p className={`text-lg font-extrabold ${totalBalance > 0 ? 'text-danger-600' : 'text-ink-600'}`}>{formatINR(totalBalance)}</p>
                  <p className="text-[10px] text-ink-400 uppercase font-semibold">Balance Due</p>
                </div>
              </div>
            </div>

            {/* Active trip */}
            {activeShift && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-brand-50 to-white border border-brand-200">
                <div className="flex items-center gap-2 mb-3">
                  <Navigation className="w-4 h-4 text-brand-600" />
                  <p className="font-bold text-sm text-brand-800">Current Active Trip</p>
                  <span className="chip bg-success-100 text-success-700 text-[10px] ml-auto">
                    <span className="w-1.5 h-1.5 rounded-full bg-success-500 animate-pulse-soft" /> Live
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <TripDetail icon={Clock} label="Started" value={formatDateTime(activeShift.start_time)} />
                  <TripDetail icon={Truck} label="Vehicle" value={activeShift.vehicle_id ? vehicleMap.get(activeShift.vehicle_id)?.registration_number ?? '—' : '—'} />
                  <TripDetail icon={Gauge} label="Start KM" value={activeShift.start_km != null ? `${activeShift.start_km} km` : '—'} />
                </div>
                {(() => {
                  const activeBookings = driverBookings.filter((b) => ['placed', 'picked_up', 'in_transit', 'out_for_delivery'].includes(b.status));
                  if (activeBookings.length === 0) return null;
                  const firstPickup = activeBookings[0];
                  const lastDrop = activeBookings[activeBookings.length - 1];
                  return (
                    <div className="mt-3 pt-3 border-t border-brand-100 space-y-2">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-brand-600 shrink-0 mt-0.5" />
                        <div><p className="text-[10px] uppercase font-bold text-brand-600">From</p><p className="text-xs font-semibold text-ink-800">{firstPickup.pickup_address}</p></div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-danger-500 shrink-0 mt-0.5" />
                        <div><p className="text-[10px] uppercase font-bold text-danger-600">To (Trip End)</p><p className="text-xs font-semibold text-ink-800">{lastDrop.delivery_address}</p></div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Trip history */}
            <div>
              <p className="font-bold text-sm text-ink-800 mb-3">Trip History</p>
              {driverShifts.length === 0 ? (
                <p className="text-sm text-ink-400 py-4 text-center">No trips recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {driverShifts.map((s) => {
                    const vehicle = s.vehicle_id ? vehicleMap.get(s.vehicle_id) : null;
                    const isActive = s.status === 'active';
                    const distance = s.end_km != null && s.start_km != null ? s.end_km - s.start_km : null;
                    const shiftBookings = driverBookings.filter((b) => b.driver_id === s.driver_id);
                    const shiftExpenses = driverExpenses.filter((e) => e.shift_log_id === s.id).reduce((sum, e) => sum + e.amount, 0);
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
                          <TripDetail icon={Clock} label="Start" value={formatDateTime(s.start_time)} />
                          <TripDetail icon={Clock} label="End" value={s.end_time ? formatDateTime(s.end_time) : 'In progress'} />
                          <TripDetail icon={Gauge} label="Distance" value={distance != null ? `${distance} km` : '—'} />
                          <TripDetail icon={Package} label="Parcels" value={`${s.total_parcels ?? shiftBookings.reduce((sum, b) => sum + b.parcel_count, 0)} pc`} />
                          <TripDetail icon={Wallet} label="Expenses" value={shiftExpenses > 0 ? formatINR(shiftExpenses) : '—'} />
                        </div>

                        {/* Trip earnings breakdown - driver & admin only */}
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
                              <p className="font-bold text-success-600 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />{formatINR(s.amount_paid ?? 0)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-ink-400 uppercase font-semibold">Balance</p>
                              <p className={`font-bold ${(s.trip_earnings ?? 0) - (s.amount_paid ?? 0) > 0 ? 'text-danger-600' : 'text-ink-500'}`}>
                                {formatINR((s.trip_earnings ?? 0) - (s.amount_paid ?? 0))}
                              </p>
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

                        {shiftBookings.length > 0 && (
                          <div className="mt-2 text-[11px] text-ink-400">
                            {shiftBookings.reduce((sum, b) => sum + b.parcel_count, 0)} parcels · {shiftBookings.length} bookings
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* All bookings handled */}
            {driverBookings.length > 0 && (
              <div>
                <p className="font-bold text-sm text-ink-800 mb-3">Bookings Handled ({driverBookings.length})</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {driverBookings.map((b) => {
                    const meta = STATUS_META[b.status];
                    return (
                      <div key={b.id} className="flex items-center justify-between p-2.5 rounded-lg bg-ink-50 text-xs">
                        <div className="min-w-0">
                          <p className="font-mono font-semibold text-ink-800">{b.tracking_id}</p>
                          <p className="text-ink-400 truncate">{b.pickup_address} → {b.delivery_address}</p>
                        </div>
                        <span className={`chip ${meta.color} text-[10px] shrink-0 ml-2`}>{meta.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryStat({ icon: Icon, label, value }: { icon: typeof Truck; label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl bg-ink-50 text-center">
      <Icon className="w-4 h-4 text-brand-600 mx-auto mb-1" />
      <p className="text-sm font-extrabold text-ink-900">{value}</p>
      <p className="text-[10px] text-ink-400 uppercase font-semibold">{label}</p>
    </div>
  );
}

function TripDetail({ icon: Icon, label, value }: { icon: typeof Truck; label: string; value: string }) {
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
