'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { LogoIcon } from '@/components/Logo';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuth();
  const [form, setForm] = useState({ email: '', password: '', storeSlug: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      setAuth(data.user, data.store, {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });
      router.push(data.store.onboardingCompleted === false ? '/onboarding' : '/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Identifiants invalides');
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

      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Connexion</h1>
          <p className="text-sm text-gray-500 mt-1">Accédez à votre dashboard marchand</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-5 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Slug de votre boutique
            </label>
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-orange-400 focus-within:border-transparent">
              <input
                type="text"
                value={form.storeSlug}
                onChange={(e) => setForm({ ...form, storeSlug: e.target.value.toLowerCase() })}
                className="flex-1 px-3.5 py-2.5 focus:outline-none text-sm"
                placeholder="mon-store"
                required
              />
              <span className="bg-gray-50 px-3 py-2.5 text-gray-400 text-sm border-l border-gray-200">
                .shopforge.tech
              </span>
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
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold text-sm disabled:opacity-50 transition-colors shadow-md shadow-orange-500/20 mt-2"
          >
            {loading ? 'Connexion...' : 'Se connecter →'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-500">
          Pas encore de boutique ?{' '}
          <a href="/register" className="text-orange-500 hover:text-orange-600 font-semibold">
            Créer ma boutique
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
