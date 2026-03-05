import type { Metadata } from 'next';
import Link from 'next/link';
import { getTheme, getThemeUtils } from '@/lib/themes';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Tenant {
  name: string; slug: string; description: string | null; logo: string | null;
  phone: string | null; whatsapp: string | null; address: string | null; contactEmail: string | null;
  theme: string;
}

async function getTenant(slug: string): Promise<Tenant | null> {
  try {
    const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const res = await fetch(`${API}/tenants/public/${slug}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const tenant = await getTenant(params.slug);
  const storeName = tenant?.name ?? params.slug;
  const title = `À propos — ${storeName}`;
  const description = tenant?.description ?? `Découvrez l'histoire et les valeurs de ${storeName}.`;
  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
  };
}

export default async function AboutPage({ params }: { params: { slug: string } }) {
  const tenant = await getTenant(params.slug);

  const theme = getTheme(tenant?.theme);
  const tu = getThemeUtils(theme);
  const logoUrl = tenant?.logo
    ? (tenant.logo.startsWith('http') ? tenant.logo : `${API_URL}${tenant.logo}`)
    : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 sm:py-14">
      <div className="text-center mb-8 sm:mb-10">
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={tenant?.name} className="h-16 sm:h-20 w-auto object-contain mx-auto mb-4 rounded-xl" />
        )}
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{tenant?.name ?? 'À propos'}</h1>
        {tenant?.description && (
          <p className="text-lg text-gray-500 mt-3">{tenant.description}</p>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-8 space-y-6">
        {!tenant?.description && (
          <p className="text-gray-500 text-center">Le marchand n'a pas encore renseigné sa page À propos.</p>
        )}

        {(tenant?.phone || tenant?.whatsapp || tenant?.address || tenant?.contactEmail) && (
          <div>
            <h2 className="font-semibold text-gray-900 mb-3">Nous contacter</h2>
            <div className="space-y-2 text-sm text-gray-600">
              {tenant?.contactEmail && (
                <p>📧 <a href={`mailto:${tenant.contactEmail}`} className={`${tu.linkColor} hover:underline`}>{tenant.contactEmail}</a></p>
              )}
              {tenant?.phone && (
                <p>📞 <a href={`tel:${tenant.phone}`} className="hover:text-gray-900">{tenant.phone}</a></p>
              )}
              {tenant?.whatsapp && (
                <p className="flex items-center gap-1.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  <a
                    href={`https://wa.me/${tenant.whatsapp.replace(/[^0-9+]/g, '').replace('+', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:underline"
                  >
                    WhatsApp
                  </a>
                </p>
              )}
              {tenant?.address && <p>📍 {tenant.address}</p>}
            </div>
          </div>
        )}

        <div className="pt-4 text-center">
          <Link href={`/store/${params.slug}/products`}
            className={`inline-block ${theme.btn} text-white px-6 py-3 rounded-xl font-semibold transition-colors`}>
            Voir nos produits →
          </Link>
        </div>
      </div>
    </div>
  );
}
