import type { ServiceType } from './types';

// Base freight calculation: distance * weight factor + base + volume surcharge
export function calcFreight(opts: {
  serviceType: ServiceType;
  distanceKm: number;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  declaredValue: number;
}): { charge: number; breakdown: { label: string; value: number }[] } {
  const { serviceType, distanceKm, weightKg, lengthCm, widthCm, heightCm, declaredValue } = opts;

  const base = serviceType === 'ftl' ? 2500 : 120;
  const perKmRate = serviceType === 'ftl' ? 22 : 8;
  const weightRate = serviceType === 'ftl' ? 0 : 6; // per kg for LTL
  const volume = (lengthCm * widthCm * heightCm) / 1_000_000; // m^3
  const volumeSurcharge = serviceType === 'ftl' ? 0 : Math.max(0, volume - 0.1) * 500;
  const insurance = declaredValue > 0 ? declaredValue * 0.005 : 0;

  const distanceCharge = distanceKm * perKmRate;
  const weightCharge = weightKg * weightRate;
  const charge = Math.round(
    base + distanceCharge + weightCharge + volumeSurcharge + insurance,
  );

  const breakdown = [
    { label: 'Base charge', value: base },
    { label: `Distance (${distanceKm.toFixed(0)} km × ₹${perKmRate})`, value: Math.round(distanceCharge) },
  ];
  if (weightCharge > 0) breakdown.push({ label: `Weight (${weightKg} kg × ₹${weightRate})`, value: Math.round(weightCharge) });
  if (volumeSurcharge > 0) breakdown.push({ label: 'Volume surcharge', value: Math.round(volumeSurcharge) });
  if (insurance > 0) breakdown.push({ label: 'Insurance (0.5%)', value: Math.round(insurance) });

  return { charge, breakdown };
}

// Haversine distance in km
export function haversineKm(
  lat1: number, lng1: number, lat2: number, lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Road distance is ~1.25x straight-line
export function estimateRoadKm(
  lat1: number, lng1: number, lat2: number, lng2: number,
): number {
  return Math.round(haversineKm(lat1, lng1, lat2, lng2) * 1.25);
}
