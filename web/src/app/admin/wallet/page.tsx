'use client';
import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/admin-api';
import { PageHeader, SearchInput, Badge, Spinner } from '@/components/admin/AdminUI';
import { useToast } from '@/components/admin/Toast';
import { PLAN_BADGE_COLORS } from '@/components/admin/AdminConstants';

interface WalletEntry {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  plan: string;
  balance: number;
  totalTopup: number;
  totalCommission: number;
  minimumBalance: number;
  isLow: boolean;
}

interface WalletResponse {
  data: WalletEntry[];
  total: number;
  page: number;
  totalPages: number;
  platformTotalCommissions: number;
}

export default function AdminWalletPage() {
  const [data, setData] = useState<WalletResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [topupTarget, setTopupTarget] = useState<WalletEntry | null>(null);
  const [topupAmount, setTopupAmount] = useState('');
  const [topupNote, setTopupNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => { fetchWallets(); }, []);

  async function fetchWallets() {
    try {
      const { data: res } = await adminApi.get('/wallet?limit=50');
      setData(res);
    } finally {
      setLoading(false);
    }
  }

  async function handleTopup() {
    if (!topupTarget || !topupAmount) return;
    const amount = parseFloat(topupAmount);
    if (isNaN(amount) || amount <= 0) {
      toast('error', 'Montant invalide');
      return;
    }
    setSubmitting(true);
    try {
      await adminApi.post(`/wallet/topup/${topupTarget.tenantId}`, { amount, note: topupNote || undefined });
      toast('success', `Wallet rechargé : +${amount} TND → ${topupTarget.tenantName}`);
      setTopupTarget(null);
      setTopupAmount('');
      setTopupNote('');
      fetchWallets();
    } catch (e: any) {
      toast('error', e?.response?.data?.message ?? 'Erreur lors du rechargement');
    } finally {
      setSubmitting(false);
    }
  }

  const filtered = (data?.data ?? []).filter(
    (w) =>
      w.tenantName.toLowerCase().includes(search.toLowerCase()) ||
      w.tenantSlug.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <PageHeader
        title="Wallets marchands"
        subtitle="Gérez les soldes et rechargements"
        action={
          data && (
            <div className="text-right">
              <p className="text-xs text-gray-500">Commissions totales collectées</p>
              <p className="text-xl font-bold text-green-600">
                {data.platformTotalCommissions.toFixed(3)} TND
              </p>
            </div>
          )
        }
      />

      {/* Alerte wallets bas */}
      {data && data.data.filter((w) => w.isLow).length > 0 && (
        <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm font-semibold text-red-700">
            ⚠️ {data.data.filter((w) => w.isLow).length} boutique(s) avec solde insuffisant
          </p>
          <p className="text-xs text-red-600 mt-0.5">
            Ces marchands ne peuvent plus recevoir de commandes. Rechargez leur wallet.
          </p>
        </div>
      )}

      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Chercher par nom ou slug..." />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-500">Boutique</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Plan</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Solde</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 hidden sm:table-cell">Total rechargé</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 hidden md:table-cell">Commissions</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((w) => (
                <tr key={w.tenantId} className={`hover:bg-gray-50 transition-colors ${w.isLow ? 'bg-red-50' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{w.tenantName}</p>
                    <p className="text-xs text-gray-400">{w.tenantSlug}.shopforge.tech</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={PLAN_BADGE_COLORS[w.plan as keyof typeof PLAN_BADGE_COLORS] ?? 'gray'} label={w.plan} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${w.isLow ? 'text-red-600' : 'text-gray-900'}`}>
                      {w.balance.toFixed(3)} TND
                    </span>
                    {w.isLow && (
                      <p className="text-xs text-red-500">⚠ Solde bas</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 hidden sm:table-cell">
                    {w.totalTopup.toFixed(3)} TND
                  </td>
                  <td className="px-4 py-3 text-right text-orange-600 font-medium hidden md:table-cell">
                    {w.totalCommission.toFixed(3)} TND
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => { setTopupTarget(w); setTopupAmount(''); setTopupNote(''); }}
                      className="text-xs font-medium px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      Recharger
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    Aucun wallet trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Topup */}
      {topupTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-bold text-gray-900 mb-1">Recharger le wallet</h3>
            <p className="text-sm text-gray-500 mb-4">
              Boutique : <strong>{topupTarget.tenantName}</strong> · Solde actuel : {topupTarget.balance.toFixed(3)} TND
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Montant (TND)</label>
                <input
                  type="number"
                  min="1"
                  step="0.001"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  placeholder="Ex: 50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Note (optionnel)</label>
                <input
                  type="text"
                  value={topupNote}
                  onChange={(e) => setTopupNote(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  placeholder="Ex: Virement bancaire mars 2026"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setTopupTarget(null)}
                className="flex-1 text-sm py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleTopup}
                disabled={submitting || !topupAmount}
                className="flex-1 text-sm py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? <Spinner /> : null}
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
