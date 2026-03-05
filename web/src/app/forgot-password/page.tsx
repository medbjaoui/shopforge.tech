'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { LogoIcon } from '@/components/Logo';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [storeSlug, setStoreSlug] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email, storeSlug });
      setSent(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 py-12">
      <a href="/" className="flex items-center gap-2.5 mb-8">
        <LogoIcon size={40} />
        <span className="font-bold text-xl text-white tracking-tight">ShopForge</span>
      </a>

      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        {sent ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Email envoy&eacute;</h2>
            <p className="text-sm text-gray-500 mb-6">
              Si un compte existe avec cet email, vous recevrez un lien de r&eacute;initialisation valable 1 heure.
            </p>
            <a href="/login" className="text-orange-500 hover:text-orange-600 font-semibold text-sm">
              Retour &agrave; la connexion
            </a>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Mot de passe oubli&eacute;</h1>
              <p className="text-sm text-gray-500 mt-1">
                Entrez votre slug de boutique et email pour recevoir un lien de r&eacute;initialisation.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-5 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Slug de votre boutique</label>
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-orange-400">
                  <input
                    type="text"
                    value={storeSlug}
                    onChange={(e) => setStoreSlug(e.target.value.toLowerCase())}
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold text-sm disabled:opacity-50 transition-colors shadow-md shadow-orange-500/20 mt-2"
              >
                {loading ? 'Envoi...' : 'Envoyer le lien de r\u00e9initialisation'}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-gray-500">
              <a href="/login" className="text-orange-500 hover:text-orange-600 font-medium">
                Retour &agrave; la connexion
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
