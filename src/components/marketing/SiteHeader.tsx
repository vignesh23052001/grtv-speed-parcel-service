import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import {
  Menu, X, ChevronDown, PackageCheck, Truck, ArrowRight,
  User, LogOut, LayoutDashboard,
} from 'lucide-react';

export type MarketingPage = 'home' | 'about' | 'contact' | 'track';
export type ServiceType = 'ltl' | 'ftl';

export const PAGE_PATHS: Record<MarketingPage, string> = {
  home: '/',
  about: '/about',
  contact: '/contact',
  track: '/track',
};

// Real <a href> links let search engines discover and follow every page.
// A normal click still navigates instantly without reloading; ctrl/cmd-click opens a new tab.
export function handleLinkClick(e: ReactMouseEvent<HTMLAnchorElement>, action: () => void) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  action();
}

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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!transparentAtTop) return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [transparentAtTop]);

  // Transparent over the hero image until the visitor scrolls (or opens the mobile menu)
  const clear = !!transparentAtTop && !scrolled && !menuOpen;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setServicesOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

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
    clear
      ? `hover:text-white transition-colors ${active ? 'text-white font-semibold' : 'text-white/85'}`
      : `hover:text-ink-950 transition-colors ${active ? 'text-ink-950 font-semibold' : 'text-ink-600'}`;

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${clear ? 'bg-transparent' : 'bg-white shadow-sm border-b border-ink-100'}`}>
      <div className={`h-[3px] bg-brand-gradient transition-opacity ${clear ? 'opacity-0' : 'opacity-100'}`} />
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-[80px] flex items-center justify-between">
        <a href="/" onClick={(e) => handleLinkClick(e, () => go('home'))} className="flex items-center gap-2.5">
          <img src="/logo.png" alt="GRTV Speed Parcel Service" className={`h-14 w-auto transition ${clear ? 'bg-white/95 rounded-xl px-2 py-1' : ''}`} />
          <span className={`hidden lg:inline text-[11px] uppercase tracking-wider font-semibold border-l pl-3 ml-1 ${clear ? 'text-white/80 border-white/30' : 'text-ink-500 border-ink-200'}`}>
            {loggedIn && profileRole ? (ROLE_LABELS[profileRole] ?? 'Speed Parcel Service') : 'Speed Parcel Service'}
          </span>
        </a>

        <nav className="hidden md:flex items-center gap-9 text-[15px] font-medium">
          <a href={PAGE_PATHS.home} onClick={(e) => handleLinkClick(e, () => go('home'))} className={linkClass(page === 'home')}>Home</a>

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

          <a href={PAGE_PATHS.about} onClick={(e) => handleLinkClick(e, () => go('about'))} className={linkClass(page === 'about')}>About Us</a>
          <a href={PAGE_PATHS.track} onClick={(e) => handleLinkClick(e, () => go('track'))} className={linkClass(page === 'track')}>Track Shipment</a>
          <a href={PAGE_PATHS.contact} onClick={(e) => handleLinkClick(e, () => go('contact'))} className={linkClass(page === 'contact')}>Contact Us</a>
        </nav>

        {loggedIn ? (
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2 pr-3 border-r border-ink-200">
              <div className="w-8 h-8 rounded-full bg-ink-100 flex items-center justify-center">
                <User className="w-4 h-4 text-ink-700" />
              </div>
              <div className="leading-tight">
                <p className="text-[13px] font-semibold text-ink-900">{profileName}</p>
                <p className="text-[11px] text-ink-500 capitalize">{profileRole}</p>
              </div>
            </div>
            {page !== 'dashboard' && (
              <button onClick={onGetStarted}
                className="inline-flex items-center gap-2 pl-4 pr-4 py-2.5 rounded-full bg-brand-600 text-white text-sm font-bold hover:bg-brand-700 transition shadow-elevated">
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </button>
            )}
            <button onClick={onSignOut} className="text-ink-400 hover:text-ink-950 transition-colors" title="Sign out">
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-3">
            <button onClick={onGetStarted} className={`text-[15px] font-medium transition-colors ${clear ? 'text-white/90 hover:text-white' : 'text-ink-600 hover:text-ink-950'}`}>
              Sign In
            </button>
            <button onClick={onGetStarted}
              className="inline-flex items-center gap-2 pl-5 pr-4 py-2.5 rounded-full bg-brand-600 text-white text-sm font-bold hover:bg-brand-700 transition shadow-elevated">
              Ship Now <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        )}

        <button className={`md:hidden ${clear ? 'text-white' : 'text-ink-900'}`} onClick={() => setMenuOpen((v) => !v)}>
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-ink-100 bg-white px-4 py-4 space-y-1 animate-slide-up">
          <a href={PAGE_PATHS.home} onClick={(e) => handleLinkClick(e, () => go('home'))} className="block w-full text-left py-2 text-sm font-semibold text-ink-700">Home</a>

          <div className="flex items-center justify-between w-full">
            <button
              onClick={() => selectService('ltl')}
              className="text-left py-2 text-sm font-semibold text-ink-700"
            >
              Services
            </button>
            <button
              onClick={() => setMobileServicesOpen((v) => !v)}
              aria-label="Toggle services submenu"
              className="p-2 text-ink-700"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${mobileServicesOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
          {mobileServicesOpen && (
            <div className="pl-3 space-y-1 pb-1">
              {SERVICE_ITEMS.map((s) => (
                <button key={s.key} onClick={() => selectService(s.key)} className="block w-full text-left py-1.5 text-[13px] text-ink-500">
                  {s.title}
                </button>
              ))}
            </div>
          )}

          <a href={PAGE_PATHS.about} onClick={(e) => handleLinkClick(e, () => go('about'))} className="block w-full text-left py-2 text-sm font-semibold text-ink-700">About Us</a>
          <a href={PAGE_PATHS.track} onClick={(e) => handleLinkClick(e, () => go('track'))} className="block w-full text-left py-2 text-sm font-semibold text-ink-700">Track Shipment</a>
          <a href={PAGE_PATHS.contact} onClick={(e) => handleLinkClick(e, () => go('contact'))} className="block w-full text-left py-2 text-sm font-semibold text-ink-700">Contact Us</a>

          {loggedIn ? (
            <div className="pt-2 space-y-2">
              <div className="flex items-center gap-2 py-1">
                <div className="w-8 h-8 rounded-full bg-ink-100 flex items-center justify-center">
                  <User className="w-4 h-4 text-ink-700" />
                </div>
                <div className="leading-tight">
                  <p className="text-[13px] font-semibold text-ink-900">{profileName}</p>
                  <p className="text-[11px] text-ink-500 capitalize">{profileRole}</p>
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