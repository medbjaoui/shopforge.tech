import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CartProvider } from '@/contexts/CartContext';
import { WishlistProvider } from '@/contexts/WishlistContext';
import { CustomerProvider } from '@/contexts/CustomerContext';
import StoreHeader from '@/components/store/StoreHeader';
import AnnouncementBar from '@/components/store/AnnouncementBar';
import ChatbotWidget from '@/components/store/ChatbotWidget';
import StoreTracker from '@/components/store/StoreTracker';
import MetaPixel from '@/components/store/MetaPixel';
import WhatsAppWidget from '@/components/store/WhatsAppWidget';
import { serverFetch } from '@/lib/server-api';
import { getTheme, getThemeUtils } from '@/lib/themes';
import { getFont } from '@/lib/fonts';
import { t } from '@/lib/store-i18n';

export interface StoreTenant {
  id: string; name: string; slug: string;
  description: string | null; logo: string | null;
  phone: string | null; whatsapp: string | null; address: string | null; contactEmail: string | null;
  shippingFee: string | null; freeShippingThreshold: string | null;
  returnPolicy: string | null; codEnabled?: boolean;
  theme: string; isPublished: boolean;
  aiChatbotEnabled?: boolean;
  // Informations legales
  legalName: string | null; legalAddress: string | null;
  matriculeFiscal: string | null; rne: string | null;
  // Customisation avancée
  bannerImage: string | null;
  instagram: string | null; facebook: string | null; tiktok: string | null;
  announcementText: string | null; announcementEnabled: boolean;
  announcementBgColor: string | null; announcementTextColor: string | null;
  heroTitle: string | null; heroSubtitle: string | null; heroCta: string | null;
  favicon: string | null; font: string;
  // Meta integration
  metaPixelId: string | null;
  metaIntegrationEnabled: boolean;
  whatsappWidgetEnabled: boolean;
  // Langue
  storeLanguage?: string;
}

