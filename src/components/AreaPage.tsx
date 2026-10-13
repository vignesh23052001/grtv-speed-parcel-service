import { ArrowRight, MapPin, PackageCheck, Truck, Radar, Home, Phone, ChevronDown } from 'lucide-react';
import SiteHeader, { type MarketingPage, type ServiceType, handleLinkClick } from './marketing/SiteHeader';
import SiteFooter from './marketing/SiteFooter';
import {
  type AreaEntry, SERVICE_AREAS, STATE_AREAS, areaFaqs, areaPath, goToPath,
} from '../data/serviceAreas';

interface AreaPageProps {
  area: AreaEntry;
  onGetStarted: () => void;
  onNavigate: (page: MarketingPage, anchor?: string) => void;
  onServiceSelect?: (service: ServiceType) => void;
  loggedIn?: boolean;
  profileName?: string;
  profileRole?: string;
  onSignOut?: () => void;
}

const SERVICES = [
  { icon: PackageCheck, title: 'LTL Parcel Transport', desc: 'Shared transport for one parcel or many — pay only for the space you use.' },
  { icon: Truck, title: 'Full Truckload (FTL)', desc: 'A dedicated vehicle reserved for bulk and heavy shipments.' },
  { icon: Home, title: 'Doorstep Pickup', desc: 'We can collect from your shop, factory or home when you book.' },
  { icon: Radar, title: 'Live Tracking', desc: 'Follow your shipment status online with your tracking ID.' },
];

export default function AreaPage({ area, onGetStarted, onNavigate, onServiceSelect, loggedIn, profileName, profileRole, onSignOut }: AreaPageProps) {
  const faqs = areaFaqs(area);
  const isCity = area.kind === 'city';
  const heading = isCity
    ? `Parcel & Courier Service in ${area.name}${area.aka ? ` (${area.aka})` : ''}`
    : `Parcel & Freight Transport in ${area.name}`;

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader
        page="home"
        onNavigate={onNavigate}
        onGetStarted={onGetStarted}
        onServiceSelect={onServiceSelect}
        loggedIn={loggedIn}
        profileName={profileName}
        profileRole={profileRole}
        onSignOut={onSignOut}
      />

      <section className="relative bg-ink-950 text-white pt-32 pb-16 md:pt-40 md:pb-24 overflow-hidden">
        <div className="container mx-auto px-4 md:px-8 max-w-6xl relative">
          <nav aria-label="Breadcrumb" className="text-xs text-white/60 mb-5 flex flex-wrap gap-1.5">
            <a href="/" onClick={(e) => handleLinkClick(e, () => onNavigate('home'))} className="hover:text-white">Home</a>
            <span>/</span>
            <span>Service Areas</span>
            <span>/</span>
            <span className="text-white">{area.name}</span>
          </nav>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight max-w-3xl">{heading}</h1>
          <p className="mt-5 text-white/80 text-base md:text-lg max-w-2xl">
            {area.intro} GRTV Speed Parcel Service offers LTL parcel and full-truckload freight
            {isCity ? ` for ${area.name}` : ` across ${area.name}`}, with online booking and live tracking.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={onGetStarted} className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm bg-yellow-400 text-ink-950 hover:bg-yellow-300 transition">
              Book a Parcel <ArrowRight className="w-4 h-4" />
            </button>
            <a href="tel:+918526987414" className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm border border-white/30 hover:bg-white/10 transition">
              <Phone className="w-4 h-4" /> 85269 87414
            </a>
          </div>
        </div>
      </section>

      <section className="py-14 md:py-20">
        <div className="container mx-auto px-4 md:px-8 max-w-6xl">
          <h2 className="text-2xl md:text-3xl font-extrabold text-ink-950 mb-8">Our services for {area.name}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {SERVICES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl border border-ink-100 p-6 bg-white shadow-card">
                <div className="w-11 h-11 rounded-xl bg-yellow-400 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-ink-950" />
                </div>
                <h3 className="font-bold text-ink-950 mb-1.5">{title}</h3>
                <p className="text-sm text-ink-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 md:py-16 bg-ink-50">
        <div className="container mx-auto px-4 md:px-8 max-w-6xl grid md:grid-cols-2 gap-10">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-ink-950 mb-4">What people send {isCity ? `to and from ${area.name}` : `across ${area.name}`}</h2>
            <ul className="space-y-2.5 text-ink-700">
              {area.goods.map((g) => (
                <li key={g} className="flex items-start gap-2.5"><MapPin className="w-4 h-4 mt-1 text-brand-600 shrink-0" />{g}</li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-ink-500">Not sure your item is accepted? Call us before booking and we will confirm.</p>
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-ink-950 mb-4">How booking works</h2>
            <ol className="space-y-3 text-ink-700 list-decimal pl-5">
              <li>Create a free account or sign in on our website.</li>
              <li>Choose LTL parcel or FTL and enter pickup and delivery details.</li>
              <li>Our team confirms the booking and arranges pickup.</li>
              <li>Track the shipment online until it is delivered.</li>
            </ol>
          </div>
        </div>
      </section>

      <section className="py-14 md:py-20">
        <div className="container mx-auto px-4 md:px-8 max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-extrabold text-ink-950 mb-6">Frequently asked questions</h2>
          <div className="space-y-3">
            {faqs.map((f) => (
              <details key={f.q} className="group rounded-xl border border-ink-100 p-5 bg-white">
                <summary className="flex items-center justify-between cursor-pointer font-semibold text-ink-900 list-none">
                  {f.q}
                  <ChevronDown className="w-4 h-4 transition group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm text-ink-600 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 bg-ink-50">
        <div className="container mx-auto px-4 md:px-8 max-w-6xl">
          <h2 className="text-xl font-extrabold text-ink-950 mb-4">We also deliver to</h2>
          <div className="flex flex-wrap gap-2.5">
            {[...STATE_AREAS.map((s) => ({ slug: s.slug, label: `All of ${s.name}` })),
              ...SERVICE_AREAS.filter((c) => c.slug !== area.slug).map((c) => ({ slug: c.slug, label: c.name }))].filter((l) => l.slug !== area.slug).map((l) => (
              <a key={l.slug} href={areaPath(l.slug)} onClick={(e) => handleLinkClick(e, () => goToPath(areaPath(l.slug)))}
                className="px-4 py-2 rounded-full bg-white border border-ink-200 text-sm text-ink-700 hover:bg-ink-950 hover:text-white transition">
                {l.label}
              </a>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter onNavigate={onNavigate} onGetStarted={onGetStarted} loggedIn={loggedIn} />
    </div>
  );
}
