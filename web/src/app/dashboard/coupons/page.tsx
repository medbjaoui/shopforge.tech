'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import PageHeader from '@/components/dashboard/PageHeader';
import LoadingSkeleton from '@/components/dashboard/LoadingSkeleton';

interface Coupon {
  id: string; code: string; type: 'PERCENT' | 'FIXED';
  value: number; minAmount: number | null; maxUses: number | null;
  usedCount: number; expiresAt: string | null; isActive: boolean;
  createdAt: string;
}

const empty = { code: '', type: 'PERCENT' as const, value: '', minAmount: '', maxUses: '', expiresAt: '', isActive: true };

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = () =>
    api.get('/coupons').then(({ data }) => setCoupons(data)).catch(console.error).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await api.post('/coupons', {
        code: form.code.toUpperCase(),
        type: form.type,
        value: parseFloat(form.value as any),
        ...(form.minAmount ? { minAmount: parseFloat(form.minAmount as any) } : {}),
        ...(form.maxUses ? { maxUses: parseInt(form.maxUses as any) } : {}),
        ...(form.expiresAt ? { expiresAt: form.expiresAt } : {}),
        isActive: form.isActive,
      });
      setShowForm(false);
      setForm(empty);
      load();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (c: Coupon) => {
    await api.patch(`/coupons/${c.id}`, { isActive: !c.isActive });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Supprimer ce coupon ?')) return;
    await api.delete(`/coupons/${id}`);
    load();
  };

  const isExpired = (c: Coupon) => c.expiresAt && new Date(c.expiresAt) < new Date();
  const isExhausted = (c: Coupon) => c.maxUses !== null && c.usedCount >= c.maxUses;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Codes promo"
        subtitle="Créez des réductions pour vos clients"
        actions={
          <button onClick={() => { setShowForm(true); setForm(empty); setFormError(''); }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            + Nouveau coupon
          </button>
        }
      />

      {/* Form */}
      {showForm && (
        <section className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Créer un coupon</h2>
          {formError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm mb-4">{formError}</div>}
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            <div>
              <label className={LBL}>Code</label>
              <input value={form.code} onChange={(e) => setForm(s => ({ ...s, code: e.target.value.toUpperCase() }))}
                className={INP} placeholder="PROMO20" required />
            </div>
            <div>
              <label className={LBL}>Type</label>
              <select value={form.type} onChange={(e) => setForm(s => ({ ...s, type: e.target.value as any }))} className={INP}>
                <option value="PERCENT">Pourcentage (%)</option>
                <option value="FIXED">Montant fixe (TND)</option>
              </select>
            </div>
            <div>
              <label className={LBL}>Valeur {form.type === 'PERCENT' ? '(%)' : '(TND)'}</label>
              <input type="number" min="0" step="0.01" value={form.value} onChange={(e) => setForm(s => ({ ...s, value: e.target.value }))}
                className={INP} required />
            </div>
            <div>
              <label className={LBL}>Montant minimum (TND)</label>
              <input type="number" min="0" step="0.5" value={form.minAmount} onChange={(e) => setForm(s => ({ ...s, minAmount: e.target.value }))}
                className={INP} placeholder="Optionnel" />
            </div>
            <div>
              <label className={LBL}>Utilisations max</label>
              <input type="number" min="1" value={form.maxUses} onChange={(e) => setForm(s => ({ ...s, maxUses: e.target.value }))}
                className={INP} placeholder="Illimité" />
            </div>
            <div>
              <label className={LBL}>Expire le</label>
              <input type="date" value={form.expiresAt} onChange={(e) => setForm(s => ({ ...s, expiresAt: e.target.value }))}
                className={INP} />
            </div>
            <div className="col-span-2 flex items-center gap-4 pt-2">
              <button type="submit" disabled={saving}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Création...' : 'Créer le coupon'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="text-sm text-gray-500 hover:text-gray-700">
                Annuler
              </button>
            </div>
          </form>
        </section>
      )}

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <LoadingSkeleton type="table" rows={5} />
        ) : coupons.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 mb-2">Aucun code promo créé.</p>
            <button onClick={() => setShowForm(true)} className="text-blue-600 text-sm hover:underline">
              Créer votre premier coupon →
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Code</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Réduction</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Utilisations</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Expiration</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {coupons.map((c) => {
                const expired = isExpired(c);
                const exhausted = isExhausted(c);
                const invalid = expired || exhausted || !c.isActive;
                return (
                  <tr key={c.id} className={`hover:bg-gray-50 ${invalid ? 'opacity-60' : ''}`}>
                    <td className="px-5 py-4">
                      <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                        {c.code}
                      </span>
                      {c.minAmount && (
                        <p className="text-xs text-gray-400 mt-0.5">Min. {Number(c.minAmount).toFixed(2)} TND</p>
                      )}
                    </td>
                    <td className="px-5 py-4 font-semibold text-gray-900">
                      {c.type === 'PERCENT' ? `${c.value}%` : `${Number(c.value).toFixed(2)} TND`}
                    </td>
                    <td className="px-5 py-4 text-center hidden md:table-cell text-gray-500">
                      {c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ''}
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell text-gray-500 text-xs">
                      {c.expiresAt
                        ? new Date(c.expiresAt).toLocaleDateString('fr-FR')
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-4 text-center">
                      {expired ? (
                        <span className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-full">Expiré</span>
                      ) : exhausted ? (
                        <span className="text-xs bg-orange-50 text-orange-600 px-2 py-1 rounded-full">Épuisé</span>
                      ) : c.isActive ? (
                        <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">Actif</span>
                      ) : (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">Désactivé</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => toggleActive(c)}
                          className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
                          {c.isActive ? 'Désactiver' : 'Activer'}
                        </button>
                        <button onClick={() => remove(c.id)} className="text-xs text-red-400 hover:text-red-600 transition-colors">
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const LBL = 'block text-xs font-medium text-gray-600 mb-1';
const INP = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
