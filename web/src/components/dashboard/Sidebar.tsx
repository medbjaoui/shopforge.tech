'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LogoIcon } from '@/components/Logo';

const PRODUCT_SUB = [
  { href: '/dashboard/categories', label: 'Catégories', icon: '⊞' },
  { href: '/dashboard/coupons', label: 'Codes promo', icon: '%' },
];

interface NavGroup {
  label: string | null;
  items: { href: string; label: string; icon: string }[];
}

const navGroups: NavGroup[] = [
  {
    label: null,
    items: [
      { href: '/dashboard', label: 'Tableau de bord', icon: '▦' },
    ],
  },
  {
    label: 'Boutique',
    items: [
      { href: '/dashboard/products', label: 'Produits', icon: '◈' },
      { href: '/dashboard/inventory', label: 'Inventaire', icon: '📦' },
      { href: '/dashboard/reviews', label: 'Avis clients', icon: '★' },
    ],
  },
  {
    label: 'Ventes',
    items: [
      { href: '/dashboard/orders', label: 'Commandes', icon: '◎' },
      { href: '/dashboard/shipping', label: 'Livraison', icon: '🚚' },
      { href: '/dashboard/invoices', label: 'Factures', icon: '🧾' },
      { href: '/dashboard/customers', label: 'Clients', icon: '◉' },
    ],
  },
  {
    label: 'Gestion',
    items: [
      { href: '/dashboard/analytics', label: 'Analytiques', icon: '▲' },
      { href: '/dashboard/wallet', label: 'Mon Wallet', icon: '◈' },
      { href: '/dashboard/parrainage', label: 'Parrainage', icon: '🤝' },
      { href: '/dashboard/billing', label: 'Abonnement', icon: '◆' },
      { href: '/dashboard/settings', label: 'Paramètres', icon: '⚙' },
    ],
  },
];

interface SidebarProps {
  pendingCount?: number;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ pendingCount = 0, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { store, user, logout } = useAuth();
  const isProductSection = ['/dashboard/products', '/dashboard/categories', '/dashboard/coupons'].some(p => pathname.startsWith(p));

  // Close mobile sidebar on navigation
  useEffect(() => {
    if (mobileOpen && onMobileClose) onMobileClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const sidebarContent = (
    <>
      {/* Logo + store name */}
      <div className="px-5 py-5 border-b border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <LogoIcon size={28} />
          <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">ShopForge</span>
        </div>
        <p className="font-semibold text-white truncate">{store?.name ?? '...'}</p>
        <div className="flex items-center gap-2">
          <p className="text-xs text-gray-400 truncate">{store?.slug}.shopforge.tech</p>
          {store?.slug && (
            <a
              href={`/store/${store.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-500 hover:text-orange-400 transition-colors shrink-0"
              title="Voir la boutique"
            >
              ↗
            </a>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <p className="px-3 pt-4 pb-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  item.href === '/dashboard'
                    ? pathname === '/dashboard'
                    : pathname.startsWith(item.href);
                return (
                  <div key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'bg-orange-500 text-white font-medium'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      <span className="text-base w-5 text-center">{item.icon}</span>
                      <span className="flex-1">{item.label}</span>
                      {item.href === '/dashboard/orders' && pendingCount > 0 && (
                        <span className="ml-auto bg-red-500 text-white text-[10px] font-bold min-w-[20px] h-5 rounded-full flex items-center justify-center px-1">
                          {pendingCount > 99 ? '99+' : pendingCount}
                        </span>
                      )}
                    </Link>
                    {/* Sub-nav: Catégories + Codes promo sous Produits */}
                    {item.href === '/dashboard/products' && isProductSection && (
                      <div className="ml-8 mt-0.5 space-y-0.5">
                        {PRODUCT_SUB.map((sub) => {
                          const subActive = pathname.startsWith(sub.href);
                          return (
                            <Link key={sub.href} href={sub.href}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                                subActive ? 'bg-orange-400/20 text-orange-300 font-medium' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                              }`}>
                              <span className="text-xs w-4 text-center opacity-70">{sub.icon}</span>
                              {sub.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User + logout */}
      <div className="px-5 py-4 border-t border-gray-700">
        <p className="text-sm text-white font-medium truncate">
          {user?.firstName} {user?.lastName}
        </p>
        <p className="text-xs text-gray-400 truncate mb-3">{user?.email}</p>
        <button
          onClick={logout}
          className="w-full text-left text-xs text-gray-400 hover:text-red-400 transition-colors"
        >
          Déconnexion →
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 bg-gray-900 text-white flex-col h-screen sticky top-0 shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={onMobileClose} />
          <aside className="relative w-60 bg-gray-900 text-white flex flex-col h-full">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
