import { useEffect, useRef, useState } from 'react';
import {
  Truck, ArrowRight, MapPin, ShieldCheck, Wallet,
  ChevronLeft, ChevronRight, ArrowUpRight, X, ArrowDown,
} from 'lucide-react';
import SiteHeader, { type MarketingPage, type ServiceType } from './marketing/SiteHeader';
import SiteFooter from './marketing/SiteFooter';

interface HomePageProps {
  onGetStarted: () => void;
  onNavigate: (page: MarketingPage, anchor?: string) => void;
  onServiceSelect?: (service: ServiceType) => void;
  anchor?: string;
  loggedIn?: boolean;
  profileName?: string;
  profileRole?: string;
  onSignOut?: () => void;
}

const STEPS = [
  { 
    step: 'Step 1', 
    title: 'Request a Quote', 
    desc: 'Share your pickup and drop-off details across Tamil Nadu, Bengaluru, or Kerala and get an instant, transparent price.', 
    img: '/homepage/our serviceimg4.png' 
  },
  { 
    step: 'Step 2', 
    title: 'Schedule Pickup', 
    desc: 'Pick a convenient time slot and our team collects your parcel or freight directly from your doorstep.', 
    img: '/homepage/1.png' 
  },
  { 
    step: 'Step 3', 
    title: 'Safe Transport', 
    desc: 'Your shipment moves through our tracked hub network with real-time GPS visibility at every stage.', 
    img: '/homepage/our serviceimg2.png' 
  },
  { 
    step: 'Step 4', 
    title: 'On-Time Delivery', 
    desc: 'OTP-verified proof of delivery straight to the recipient — fast, safe, and always on schedule.', 
    img: '/homepage/2.png' 
  },
];

const BENEFITS = [
  { icon: ShieldCheck, title: 'Trusted & Insured', desc: 'Complete coverage and safety guarantee for your peace of mind.', highlight: false },
  { icon: Truck, title: 'Fast Delivery On Time', desc: 'Our regional hub network keeps delivery windows across South India consistent and predictable.', highlight: true },
  { icon: MapPin, title: 'South India Reach', desc: 'Dense coverage across Tamil Nadu, Bengaluru, and Kerala with growing hub and pickup points.', highlight: false },
  { icon: Wallet, title: 'Competitive Pricing', desc: 'Flexible transport rates tailored to your budget constraints.', highlight: false },
];

const CITIES = [
  { title: 'Chennai', state: 'Tamil Nadu', img: '/homepage/Chennai.png' },
  { title: 'Coimbatore', state: 'Tamil Nadu', img: '/homepage/coimbatore.png' },
  { title: 'Bengaluru', state: 'Karnataka', img: '/homepage/Bengaluru.png' },
  { title: 'Madurai', state: 'Tamil Nadu', img: '/homepage/madurai.png' },
  { title: 'Kochi', state: 'Kerala', img: '/homepage/1.png' },
  { title: 'Salem', state: 'Tamil Nadu', img: '/homepage/our serviceimg2.png' },
  { title: 'Tiruppur', state: 'Tamil Nadu', img: '/homepage/tiruppur.png' },
  { title: 'Thiruvananthapuram', state: 'Kerala', img: '/homepage/our serviceimg4.png' },
  { title: 'Erode', state: 'Tamil Nadu', img: '/homepage/erode.png' },
];

