'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

const LABELS: Record<string, string> = {
  products: 'Produits',
  orders: 'Commandes',
  customers: 'Clients',
  categories: 'Catégories',
  coupons: 'Codes promo',
  reviews: 'Avis clients',
  shipping: 'Livraison',
  analytics: 'Analytiques',
  billing: 'Abonnement',
  settings: 'Paramètres',
  inventory: 'Inventaire',
};

export default function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.replace(/^\/dashboard\/?/, '').split('/').filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
      <Link href="/dashboard" className="hover:text-gray-600 transition-colors">
        Dashboard
      </Link>
      {segments.map((seg, i) => {
        const label = LABELS[seg] || seg.charAt(0).toUpperCase() + seg.slice(1);
        const isLast = i === segments.length - 1;
        const href = '/dashboard/' + segments.slice(0, i + 1).join('/');

        return (
          <span key={seg} className="flex items-center gap-1.5">
            <span className="text-gray-300">/</span>
            {isLast ? (
              <span className="text-gray-600 font-medium">{label}</span>
            ) : (
              <Link href={href} className="hover:text-gray-600 transition-colors">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
