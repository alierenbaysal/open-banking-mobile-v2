import { createContext, useContext } from 'react';

/** Session user returned by the BFF (`GET /auth/me`, `POST /auth/login`, ...). */
export interface SessionUser {
  sub: string;
  email: string;
  name: string;
  tpp_client_id: string;
  roles: string[];
}

/**
 * Backwards-compatible alias. Older screens import `User` from this module and
 * read `.email` / `.name`, both of which exist on `SessionUser`.
 */
export type User = SessionUser;

export interface AuthContextValue {
  /** Current session user, or null when logged out. */
  user: SessionUser | null;
  /** True while the initial `/auth/me` hydration is in flight. */
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  /** Password + TOTP login. Throws ApiError on failure (caller maps codes). */
  login: (email: string, password: string, code: string) => Promise<SessionUser>;
  /** Clears the BFF session cookie and local state. */
  logout: () => Promise<void>;
  /** Re-fetches `/auth/me` (e.g. after activation sets the cookie). */
  refresh: () => Promise<SessionUser | null>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return ctx;
}

export function hasAdminRole(user: SessionUser | null): boolean {
  return !!user && user.roles.includes('qantara-admin');
}
