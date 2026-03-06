'use client';
import Link from 'next/link';
import { useState } from 'react';
import { LogoIcon } from '@/components/Logo';
import { Reveal } from '@/components/Reveal';
import CommissionCalculator from '@/components/CommissionCalculator';

// ─── Data ───────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: '⚡',
    title: 'Boutique prête en 5 min',
    desc: 'Inscription en 30 secondes. Sous-domaine boutique.shopforge.tech créé automatiquement.',
  },
  {
    icon: '🚚',
    title: '5 transporteurs intégrés',
    desc: 'ABM Delivery, FDG, Aramex, DHL, La Poste TN. Génération de bordereaux et suivi inclus.',
  },
  {
    icon: '💸',
    title: 'Paiement à la livraison natif',
    desc: 'COD + virement bancaire — les seules méthodes qui marchent réellement en Tunisie.',
  },
  {
    icon: '📄',
    title: 'Conformité fiscale TN',
    desc: 'Factures TVA 19%, timbre fiscal 0.600 TND, matricule fiscal. Tout automatique.',
  },
  {
    icon: '🤖',
    title: 'IA intégrée (Claude)',
    desc: 'Génération de descriptions, chatbot client, insights ventes, réponses aux commandes.',
  },
  {
    icon: '📊',
    title: 'Dashboard temps réel',
    desc: 'Commandes, revenus, stock bas, entonnoir de conversion. Tendances vs période précédente.',
  },
  {
    icon: '🎨',
    title: 'Thèmes professionnels',
    desc: 'Thèmes optimisés pour convertir, 100% mobile, adaptés à chaque secteur.',
  },
  {
    icon: '🔒',
    title: 'Sécurité & conformité',
    desc: 'SSL, INPDP, CGV légale, mentions légales. Conforme pour la Tunisie dès le premier jour.',
  },
  {
    icon: '👤',
    title: 'Comptes clients',
    desc: 'Vos clients créent un compte, suivent leurs commandes et consultent leur historique.',
  },
  {
    icon: '🎟️',
    title: 'Codes promo & wallet',
    desc: 'Remises en % ou montant fixe. Wallet marchand avec solde de bienvenu offert.',
  },
  {
    icon: '📱',
    title: 'WhatsApp & Meta Pixel',
    desc: 'Widget WhatsApp flottant + Facebook Pixel + Conversions API pour vos campagnes.',
  },
  {
    icon: '✈️',
    title: 'Alertes instantanées',
    desc: 'Email + Telegram à chaque commande. Taux d\'ouverture ×3 vs email seul.',
  },
];

const PLANS = [
  {
    key: 'FREE',
    name: 'Gratuit',
    price: '0',
    sub: 'Pour démarrer',
    cta: 'Commencer gratuitement',
    features: [
      '10 produits',
      '50 commandes / mois',
      'Boutique personnalisée',
      'COD natif',
      '5 transporteurs',
      'Factures automatiques',
      'Solde wallet 5 TND offert',
    ],
    highlight: false,
  },
  {
    key: 'STARTER',
    name: 'Starter',
    price: '29',
    sub: '/ mois',
    cta: 'Commencer avec Starter',
    features: [
      '100 produits',
      '500 commandes / mois',
      'Tout du plan Gratuit',
      '50 requêtes IA / mois',
      'Commission réduite (1.5%)',
      'Codes promo avancés',
      'Support prioritaire',
    ],
    highlight: true,
  },
  {
    key: 'PRO',
    name: 'Pro',
    price: '79',
    sub: '/ mois',
    cta: 'Passer au Pro',
    features: [
      'Produits illimités',
      'Commandes illimitées',
      'Tout du plan Starter',
      '500 requêtes IA / mois',
      'Commission minimale (0.5%)',
      'Domaine personnalisé',
      'Onboarding dédié',
    ],
    highlight: false,
  },
];

const TESTIMONIALS = [
  {
    name: 'Sarra B.',
    store: 'Mode & Accessoires — Tunis',
    text: 'En 2 heures j\'avais ma boutique en ligne avec mes produits et mes transporteurs configurés. Avant je perdais des heures avec WhatsApp Business.',
    plan: 'STARTER',
  },
  {
    name: 'Mohamed K.',
    store: 'Électronique — Sfax',
    text: 'Le COD natif m\'a sauvé. Shopify ne supportait pas le paiement à la livraison en TND. Ici tout est pensé pour la Tunisie.',
    plan: 'PRO',
  },
  {
    name: 'Anis T.',
    store: 'Artisanat — Sousse',
    text: 'Les factures TVA générées automatiquement et le matricule fiscal dans le footer — c\'est ce qui m\'a convaincu. Conforme d\'office.',
    plan: 'STARTER',
  },
];

