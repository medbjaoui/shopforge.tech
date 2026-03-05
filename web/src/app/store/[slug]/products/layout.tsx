import type { Metadata } from 'next';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function getTenant(slug: string): Promise<{ name: string; description: string | null } | null> {
  try {
    const res = await fetch(`${API}/tenants/public/${slug}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const tenant = await getTenant(params.slug);
  const storeName = tenant?.name ?? params.slug;
  const title = `Produits — ${storeName}`;
  const description = `Parcourez tous les produits de ${storeName}. Commandez en ligne, livraison rapide en Tunisie.`;
  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary', title, description },
  };
}

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
