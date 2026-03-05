'use client';
import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/admin-api';
import { PageHeader, Badge } from '@/components/admin/AdminUI';
import { useToast } from '@/components/admin/Toast';

interface CreditCodeUsage {
  id: string;
  tenantId: string;
  amount: string;
  usedAt: string;
  tenant: { name: string; slug: string };
}

interface CreditCode {
  id: string;
  code: string;
  amount: string;
  note: string | null;
  isActive: boolean;
  maxUses: number;
  usedCount: number;
  expiresAt: string | null;
  createdAt: string;
  usages: CreditCodeUsage[];
}

function isExpired(c: CreditCode) {
  return c.expiresAt && new Date(c.expiresAt) < new Date();
}

function isExhausted(c: CreditCode) {
  return c.maxUses > 0 && c.usedCount >= c.maxUses;
}

const STATUS_COLORS = {
  red: 'bg-red-50 text-red-600',
  amber: 'bg-amber-50 text-amber-600',
  gray: 'bg-gray-100 text-gray-600',
  green: 'bg-emerald-50 text-emerald-600',
};

function codeStatus(c: CreditCode): { label: string; color: string } {
  if (!c.isActive) return { label: 'Désactivé', color: STATUS_COLORS.red };
  if (isExpired(c)) return { label: 'Expiré', color: STATUS_COLORS.amber };
  if (isExhausted(c)) return { label: 'Épuisé', color: STATUS_COLORS.gray };
  return { label: 'Disponible', color: STATUS_COLORS.green };
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function AdminCreditCodesPage() {
  const { toast } = useToast();
  const [codes, setCodes] = useState<CreditCode[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [form, setForm] = useState({ amount: '', code: '', note: '', maxUses: '1', expiresAt: '' });
  const [formError, setFormError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.get('/credit-codes?limit=50');
      setCodes(data.data);
      setTotal(data.total);
    } catch { toast('error', 'Erreur chargement'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) { setFormError('Montant invalide'); return; }
    const maxUses = parseInt(form.maxUses) || 0;
    if (maxUses < 0) { setFormError('Nombre d\'utilisations invalide'); return; }
    setCreating(true);
    try {
      await adminApi.post('/credit-codes', {
        amount,
        maxUses,
        ...(form.note ? { note: form.note } : {}),
        ...(form.code ? { code: form.code.toUpperCase() } : {}),
        ...(form.expiresAt ? { expiresAt: new Date(form.expiresAt).toISOString() } : {}),
      });
      toast('success', 'Code créé avec succès');
      setForm({ amount: '', code: '', note: '', maxUses: '1', expiresAt: '' });
      load();
    } catch (e: any) {
      setFormError(e?.response?.data?.message ?? 'Erreur');
    } finally {
      setCreating(false);
    }
  };

  const handleDeactivate = async (id: string, code: string) => {
    if (!confirm(`Désactiver le code "${code}" ?`)) return;
    try {
      await adminApi.delete(`/credit-codes/${id}`);
      toast('success', 'Code désactivé');
      load();
    } catch { toast('error', 'Erreur'); }
  };

  return (
    <div className="p-6 max-w-5xl">
      <PageHeader
        title="Codes Promo Wallet"
        subtitle={`${total} codes — offrez du crédit à vos marchands`}
      />

      {/* Formulaire création */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">Créer un code</h3>
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Montant (TND) *</label>
              <input
                type="number" min="0.1" step="0.1"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="ex: 20"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Code personnalisé</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="Auto-généré si vide"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
                maxLength={20}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Note interne</label>
              <input
                type="text"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="ex: Campagne Mars 2026"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Utilisations max <span className="text-gray-400 font-normal">(0 = illimité)</span>
              </label>
              <input
                type="number" min="0" step="1"
                value={form.maxUses}
                onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Date d'expiration <span className="text-gray-400 font-normal">(optionnel)</span>
              </label>
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {creating ? '...' : '+ Créer'}
            </button>
          </div>
        </form>
        {formError && <p className="text-sm text-red-600 mt-2">{formError}</p>}
      </div>

      {/* Liste codes */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Code</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Montant</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Utilisations</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Expiration</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Statut</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Note</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Créé le</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={8} className="py-12 text-center text-gray-400 text-sm">Chargement…</td></tr>
            ) : codes.length === 0 ? (
              <tr><td colSpan={8} className="py-12 text-center text-gray-400 text-sm">Aucun code créé</td></tr>
            ) : codes.map((c) => {
              const status = codeStatus(c);
              const hasUsages = c.usages.length > 0;
              return (
                <tr key={c.id} className="hover:bg-gray-50 group">
                  <td className="px-4 py-3 font-mono font-semibold text-gray-900 tracking-wider">{c.code}</td>
                  <td className="px-4 py-3 text-right font-semibold text-green-600">+{Number(c.amount).toFixed(3)} TND</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => hasUsages ? setExpandedId(expandedId === c.id ? null : c.id) : null}
                      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        hasUsages
                          ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 cursor-pointer'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {c.usedCount}/{c.maxUses === 0 ? '∞' : c.maxUses}
                      {hasUsages && (
                        <svg className={`w-3 h-3 transition-transform ${expandedId === c.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-gray-500 hidden md:table-cell">
                    {c.expiresAt ? (
                      <span className={isExpired(c) ? 'text-red-500 font-medium' : ''}>
                        {formatDate(c.expiresAt)}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge label={status.label} color={status.color} />
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell">{c.note ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 hidden lg:table-cell">
                    {formatDate(c.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {c.isActive && !isExpired(c) && !isExhausted(c) && (
                      <button
                        onClick={() => handleDeactivate(c.id, c.code)}
                        className="text-xs text-red-500 hover:text-red-700 font-medium"
                      >
                        Désactiver
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Panneau détail usages (expandable) */}
        {expandedId && (() => {
          const c = codes.find(x => x.id === expandedId);
          if (!c || c.usages.length === 0) return null;
          return (
            <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
              <p className="text-xs font-semibold text-gray-600 mb-2">
                Utilisations du code <span className="font-mono text-gray-900">{c.code}</span>
              </p>
              <div className="space-y-1.5">
                {c.usages.map((u) => (
                  <div key={u.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                      <span className="font-medium text-gray-700">{u.tenant.name}</span>
                      <span className="text-gray-400">({u.tenant.slug})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-green-600 font-medium">+{Number(u.amount).toFixed(3)} TND</span>
                      <span className="text-gray-400">{formatDateTime(u.usedAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