async function getTenant(slug: string): Promise<StoreTenant | null> {
  try {
    const res = await serverFetch(`/tenants/public/${slug}`, {
      next: { revalidate: 60 },
    } as RequestInit);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const tenant = await getTenant(params.slug);
  if (!tenant) return {};
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const faviconUrl = tenant.favicon
    ? (tenant.favicon.startsWith('http') ? tenant.favicon : `${API_BASE}${tenant.favicon}`)
    : undefined;
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://shopforge.tech'),
    title: { template: `%s | ${tenant.name}`, default: tenant.name },
    description: tenant.description ?? `Boutique en ligne — ${tenant.name}`,
    ...(faviconUrl && { icons: { icon: faviconUrl } }),
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default async function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  const tenant = await getTenant(params.slug);
  if (!tenant) notFound();

  const theme = getTheme(tenant.theme);
  const tu = getThemeUtils(theme);
  const storeFont = getFont(tenant.font);
  const logoUrl = tenant.logo
    ? (tenant.logo.startsWith('http') ? tenant.logo : `${API_URL}${tenant.logo}`)
    : null;

  return (
    <CustomerProvider storeSlug={params.slug}>
    <CartProvider storeSlug={params.slug}>
    <WishlistProvider storeSlug={params.slug}>
      {storeFont.googleUrl && (
        // eslint-disable-next-line @next/next/no-page-custom-font
        <link rel="stylesheet" href={storeFont.googleUrl} />
      )}
      {tenant.storeLanguage === 'ar' && (
        // eslint-disable-next-line @next/next/no-page-custom-font
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap" />
      )}
      <div
        className="min-h-screen bg-white flex flex-col"
        style={{ fontFamily: tenant.storeLanguage === 'ar' ? "'Noto Sans Arabic', Tahoma, Arial, sans-serif" : storeFont.family }}
        dir={tenant.storeLanguage === 'ar' ? 'rtl' : 'ltr'}
        lang={tenant.storeLanguage ?? 'fr'}
      >
        {!tenant.isPublished && (
          <div className="bg-amber-400 text-amber-900 text-center text-sm font-medium py-2 px-4">
            ⚠️ Boutique en brouillon — visible uniquement par vous. Complétez l&apos;onboarding pour la publier.
          </div>
        )}
        {tenant.announcementEnabled && tenant.announcementText && (
          <AnnouncementBar
            text={tenant.announcementText}
            bgColor={tenant.announcementBgColor}
            textColor={tenant.announcementTextColor}
          />
        )}
        <StoreHeader tenant={tenant} theme={theme} />
        <main className="flex-1">{children}</main>

        <footer className={`${tu.footerBg} ${tu.footerText} mt-16`}>
          <div className="max-w-6xl mx-auto px-4 py-8 sm:py-10 grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <div>
              {logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={tenant.name} className="h-10 w-auto object-contain mb-3 rounded" />
              )}
              <p className="font-bold text-white text-lg">{tenant.name}</p>
              {tenant.description && (
                <p className="text-sm text-gray-400 mt-1 leading-relaxed">{tenant.description}</p>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{t(tenant.storeLanguage, 'shop')}</p>
              <ul className="space-y-2 text-sm">
                <li><a href="/products" className="hover:text-white transition-colors">{t(tenant.storeLanguage, 'allProducts')}</a></li>
                <li><a href="/track" className="hover:text-white transition-colors">{t(tenant.storeLanguage, 'trackMyOrder')}</a></li>
                <li><a href="/about" className="hover:text-white transition-colors">{t(tenant.storeLanguage, 'about')}</a></li>
                <li><a href="/contact" className="hover:text-white transition-colors">{t(tenant.storeLanguage, 'contact')}</a></li>
                <li><a href="/policies" className="hover:text-white transition-colors">{t(tenant.storeLanguage, 'returnPolicy')}</a></li>
                <li><a href="/cgv" className="hover:text-white transition-colors">{t(tenant.storeLanguage, 'cgv')}</a></li>
                <li><a href="/privacy" className="hover:text-white transition-colors">{t(tenant.storeLanguage, 'privacy')}</a></li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{t(tenant.storeLanguage, 'contact')}</p>
              <ul className="space-y-2 text-sm text-gray-400">
                {tenant.contactEmail && (
                  <li><a href={`mailto:${tenant.contactEmail}`} className="hover:text-white">{tenant.contactEmail}</a></li>
                )}
                {tenant.phone && (
                  <li><a href={`tel:${tenant.phone}`} className="hover:text-white">{tenant.phone}</a></li>
                )}
                {tenant.whatsapp && (
                  <li>
                    <a
                      href={`https://wa.me/${tenant.whatsapp.replace(/[^0-9+]/g, '').replace('+', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-green-400 hover:text-green-300 transition-colors"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      WhatsApp
                    </a>
                  </li>
                )}
                {tenant.address && <li>{tenant.address}</li>}
              </ul>
              {(tenant.instagram || tenant.facebook || tenant.tiktok) && (
                <div className="flex items-center gap-3 mt-4">
                  {tenant.instagram && (
                    <a
                      href={tenant.instagram.startsWith('http') ? tenant.instagram : `https://instagram.com/${tenant.instagram.replace(/^@/, '')}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-gray-400 hover:text-white transition-colors"
                      aria-label="Instagram"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C16.67.014 16.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                    </a>
                  )}
                  {tenant.facebook && (
                    <a
                      href={tenant.facebook.startsWith('http') ? tenant.facebook : `https://facebook.com/${tenant.facebook}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-gray-400 hover:text-white transition-colors"
                      aria-label="Facebook"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    </a>
                  )}
                  {tenant.tiktok && (
                    <a
                      href={tenant.tiktok.startsWith('http') ? tenant.tiktok : `https://tiktok.com/@${tenant.tiktok.replace(/^@/, '')}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-gray-400 hover:text-white transition-colors"
                      aria-label="TikTok"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
                    </a>
                  )}
                </div>
              )}
              {tenant.shippingFee !== null && (
                <div className="mt-4 text-xs text-gray-500">
                  {Number(tenant.shippingFee) === 0 ? (
                    <span className="text-green-400 font-medium">{t(tenant.storeLanguage, 'freeShipping')}</span>
                  ) : (
                    <>{t(tenant.storeLanguage, 'shipping')} : <span className="text-white">{Number(tenant.shippingFee).toFixed(3)} TND</span>
                      {tenant.freeShippingThreshold && (
                        <span> · {t(tenant.storeLanguage, 'freeAbove')} {Number(tenant.freeShippingThreshold).toFixed(0)} TND</span>
                      )}</>
                  )}
                </div>
              )}
            </div>
          </div>
          {(tenant.legalName || tenant.matriculeFiscal) && (
            <div className={`border-t ${tu.footerBorder} py-3 text-center text-xs text-gray-500`}>
              {[tenant.legalName, tenant.matriculeFiscal && `MF: ${tenant.matriculeFiscal}`, tenant.rne && `RNE: ${tenant.rne}`].filter(Boolean).join(' — ')}
            </div>
          )}
          <div className={`border-t ${tu.footerBorder} py-4 text-center text-xs text-gray-600`}>
            &copy; {new Date().getFullYear()} {tenant.name} — {t(tenant.storeLanguage, 'poweredBy')}{' '}
            <span className="font-medium text-gray-400">ShopForge</span>
          </div>
        </footer>
        {tenant.aiChatbotEnabled && (
          <ChatbotWidget storeSlug={tenant.slug} storeName={tenant.name} />
        )}
        {tenant.whatsappWidgetEnabled && tenant.whatsapp && (
          <WhatsAppWidget whatsapp={tenant.whatsapp} storeName={tenant.name} />
        )}
        {tenant.metaIntegrationEnabled && tenant.metaPixelId && (
          <MetaPixel pixelId={tenant.metaPixelId} />
        )}
        <StoreTracker slug={tenant.slug} />
      </div>
    </WishlistProvider>
    </CartProvider>
    </CustomerProvider>
  );
}
