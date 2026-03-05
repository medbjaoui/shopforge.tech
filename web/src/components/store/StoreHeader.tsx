'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useCustomer } from '@/contexts/CustomerContext';
import SearchModal from './SearchModal';
import { t } from '@/lib/store-i18n';

interface ThemeStyle {
  headerBg: string;
  headerText: string;
  headerBorder: string;
  btn: string;
  isDark: boolean;
}

interface Tenant {
  name: string;
  slug: string;
  storeLanguage?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function StoreHeader({ tenant, theme }: { tenant: Tenant; theme?: ThemeStyle }) {
  const { count } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { isLoggedIn, customer } = useCustomer();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [catOpen, setCatOpen] = useState(false);
  const [mobileCatOpen, setMobileCatOpen] = useState(false);
  const [cartBounce, setCartBounce] = useState(false);
  const prevCount = useRef(count);

  // Trigger badge bounce when cart count increases
  useEffect(() => {
    if (count > prevCount.current) {
      setCartBounce(true);
      const t = setTimeout(() => setCartBounce(false), 400);
      prevCount.current = count;
      return () => clearTimeout(t);
    }
    prevCount.current = count;
  }, [count]);
  const base = `/store/${tenant.slug}`;

  // Fetch categories
  useEffect(() => {
    fetch(`${API_URL}/categories/public`, { headers: { 'X-Tenant-Slug': tenant.slug } })
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [tenant.slug]);

  const bg = theme?.headerBg ?? 'bg-white';
  const text = theme?.headerText ?? 'text-gray-900';
  const border = theme?.headerBorder ?? 'border-gray-100';
  const dark = theme?.isDark ?? false;

  const navLinkClass = dark
    ? 'text-white/80 hover:text-white transition-colors'
    : 'text-gray-600 hover:text-gray-900 transition-colors';

  const mobileNavLinkClass = dark
    ? 'block px-4 py-3 text-white/90 hover:bg-white/10 rounded-lg transition-colors font-medium'
    : 'block px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors font-medium';

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [base]);

  // Close menu on ESC
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [menuOpen]);

  // Prevent scroll when menu open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const lang = tenant.storeLanguage;
  const navLinks = [
    { href: base, label: t(lang, 'home') },
    { href: `${base}/products`, label: t(lang, 'products') },
    { href: `${base}/track`, label: t(lang, 'trackOrder') },
    { href: `${base}/about`, label: t(lang, 'about') },
    { href: `${base}/contact`, label: t(lang, 'contact') },
  ];