const REVIEWS = [
  { name: 'Karthik Raman', role: 'E-commerce Seller, Coimbatore', text: 'We ship 50+ parcels a day across Tamil Nadu and GRTV has never missed a pickup window. Tracking is spot on.', avatar: '/homepage/b1.png' },
  { name: 'Divya Nair', role: 'Boutique Owner, Kochi', text: 'Doorstep pickup and fair pricing made switching easy. My customers get their orders faster than before.', avatar: '/homepage/g1.png' },
  { name: 'Arjun Sridhar', role: 'Wholesale Trader, Bengaluru', text: 'FTL booking for bulk freight is straightforward and the e-POD proof of delivery keeps our accounts clean.', avatar: '/homepage/b2.png' },
  { name: 'Meena Subramaniam', role: 'Regular Customer, Salem', text: 'I track every parcel from pickup to delivery on my phone. No more calling to ask where my shipment is.', avatar: '/homepage/g3.png' },
  { name: 'Vishnu Prasad', role: 'Textile Exporter, Tiruppur', text: 'Reliable freight forwarding between our Tiruppur warehouse and hubs across the state. Consistent and on time.', avatar: '/homepage/b3.png' },
  { name: 'Lakshmi Priya', role: 'Home Business Owner, Madurai', text: 'Counter booking at the local hub is quick and the staff always explain charges clearly upfront.', avatar: '/homepage/g2.png' },
];

const FAQS = [
  { q: 'Which areas does GRTV Speed Parcel Service cover?', a: 'We currently operate across Tamil Nadu, Bengaluru, and Kerala, with hub and pickup points in 39+ cities and growing.' },
  { q: 'What is the difference between LTL and FTL booking?', a: 'LTL (part-load) is for smaller parcels sharing transport with other shipments. FTL reserves a dedicated vehicle for bulk or full-truckload freight.' },
  { q: 'How can I track my shipment?', a: 'Use the Track Shipment page with your tracking ID, or your phone number to see your complete sent and received history — no login required.' },
  { q: 'Do you offer doorstep pickup?', a: 'Yes, doorstep pickup is available for both LTL and FTL bookings — just share your address and preferred time slot when booking.' },
  { q: 'How do I pay for a booking?', a: 'Counter bookings can be paid in full, partially, or marked unpaid for later settlement. Online bookings are reviewed and confirmed by our team before pickup.' },
];

