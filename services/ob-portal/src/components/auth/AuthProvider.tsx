import { useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { api, ApiError } from '../../utils/api';
import {
  AuthContext,
  AuthContextValue,
  SessionUser,
  hasAdminRole,
} from '../../hooks/useAuth';

/**
 * Holds the single source of truth for the authenticated session. The session
 * itself lives in a httpOnly cookie set by the BFF; this provider only mirrors
 * the decoded user so the UI can react to it. On mount it hydrates from
 * `GET /auth/me`, treating a 401 as "logged out" rather than an error.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (): Promise<SessionUser | null> => {
    try {
      const res = await api.get<SessionUser>('/portal-api/auth/me');
      setUser(res.data);
      return res.data;
    } catch (err) {
      // 401 from /auth/me simply means no active session — not a crash.
      if ((err as ApiError).status === 401) {
        setUser(null);
        return null;
      }
      // Network/other errors: keep whatever we had, surface null defensively.
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      await refresh();
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string, code: string): Promise<SessionUser> => {
      const res = await api.post<SessionUser>('/portal-api/auth/login', {
        email,
        password,
        code,
      });
      setUser(res.data);
      return res.data;
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/portal-api/auth/logout');
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: user !== null,
      isAdmin: hasAdminRole(user),
      login,
      logout,
      refresh,
    }),
    [user, loading, login, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