  return (
    <>
      <header className={`${bg} border-b ${border} sticky top-0 z-40`}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href={base} className={`font-bold text-xl ${text} hover:opacity-80 transition-opacity shrink-0`}>
            {tenant.name}
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm flex-1 justify-center">
            {navLinks.slice(0, 3).map(({ href, label }) => (
              <Link key={href} href={href} className={navLinkClass}>{label}</Link>
            ))}
            {categories.length > 0 && (
              <div
                className="relative"
                onMouseEnter={() => setCatOpen(true)}
                onMouseLeave={() => setCatOpen(false)}
              >
                <button className={`flex items-center gap-1 ${navLinkClass}`}>
                  {t(lang, 'categories')}
                  <svg className={`w-3.5 h-3.5 transition-transform ${catOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {catOpen && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50">
                    <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-4 min-w-[280px]">
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                        {categories.map((cat) => (
                          <Link
                            key={cat.id}
                            href={`${base}/products?category=${cat.slug || cat.name}`}
                            className="text-sm text-gray-600 hover:text-gray-900 py-1.5 transition-colors"
                            onClick={() => setCatOpen(false)}
                          >
                            {cat.name}
                          </Link>
                        ))}
                      </div>
                      <div className="border-t border-gray-100 mt-3 pt-3">
                        <Link
                          href={`${base}/products`}
                          className="text-sm text-orange-500 hover:text-orange-600 font-medium"
                          onClick={() => setCatOpen(false)}
                        >
                          {t(lang, 'viewAll')}
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Account button */}
            <Link
              href={isLoggedIn ? `${base}/account` : `${base}/account/login`}
              className={`hidden sm:flex items-center gap-1.5 p-2 rounded-lg transition-colors text-sm ${
                dark ? 'text-white/80 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'
              }`}
              title={isLoggedIn ? `${t(lang, 'myAccount')} (${customer?.firstName})` : t(lang, 'login')}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {isLoggedIn && (
                <span className="hidden md:inline font-medium text-xs">{customer?.firstName}</span>
              )}
              {isLoggedIn && (
                <span className="absolute mt-0 ml-4 w-2 h-2 bg-green-400 rounded-full" />
              )}
            </Link>

            {/* Search button */}
            <button
              onClick={() => setSearchOpen(true)}
              className={`p-2 rounded-lg transition-colors ${
                dark ? 'text-white/80 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'
              }`}
              title={t(lang, 'search')}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            {/* Wishlist button */}
            <Link
              href={`${base}/wishlist`}
              className={`relative p-2 rounded-lg transition-colors ${
                dark ? 'text-white/80 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'
              }`}
              title={t(lang, 'favorites')}
            >
              <svg className="w-5 h-5" fill={wishlistCount > 0 ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {wishlistCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {wishlistCount > 9 ? '9+' : wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart button */}
            <Link
              href={`${base}/checkout`}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                dark
                  ? 'bg-white/20 hover:bg-white/30 text-white'
                  : 'bg-gray-900 hover:bg-gray-700 text-white'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 7H4L5 9z" />
              </svg>
              <span className="hidden sm:inline">{t(lang, 'cart')}</span>
              {count > 0 && (
                <span className={`bg-orange-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center${cartBounce ? ' cart-badge-bounce' : ''}`}>
                  {count > 9 ? '9+' : count}
                </span>
              )}
            </Link>

            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? t(lang, 'close') : t(lang, 'open')}
              className={`md:hidden p-2 rounded-lg transition-colors ${
                dark ? 'text-white hover:bg-white/10' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {menuOpen ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className={`md:hidden border-t ${border} ${bg} px-4 py-3 space-y-1`}>
            {navLinks.map(({ href, label }) => (
              <Link key={href} href={href} onClick={() => setMenuOpen(false)} className={mobileNavLinkClass}>
                {label}
              </Link>
            ))}
            {categories.length > 0 && (
              <div>
                <button
                  onClick={() => setMobileCatOpen((v) => !v)}
                  className={`w-full flex items-center justify-between ${mobileNavLinkClass}`}
                >
                  <span>{t(lang, 'categories')}</span>
                  <svg className={`w-4 h-4 transition-transform ${mobileCatOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {mobileCatOpen && (
                  <div className="pl-4 space-y-0.5">
                    {categories.map((cat) => (
                      <Link
                        key={cat.id}
                        href={`${base}/products?category=${cat.slug || cat.name}`}
                        onClick={() => setMenuOpen(false)}
                        className={`block px-4 py-2 text-sm rounded-lg transition-colors ${dark ? 'text-white/70 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-50'}`}
                      >
                        {cat.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className={`border-t ${border} pt-3 mt-3 space-y-1`}>
              <Link
                href={isLoggedIn ? `${base}/account` : `${base}/account/login`}
                onClick={() => setMenuOpen(false)}
                className={mobileNavLinkClass}
              >
                {isLoggedIn ? `👤 ${customer?.firstName} — ${t(lang, 'myAccount')}` : `👤 ${t(lang, 'login')}`}
              </Link>
              <Link
                href={`${base}/checkout`}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center justify-between px-4 py-3 rounded-lg font-semibold transition-colors ${
                  dark ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-gray-900 text-white hover:bg-gray-700'
                }`}
              >
                <span>{t(lang, 'cart')}</span>
                {count > 0 && (
                  <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {count}
                  </span>
                )}
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Backdrop */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Search modal */}
      {searchOpen && (
        <SearchModal slug={tenant.slug} isDark={dark} onClose={() => setSearchOpen(false)} />
      )}
    </>
  );
}
