export type AreaGroup = 'Tamil Nadu' | 'Karnataka' | 'Kerala';

export interface ServiceArea {
  slug: string;
  name: string;
  /** Extra names people search for (shown in copy / keywords) */
  aka?: string;
  state: AreaGroup;
  /** One or two sentences of genuine local context */
  context: string;
  /** What customers commonly send to/from here */
  goods: string[];
}

export const AREA_BASE = '/parcel-service';

export const SERVICE_AREAS: ServiceArea[] = [
  {
    slug: 'chennai', name: 'Chennai', state: 'Tamil Nadu',
    context: "Chennai is Tamil Nadu's capital and its main port and manufacturing city, with heavy two-way goods movement to the rest of the state.",
    goods: ['Auto and engineering parts', 'E-commerce and retail stock', 'Documents and samples', 'Household goods'],
  },
  {
    slug: 'coimbatore', name: 'Coimbatore', state: 'Tamil Nadu',
    context: 'Coimbatore is a major textile, pump and engineering hub in western Tamil Nadu and a key gateway towards Kerala.',
    goods: ['Textile and garment bundles', 'Pumps, motors and machine parts', 'Industrial spares', 'Retail and wholesale cartons'],
  },
  {
    slug: 'bengaluru', name: 'Bengaluru', aka: 'Bangalore', state: 'Karnataka',
    context: "Bengaluru (Bangalore) is South India's technology and start-up capital, with constant demand for parcel movement to and from Tamil Nadu.",
    goods: ['Electronics and gadgets', 'E-commerce and D2C orders', 'Office and IT equipment', 'Personal and household parcels'],
  },
  {
    slug: 'madurai', name: 'Madurai', state: 'Tamil Nadu',
    context: 'Madurai is the commercial centre of southern Tamil Nadu, known for textiles, trading and a busy wholesale market.',
    goods: ['Textiles and sarees', 'Wholesale trading goods', 'Food products', 'Household parcels'],
  },
  {
    slug: 'salem', name: 'Salem', state: 'Tamil Nadu',
    context: 'Salem is an industrial city known for steel, textiles and food products, and sits on the main road corridor between Coimbatore and Bengaluru.',
    goods: ['Steel and fabrication items', 'Textile and handloom goods', 'Food and agro products', 'Retail cartons'],
  },
  {
    slug: 'tiruppur', name: 'Tiruppur', state: 'Tamil Nadu',
    context: "Tiruppur is India's well-known knitwear and garment export hub, generating a steady flow of garment cartons and trims.",
    goods: ['Knitwear and garment cartons', 'Fabric rolls and trims', 'Sample parcels', 'Packaging material'],
  },
  {
    slug: 'erode', name: 'Erode', state: 'Tamil Nadu',
    context: 'Erode is a textile and turmeric trading centre close to our P.Puliampatti base, so pickups in this area are quick to arrange.',
    goods: ['Textile and handloom bundles', 'Turmeric and agro products', 'Wholesale cartons', 'Household parcels'],
  },
  {
    slug: 'kochi', name: 'Kochi', aka: 'Cochin, Ernakulam', state: 'Kerala',
    context: "Kochi is Kerala's main port and commercial city, with strong trade in spices, seafood, retail and imported goods.",
    goods: ['Spices and food products', 'Retail and e-commerce stock', 'Industrial and marine spares', 'Household goods'],
  },
  {
    slug: 'thiruvananthapuram', name: 'Thiruvananthapuram', aka: 'Trivandrum', state: 'Kerala',
    context: "Thiruvananthapuram (Trivandrum) is Kerala's capital, with government offices, IT parks and a large consumer market.",
    goods: ['Documents and office supplies', 'IT and electronic equipment', 'Retail cartons', 'Personal and household parcels'],
  },
];

export interface StateArea {
  slug: string;
  name: string;
  intro: string;
  cities: string[]; // slugs
}

