'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { LogoIcon } from '@/components/Logo';

function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null;
  const criteria = [
    { label: '8 caractères minimum', met: password.length >= 8 },
    { label: 'Une majuscule', met: /[A-Z]/.test(password) },
    { label: 'Une minuscule', met: /[a-z]/.test(password) },
    { label: 'Un chiffre', met: /[0-9]/.test(password) },
    { label: 'Un caractère spécial', met: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = criteria.filter((c) => c.met).length;
  const levels = [
    { label: '', color: 'bg-gray-200', text: 'text-gray-400' },
    { label: 'Faible', color: 'bg-red-500', text: 'text-red-500' },
    { label: 'Faible', color: 'bg-red-500', text: 'text-red-500' },
    { label: 'Moyen', color: 'bg-orange-400', text: 'text-orange-500' },
    { label: 'Bon', color: 'bg-yellow-400', text: 'text-yellow-600' },
    { label: 'Fort', color: 'bg-green-500', text: 'text-green-600' },
  ];
  const level = levels[score];
  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= Math.ceil(score * 0.8) ? level.color : 'bg-gray-200'}`} />
        ))}
      </div>
      {score > 0 && <p className={`text-xs font-medium ${level.text}`}>{level.label}</p>}
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        {criteria.map((c) => (
          <span key={c.label} className={`text-xs ${c.met ? 'text-green-600' : 'text-gray-400'}`}>
            {c.met ? '✓' : '✕'} {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuth();
  const [form, setForm] = useState({
    storeName: '',
    storeSlug: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [referralCode, setReferralCode] = useState('');

  // Capture UTM params + referral code from URL
  const [utm, setUtm] = useState<{ utmSource?: string; utmMedium?: string; utmCampaign?: string }>({});
  useEffect(() => {
    const s = searchParams.get('utm_source');
    const m = searchParams.get('utm_medium');
    const c = searchParams.get('utm_campaign');
    const ref = searchParams.get('ref');
    if (ref) setReferralCode(ref.toUpperCase());
    if (s || m || c) setUtm({
      utmSource: s || undefined,
      utmMedium: m || undefined,
      utmCampaign: c || undefined,
    });
  }, [searchParams]);

  const handleStoreNameChange = (value: string) => {
    const slug = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 30);
    setForm({ ...form, storeName: value, storeSlug: slug });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', {
        ...form,
        ...utm,
        ...(referralCode ? { referralCode: referralCode.toUpperCase() } : {}),
      });
      setAuth(data.user, data.store, {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });
      router.push('/onboarding');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <a href="/" className="flex items-center gap-2.5 mb-8">
        <LogoIcon size={40} />
        <span className="font-bold text-xl text-white tracking-tight">ShopForge</span>
      </a>

      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Créer ma boutique</h1>
          <p className="text-sm text-gray-500 mt-1">Gratuit. Aucune carte bancaire requise.</p>
          {referralCode && searchParams.get('ref') && (
            <div className="mt-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm text-orange-700">
              <span>🎁</span>
              <span>Vous avez été parrainé — code <strong>{referralCode}</strong> appliqué.</span>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-5 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nom de votre boutique
            </label>
            <input
              type="text"
              value={form.storeName}
              onChange={(e) => handleStoreNameChange(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
              placeholder="Mon Super Store"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Adresse de votre boutique
              <span className="ml-1.5 text-xs font-normal text-gray-400">— L'URL unique de votre boutique en ligne</span>
            </label>
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-orange-400 focus-within:border-transparent">
              <input
                type="text"
                value={form.storeSlug}
                onChange={(e) => setForm({ ...form, storeSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                className="flex-1 px-3.5 py-2.5 text-sm focus:outline-none"
                placeholder="mon-store"
                required
              />
              <span className="bg-gray-50 px-3 py-2.5 text-gray-400 text-sm border-l border-gray-200 shrink-0">
                .shopforge.tech
              </span>
            </div>
            {form.storeSlug && (
              <p className="mt-1.5 text-xs text-gray-400 flex items-center gap-1">
                <span>Votre boutique sera accessible sur</span>
                <span className="font-mono font-semibold text-orange-500">{form.storeSlug}.shopforge.tech</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Prénom</label>
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom</label>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mot de passe</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
              minLength={8}
              required
            />
            <PasswordStrengthMeter password={form.password} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Code de parrainage
              <span className="ml-1.5 text-xs font-normal text-gray-400">— optionnel</span>
            </label>
            <input
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
              placeholder="Ex: A1B2C3"
              maxLength={20}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold text-sm disabled:opacity-50 transition-colors shadow-md shadow-orange-500/20 mt-2"
          >
            {loading ? 'Création en cours...' : '🚀 Créer ma boutique gratuitement'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-500">
          Déjà une boutique ?{' '}
          <a href="/login" className="text-orange-500 hover:text-orange-600 font-semibold">
            Se connecter
          </a>
        </p>
      </div>

      <p className="mt-6 text-xs text-gray-600">
        Conçu par{' '}
        <a href="https://forge3d.tech" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300">
          Forge3D
        </a>
      </p>
    </div>
  );
}
