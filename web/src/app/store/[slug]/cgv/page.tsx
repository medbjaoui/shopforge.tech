import type { Metadata } from 'next';

interface Tenant {
  name: string; slug: string;
  legalName: string | null; legalAddress: string | null;
  matriculeFiscal: string | null; rne: string | null;
  contactEmail: string | null; phone: string | null;
  shippingFee: string | null; freeShippingThreshold: string | null;
  codEnabled?: boolean;
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
  const title = `Conditions Generales de Vente — ${storeName}`;
  const description = `Consultez les CGV de ${storeName}. Droit de retractation, livraison, paiement et politique de retour.`;
  return { title, description, openGraph: { title, description, type: 'website' } };
}

export default async function CgvPage({ params }: { params: { slug: string } }) {
  const tenant = await getTenant(params.slug);
  const storeName = tenant?.legalName || tenant?.name || params.slug;
  const base = `/store/${params.slug}`;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 sm:py-14">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Conditions Generales de Vente</h1>
      <p className="text-sm text-gray-400 mb-8">Dernieres mise a jour : Mars 2026</p>

      <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
        {/* Article 1 */}
        <Section title="Article 1 — Objet">
          <p>
            Les presentes Conditions Generales de Vente (CGV) regissent les ventes de produits
            proposees sur la boutique en ligne <strong>{storeName}</strong> accessible via le
            sous-domaine <strong>{params.slug}.shopforge.tech</strong>.
          </p>
          <p>
            Toute commande passee sur ce site implique l&apos;acceptation sans reserve des presentes CGV.
          </p>
        </Section>

        {/* Article 2 */}
        <Section title="Article 2 — Prix">
          <p>
            Les prix sont indiques en <strong>Dinars Tunisiens (TND)</strong>, toutes taxes comprises (TTC).
            Le vendeur se reserve le droit de modifier ses prix a tout moment, etant entendu que le prix
            figurant au moment de la validation de la commande sera le seul applicable a l&apos;acheteur.
          </p>
        </Section>

        {/* Article 3 */}
        <Section title="Article 3 — Commande">
          <p>
            Conformement a la <strong>Loi sur le Commerce Electronique (LECE, art. 25)</strong>, toute
            commande est confirmee par un recapitulatif ecrit (email de confirmation) comprenant le
            detail des produits, le prix total, les frais de livraison et les coordonnees du vendeur.
          </p>
          <p>
            Le client recoit un email de confirmation apres validation de sa commande. En l&apos;absence
            d&apos;email, le client peut contacter le vendeur pour obtenir une confirmation.
          </p>
        </Section>

        {/* Article 4 */}
        <Section title="Article 4 — Livraison">
          {tenant?.shippingFee !== null && tenant?.shippingFee !== undefined ? (
            <div className="space-y-2">
              {Number(tenant.shippingFee) === 0 ? (
                <p>La livraison est <strong>gratuite</strong> sur toutes les commandes.</p>
              ) : (
                <>
                  <p>Frais de livraison : <strong>{Number(tenant.shippingFee).toFixed(3)} TND</strong>.</p>
                  {tenant.freeShippingThreshold && (
                    <p>Livraison gratuite a partir de <strong>{Number(tenant.freeShippingThreshold).toFixed(0)} TND</strong> d&apos;achat.</p>
                  )}
                </>
              )}
              <p>Les delais de livraison sont communiques a titre indicatif et ne constituent pas un engagement contractuel.</p>
            </div>
          ) : (
            <p>Les frais et delais de livraison sont communiques au moment de la commande.</p>
          )}
        </Section>

        {/* Article 5 — Droit de retractation */}
        <Section title="Article 5 — Droit de retractation">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
            <p className="font-semibold text-blue-800 mb-1">Droit de retractation de 7 jours</p>
            <p className="text-blue-700">
              Conformement a la legislation tunisienne sur le commerce electronique, le client
              dispose d&apos;un delai de <strong>7 jours ouvrables</strong> a compter de la date de
              reception de la marchandise pour exercer son droit de retractation, sans avoir a
              justifier de motif ni a payer de penalites.
            </p>
          </div>
          <p>
            Pour exercer ce droit, le client doit notifier le vendeur par email ou par tout moyen
            ecrit. Les produits doivent etre retournes dans leur etat d&apos;origine, non utilises,
            avec tous les accessoires et emballages d&apos;origine.
          </p>
          <p>
            Le remboursement sera effectue dans un delai de 15 jours suivant la reception du
            produit retourne, par le meme moyen de paiement utilise lors de la commande.
          </p>
          <p className="text-gray-500 text-xs mt-2">
            Exceptions : Les produits personnalises, perissables ou descelles ne sont pas eligibles au droit de retractation.
          </p>
        </Section>

        {/* Article 6 */}
        <Section title="Article 6 — Paiement">
          <p>Les modes de paiement acceptes sont :</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            {tenant?.codEnabled !== false && (
              <li><strong>Paiement a la livraison (COD)</strong> — le client paie en especes a la reception de sa commande.</li>
            )}
            <li>Tout autre moyen de paiement indique sur le site au moment de la commande.</li>
          </ul>
        </Section>

        {/* Article 7 */}
        <Section title="Article 7 — Donnees personnelles">
          <p>
            Les donnees personnelles collectees sont traitees conformement a la
            <strong> Loi n 2004-63 relative a la protection des donnees a caractere personnel</strong> (INPDP).
          </p>
          <p>
            Pour plus d&apos;informations, veuillez consulter notre{' '}
            <a href={`${base}/privacy`} className="text-blue-600 hover:underline">
              Politique de Confidentialite
            </a>.
          </p>
        </Section>

        {/* Article 8 */}
        <Section title="Article 8 — Responsabilite">
          <p>
            Le vendeur ne saurait etre tenu responsable de l&apos;inexecution du contrat en cas de force
            majeure, de perturbation ou de greve totale ou partielle des services postaux et moyens
            de transport et/ou communications.
          </p>
          <p>
            Les photos et descriptions des produits sont fournies a titre indicatif. Des variations
            mineures peuvent exister entre le produit presente et le produit livre.
          </p>
        </Section>

        {/* Article 9 */}
        <Section title="Article 9 — Droit applicable et litiges">
          <p>
            Les presentes CGV sont soumises au <strong>droit tunisien</strong>. En cas de litige,
            les parties s&apos;efforceront de trouver une solution amiable. A defaut, les tribunaux
            competents de Tunisie seront seuls competents.
          </p>
        </Section>

        {/* Mentions legales */}
        {(tenant?.legalName || tenant?.matriculeFiscal) && (
          <section className="bg-gray-50 rounded-xl p-4 sm:p-6 mt-8 border border-gray-200">
            <h2 className="font-semibold text-gray-900 text-base mb-3">Mentions legales du vendeur</h2>
            <div className="space-y-1 text-sm text-gray-600">
              {tenant.legalName && <p><span className="text-gray-400">Raison sociale :</span> {tenant.legalName}</p>}
              {tenant.legalAddress && <p><span className="text-gray-400">Siege social :</span> {tenant.legalAddress}</p>}
              {tenant.matriculeFiscal && <p><span className="text-gray-400">Matricule fiscal :</span> {tenant.matriculeFiscal}</p>}
              {tenant.rne && <p><span className="text-gray-400">RNE :</span> {tenant.rne}</p>}
              {tenant.contactEmail && <p><span className="text-gray-400">Contact :</span> {tenant.contactEmail}</p>}
              {tenant.phone && <p><span className="text-gray-400">Telephone :</span> {tenant.phone}</p>}
            </div>
          </section>
        )}

        {/* Navigation */}
        <div className="flex gap-4 pt-4 text-sm">
          <a href={`${base}/privacy`} className="text-blue-600 hover:underline">Politique de confidentialite</a>
          <a href={`${base}/policies`} className="text-blue-600 hover:underline">Politique de retour</a>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
      <h2 className="font-semibold text-gray-900 text-base mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