const FAQS = [
  {
    q: 'Combien de temps pour avoir ma boutique en ligne ?',
    a: 'Moins de 5 minutes. Inscription, nom du store, et vous avez votre boutique sur yourstore.shopforge.tech. L\'onboarding guide étape par étape.',
  },
  {
    q: 'Quels transporteurs sont intégrés ?',
    a: 'ABM Delivery, First Delivery Group, Aramex, DHL et La Poste Tunisienne. Génération automatique de bordereaux et suivi en temps réel depuis votre dashboard.',
  },
  {
    q: 'Comment fonctionne la commission ?',
    a: 'Vous payez uniquement quand vous encaissez. FREE: 3%, STARTER: 1.5%, PRO: 0.5% — calculée uniquement sur les commandes COD livrées. Zéro frais si zéro vente.',
  },
  {
    q: 'Est-ce conforme à la législation tunisienne ?',
    a: 'Oui. Factures avec TVA 19% + timbre fiscal automatiques, CGV légale incluse, conformité INPDP (protection des données), matricule fiscal dans le footer.',
  },
  {
    q: 'Puis-je utiliser un domaine personnalisé ?',
    a: 'Oui depuis le plan PRO. Vous pointez votre domaine .tn ou autre vers nos serveurs, la configuration se fait automatiquement.',
  },
  {
    q: 'Que se passe-t-il si je dépasse les limites du plan gratuit ?',
    a: 'Vous êtes notifié à 80% d\'utilisation. Pas de coupure brutale — vous avez le temps de passer à un plan supérieur.',
  },
];

// ─── Components ──────────────────────────────────────────────────────────────

