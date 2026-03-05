import type { MetadataRoute } from 'next';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Product { slug: string; updatedAt: string }

async function fetchProducts(storeSlug: string): Promise<Product[]> {
  try {
    const res = await fetch(`${API_URL}/products/public`, {
      headers: { 'X-Tenant-Slug': storeSlug },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json) ? json : json.data ?? [];
  } catch { return []; }
}

export default async function sitemap({ params }: { params: { slug: string } }): Promise<MetadataRoute.Sitemap> {
  const baseUrl = `https://${params.slug}.shopforge.tech`;
  const products = await fetchProducts(params.slug);

  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/products`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    ...products.map((p) => ({
      url: `${baseUrl}/products/${p.slug}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
