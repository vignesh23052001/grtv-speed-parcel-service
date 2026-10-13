import { useEffect, useState } from 'react';
import {
  MapPin, Phone, Mail, Send, ChevronUp, CheckCircle2,
  Facebook, Instagram, Linkedin, Youtube, Twitter,
} from 'lucide-react';
import { PAGE_PATHS, handleLinkClick, type MarketingPage } from './SiteHeader';
import { Select } from '../ui';
import { SERVICE_AREAS, STATE_AREAS, areaPath, goToPath } from '../../data/serviceAreas';

interface SiteFooterProps {
  onNavigate?: (page: MarketingPage, anchor?: string) => void;
  onGetStarted?: () => void;
  variant?: 'marketing' | 'app';
  loggedIn?: boolean;
}

export default function SiteFooter({ onNavigate, onGetStarted, variant = 'marketing', loggedIn }: SiteFooterProps) {
  const [leadName, setLeadName] = useState('');
  const [leadCompany, setLeadCompany] = useState('');
  const [leadMobile, setLeadMobile] = useState('');
  const [leadService, setLeadService] = useState('');
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 500);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function submitLead(e: React.FormEvent) {
    e.preventDefault();
    if (!leadName.trim() || !leadMobile.trim()) return;
    setLeadSubmitted(true);
    setLeadName(''); setLeadCompany(''); setLeadMobile(''); setLeadService('');
    setTimeout(() => setLeadSubmitted(false), 4000);
  }

  return (
    <>
      {/* Plan Your Shipment — lead capture (marketing pages only) */}
      {variant === 'marketing' && (
      <section className="relative bg-yellow-400 overflow-hidden">
        <div className="absolute inset-0 opacity-40 pointer-events-none" aria-hidden="true">
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1400 300">
            <path d="M0 60 h140 a20 20 0 0 1 20 20 v40 a20 20 0 0 0 20 20 h300" fill="none" stroke="#00000022" strokeWidth="2" />
            <path d="M500 0 v90 a20 20 0 0 0 20 20 h250" fill="none" stroke="#00000022" strokeWidth="2" />
          </svg>
        </div>
        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 py-16 lg:py-20 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-ink-950 tracking-tight leading-tight mb-3">
              Plan Your Shipment With<br />GRTV Speed Parcel Service.
            </h2>
            <p className="text-xl sm:text-2xl font-bold text-ink-900">Contact Us Today!</p>
          </div>

          <form onSubmit={submitLead} className="space-y-3">
            {leadSubmitted ? (
              <div className="flex items-center gap-3 bg-white rounded-xl p-5 shadow-elevated animate-fade-in">
                <CheckCircle2 className="w-6 h-6 text-success-600 shrink-0" />
                <div>
                  <p className="font-bold text-ink-900 text-sm">Request received!</p>
                  <p className="text-xs text-ink-500">Our team will reach out to you shortly.</p>
                </div>
              </div>
            ) : (
              <>
                <input required value={leadName} onChange={(e) => setLeadName(e.target.value)} placeholder="Name"
                  className="w-full px-4 py-3 rounded-xl border-0 shadow-card focus:outline-none focus:ring-2 focus:ring-ink-900/30 text-sm" />
                <input value={leadCompany} onChange={(e) => setLeadCompany(e.target.value)} placeholder="Company Name"
                  className="w-full px-4 py-3 rounded-xl border-0 shadow-card focus:outline-none focus:ring-2 focus:ring-ink-900/30 text-sm" />
                <input required value={leadMobile} onChange={(e) => setLeadMobile(e.target.value)} placeholder="Mobile"
                  className="w-full px-4 py-3 rounded-xl border-0 shadow-card focus:outline-none focus:ring-2 focus:ring-ink-900/30 text-sm" />
                <Select
                  value={leadService}
                  onChange={setLeadService}
                  placeholder="Select Service Type"
                  triggerClassName="w-full px-4 py-3 rounded-xl border-0 shadow-card focus:outline-none focus:ring-2 focus:ring-ink-900/30 text-sm text-ink-600 flex items-center justify-between text-left bg-white"
                  options={[
                    { value: 'ltl', label: 'LTL Parcel Booking' },
                    { value: 'ftl', label: 'FTL Freight' },
                    { value: 'quote', label: 'Custom Quote' },
                  ]}
                />
                <button type="submit" className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm bg-ink-950 text-white hover:bg-ink-900 transition shadow-elevated">
                  Submit <Send className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </form>
        </div>
      </section>
      )}

      {/* Footer */}
      <footer className="bg-white text-ink-900 border-t border-ink-100">
        <div className={`max-w-[1400px] mx-auto px-4 sm:px-6 py-14 grid gap-10 ${variant === 'marketing' ? 'md:grid-cols-[1.3fr_1fr_1.2fr_1fr]' : 'md:grid-cols-[1.3fr_1fr]'}`}>
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <img src="/logo.png" alt="GRTV Speed Parcel Service" className="h-14 w-auto" />
              <p className="text-[10px] text-ink-500 uppercase tracking-wider">Speed Parcel Service</p>
            </div>
            <p className="text-sm text-ink-600 leading-relaxed max-w-sm mb-5">
              South India's trusted parcel and freight logistics partner across Tamil Nadu, Bengaluru,
              and Kerala — booking, live tracking, fleet and driver management, and invoicing on one
              connected platform.
            </p>
            <div className="flex items-center gap-2.5">
              {[Facebook, Linkedin, Youtube, Twitter, Instagram].map((Icon, i) => (
                <a key={i} href="#" onClick={(e) => e.preventDefault()}
                  className="w-9 h-9 rounded-full border border-ink-200 flex items-center justify-center text-ink-500 hover:text-white hover:bg-ink-950 hover:border-ink-950 transition-colors">
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {variant === 'marketing' && onNavigate && onGetStarted && (
            <div>
              <p className="text-xs font-bold text-ink-500 uppercase tracking-wider mb-4">Quick Links</p>
              <div className="space-y-2.5 text-sm">
                <a href={PAGE_PATHS.home} onClick={(e) => handleLinkClick(e, () => onNavigate('home'))} className="block text-ink-600 hover:text-ink-950 transition-colors text-left">Home</a>
                <a href={`${PAGE_PATHS.home}#services`} onClick={(e) => handleLinkClick(e, () => onNavigate('home', 'services'))} className="block text-ink-600 hover:text-ink-950 transition-colors text-left">Services</a>
                <a href={PAGE_PATHS.about} onClick={(e) => handleLinkClick(e, () => onNavigate('about'))} className="block text-ink-600 hover:text-ink-950 transition-colors text-left">About Us</a>
                <a href={PAGE_PATHS.contact} onClick={(e) => handleLinkClick(e, () => onNavigate('contact'))} className="block text-ink-600 hover:text-ink-950 transition-colors text-left">Contact Us</a>
                <a href={PAGE_PATHS.track} onClick={(e) => handleLinkClick(e, () => onNavigate('track'))} className="block text-ink-600 hover:text-ink-950 transition-colors text-left">Track Shipment</a>
                <button onClick={onGetStarted} className="block text-ink-600 hover:text-ink-950 transition-colors text-left">
                  {loggedIn ? 'Go to Dashboard' : 'Customer Login'}
                </button>
              </div>
            </div>
          )}

          {variant === 'marketing' && (
            <div>
              <p className="text-xs font-bold text-ink-500 uppercase tracking-wider mb-4">Service Areas</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                {[...STATE_AREAS.map((a) => ({ slug: a.slug, label: a.name })), ...SERVICE_AREAS.map((a) => ({ slug: a.slug, label: a.name }))].map((a) => (
                  <a key={a.slug} href={areaPath(a.slug)} onClick={(e) => handleLinkClick(e, () => goToPath(areaPath(a.slug)))}
                    className="block text-ink-600 hover:text-ink-950 transition-colors">{a.label}</a>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-bold text-ink-500 uppercase tracking-wider mb-4">Get In Touch</p>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2.5 text-ink-600">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                <span>7/699, V.R.T.Mill (Opp), Sathy Main Road, P.Puliampatti - 638 459.</span>
              </div>
              <div className="flex items-center gap-2.5 text-ink-600">
                <Phone className="w-4 h-4 shrink-0" />
                <span>85269 87414</span>
              </div>
              <div className="flex items-center gap-2.5 text-ink-600">
                <Mail className="w-4 h-4 shrink-0" />
                <span>grtvspeedparcelservice@gmail.com</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-ink-100">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-5 text-center">
            <p className="text-xs text-ink-500">© {new Date().getFullYear()} GRTV Speed Parcel Service. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {showTop && (
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-50 w-11 h-11 rounded-xl bg-yellow-400 text-ink-950 flex items-center justify-center shadow-elevated hover:bg-yellow-300 transition animate-fade-in">
          <ChevronUp className="w-5 h-5" />
        </button>
      )}
    </>
  );
}
