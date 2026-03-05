'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { clearAdminAuth, adminApi } from '@/lib/admin-api';
import { LogoIcon } from '@/components/Logo';
import { ToastProvider } from '@/components/admin/Toast';
import {
  DashboardIcon, StoreIcon, ChartIcon, WalletIcon, ReceiptIcon,
  TruckIcon, BrainIcon, SettingsIcon, LogoutIcon, MenuIcon, XIcon,
  SidebarCollapseIcon, SidebarExpandIcon, TrendingIcon, SearchIcon, BellIcon,
} from '@/components/admin/AdminIcons';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  alertKey?: string; // key in alerts object to show badge
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Analytique',
    items: [
      { href: '/admin', label: 'Dashboard', icon: <DashboardIcon size={18} /> },
      { href: '/admin/performance', label: 'Performance', icon: <ChartIcon size={18} /> },
      { href: '/admin/billing', label: 'Billing / MRR', icon: <TrendingIcon size={18} /> },
      { href: '/admin/analytics', label: 'Analytics SaaS', icon: <ChartIcon size={18} /> },
    ],
  },
  {
    label: 'Gestion',
    items: [
      { href: '/admin/tenants', label: 'Boutiques', icon: <StoreIcon size={18} /> },
      { href: '/admin/wallet', label: 'Wallets', icon: <WalletIcon size={18} />, alertKey: 'lowWallets' },
      { href: '/admin/credit-codes', label: 'Codes Promo', icon: <ReceiptIcon size={18} /> },
      { href: '/admin/invoices', label: 'Factures', icon: <ReceiptIcon size={18} /> },
      { href: '/admin/carriers', label: 'Transporteurs', icon: <TruckIcon size={18} /> },
    ],
  },
  {
    label: 'Système',
    items: [
      { href: '/admin/ai', label: 'Intelligence IA', icon: <BrainIcon size={18} /> },
      { href: '/admin/settings', label: 'Paramètres', icon: <SettingsIcon size={18} /> },
    ],
  },
];

interface SearchResult {
  id: string;
  name: string;
  slug: string;
  plan: string;
  isActive: boolean;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [adminEmail, setAdminEmail] = useState('');
  const [ready, setReady] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Alerts badge
  const [alerts, setAlerts] = useState<Record<string, number>>({});

