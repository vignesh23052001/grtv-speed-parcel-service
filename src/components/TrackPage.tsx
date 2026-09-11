import { useEffect, useState } from 'react';
import { Search, Package, MapPin, Clock, CheckCircle2, AlertTriangle, Truck, Sparkles, Loader2, ChevronDown, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import SiteHeader, { type MarketingPage } from './marketing/SiteHeader';
import SiteFooter from './marketing/SiteFooter';
import { supabase } from '../lib/supabase';
import { RouteMap } from './RouteMap';
import { STATUS_META, TRACKING_STEPS, stepIndex, formatDateTime } from '../lib/ui';
import type { BookingStatus } from '../lib/types';

interface TrackPageProps {
  onGetStarted: () => void;
  onNavigate: (page: MarketingPage, anchor?: string) => void;
  loggedIn?: boolean;
  profileName?: string;
  profileRole?: string;
  onSignOut?: () => void;
}

interface TrackedShipment {
  tracking_id: string;
  status: BookingStatus;
  service_type: 'ltl' | 'ftl';
  pickup_address: string;
  delivery_address: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  delivery_lat: number | null;
  delivery_lng: number | null;
  current_lat: number | null;
  current_lng: number | null;
  location_updated_at: string | null;
  parcel_count: number;
  weight_kg: number;
  goods_class: string | null;
  eta: string | null;
  delay_reason: string | null;
  delay_note: string | null;
  current_hub_name: string | null;
  created_at: string;
  updated_at: string;
  role_match: 'sent' | 'received' | 'both' | null;
  logs: { status: string; note: string | null; created_at: string }[];
}

const LIVE_STATUSES: BookingStatus[] = ['picked_up', 'in_transit', 'out_for_delivery'];

type RoleFilter = 'all' | 'sent' | 'received';

export default function TrackPage({ onGetStarted, onNavigate, loggedIn, profileName, profileRole, onSignOut }: TrackPageProps) {
  const [trackingId, setTrackingId] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchMode, setSearchMode] = useState<'id' | 'phone' | null>(null);
  const [results, setResults] = useState<TrackedShipment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedId = trackingId.trim();
    const phoneDigits = phone.replace(/\D/g, '');

    if (!trimmedId && phoneDigits.length < 10) {
      setError('Enter a tracking ID, or a full 10-digit phone number.');
      return;
    }

    setLoading(true);
    setSearched(true);
    setExpanded(null);
    setRoleFilter('all');

    const mode: 'id' | 'phone' = trimmedId ? 'id' : 'phone';
    setSearchMode(mode);

    const { data, error: rpcError } = await supabase.rpc('track_shipment_public', {
      p_tracking_id: mode === 'id' ? trimmedId : null,
      p_phone: mode === 'phone' ? phone.trim() : null,
    });

    setLoading(false);
    if (rpcError) {
      setError('Something went wrong looking up that shipment. Please try again.');
      setResults([]);
      return;
    }
    const rows = (Array.isArray(data) ? data : data ? [data] : []) as TrackedShipment[];
    setResults(rows);
    if (rows.length === 0) {
      setError(mode === 'id'
        ? "We couldn't find a shipment with that tracking ID."
        : "We couldn't find any shipments for that phone number.");
    }
  }

  const filteredResults = results.filter((r) => {
    if (roleFilter === 'all') return true;
    if (roleFilter === 'sent') return r.role_match === 'sent' || r.role_match === 'both';
    if (roleFilter === 'received') return r.role_match === 'received' || r.role_match === 'both';
    return true;
  });

  const sentCount = results.filter((r) => r.role_match === 'sent' || r.role_match === 'both').length;
  const receivedCount = results.filter((r) => r.role_match === 'received' || r.role_match === 'both').length;

  return (
    <div className="min-h-screen bg-ink-50 text-ink-900 pt-[80px]">
      <SiteHeader
        page="track"
        onNavigate={onNavigate}
        onGetStarted={onGetStarted}
        loggedIn={loggedIn}
        profileName={profileName}
        profileRole={profileRole}
        onSignOut={onSignOut}
      />

      {/* Hero + search */}
      <section className="relative bg-ink-950 text-white py-16 md:py-20 overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 left-1/4 h-72 w-72 rounded-full bg-brand-600/30 blur-3xl animate-float" />
          <div className="absolute -bottom-24 right-1/4 h-80 w-80 rounded-full bg-accent-500/20 blur-3xl animate-float [animation-delay:1.2s]" />
        </div>
        <div className="container mx-auto px-4 md:px-8 max-w-3xl relative z-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-400/30 bg-white/5 backdrop-blur px-4 py-1.5 text-xs uppercase tracking-widest text-brand-300 mb-5">
            <Sparkles className="h-3.5 w-3.5 text-accent-400" /> No login required
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Track your shipment</h1>
          <p className="text-ink-300 mt-3 max-w-xl mx-auto leading-relaxed">
            Search by tracking ID for one shipment, or by phone number to see your full sent &amp; received history — just fill in one of the two.
          </p>

          <form onSubmit={handleSearch} className="mt-8 bg-white rounded-2xl p-4 sm:p-5 shadow-elevated text-left">
            <div className="grid sm:grid-cols-[1fr_auto_1fr_auto] gap-3 items-end">
              <div>
                <label className="text-[11px] font-bold text-ink-500 uppercase tracking-wide">Tracking ID</label>
                <input
                  className="input font-mono mt-1"
                  placeholder="TRK1234567"
                  value={trackingId}
                  onChange={(e) => { setTrackingId(e.target.value); if (e.target.value) setPhone(''); }}
                />
              </div>
              <p className="hidden sm:block text-xs font-bold text-ink-300 pb-2.5">OR</p>
              <div>
                <label className="text-[11px] font-bold text-ink-500 uppercase tracking-wide">Phone Number</label>
                <input
                  className="input mt-1"
                  placeholder="10-digit mobile number"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); if (e.target.value) setTrackingId(''); }}
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary shrink-0">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Track
              </button>
            </div>
            {error && <p className="text-sm text-danger-600 mt-3">{error}</p>}
          </form>
        </div>
      </section>

      {/* Results */}
      <section className="container mx-auto px-4 md:px-8 py-12 max-w-3xl">
        {!searched && (
          <div className="text-center text-ink-400 py-16">
            <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Enter a tracking ID or phone number above to see status.</p>
          </div>
        )}

        {searched && !loading && results.length === 0 && (
          <div className="text-center text-ink-400 py-16">
            <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No shipment found.</p>
          </div>
        )}

        {/* Single shipment (tracking ID search) */}
        {searchMode === 'id' && results[0] && (
          <ShipmentDetail shipment={results[0]} />
        )}

        {/* Full history (phone search) */}
        {searchMode === 'phone' && results.length > 0 && (
          <div className="animate-fade-in">
            <div className="flex items-center gap-2 mb-5 bg-white rounded-xl p-1 shadow-card w-fit">
              {([
                { k: 'all' as const, label: 'All', count: results.length },
                { k: 'sent' as const, label: 'Sent', count: sentCount, icon: ArrowUpRight },
                { k: 'received' as const, label: 'Received', count: receivedCount, icon: ArrowDownLeft },
              ]).map((f) => (
                <button
                  key={f.k}
                  onClick={() => setRoleFilter(f.k)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition ${roleFilter === f.k ? 'bg-brand-600 text-white' : 'text-ink-500 hover:bg-ink-50'}`}
                >
                  {f.icon && <f.icon className="w-3.5 h-3.5" />}
                  {f.label} <span className="opacity-70">({f.count})</span>
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {filteredResults.map((r) => {
                const meta = STATUS_META[r.status];
                const isOpen = expanded === r.tracking_id;
                return (
                  <div key={r.tracking_id} className="card overflow-hidden">
                    <button onClick={() => setExpanded(isOpen ? null : r.tracking_id)} className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-ink-50/50 transition">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${meta.color}`}>
                          {r.role_match === 'received' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-mono font-bold text-sm text-ink-900">{r.tracking_id}</p>
                            {r.role_match === 'both' ? (
                              <span className="chip bg-accent-400/15 text-accent-700 text-[10px]">Sent &amp; Received</span>
                            ) : (
                              <span className="chip bg-ink-100 text-ink-600 text-[10px]">{r.role_match === 'sent' ? 'Sent' : 'Received'}</span>
                            )}
                          </div>
                          <p className="text-xs text-ink-500 truncate">{r.pickup_address} → {r.delivery_address}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`chip ${meta.color}`}><span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />{meta.label}</span>
                        <ChevronDown className={`w-4 h-4 text-ink-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </button>
                    {isOpen && (
                      <div className="border-t border-ink-100 p-4 sm:p-5">
                        <ShipmentDetail shipment={r} compact />
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredResults.length === 0 && (
                <p className="text-center text-ink-400 text-sm py-10">No shipments in this filter.</p>
              )}
            </div>
          </div>
        )}
      </section>

      <SiteFooter onNavigate={onNavigate} onGetStarted={onGetStarted} loggedIn={loggedIn} />
    </div>
  );
}

function ShipmentDetail({ shipment, compact }: { shipment: TrackedShipment; compact?: boolean }) {
  const idx = stepIndex(shipment.status);
  const isLive = LIVE_STATUSES.includes(shipment.status);
  const [liveLoc, setLiveLoc] = useState<{ lat: number; lng: number } | null>(
    shipment.current_lat != null && shipment.current_lng != null
      ? { lat: shipment.current_lat, lng: shipment.current_lng }
      : null,
  );

  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(async () => {
      const { data } = await supabase.rpc('track_shipment_public', { p_tracking_id: shipment.tracking_id });
      const row = Array.isArray(data) ? data[0] : data;
      if (row?.current_lat != null && row?.current_lng != null) {
        setLiveLoc({ lat: row.current_lat, lng: row.current_lng });
      }
    }, 20000);
    return () => clearInterval(interval);
  }, [isLive, shipment.tracking_id]);

  const mapPoints = [
    shipment.pickup_lat != null && shipment.pickup_lng != null
      ? { lat: shipment.pickup_lat, lng: shipment.pickup_lng, label: 'Pickup', color: '#338cff' }
      : null,
    shipment.delivery_lat != null && shipment.delivery_lng != null
      ? { lat: shipment.delivery_lat, lng: shipment.delivery_lng, label: 'Delivery', color: '#1556e1' }
      : null,
    isLive && liveLoc
      ? { lat: liveLoc.lat, lng: liveLoc.lng, label: 'Driver (live)', color: '#22c55e', pulse: true }
      : null,
  ].filter((p): p is { lat: number; lng: number; label: string; color: string; pulse?: boolean } => p !== null);

  return (
    <div className={compact ? 'animate-fade-in' : 'space-y-6 animate-fade-in'}>
      <div className={compact ? '' : 'card p-5 sm:p-6'}>
        {!compact && (
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <p className="font-mono font-bold text-lg text-ink-900">{shipment.tracking_id}</p>
              <p className="text-xs text-ink-500 mt-0.5">{shipment.pickup_address} → {shipment.delivery_address}</p>
            </div>
            <span className={`chip ${STATUS_META[shipment.status].color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${STATUS_META[shipment.status].dot}`} />
              {STATUS_META[shipment.status].label}
            </span>
          </div>
        )}

        {shipment.status !== 'cancelled' ? (
          <div className="flex items-center mb-6 overflow-x-auto scrollbar-none pb-1">
            {TRACKING_STEPS.map((step, i) => {
              const reached = i <= idx;
              return (
                <div key={step.key} className="flex items-center shrink-0">
                  <div className="flex flex-col items-center gap-1.5 w-20 sm:w-24">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${reached ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-400'}`}>
                      {reached ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                    </div>
                    <p className={`text-[10px] text-center leading-tight ${reached ? 'text-ink-800 font-semibold' : 'text-ink-400'}`}>{step.label}</p>
                  </div>
                  {i < TRACKING_STEPS.length - 1 && (
                    <div className={`h-0.5 w-6 sm:w-10 shrink-0 -mt-5 ${i < idx ? 'bg-brand-600' : 'bg-ink-100'}`} />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-danger-50 border border-danger-100 text-sm text-danger-700 mb-6">
            This booking request was rejected. Contact support for details.
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <Detail label="Service" value={shipment.service_type === 'ltl' ? 'LTL / Parcel' : 'FTL / Truckload'} />
          <Detail label="Parcels" value={`${shipment.parcel_count} pc`} />
          <Detail label="Weight" value={`${shipment.weight_kg} kg`} />
          <Detail label="Current Hub" value={shipment.current_hub_name ?? '—'} />
        </div>

        {shipment.delay_reason && (
          <div className="mt-4 p-3 rounded-xl bg-warning-50 border border-warning-100 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-warning-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-warning-700">Delay Reported: {shipment.delay_reason}</p>
              {shipment.delay_note && <p className="text-xs text-warning-600 mt-0.5">{shipment.delay_note}</p>}
            </div>
          </div>
        )}

        {mapPoints.length > 0 && (
          <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-ink-500 uppercase flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Route
              </p>
              {isLive && liveLoc && (
                <span className="chip bg-success-100 text-success-700 text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-success-500 animate-pulse" /> Live
                </span>
              )}
            </div>
            <RouteMap points={mapPoints} height={220} />
          </div>
        )}
      </div>

      <div className={compact ? 'mt-5' : 'card p-5 sm:p-6'}>
        <p className="font-bold text-ink-800 mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-brand-600" /> Activity Log</p>
        {shipment.logs.length === 0 ? (
          <p className="text-sm text-ink-400">No activity recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {[...shipment.logs].reverse().map((log, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center shrink-0">
                  <Truck className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink-800">{STATUS_META[log.status as BookingStatus]?.label ?? log.status}</p>
                  {log.note && <p className="text-xs text-ink-500">{log.note}</p>}
                  <p className="text-[11px] text-ink-400">{formatDateTime(log.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2.5 rounded-lg bg-ink-50">
      <p className="text-[10px] text-ink-400 uppercase font-semibold flex items-center gap-1"><MapPin className="w-2.5 h-2.5" />{label}</p>
      <p className="text-sm font-semibold text-ink-800 mt-0.5 truncate">{value}</p>
    </div>
  );
}
