import { useState } from 'react';
import { Truck } from 'lucide-react';
import { AuthProvider, useAuth } from './lib/auth';
import HomePage from './components/HomePage';
import AboutPage from './components/AboutPage';
import ContactPage from './components/ContactPage';
import TrackPage from './components/TrackPage';
import AuthPage from './components/AuthPage';
import SiteHeader, { type MarketingPage, type ServiceType } from './components/marketing/SiteHeader';
import SiteFooter from './components/marketing/SiteFooter';
import CustomerPanel from './panels/CustomerPanel';
import DriverPanel from './panels/DriverPanel';
import HubPanel from './panels/HubPanel';
import AdminPanel from './panels/AdminPanel';

function Shell() {
  const { profile, loading, signOut } = useAuth();
  const [view, setView] = useState<MarketingPage | 'auth'>('home');
  const [anchor, setAnchor] = useState<string | undefined>(undefined);
  const [marketingView, setMarketingView] = useState<MarketingPage | null>(null);
  const [marketingAnchor, setMarketingAnchor] = useState<string | undefined>(undefined);
  const [bookingIntent, setBookingIntent] = useState<ServiceType | null>(null);

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