  // Global search
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const user = localStorage.getItem('adminUser');
    if (!token && pathname !== '/admin/login') {
      router.push('/admin/login');
      return;
    }
    if (user) {
      try { setAdminEmail(JSON.parse(user).email); } catch {}
    }
    setReady(true);
  }, [pathname, router]);

  // Load alerts
  useEffect(() => {
    if (!ready || pathname === '/admin/login') return;
    adminApi.get('/alerts').then(({ data }) => {
      setAlerts({ lowWallets: data.lowWallets, pendingOrders48h: data.pendingOrders48h });
    }).catch(() => {});
  }, [ready, pathname]);

  // Close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Global search keyboard shortcut (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (!q.trim()) { setSearchResults([]); return; }
    setSearchLoading(true);
    searchDebounce.current = setTimeout(async () => {
      try {
        const { data } = await adminApi.get(`/tenants?search=${encodeURIComponent(q)}&limit=8`);
        setSearchResults(data.data ?? []);
      } catch { setSearchResults([]); }
      finally { setSearchLoading(false); }
    }, 250);
  }, []);

  if (pathname === '/admin/login') return <>{children}</>;
  if (!ready) return null;

  function logout() {
    clearAdminAuth();
    router.push('/admin/login');
  }

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  }

  const totalAlerts = Object.values(alerts).reduce((s, n) => s + n, 0);

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className={`p-4 border-b border-gray-200 ${collapsed ? 'flex justify-center' : ''}`}>
        <div className="flex items-center gap-2">
          <LogoIcon size={28} />
          {!collapsed && (
            <div>
              <p className="text-gray-900 font-semibold text-sm leading-tight">ShopForge</p>
              <p className="text-orange-500 text-[10px] font-semibold tracking-wider uppercase leading-tight">Admin</p>
            </div>
          )}
        </div>
      </div>

      {/* Search shortcut (sidebar, not collapsed) */}
      {!collapsed && (
        <div className="px-3 pt-3">
          <button
            onClick={() => { setSearchOpen(true); setTimeout(() => searchRef.current?.focus(), 50); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 text-xs transition-colors"
          >
            <SearchIcon size={13} />
            <span className="flex-1 text-left">Rechercher…</span>
            <span className="text-[10px] bg-gray-200 px-1.5 py-0.5 rounded font-mono">⌘K</span>
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-4 overflow-y-auto mt-1">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-1.5">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((link) => {
                const active = isActive(link.href);
                const alertCount = link.alertKey ? (alerts[link.alertKey] ?? 0) : 0;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    title={collapsed ? link.label : undefined}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                      active
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    } ${collapsed ? 'justify-center' : ''}`}
                  >
                    <span className="flex-shrink-0 relative">
                      {link.icon}
                      {alertCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">
                          {alertCount > 9 ? '9+' : alertCount}
                        </span>
                      )}
                    </span>
                    {!collapsed && (
                      <span className="flex-1">{link.label}</span>
                    )}
                    {!collapsed && alertCount > 0 && (
                      <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-semibold">
                        {alertCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="p-3 border-t border-gray-200">
        {!collapsed && (
          <div className="px-3 py-2 mb-1">
            <p className="text-xs text-gray-500 truncate">{adminEmail}</p>
          </div>
        )}
        <button
          onClick={logout}
          title={collapsed ? 'Déconnexion' : undefined}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors ${collapsed ? 'justify-center' : ''}`}
        >
          <LogoutIcon size={18} />
          {!collapsed && <span>Déconnexion</span>}
        </button>
      </div>
    </>
  );

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-50 flex">
        {/* Desktop sidebar */}
        <aside className={`hidden md:flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ${collapsed ? 'w-16' : 'w-56'}`}>
          {sidebarContent}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-3 border-t border-gray-200 text-gray-400 hover:text-gray-700 transition-colors flex items-center justify-center"
          >
            {collapsed ? <SidebarExpandIcon size={16} /> : <SidebarCollapseIcon size={16} />}
          </button>
        </aside>

        {/* Mobile top bar */}
        <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-40">
          <div className="flex items-center gap-2">
            <LogoIcon size={24} />
            <p className="text-gray-900 font-semibold text-sm">ShopForge</p>
          </div>
          <div className="flex items-center gap-2">
            {totalAlerts > 0 && (
              <Link href="/admin/wallet" className="relative text-gray-500 hover:text-gray-900">
                <BellIcon size={20} />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">
                  {totalAlerts > 9 ? '9+' : totalAlerts}
                </span>
              </Link>
            )}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="text-gray-500 hover:text-gray-900 transition-colors"
            >
              {mobileOpen ? <XIcon size={24} /> : <MenuIcon size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile overlay */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-30">
            <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
            <aside className="absolute left-0 top-14 bottom-0 w-56 bg-white border-r border-gray-200 flex flex-col z-40">
              {sidebarContent}
            </aside>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 overflow-auto md:pt-0 pt-14">
          <div className="p-6">{children}</div>
        </main>
      </div>

      {/* Global Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSearchOpen(false)} />
          <div className="relative w-full max-w-lg bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden">
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
              <SearchIcon size={16} className="text-gray-400 flex-shrink-0" />
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Rechercher une boutique par nom ou slug…"
                className="flex-1 bg-transparent text-gray-900 placeholder-gray-400 text-sm focus:outline-none"
              />
              {searchLoading && (
                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              )}
              <kbd className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-mono">Esc</kbd>
            </div>

            {/* Results */}
            {searchResults.length > 0 ? (
              <ul className="max-h-72 overflow-y-auto divide-y divide-gray-100">
                {searchResults.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/admin/tenants/${r.id}`}
                      onClick={() => { setSearchOpen(false); setSearchQuery(''); setSearchResults([]); }}
                      className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div>
                        <p className="text-gray-900 text-sm font-medium">{r.name}</p>
                        <p className="text-gray-500 text-xs">{r.slug}.shopforge.tech</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${r.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                          {r.isActive ? 'Active' : 'Suspendue'}
                        </span>
                        <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-medium">{r.plan}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : searchQuery && !searchLoading ? (
              <div className="px-4 py-8 text-center text-gray-500 text-sm">Aucune boutique trouvée pour &quot;{searchQuery}&quot;</div>
            ) : !searchQuery ? (
              <div className="px-4 py-4 text-xs text-gray-500">Tapez le nom ou le slug d&apos;une boutique…</div>
            ) : null}
          </div>
        </div>
      )}
    </ToastProvider>
  );
}
