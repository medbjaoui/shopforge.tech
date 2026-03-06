import type { Metadata } from 'next';
import Link from 'next/link';
import ProductCard from '@/components/store/ProductCard';
import { serverFetch } from '@/lib/server-api';
import { getTheme, getThemeUtils } from '@/lib/themes';
import { imageUrl } from '@/lib/imageUrl';

interface Product {
  id: string; name: string; slug: string; price: string;
  comparePrice: string | null; stock: number; images: string[];
  description: string | null; category: { name: string } | null;
}

interface Tenant {
  name: string; slug: string; description: string | null;
  shippingFee: string | null; freeShippingThreshold: string | null;
  theme: string;
  bannerImage: string | null;
  heroTitle: string | null; heroSubtitle: string | null; heroCta: string | null;
  phone?: string | null; legalAddress?: string | null; logo?: string | null;
}

async function getProducts(slug: string): Promise<Product[]> {
  try {
    const res = await serverFetch('/products/public', {
      headers: { 'X-Tenant-Slug': slug },
      next: { revalidate: 30 },
    } as RequestInit);
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json) ? json : json.data ?? [];
  } catch { return []; }
}

async function getTenantInfo(slug: string): Promise<Tenant | null> {
  try {
    const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const res = await fetch(`${API}/tenants/public/${slug}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const tenant = await getTenantInfo(params.slug);
  if (!tenant) return {};
  const title = tenant.name;
  const description = tenant.description ?? `Bienvenue sur ${tenant.name} — découvrez notre boutique en ligne.`;
  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary', title, description },
  };
}

const TRUST_BADGES = [
  { icon: '🚚', label: 'Livraison rapide' },
  { icon: '↩', label: 'Retours faciles' },
  { icon: '💵', label: 'Paiement à la livraison' },
  { icon: '✓', label: 'Commande garantie' },
];

export default async function StorePage({ params }: { params: { slug: string } }) {
  const [products, tenant] = await Promise.all([
    getProducts(params.slug),
    getTenantInfo(params.slug),
  ]);

  const featured = products.slice(0, 8);
  const theme = getTheme(tenant?.theme);
  const tu = getThemeUtils(theme);

  // B2 — JSON-LD LocalBusiness
  const jsonLd = tenant ? {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: tenant.name,
    ...(tenant.description ? { description: tenant.description } : {}),
    url: `https://${tenant.slug}.shopforge.tech`,
    ...(tenant.phone ? { telephone: tenant.phone } : {}),
    ...(tenant.legalAddress ? { address: { '@type': 'PostalAddress', streetAddress: tenant.legalAddress, addressCountry: 'TN' } } : {}),
    ...(tenant.logo ? { logo: imageUrl(tenant.logo) } : {}),
  } : null;

  return (
    <>
    {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
    <div>
      {/* Hero */}
      <div className={`relative bg-gradient-to-br ${theme.hero} text-white py-12 sm:py-16 lg:py-20 px-4 overflow-hidden`}>
        {tenant?.bannerImage && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={tenant.bannerImage.startsWith('http') ? tenant.bannerImage : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${tenant.bannerImage}`}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40" />
          </>
        )}
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-3 sm:mb-4">
            {tenant?.heroTitle || tenant?.name || 'Notre boutique'}
          </h1>
          <p className="text-base sm:text-lg text-white/80 mb-6 sm:mb-8">
            {tenant?.heroSubtitle || tenant?.description || 'Découvrez notre sélection de produits'}
          </p>

          {/* Badges livraison */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-6 sm:mb-8">
            {tenant?.shippingFee !== null && tenant?.shippingFee !== undefined && (
              Number(tenant.shippingFee) === 0 ? (
                <span className="bg-green-500 text-white text-xs sm:text-sm font-semibold px-3 sm:px-4 py-1.5 rounded-full">
                  ✓ Livraison gratuite
                </span>
              ) : (
                <>
                  <span className="bg-white/10 text-xs sm:text-sm px-3 sm:px-4 py-1.5 rounded-full">
                    Livraison {Number(tenant.shippingFee).toFixed(3)} TND
                  </span>
                  {tenant.freeShippingThreshold && (
                    <span className="bg-green-500/20 text-green-300 text-xs sm:text-sm px-3 sm:px-4 py-1.5 rounded-full">
                      Gratuit dès {Number(tenant.freeShippingThreshold).toFixed(0)} TND
                    </span>
                  )}
                </>
              )
            )}
          </div>

          <Link
            href="/products"
            className="inline-block bg-white/20 hover:bg-white/30 text-white font-semibold px-5 py-2.5 sm:px-8 sm:py-3 rounded-xl transition-colors border border-white/30 text-sm sm:text-base"
          >
            {tenant?.heroCta || 'Voir tous les produits'} →
          </Link>
        </div>
      </div>

      {/* Trust badges */}
      <div className="bg-gray-50 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:py-4 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {TRUST_BADGES.map(({ icon, label }) => (
            <div key={label} className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-600 font-medium text-center sm:text-left">
              <span className="text-base sm:text-sm">{icon}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Featured products */}
      <div className="max-w-6xl mx-auto px-4 py-10 sm:py-14">
        {featured.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-5 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Nos produits</h2>
              {products.length > 8 && (
                <Link href="/products" className={`text-sm ${tu.linkColor} hover:underline`}>
                  Voir tout ({products.length}) →
                </Link>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {featured.map((p) => (
                <ProductCard key={p.id} product={p} storeSlug={params.slug} themeBtn={theme.btn} cardHover={tu.cardHover} />
              ))}
            </div>
          </>
        )}

        {products.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">Aucun produit disponible pour le moment.</p>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
