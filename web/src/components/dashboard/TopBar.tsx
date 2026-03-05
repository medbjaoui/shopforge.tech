'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

interface Order {
  id: string;
  customerName: string;
  totalAmount: string;
  createdAt: string;
}

// ── Search Bar ─────────────────────────────────────────────────────────────────

function SearchBar() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<{ products: any[]; orders: any[]; customers: any[] }>({
    products: [], orders: [], customers: [],
  });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  // Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults({ products: [], orders: [], customers: [] });
      return;
    }
    setLoading(true);
    try {
      const [prodRes, orderRes, custRes] = await Promise.allSettled([
        api.get(`/products?q=${encodeURIComponent(q)}&limit=3`),
        api.get(`/orders?limit=100`),
        api.get(`/customers?search=${encodeURIComponent(q)}&limit=3`),
      ]);
      const products = prodRes.status === 'fulfilled' ? (prodRes.value.data.data ?? []).slice(0, 3) : [];
      const allOrders = orderRes.status === 'fulfilled' ? (orderRes.value.data.data ?? []) : [];
      const orders = allOrders.filter((o: any) =>
        o.customerName?.toLowerCase().includes(q.toLowerCase()) ||
        o.id?.toLowerCase().includes(q.toLowerCase())
      ).slice(0, 3);
      const customers = custRes.status === 'fulfilled' ? (custRes.value.data.data ?? custRes.value.data ?? []).slice(0, 3) : [];
      setResults({ products, orders, customers });
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    setOpen(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(value), 300);
  };

  const hasResults = results.products.length > 0 || results.orders.length > 0 || results.customers.length > 0;

  return (
    <div ref={containerRef} className="relative flex-1 max-w-xl">
      <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => { if (query.length >= 2) setOpen(true); }}
          placeholder="Rechercher... (Ctrl+K)"
          className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
        />
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
          {loading && (
            <div className="px-4 py-6 text-center text-sm text-gray-400">Recherche...</div>
          )}
          {!loading && !hasResults && (
            <div className="px-4 py-6 text-center text-sm text-gray-400">Aucun résultat</div>
          )}
          {!loading && hasResults && (
            <div className="py-1 max-h-80 overflow-y-auto">
              {results.orders.length > 0 && (
                <SearchSection title="Commandes">
                  {results.orders.map((o: any) => (
                    <SearchResultLink key={o.id} href={`/dashboard/orders`} onClick={() => setOpen(false)}>
                      <span className="font-mono text-xs text-gray-500">#{o.id.slice(0, 8)}</span>
                      <span className="text-sm text-gray-900">{o.customerName}</span>
                      <span className="text-xs text-gray-400 ml-auto">{Number(o.totalAmount).toFixed(2)} TND</span>
                    </SearchResultLink>
                  ))}
                </SearchSection>
              )}
              {results.products.length > 0 && (
                <SearchSection title="Produits">
                  {results.products.map((p: any) => (
                    <SearchResultLink key={p.id} href={`/dashboard/products`} onClick={() => setOpen(false)}>
                      <span className="text-sm text-gray-900">{p.name}</span>
                      <span className="text-xs text-gray-400 ml-auto">{Number(p.price).toFixed(2)} TND</span>
                    </SearchResultLink>
                  ))}
                </SearchSection>
              )}
              {results.customers.length > 0 && (
                <SearchSection title="Clients">
                  {results.customers.map((c: any) => (
                    <SearchResultLink key={c.id} href={`/dashboard/customers`} onClick={() => setOpen(false)}>
                      <span className="text-sm text-gray-900">{c.firstName} {c.lastName}</span>
                      <span className="text-xs text-gray-400 ml-auto">{c.phone || c.email}</span>
                    </SearchResultLink>
                  ))}
                </SearchSection>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SearchSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">{title}</div>
      {children}
    </div>
  );
}

function SearchResultLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link href={href} onClick={onClick} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 transition-colors">
      {children}
    </Link>
  );
}

// ── Notification Bell ──────────────────────────────────────────────────────────

function NotificationBell({ pendingCount }: { pendingCount: number }) {
  const [open, setOpen] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = async () => {
    setOpen((v) => !v);
    if (!open) {
      try {
        const { data } = await api.get('/orders?status=PENDING&limit=5');
        setOrders(data.data ?? []);
      } catch {}
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {pendingCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold w-4.5 h-4.5 min-w-[18px] px-1 rounded-full flex items-center justify-center">
            {pendingCount > 9 ? '9+' : pendingCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 w-80 z-50">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900">Commandes en attente</span>
            {pendingCount > 0 && (
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">{pendingCount}</span>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto">
            {orders.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-400">Aucune commande en attente</div>
            ) : (
              orders.map((o) => (
                <Link
                  key={o.id}
                  href="/dashboard/orders?status=PENDING"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{o.customerName}</p>
                    <p className="text-xs text-gray-400">{new Date(o.createdAt).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">{Number(o.totalAmount).toFixed(2)} TND</span>
                </Link>
              ))
            )}
          </div>
          <div className="px-4 py-2.5 border-t border-gray-100">
            <Link
              href="/dashboard/orders?status=PENDING"
              onClick={() => setOpen(false)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Voir toutes les commandes →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ── User Profile Dropdown ──────────────────────────────────────────────────────

function UserProfileDropdown() {
  const { user, store, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initial = user?.firstName?.charAt(0)?.toUpperCase() || 'U';

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
          {initial}
        </div>
        <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 w-64 z-50">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            {store?.slug && (
              <p className="text-xs text-orange-500 mt-0.5">{store.slug}.shopforge.tech</p>
            )}
          </div>
          <div className="py-1">
            <Link href="/dashboard/settings" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Paramètres
            </Link>
            {store?.slug && (
              <a
                href={`/store/${store.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Voir ma boutique
              </a>
            )}
          </div>
          <div className="border-t border-gray-100 py-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Déconnexion
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── TopBar ─────────────────────────────────────────────────────────────────────

export default function TopBar({ pendingCount }: { pendingCount: number }) {
  return (
    <div className="hidden md:flex sticky top-0 z-20 bg-white border-b border-gray-200 px-6 py-2.5 items-center gap-4">
      <SearchBar />
      <div className="flex items-center gap-2">
        <NotificationBell pendingCount={pendingCount} />
        <div className="w-px h-6 bg-gray-200" />
        <UserProfileDropdown />
      </div>
    </div>
  );
}
