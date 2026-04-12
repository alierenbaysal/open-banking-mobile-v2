import { useState, useCallback, useEffect } from 'react';

export interface User {
  email: string;
  name: string;
  organization?: string;
  loggedInAt: string;
}

const STORAGE_KEY = 'qantara_session';

function loadUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw) as User;
    const loginTime = new Date(user.loggedInAt).getTime();
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    if (now - loginTime > twentyFourHours) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return user;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => loadUser());
  const [loading, setLoading] = useState(false);

  const login = useCallback((email: string, name: string, organization?: string) => {
    setLoading(true);
    const newUser: User = {
      email,
      name,
      organization,
      loggedInAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
    setUser(newUser);
    setLoading(false);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  const isAuthenticated = user !== null;

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setUser(loadUser());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return { user, isAuthenticated, loading, login, logout };
}
