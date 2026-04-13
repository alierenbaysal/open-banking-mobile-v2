/**
 * Shared app store — localStorage-backed so both Applications list and AppDetail can read.
 * Uses 'any' to avoid circular dependency with the TppApplication type in index.tsx.
 */

const STORAGE_KEY = 'qantara_registered_apps';

/* eslint-disable @typescript-eslint/no-explicit-any */

const BUILT_IN_APPS: any[] = [
  {
    id: 'masroofi-demo',
    name: 'Masroofi \u2014 Personal Finance Manager',
    description: "Bank Dhofar's personal finance management app. Aggregates accounts, tracks spending, and provides budgeting insights using Open Banking APIs.",
    clientId: 'masroofi-demo',
    clientSecret: 'masroofi-demo-secret-tnd',
    status: 'active',
    roles: ['AISP'],
    redirectUris: ['https://masroofi.tnd.bankdhofar.com/callback'],
    createdAt: '2026-04-12T00:00:00Z',
    environment: 'production',
    contactEmail: 'emrahbaysal@gmail.com',
  },
  {
    id: 'sadad-payment-gateway',
    name: 'Sadad Payment Gateway',
    description: "Oman's multi-bank payment gateway. Enables merchants to accept payments directly from customers' bank accounts via Open Banking. Supported banks: Bank Dhofar (live), Bank Muscat (coming soon), Sohar International (coming soon).",
    clientId: 'sadad-payment-gateway',
    clientSecret: 'sadad-payment-secret-tnd',
    status: 'active',
    roles: ['PISP', 'CBPII'],
    redirectUris: ['https://sadad.tnd.bankdhofar.com/payment/callback'],
    createdAt: '2026-04-13T00:00:00Z',
    environment: 'production',
    companyName: 'Sadad Technologies LLC',
    contactEmail: 'emrahbaysal@gmail.com',
  },
];

function loadCustomApps(): any[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCustomApps(apps: any[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
}

export function getAllApps(): any[] {
  return [...BUILT_IN_APPS, ...loadCustomApps()];
}

export function getAppById(id: string): any | undefined {
  return getAllApps().find((a: any) => a.id === id);
}

export function registerApp(app: any): void {
  const custom = loadCustomApps();
  custom.unshift(app);
  saveCustomApps(custom);
}
