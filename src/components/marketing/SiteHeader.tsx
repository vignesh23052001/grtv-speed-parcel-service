import { useEffect, useRef, useState } from 'react';
import {
  Menu, X, ChevronDown, PackageCheck, Truck, ArrowRight,
  User, LogOut, LayoutDashboard,
} from 'lucide-react';

export type MarketingPage = 'home' | 'about' | 'contact' | 'track';
export type ServiceType = 'ltl' | 'ftl';

interface SiteHeaderProps {
  page: MarketingPage | 'dashboard';
  onNavigate: (page: MarketingPage, anchor?: string) => void;
  onGetStarted: () => void;
  onServiceSelect?: (service: ServiceType) => void;
  loggedIn?: boolean;
  profileName?: string;
  profileRole?: string;
  onSignOut?: () => void;
  transparentAtTop?: boolean;
}

const SERVICE_ITEMS: { key: ServiceType; icon: typeof PackageCheck; title: string; desc: string }[] = [
  { key: 'ltl', icon: PackageCheck, title: 'General Parcel / LTL', desc: 'Multiple parcels, shared transport with doorstep pickup.' },
  { key: 'ftl', icon: Truck, title: 'Full Truckload (FTL)', desc: 'Dedicated vehicle reserved for bulk shipments.' },
];

const ROLE_LABELS: Record<string, string> = {
  admin: 'Owner Dashboard',
  driver: 'Driver Panel',
  hub: 'Hub Operations',
  customer: 'Customer Portal',
};

export default function SiteHeader({ page, onNavigate, onGetStarted, onServiceSelect, loggedIn, profileName, profileRole, onSignOut, transparentAtTop }: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setServicesOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    if (!transparentAtTop) return;
    function onScroll() { setScrolled(window.scrollY > 40); }
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [transparentAtTop]);

  function go(target: MarketingPage, anchor?: string) {
    setMenuOpen(false);
    setServicesOpen(false);
    setMobileServicesOpen(false);
    onNavigate(target, anchor);
  }

  function selectService(key: ServiceType) {
    setMenuOpen(false);
    setServicesOpen(false);
    setMobileServicesOpen(false);
    if (onServiceSelect) {
      onServiceSelect(key);
    } else {
      onNavigate('home', 'services');
    }
  }

  const linkClass = (active: boolean) =>
    `hover:text-white transition-colors ${active ? 'text-white font-bold' : 'text-ink-200'}`;

  const isTransparent = transparentAtTop && !scrolled && !menuOpen;

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isTransparent ? 'bg-transparent backdrop-blur-[2px] border-b border-white/10' : 'bg-ink-950 shadow-lg border-b border-transparent'}`}>
      {!isTransparent && <div className="h-[3px] bg-brand-gradient" />}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between">
        
        {/* Unified Single-Style Logo Brand Text */}
        <button onClick={() => go('home')} className="flex items-center gap-2 text-left group">
          <span className="font-extrabold text-white text-lg tracking-wider uppercase">
            GRTV Speed Parcel Service
          </span>
          {loggedIn && profileRole && (
            <span className="hidden xl:inline-block text-[11px] font-semibold text-blue-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full ml-1">
              {ROLE_LABELS[profileRole]}
            </span>
          )}
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-9 text-[15px] font-medium">
          <button onClick={() => go('home')} className={linkClass(page === 'home')}>Home</button>

          <div className="relative flex items-center" ref={dropdownRef}>
            <button
              onClick={() => selectService('ltl')}
              className={linkClass(false)}
            >
              Services
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setServicesOpen((v) => !v); }}
              aria-label="Toggle services menu"
              className={`ml-1 p-0.5 ${linkClass(false)}`}
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${servicesOpen ? 'rotate-180' : ''}`} />
            </button>
            {servicesOpen && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-80 bg-white rounded-2xl shadow-elevated border border-ink-100 p-2 animate-slide-up">
                {SERVICE_ITEMS.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => selectService(s.key)}
                    className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-ink-50 text-left transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center shrink-0">
                      <s.icon className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-ink-900">{s.title}</p>
                      <p className="text-xs text-ink-500">{s.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={() => go('about')} className={linkClass(page === 'about')}>About Us</button>
          <button onClick={() => go('track')} className={linkClass(page === 'track')}>Track Shipment</button>
          <button onClick={() => go('contact')} className={linkClass(page === 'contact')}>Contact Us</button>
        </nav>

        {/* User / Action Buttons */}
        {loggedIn ? (
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2 pr-3 border-r border-white/15">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="leading-tight">
                <p className="text-[13px] font-semibold text-white">{profileName}</p>
                <p className="text-[11px] text-ink-400 capitalize">{profileRole}</p>
              </div>
            </div>
            {page !== 'dashboard' && (
              <button onClick={onGetStarted}
                className="inline-flex items-center gap-2 pl-4 pr-4 py-2.5 rounded-full bg-white text-ink-950 text-sm font-bold hover:bg-ink-100 transition shadow-elevated">
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </button>
            )}
            <button onClick={onSignOut} className="text-ink-300 hover:text-white transition-colors" title="Sign out">
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-3">
            <button onClick={onGetStarted} className="text-[15px] font-medium text-ink-200 hover:text-white transition-colors">
              Sign In
            </button>
            <button onClick={onGetStarted}
              className="inline-flex items-center gap-2 pl-5 pr-4 py-2.5 rounded-full bg-white text-ink-950 text-sm font-bold hover:bg-ink-100 transition shadow-elevated">
              Ship Now <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Mobile Toggle */}
        <button className="md:hidden text-white" onClick={() => setMenuOpen((v) => !v)}>
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/10 bg-ink-950 px-4 py-4 space-y-1 animate-slide-up">
          <button onClick={() => go('home')} className="block w-full text-left py-2 text-sm font-semibold text-ink-200">Home</button>

          <div className="flex items-center justify-between w-full">
            <button
              onClick={() => selectService('ltl')}
              className="text-left py-2 text-sm font-semibold text-ink-200"
            >
              Services
            </button>
            <button
              onClick={() => setMobileServicesOpen((v) => !v)}
              aria-label="Toggle services submenu"
              className="p-2 text-ink-200"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${mobileServicesOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
          {mobileServicesOpen && (
            <div className="pl-3 space-y-1 pb-1">
              {SERVICE_ITEMS.map((s) => (
                <button key={s.key} onClick={() => selectService(s.key)} className="block w-full text-left py-1.5 text-[13px] text-ink-400">
                  {s.title}
                </button>
              ))}
            </div>
          )}

          <button onClick={() => go('about')} className="block w-full text-left py-2 text-sm font-semibold text-ink-200">About Us</button>
          <button onClick={() => go('track')} className="block w-full text-left py-2 text-sm font-semibold text-ink-200">Track Shipment</button>
          <button onClick={() => go('contact')} className="block w-full text-left py-2 text-sm font-semibold text-ink-200">Contact Us</button>

          {loggedIn ? (
            <div className="pt-2 space-y-2">
              <div className="flex items-center gap-2 py-1">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="leading-tight">
                  <p className="text-[13px] font-semibold text-white">{profileName}</p>
                  <p className="text-[11px] text-ink-400 capitalize">{profileRole}</p>
                </div>
              </div>
              {page !== 'dashboard' && (
                <button onClick={onGetStarted} className="btn-primary w-full">
                  <LayoutDashboard className="w-4 h-4" /> Go to Dashboard
                </button>
              )}
              <button onClick={onSignOut} className="btn-secondary w-full">
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          ) : (
            <button onClick={onGetStarted} className="btn-primary w-full mt-3">
              Get Started <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </header>
  );
}