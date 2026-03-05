import type { Metadata } from 'next';

interface Tenant {
  name: string; returnPolicy: string | null;
  shippingFee: string | null; freeShippingThreshold: string | null;
  legalName: string | null; legalAddress: string | null;
  matriculeFiscal: string | null; rne: string | null;
  contactEmail: string | null;
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
  const title = `Politique de la boutique — ${storeName}`;
  const description = `Livraison, retours, CGV et mentions legales de ${storeName}. Consultez nos conditions.`;
  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
  };
}

export default async function PoliciesPage({ params }: { params: { slug: string } }) {
  const tenant = await getTenant(params.slug);
  const base = `/store/${params.slug}`;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 sm:py-14">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 sm:mb-10">Politique de la boutique</h1>

      <div className="space-y-6">
        {/* Livraison */}
        <section className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
          <h2 className="font-semibold text-gray-900 text-lg mb-3">Livraison</h2>
          {tenant?.shippingFee !== null && tenant?.shippingFee !== undefined ? (
            <div className="text-sm text-gray-600 space-y-2">
              {Number(tenant.shippingFee) === 0 ? (
                <p className="text-green-600 font-medium">La livraison est offerte sur toutes les commandes.</p>
              ) : (
                <>
                  <p>Frais de livraison : <span className="font-semibold text-gray-900">{Number(tenant.shippingFee).toFixed(3)} TND</span></p>
                  {tenant.freeShippingThreshold && (
                    <p className="text-green-600">
                      Livraison gratuite des <span className="font-semibold">{Number(tenant.freeShippingThreshold).toFixed(0)} TND</span> d&apos;achat.
                    </p>
                  )}
                </>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Informations de livraison non renseignees.</p>
          )}
        </section>

        {/* Retours */}
        <section className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
          <h2 className="font-semibold text-gray-900 text-lg mb-3">Retours & Remboursements</h2>
          {tenant?.returnPolicy ? (
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{tenant.returnPolicy}</p>
          ) : (
            <p className="text-sm text-gray-400">Politique de retour non renseignee. Contactez le marchand pour plus d&apos;informations.</p>
          )}
        </section>

        {/* Droit de retractation */}
        <section className="bg-blue-50 rounded-2xl shadow-sm p-4 sm:p-6 border border-blue-200">
          <h2 className="font-semibold text-blue-900 text-lg mb-3">Droit de retractation</h2>
          <div className="text-sm text-blue-800 space-y-2">
            <p>
              Conformement a la legislation tunisienne sur le commerce electronique, vous disposez d&apos;un
              delai de <strong>7 jours ouvrables</strong> a compter de la reception de votre commande pour
              exercer votre droit de retractation.
            </p>
            <p>
              Pour plus de details, consultez nos{' '}
              <a href={`${base}/cgv`} className="text-blue-600 hover:underline font-medium">
                Conditions Generales de Vente (Article 5)
              </a>.
            </p>
          </div>
        </section>

        {/* Mentions legales */}
        {(tenant?.legalName || tenant?.matriculeFiscal) && (
          <section className="bg-gray-50 rounded-2xl shadow-sm p-4 sm:p-6 border border-gray-200">
            <h2 className="font-semibold text-gray-900 text-lg mb-3">Mentions legales</h2>
            <div className="text-sm text-gray-600 space-y-1">
              {tenant.legalName && <p><span className="text-gray-400">Raison sociale :</span> {tenant.legalName}</p>}
              {tenant.legalAddress && <p><span className="text-gray-400">Siege social :</span> {tenant.legalAddress}</p>}
              {tenant.matriculeFiscal && <p><span className="text-gray-400">Matricule fiscal :</span> {tenant.matriculeFiscal}</p>}
              {tenant.rne && <p><span className="text-gray-400">RNE :</span> {tenant.rne}</p>}
              {tenant.contactEmail && (
                <p><span className="text-gray-400">Contact :</span>{' '}
                  <a href={`mailto:${tenant.contactEmail}`} className="text-blue-600 hover:underline">{tenant.contactEmail}</a>
                </p>
              )}
            </div>
          </section>
        )}

        {/* Liens */}
        <div className="flex flex-wrap gap-4 text-sm pt-2">
          <a href={`${base}/cgv`} className="text-blue-600 hover:underline">Conditions Generales de Vente</a>
          <a href={`${base}/privacy`} className="text-blue-600 hover:underline">Politique de confidentialite</a>
        </div>
      </div>
    </div>
  );
}
