import type { Salesperson } from './types';

const KEY = 'mm_salesperson';

export const SALESPEOPLE: Salesperson[] = [
  {
    id: 'sp-001',
    name: 'Khalid Al-Rawahi',
    email: 'khalid@muscatmotors.om',
    branch: 'Al Qurum Showroom',
    initials: 'KA',
    avatarBg: 'linear-gradient(135deg,#ffc107,#c9961d)',
  },
  {
    id: 'sp-002',
    name: 'Noor Al-Balushi',
    email: 'noor@muscatmotors.om',
    branch: 'Ruwi Branch',
    initials: 'NB',
    avatarBg: 'linear-gradient(135deg,#f472b6,#db2777)',
  },
  {
    id: 'sp-003',
    name: 'Saif Al-Harthy',
    email: 'saif@muscatmotors.om',
    branch: 'Seeb Outlet',
    initials: 'SH',
    avatarBg: 'linear-gradient(135deg,#38bdf8,#0369a1)',
  },
];

export function getCurrentSalesperson(): Salesperson | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Salesperson) : null;
  } catch {
    return null;
  }
}

export function setCurrentSalesperson(sp: Salesperson): void {
  sessionStorage.setItem(KEY, JSON.stringify(sp));
}

export function clearCurrentSalesperson(): void {
  sessionStorage.removeItem(KEY);
}

export function isLoggedIn(): boolean {
  return getCurrentSalesperson() !== null;
}
