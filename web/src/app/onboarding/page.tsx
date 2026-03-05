'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { THEMES, getFreeThemes, getPremiumThemes } from '@/lib/themes';
import { LogoIcon } from '@/components/Logo';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ── Plans ──────────────────────────────────────────────────────────────────────

const PLANS = [
  {
    id: 'FREE', name: 'Gratuit', price: '0 TND', period: '/mois',
    color: 'border-gray-200',
    badge: 'bg-gray-100 text-gray-700',
    features: ['10 produits', '50 commandes/mois', 'Boutique en ligne', 'Codes promo'],
    cta: 'Commencer gratuitement',
  },
  {
    id: 'STARTER', name: 'Starter', price: '29 TND', period: '/mois',
    color: 'border-orange-400',
    badge: 'bg-orange-100 text-orange-700',
    features: ['100 produits', '500 commandes/mois', 'Analytiques avancées', 'Support prioritaire', 'Thèmes premium'],
    cta: 'Choisir Starter',
    popular: true,
  },
  {
    id: 'PRO', name: 'Pro', price: '79 TND', period: '/mois',
    color: 'border-purple-400',
    badge: 'bg-purple-100 text-purple-700',
    features: ['Produits illimités', 'Commandes illimitées', 'API access', 'Account manager dédié', 'Thèmes premium'],
    cta: 'Choisir Pro',
  },
];

const STEPS = ['Info & Thème', 'Plan & Lancement'];

