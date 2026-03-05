'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { LogoIcon } from '@/components/Logo';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const passwordStrong = password.length >= 8
    && /[A-Z]/.test(password)
    && /[0-9]/.test(password)
    && /[!@#$%^&*]/.test(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas'); return; }
    if (!passwordStrong) { setError('Le mot de passe ne respecte pas les criteres de securite'); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Lien invalide ou expire');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Lien invalide</h1>
          <p className="text-sm text-gray-500 mb-4">Ce lien de reinitialisation est invalide ou a expire.</p>
          <a href="/forgot-password" className="text-orange-500 hover:text-orange-600 font-semibold text-sm">
            Demander un nouveau lien
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 py-12">
      <a href="/" className="flex items-center gap-2.5 mb-8">
        <LogoIcon size={40} />
        <span className="font-bold text-xl text-white tracking-tight">ShopForge</span>
      </a>

      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        {success ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Mot de passe reinitialise</h2>
            <p className="text-sm text-gray-500 mb-6">
              Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
            </p>
            <a href="/login"
              className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-bold text-sm transition-colors">
              Se connecter
            </a>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Nouveau mot de passe</h1>
              <p className="text-sm text-gray-500 mt-1">Choisissez un nouveau mot de passe securise.</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-5 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nouveau mot de passe</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmer</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  required
                />
              </div>

              {/* Strength hints */}
              {password && (
                <div className="bg-gray-50 rounded-xl p-3 space-y-1 text-xs">
                  <Hint ok={password.length >= 8} label="8 caracteres minimum" />
                  <Hint ok={/[A-Z]/.test(password)} label="Une majuscule" />
                  <Hint ok={/[0-9]/.test(password)} label="Un chiffre" />
                  <Hint ok={/[!@#$%^&*]/.test(password)} label="Un caractere special (!@#$%^&*)" />
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !passwordStrong}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold text-sm disabled:opacity-50 transition-colors shadow-md shadow-orange-500/20 mt-2"
              >
                {loading ? 'Reinitialisation...' : 'Reinitialiser le mot de passe'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function Hint({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 ${ok ? 'text-green-600' : 'text-gray-400'}`}>
      <span>{ok ? '\u2713' : '\u25CB'}</span>
      <span>{label}</span>
    </div>
  );
}
