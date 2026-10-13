import { useEffect, useState } from 'react';
import { Truck } from 'lucide-react';
import { AuthProvider, useAuth } from './lib/auth';
import HomePage from './components/HomePage';
import AboutPage from './components/AboutPage';
import ContactPage from './components/ContactPage';
import TrackPage from './components/TrackPage';
import AuthPage from './components/AuthPage';
import AreaPage from './components/AreaPage';
import { AREA_BASE, getArea, areaPath, areaSeo, areaFaqs } from './data/serviceAreas';
import SiteHeader, { type MarketingPage, type ServiceType } from './components/marketing/SiteHeader';
import SiteFooter from './components/marketing/SiteFooter';
import CustomerPanel from './panels/CustomerPanel';
import DriverPanel from './panels/DriverPanel';
import HubPanel from './panels/HubPanel';
import AdminPanel from './panels/AdminPanel';

/* ---------- SEO: real URLs + per-page title/description ---------- */

type StaticView = MarketingPage | 'auth';
type PublicView = StaticView | 'area';

const SITE_URL = 'https://grtvspeedparcelservice.com';

const PATHS: Record<StaticView, string> = {
  home: '/',
  about: '/about',
  contact: '/contact',
  track: '/track',
  auth: '/login',
};

const SEO: Record<StaticView, { title: string; description: string; index: boolean }> = {
  home: {
    title: 'GRTV Speed Parcel Service | Parcel & Freight Transport in Tamil Nadu',
    description:
      'GRTV Speed Parcel Service: fast, reliable parcel and freight (LTL & FTL) transport from P.Puliampatti across Tamil Nadu, Karnataka and Kerala. Book online, track live.',
    index: true,
  },
  about: {
    title: 'About Us | GRTV Speed Parcel Service',
    description:
      'Learn about GRTV Speed Parcel Service, a parcel and freight transport company based in P.Puliampatti, Tamil Nadu, serving customers across South India.',
    index: true,
  },
  contact: {
    title: 'Contact & Office Location | GRTV Speed Parcel Service',
    description:
      'Contact GRTV Speed Parcel Service. Visit our office on Sathy Main Road, P.Puliampatti, call us, or send an enquiry for parcel and freight booking.',
    index: true,
  },
  track: {
    title: 'Track Your Shipment | GRTV Speed Parcel Service',
    description:
      'Track your GRTV Speed Parcel Service shipment live. Enter your tracking ID or phone number to see the latest status and delivery progress.',
    index: true,
  },
  auth: {
    title: 'Sign In | GRTV Speed Parcel Service',
    description: 'Sign in to book and manage your shipments with GRTV Speed Parcel Service.',
    index: false,
  },
};

function viewFromPath(pathname: string): { view: PublicView; slug: string | null } {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (clean.startsWith(AREA_BASE + '/')) {
    const slug = clean.slice(AREA_BASE.length + 1);
    if (getArea(slug)) return { view: 'area', slug };
  }
  const match = (Object.keys(PATHS) as StaticView[]).find((k) => PATHS[k] === clean);
  return { view: match ?? 'home', slug: null };
}

function pathFor(view: PublicView, slug: string | null) {
  return view === 'area' && slug ? areaPath(slug) : PATHS[view === 'area' ? 'home' : view];
}

function setPageJsonLd(data: object | null) {
  const id = 'page-ld';
  const existing = document.getElementById(id);
  if (!data) {
    existing?.remove();
    return;
  }
  const el = existing ?? document.createElement('script');
  el.id = id;
  el.setAttribute('type', 'application/ld+json');
  el.textContent = JSON.stringify(data);
  if (!existing) document.head.appendChild(el);
}

function upsertTag(selector: string, create: () => HTMLElement, attr: string, value: string) {
  let el = document.head.querySelector<HTMLElement>(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

function applySeo(view: PublicView, slug: string | null) {
  const area = view === 'area' && slug ? getArea(slug) : null;
  const { title, description, index } = area
    ? { ...areaSeo(area), index: true }
    : SEO[view === 'area' ? 'home' : view];
  const url = SITE_URL + pathFor(view, slug);
  document.title = title;

  const meta = (name: string) => () => {
    const m = document.createElement('meta');
    m.setAttribute('name', name);
    return m;
  };
  const og = (property: string) => () => {
    const m = document.createElement('meta');
    m.setAttribute('property', property);
    return m;
  };

  upsertTag('meta[name="description"]', meta('description'), 'content', description);
  upsertTag(
    'meta[name="robots"]',
    meta('robots'),
    'content',
    index ? 'index, follow, max-image-preview:large' : 'noindex, nofollow',
  );
  upsertTag('meta[property="og:title"]', og('og:title'), 'content', title);
  upsertTag('meta[property="og:description"]', og('og:description'), 'content', description);
  upsertTag('meta[property="og:url"]', og('og:url'), 'content', url);
  upsertTag('meta[name="twitter:title"]', meta('twitter:title'), 'content', title);
  upsertTag('meta[name="twitter:description"]', meta('twitter:description'), 'content', description);
  upsertTag(
    'link[rel="canonical"]',
    () => {
      const l = document.createElement('link');
      l.setAttribute('rel', 'canonical');
      return l;
    },
    'href',
    url,
  );

  if (area) {
    setPageJsonLd({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Service',
          name: `Parcel & freight transport in ${area.name}`,
          serviceType: 'Parcel delivery and freight transport',
          url,
          provider: { '@type': 'MovingCompany', name: 'GRTV Speed Parcel Service', url: SITE_URL + '/', telephone: '+91-85269-87414' },
          areaServed: { '@type': area.kind === 'city' ? 'City' : 'AdministrativeArea', name: area.name },
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL + '/' },
            { '@type': 'ListItem', position: 2, name: area.name, item: url },
          ],
        },
        {
          '@type': 'FAQPage',
          mainEntity: areaFaqs(area).map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        },
      ],
    });
  } else {
    setPageJsonLd(null);
  }
}

