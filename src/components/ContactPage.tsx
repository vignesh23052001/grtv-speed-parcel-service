import React, { useEffect, useRef, useState } from "react";
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  MessageCircle,
  Sparkles,
  CheckCircle2,
  Navigation,
} from "lucide-react";
import SiteHeader, { type MarketingPage, type ServiceType } from "./marketing/SiteHeader";
import SiteFooter from "./marketing/SiteFooter";
import { Select } from "./ui";

interface ContactPageProps {
  onGetStarted: () => void;
  onNavigate: (page: MarketingPage, anchor?: string) => void;
  onServiceSelect?: (service: ServiceType) => void;
  loggedIn?: boolean;
  profileName?: string;
  profileRole?: string;
  onSignOut?: () => void;
}

const CONTACT_CARDS = [
  { icon: Mail, label: "Email", value: "grtvspeedparcelservice@gmail.com", href: "mailto:grtvspeedparcelservice@gmail.com" },
  { icon: Phone, label: "Call Us", value: "85269 87414", href: "tel:+918526987414" },
  { icon: MessageCircle, label: "WhatsApp", value: "97888 77099", href: "https://wa.me/919788877099" },
  { icon: MapPin, label: "Office", value: "P.Puliampatti, Sathyamangalam" },
];

const SUBJECTS = [
  "General Enquiry",
  "Technical Support",
  "Partnership",
  "Billing & Invoicing",
  "Feedback",
];

const OFFICES = [
  {
    city: "P.Puliampatti, Tamil Nadu",
    label: "Head Office",
    address: "7/699, V.R.T.Mill (Opp), Sathy Main Road, P.Puliampatti - 638 459.",
    phone: "85269 87414",
    hours: "Mon – Sat, 9:00 AM – 7:00 PM",
    mapsUrl: "https://www.google.com/maps/place/GRTV+SPEED+PARCEL+SERVICE/@11.3578549,77.1645438,16z/data=!4m6!3m5!1s0x3ba8e1b1f358bea9:0x312c06b4f8928f03!8m2!3d11.3579196!4d77.1695723!16s%2Fg%2F11mw122nd7",
    lat: 11.3579196,
    lng: 77.1695723,
  },
];