// ── Main component ─────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const { store, updateStore } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Step 1 — Store info
  const [storeName, setStoreName] = useState(store?.name ?? '');
  const [description, setDescription] = useState('');
  const [logo, setLogo] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);

  // Step 1 — Theme
  const [selectedTheme, setSelectedTheme] = useState('default');

  // Step 2 — Plan
  const [selectedPlan, setSelectedPlan] = useState('FREE');

  // ── Logo upload ──────────────────────────────────────────────────────────────

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/uploads', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setLogo(data.url);
    } catch { setError('Erreur upload logo'); }
    finally { setLogoUploading(false); }
  };

  const logoUrl = logo ? (logo.startsWith('http') ? logo : `${API_URL}${logo}`) : null;

  // ── Submit ───────────────────────────────────────────────────────────────────

  const handleFinish = async () => {
    setSaving(true);
    setError('');
    try {
      const { data } = await api.post('/tenants/me/onboarding', {
        name: storeName.trim() || store?.name,
        description: description.trim() || undefined,
        logo: logo || undefined,
        theme: selectedTheme,
        plan: selectedPlan,
      });
      updateStore({
        name: data.name,
        theme: data.theme,
        onboardingCompleted: true,
        isPublished: false, // reste false jusqu'au 1er produit
      });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du lancement');
      setSaving(false);
    }
  };

  // ── Current theme object ─────────────────────────────────────────────────────
  const themeObj = THEMES[selectedTheme as keyof typeof THEMES] ?? THEMES.default;
  const premiumLocked = selectedPlan === 'FREE';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LogoIcon size={32} />
          <span className="font-bold text-gray-900 text-lg">ShopForge</span>
          <span className="text-gray-300">·</span>
          <span className="text-sm text-gray-500">Configuration de votre boutique</span>
        </div>
        <span className="text-xs text-gray-400">Étape {step} / {STEPS.length}</span>
      </div>

      {/* Steps indicator */}
      <div className="bg-white border-b border-gray-100 px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-0">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const done = n < step;
            const active = n === step;
            return (
              <div key={label} className="flex items-center flex-1 last:flex-none">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                  done ? 'bg-green-500 text-white' : active ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-400'
                }`}>
                  {done ? '✓' : n}
                </div>
                <div className="ml-2 mr-4">
                  <p className={`text-xs font-medium ${active ? 'text-orange-500' : done ? 'text-green-600' : 'text-gray-400'}`}>
                    {label}
                  </p>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mr-4 ${done ? 'bg-green-400' : 'bg-gray-100'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center px-4 py-10">

        {/* ── Step 1 : Info + Thème + Aperçu ─────────────────────────────────── */}
        {step === 1 && (
          <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* Left — Info + Themes */}
            <div className="lg:col-span-3 space-y-5">
              {/* Store info */}
              <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Bienvenue sur ShopForge ! 👋</h1>
                  <p className="text-gray-500 mt-1 text-sm">Personnalisez votre boutique en quelques clics.</p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-200 overflow-hidden shrink-0">
                    {logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl text-gray-200">◈</span>
                    )}
                  </div>
                  <div>
                    <label className="cursor-pointer block">
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                      <span className={`inline-block text-sm border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors ${logoUploading ? 'opacity-50' : ''}`}>
                        {logoUploading ? 'Chargement...' : logoUrl ? 'Changer le logo' : 'Choisir un logo'}
                      </span>
                    </label>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG — max 5 Mo. Optionnel.</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la boutique *</label>
                  <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="Ma Super Boutique" required />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tagline / Description</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                    rows={2} maxLength={200}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                    placeholder="La meilleure boutique en ligne de Tunis..." />
                  <div className="flex justify-between mt-1">
                    <p className="text-xs text-gray-400">Affichée sur la page d&apos;accueil.</p>
                    <span className={`text-xs font-medium ${description.length > 180 ? 'text-red-500' : 'text-gray-400'}`}>{description.length}/200</span>
                  </div>
                </div>
              </div>

              {/* Theme selection */}
              <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Choisissez votre thème</h2>
                  <p className="text-gray-500 mt-0.5 text-sm">Basés sur la psychologie des couleurs. Modifiable plus tard.</p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Thèmes gratuits</span>
                    <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">Tous les plans</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {getFreeThemes().map((theme) => (
                      <ThemeCard key={theme.id} theme={theme} selected={selectedTheme === theme.id} locked={false} onSelect={() => setSelectedTheme(theme.id)} />
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Thèmes premium</span>
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">Starter & Pro</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {getPremiumThemes().map((theme) => (
                      <ThemeCard key={theme.id} theme={theme} selected={selectedTheme === theme.id} locked={premiumLocked} onSelect={() => { if (!premiumLocked) setSelectedTheme(theme.id); }} />
                    ))}
                  </div>
                  {premiumLocked && (
                    <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                      <span>🔒</span> Choisissez Starter ou Pro à l&apos;étape suivante pour débloquer les thèmes premium
                    </p>
                  )}
                </div>

                {themeObj?.psychologyNote && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex gap-2">
                    <span className="text-blue-500 shrink-0">💡</span>
                    <p className="text-xs text-blue-700">{themeObj.psychologyNote}</p>
                  </div>
                )}
              </div>

              <button
                onClick={() => { if (storeName.trim()) setStep(2); }}
                disabled={!storeName.trim()}
                className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 disabled:opacity-40 transition-colors"
              >
                Continuer → Choisir mon plan et lancer
              </button>
            </div>

            {/* Right — Live preview (sticky) */}
            <div className="lg:col-span-2">
              <div className="sticky top-6">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 text-center">Aperçu en direct</p>
                <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-100">
                  {/* Browser chrome */}
                  <div className="bg-gray-100 px-3 py-2 flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                    </div>
                    <div className="flex-1 bg-white rounded px-2 py-0.5 text-[9px] text-gray-400 font-mono truncate">
                      {(store?.slug || 'ma-boutique')}.shopforge.tech
                    </div>
                  </div>

                  {/* Store header */}
                  <div className={`${themeObj.headerBg} border-b ${themeObj.headerBorder} px-4 py-2 flex items-center justify-between`}>
                    <span className={`text-xs font-bold ${themeObj.headerText}`}>{storeName || 'Ma Boutique'}</span>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] ${themeObj.headerText} opacity-60`}>Produits</span>
                      <span className={`text-[10px] ${themeObj.headerText} opacity-60`}>♡</span>
                      <span className={`text-[10px] ${themeObj.headerText} opacity-60`}>⊞</span>
                    </div>
                  </div>

                  {/* Hero */}
                  <div className={`bg-gradient-to-br ${themeObj.hero} px-5 py-6 text-white text-center`}>
                    <p className="font-bold text-sm leading-tight">{storeName || 'Ma Boutique'}</p>
                    <p className="text-[10px] opacity-70 mt-1 mb-3 leading-snug">
                      {description || 'Bienvenue dans notre boutique en ligne'}
                    </p>
                    <div className="inline-block bg-white/20 text-white text-[10px] px-4 py-1.5 rounded-full font-semibold border border-white/20">
                      Découvrir nos produits
                    </div>
                  </div>

                  {/* Product grid */}
                  <div className="bg-gray-50 p-3 grid grid-cols-3 gap-2">
                    {['Produit A', 'Produit B', 'Produit C'].map((name, i) => (
                      <div key={i} className="bg-white border border-gray-100 rounded-lg overflow-hidden">
                        <div className="bg-gradient-to-br from-gray-100 to-gray-200 h-10" />
                        <div className="p-1.5">
                          <p className="text-[8px] font-semibold text-gray-800 truncate">{name}</p>
                          <p className="text-[8px] text-gray-400 mb-1.5">{(19.9 + i * 10).toFixed(3)} TND</p>
                          <button className={`w-full text-[8px] text-white py-0.5 rounded font-semibold ${themeObj.btn}`}>
                            Ajouter
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className={`${themeObj.headerBg} border-t ${themeObj.headerBorder} px-4 py-1.5 text-center`}>
                    <span className={`text-[9px] ${themeObj.headerText} opacity-40`}>{storeName || 'Ma Boutique'} · ShopForge</span>
                  </div>
                </div>

                {/* Theme badge */}
                <div className="mt-3 flex items-center justify-center gap-2">
                  <div className="flex gap-1">
                    {themeObj.preview.slice(0, 2).map((color, i) => (
                      <div key={i} className="w-4 h-4 rounded-full border border-white shadow-sm" style={{ backgroundColor: color }} />
                    ))}
                  </div>
                  <span className="text-xs font-semibold text-gray-700">{themeObj.name}</span>
                  <span className="text-[10px] text-gray-400">· {themeObj.category}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2 : Plan + Lancement ────────────────────────────────────── */}
        {step === 2 && (
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-sm p-8 space-y-6">
            {/* Récap boutique */}
            <div className={`bg-gradient-to-r ${themeObj?.hero ?? 'from-gray-900 to-gray-700'} rounded-xl px-5 py-4 text-white flex items-center gap-3`}>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-base">{storeName || store?.name}</p>
                {description && <p className="text-xs opacity-70 mt-0.5 truncate">{description}</p>}
              </div>
              <div className="flex gap-1 shrink-0">
                {themeObj.preview.slice(0, 2).map((color, i) => (
                  <div key={i} className="w-4 h-4 rounded-full border border-white/30" style={{ backgroundColor: color }} />
                ))}
              </div>
            </div>

            {/* Plan selection */}
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Choisissez votre plan</h1>
              <p className="text-gray-500 text-sm mb-4">Commencez gratuitement, évoluez à votre rythme.</p>

              <div className="space-y-2">
                {PLANS.map((plan) => (
                  <button key={plan.id} onClick={() => setSelectedPlan(plan.id)}
                    className={`w-full border-2 rounded-xl p-4 text-left transition-all relative ${
                      selectedPlan === plan.id ? `${plan.color} shadow-md` : 'border-gray-100 hover:border-gray-300'
                    }`}>
                    {plan.popular && (
                      <span className="absolute top-3 right-4 text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full font-semibold">Populaire</span>
                    )}
                    {selectedPlan === plan.id && !plan.popular && (
                      <div className="absolute top-3.5 right-4 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${plan.badge}`}>{plan.name}</span>
                      <span className="font-bold text-gray-900">{plan.price}</span>
                      <span className="text-xs text-gray-400">{plan.period}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                      {plan.features.map((f) => (
                        <span key={f} className="text-xs text-gray-600">✓ {f}</span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 text-center mt-3">Aucune carte bancaire requise. Upgrade possible à tout moment.</p>
            </div>

            {/* Info auto-publish */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex gap-2">
              <span className="text-blue-500 shrink-0">ℹ️</span>
              <p className="text-xs text-blue-700">
                Votre boutique sera <strong>mise en ligne automatiquement</strong> dès que vous ajouterez votre premier produit.
              </p>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep(1)} className="flex-1 border border-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-50">
                ← Retour
              </button>
              <button onClick={handleFinish} disabled={saving}
                className="flex-1 bg-gradient-to-r from-orange-600 to-orange-500 text-white py-3 rounded-xl font-bold hover:from-orange-700 hover:to-orange-600 disabled:opacity-50 transition-all shadow-md shadow-orange-500/20">
                {saving ? 'Lancement...' : '🚀 Lancer ma boutique'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start">
      <span className="text-xs text-gray-400 uppercase tracking-wider w-24 shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right">{value}</span>
    </div>
  );
}

function ThemeCard({
  theme, selected, locked, onSelect,
}: {
  theme: { id: string; name: string; description: string; category: string; hero: string; preview: readonly string[] };
  selected: boolean;
  locked: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      disabled={locked}
      className={`relative border-2 rounded-xl p-2.5 text-left transition-all ${
        locked ? 'border-gray-100 opacity-50 cursor-not-allowed'
        : selected ? 'border-orange-500 shadow-md'
        : 'border-gray-100 hover:border-gray-300'
      }`}
    >
      {selected && !locked && (
        <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
          <span className="text-white text-[9px] font-bold">✓</span>
        </div>
      )}
      {locked && <div className="absolute top-1.5 right-1.5 text-xs">🔒</div>}
      <div className="flex gap-0.5 mb-1.5">
        {theme.preview.map((color, i) => (
          <div key={i} className="w-5 h-5 rounded-md" style={{ backgroundColor: color }} />
        ))}
      </div>
      <div className={`bg-gradient-to-r ${theme.hero} rounded-md h-7 mb-1.5 flex items-center justify-center`}>
        <div className="bg-white/20 rounded px-1 py-0.5 text-white text-[7px] font-bold">BOUTIQUE</div>
      </div>
      <p className="font-semibold text-gray-900 text-[10px] leading-tight">{theme.name}</p>
      <p className="text-[9px] text-gray-400 mt-0.5 leading-tight line-clamp-1">{theme.description}</p>
    </button>
  );
}