export const STATE_AREAS: StateArea[] = [
  {
    slug: 'tamil-nadu', name: 'Tamil Nadu',
    intro: 'GRTV Speed Parcel Service is based in P.Puliampatti, Tamil Nadu, and moves parcels and freight between the state\'s major industrial and trading cities.',
    cities: ['chennai', 'coimbatore', 'madurai', 'salem', 'tiruppur', 'erode'],
  },
  {
    slug: 'kerala', name: 'Kerala',
    intro: 'We carry parcels and freight between Tamil Nadu and Kerala, including routes to Kochi and Thiruvananthapuram.',
    cities: ['kochi', 'thiruvananthapuram'],
  },
];

export interface AreaEntry {
  kind: 'city' | 'state';
  slug: string;
  name: string;
  aka?: string;
  state: string;
  intro: string;
  goods: string[];
  cities: ServiceArea[];
}

export function getArea(slug: string): AreaEntry | null {
  const c = SERVICE_AREAS.find((a) => a.slug === slug);
  if (c) {
    return { kind: 'city', slug: c.slug, name: c.name, aka: c.aka, state: c.state, intro: c.context, goods: c.goods,
      cities: SERVICE_AREAS.filter((a) => a.slug !== c.slug) };
  }
  const s = STATE_AREAS.find((a) => a.slug === slug);
  if (s) {
    const cities = SERVICE_AREAS.filter((a) => s.cities.includes(a.slug));
    return { kind: 'state', slug: s.slug, name: s.name, state: s.name, intro: s.intro,
      goods: ['Parcels and cartons', 'Textile and garment goods', 'Industrial spares', 'Household and personal goods'],
      cities };
  }
  return null;
}

export function areaPath(slug: string) {
  return `${AREA_BASE}/${slug}`;
}

export function allAreaSlugs() {
  return [...STATE_AREAS.map((s) => s.slug), ...SERVICE_AREAS.map((c) => c.slug)];
}

/** Navigate to a path without a reload; App listens to popstate. */
export function goToPath(path: string) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0 });
}

export function areaSeo(a: AreaEntry) {
  const place = a.aka ? `${a.name} (${a.aka})` : a.name;
  const title = a.kind === 'city'
    ? `Parcel & Courier Service in ${a.name}${a.aka ? ` (${a.aka})` : ''} | GRTV Speed Parcel Service`
    : `Parcel & Freight Transport in ${a.name} | GRTV Speed Parcel Service`;
  const description = a.kind === 'city'
    ? `Send parcels to and from ${place} with GRTV Speed Parcel Service. LTL and full-truckload freight, doorstep pickup and live tracking. Call 85269 87414.`
    : `GRTV Speed Parcel Service delivers parcels and freight (LTL & FTL) across ${a.name}. Doorstep pickup, live tracking. Call 85269 87414.`;
  return { title, description };
}

export function areaFaqs(a: AreaEntry): { q: string; a: string }[] {
  const place = a.aka ? `${a.name} (${a.aka})` : a.name;
  return [
    {
      q: `How do I book a parcel to or from ${a.name}?`,
      a: `Create a free account on our website, choose LTL parcel or Full Truckload (FTL), enter the pickup and delivery details and submit your booking. You can also call us on 85269 87414.`,
    },
    {
      q: `Do you offer doorstep pickup in ${place}?`,
      a: `Yes. Doorstep pickup can be arranged for bookings at the time of booking. Contact us with your address and we will confirm availability for your location.`,
    },
    {
      q: `Can I track my ${a.name} shipment?`,
      a: `Yes. Every booking gets a tracking ID. Enter it on our Track Shipment page to see the latest status and the driver's live location while the parcel is on the way.`,
    },
    {
      q: `Do you handle full-truck loads for ${a.name}?`,
      a: `Yes. Along with shared LTL parcel transport, we arrange dedicated vehicles (FTL) for bulk shipments. Call or send an enquiry for a quote.`,
    },
  ];
}
