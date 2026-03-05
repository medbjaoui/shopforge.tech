'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { clearAuth } from '@/lib/api';

interface AuthUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
}

interface AuthStore {
  id: string;
  name: string;
  slug: string;
  theme: string;
  onboardingCompleted: boolean;
  isPublished: boolean;
}

interface AuthState {
  user: AuthUser | null;
  store: AuthStore | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setAuth: (user: AuthUser, store: AuthStore, tokens: { accessToken: string; refreshToken: string }) => void;
  updateStore: (patch: Partial<AuthStore>) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [store, setStore] = useState<AuthStore | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydratation depuis localStorage au démarrage
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      const storedStore = localStorage.getItem('store');
      const token = localStorage.getItem('accessToken');
      if (storedUser && storedStore && token) {
        setUser(JSON.parse(storedUser));
        setStore(JSON.parse(storedStore));
      }
    } catch {
      clearAuth();
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setAuth = (
    newUser: AuthUser,
    newStore: AuthStore,
    tokens: { accessToken: string; refreshToken: string },
  ) => {
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    localStorage.setItem('storeSlug', newStore.slug);
    localStorage.setItem('user', JSON.stringify(newUser));
    localStorage.setItem('store', JSON.stringify(newStore));
    setUser(newUser);
    setStore(newStore);
  };

  const updateStore = (patch: Partial<AuthStore>) => {
    setStore((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...patch };
      localStorage.setItem('store', JSON.stringify(updated));
      return updated;
    });
  };

  const logout = () => {
    clearAuth();
    localStorage.removeItem('store');
    setUser(null);
    setStore(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        store,
        isLoading,
        isAuthenticated: !!user,
        setAuth,
        updateStore,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
