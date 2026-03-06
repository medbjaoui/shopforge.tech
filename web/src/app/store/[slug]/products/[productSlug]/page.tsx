import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import AddToCartButton from '@/components/store/AddToCartButton';
import ImageGallery from '@/components/store/ImageGallery';
import ProductCard from '@/components/store/ProductCard';
import ProductReviews from '@/components/store/ProductReviews';
import TrackProductView from '@/components/store/TrackProductView';
import { serverFetch } from '@/lib/server-api';
import { getTheme, getThemeUtils } from '@/lib/themes';
import { imageUrl } from '@/lib/imageUrl';

interface Variant { id: string; name: string; price: string | null; stock: number }
interface Product {
  id: string; name: string; slug: string; description: string | null;
  price: string; comparePrice: string | null; stock: number;
  images: string[]; category: { name: string } | null; variants: Variant[];
}
interface Tenant {
  name: string; shippingFee: string | null; freeShippingThreshold: string | null; theme: string;
}

async function getProduct(storeSlug: string, productSlug: string): Promise<Product | null> {
  try {
    const res = await serverFetch(`/products/public/${productSlug}`, {
      headers: { 'X-Tenant-Slug': storeSlug },
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

async function getTenant(slug: string): Promise<Tenant | null> {
  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const res = await fetch(`${API_URL}/tenants/public/${slug}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

async function getRelated(storeSlug: string, excludeSlug: string): Promise<Product[]> {
  try {
    const res = await serverFetch('/products/public', {
      headers: { 'X-Tenant-Slug': storeSlug },
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const all: Product[] = Array.isArray(json) ? json : json.data ?? [];
    return all.filter((p) => p.slug !== excludeSlug).slice(0, 4);
  } catch { return []; }
}

export async function generateMetadata({ params }: { params: { slug: string; productSlug: string } }): Promise<Metadata> {
  const [product, tenant] = await Promise.all([
    getProduct(params.slug, params.productSlug),
    getTenant(params.slug),
  ]);
  if (!product) return {};
  const title = `${product.name} — ${tenant?.name ?? params.slug}`;
  const description = product.description
    ? product.description.slice(0, 155)
    : `${product.name} disponible sur ${tenant?.name ?? params.slug}.`;
  const ogImage = product.images?.[0] ? imageUrl(product.images[0]) : undefined;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      ...(ogImage && { images: [{ url: ogImage, width: 800, height: 800, alt: product.name }] }),
    },
    twitter: { card: ogImage ? 'summary_large_image' : 'summary', title, description },
  };
}

export default async function ProductPage({ params }: { params: { slug: string; productSlug: string } }) {
  const [product, tenant, related] = await Promise.all([
    getProduct(params.slug, params.productSlug),
    getTenant(params.slug),
    getRelated(params.slug, params.productSlug),
  ]);

  if (!product) notFound();

  const price = Number(product.price);
  const comparePrice = product.comparePrice ? Number(product.comparePrice) : null;
  const discount = comparePrice && comparePrice > price
    ? Math.round(((comparePrice - price) / comparePrice) * 100) : null;

  const hasVariants = product.variants.length > 0;
  const totalVariantStock = hasVariants ? product.variants.reduce((s, v) => s + v.stock, 0) : product.stock;
  const isOutOfStock = hasVariants ? totalVariantStock === 0 : product.stock === 0;

  const variants = product.variants.map((v) => ({
    id: v.id, name: v.name,
    price: v.price !== null ? Number(v.price) : null,
    stock: v.stock,
  }));

  const images = (product.images ?? []).map(imageUrl).filter(Boolean);
  const theme = getTheme(tenant?.theme);
  const tu = getThemeUtils(theme);
  const shippingFee = tenant?.shippingFee != null ? Number(tenant.shippingFee) : null;
  const freeThreshold = tenant?.freeShippingThreshold != null ? Number(tenant.freeShippingThreshold) : null;

  // B1 — JSON-LD Product
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    ...(product.description ? { description: product.description } : {}),
    ...(images[0] ? { image: images[0] } : {}),
    offers: {
      '@type': 'Offer',
      price: price.toString(),
      priceCurrency: 'TND',
      availability: isOutOfStock ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      ...(tenant?.name ? { seller: { '@type': 'Organization', name: tenant.name } } : {}),
    },
  };

  return (
    <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <TrackProductView productId={product.id} productSlug={product.slug} price={price} category={product.category?.name} />
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-gray-400 mb-6">
        <Link href={`/`} className="hover:text-gray-600 transition-colors">Accueil</Link>
        <span>/</span>
        <Link href={`/products`} className="hover:text-gray-600 transition-colors">Produits</Link>
        {product.category && (
          <>
            <span>/</span>
            <span className="text-gray-500">{product.category.name}</span>
          </>
        )}
        <span>/</span>
        <span className="text-gray-700 font-medium truncate max-w-[160px]">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10">
        {/* Image gallery */}
        <ImageGallery images={images} name={product.name} />

        {/* Info */}
        <div className="flex flex-col justify-start">
          {product.category && (
            <p className={`text-xs ${tu.linkColor} font-semibold uppercase tracking-wider mb-2`}>
              {product.category.name}
            </p>
          )}

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-4">{product.name}</h1>

          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl sm:text-3xl font-bold text-gray-900">{price.toFixed(2)} TND</span>
            {comparePrice && comparePrice > price && (
              <span className="text-lg text-gray-400 line-through">{comparePrice.toFixed(2)} TND</span>
            )}
            {discount && (
              <span className="bg-red-100 text-red-600 text-sm font-bold px-2 py-0.5 rounded-full">
                -{discount}%
              </span>
            )}
          </div>

          {discount && comparePrice && (
            <p className="text-sm text-green-600 font-medium mb-3">
              Vous économisez {(comparePrice - price).toFixed(2)} TND
            </p>
          )}

          {!hasVariants && (
            <p className={`text-sm mb-4 font-medium ${isOutOfStock ? 'text-red-500' : product.stock <= 5 ? 'text-orange-500' : 'text-green-600'}`}>
              {isOutOfStock
                ? '✗ Rupture de stock'
                : product.stock <= 5
                ? `⚠ Plus que ${product.stock} en stock — commandez vite !`
                : '✓ En stock'}
            </p>
          )}

          {product.description && (
            <p className="text-gray-600 text-sm leading-relaxed mb-6 whitespace-pre-line">{product.description}</p>
          )}

          {/* Shipping info */}
          {shippingFee !== null && (
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-xl px-4 py-2.5 mb-5">
              <span>🚚</span>
              {shippingFee === 0 ? (
                <span className="text-green-700 font-medium">Livraison gratuite</span>
              ) : (
                <span>
                  Livraison <strong>{shippingFee.toFixed(3)} TND</strong>
                  {freeThreshold && (
                    <span className="text-green-600"> · Gratuite dès {freeThreshold.toFixed(0)} TND d&apos;achat</span>
                  )}
                </span>
              )}
            </div>
          )}

          <AddToCartButton
            product={{ id: product.id, name: product.name, price, slug: product.slug, image: product.images?.[0] }}
            variants={variants}
            outOfStock={isOutOfStock}
            storeSlug={params.slug}
            themeBtn={theme.btn}
          />

          {/* Trust row */}
          <div className="flex flex-wrap gap-4 mt-6 pt-6 border-t border-gray-100 text-xs text-gray-500">
            <span>🔒 Paiement sécurisé</span>
            <span>✓ Confirmation par email</span>
            <span>↩ Retours acceptés</span>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <ProductReviews productId={product.id} storeSlug={params.slug} />

      {/* Related products */}
      {related.length > 0 && (
        <div className="mt-16">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Vous pourriez aussi aimer</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} storeSlug={params.slug} themeBtn={theme.btn} cardHover={tu.cardHover} />
            ))}
          </div>
        </div>
      )}
    </div>
    </>
  );
}
