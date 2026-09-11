import React, { useEffect, useRef } from "react";
import {
  ShieldCheck,
  Truck,
  Users,
  Navigation,
  Sparkles,
  ArrowRight,
  PackageCheck,
  Clock,
  Wallet,
  Warehouse,
} from "lucide-react";
import SiteHeader, { type MarketingPage, type ServiceType } from "./marketing/SiteHeader";
import SiteFooter from "./marketing/SiteFooter";

interface AboutPageProps {
  onGetStarted: () => void;
  onNavigate: (page: MarketingPage, anchor?: string) => void;
  onServiceSelect?: (service: ServiceType) => void;
  loggedIn?: boolean;
  profileName?: string;
  profileRole?: string;
  onSignOut?: () => void;
}

const STATS = [
  { value: "24+", label: "Years of Experience" },
  { value: "22M+", label: "Parcels Delivered" },
  { value: "39+", label: "Cities Served" },
  { value: "98%", label: "On-Time Delivery" },
];

const VALUES = [
  {
    icon: ShieldCheck,
    title: "Safety & Insurance",
    desc: "Every shipment is insured and handled under strict chain-of-custody protocols from pickup to final mile.",
  },
  {
    icon: Navigation,
    title: "Real-Time Visibility",
    desc: "Live GPS tracking and status alerts keep you informed at every stage of the journey.",
  },
  {
    icon: Clock,
    title: "On-Time Reliability",
    desc: "Optimized routing and a dedicated hub network keep delivery windows consistent and predictable.",
  },
  {
    icon: Wallet,
    title: "Transparent Pricing",
    desc: "Upfront, distance-based quotes for LTL and FTL shipments — no hidden fees, ever.",
  },
];

const PROCESS = [
  {
    icon: PackageCheck,
    title: "Request a Quote",
    desc: "Share pickup, drop-off, and package details to get instant, transparent pricing.",
  },
  {
    icon: Truck,
    title: "Schedule Pickup",
    desc: "Pick a convenient time slot — our courier arrives at your doorstep for collection.",
  },
  {
    icon: Navigation,
    title: "Safe Transport",
    desc: "Your shipment moves through our tracked hub-to-hub network with live GPS updates.",
  },
  {
    icon: ShieldCheck,
    title: "On-Time Delivery",
    desc: "OTP-verified, photo proof-of-delivery (e-POD) straight to the recipient's doorstep.",
  },
];

