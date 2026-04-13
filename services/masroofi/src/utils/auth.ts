/**
 * Masroofi user authentication via the banking API.
 * User accounts are stored in PostgreSQL (not localStorage) so they
 * survive browser cache clears and work across devices.
 *
 * Only the *session* (current login) is kept in sessionStorage.
 */

export interface MasroofiUser {
  email: string;
  name: string;
  createdAt: string;
}

const SESSION_KEY = 'masroofi_session';

export async function signup(
  email: string,
  password: string,
  name: string,
): Promise<{ ok: true; user: MasroofiUser } | { ok: false; error: string }> {
  try {
    const resp = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });

    if (!resp.ok) {
      const body = await resp.json().catch(() => null);
      const detail = body?.detail || 'Registration failed';
      return { ok: false, error: detail };
    }

    const user = await resp.json();
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ email, name, createdAt: user.created_at }),
    );
    return { ok: true, user: { email, name, createdAt: user.created_at } };
  } catch {
    return { ok: false, error: 'Network error — please try again' };
  }
}

export async function login(
  email: string,
  password: string,
): Promise<{ ok: true; user: MasroofiUser } | { ok: false; error: string }> {
  try {
    const resp = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!resp.ok) {
      return { ok: false, error: 'Invalid email or password' };
    }

    const user = await resp.json();
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ email, name: user.name, createdAt: user.created_at }),
    );

    // Restore bank connection if it exists in the DB record
    if (user.consent_id) {
      localStorage.setItem('masroofi_consent_id', user.consent_id);
      localStorage.setItem('masroofi_bank_token', user.bank_token || user.consent_id);
    }

    return { ok: true, user: { email, name: user.name, createdAt: user.created_at } };
  } catch {
    return { ok: false, error: 'Network error — please try again' };
  }
}

export function logout(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export function getCurrentUser(): MasroofiUser | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  return getCurrentUser() !== null;
}