function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="space-y-3">
      {FAQS.map((faq, i) => (
        <div key={i} className="border border-gray-200 rounded-2xl overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-6 py-4 text-left text-gray-900 font-medium hover:bg-gray-50 transition-colors"
            onClick={() => setOpen(open === i ? null : i)}
          >
            <span>{faq.q}</span>
            <span className={`text-orange-500 text-xl transition-transform duration-200 ${open === i ? 'rotate-45' : ''}`}>+</span>
          </button>
          {open === i && (
            <div className="px-6 pb-5 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-4">
              {faq.a}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <LogoIcon size={32} />
            <span className="font-bold text-lg text-gray-900 tracking-tight">ShopForge</span>
          </a>
          <div className="hidden sm:flex items-center gap-6 text-sm text-gray-600">
            <a href="#features" className="hover:text-orange-500 transition-colors">Fonctionnalités</a>
            <a href="#pricing" className="hover:text-orange-500 transition-colors">Tarifs</a>
            <a href="#faq" className="hover:text-orange-500 transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 hidden sm:block">
              Connexion
            </Link>
            <Link
              href="/register"
              className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              Créer ma boutique
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gray-950 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-600/20 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 py-24 sm:py-32 relative">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Left — text */}
            <div className="flex-1 text-center lg:text-left">
              <Reveal>
                <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-semibold px-4 py-1.5 rounded-full mb-6">
                  🇹🇳 Conçu pour la Tunisie et le MENA
                </div>
              </Reveal>
              <Reveal delay={0.1}>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-6 tracking-tight">
                  Votre boutique en ligne<br />
                  <span className="text-orange-400">en 5 minutes</span>
                </h1>
              </Reveal>
              <Reveal delay={0.2}>
                <p className="text-lg text-gray-400 max-w-xl mb-10 leading-relaxed mx-auto lg:mx-0">
                  La seule plateforme e-commerce pensée pour le marché tunisien.
                  COD natif, transporteurs locaux intégrés, factures TVA automatiques — sans configuration.
                </p>
              </Reveal>
              <Reveal delay={0.3}>
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center">
                  <Link
                    href="/register"
                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-4 rounded-2xl text-base transition-colors shadow-xl shadow-orange-500/30 w-full sm:w-auto"
                  >
                    🚀 Créer ma boutique gratuitement
                  </Link>
                  <a
                    href="#pricing"
                    className="border border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white font-semibold px-8 py-4 rounded-2xl text-base transition-colors w-full sm:w-auto"
                  >
                    Voir les tarifs →
                  </a>
                </div>
              </Reveal>
              <Reveal delay={0.4}>
                <p className="mt-5 text-sm text-gray-500">Gratuit pour toujours. Aucune carte bancaire requise.</p>
              </Reveal>

              {/* Social proof */}
              <Reveal delay={0.5}>
                <div className="mt-10 flex flex-wrap justify-center lg:justify-start gap-6 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <span className="text-orange-400 font-bold text-2xl">5</span>
                    <span>transporteurs TN intégrés</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-orange-400 font-bold text-2xl">0</span>
                    <span>TND / mois pour démarrer</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-orange-400 font-bold text-2xl">100%</span>
                    <span>conforme législation TN</span>
                  </div>
                </div>
              </Reveal>
            </div>

            {/* Right — animated phone mockup */}
            <Reveal delay={0.4} from="right" className="hidden sm:block flex-shrink-0">
              <div className="relative">
                {/* Glow */}
                <div className="absolute -inset-8 bg-orange-500/10 rounded-full blur-3xl" />
                {/* Phone frame */}
                <div className="relative w-[280px] h-[580px] bg-gray-900 rounded-[3rem] border-[6px] border-gray-700 shadow-2xl shadow-black/50 overflow-hidden">
                  {/* Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-gray-900 rounded-b-2xl z-20" />
                  {/* Status bar */}
                  <div className="absolute top-0 left-0 right-0 h-10 bg-white z-10 flex items-end justify-between px-6 pb-1">
                    <span className="text-[9px] text-gray-500 font-semibold">9:41</span>
                    <div className="flex gap-1 items-center">
                      <div className="w-3 h-1.5 border border-gray-400 rounded-sm"><div className="w-2 h-full bg-gray-500 rounded-sm" /></div>
                    </div>
                  </div>
                  {/* Screen content — auto-scrolling store mockup */}
                  <div className="absolute inset-0 top-10 bg-white overflow-hidden">
                    <div className="animate-phone-scroll">
                      {/* Store header */}
                      <div className="bg-orange-500 px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-white/20 rounded-lg" />
                          <span className="text-white font-bold text-sm">Ma Boutique</span>
                        </div>
                        <div className="flex gap-2">
                          <div className="w-5 h-5 bg-white/20 rounded-full" />
                          <div className="w-5 h-5 bg-white/20 rounded-full" />
                        </div>
                      </div>
                      {/* Hero banner */}
                      <div className="relative h-32 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&h=300&fit=crop" alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-4">
                          <p className="text-[10px] text-orange-300 font-semibold uppercase tracking-wider">Nouvelle collection</p>
                          <p className="text-sm font-black text-white">Soldes d'hiver -30%</p>
                        </div>
                      </div>
                      {/* Categories */}
                      <div className="flex gap-2 px-4 py-3 overflow-hidden">
                        {['Robes', 'Sacs', 'Bijoux', 'Chaussures'].map((c) => (
                          <div key={c} className="flex-shrink-0 px-3 py-1.5 bg-gray-100 rounded-full">
                            <span className="text-[9px] text-gray-700 font-medium">{c}</span>
                          </div>
                        ))}
                      </div>
                      {/* Product grid */}
                      <div className="px-3 pb-3">
                        <p className="text-xs font-bold text-gray-900 px-1 mb-2">Populaires</p>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { name: 'Robe Jasmine', price: '89.900', img: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=300&h=400&fit=crop' },
                            { name: 'Sac Medina', price: '65.000', img: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=300&h=400&fit=crop' },
                            { name: 'Collier Djerba', price: '35.500', img: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=300&h=400&fit=crop' },
                            { name: 'Sandales Sidi', price: '49.900', img: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=300&h=400&fit=crop' },
                          ].map((p, i) => (
                            <div key={i} className="bg-gray-50 rounded-xl overflow-hidden">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={p.img} alt={p.name} className="h-28 w-full object-cover" loading="lazy"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                              <div className="p-2">
                                <p className="text-[9px] text-gray-900 font-semibold truncate">{p.name}</p>
                                <p className="text-[10px] text-orange-600 font-bold">{p.price} TND</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Product detail mock */}
                      <div className="px-3 pb-3">
                        <div className="bg-gray-50 rounded-xl overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&h=400&fit=crop" alt="" className="h-36 w-full object-cover" loading="lazy" />
                          <div className="p-3">
                            <p className="text-xs font-bold text-gray-900">Caftan Tunis Royal</p>
                            <p className="text-sm font-black text-orange-600 mt-0.5">129.900 TND</p>
                            <div className="flex gap-1 mt-2">
                              {['S', 'M', 'L', 'XL'].map(s => (
                                <div key={s} className={`w-6 h-6 rounded-md text-[8px] flex items-center justify-center font-bold ${s === 'M' ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-600'}`}>{s}</div>
                              ))}
                            </div>
                            <div className="mt-3 w-full h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                              <span className="text-white text-[10px] font-bold">Ajouter au panier</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* COD badge */}
                      <div className="px-3 pb-4">
                        <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
                          <span className="text-green-600 text-lg">💸</span>
                          <div>
                            <p className="text-[10px] font-bold text-green-800">Paiement a la livraison</p>
                            <p className="text-[8px] text-green-600">Payez en cash quand vous recevez votre colis</p>
                          </div>
                        </div>
                      </div>
                      {/* Spacer for scroll loop */}
                      <div className="h-20" />
                    </div>
                  </div>
                  {/* Home indicator */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-28 h-1 bg-gray-600 rounded-full z-20" />
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Problem / Solution ── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4">
          <Reveal>
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">
                Shopify ne marche pas en Tunisie
              </h2>
              <p className="text-gray-500 max-w-xl mx-auto">Voici pourquoi les marchands tunisiens abandonnent les plateformes étrangères.</p>
            </div>
          </Reveal>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { problem: '💸 Facturation en USD', solution: 'ShopForge facture en TND, plans dès 0 TND/mois' },
              { problem: '🚚 Pas de transporteurs TN', solution: '5 transporteurs tunisiens intégrés nativement' },
              { problem: '💳 Pas de COD natif', solution: 'Paiement à la livraison + virement bancaire d\'office' },
            ].map((item, i) => (
              <Reveal key={i} delay={i * 0.1}>
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <p className="text-sm text-red-600 font-semibold mb-3 line-through opacity-70">{item.problem}</p>
                  <p className="text-sm font-semibold text-green-700 flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    {item.solution}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <Reveal>
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">Tout ce dont vous avez besoin</h2>
              <p className="text-gray-500 max-w-xl mx-auto">Une plateforme complète, sans plugins, sans surprises.</p>
            </div>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <Reveal key={i} delay={(i % 3) * 0.08}>
                <div className="group p-6 rounded-2xl border border-gray-100 hover:border-orange-200 hover:shadow-lg hover:shadow-orange-50 transition-all duration-200">
                  <div className="w-11 h-11 bg-orange-50 rounded-xl flex items-center justify-center text-xl mb-4 group-hover:bg-orange-100 transition-colors">
                    {f.icon}
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1.5">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-20 bg-gray-950 text-white">
        <div className="max-w-5xl mx-auto px-4">
          <Reveal>
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-black mb-4">Comment ça marche</h2>
              <p className="text-gray-400 max-w-xl mx-auto">3 étapes pour avoir votre boutique en ligne.</p>
            </div>
          </Reveal>
          <div className="grid sm:grid-cols-3 gap-8 relative">
            <div className="hidden sm:block absolute top-8 left-[33%] right-[33%] h-0.5 bg-gradient-to-r from-orange-500/50 to-orange-500/50" />
            {[
              { n: '1', title: 'Créez votre compte', desc: 'Renseignez le nom de votre boutique et votre email. 30 secondes, aucune carte requise.' },
              { n: '2', title: 'Configurez votre boutique', desc: 'Ajoutez vos produits, choisissez votre thème, configurez vos transporteurs.' },
              { n: '3', title: 'Commencez à vendre', desc: 'Votre boutique est en ligne. Partagez le lien, recevez vos commandes, gérez tout depuis le dashboard.' },
            ].map((step, i) => (
              <Reveal key={i} delay={i * 0.15}>
                <div className="text-center relative">
                  <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center text-2xl font-black mx-auto mb-5 shadow-lg shadow-orange-500/40">
                    {step.n}
                  </div>
                  <h3 className="font-bold text-lg mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{step.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-20 bg-orange-50">
        <div className="max-w-5xl mx-auto px-4">
          <Reveal>
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">Ce que disent nos marchands</h2>
            </div>
          </Reveal>
          <div className="grid sm:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={i} delay={i * 0.1}>
                <div className="bg-white rounded-2xl p-7 shadow-sm border border-orange-100">
                  <div className="flex text-orange-400 mb-4 text-sm gap-0.5">
                    {'★★★★★'.split('').map((s, j) => <span key={j}>{s}</span>)}
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed mb-5 italic">"{t.text}"</p>
                  <div>
                    <p className="font-bold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.store}</p>
                    <span className="inline-block mt-2 text-[10px] bg-orange-100 text-orange-700 font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide">
                      Plan {t.plan}
                    </span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-20">
        <div className="max-w-5xl mx-auto px-4">
          <Reveal>
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">Tarifs simples et transparents</h2>
              <p className="text-gray-500 max-w-xl mx-auto">
                Payez uniquement quand vous encaissez. Commission sur les commandes COD livrées — zéro frais si zéro vente.
              </p>
            </div>
          </Reveal>
          <div className="grid sm:grid-cols-3 gap-6 items-start">
            {PLANS.map((plan, i) => (
              <Reveal key={plan.key} delay={i * 0.1}>
                <div className={`rounded-2xl border-2 p-8 relative ${plan.highlight ? 'border-orange-400 shadow-2xl shadow-orange-100' : 'border-gray-200'}`}>
                  {plan.highlight && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-4 py-1 rounded-full">
                      Recommandé
                    </div>
                  )}
                  <h3 className="font-black text-xl text-gray-900 mb-1">{plan.name}</h3>
                  <div className="flex items-end gap-1 mb-1">
                    <span className="text-4xl font-black text-gray-900">{plan.price}</span>
                    <span className="text-gray-500 text-sm mb-1">TND{plan.sub}</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-6">+ commission sur COD livré</p>
                  <ul className="space-y-2.5 mb-8">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                        <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/register"
                    className={`block text-center py-3 rounded-xl font-bold text-sm transition-colors ${
                      plan.highlight
                        ? 'bg-orange-500 hover:bg-orange-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <div className="mt-10 bg-gray-50 rounded-2xl p-6 text-sm text-gray-600 border border-gray-200">
              <p className="font-semibold text-gray-800 mb-2">💰 Nouveau modèle de commission hybride</p>
              <p>
                La commission est <strong>le maximum entre un montant fixe et un pourcentage</strong> de la commande livrée.
                Exemple: Plan FREE → MAX(2 TND fixe, 1.2% de la commande).
                Elle est déduite automatiquement de votre wallet marchand.
                <strong className="block mt-2">🎁 Premier mois gratuit: 50 commandes sans commission!</strong>
              </p>
            </div>
          </Reveal>

          {/* Commission Calculator */}
          <Reveal>
            <div className="mt-16">
              <CommissionCalculator />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Parrainage CTA ── */}
      <section className="py-16 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Reveal>
            <h2 className="text-3xl font-black mb-4">Parrainez un ami, gagnez 10 TND</h2>
            <p className="text-orange-100 mb-8 max-w-lg mx-auto">
              Chaque marchand que vous parrainez vous rapporte 10 TND sur votre wallet dès sa première commande.
              Partagez votre lien depuis votre dashboard.
            </p>
            <Link
              href="/register"
              className="bg-white text-orange-600 font-bold px-8 py-4 rounded-2xl hover:bg-orange-50 transition-colors"
            >
              Créer ma boutique et parrainer →
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-20">
        <div className="max-w-3xl mx-auto px-4">
          <Reveal>
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">Questions fréquentes</h2>
            </div>
          </Reveal>
          <FAQ />
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 bg-gray-950 text-white text-center">
        <div className="max-w-3xl mx-auto px-4">
          <Reveal>
            <h2 className="text-4xl sm:text-5xl font-black mb-6">
              Prêt à vendre en ligne ?
            </h2>
            <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto">
              Rejoignez les marchands tunisiens qui ont choisi ShopForge.
              Boutique en ligne opérationnelle en moins de 5 minutes.
            </p>
            <Link
              href="/register"
              className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-bold px-10 py-5 rounded-2xl text-lg transition-colors shadow-2xl shadow-orange-500/30"
            >
              🚀 Créer ma boutique gratuitement
            </Link>
            <p className="mt-4 text-sm text-gray-600">Aucune carte bancaire. Aucun engagement.</p>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-gray-900 border-t border-gray-800 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid sm:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <LogoIcon size={28} />
                <span className="font-bold text-white">ShopForge</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                La plateforme e-commerce tunisienne. Conçue pour le marché local, prête pour le monde.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Produit</p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#features" className="hover:text-white transition-colors">Fonctionnalités</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Tarifs</a></li>
                <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Compte</p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><Link href="/register" className="hover:text-white transition-colors">Créer une boutique</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Se connecter</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Contact</p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="mailto:contact@shopforge.tech" className="hover:text-white transition-colors">contact@shopforge.tech</a></li>
                <li>
                  <a href="https://forge3d.tech" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                    Forge3D Technologies
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
            <p>© {new Date().getFullYear()} ShopForge by Forge3D. Tous droits réservés.</p>
            <p>Conçu en Tunisie 🇹🇳</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