export default function AboutPage({ onGetStarted, onNavigate, onServiceSelect, loggedIn, profileName, profileRole, onSignOut }: AboutPageProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("opacity-100", "translate-y-0", "scale-100");
            entry.target.classList.remove("opacity-0", "translate-y-10", "scale-95");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    const animatedElements = containerRef.current?.querySelectorAll(".fade-up");
    animatedElements?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen bg-ink-50 text-ink-900 pt-[80px] overflow-x-hidden">
      <SiteHeader
        page="about"
        onNavigate={onNavigate}
        onGetStarted={onGetStarted}
        onServiceSelect={onServiceSelect}
        loggedIn={loggedIn}
        profileName={profileName}
        profileRole={profileRole}
        onSignOut={onSignOut}
      />

      {/* Hero Section */}
      <section className="relative bg-ink-950 text-white py-20 md:py-28 overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-brand-600/30 blur-3xl animate-float" />
          <div className="absolute -bottom-24 -right-16 h-96 w-96 rounded-full bg-accent-500/20 blur-3xl animate-float [animation-delay:1.5s]" />
          <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_40%,rgba(51,140,255,0.08)_50%,transparent_60%)] bg-[length:200%_200%] animate-gradient-x" />
        </div>
        <div className="container mx-auto px-4 md:px-8 relative z-10 max-w-6xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-400/30 bg-white/5 backdrop-blur px-4 py-1.5 text-xs uppercase tracking-widest text-brand-300 mb-6 animate-fade-in">
            <Sparkles className="h-3.5 w-3.5 text-accent-400 animate-pulse-soft" /> About GRTV Speed Parcel Service
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight max-w-3xl animate-slide-up">
            Moving what matters — on time, every time.
          </h1>
          <p className="text-ink-300 mt-4 max-w-2xl text-lg leading-relaxed animate-slide-up [animation-delay:100ms]">
            GRTV Speed Parcel Service connects businesses and individuals across Tamil Nadu, Bengaluru, and Kerala with fast, secure, and fully tracked parcel and freight delivery — powered by real-time technology and a dedicated logistics network of drivers and hubs.
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative bg-ink-900 text-white py-12 border-t border-white/5">
        <div className="container mx-auto px-4 md:px-8 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-6xl">
          {STATS.map((s, i) => (
            <div
              key={s.label}
              className="fade-up transition-all duration-700 opacity-0 translate-y-10 text-center md:text-left"
              style={{ transitionDelay: `${i * 90}ms` }}
            >
              <div className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-brand-300 to-accent-400 bg-clip-text text-transparent">{s.value}</div>
              <div className="text-ink-400 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Story Section */}
      <section className="container mx-auto px-4 md:px-8 py-20 max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="fade-up transition-all duration-700 opacity-0 translate-y-10">
            <p className="text-brand-600 text-xs uppercase tracking-widest font-bold mb-3">Our Mission</p>
            <h2 className="text-3xl md:text-4xl font-bold leading-tight mb-6">
              Built to make parcel and freight shipping effortless.
            </h2>
            <div className="space-y-4 text-ink-600 leading-relaxed">
              <p>
                GRTV Speed Parcel Service was founded to remove the friction from shipping across South India — whether it's a single LTL parcel or a full-truckload freight order. We combine a real-time tracking platform with a growing network of drivers, hubs, and warehouses across Tamil Nadu, Bengaluru, and Kerala so every shipment stays visible from pickup to proof-of-delivery.
              </p>
              <p>
                From doorstep pickup and secure e-POD to regional freight forwarding and warehousing, our customer, driver, hub, and admin portals work together to keep goods — and the people waiting for them — moving without surprises.
              </p>
            </div>
          </div>
          <div className="fade-up transition-all duration-700 opacity-0 translate-y-10 grid grid-cols-2 gap-4" style={{ transitionDelay: "120ms" }}>
            <div className="rounded-2xl overflow-hidden h-48 bg-ink-200 shadow-card border border-ink-100 group">
              <img src="/public/homepage/coimbatore.png" alt="Delivery truck loading" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
            </div>
            <div className="rounded-2xl overflow-hidden h-48 mt-6 bg-ink-200 shadow-card border border-ink-100 group">
              <img src="/public/homepage/madurai.png" alt="Warehouse hub operations" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
            </div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="relative bg-white py-20 border-y border-ink-100 overflow-hidden">
        <div className="pointer-events-none absolute -top-20 right-0 h-64 w-64 rounded-full bg-brand-100/60 blur-3xl" />
        <div className="container mx-auto px-4 md:px-8 max-w-6xl relative">
          <div className="text-center mb-12 fade-up transition-all duration-700 opacity-0 translate-y-10">
            <p className="text-brand-600 text-xs uppercase tracking-widest font-bold">What Drives Us</p>
            <h2 className="text-3xl md:text-4xl font-bold mt-2">Our Core Values</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {VALUES.map((v, i) => {
              const Icon = v.icon;
              return (
                <div
                  key={v.title}
                  className="fade-up transition-all duration-700 opacity-0 translate-y-10 scale-95 group rounded-2xl bg-white border border-ink-100 p-6 shadow-card hover:shadow-card-hover hover:-translate-y-1.5 transition-all"
                  style={{ transitionDelay: `${i * 100}ms` }}
                >
                  <div className="h-12 w-12 grid place-items-center rounded-xl bg-brand-gradient text-white mb-4 shadow-brand-glow transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{v.title}</h3>
                  <p className="text-sm text-ink-500 leading-relaxed">{v.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-slate-50 py-20 border-y border-ink-100">
        <div className="container mx-auto px-4 md:px-8 max-w-6xl">
          <div className="text-center mb-12 fade-up transition-all duration-700 opacity-0 translate-y-10">
            <p className="text-brand-600 text-xs uppercase tracking-widest font-bold">Booking Journey</p>
            <h2 className="text-3xl md:text-4xl font-bold mt-2">How We Move Your Shipment</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PROCESS.map((p, i) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.title}
                  className="fade-up transition-all duration-700 opacity-0 translate-y-10 group relative rounded-2xl bg-white border border-ink-100 p-6 shadow-card hover:shadow-card-hover hover:-translate-y-1.5 transition-all"
                  style={{ transitionDelay: `${i * 100}ms` }}
                >
                  <span className="absolute -top-4 -left-2 text-5xl font-black text-ink-100">{String(i + 1).padStart(2, "0")}</span>
                  <div className="relative h-12 w-12 grid place-items-center rounded-xl bg-brand-gradient text-white mb-4 shadow-brand-glow transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="relative font-bold text-lg mb-2">{p.title}</h3>
                  <p className="relative text-sm text-ink-500 leading-relaxed">{p.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="pb-20">
        <div className="container mx-auto px-4 md:px-8 max-w-6xl">
          <div className="fade-up transition-all duration-700 opacity-0 translate-y-10 relative overflow-hidden rounded-3xl bg-ink-950 p-8 md:p-14 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-6 shadow-elevated">
            <div className="pointer-events-none absolute -top-16 -right-10 h-56 w-56 rounded-full bg-brand-600/30 blur-3xl animate-float" />
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold leading-tight">Ready to ship your next parcel?</h2>
              <p className="text-ink-300 mt-2 max-w-md">Get in touch with our logistics team today and find out how we can move your shipment.</p>
            </div>
            <button
              onClick={() => onNavigate("contact")}
              className="relative inline-flex items-center gap-2 rounded-full bg-brand-gradient hover:brightness-110 text-white font-semibold px-6 py-3.5 transition-all shadow-brand-glow active:scale-[0.98]"
            >
              Contact Support <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <SiteFooter onNavigate={onNavigate} onGetStarted={onGetStarted} loggedIn={loggedIn} />
    </div>
  );
}