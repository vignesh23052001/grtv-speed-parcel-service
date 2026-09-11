import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Package, Truck, Bell, FileText, ShieldCheck, Clock, ArrowRight,
  CheckCircle2, Plus, Trash2, User as UserIcon, Phone, MapPin, X,
  ChevronDown, Star, Download, MessageCircle, RotateCcw,
  Bookmark, BookmarkPlus,
} from 'lucide-react';
import type { Booking, BookingStatus, Hub, ParcelItem, Profile, SavedAddress, ServiceType, TrackingLog } from '../lib/types';
import { supabase } from '../lib/supabase';
import { estimateRoadKm } from '../lib/rate';
import { PageHeader, EmptyState, Spinner, Toast } from '../components/ui';
import { RouteMap } from '../components/RouteMap';
import {
  STATUS_META, TRACKING_STEPS, stepIndex, formatINR, formatDate, formatDateTime, genTrackingId, genOTP,
} from '../lib/ui';

interface PanelProps { profile: Profile; initialTab?: 'book' | 'track' | 'alerts'; initialServiceType?: ServiceType }

export default function CustomerPanel({ profile, initialTab, initialServiceType }: PanelProps) {
  const [tab, setTab] = useState<'book' | 'track' | 'alerts'>(initialTab ?? 'book');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ show: boolean; kind: 'success' | 'error' | 'info'; msg: string }>({ show: false, kind: 'success', msg: '' });

  const showToast = useCallback((kind: 'success' | 'error' | 'info', msg: string) => {
    setToast({ show: true, kind, msg });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 2800);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const [b, h] = await Promise.all([
      supabase.from('bookings').select('*').eq('customer_id', profile.id).order('created_at', { ascending: false }),
      supabase.from('hubs').select('*'),
    ]);
    setBookings((b.data as Booking[]) ?? []);
    setHubs((h.data as Hub[]) ?? []);
    setLoading(false);
  }, [profile.id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (initialTab) {
      setTab(initialTab);
      if (initialTab === 'book') {
        setTimeout(() => bookRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTab, initialServiceType]);

  const bookRef = useRef<HTMLDivElement>(null);
  const [rebookFrom, setRebookFrom] = useState<Booking | null>(null);

  function handleRebook(b: Booking) {
    setRebookFrom(b);
    setTab('book');
    setTimeout(() => bookRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }

  const activeCount = bookings.filter((b) => !['delivered', 'cancelled'].includes(b.status)).length;

  const TABS = [
    { k: 'book' as const, label: 'New Booking', shortLabel: 'Book', icon: Plus },
    { k: 'track' as const, label: 'My Shipments', shortLabel: 'Shipments', icon: Truck, badge: activeCount },
    { k: 'alerts' as const, label: 'Alerts', shortLabel: 'Alerts', icon: Bell },
  ];

  return (
    <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="animate-fade-in">
        <PageHeader title="Customer Portal" subtitle="Book shipments, track in real time, and manage your deliveries." />
      </div>

      <div className="grid grid-cols-3 sm:inline-grid sm:grid-flow-col gap-1 sm:gap-1.5 bg-white border border-ink-100 rounded-xl p-1 sm:w-fit mb-6 shadow-card sticky top-[84px] z-20 animate-slide-up">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.k;
          return (
            <button key={t.k} onClick={() => setTab(t.k)}
              className={`relative flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-2 rounded-lg text-[11px] sm:text-sm font-semibold transition-all duration-200 ${active ? 'bg-brand-600 text-white shadow-sm scale-[1.02]' : 'text-ink-500 hover:bg-ink-50'}`}>
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{t.label}</span>
              <span className="sm:hidden">{t.shortLabel}</span>
              {!!t.badge && (
                <span className={`absolute -top-1.5 -right-1 sm:static sm:ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${active ? 'bg-white text-brand-700' : 'bg-brand-600 text-white'}`}>
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div key={tab} className="animate-fade-in">
        {tab === 'book' && (
          <div ref={bookRef}>
            <BookingFlow
              key={rebookFrom?.id ?? initialServiceType ?? 'default'}
              profile={profile}
              hubs={hubs}
              onCreated={load}
              showToast={showToast}
              initialServiceType={initialServiceType}
              prefillBooking={rebookFrom}
              onPrefillConsumed={() => setRebookFrom(null)}
            />
          </div>
        )}
        {tab === 'track' && (loading ? <Spinner label="Loading your shipments…" /> : <ShipmentsList bookings={bookings} hubs={hubs} profile={profile} onUpdated={load} onRebook={handleRebook} showToast={showToast} />)}
        {tab === 'alerts' && <AlertsView bookings={bookings} />}
      </div>

      <Toast show={toast.show} kind={toast.kind}>{toast.msg}</Toast>
    </main>
  );
}

/* ---------- VRL-Style Booking Flow ---------- */

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  'mumbai': { lat: 19.1136, lng: 72.8697 },
  'delhi': { lat: 28.6304, lng: 77.2177 },
  'bengaluru': { lat: 12.9698, lng: 77.7500 },
  'chennai': { lat: 13.0067, lng: 80.2206 },
  'kolkata': { lat: 22.5958, lng: 88.2636 },
  'pune': { lat: 18.5912, lng: 73.7389 },
};

function resolveCoord(addr: string): { lat: number; lng: number } | null {
  const key = Object.keys(CITY_COORDS).find((c) => addr.toLowerCase().includes(c));
  return key ? CITY_COORDS[key] : null;
}

function printBookingReceipt(booking: Booking) {
  const win = window.open('', '_blank', 'width=800,height=600');
  if (!win) return;
  win.document.write(`
    <html><head><title>Receipt ${booking.tracking_id}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 40px; color: #1e2536; }
      .header { display:flex; justify-content:space-between; border-bottom: 3px solid #1556e1; padding-bottom: 16px; margin-bottom: 24px; }
      .logo { font-size: 24px; font-weight: 800; color: #1556e1; }
      .trk { font-size: 14px; text-align: right; }
      .trk b { font-size: 20px; font-family: monospace; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 32px; margin-bottom: 24px; }
      .field { font-size: 13px; }
      .field .lbl { color: #7a8dab; font-size: 11px; text-transform: uppercase; font-weight: 600; }
      .field .val { font-weight: 600; margin-top: 2px; }
      .paybox { margin-top: 24px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; text-align: center; }
      .paybox div { border: 1px solid #e5e9f0; border-radius: 10px; padding: 12px; }
      .paybox .amt { font-size: 18px; font-weight: 800; }
      .footer { margin-top: 40px; font-size: 12px; color: #7a8dab; text-align: center; }
    </style></head><body>
    <div class="header">
      <div class="logo">GRTV Speed Parcel Service</div>
      <div class="trk">Booking Receipt<br><b>${booking.tracking_id}</b><br>${formatDate(booking.created_at)}</div>
    </div>
    <div class="grid">
      <div class="field"><div class="lbl">Sender</div><div class="val">${booking.consignor_name ?? '—'} — ${booking.consignor_phone ?? ''}</div></div>
      <div class="field"><div class="lbl">Receiver</div><div class="val">${booking.consignee_name ?? '—'} — ${booking.consignee_phone ?? ''}</div></div>
      <div class="field"><div class="lbl">From</div><div class="val">${booking.pickup_address}</div></div>
      <div class="field"><div class="lbl">To</div><div class="val">${booking.delivery_address}</div></div>
      <div class="field"><div class="lbl">Service Type</div><div class="val">${booking.service_type === 'ltl' ? 'LTL / Parcel' : 'FTL / Full Truckload'}</div></div>
      <div class="field"><div class="lbl">Parcels</div><div class="val">${booking.parcel_count} pc — ${booking.weight_kg} kg</div></div>
      <div class="field"><div class="lbl">Goods Class</div><div class="val">${booking.goods_class ?? 'General'}</div></div>
      <div class="field"><div class="lbl">Status</div><div class="val">${STATUS_META[booking.status].label}</div></div>
    </div>
    <div class="paybox">
      <div><div class="lbl">Freight</div><div class="amt">${formatINR(booking.freight_charge)}</div></div>
      <div><div class="lbl">Amount Paid</div><div class="amt">${formatINR(booking.amount_paid)}</div></div>
      <div><div class="lbl">Balance Due</div><div class="amt">${formatINR(Math.max((booking.freight_charge ?? 0) - (booking.amount_paid ?? 0), 0))}</div></div>
    </div>
    <div class="footer">Generated from the Customer Portal — GRTV Speed Parcel Service.</div>
    </body></html>
  `);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}

function shareTrackingViaWhatsApp(booking: Booking) {
  const statusLabel = STATUS_META[booking.status].label;
  const lines = [
    `📦 GRTV Speed Parcel Service — Shipment Update`,
    `Tracking ID: ${booking.tracking_id}`,
    `Status: ${statusLabel}`,
    `From: ${booking.pickup_address}`,
    `To: ${booking.delivery_address}`,
  ];
  if (booking.status !== 'delivered' && booking.delivery_otp) {
    lines.push(`Delivery OTP (share only with the receiver): ${booking.delivery_otp}`);
  }
  lines.push(`Track this shipment anytime from the Customer Portal.`);
  const text = encodeURIComponent(lines.join('\n'));
  window.open(`https://wa.me/?text=${text}`, '_blank');
}

const GOODS_TYPES = [
  'General', 'Fragile', 'Electronics', 'Machinery', 'FMCG', 'Clothes & Fabrics', 'Hazardous', 'Perishable',
];

function BookingFlow({ profile, hubs, onCreated, showToast, initialServiceType, prefillBooking, onPrefillConsumed }: {
  profile: Profile;
  hubs: Hub[];
  onCreated: () => void;
  showToast: (k: 'success' | 'error' | 'info', m: string) => void;
  initialServiceType?: ServiceType;
  prefillBooking?: Booking | null;
  onPrefillConsumed?: () => void;
}) {
  const [serviceType, setServiceType] = useState<ServiceType>(prefillBooking?.service_type ?? initialServiceType ?? 'ltl');
  const [pickup, setPickup] = useState(prefillBooking?.pickup_address ?? '');
  const [delivery, setDelivery] = useState(prefillBooking?.delivery_address ?? '');
  const [pickupCoord, setPickupCoord] = useState<{ lat: number; lng: number } | null>(
    prefillBooking?.pickup_lat != null ? { lat: prefillBooking.pickup_lat, lng: prefillBooking.pickup_lng! } : null
  );
  const [deliveryCoord, setDeliveryCoord] = useState<{ lat: number; lng: number } | null>(
    prefillBooking?.delivery_lat != null ? { lat: prefillBooking.delivery_lat, lng: prefillBooking.delivery_lng! } : null
  );
  const [consignorName, setConsignorName] = useState(prefillBooking?.consignor_name ?? profile.name);
  const [consignorPhone, setConsignorPhone] = useState(prefillBooking?.consignor_phone ?? profile.phone ?? '');
  const [consignorGstin, setConsignorGstin] = useState(prefillBooking?.consignor_gstin ?? '');
  const [consignorEmail, setConsignorEmail] = useState(prefillBooking?.consignor_email ?? profile.email ?? '');
  const [consignorPincode, setConsignorPincode] = useState(prefillBooking?.consignor_pincode ?? '');
  const [consignorCity, setConsignorCity] = useState(prefillBooking?.consignor_city ?? '');
  const [consignorState, setConsignorState] = useState(prefillBooking?.consignor_state ?? '');
  const [consigneeName, setConsigneeName] = useState(prefillBooking?.consignee_name ?? '');
  const [consigneePhone, setConsigneePhone] = useState(prefillBooking?.consignee_phone ?? '');
  const [consigneeGstin, setConsigneeGstin] = useState(prefillBooking?.consignee_gstin ?? '');
  const [consigneeContactPerson, setConsigneeContactPerson] = useState(prefillBooking?.consignee_contact_person ?? '');
  const [consigneePincode, setConsigneePincode] = useState(prefillBooking?.consignee_pincode ?? '');
  const [consigneeCity, setConsigneeCity] = useState(prefillBooking?.consignee_city ?? '');
  const [consigneeState, setConsigneeState] = useState(prefillBooking?.consignee_state ?? '');
  const [boxWeight, setBoxWeight] = useState<number>(prefillBooking?.weight_kg ?? 10);
  const [boxLength, setBoxLength] = useState<number>(prefillBooking?.length_cm ?? 40);
  const [boxWidth, setBoxWidth] = useState<number>(prefillBooking?.width_cm ?? 30);
  const [boxHeight, setBoxHeight] = useState<number>(prefillBooking?.height_cm ?? 25);
  const [boxDeclaredValue, setBoxDeclaredValue] = useState<number>(prefillBooking?.declared_value ?? 10000);
  const [items, setItems] = useState<ParcelItem[]>(
    prefillBooking?.parcel_details?.length ? prefillBooking.parcel_details : [{ description: '', quantity: 1 }]
  );
  const [goodsClass, setGoodsClass] = useState(prefillBooking?.goods_class ?? 'General');
  const [ewayBill, setEwayBill] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [savingAddressFor, setSavingAddressFor] = useState<'consignor' | 'consignee' | null>(null);
  const [newAddressLabel, setNewAddressLabel] = useState('');

  useEffect(() => {
    if (prefillBooking) {
      showToast('info', `Prefilled from ${prefillBooking.tracking_id}. Review the details and submit to book again.`);
      onPrefillConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAddresses = useCallback(async () => {
    const { data } = await supabase.from('saved_addresses').select('*').eq('customer_id', profile.id).order('is_default', { ascending: false }).order('created_at', { ascending: false });
    setSavedAddresses((data as SavedAddress[]) ?? []);
  }, [profile.id]);

  useEffect(() => { loadAddresses(); }, [loadAddresses]);

  function applyAddress(role: 'consignor' | 'consignee', addr: SavedAddress) {
    if (role === 'consignor') {
      setConsignorName(addr.contact_name || consignorName);
      setConsignorPhone(addr.phone || consignorPhone);
      handlePickup(addr.address);
      setConsignorPincode(addr.pincode ?? '');
      setConsignorCity(addr.city ?? '');
      setConsignorState(addr.state ?? '');
    } else {
      setConsigneeName(addr.contact_name || consigneeName);
      setConsigneePhone(addr.phone || consigneePhone);
      handleDelivery(addr.address);
      setConsigneePincode(addr.pincode ?? '');
      setConsigneeCity(addr.city ?? '');
      setConsigneeState(addr.state ?? '');
    }
  }

  async function saveCurrentAddress(role: 'consignor' | 'consignee') {
    if (!newAddressLabel.trim()) { showToast('error', 'Give this address a label, e.g. "Home" or "Office".'); return; }
    const isConsignor = role === 'consignor';
    const addr = isConsignor ? pickup : delivery;
    if (!addr) { showToast('error', 'Fill in the address before saving it.'); return; }
    const { error } = await supabase.from('saved_addresses').insert({
      customer_id: profile.id,
      label: newAddressLabel.trim(),
      contact_name: isConsignor ? consignorName : consigneeName,
      phone: isConsignor ? consignorPhone : consigneePhone,
      address: addr,
      city: isConsignor ? consignorCity : consigneeCity,
      state: isConsignor ? consignorState : consigneeState,
      pincode: isConsignor ? consignorPincode : consigneePincode,
    });
    if (error) { showToast('error', 'Could not save address: ' + error.message); return; }
    showToast('success', 'Address saved for next time.');
    setNewAddressLabel('');
    setSavingAddressFor(null);
    loadAddresses();
  }

  async function deleteAddress(id: string) {
    await supabase.from('saved_addresses').delete().eq('id', id);
    loadAddresses();
  }

  function handlePickup(v: string) { setPickup(v); setPickupCoord(resolveCoord(v)); }
  function handleDelivery(v: string) { setDelivery(v); setDeliveryCoord(resolveCoord(v)); }

  function updateItem(i: number, field: keyof ParcelItem, value: string | number) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)));
  }
  function addItem() {
    setItems((prev) => [...prev, { description: '', quantity: 1 }]);
  }
  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  const distanceKm = pickupCoord && deliveryCoord
    ? estimateRoadKm(pickupCoord.lat, pickupCoord.lng, deliveryCoord.lat, deliveryCoord.lng)
    : 0;

  const totalItemQty = items.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
  const totalVolume = (boxLength * boxWidth * boxHeight) / 1_000_000;

  const mapPoints: { lat: number; lng: number; label: string; color: string }[] = [];
  if (pickupCoord) mapPoints.push({ lat: pickupCoord.lat, lng: pickupCoord.lng, label: 'Pickup', color: '#10b981' });
  if (deliveryCoord) mapPoints.push({ lat: deliveryCoord.lat, lng: deliveryCoord.lng, label: 'Delivery', color: '#ef4444' });

  function validate(): string | null {
    if (!serviceType) return 'Select a service type.';
    if (!consignorName || !consignorPhone) return 'Fill in consignor name and phone.';
    if (!pickup) return 'Enter pickup location.';
    if (!consigneeName || !consigneePhone) return 'Fill in consignee name and phone.';
    if (!delivery) return 'Enter delivery location.';
    if (boxWeight <= 0) return 'Enter the total weight of the box.';
    if (items.some((it) => !it.description || it.quantity <= 0)) return "Add a description and quantity for every item in the box.";
    if (serviceType === 'ftl' && !ewayBill) return 'E-Way Bill is required for FTL bookings.';
    return null;
  }

  async function submit() {
    const err = validate();
    if (err) { showToast('error', err); return; }
    setSubmitting(true);
    const trackingId = genTrackingId();
    const otp = genOTP();
    const hub = hubs[0];
    const { error } = await supabase.from('bookings').insert({
      tracking_id: trackingId,
      customer_id: profile.id,
      service_type: serviceType,
      status: 'pending',
      pickup_address: pickup,
      delivery_address: delivery,
      pickup_lat: pickupCoord?.lat ?? null,
      pickup_lng: pickupCoord?.lng ?? null,
      delivery_lat: deliveryCoord?.lat ?? null,
      delivery_lng: deliveryCoord?.lng ?? null,
      distance_km: distanceKm || null,
      weight_kg: boxWeight,
      length_cm: boxLength, width_cm: boxWidth, height_cm: boxHeight,
      goods_class: goodsClass,
      declared_value: boxDeclaredValue,
      eway_bill_number: serviceType === 'ftl' ? ewayBill : null,
      doorstep_pickup: false,
      delivery_type: 'godown',
      consignor_name: consignorName,
      consignor_phone: consignorPhone,
      consignor_gstin: consignorGstin || null,
      consignor_email: consignorEmail || null,
      consignor_pincode: consignorPincode || null,
      consignor_city: consignorCity || null,
      consignor_state: consignorState || null,
      consignee_name: consigneeName,
      consignee_phone: consigneePhone,
      consignee_gstin: consigneeGstin || null,
      consignee_contact_person: consigneeContactPerson || null,
      consignee_pincode: consigneePincode || null,
      consignee_city: consigneeCity || null,
      consignee_state: consigneeState || null,
      parcel_count: totalItemQty,
      parcel_details: items,
      current_hub_id: hub?.id ?? null,
      delivery_otp: otp,
      eta: new Date(Date.now() + 2 * 86400000).toISOString(),
    });
    if (error) { showToast('error', 'Booking failed: ' + error.message); setSubmitting(false); return; }

    const { data: newBooking } = await supabase.from('bookings').select('id').eq('tracking_id', trackingId).maybeSingle();
    if (newBooking) {
      await supabase.from('tracking_logs').insert({
        booking_id: newBooking.id, status: 'pending', hub_id: hub?.id ?? null,
        note: 'Pickup request submitted by customer', lat: pickupCoord?.lat ?? null, lng: pickupCoord?.lng ?? null,
      });
    }
    showToast('success', `Pickup request submitted! Tracking ID: ${trackingId}`);
    setSubmitting(false);
    onCreated();
    setPickup(''); setDelivery(''); setPickupCoord(null); setDeliveryCoord(null);
    setConsigneeName(''); setConsigneePhone(''); setConsigneeGstin(''); setConsigneeContactPerson('');
    setConsigneePincode(''); setConsigneeCity(''); setConsigneeState(''); setEwayBill('');
    setParcels([{ description: '', weight_kg: 10, length_cm: 40, width_cm: 30, height_cm: 25, declared_value: 10000 }]);
  }

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6 animate-fade-in">
      <div className="space-y-5">
        {/* Service type selector */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center"><Truck className="w-4 h-4 text-brand-600" /></div>
            <div>
              <p className="font-bold text-ink-800 text-sm">Service Type</p>
              <p className="text-[11px] text-ink-400">Choose your shipment service</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {([
              { k: 'ltl' as const, label: 'General Parcel / LTL', desc: 'Multiple parcels, shared transport', icon: Package },
              { k: 'ftl' as const, label: 'Full Truckload (FTL)', desc: 'Dedicated vehicle for bulk', icon: Truck },
            ]).map((s) => {
              const Icon = s.icon;
              const active = serviceType === s.k;
              return (
                <button key={s.k} onClick={() => setServiceType(s.k)}
                  className={`text-left p-4 rounded-2xl border-2 transition-all ${active ? 'border-brand-500 bg-brand-50 shadow-md' : 'border-ink-100 hover:border-ink-200 hover:bg-ink-50/50'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${active ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-400'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className={`font-bold text-sm ${active ? 'text-brand-700' : 'text-ink-700'}`}>{s.label}</p>
                      <p className="text-xs text-ink-400">{s.desc}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Consignor Details */}
        <div className="card p-4 sm:p-6 space-y-4">
          <SectionHeader icon={UserIcon} title="Consignor Details" subtitle="Who is sending the parcel" color="brand" />
          <SavedAddressBar
            addresses={savedAddresses}
            onSelect={(a) => applyAddress('consignor', a)}
            onDelete={deleteAddress}
            saving={savingAddressFor === 'consignor'}
            onStartSave={() => setSavingAddressFor('consignor')}
            onCancelSave={() => { setSavingAddressFor(null); setNewAddressLabel(''); }}
            label={newAddressLabel}
            onLabelChange={setNewAddressLabel}
            onConfirmSave={() => saveCurrentAddress('consignor')}
          />
          <div className="grid sm:grid-cols-2 gap-3">
            <FormField label="Sender Name" required>
              <input className="input" value={consignorName} onChange={(e) => setConsignorName(e.target.value)} />
            </FormField>
            <FormField label="Mobile Number" required>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                <input className="input pl-9" placeholder="10-digit mobile" value={consignorPhone} onChange={(e) => setConsignorPhone(e.target.value)} />
              </div>
            </FormField>
            <FormField label="GSTIN (optional)">
              <input className="input font-mono uppercase" placeholder="22AAAAA0000A1Z5" maxLength={15} value={consignorGstin} onChange={(e) => setConsignorGstin(e.target.value.toUpperCase())} />
            </FormField>
            <FormField label="Email (optional)">
              <input className="input" placeholder="name@email.com" value={consignorEmail} onChange={(e) => setConsignorEmail(e.target.value)} />
            </FormField>
          </div>
          <FormField label="Pickup Address" required>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-success-500" />
              <input className="input pl-9" placeholder="Full pickup address" value={pickup} onChange={(e) => handlePickup(e.target.value)} />
            </div>
          </FormField>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Pincode">
              <input className="input" placeholder="400001" maxLength={6} value={consignorPincode} onChange={(e) => setConsignorPincode(e.target.value)} />
            </FormField>
            <FormField label="City">
              <input className="input" placeholder="Mumbai" value={consignorCity} onChange={(e) => setConsignorCity(e.target.value)} />
            </FormField>
            <FormField label="State">
              <input className="input" placeholder="Maharashtra" value={consignorState} onChange={(e) => setConsignorState(e.target.value)} />
            </FormField>
          </div>
        </div>

        {/* Arrow divider */}
        <div className="flex justify-center -my-1">
          <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center">
            <ArrowRight className="w-4 h-4 text-brand-600 rotate-90" />
          </div>
        </div>

        {/* Consignee Details */}
        <div className="card p-4 sm:p-6 space-y-4">
          <SectionHeader icon={UserIcon} title="Consignee Details" subtitle="Who is receiving the parcel" color="danger" />
          <SavedAddressBar
            addresses={savedAddresses}
            onSelect={(a) => applyAddress('consignee', a)}
            onDelete={deleteAddress}
            saving={savingAddressFor === 'consignee'}
            onStartSave={() => setSavingAddressFor('consignee')}
            onCancelSave={() => { setSavingAddressFor(null); setNewAddressLabel(''); }}
            label={newAddressLabel}
            onLabelChange={setNewAddressLabel}
            onConfirmSave={() => saveCurrentAddress('consignee')}
          />
          <div className="grid sm:grid-cols-2 gap-3">
            <FormField label="Receiver Name" required>
              <input className="input" placeholder="Consignee name" value={consigneeName} onChange={(e) => setConsigneeName(e.target.value)} />
            </FormField>
            <FormField label="Contact Person">
              <input className="input" placeholder="Person to contact at destination" value={consigneeContactPerson} onChange={(e) => setConsigneeContactPerson(e.target.value)} />
            </FormField>
            <FormField label="Mobile Number" required>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                <input className="input pl-9" placeholder="10-digit mobile" value={consigneePhone} onChange={(e) => setConsigneePhone(e.target.value)} />
              </div>
            </FormField>
            <FormField label="GSTIN (optional)">
              <input className="input font-mono uppercase" placeholder="22AAAAA0000A1Z5" maxLength={15} value={consigneeGstin} onChange={(e) => setConsigneeGstin(e.target.value.toUpperCase())} />
            </FormField>
          </div>
          <FormField label="Delivery Address" required>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-danger-500" />
              <input className="input pl-9" placeholder="Full delivery address" value={delivery} onChange={(e) => handleDelivery(e.target.value)} />
            </div>
          </FormField>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Pincode">
              <input className="input" placeholder="110001" maxLength={6} value={consigneePincode} onChange={(e) => setConsigneePincode(e.target.value)} />
            </FormField>
            <FormField label="City">
              <input className="input" placeholder="Delhi" value={consigneeCity} onChange={(e) => setConsigneeCity(e.target.value)} />
            </FormField>
            <FormField label="State">
              <input className="input" placeholder="Delhi" value={consigneeState} onChange={(e) => setConsigneeState(e.target.value)} />
            </FormField>
          </div>
          {mapPoints.length > 0 && <RouteMap points={mapPoints} height={160} />}
        </div>

        {/* Package Details */}
        <div className="card p-4 sm:p-6 space-y-4">
          <SectionHeader icon={Package} title="Package Details" subtitle="One box, with everything inside it" color="accent" />

          <div>
            <p className="label">Goods Classification</p>
            <div className="flex flex-wrap gap-2">
              {GOODS_TYPES.map((g) => (
                <button key={g} onClick={() => setGoodsClass(g)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${goodsClass === g ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'}`}>
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* One box: overall weight, dimensions, declared value */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <p className="label">Weight (kg)</p>
              <input type="number" className="input" value={boxWeight} onChange={(e) => setBoxWeight(+e.target.value)} />
            </div>
            <div>
              <p className="label">Length (cm)</p>
              <input type="number" className="input" value={boxLength} onChange={(e) => setBoxLength(+e.target.value)} />
            </div>
            <div>
              <p className="label">Width (cm)</p>
              <input type="number" className="input" value={boxWidth} onChange={(e) => setBoxWidth(+e.target.value)} />
            </div>
            <div>
              <p className="label">Height (cm)</p>
              <input type="number" className="input" value={boxHeight} onChange={(e) => setBoxHeight(+e.target.value)} />
            </div>
          </div>
          <div>
            <p className="label">Declared Value (₹)</p>
            <input type="number" className="input" value={boxDeclaredValue} onChange={(e) => setBoxDeclaredValue(+e.target.value)} />
          </div>

          {/* Contents inside this one box */}
          <div className="p-4 rounded-xl bg-ink-50 border border-ink-100 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold text-ink-500">What's Inside This Box</p>
              <button onClick={addItem} className="btn-secondary text-xs !py-1.5 !px-3"><Plus className="w-3.5 h-3.5" /> Add Item</button>
            </div>
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    className="input flex-1"
                    placeholder="e.g. Books, Clothes, Electronics"
                    value={it.description}
                    onChange={(e) => updateItem(i, 'description', e.target.value)}
                  />
                  <input
                    type="number"
                    className="input w-20 sm:w-24 shrink-0"
                    placeholder="Qty"
                    value={it.quantity}
                    onChange={(e) => updateItem(i, 'quantity', +e.target.value)}
                  />
                  <button onClick={() => removeItem(i)} disabled={items.length === 1} className="text-ink-400 hover:text-danger-500 disabled:opacity-30 shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-ink-400">Total items in this box: {totalItemQty}</p>
          </div>

          {serviceType === 'ftl' && (
            <div className="p-4 rounded-xl bg-accent-500/5 border border-l-4 border-l-accent-500 space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-accent-600" />
                <p className="font-bold text-ink-800 text-sm">E-Way Bill (Required for FTL)</p>
              </div>
              <input className="input" placeholder="Enter Government E-Way Bill Number" value={ewayBill} onChange={(e) => setEwayBill(e.target.value)} />
              <div className="flex items-center gap-2 text-xs text-ink-400">
                <ShieldCheck className="w-4 h-4 text-success-500" /> Verified against GST portal for legal compliance.
              </div>
            </div>
          )}
        </div>

        {/* Submit button */}
        <button onClick={submit} disabled={submitting} className="btn-primary w-full py-3.5 text-base">
          {submitting ? 'Submitting…' : 'Request Pickup'} <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      {/* Shipment summary sidebar */}
      <div className="space-y-4">
        <div className="card p-5 sticky top-24">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-brand-600" />
            <p className="font-bold text-ink-800">Shipment Summary</p>
          </div>
          <div className="space-y-2.5 text-sm">
            <Row label="Service" value={serviceType === 'ltl' ? 'LTL' : 'FTL'} />
            <Row label="Distance" value={distanceKm ? `${distanceKm} km` : '—'} />
            <Row label="Items in Box" value={String(totalItemQty)} />
            <Row label="Total Weight" value={`${boxWeight} kg`} />
            <Row label="Total Volume" value={`${totalVolume.toFixed(2)} m³`} />
          </div>
          <div className="border-t border-ink-100 my-4" />
          <div className="p-3 rounded-xl bg-brand-50 border border-brand-100">
            <p className="text-xs font-semibold text-brand-700">Owner will review your request</p>
            <p className="text-[11px] text-brand-600 mt-1">Once approved, you'll receive pickup details or branch drop-off instructions.</p>
          </div>
          <p className="text-[11px] text-ink-400 text-center mt-2">Godown delivery · No doorstep delivery</p>
        </div>
      </div>
    </div>
  );
}

function SavedAddressBar({ addresses, onSelect, onDelete, saving, onStartSave, onCancelSave, label, onLabelChange, onConfirmSave }: {
  addresses: SavedAddress[];
  onSelect: (a: SavedAddress) => void;
  onDelete: (id: string) => void;
  saving: boolean;
  onStartSave: () => void;
  onCancelSave: () => void;
  label: string;
  onLabelChange: (v: string) => void;
  onConfirmSave: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1">
        {addresses.map((a) => (
          <div key={a.id} className="group relative shrink-0">
            <button
              onClick={() => onSelect(a)}
              className="flex items-center gap-1.5 pl-2.5 pr-7 py-1.5 rounded-full border border-ink-200 bg-white hover:border-brand-400 hover:bg-brand-50 text-xs font-semibold text-ink-700 transition whitespace-nowrap"
            >
              <Bookmark className="w-3 h-3 text-brand-500 shrink-0" /> {a.label}
              {a.city && <span className="text-ink-400 font-normal">· {a.city}</span>}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(a.id); }}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-ink-300 hover:text-danger-500 transition"
              title="Remove saved address"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {!saving && (
          <button onClick={onStartSave} className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-dashed border-ink-300 text-xs font-semibold text-ink-500 hover:border-brand-400 hover:text-brand-600 transition whitespace-nowrap">
            <BookmarkPlus className="w-3 h-3" /> Save current as…
          </button>
        )}
      </div>
      {saving && (
        <div className="flex items-center gap-2 p-2 rounded-xl bg-brand-50 border border-brand-100">
          <input
            autoFocus
            className="input !py-1.5 text-sm flex-1"
            placeholder='Label, e.g. "Home" or "Office"'
            value={label}
            onChange={(e) => onLabelChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onConfirmSave()}
          />
          <button onClick={onConfirmSave} className="btn-primary !py-1.5 !px-3 text-xs shrink-0">Save</button>
          <button onClick={onCancelSave} className="btn-ghost !py-1.5 !px-2 text-xs shrink-0"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><span className="text-ink-500">{label}</span><span className="font-semibold text-ink-800">{value}</span></div>;
}

function SectionHeader({ icon: Icon, title, subtitle, color }: { icon: typeof Truck; title: string; subtitle: string; color: 'brand' | 'danger' | 'accent' }) {
  const colorMap = { brand: 'bg-brand-100 text-brand-600', danger: 'bg-danger-100 text-danger-600', accent: 'bg-accent-500/15 text-accent-600' };
  return (
    <div className="flex items-center gap-2 mb-1">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colorMap[color]}`}><Icon className="w-4 h-4" /></div>
      <div>
        <p className="font-bold text-ink-800 text-sm">{title}</p>
        <p className="text-[11px] text-ink-400">{subtitle}</p>
      </div>
    </div>
  );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <p className="label">{label}{required && <span className="text-danger-500"> *</span>}</p>
      {children}
    </div>
  );
}

/* ---------- Shipments List + Tracking ---------- */

function ShipmentsList({ bookings, hubs, profile, onUpdated, onRebook, showToast }: {
  bookings: Booking[];
  hubs: Hub[];
  profile: Profile;
  onUpdated: () => void;
  onRebook: (b: Booking) => void;
  showToast: (k: 'success' | 'error' | 'info', m: string) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);

  if (bookings.length === 0) {
    return <EmptyState icon={<Package className="w-7 h-7" />} title="No shipments yet" desc="Create a pickup request to see it tracked here in real time." />;
  }

  return (
    <div className="space-y-3 animate-fade-in">
      {bookings.map((b) => {
        const meta = STATUS_META[b.status];
        const expanded = open === b.id;
        return (
          <div key={b.id} className="card overflow-hidden">
            <button onClick={() => setOpen(expanded ? null : b.id)} className="w-full p-4 flex items-center justify-between gap-4 text-left hover:bg-ink-50/50 transition">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${meta.color}`}>
                  <Truck className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-ink-900 text-sm font-mono">{b.tracking_id}</p>
                  <p className="text-xs text-ink-500 truncate">{b.pickup_address} → {b.delivery_address}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`chip ${meta.color}`}><span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />{meta.label}</span>
                <ChevronDown className={`w-4 h-4 text-ink-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {/* Quick actions */}
            <div className="flex flex-wrap gap-2 px-4 pb-3">
              <button onClick={() => onRebook(b)} className="btn-secondary !py-1.5 !px-3 text-xs">
                <RotateCcw className="w-3.5 h-3.5" /> Book Again
              </button>
              <button onClick={() => printBookingReceipt(b)} className="btn-secondary !py-1.5 !px-3 text-xs">
                <Download className="w-3.5 h-3.5" /> Receipt
              </button>
              <button onClick={() => shareTrackingViaWhatsApp(b)} className="btn-secondary !py-1.5 !px-3 text-xs">
                <MessageCircle className="w-3.5 h-3.5" /> Share
              </button>
              {b.status === 'delivered' && !b.rating && (
                <span className="ml-auto chip bg-accent-400/15 text-accent-700 !py-1.5">
                  <Star className="w-3 h-3" /> Rate this delivery below
                </span>
              )}
            </div>

            {expanded && <TrackingDetail booking={b} hubs={hubs} onUpdated={onUpdated} showToast={showToast} />}
          </div>
        );
      })}
    </div>
  );
}

function RatingWidget({ booking, onUpdated, showToast }: { booking: Booking; onUpdated: () => void; showToast: (k: 'success' | 'error' | 'info', m: string) => void }) {
  const [hover, setHover] = useState(0);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (booking.rating) {
    return (
      <div className="p-4 rounded-xl bg-success-50 border border-success-100">
        <div className="flex items-center gap-2">
          <p className="text-xs font-bold text-success-700">Your Rating</p>
          <div className="flex">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} className={`w-4 h-4 ${n <= (booking.rating ?? 0) ? 'fill-accent-400 text-accent-400' : 'text-ink-200'}`} />
            ))}
          </div>
        </div>
        {booking.rating_comment && <p className="text-sm text-success-700 mt-1.5">"{booking.rating_comment}"</p>}
        <p className="text-[11px] text-success-600 mt-1">Thanks for the feedback — submitted {formatDate(booking.rated_at)}.</p>
      </div>
    );
  }

  async function submit() {
    if (rating === 0) { showToast('error', 'Pick a star rating first.'); return; }
    setSubmitting(true);
    const { error } = await supabase.from('bookings').update({
      rating, rating_comment: comment || null, rated_at: new Date().toISOString(),
    }).eq('id', booking.id);
    setSubmitting(false);
    if (error) { showToast('error', 'Could not submit rating: ' + error.message); return; }
    showToast('success', 'Thanks for rating your delivery!');
    onUpdated();
  }

  return (
    <div className="p-4 rounded-xl bg-brand-50 border border-brand-100">
      <p className="text-sm font-bold text-brand-800 mb-2">How was this delivery?</p>
      <div className="flex gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} onClick={() => setRating(n)} className="p-0.5">
            <Star className={`w-7 h-7 transition ${n <= (hover || rating) ? 'fill-accent-400 text-accent-400' : 'text-ink-200'}`} />
          </button>
        ))}
      </div>
      <textarea
        className="input text-sm resize-none"
        rows={2}
        placeholder="Optional feedback about your delivery experience…"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <button onClick={submit} disabled={submitting} className="btn-primary text-xs mt-2 !py-1.5 !px-4">
        {submitting ? 'Submitting…' : 'Submit Rating'}
      </button>
    </div>
  );
}

function TrackingDetail({ booking, hubs, onUpdated, showToast }: { booking: Booking; hubs: Hub[]; onUpdated: () => void; showToast: (k: 'success' | 'error' | 'info', m: string) => void }) {
  const [logs, setLogs] = useState<TrackingLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('tracking_logs').select('*').eq('booking_id', booking.id).order('created_at', { ascending: true });
      setLogs((data as TrackingLog[]) ?? []);
      setLoading(false);
    })();
  }, [booking.id]);

  const current = stepIndex(booking.status);
  const hubMap = new Map(hubs.map((h) => [h.id, h]));

  const mapPoints = [];
  if (booking.pickup_lat) mapPoints.push({ lat: booking.pickup_lat, lng: booking.pickup_lng!, label: 'Pickup', color: '#10b981' });
  if (booking.delivery_lat) mapPoints.push({ lat: booking.delivery_lat, lng: booking.delivery_lng!, label: 'Delivery', color: '#ef4444', pulse: booking.status === 'in_transit' });

  return (
    <div className="border-t border-ink-100 p-5 grid lg:grid-cols-2 gap-6 animate-fade-in">
      <div>
        <p className="label">Progress</p>
        <div className="relative">
          {TRACKING_STEPS.map((step, i) => {
            const done = i <= current;
            const active = i === current && booking.status !== 'delivered' && booking.status !== 'cancelled';
            const log = logs.find((l) => l.status === step.key);
            return (
              <div key={step.key} className="flex gap-3 pb-5 last:pb-0 relative">
                {i < TRACKING_STEPS.length - 1 && (
                  <div className={`absolute left-[15px] top-8 bottom-0 w-0.5 ${done && i < current ? 'bg-brand-500' : 'bg-ink-100'}`} />
                )}
                <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition ${
                  done ? 'bg-brand-600 text-white' : active ? 'bg-accent-500 text-white animate-pulse-soft' : 'bg-ink-100 text-ink-400'
                }`}>
                  {done ? <CheckCircle2 className="w-5 h-5" /> : <span className="text-xs font-bold">{i + 1}</span>}
                </div>
                <div className="pt-1">
                  <p className={`font-semibold text-sm ${done ? 'text-ink-900' : 'text-ink-400'}`}>{step.label}</p>
                  {log && <p className="text-xs text-ink-400 mt-0.5">{formatDateTime(log.created_at)}</p>}
                  {log?.note && <p className="text-xs text-ink-500 mt-1">{log.note}</p>}
                </div>
              </div>
            );
          })}
        </div>
        {booking.delay_reason && (
          <div className="mt-4 p-3 rounded-xl bg-warning-50 border border-warning-100 flex items-start gap-2">
            <Clock className="w-4 h-4 text-warning-600 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-warning-700">Delay Reported: {booking.delay_reason}</p>
              {booking.delay_note && <p className="text-xs text-warning-600 mt-0.5">{booking.delay_note}</p>}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {mapPoints.length > 0 && <RouteMap points={mapPoints} height={200} />}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Detail label="Service" value={booking.service_type === 'ltl' ? 'LTL' : 'FTL'} />
          <Detail label="Parcels" value={String(booking.parcel_count)} />
          <Detail label="Total Weight" value={`${booking.weight_kg} kg`} />
          <Detail label="Distance" value={booking.distance_km ? `${booking.distance_km} km` : '—'} />
          <Detail label="ETA" value={formatDate(booking.eta)} />
          <Detail label="Consignor" value={booking.consignor_name ?? '—'} />
          <Detail label="Consignee" value={booking.consignee_name ?? '—'} />
        </div>
        {booking.approval_message && (
          <div className={`p-4 rounded-xl border flex items-start gap-3 ${booking.approval_type === 'rejected' ? 'bg-danger-50 border-danger-100' : 'bg-brand-50 border-brand-100'}`}>
            <ShieldCheck className={`w-5 h-5 shrink-0 mt-0.5 ${booking.approval_type === 'rejected' ? 'text-danger-600' : 'text-brand-600'}`} />
            <div>
              <p className={`text-xs font-bold ${booking.approval_type === 'rejected' ? 'text-danger-700' : 'text-brand-700'}`}>{booking.approval_type === 'rejected' ? 'Request Rejected' : 'Pickup Approved'}</p>
              <p className={`text-sm mt-1 ${booking.approval_type === 'rejected' ? 'text-danger-600' : 'text-brand-700'}`}>{booking.approval_type === 'rejected' ? (booking.rejected_message ?? booking.approval_message) : booking.approval_message}</p>
              {booking.approval_type === 'pickup' && booking.pickup_datetime && (
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-brand-600">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {formatDateTime(booking.pickup_datetime)}</span>
                  {booking.pickup_phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {booking.pickup_phone}</span>}
                </div>
              )}
              {booking.approval_type === 'branch' && booking.branch_phone && (
                <div className="mt-2 flex items-center gap-1 text-xs text-accent-600">
                  <Phone className="w-3.5 h-3.5" /> Branch phone: {booking.branch_phone}
                </div>
              )}
            </div>
          </div>
        )}

        {booking.delivery_otp && booking.status !== 'delivered' && (
          <div className="p-3 rounded-xl bg-brand-50 border border-brand-100 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-brand-600" />
            <div>
              <p className="text-xs font-semibold text-brand-700">Delivery OTP</p>
              <p className="text-lg font-mono font-bold text-brand-800 tracking-widest">{booking.delivery_otp}</p>
            </div>
          </div>
        )}

        {booking.status === 'delivered' && (
          <RatingWidget booking={booking} onUpdated={onUpdated} showToast={showToast} />
        )}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl bg-ink-50">
      <p className="text-[11px] text-ink-400 uppercase tracking-wide font-semibold">{label}</p>
      <p className="font-semibold text-ink-800 mt-0.5">{value}</p>
    </div>
  );
}

/* ---------- Alerts View ---------- */

function AlertsView({ bookings }: { bookings: Booking[] }) {
  const alerts = bookings
    .filter((b) => b.status !== 'cancelled')
    .map((b) => {
      const meta = STATUS_META[b.status as BookingStatus];
      let msg = '';
      if (b.status === 'pending') msg = `Pickup request submitted. Awaiting owner approval for ${b.tracking_id}.`;
      else if (b.status === 'placed') msg = b.approval_type === 'branch' ? `Pickup approved! Please take your parcel to the branch. ${b.approval_message ?? ''}` : `Pickup approved! ${b.approval_message ?? ''}`;
      else if (b.status === 'picked_up') msg = `Your parcel has been picked up. Track with ${b.tracking_id}.`;
      else if (b.status === 'in_transit') msg = `Your parcel is in transit. Current hub updates available.`;
      else if (b.status === 'out_for_delivery') msg = `Out for delivery! Collect from godown. OTP: ${b.delivery_otp}`;
      else if (b.status === 'delivered') msg = `Delivered successfully at godown. Thank you for choosing GRTV Speed Parcel Service.`;
      return { id: b.id, tracking_id: b.tracking_id, status: b.status, msg, color: meta.color, dot: meta.dot, created: b.updated_at };
    });

  if (alerts.length === 0) {
    return <EmptyState icon={<Bell className="w-7 h-7" />} title="No alerts yet" desc="SMS and WhatsApp notifications will appear here as your shipments progress." />;
  }

  return (
    <div className="space-y-3 max-w-2xl animate-fade-in">
      <p className="text-xs text-ink-400 flex items-center gap-1.5 mb-2">
        <Bell className="w-3.5 h-3.5" /> Automated SMS / WhatsApp alerts sent at key milestones.
      </p>
      {alerts.map((a) => (
        <div key={a.id} className="card p-4 flex gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${a.color}`}>
            <Bell className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm text-ink-800">{a.tracking_id}</p>
              <span className={`chip ${a.color}`}><span className={`w-1.5 h-1.5 rounded-full ${a.dot}`} />{STATUS_META[a.status as BookingStatus].label}</span>
            </div>
            <p className="text-sm text-ink-600 mt-1">{a.msg}</p>
            <p className="text-[11px] text-ink-400 mt-1.5">{formatDateTime(a.created)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
