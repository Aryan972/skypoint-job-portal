/**
 * Auth context + hook.
 *
 * On mount, if a token exists in storage, fetch /auth/me to confirm the user
 * is still active. A 401 means the token expired or the account is disabled;
 * clear it and treat the visitor as anonymous.
 *
 * `login` / `register` write the new token to storage and into the provider
 * state in one go so the rest of the tree re-renders immediately.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ApiClientError, request } from '../lib/api';
import { tokenStorage } from '../lib/auth';
import type { AuthResponse, PublicUser, UserRole } from '../types/api';

interface AuthContextValue {
  user: PublicUser | null;
  loading: boolean;
  login(email: string, password: string): Promise<PublicUser>;
  register(input: {
    email: string;
    password: string;
    fullName: string;
    role: UserRole;
  }): Promise<PublicUser>;
  logout(): void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState<boolean>(() => tokenStorage.read() !== null);

  // On first mount, if we have a token, exchange it for the current user.
  useEffect(() => {
    const token = tokenStorage.read();
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    request<{ user: PublicUser }>('/auth/me')
      .then((res) => {
        if (cancelled) return;
        setUser(res.user);
      })
      .catch((err) => {
        if (err instanceof ApiClientError && err.status === 401) {
          tokenStorage.clear();
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    tokenStorage.write(res.token);
    setUser(res.user);
    return res.user;
  }, []);

  const register = useCallback(
    async (input: {
      email: string;
      password: string;
      fullName: string;
      role: UserRole;
    }) => {
      const res = await request<AuthResponse>('/auth/register', {
        method: 'POST',
        body: input,
      });
      tokenStorage.write(res.token);
      setUser(res.user);
      return res.user;
    },
    [],
  );

  const logout = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return ctx;
}
