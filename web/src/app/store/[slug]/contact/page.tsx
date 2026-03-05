import type { Metadata } from 'next';
import Link from 'next/link';
import { getTheme, getThemeUtils } from '@/lib/themes';

interface Tenant {
  name: string; slug: string; phone: string | null; whatsapp: string | null;
  address: string | null; contactEmail: string | null; theme: string;
  instagram: string | null; facebook: string | null; tiktok: string | null;
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
  const title = `Contact — ${storeName}`;
  const description = `Contactez ${storeName}. Email, téléphone, adresse — toutes les informations pour nous joindre.`;
  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
  };
}

export default async function ContactPage({ params }: { params: { slug: string } }) {
  const tenant = await getTenant(params.slug);
  const tu = getThemeUtils(getTheme(tenant?.theme));
  const hasContact = tenant?.contactEmail || tenant?.phone || tenant?.whatsapp || tenant?.address;
  const hasSocial = tenant?.instagram || tenant?.facebook || tenant?.tiktok;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 sm:py-14">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Nous contacter</h1>
      <p className="text-sm sm:text-base text-gray-500 mb-8 sm:mb-10">Une question ? Nous sommes là pour vous aider.</p>

      <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-8">
        {!hasContact ? (
          <p className="text-gray-400 text-center">Aucune information de contact disponible.</p>
        ) : (
          <div className="space-y-6">
            {tenant?.contactEmail && (
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 text-base sm:text-lg shrink-0">
                  @
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">Email</p>
                  <a href={`mailto:${tenant.contactEmail}`} className={`${tu.linkColor} hover:underline`}>
                    {tenant.contactEmail}
                  </a>
                </div>
              </div>
            )}
            {tenant?.phone && (
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600 text-base sm:text-lg shrink-0">
                  ☏
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">Téléphone</p>
                  <a href={`tel:${tenant.phone}`} className="text-gray-700">{tenant.phone}</a>
                </div>
              </div>
            )}
            {tenant?.whatsapp && (
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-500 shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">WhatsApp</p>
                  <a
                    href={`https://wa.me/${tenant.whatsapp.replace(/[^0-9+]/g, '').replace('+', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:underline"
                  >
                    Envoyer un message
                  </a>
                </div>
              </div>
            )}
            {tenant?.address && (
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600 text-base sm:text-lg shrink-0">
                  ◎
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">Adresse</p>
                  <p className="text-gray-700">{tenant.address}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {hasSocial && (
          <div className={`${hasContact ? 'mt-6 pt-6 border-t border-gray-100' : ''}`}>
            <p className="font-medium text-gray-900 text-sm mb-3">Réseaux sociaux</p>
            <div className="flex items-center gap-4">
              {tenant?.instagram && (
                <a
                  href={tenant.instagram.startsWith('http') ? tenant.instagram : `https://instagram.com/${tenant.instagram.replace(/^@/, '')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-gray-400 hover:text-pink-500 transition-colors"
                  aria-label="Instagram"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C16.67.014 16.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                </a>
              )}
              {tenant?.facebook && (
                <a
                  href={tenant.facebook.startsWith('http') ? tenant.facebook : `https://facebook.com/${tenant.facebook}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-gray-400 hover:text-blue-600 transition-colors"
                  aria-label="Facebook"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
              )}
              {tenant?.tiktok && (
                <a
                  href={tenant.tiktok.startsWith('http') ? tenant.tiktok : `https://tiktok.com/@${tenant.tiktok.replace(/^@/, '')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-gray-400 hover:text-gray-900 transition-colors"
                  aria-label="TikTok"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
                </a>
              )}
            </div>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <Link href={`/store/${params.slug}/track`} className={`text-sm ${tu.linkColor} hover:underline`}>
            Suivre une commande →
          </Link>
        </div>
      </div>
    </div>
  );
}
