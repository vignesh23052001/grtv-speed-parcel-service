import { useMemo, useState } from 'react';
import {
  Search, User as UserIcon, Phone, Mail, Package, Wallet, Calendar,
  X, PlusCircle, Globe, Star,
} from 'lucide-react';
import type { Booking, Profile } from '../lib/types';
import { STATUS_META, formatINR, formatDateTime, formatDate } from '../lib/ui';

interface CustomersDirectoryProps {
  bookings: Booking[];
  profiles: Profile[];
}

interface CustomerAgg {
  phone: string;
  name: string;
  email: string | null;
  registered: boolean;
  isRegular: boolean;
  totalBookings: number;
  totalSpend: number;
  onlineCount: number;
  counterCount: number;
  lastBookingAt: string;
  bookings: Booking[];
}

const REGULAR_THRESHOLD = 3;

export default function CustomersDirectory({ bookings, profiles }: CustomersDirectoryProps) {
  const [search, setSearch] = useState('');
  const [regularOnly, setRegularOnly] = useState(false);
  const [selected, setSelected] = useState<CustomerAgg | null>(null);

  const customers = useMemo(() => {
    const map = new Map<string, CustomerAgg>();
    for (const b of bookings) {
      const phone = (b.consignor_phone ?? '').trim();
      if (!phone) continue;
      const profile = profiles.find((p) => p.phone === phone && p.role === 'customer');
      let agg = map.get(phone);
      if (!agg) {
        agg = {
          phone,
          name: profile?.name ?? b.consignor_name ?? 'Unknown',
          email: profile?.email ?? null,
          registered: !!profile,
          isRegular: false,
          totalBookings: 0,
          totalSpend: 0,
          onlineCount: 0,
          counterCount: 0,
          lastBookingAt: b.created_at,
          bookings: [],
        };
        map.set(phone, agg);
      }
      agg.totalBookings += 1;
      agg.totalSpend += b.freight_charge ?? 0;
      if (b.booking_source === 'counter') agg.counterCount += 1; else agg.onlineCount += 1;
      if (new Date(b.created_at) > new Date(agg.lastBookingAt)) agg.lastBookingAt = b.created_at;
      agg.bookings.push(b);
    }
    for (const agg of map.values()) {
      agg.bookings.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      agg.isRegular = agg.totalBookings >= REGULAR_THRESHOLD;
    }
    return Array.from(map.values()).sort((a, b) => b.totalBookings - a.totalBookings);
  }, [bookings, profiles]);

  const filtered = customers.filter((c) => {
    if (regularOnly && !c.isRegular) return false;
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone.includes(q);
  });

  const regularCount = customers.filter((c) => c.isRegular).length;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="stat-card"><UserIcon className="w-5 h-5 text-brand-600 mb-1" /><p className="text-2xl font-extrabold text-ink-900">{customers.length}</p><p className="text-xs text-ink-400 font-semibold">Total Customers</p></div>
        <div className="stat-card"><Star className="w-5 h-5 text-accent-500 mb-1" /><p className="text-2xl font-extrabold text-ink-900">{regularCount}</p><p className="text-xs text-ink-400 font-semibold">Regular Customers (3+ bookings)</p></div>
        <div className="stat-card"><Globe className="w-5 h-5 text-brand-600 mb-1" /><p className="text-2xl font-extrabold text-ink-900">{customers.filter((c) => c.registered).length}</p><p className="text-xs text-ink-400 font-semibold">Registered Accounts</p></div>
        <div className="stat-card"><PlusCircle className="w-5 h-5 text-success-600 mb-1" /><p className="text-2xl font-extrabold text-ink-900">{customers.filter((c) => !c.registered).length}</p><p className="text-xs text-ink-400 font-semibold">Walk-in / Counter Only</p></div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-md flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input className="input pl-9" placeholder="Search by name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1.5 bg-white border border-ink-100 rounded-xl p-1 shadow-card">
          <button onClick={() => setRegularOnly(false)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${!regularOnly ? 'bg-brand-600 text-white shadow-sm' : 'text-ink-500 hover:bg-ink-50'}`}>
            All Customers
          </button>
          <button onClick={() => setRegularOnly(true)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${regularOnly ? 'bg-brand-600 text-white shadow-sm' : 'text-ink-500 hover:bg-ink-50'}`}>
            <Star className="w-3.5 h-3.5" /> Regular Only
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="hidden sm:grid grid-cols-[1.6fr_1fr_0.8fr_0.9fr_1fr_1fr] gap-3 px-5 py-3 bg-ink-50 text-[11px] font-bold text-ink-400 uppercase tracking-wide">
          <span>Customer</span>
          <span>Phone</span>
          <span>Bookings</span>
          <span>Source</span>
          <span>Total Spend</span>
          <span>Last Booking</span>
        </div>
        <div className="divide-y divide-ink-100">
          {filtered.length === 0 ? (
            <p className="text-sm text-ink-400 text-center py-10">No customers found.</p>
          ) : filtered.map((c) => (
            <button
              key={c.phone}
              onClick={() => setSelected(c)}
              className="hidden sm:grid w-full grid-cols-[1.6fr_1fr_0.8fr_0.9fr_1fr_1fr] gap-3 px-5 py-3.5 text-left hover:bg-ink-50 transition-colors items-center"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center shrink-0 text-xs font-bold">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-ink-900 truncate">{c.name}</p>
                    {c.isRegular && (
                      <span className="chip bg-accent-400/20 text-accent-600 text-[9px] !px-1.5 !py-0.5 shrink-0">
                        <Star className="w-2.5 h-2.5" /> Regular
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] font-semibold ${c.registered ? 'text-brand-600' : 'text-ink-400'}`}>
                    {c.registered ? 'Registered' : 'Walk-in only'}
                  </span>
                </div>
              </div>
              <span className="text-sm text-ink-600">{c.phone}</span>
              <span className="text-sm font-semibold text-ink-800">{c.totalBookings}</span>
              <span className="flex gap-1">
                {c.onlineCount > 0 && <span className="chip bg-brand-100 text-brand-700 text-[10px]">{c.onlineCount} Online</span>}
                {c.counterCount > 0 && <span className="chip bg-accent-400/20 text-accent-600 text-[10px]">{c.counterCount} Counter</span>}
              </span>
              <span className="text-sm font-semibold text-ink-800">{formatINR(c.totalSpend)}</span>
              <span className="text-xs text-ink-400">{formatDateTime(c.lastBookingAt)}</span>
            </button>
          ))}
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden divide-y divide-ink-100">
          {filtered.map((c) => (
            <button key={c.phone} onClick={() => setSelected(c)} className="w-full text-left p-4 hover:bg-ink-50 transition-colors">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center shrink-0 text-xs font-bold">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-ink-900 truncate">{c.name}</p>
                    {c.isRegular && (
                      <span className="chip bg-accent-400/20 text-accent-600 text-[9px] !px-1.5 !py-0.5 shrink-0">
                        <Star className="w-2.5 h-2.5" /> Regular
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink-500">{c.phone} · <span className={`font-semibold ${c.registered ? 'text-brand-600' : 'text-ink-400'}`}>{c.registered ? 'Registered' : 'Walk-in only'}</span></p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-ink-100 text-xs">
                <div><p className="text-ink-400">Bookings</p><p className="font-semibold text-ink-800">{c.totalBookings}</p></div>
                <div><p className="text-ink-400">Spend</p><p className="font-semibold text-ink-800">{formatINR(c.totalSpend)}</p></div>
                <div><p className="text-ink-400">Last Booking</p><p className="font-semibold text-ink-800">{formatDate(c.lastBookingAt)}</p></div>
              </div>
              {(c.onlineCount > 0 || c.counterCount > 0) && (
                <div className="flex gap-1 mt-2">
                  {c.onlineCount > 0 && <span className="chip bg-brand-100 text-brand-700 text-[10px]">{c.onlineCount} Online</span>}
                  {c.counterCount > 0 && <span className="chip bg-accent-400/20 text-accent-600 text-[10px]">{c.counterCount} Counter</span>}
                </div>
              )}
            </button>
          ))}
          {filtered.length === 0 && <p className="text-sm text-ink-400 text-center py-10">No customers found.</p>}
        </div>
      </div>

      {selected && <CustomerDetailModal customer={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function CustomerDetailModal({ customer, onClose }: { customer: CustomerAgg; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/50 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-elevated w-full max-w-2xl max-h-[85vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-ink-100 p-5 flex items-start justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-brand-gradient text-white flex items-center justify-center font-bold">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="font-bold text-ink-900">{customer.name}</p>
                {customer.isRegular && (
                  <span className="chip bg-accent-400/20 text-accent-600 text-[10px]">
                    <Star className="w-3 h-3" /> Regular
                  </span>
                )}
              </div>
              <span className={`text-[11px] font-semibold ${customer.registered ? 'text-brand-600' : 'text-ink-400'}`}>
                {customer.registered ? 'Registered customer account' : 'Walk-in / counter customer'}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-700"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-ink-50">
              <Phone className="w-4 h-4 text-ink-400" /> <span className="text-sm text-ink-700">{customer.phone}</span>
            </div>
            {customer.email && (
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-ink-50">
                <Mail className="w-4 h-4 text-ink-400" /> <span className="text-sm text-ink-700">{customer.email}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-xl bg-brand-50">
              <p className="text-lg font-extrabold text-ink-900">{customer.totalBookings}</p>
              <p className="text-[11px] text-ink-400">Total Bookings</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-brand-50">
              <p className="text-lg font-extrabold text-ink-900">{formatINR(customer.totalSpend)}</p>
              <p className="text-[11px] text-ink-400">Total Spend</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-brand-50">
              <p className="text-lg font-extrabold text-ink-900">{customer.onlineCount} / {customer.counterCount}</p>
              <p className="text-[11px] text-ink-400">Online / Counter</p>
            </div>
          </div>

          <div>
            <p className="section-title flex items-center gap-1.5"><Package className="w-3.5 h-3.5" /> Booking History</p>
            <div className="space-y-2.5">
              {customer.bookings.map((b) => {
                const meta = STATUS_META[b.status];
                return (
                  <div key={b.id} className="p-3.5 rounded-xl border border-ink-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="font-mono text-xs font-bold text-brand-700">{b.tracking_id}</p>
                      <div className="flex items-center gap-1.5">
                        <span className={`chip text-[10px] ${b.booking_source === 'counter' ? 'bg-accent-400/20 text-accent-600' : 'bg-brand-100 text-brand-700'}`}>
                          {b.booking_source === 'counter' ? 'Counter' : 'Online'}
                        </span>
                        <span className={`chip text-[10px] ${meta.color}`}>{meta.label}</span>
                      </div>
                    </div>
                    <p className="text-xs text-ink-500 truncate mb-1.5">{b.pickup_address} → {b.delivery_address}</p>
                    <div className="flex items-center justify-between text-[11px] text-ink-400">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDateTime(b.created_at)}</span>
                      <span className="flex items-center gap-1 font-semibold text-ink-700"><Wallet className="w-3 h-3" /> {formatINR(b.freight_charge)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
