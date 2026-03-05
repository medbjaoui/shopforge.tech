import type { Metadata } from 'next';

interface Tenant {
  name: string; slug: string;
  legalName: string | null; legalAddress: string | null;
  matriculeFiscal: string | null; rne: string | null;
  contactEmail: string | null; phone: string | null;
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
  const title = `Politique de Confidentialite — ${storeName}`;
  const description = `Decouvrez comment ${storeName} protege vos donnees personnelles conformement a la loi INPDP.`;
  return { title, description, openGraph: { title, description, type: 'website' } };
}

export default async function PrivacyPage({ params }: { params: { slug: string } }) {
  const tenant = await getTenant(params.slug);
  const storeName = tenant?.legalName || tenant?.name || params.slug;
  const base = `/store/${params.slug}`;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 sm:py-14">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Politique de Confidentialite</h1>
      <p className="text-sm text-gray-400 mb-8">
        Conforme a la Loi n 2004-63 relative a la protection des donnees a caractere personnel (INPDP)
      </p>

      <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
        {/* Introduction */}
        <Section title="1. Responsable du traitement">
          <p>
            Le responsable du traitement des donnees personnelles est <strong>{storeName}</strong>.
          </p>
          {tenant?.legalAddress && <p>Siege social : {tenant.legalAddress}</p>}
          {tenant?.contactEmail && (
            <p>Contact : <a href={`mailto:${tenant.contactEmail}`} className="text-blue-600 hover:underline">{tenant.contactEmail}</a></p>
          )}
          {tenant?.phone && <p>Telephone : {tenant.phone}</p>}
        </Section>

        {/* Donnees collectees */}
        <Section title="2. Donnees collectees">
          <p>Dans le cadre de votre utilisation de notre boutique en ligne, nous collectons les donnees suivantes :</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>Donnees d&apos;identification :</strong> nom, prenom</li>
            <li><strong>Donnees de contact :</strong> adresse email, numero de telephone</li>
            <li><strong>Donnees de livraison :</strong> adresse postale complete</li>
            <li><strong>Donnees de commande :</strong> historique des achats, montants, references</li>
          </ul>
          <p className="mt-2 text-gray-500">
            Nous ne collectons aucune donnee bancaire. Les paiements sont geres par des prestataires tiers securises
            ou effectues a la livraison (COD).
          </p>
        </Section>

        {/* Finalite */}
        <Section title="3. Finalite du traitement">
          <p>Vos donnees personnelles sont collectees et traitees pour les finalites suivantes :</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Gestion et suivi des commandes</li>
            <li>Livraison des produits commandes</li>
            <li>Communication relative a votre commande (confirmation, suivi, SAV)</li>
            <li>Gestion de la relation client</li>
            <li>Respect des obligations legales et reglementaires</li>
          </ul>
        </Section>

        {/* Base legale */}
        <Section title="4. Base legale du traitement">
          <p>Le traitement de vos donnees repose sur :</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>L&apos;execution du contrat :</strong> traitement necessaire a l&apos;execution de votre commande</li>
            <li><strong>L&apos;obligation legale :</strong> conservation des factures et documents comptables</li>
            <li><strong>Le consentement :</strong> pour toute communication marketing (opt-in)</li>
          </ul>
        </Section>

        {/* Duree de conservation */}
        <Section title="5. Duree de conservation">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <ul className="space-y-2">
              <li><strong>Donnees de commande :</strong> 5 ans (obligation comptable et fiscale tunisienne)</li>
              <li><strong>Donnees de contact :</strong> 3 ans apres la derniere interaction</li>
              <li><strong>Donnees de navigation :</strong> 13 mois maximum</li>
            </ul>
          </div>
          <p className="mt-2">
            A l&apos;expiration de ces delais, vos donnees sont supprimees ou anonymisees de maniere irreversible.
          </p>
        </Section>

        {/* Droits des clients */}
        <Section title="6. Vos droits (art. 32 et suivants, Loi 2004-63)">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
            <p className="font-semibold text-blue-800 mb-2">Vous disposez des droits suivants :</p>
            <ul className="space-y-2 text-blue-700">
              <li><strong>Droit d&apos;acces :</strong> obtenir la confirmation que vos donnees sont traitees et en obtenir une copie</li>
              <li><strong>Droit de rectification :</strong> demander la correction de donnees inexactes ou incompletes</li>
              <li><strong>Droit de suppression :</strong> demander l&apos;effacement de vos donnees personnelles</li>
              <li><strong>Droit d&apos;opposition :</strong> vous opposer au traitement de vos donnees pour motif legitime</li>
            </ul>
          </div>
          <p>
            Pour exercer ces droits, contactez-nous par email a{' '}
            {tenant?.contactEmail ? (
              <a href={`mailto:${tenant.contactEmail}`} className="text-blue-600 hover:underline font-medium">{tenant.contactEmail}</a>
            ) : (
              <span className="text-gray-500">l&apos;adresse indiquee sur notre page contact</span>
            )}.
          </p>
          <p className="mt-2">
            Vous pouvez egalement deposer une reclamation aupres de l&apos;<strong>Instance Nationale de
            Protection des Donnees Personnelles (INPDP)</strong>.
          </p>
        </Section>

        {/* Securite */}
        <Section title="7. Securite des donnees">
          <p>
            Nous mettons en oeuvre des mesures techniques et organisationnelles appropriees pour proteger
            vos donnees personnelles contre tout acces non autorise, modification, divulgation ou destruction :
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Communications chiffrees (HTTPS/TLS)</li>
            <li>Acces restreint aux donnees (principe du moindre privilege)</li>
            <li>Mots de passe haches et sales</li>
            <li>Sauvegardes regulieres et securisees</li>
          </ul>
        </Section>

        {/* Partage */}
        <Section title="8. Partage des donnees">
          <p>
            Vos donnees personnelles peuvent etre partagees avec les tiers suivants, uniquement dans la
            mesure necessaire a l&apos;execution de votre commande :
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>Transporteurs :</strong> nom, telephone et adresse de livraison</li>
            <li><strong>Hebergeur :</strong> donnees stockees sur des serveurs securises</li>
          </ul>
          <p className="mt-2">
            Nous ne vendons ni ne louons vos donnees personnelles a des tiers a des fins commerciales.
          </p>
        </Section>

        {/* Cookies */}
        <Section title="9. Cookies">
          <p>
            Notre site utilise des cookies techniques strictement necessaires au fonctionnement de la
            boutique (panier, session). Aucun cookie publicitaire ou de tracking tiers n&apos;est utilise.
          </p>
        </Section>

        {/* Modification */}
        <Section title="10. Modification de la politique">
          <p>
            Nous nous reservons le droit de modifier la presente politique de confidentialite a tout
            moment. Les modifications prennent effet des leur publication sur cette page.
          </p>
        </Section>

        {/* Navigation */}
        <div className="flex gap-4 pt-4 text-sm">
          <a href={`${base}/cgv`} className="text-blue-600 hover:underline">Conditions Generales de Vente</a>
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
