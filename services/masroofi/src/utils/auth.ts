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

function getUsers(): Record<string, { password: string; name: string; createdAt: string }> {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
  } catch {
    return {};
  }
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
