'use client';
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface CustomerInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string;
  orderCount: number;
  totalSpent: string;
}

interface CustomerContextValue {
  customer: CustomerInfo | null;
  token: string | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (storeSlug: string, email: string, password: string) => Promise<void>;
  register: (storeSlug: string, data: RegisterData) => Promise<void>;
  logout: (storeSlug: string) => void;
  refreshMe: (storeSlug: string) => Promise<void>;
}

interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
}

const CustomerContext = createContext<CustomerContextValue | null>(null);

export function CustomerProvider({ children, storeSlug }: { children: ReactNode; storeSlug: string }) {
  const storageKey = `customer_token_${storeSlug}`;
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── Load token from localStorage on mount ──────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      setToken(saved);
      fetchMe(saved).finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeSlug]);

  const fetchMe = async (t: string) => {
    try {
      const res = await fetch(`${API_URL}/store/auth/me`, {
        headers: {
          Authorization: `Bearer ${t}`,
          'X-Tenant-Slug': storeSlug,
        },
      });
      if (!res.ok) { clearState(); return; }
      const data = await res.json();
      setCustomer(data);
      setToken(t);
    } catch {
      clearState();
    }
  };

  const clearState = () => {
    setCustomer(null);
    setToken(null);
    localStorage.removeItem(storageKey);
  };

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = async (slug: string, email: string, password: string) => {
    const res = await fetch(`${API_URL}/store/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-Slug': slug },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message ?? 'Identifiants incorrects.');
    }
    const { token: t, customer: c } = await res.json();
    localStorage.setItem(storageKey, t);
    setToken(t);
    setCustomer(c);
  };

  // ── Register ───────────────────────────────────────────────────────────────
  const register = async (slug: string, data: RegisterData) => {
    const res = await fetch(`${API_URL}/store/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-Slug': slug },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message ?? 'Erreur lors de la création du compte.');
    }
    const { token: t, customer: c } = await res.json();
    localStorage.setItem(storageKey, t);
    setToken(t);
    setCustomer(c);
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback((slug: string) => {
    localStorage.removeItem(`customer_token_${slug}`);
    setCustomer(null);
    setToken(null);
  }, []);

  // ── Refresh ────────────────────────────────────────────────────────────────
  const refreshMe = async (slug: string) => {
    const t = localStorage.getItem(`customer_token_${slug}`);
    if (t) await fetchMe(t);
  };

  return (
    <CustomerContext.Provider value={{
      customer,
      token,
      isLoggedIn: !!customer,
      isLoading,
      login,
      register,
      logout,
      refreshMe,
    }}>
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomer() {
  const ctx = useContext(CustomerContext);
  if (!ctx) throw new Error('useCustomer must be inside CustomerProvider');
  return ctx;
}
