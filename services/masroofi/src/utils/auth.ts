/**
 * Simple local auth for Masroofi's own user accounts.
 * Masroofi has its own users separate from Bank Dhofar.
 * In production this would be a real backend — here we use localStorage.
 */

export interface MasroofiUser {
  email: string;
  name: string;
  createdAt: string;
}

const USERS_KEY = 'masroofi_users';
const SESSION_KEY = 'masroofi_session';

export interface UserRecord {
  password: string;
  name: string;
  createdAt: string;
  consent_id?: string;
  bank_token?: string;
}

export function getUsers(): Record<string, UserRecord> {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
  } catch {
    return {};
  }
}

export function saveUsers(users: Record<string, UserRecord>): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

/**
 * Update fields on the current user's record (e.g. bank connection).
 */
export function updateCurrentUserRecord(fields: Partial<Pick<UserRecord, 'consent_id' | 'bank_token'>>): void {
  const user = getCurrentUser();
  if (!user) return;
  const users = getUsers();
  const entry = users[user.email];
  if (!entry) return;
  Object.assign(entry, fields);
  saveUsers(users);
}

/**
 * Get a field from the current user's stored record.
 */
export function getCurrentUserRecord(): UserRecord | null {
  const user = getCurrentUser();
  if (!user) return null;
  const users = getUsers();
  return users[user.email] || null;
}

export function signup(email: string, password: string, name: string): { ok: true; user: MasroofiUser } | { ok: false; error: string } {
  const users = getUsers();
  if (users[email]) {
    return { ok: false, error: 'An account with this email already exists' };
  }
  if (password.length < 6) {
    return { ok: false, error: 'Password must be at least 6 characters' };
  }
  const createdAt = new Date().toISOString();
  users[email] = { password, name, createdAt };
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  const user: MasroofiUser = { email, name, createdAt };
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return { ok: true, user };
}

export function login(email: string, password: string): { ok: true; user: MasroofiUser } | { ok: false; error: string } {
  const users = getUsers();
  const entry = users[email];
  if (!entry || entry.password !== password) {
    return { ok: false, error: 'Invalid email or password' };
  }
  const user: MasroofiUser = { email, name: entry.name, createdAt: entry.createdAt };
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));

  // Restore bank connection from user record if present
  if (entry.bank_token) {
    localStorage.setItem('masroofi_bank_token', entry.bank_token);
  }
  if (entry.consent_id) {
    localStorage.setItem('masroofi_consent_id', entry.consent_id);
  }

  return { ok: true, user };
}

export function logout(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function getCurrentUser(): MasroofiUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  return getCurrentUser() !== null;
}
