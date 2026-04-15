import type { Car } from './types';

/** Pre-populated showroom inventory — the 6 hero cars. */
export const INVENTORY: Car[] = [
  {
    id: 'car-001',
    make: 'Hyundai',
    model: 'Creta',
    year: 2026,
    condition: 'new',
    segment: 'Compact SUV',
    priceOmr: 7800,
    stock: 4,
    emoji: '🚙',
    accent: '#0369a1',
  },
  {
    id: 'car-002',
    make: 'Toyota',
    model: 'Camry',
    year: 2026,
    condition: 'new',
    segment: 'Sedan',
    priceOmr: 13500,
    stock: 2,
    emoji: '🚗',
    accent: '#b91c1c',
  },
  {
    id: 'car-003',
    make: 'Nissan',
    model: 'Patrol',
    year: 2026,
    condition: 'new',
    segment: 'Full-size SUV',
    priceOmr: 22000,
    stock: 1,
    emoji: '🚓',
    accent: '#334155',
  },
  {
    id: 'car-004',
    make: 'Mazda',
    model: 'CX-5',
    year: 2024,
    condition: 'used',
    segment: 'Crossover',
    priceOmr: 9200,
    stock: 3,
    emoji: '🚘',
    accent: '#7c3aed',
  },
  {
    id: 'car-005',
    make: 'Mitsubishi',
    model: 'Pajero Sport',
    year: 2026,
    condition: 'new',
    segment: 'Mid-size SUV',
    priceOmr: 16500,
    stock: 2,
    emoji: '🚙',
    accent: '#166534',
  },
  {
    id: 'car-006',
    make: 'BMW',
    model: '320i',
    year: 2026,
    condition: 'new',
    segment: 'Luxury Sedan',
    priceOmr: 19800,
    stock: 1,
    emoji: '🏎️',
    accent: '#1e3a8a',
  },
];

export function getCarById(id: string): Car | undefined {
  return INVENTORY.find((c) => c.id === id);
}

/** Rough "OMR per month" for display-only estimate — NOT the approved figure. */
export function estimateMonthly(
  priceOmr: number,
  downPercent: number,
  tenorMonths: number,
  ratePct = 5.25,
): number {
  const principal = priceOmr * (1 - downPercent / 100);
  const r = ratePct / 100 / 12;
  if (r === 0) return principal / tenorMonths;
  return (principal * r) / (1 - Math.pow(1 + r, -tenorMonths));
}