function Shell() {
  const { profile, loading, signOut } = useAuth();
  const initial = viewFromPath(window.location.pathname);
  const [view, setView] = useState<PublicView>(initial.view);
  const [areaSlug, setAreaSlug] = useState<string | null>(initial.slug);
  const [anchor, setAnchor] = useState<string | undefined>(undefined);
  const [marketingView, setMarketingView] = useState<MarketingPage | null>(null);
  const [marketingAnchor, setMarketingAnchor] = useState<string | undefined>(undefined);
  const [bookingIntent, setBookingIntent] = useState<ServiceType | null>(null);

  // Keep the address bar and page title in sync with the public page being shown
  // (only for visitors who are not signed in, which is what search engines see).
  useEffect(() => {
    if (loading || profile) return;
    const path = pathFor(view, areaSlug);
    if (window.location.pathname !== path) window.history.pushState({}, '', path);
    applySeo(view, areaSlug);
  }, [view, areaSlug, profile, loading]);

  // Browser back/forward buttons
  useEffect(() => {
    const onPop = () => {
      const r = viewFromPath(window.location.pathname);
      setView(r.view);
      setAreaSlug(r.slug);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  function navigate(page: MarketingPage, targetAnchor?: string) {
    setView(page);
    setAnchor(targetAnchor);
    window.scrollTo({ top: 0 });
  }

  function openMarketing(page: MarketingPage, targetAnchor?: string) {
    setMarketingView(page);
    setMarketingAnchor(targetAnchor);
    window.scrollTo({ top: 0 });
  }

  function closeMarketing() {
    setMarketingView(null);
    window.scrollTo({ top: 0 });
  }

  function selectService(service: ServiceType) {
    setBookingIntent(service);
    if (!profile) {
      setView('auth');
      return;
    }
    setMarketingView(null);
    window.scrollTo({ top: 0 });
  }

  function handleSignOut() {
    signOut();
    setView('home');
    setMarketingView(null);
    setBookingIntent(null);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-600 flex items-center justify-center animate-pulse-soft">
            <Truck className="w-6 h-6 text-white" />
          </div>
          <p className="text-sm text-ink-500 font-medium">Loading GRTV Speed Parcel Service…</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    if (view === 'auth') return <AuthPage onBack={() => setView('home')} />;
    if (view === 'area' && areaSlug) {
      const area = getArea(areaSlug);
      if (area) return <AreaPage area={area} onGetStarted={() => setView('auth')} onNavigate={navigate} onServiceSelect={selectService} />;
    }
    if (view === 'about') return <AboutPage onGetStarted={() => setView('auth')} onNavigate={navigate} onServiceSelect={selectService} />;
    if (view === 'contact') return <ContactPage onGetStarted={() => setView('auth')} onNavigate={navigate} onServiceSelect={selectService} />;
    if (view === 'track') return <TrackPage onGetStarted={() => setView('auth')} onNavigate={navigate} />;
    return <HomePage onGetStarted={() => setView('auth')} onNavigate={navigate} onServiceSelect={selectService} anchor={anchor} />;
  }

  // Logged in, but browsing the public Home / About / Contact / Track pages
  if (marketingView) {
    const marketingProps = {
      onGetStarted: closeMarketing,
      onNavigate: openMarketing,
      onServiceSelect: selectService,
      loggedIn: true,
      profileName: profile.name,
      profileRole: profile.role,
      onSignOut: handleSignOut,
    };
    if (marketingView === 'about') return <AboutPage {...marketingProps} />;
    if (marketingView === 'contact') return <ContactPage {...marketingProps} />;
    if (marketingView === 'track') return <TrackPage {...marketingProps} />;
    return <HomePage {...marketingProps} anchor={marketingAnchor} />;
  }

  const Active = ({
    customer: CustomerPanel,
    driver: DriverPanel,
    hub: HubPanel,
    admin: AdminPanel,
  } as Record<string, typeof CustomerPanel>)[profile.role] ?? CustomerPanel;

  const customerBookingProps =
    profile.role === 'customer' && bookingIntent
      ? { initialTab: 'book' as const, initialServiceType: bookingIntent }
      : {};

  return (
    <div className="min-h-screen bg-ink-50 pt-[80px]">
      <SiteHeader
        page="dashboard"
        onNavigate={openMarketing}
        onGetStarted={() => {}}
        onServiceSelect={selectService}
        loggedIn
        profileName={profile.name}
        profileRole={profile.role}
        onSignOut={handleSignOut}
      />

      <Active profile={profile} {...customerBookingProps} />

      <SiteFooter variant="app" />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
