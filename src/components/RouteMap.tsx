import type { ReactNode } from 'react';

// Lightweight SVG map — plots points on a stylized India map bounding box.
// No external API dependency; purely visual. Coordinates are lat/lng.

const BBOX = { minLng: 68, maxLng: 97, minLat: 6, maxLat: 36 };

function project(lat: number, lng: number, w: number, h: number) {
  const x = ((lng - BBOX.minLng) / (BBOX.maxLng - BBOX.minLng)) * w;
  const y = h - ((lat - BBOX.minLat) / (BBOX.maxLat - BBOX.minLat)) * h;
  return { x, y };
}

export interface MapPoint {
  lat: number;
  lng: number;
  label?: string;
  color?: string;
  pulse?: boolean;
}

export function RouteMap({
  points,
  className,
  height = 280,
  children,
}: {
  points: MapPoint[];
  className?: string;
  height?: number;
  children?: ReactNode;
}) {
  const w = 800;
  const h = height;
  const pad = 24;

  const proj = points.map((p) => ({
    ...p,
    ...project(p.lat, p.lng, w - pad * 2, h - pad * 2),
  }));

  return (
    <div className={`relative rounded-2xl overflow-hidden bg-gradient-to-br from-ink-50 to-brand-50 border border-ink-100 ${className ?? ''}`}>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e9eef5" strokeWidth="1" />
          </pattern>
          <linearGradient id="route" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#338cff" />
            <stop offset="100%" stopColor="#1556e1" />
          </linearGradient>
        </defs>
        <rect width={w} height={h} fill="url(#grid)" />

        {/* route line */}
        {proj.length >= 2 && (
          <polyline
            points={proj.map((p) => `${p.x + pad},${p.y + pad}`).join(' ')}
            fill="none"
            stroke="url(#route)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="8 6"
          >
            <animate attributeName="stroke-dashoffset" from="0" to="-28" dur="1.2s" repeatCount="indefinite" />
          </polyline>
        )}

        {/* points */}
        {proj.map((p, i) => (
          <g key={i} transform={`translate(${p.x + pad},${p.y + pad})`}>
            {p.pulse && <circle r="14" fill={p.color ?? '#338cff'} opacity="0.2">
              <animate attributeName="r" from="8" to="20" dur="1.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" from="0.3" to="0" dur="1.5s" repeatCount="indefinite" />
            </circle>}
            <circle r="7" fill={p.color ?? '#338cff'} stroke="white" strokeWidth="2.5" />
            {p.label && (
              <text y="-14" textAnchor="middle" className="text-[11px] font-semibold" fill="#2d3850">
                {p.label}
              </text>
            )}
          </g>
        ))}
      </svg>
      {children}
    </div>
  );
}