export default function HomePage({ onGetStarted, onNavigate, onServiceSelect, anchor, loggedIn, profileName, profileRole, onSignOut }: HomePageProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeReviewIndex, setActiveReviewIndex] = useState(0);
  const destScrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!anchor) return;
    const timer = setTimeout(() => {
      document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    return () => clearTimeout(timer);
  }, [anchor]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('opacity-100', 'translate-y-0', 'scale-100');
            entry.target.classList.remove('opacity-0', 'translate-y-10', 'scale-95');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    const animatedElements = containerRef.current?.querySelectorAll('.fade-up');
    animatedElements?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  function scrollDestinations(dir: 1 | -1) {
    destScrollRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' });
  }

  function handleReviewPrev() {
    setActiveReviewIndex((prev) => (prev === 0 ? REVIEWS.length - 1 : prev - 1));
  }

  function handleReviewNext() {
    setActiveReviewIndex((prev) => (prev === REVIEWS.length - 1 ? 0 : prev + 1));
  }

  return (
    <div id="top" ref={containerRef} className="min-h-screen bg-[#FCFCFC] text-[#111827] overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative w-full min-h-screen overflow-hidden bg-slate-950 flex flex-col justify-between p-6 sm:p-12 text-white">
        {/* Mobile View Hero Image */}
        <img
          src="/heroimagemobile1.png"
          alt="GRTV Speed Parcel Service Mobile"
          className="block sm:hidden absolute inset-0 w-full h-full object-cover object-top z-0"
        />

        {/* Laptop/Desktop View Hero Image */}
        <img
          src="/heroimage.png"
          alt="GRTV Speed Parcel Service Desktop"
          className="hidden sm:block absolute inset-0 w-full h-full object-cover object-top z-0"
        />

        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/30 z-0" />

        <div className="relative z-50 w-full">
          <SiteHeader
            page="home"
            onNavigate={onNavigate}
            onGetStarted={onGetStarted}
            onServiceSelect={onServiceSelect}
            loggedIn={loggedIn}
            profileName={profileName}
            profileRole={profileRole}
            onSignOut={onSignOut}
            transparentAtTop
          />
        </div>
      </section>

      {/* Our Services */}
      <section id="services" className="max-w-[1200px] mx-auto px-6 pt-16 pb-12 scroll-mt-[88px]">
        <div className="grid lg:grid-cols-12 gap-8 items-center mb-12">
          <div className="lg:col-span-5 fade-up transition-all duration-700 opacity-0 translate-y-10">
            <span className="text-xs text-gray-500 font-medium block mb-2">Our Services</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-4">
              <span className="px-2 py-0.5 rounded">Holistic</span><br />
              Transport &amp;<br />
              Logistics
            </h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-6 max-w-sm">
              Our logistics services are built for South India — from LTL parcel booking and FTL freight to warehousing across Tamil Nadu, Bengaluru, and Kerala.
            </p>
            <button onClick={onGetStarted} className="inline-flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-lg text-xs font-semibold hover:bg-gray-800 transition cursor-pointer">
              Explore Services <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="lg:col-span-7 grid sm:grid-cols-2 gap-6">
            <div className="fade-up transition-all duration-700 opacity-0 translate-y-10 relative rounded-2xl overflow-hidden group h-80 shadow-sm border border-gray-100" style={{ transitionDelay: '100ms' }}>
              <img src="/homepage/1.png" alt="Freight Forwarding" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-6 flex flex-col justify-between">
                <div className="flex justify-end">
                  <span className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center">
                    <ArrowUpRight className="w-4 h-4" />
                  </span>
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg mb-1">Freight Forwarding</h3>
                  <p className="text-gray-200 text-sm leading-snug">Reliable road freight forwarding across Tamil Nadu, Bengaluru &amp; Kerala.</p>
                </div>
              </div>
            </div>

            <div className="fade-up transition-all duration-700 opacity-0 translate-y-10 relative rounded-2xl overflow-hidden group h-80 shadow-sm border border-gray-100" style={{ transitionDelay: '200ms' }}>
              <img src="/homepage/2.png" alt="Warehousing" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-6 flex flex-col justify-between">
                <div className="flex justify-end">
                  <span className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center">
                    <ArrowUpRight className="w-4 h-4" />
                  </span>
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg mb-1">Warehousing</h3>
                  <p className="text-gray-200 text-sm leading-snug">Secure, scalable, and tech-enabled storage solutions.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-gray-200 border-t border-gray-100 pt-10 mt-6">
          <div className="fade-up transition-all duration-700 opacity-0 translate-y-10 text-center px-4">
            <div className="text-3xl sm:text-4xl font-bold text-gray-900 mb-1">24+</div>
            <div className="text-sm text-gray-400 font-medium">Years of Experience</div>
          </div>
          <div className="fade-up transition-all duration-700 opacity-0 translate-y-10 text-center px-4" style={{ transitionDelay: '90ms' }}>
            <div className="text-3xl sm:text-4xl font-bold text-gray-900 mb-1">22M+</div>
            <div className="text-sm text-gray-400 font-medium">Parcels Delivered</div>
          </div>
          <div className="fade-up transition-all duration-700 opacity-0 translate-y-10 text-center px-4" style={{ transitionDelay: '180ms' }}>
            <div className="text-3xl sm:text-4xl font-bold text-gray-900 mb-1">39+</div>
            <div className="text-sm text-gray-400 font-medium">Cities Served</div>
          </div>
          <div className="fade-up transition-all duration-700 opacity-0 translate-y-10 text-center px-4" style={{ transitionDelay: '270ms' }}>
            <div className="text-3xl sm:text-4xl font-bold text-gray-900 mb-1">98%</div>
            <div className="text-sm text-gray-400 font-medium">On-Time Delivery</div>
          </div>
        </div>
      </section>

      {/* How We Move Your Products */}
      <section className="relative bg-[#050505] text-white py-20 overflow-hidden" id="how-it-works">
        <div className="max-w-[1140px] mx-auto px-6 relative">
          <div className="grid lg:grid-cols-[1.1fr_1fr_1fr] gap-6 items-start">
            <div className="flex flex-col gap-6">
              <div className="fade-up transition-all duration-700 opacity-0 translate-y-10">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-500 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Service
                </span>
                <h2 className="text-3xl sm:text-4xl font-bold leading-tight">
                  How We<br />Move your<br />Products
                </h2>
              </div>

              <div className="fade-up transition-all duration-700 opacity-0 translate-y-10 mt-4" style={{ transitionDelay: '150ms' }}>
                <img src={STEPS[2].img} alt={STEPS[2].title} className="w-full h-44 object-cover rounded-xl mb-4" />
                <span className="inline-block bg-[#1B59F8] text-white text-xs font-medium px-2 py-0.5 rounded mb-2">
                  Step 3
                </span>
                <h3 className="text-lg font-bold mb-1">{STEPS[2].title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed max-w-xs">{STEPS[2].desc}</p>
              </div>
            </div>

            <div className="flex flex-col gap-8">
              <div className="fade-up transition-all duration-700 opacity-0 translate-y-10" style={{ transitionDelay: '80ms' }}>
                <img src={STEPS[0].img} alt={STEPS[0].title} className="w-full h-44 object-cover rounded-xl mb-4" />
                <span className="inline-block bg-[#1B59F8] text-white text-xs font-medium px-2 py-0.5 rounded mb-2">
                  Step 1
                </span>
                <h3 className="text-lg font-bold mb-1">{STEPS[0].title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed max-w-xs">{STEPS[0].desc}</p>
              </div>

              <div className="fade-up transition-all duration-700 opacity-0 translate-y-10" style={{ transitionDelay: '230ms' }}>
                <img src={STEPS[3].img} alt={STEPS[3].title} className="w-full h-44 object-cover rounded-xl mb-4" />
                <span className="inline-block bg-[#1B59F8] text-white text-xs font-medium px-2 py-0.5 rounded mb-2">
                  Step 4
                </span>
                <h3 className="text-lg font-bold mb-1">{STEPS[3].title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed max-w-xs">{STEPS[3].desc}</p>
              </div>
            </div>

            <div className="flex flex-col justify-between h-full pt-1 sm:pt-0">
              <div className="fade-up transition-all duration-700 opacity-0 translate-y-10" style={{ transitionDelay: '120ms' }}>
                <img src={STEPS[1].img} alt={STEPS[1].title} className="w-full h-44 object-cover rounded-xl mb-4" />
                <span className="inline-block bg-[#1B59F8] text-white text-xs font-medium px-2 py-0.5 rounded mb-2">
                  Step 2
                </span>
                <h3 className="text-lg font-bold mb-1">{STEPS[1].title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed max-w-xs">{STEPS[1].desc}</p>
              </div>

              <div className="flex justify-end mt-12">
                <button onClick={onGetStarted} className="bg-[#FFAE00] text-black text-xs font-bold px-4 py-2.5 rounded-lg hover:bg-amber-400 transition inline-flex items-center gap-1 shadow-md active:scale-[0.98] cursor-pointer">
                  Book now ↗
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-20 bg-white">
        <div className="max-w-[1140px] mx-auto px-6 text-center">
          <span className="fade-up transition-all duration-700 opacity-0 translate-y-10 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-500 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Benefits
          </span>
          <h2 className="fade-up transition-all duration-700 opacity-0 translate-y-10 text-3xl sm:text-4xl font-bold mb-14">Why Choose Us</h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {BENEFITS.map((b, i) => (
              <div
                key={b.title}
                className={`fade-up transition-all duration-700 opacity-0 translate-y-10 p-8 rounded-2xl text-left border border-gray-100 flex flex-col justify-between hover:-translate-y-1.5 hover:shadow-lg ${b.highlight ? 'bg-[#FFAE00] text-black border-none shadow-xl scale-105' : 'bg-[#F9F9FB] text-black'}`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="w-9 h-9 rounded-full bg-amber-100/60 flex items-center justify-center mb-10">
                  <b.icon className="w-4 h-4 text-amber-700" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2">{b.title}</h3>
                  <p className={`text-sm leading-relaxed ${b.highlight ? 'text-black/80' : 'text-gray-500'}`}>{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cities We Serve Carousel Section */}
      <section className="py-20 bg-white border-t border-gray-100">
        <div className="max-w-[1140px] mx-auto px-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-10 gap-4 fade-up transition-all duration-700 opacity-0 translate-y-10">
            <div>
              <span className="border border-gray-200 text-gray-500 text-xs font-medium px-3 py-1 rounded-full inline-block mb-3">
                Our Coverage
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
                Cities We Serve Across<br />
                Tamil Nadu, Bengaluru &amp; Kerala
              </h2>
            </div>

            <div className="flex items-center gap-4">
              <button onClick={onGetStarted} className="inline-flex items-center gap-2 border border-gray-300 rounded-full px-4 py-2 text-xs font-semibold hover:bg-gray-50 transition cursor-pointer">
                Book a Shipment <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
              
              <div className="flex gap-2">
                <button onClick={() => scrollDestinations(-1)} aria-label="Scroll left" className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition cursor-pointer">
                  <ChevronLeft className="w-4 h-4 text-gray-600" />
                </button>
                <button onClick={() => scrollDestinations(1)} aria-label="Scroll right" className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition cursor-pointer">
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          </div>

          <div ref={destScrollRef} className="flex gap-6 overflow-x-auto pb-6 scroll-smooth scrollbar-none">
            {CITIES.map((d, i) => (
              <div
                key={i}
                className="fade-up transition-all duration-700 opacity-0 translate-y-10 shrink-0 w-72 h-96 rounded-3xl overflow-hidden relative group shadow-sm"
                style={{ transitionDelay: `${(i % 4) * 90}ms` }}
              >
                <img src={d.img} alt={d.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                
                <div className="absolute top-4 left-4">
                  <span className="w-8 h-8 rounded-full bg-white/80 backdrop-blur-md text-black flex items-center justify-center shadow">
                    <ArrowUpRight className="w-4 h-4" />
                  </span>
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-6 flex flex-col justify-end text-white">
                  <h3 className="font-bold text-lg mb-0.5">{d.title}</h3>
                  <p className="text-sm text-gray-300 font-medium">{d.state}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Client Reviews Section */}
      <section className="relative z-0 isolate py-20 bg-[#F9FAFB] border-t border-gray-100">
        <div className="max-w-[1140px] mx-auto px-6">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5 flex flex-col gap-6 fade-up transition-all duration-700 opacity-0 translate-y-10">
              <div>
                <span className="bg-white border border-gray-200 text-gray-500 text-xs font-medium px-2.5 py-1 rounded-full inline-block mb-3">
                  Customer story
                </span>
                <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-2">
                  How Businesses Across South India Ship With Us
                </h2>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span className="font-bold text-gray-900">4.5/5</span>
                  <div className="flex text-amber-400">
                    {'★'.repeat(5)}
                  </div>
                  <span>(Trusted by 1500+ customers)</span>
                </div>
              </div>

              <div className="relative h-96 w-full flex items-center justify-center my-4">
                <div className="absolute w-44 h-56 rounded-2xl overflow-hidden -rotate-12 -translate-x-12 opacity-80 shadow-md">
                  <img src="/homepage/coimbatore.png" alt="Delivery truck loading" className="w-full h-full object-cover" />
                </div>
                <div className="absolute w-44 h-56 rounded-2xl overflow-hidden rotate-12 translate-x-12 opacity-80 shadow-md">
                  <img src="/homepage/2.png" alt="Warehouse hub operations" className="w-full h-full object-cover" />
                </div>
                <div className="relative z-10 w-52 h-64 rounded-2xl overflow-hidden shadow-xl border-4 border-white">
                  <img src="/homepage/1.png" alt="Freight forwarding" className="w-full h-full object-cover" />
                </div>
              </div>

              <div className="flex justify-center gap-3">
                <button onClick={handleReviewPrev} aria-label="Previous review" className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-white transition cursor-pointer">
                  <ChevronLeft className="w-4 h-4 text-gray-600" />
                </button>
                <button onClick={handleReviewNext} aria-label="Next review" className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-white transition cursor-pointer">
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>

            <div className="lg:col-span-7 grid sm:grid-cols-2 gap-4">
              {REVIEWS.map((r, index) => (
                <div
                  key={index}
                  className="fade-up transition-all duration-700 opacity-0 translate-y-10 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between relative group hover:shadow-md hover:-translate-y-1"
                  style={{ transitionDelay: `${(index % 6) * 80}ms` }}
                >
                  <button aria-label="Dismiss feedback" className="absolute top-4 right-4 text-gray-300 hover:text-gray-500 cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <p className="text-gray-600 text-sm leading-relaxed mb-6">"{r.text}"</p>
                  <div className="flex items-center gap-3">
                    <img src={r.avatar} alt={r.name} className="w-7 h-7 rounded-full object-cover" />
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">{r.name}</h4>
                      <span className="text-sm text-gray-400 block">{r.role}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-[#F8F9FA]">
        <div className="max-w-[1140px] mx-auto px-6">
          <div className="grid lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-5 flex flex-col justify-between h-full fade-up transition-all duration-700 opacity-0 translate-y-10">
              <div>
                <span className="bg-white border border-gray-200 text-gray-500 text-xs font-medium px-3 py-1 rounded-full inline-block mb-6 shadow-2xs">
                  FAQ
                </span>

                <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight tracking-tight mb-8">
                  All You Should Know Before<br />
                  Booking Your Next Shipment
                </h2>
              </div>

              <div className="rounded-3xl overflow-hidden h-72 shadow-sm border border-gray-100 mt-2">
                <img 
                  src="/homepage/coimbatore.png" 
                  alt="Delivery truck loading parcels" 
                  className="w-full h-full object-cover" 
                />
              </div>
            </div>

            <div className="lg:col-span-7 flex flex-col gap-3.5 lg:mt-16 fade-up transition-all duration-700 opacity-0 translate-y-10" style={{ transitionDelay: '120ms' }}>
              <div className="mb-2">
                <h3 className="text-sm font-bold text-gray-900 mb-0.5">Didn't see your question?</h3>
                <p className="text-sm text-gray-500 leading-tight">
                  Our team is here to help — just reach out and we'll reply shortly.
                </p>
              </div>

              {FAQS.map((f, i) => {
                const isOpen = openFaq === i;
                return (
                  <div key={i} className="bg-white rounded-2xl shadow-xs border border-gray-100/80 overflow-hidden transition-all duration-200">
                    <button 
                      onClick={() => setOpenFaq(isOpen ? null : i)}
                      aria-expanded={isOpen}
                      className="w-full p-5 text-left flex justify-between items-center gap-4 hover:bg-gray-50/50 transition cursor-pointer"
                    >
                      <span className="font-semibold text-sm text-gray-900">{f.q}</span>
                      <span className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 shrink-0">
                        <ArrowDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isOpen ? 'rotate-180 text-black' : ''}`} />
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 text-sm text-gray-500 leading-relaxed border-t border-gray-100 pt-3">
                        {f.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <SiteFooter onNavigate={onNavigate} onGetStarted={onGetStarted} loggedIn={loggedIn} />
    </div>
  );
}