export default function ContactPage({ onGetStarted, onNavigate, onServiceSelect, loggedIn, profileName, profileRole, onSignOut }: ContactPageProps) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: SUBJECTS[0], message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [activeOffice, setActiveOffice] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("opacity-100", "translate-y-0");
            entry.target.classList.remove("opacity-0", "translate-y-10");
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

  function update(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return;
    setSubmitted(true);
    setForm({ name: "", email: "", phone: "", subject: SUBJECTS[0], message: "" });
    setTimeout(() => setSubmitted(false), 4000);
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-ink-50 text-ink-900 pt-[80px] overflow-x-hidden">
      <SiteHeader
        page="contact"
        onNavigate={onNavigate}
        onGetStarted={onGetStarted}
        onServiceSelect={onServiceSelect}
        loggedIn={loggedIn}
        profileName={profileName}
        profileRole={profileRole}
        onSignOut={onSignOut}
      />

      {/* Hero */}
      <section className="relative bg-ink-950 text-white py-16 md:py-24 text-center overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 left-1/4 h-72 w-72 rounded-full bg-brand-600/30 blur-3xl animate-float" />
          <div className="absolute -bottom-24 right-1/4 h-80 w-80 rounded-full bg-accent-500/20 blur-3xl animate-float [animation-delay:1.2s]" />
        </div>
        <div className="container mx-auto px-4 md:px-8 max-w-4xl relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-400/30 bg-white/5 backdrop-blur px-4 py-1.5 text-xs uppercase tracking-widest text-brand-300 mb-5 animate-fade-in">
            <Sparkles className="h-3.5 w-3.5 text-accent-400 animate-pulse-soft" /> Get In Touch
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight animate-slide-up">Let's start a conversation.</h1>
          <p className="text-ink-300 mt-4 max-w-xl mx-auto leading-relaxed text-base md:text-lg animate-slide-up [animation-delay:100ms]">
            Whether you have questions about our services, support requests, or partnership proposals, we are ready to assist.
          </p>
        </div>
      </section>

      {/* Info Cards Overlay */}
      <section className="container mx-auto px-4 md:px-8 -mt-10 relative z-10 max-w-6xl">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CONTACT_CARDS.map((c, i) => {
            const Content = (
              <div
                className="fade-up transition-all duration-700 opacity-0 translate-y-10 h-full rounded-2xl bg-white border border-ink-100 shadow-card p-6 hover:-translate-y-1.5 hover:shadow-card-hover transition-all"
                style={{ transitionDelay: `${i * 90}ms` }}
              >
                <div className="h-11 w-11 grid place-items-center rounded-xl bg-brand-gradient text-white mb-4 shadow-brand-glow">
                  <c.icon className="h-5 w-5" />
                </div>
                <div className="text-xs uppercase tracking-wider text-ink-400 font-semibold">{c.label}</div>
                <div className="mt-1 font-bold text-ink-800 break-words leading-snug">{c.value}</div>
              </div>
            );
            return c.href ? (
              <a key={c.label} href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
                {Content}
              </a>
            ) : (
              <div key={c.label}>{Content}</div>
            );
          })}
        </div>
      </section>

      {/* Form & Sidebar */}
      <section className="container mx-auto px-4 md:px-8 py-20 max-w-6xl">
        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-8">
          {/* Form */}
          <div className="fade-up transition-all duration-700 opacity-0 translate-y-10 rounded-2xl bg-white border border-ink-100 p-6 md:p-10 shadow-card">
            <p className="text-brand-600 text-xs uppercase tracking-widest font-bold mb-2">Send Message</p>
            <h2 className="text-2xl md:text-3xl font-bold mb-6">How can we help?</h2>

            {submitted ? (
              <div className="flex items-center gap-3 bg-success-50 border border-success-100 rounded-xl p-5 text-success-700 animate-slide-up">
                <CheckCircle2 className="w-6 h-6 text-success-600 shrink-0" />
                <div>
                  <p className="font-bold text-sm">Thank you! Your message has been received.</p>
                  <p className="text-xs text-success-700/80">We will respond shortly.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="text-sm font-medium text-ink-700 mb-1.5 block">Full Name</label>
                    <input
                      required
                      className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-shadow"
                      value={form.name}
                      onChange={(e) => update("name", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-ink-700 mb-1.5 block">Phone Number</label>
                    <input
                      className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-shadow"
                      value={form.phone}
                      onChange={(e) => update("phone", e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-ink-700 mb-1.5 block">Email Address</label>
                  <input
                    required
                    type="email"
                    className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-shadow"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-ink-700 mb-1.5 block">Subject</label>
                  <Select
                    value={form.subject}
                    onChange={(v) => update("subject", v)}
                    options={SUBJECTS}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-ink-700 mb-1.5 block">Message</label>
                  <textarea
                    required
                    rows={5}
                    className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 resize-none transition-shadow"
                    value={form.message}
                    onChange={(e) => update("message", e.target.value)}
                    placeholder="Provide detailed context..."
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-gradient hover:brightness-110 text-white font-semibold px-6 py-3 text-sm transition-all shadow-brand-glow active:scale-[0.98] w-full sm:w-auto"
                >
                  Send Message <Send className="h-4 w-4" />
                </button>
              </form>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="fade-up transition-all duration-700 opacity-0 translate-y-10 rounded-2xl bg-white border border-ink-100 p-6 shadow-card" style={{ transitionDelay: "100ms" }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 grid place-items-center rounded-xl bg-brand-gradient text-white shadow-brand-glow">
                  <Clock className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-ink-800">Support Hours</h3>
              </div>
              <div className="space-y-2 text-sm text-ink-600">
                <div className="flex justify-between">
                  <span>Monday – Friday</span>
                  <span className="font-semibold text-ink-800">9:00 AM – 6:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span>Saturday</span>
                  <span className="font-semibold text-ink-800">10:00 AM – 2:00 PM</span>
                </div>
              </div>
            </div>

            <div className="fade-up transition-all duration-700 opacity-0 translate-y-10 relative overflow-hidden rounded-2xl bg-ink-950 text-white p-6 shadow-elevated" style={{ transitionDelay: "180ms" }}>
              <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-brand-600/30 blur-3xl animate-float" />
              <h3 className="relative font-bold mb-2">Direct Outreach</h3>
              <p className="relative text-sm text-ink-300 mb-4">Need urgent support or real-time assistance? Contact us on WhatsApp.</p>
              <a
                href="https://wa.me/919788877099"
                target="_blank"
                rel="noreferrer"
                className="relative inline-flex items-center justify-center gap-2 rounded-full border border-white/20 hover:bg-white/10 text-white font-medium px-4 py-2.5 text-sm w-full transition-colors"
              >
                <MessageCircle className="h-4 w-4" /> Connect via WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Live Office Locations */}
      <section className="bg-white py-20 border-t border-ink-100">
        <div className="container mx-auto px-4 md:px-8 max-w-6xl">
          <div className="text-center mb-12 fade-up transition-all duration-700 opacity-0 translate-y-10">
            <p className="text-brand-600 text-xs uppercase tracking-widest font-bold">Find Us</p>
            <h2 className="text-3xl font-bold mt-2">Our Office Locations</h2>
            <p className="text-ink-500 mt-3 max-w-xl mx-auto">Find us on Google Maps, or drop by in person during working hours.</p>
          </div>

          <div className="grid lg:grid-cols-[1fr_1.3fr] gap-8">
            {/* Office list */}
            <div className="space-y-4 fade-up transition-all duration-700 opacity-0 translate-y-10">
              {OFFICES.map((office, i) => (
                <a
                  key={office.city}
                  href={office.mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setActiveOffice(i)}
                  className={`block w-full text-left rounded-2xl border p-5 transition-all cursor-pointer ${
                    activeOffice === i
                      ? "border-brand-500 bg-brand-50 shadow-card-hover"
                      : "border-ink-100 bg-white hover:border-brand-200 hover:bg-ink-50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`h-10 w-10 shrink-0 grid place-items-center rounded-xl transition-colors ${activeOffice === i ? "bg-brand-gradient text-white shadow-brand-glow" : "bg-ink-100 text-ink-500"}`}>
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-ink-800">{office.city}</h3>
                        <span className="text-[10px] uppercase tracking-wider font-bold text-brand-600 bg-brand-100 px-2 py-0.5 rounded-full">{office.label}</span>
                      </div>
                      <p className="text-sm text-ink-500 mt-1 leading-relaxed">{office.address}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-ink-500">
                        <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {office.phone}</span>
                        <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {office.hours}</span>
                      </div>
                      <span className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-brand-600">
                        <Navigation className="h-3 w-3" /> Open in Google Maps
                      </span>
                    </div>
                  </div>
                </a>
              ))}
            </div>

            {/* Live map */}
            <div
              className="fade-up transition-all duration-700 opacity-0 translate-y-10 rounded-2xl overflow-hidden border border-ink-100 shadow-card relative min-h-[420px]"
              style={{ transitionDelay: "120ms" }}
            >
              <iframe
                title="Office location map"
                src={`https://www.google.com/maps?q=GRTV+SPEED+PARCEL+SERVICE,${OFFICES[activeOffice].lat},${OFFICES[activeOffice].lng}&z=16&output=embed`}
                className="w-full h-[420px] lg:h-full min-h-[420px]"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              
              <a
                href={OFFICES[activeOffice].mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="absolute bottom-4 right-4 z-[1] inline-flex items-center gap-2 rounded-full bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold px-4 py-2.5 transition-colors shadow-brand-glow"
              >
                <Navigation className="h-3.5 w-3.5" /> Open in Google Maps
              </a>
            </div>
          </div>
        </div>
      </section>
      <SiteFooter onNavigate={onNavigate} onGetStarted={onGetStarted} loggedIn={loggedIn} />
    </div>
  );
}