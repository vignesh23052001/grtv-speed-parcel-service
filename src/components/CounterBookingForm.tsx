import { useState } from 'react';
import {
  Plus, Trash2, User as UserIcon, Phone, MapPin, Package, FileText, Download, CheckCircle2, RotateCcw, Wallet,
} from 'lucide-react';
import type { Booking, Hub, ParcelItem, Profile, ServiceType } from '../lib/types';
import { supabase } from '../lib/supabase';
import { estimateRoadKm } from '../lib/rate';
import { formatINR, formatDate, genTrackingId, genOTP } from '../lib/ui';
import { Select } from './ui';

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

const GOODS_TYPES = ['General', 'Fragile', 'Electronics', 'Machinery', 'FMCG', 'Clothes & Fabrics', 'Hazardous', 'Perishable'];
type PaymentStatus = 'unpaid' | 'partial' | 'paid';

interface CounterBookingFormProps {
  staffProfile: Profile;
  hubs: Hub[];
  onCreated: () => void;
  showToast: (k: 'success' | 'error' | 'info', m: string) => void;
}

export default function CounterBookingForm({ staffProfile, hubs, onCreated, showToast }: CounterBookingFormProps) {
  const [serviceType, setServiceType] = useState<ServiceType>('ltl');
  const [hubId, setHubId] = useState(hubs[0]?.id ?? '');
  const [pickup, setPickup] = useState('');
  const [delivery, setDelivery] = useState('');
  const [consignorName, setConsignorName] = useState('');
  const [consignorPhone, setConsignorPhone] = useState('');
  const [consigneeName, setConsigneeName] = useState('');
  const [consigneePhone, setConsigneePhone] = useState('');
  const [boxWeight, setBoxWeight] = useState<number>(10);
  const [boxLength, setBoxLength] = useState<number>(40);
  const [boxWidth, setBoxWidth] = useState<number>(30);
  const [boxHeight, setBoxHeight] = useState<number>(25);
  const [boxDeclaredValue, setBoxDeclaredValue] = useState<number>(10000);
  const [items, setItems] = useState<ParcelItem[]>([{ description: '', quantity: 1 }]);
  const [goodsClass, setGoodsClass] = useState('General');
  const [ewayBill, setEwayBill] = useState('');
  const [freightAmount, setFreightAmount] = useState<number>(0);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('unpaid');
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<Booking | null>(null);

  function updateItem(i: number, field: keyof ParcelItem, value: string | number) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)));
  }
  function addItem() {
    setItems((prev) => [...prev, { description: '', quantity: 1 }]);
  }
  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  function changePaymentStatus(status: PaymentStatus) {
    setPaymentStatus(status);
    if (status === 'unpaid') setAmountPaid(0);
    if (status === 'paid') setAmountPaid(freightAmount);
    if (status === 'partial' && amountPaid >= freightAmount) setAmountPaid(0);
  }

  const totalItemQty = items.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
  const pickupCoord = resolveCoord(pickup);
  const deliveryCoord = resolveCoord(delivery);
  const distanceKm = pickupCoord && deliveryCoord ? estimateRoadKm(pickupCoord.lat, pickupCoord.lng, deliveryCoord.lat, deliveryCoord.lng) : 0;
  const finalAmountPaid = paymentStatus === 'unpaid' ? 0 : paymentStatus === 'paid' ? freightAmount : amountPaid;
  const balance = Math.max(freightAmount - finalAmountPaid, 0);

  function resetForm() {
    setPickup(''); setDelivery('');
    setConsignorName(''); setConsignorPhone('');
    setConsigneeName(''); setConsigneePhone('');
    setBoxWeight(10); setBoxLength(40); setBoxWidth(30); setBoxHeight(25); setBoxDeclaredValue(10000);
    setItems([{ description: '', quantity: 1 }]);
    setGoodsClass('General'); setEwayBill('');
    setFreightAmount(0); setPaymentStatus('unpaid'); setAmountPaid(0);
    setCreated(null);
  }

  function validate(): string | null {
    if (!hubId) return 'Select the receiving hub/branch.';
    if (!consignorName || !consignorPhone) return "Fill in the sender's name and phone.";
    if (!pickup) return 'Enter pickup location.';
    if (!consigneeName || !consigneePhone) return "Fill in the receiver's name and phone.";
    if (!delivery) return 'Enter delivery location.';
    if (boxWeight <= 0) return 'Enter the total weight of the box.';
    if (items.some((it) => !it.description || it.quantity <= 0)) return 'Add a description and quantity for every item in the box.';
    if (serviceType === 'ftl' && !ewayBill) return 'E-Way Bill is required for FTL bookings.';
    if (freightAmount <= 0) return 'Enter the freight amount for this booking.';
    if (paymentStatus === 'partial' && (amountPaid <= 0 || amountPaid >= freightAmount)) return 'Enter a partial amount that is less than the total freight.';
    return null;
  }

  async function submit() {
    const err = validate();
    if (err) { showToast('error', err); return; }
    setSubmitting(true);
    const trackingId = genTrackingId();
    const otp = genOTP();

    // If the sender's or receiver's phone matches a registered customer account,
    // link this booking to them so it shows up in their "My Shipments" automatically.
    // Otherwise it stays unlinked and can still be checked via the public Track page.
    let matchedCustomerId: string | null = null;
    const phonesToCheck = [consignorPhone, consigneePhone].map((p) => p.replace(/\D/g, '')).filter((p) => p.length >= 8);
    if (phonesToCheck.length > 0) {
      const { data: candidateProfiles } = await supabase.from('profiles').select('id, phone').eq('role', 'customer');
      const match = (candidateProfiles ?? []).find((p) => {
        const digits = (p.phone ?? '').replace(/\D/g, '');
        return digits.length >= 8 && phonesToCheck.includes(digits);
      });
      matchedCustomerId = match?.id ?? null;
    }

    const { error } = await supabase.from('bookings').insert({
      tracking_id: trackingId,
      customer_id: matchedCustomerId,
      created_by: staffProfile.id,
      booking_source: 'counter',
      service_type: serviceType,
      status: 'placed',
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
      freight_charge: freightAmount,
      payment_status: paymentStatus,
      amount_paid: finalAmountPaid,
      eway_bill_number: serviceType === 'ftl' ? ewayBill : null,
      doorstep_pickup: false,
      delivery_type: 'godown',
      consignor_name: consignorName,
      consignor_phone: consignorPhone,
      consignee_name: consigneeName,
      consignee_phone: consigneePhone,
      parcel_count: totalItemQty,
      parcel_details: items,
      current_hub_id: hubId,
      delivery_otp: otp,
      eta: new Date(Date.now() + 2 * 86400000).toISOString(),
    });
    if (error) { showToast('error', 'Booking failed: ' + error.message); setSubmitting(false); return; }

    const { data: newBooking } = await supabase.from('bookings').select('*').eq('tracking_id', trackingId).maybeSingle();
    if (newBooking) {
      const paymentNote = paymentStatus === 'paid' ? 'paid in full' : paymentStatus === 'partial' ? `partially paid (${formatINR(finalAmountPaid)} of ${formatINR(freightAmount)})` : 'payment pending';
      await supabase.from('tracking_logs').insert({
        booking_id: newBooking.id, status: 'placed', hub_id: hubId,
        note: `Counter booking logged by ${staffProfile.name} at ${hubs.find((h) => h.id === hubId)?.name ?? 'branch'} — ${paymentNote}`,
        lat: pickupCoord?.lat ?? null, lng: pickupCoord?.lng ?? null,
      });
      setCreated(newBooking as Booking);
    }
    showToast('success', matchedCustomerId
      ? `Counter booking logged! Tracking ID: ${trackingId}. Linked to the customer's account — it'll show in their My Shipments.`
      : `Counter booking logged! Tracking ID: ${trackingId}`);
    setSubmitting(false);
    onCreated();
  }

  function printReceipt() {
    if (!created) return;
    const win = window.open('', '_blank', 'width=800,height=600');
    if (!win) { showToast('error', 'Popup blocked. Allow popups to print.'); return; }
    const bal = Math.max((created.freight_charge ?? 0) - (created.amount_paid ?? 0), 0);
    const payLabel = created.payment_status === 'paid' ? 'Paid in Full' : created.payment_status === 'partial' ? 'Partially Paid' : 'Not Paid';
    win.document.write(`
      <html><head><title>Booking Receipt ${created.tracking_id}</title>
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
        .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; color: #7a8dab; }
        .stamp { border: 2px dashed #10b981; padding: 8px 16px; display: inline-block; color: #10b981; font-weight: 700; transform: rotate(-5deg); }
      </style></head><body>
      <div class="header">
        <div class="logo">GRTV Speed Parcel Service</div>
        <div class="trk">Counter Booking Receipt<br><b>${created.tracking_id}</b><br>${formatDate(created.created_at)}</div>
      </div>
      <div class="grid">
        <div class="field"><div class="lbl">Sender</div><div class="val">${created.consignor_name} — ${created.consignor_phone}</div></div>
        <div class="field"><div class="lbl">Receiver</div><div class="val">${created.consignee_name} — ${created.consignee_phone}</div></div>
        <div class="field"><div class="lbl">From</div><div class="val">${created.pickup_address}</div></div>
        <div class="field"><div class="lbl">To</div><div class="val">${created.delivery_address}</div></div>
        <div class="field"><div class="lbl">Service Type</div><div class="val">${created.service_type === 'ltl' ? 'LTL / Parcel' : 'FTL / Full Truckload'}</div></div>
        <div class="field"><div class="lbl">Parcels</div><div class="val">${created.parcel_count} pc — ${created.weight_kg} kg</div></div>
        <div class="field"><div class="lbl">Goods Class</div><div class="val">${created.goods_class ?? 'General'}</div></div>
        <div class="field"><div class="lbl">Delivery OTP</div><div class="val">${created.delivery_otp}</div></div>
      </div>
      <div class="paybox">
        <div><div class="lbl">Freight</div><div class="amt">${formatINR(created.freight_charge)}</div></div>
        <div><div class="lbl">${payLabel} — Paid</div><div class="amt">${formatINR(created.amount_paid)}</div></div>
        <div><div class="lbl">Balance Due</div><div class="amt">${formatINR(bal)}</div></div>
      </div>
      <div class="footer">
        <div>Booked at the counter — keep this receipt for tracking and delivery verification.</div>
        <div class="stamp">RECEIVED</div>
      </div>
      </body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  }

  if (created) {
    const bal = Math.max((created.freight_charge ?? 0) - (created.amount_paid ?? 0), 0);
    return (
      <div className="max-w-2xl card p-6 sm:p-8 animate-slide-up">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-success-100 text-success-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="font-bold text-ink-900">Counter booking logged</p>
            <p className="text-sm text-ink-500">Give the customer this tracking ID and their phone number — they can check status anytime at Track Shipment on the website, no account needed.</p>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-ink-50 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[11px] uppercase font-semibold text-ink-400">Tracking ID</p>
              <p className="font-mono text-xl font-extrabold text-brand-700">{created.tracking_id}</p>
            </div>
            <span className={`chip ${created.payment_status === 'paid' ? 'bg-success-100 text-success-700' : created.payment_status === 'partial' ? 'bg-warning-100 text-warning-700' : 'bg-danger-100 text-danger-700'}`}>
              {created.payment_status === 'paid' ? 'Paid in Full' : created.payment_status === 'partial' ? 'Partially Paid' : 'Not Paid'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-ink-100 text-center">
            <div><p className="text-lg font-extrabold text-ink-900">{formatINR(created.freight_charge)}</p><p className="text-[10px] text-ink-400">Freight</p></div>
            <div><p className="text-lg font-extrabold text-success-600">{formatINR(created.amount_paid)}</p><p className="text-[10px] text-ink-400">Paid</p></div>
            <div><p className={`text-lg font-extrabold ${bal > 0 ? 'text-danger-600' : 'text-ink-400'}`}>{formatINR(bal)}</p><p className="text-[10px] text-ink-400">Balance</p></div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={printReceipt} className="btn-primary w-full sm:w-auto">
            <Download className="w-4 h-4" /> Print Receipt
          </button>
          <button onClick={resetForm} className="btn-secondary w-full sm:w-auto">
            <RotateCcw className="w-4 h-4" /> Log Another Booking
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-5 animate-fade-in">
      <div className="card p-4 flex items-start gap-3 bg-brand-50 border-brand-100">
        <FileText className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
        <p className="text-sm text-brand-800">
          Use this for parcels booked by phone or a walk-in customer at the counter — no customer account needed.
          It's logged as a <span className="font-semibold">Counter</span> booking for reporting.
        </p>
      </div>

      <div className="card p-4 sm:p-6 space-y-4">
        <p className="section-title">Service & Branch</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="flex gap-2">
            {(['ltl', 'ftl'] as const).map((s) => (
              <button key={s} onClick={() => setServiceType(s)}
                className={`flex-1 px-3 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border transition ${serviceType === s ? 'bg-brand-600 text-white border-brand-600' : 'border-ink-200 text-ink-600 hover:bg-ink-50'}`}>
                <span className="sm:hidden">{s === 'ltl' ? 'LTL' : 'FTL'}</span>
                <span className="hidden sm:inline">{s === 'ltl' ? 'LTL / Parcel' : 'FTL / Full Truckload'}</span>
              </button>
            ))}
          </div>
          <Select
            value={hubId}
            onChange={setHubId}
            placeholder="Receiving hub/branch…"
            options={hubs.map((h) => ({ value: h.id, label: `${h.name} (${h.city})` }))}
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <div className="card p-4 sm:p-6 space-y-4">
          <p className="section-title flex items-center gap-1.5"><UserIcon className="w-3.5 h-3.5" /> Sender (Consignor)</p>
          <input className="input" placeholder="Full name" value={consignorName} onChange={(e) => setConsignorName(e.target.value)} />
          <input className="input" placeholder="Phone number" value={consignorPhone} onChange={(e) => setConsignorPhone(e.target.value)} />
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
            <input className="input pl-9" placeholder="Pickup address / city" value={pickup} onChange={(e) => setPickup(e.target.value)} />
          </div>
        </div>
        <div className="card p-4 sm:p-6 space-y-4">
          <p className="section-title flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Receiver (Consignee)</p>
          <input className="input" placeholder="Full name" value={consigneeName} onChange={(e) => setConsigneeName(e.target.value)} />
          <input className="input" placeholder="Phone number" value={consigneePhone} onChange={(e) => setConsigneePhone(e.target.value)} />
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
            <input className="input pl-9" placeholder="Delivery address / city" value={delivery} onChange={(e) => setDelivery(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card p-4 sm:p-6 space-y-4">
        <p className="section-title flex items-center gap-1.5 mb-0"><Package className="w-3.5 h-3.5" /> Package Details</p>

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
        <div className="pt-3 border-t border-ink-100">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <p className="label mb-0">What's Inside This Box</p>
            <button onClick={addItem} className="btn-secondary text-xs !px-3 !py-1.5"><Plus className="w-3.5 h-3.5" /> Add Item</button>
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
        </div>

        {/* Totals summary */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-ink-100 text-center">
          <div><p className="text-lg font-extrabold text-ink-900">1</p><p className="text-[10px] text-ink-400 uppercase">Box</p></div>
          <div><p className="text-lg font-extrabold text-ink-900">{totalItemQty}</p><p className="text-[10px] text-ink-400 uppercase">Total Items</p></div>
          <div><p className="text-lg font-extrabold text-ink-900">{formatINR(boxDeclaredValue)}</p><p className="text-[10px] text-ink-400 uppercase">Declared Value</p></div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 pt-2">
          <div>
            <p className="label">Goods Class</p>
            <Select value={goodsClass} onChange={setGoodsClass} options={GOODS_TYPES} />
          </div>
          {serviceType === 'ftl' && (
            <div>
              <p className="label">E-Way Bill Number</p>
              <input className="input" value={ewayBill} onChange={(e) => setEwayBill(e.target.value)} placeholder="Required for FTL" />
            </div>
          )}
        </div>
        {distanceKm > 0 && <p className="text-xs text-ink-400">Route distance ~{distanceKm} km (for reference only — freight is entered manually below).</p>}
      </div>

      {/* Manual freight + payment */}
      <div className="card p-4 sm:p-6 space-y-5">
        <p className="section-title flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" /> Freight & Payment</p>

        <div>
          <p className="label">Freight Amount (₹)</p>
          <input
            type="number"
            className="input text-lg font-bold"
            placeholder="Enter amount manually"
            value={freightAmount || ''}
            onChange={(e) => {
              const v = +e.target.value;
              setFreightAmount(v);
              if (paymentStatus === 'paid') setAmountPaid(v);
            }}
          />
        </div>

        <div>
          <p className="label">Payment Status</p>
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {([
              { k: 'unpaid', label: 'Not Paid' },
              { k: 'partial', label: 'Partial' },
              { k: 'paid', label: 'Paid' },
            ] as const).map((opt) => (
              <button
                key={opt.k}
                type="button"
                onClick={() => changePaymentStatus(opt.k)}
                className={`px-2 sm:px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border transition ${
                  paymentStatus === opt.k
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

        {paymentStatus === 'partial' && (
          <div>
            <p className="label">Amount Paid Now (₹)</p>
            <input
              type="number"
              className="input"
              placeholder="Amount collected at counter"
              value={amountPaid || ''}
              onChange={(e) => setAmountPaid(+e.target.value)}
            />
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-ink-100 text-center">
          <div><p className="text-lg font-extrabold text-ink-900">{formatINR(freightAmount)}</p><p className="text-[10px] text-ink-400 uppercase">Freight</p></div>
          <div><p className="text-lg font-extrabold text-success-600">{formatINR(finalAmountPaid)}</p><p className="text-[10px] text-ink-400 uppercase">Paid</p></div>
          <div><p className={`text-lg font-extrabold ${balance > 0 ? 'text-danger-600' : 'text-ink-400'}`}>{formatINR(balance)}</p><p className="text-[10px] text-ink-400 uppercase">Balance</p></div>
        </div>
      </div>

      <div className="card p-4 sm:p-6 flex items-center justify-end">
        <button onClick={submit} disabled={submitting} className="btn-primary">
          <CheckCircle2 className="w-4 h-4" /> {submitting ? 'Logging…' : 'Log Counter Booking'}
        </button>
      </div>
    </div>
  );
}
