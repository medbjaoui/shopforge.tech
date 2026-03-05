'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import PageHeader from '@/components/dashboard/PageHeader';
import LoadingSkeleton from '@/components/dashboard/LoadingSkeleton';

const COMMISSION_RATES: Record<string, number> = { FREE: 3, STARTER: 1.5, PRO: 0.5 };

interface Transaction {
  id: string;
  type: 'TOPUP' | 'COMMISSION' | 'REFUND' | 'ADJUSTMENT' | 'WELCOME' | 'REDEEM';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  reference: string | null;
  createdAt: string;
}

interface WalletData {
  balance: number;
  totalTopup: number;
  totalCommission: number;
  minimumBalance: number;
  transactions: Transaction[];
}

const TX_TYPE_CONFIG: Record<string, { label: string; color: string; positive: boolean }> = {
  TOPUP:      { label: 'Rechargement', color: 'text-green-600 bg-green-50',   positive: true  },
  COMMISSION: { label: 'Commission',   color: 'text-red-600 bg-red-50',       positive: false },
  REFUND:     { label: 'Remboursement',color: 'text-blue-600 bg-blue-50',     positive: true  },
  ADJUSTMENT: { label: 'Ajustement',   color: 'text-gray-600 bg-gray-100',    positive: true  },
  WELCOME:    { label: '🎁 Bienvenu',  color: 'text-purple-600 bg-purple-50', positive: true  },
  REDEEM:     { label: '🎟 Code promo', color: 'text-indigo-600 bg-indigo-50', positive: true  },
};

export default function WalletPage() {
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<string>('FREE');
  const [simAmount, setSimAmount] = useState('');

  const [redeemCode, setRedeemCode] = useState('');
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemMsg, setRedeemMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const reload = () => {
    Promise.all([api.get('/wallet'), api.get('/tenants/me')]).then(([w, t]) => {
      setData(w.data);
      setPlan(t.data?.plan ?? 'FREE');
    }).catch(() => {});
  };

  useEffect(() => {
    Promise.all([
      api.get('/wallet'),
      api.get('/tenants/me'),
    ]).then(([walletRes, tenantRes]) => {
      setData(walletRes.data);
      setPlan(tenantRes.data?.plan ?? 'FREE');
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!redeemCode.trim()) return;
    setRedeemLoading(true);
    setRedeemMsg(null);
    try {
      const { data: res } = await api.post('/wallet/redeem', { code: redeemCode.trim().toUpperCase() });
      setRedeemMsg({ ok: true, text: `✅ ${Number(res.amount).toFixed(3)} TND crédités ! Nouveau solde : ${Number(res.newBalance).toFixed(3)} TND` });
      setRedeemCode('');
      reload();
    } catch (e: any) {
      setRedeemMsg({ ok: false, text: e?.response?.data?.message ?? 'Code invalide' });
    } finally {
      setRedeemLoading(false);
    }
  };

  const rate = COMMISSION_RATES[plan] ?? 3;
  const simAmountNum = parseFloat(simAmount) || 0;
  const simCommission = (simAmountNum * rate) / 100;
  const simNet = simAmountNum - simCommission;

  if (loading) {
    return (
      <div className="max-w-3xl">
        <PageHeader title="Mon Wallet" subtitle="Suivi de votre solde et commissions" />
        <LoadingSkeleton type="cards" rows={3} />
      </div>
    );
  }

  if (!data) return null;

  const isLow = Number(data.balance) < Number(data.minimumBalance);

  return (
    <div className="max-w-3xl">
      <PageHeader title="Mon Wallet" subtitle="Suivi de votre solde et commissions platform" />

      {/* Alerte solde bas */}
      {isLow && (
        <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <span className="text-red-500 text-xl">⚠️</span>
          <div>
            <p className="font-semibold text-red-700 text-sm">Solde insuffisant</p>
            <p className="text-red-600 text-sm mt-0.5">
              Votre solde ({Number(data.balance).toFixed(3)} TND) est en dessous du minimum requis ({data.minimumBalance} TND).
              Les nouvelles commandes sont bloquées. Contactez-nous pour recharger votre wallet.
            </p>
            <a
              href="mailto:contact@shopforge.tech?subject=Recharge wallet ShopForge"
              className="inline-block mt-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 px-4 py-1.5 rounded-lg transition-colors"
            >
              Recharger maintenant
            </a>
          </div>
        </div>
      )}

      {/* Cartes KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className={`rounded-xl border p-5 ${isLow ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'} shadow-sm`}>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Solde actuel</p>
          <p className={`text-2xl font-bold ${isLow ? 'text-red-600' : 'text-gray-900'}`}>
            {Number(data.balance).toFixed(3)}
            <span className="text-sm font-normal text-gray-500 ml-1">TND</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">Minimum requis : {data.minimumBalance} TND</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Total rechargé</p>
          <p className="text-2xl font-bold text-green-600">
            {Number(data.totalTopup).toFixed(3)}
            <span className="text-sm font-normal text-gray-500 ml-1">TND</span>
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Commissions payées</p>
          <p className="text-2xl font-bold text-orange-600">
            {Number(data.totalCommission).toFixed(3)}
            <span className="text-sm font-normal text-gray-500 ml-1">TND</span>
          </p>
        </div>
      </div>

      {/* Simulateur commission */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">🧮 Simulateur de commission</h3>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-[200px]">
            <input
              type="number" min="0" step="0.001"
              value={simAmount}
              onChange={e => setSimAmount(e.target.value)}
              placeholder="Montant commande"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm pr-12 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">TND</span>
          </div>
          <span className="text-gray-400 text-sm">→</span>
          {simAmountNum > 0 ? (
            <div className="flex gap-4 flex-wrap">
              <div className="text-center">
                <p className="text-xs text-gray-400">Commission ({rate}%)</p>
                <p className="font-semibold text-red-600 text-sm">-{simCommission.toFixed(3)} TND</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400">Vous recevez</p>
                <p className="font-bold text-green-600">{simNet.toFixed(3)} TND</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Saisissez un montant</p>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-2">Plan actuel : <span className="font-medium text-gray-600">{plan}</span> — taux {rate}% par commande livrée</p>
      </div>

      {/* Code promo */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">🎟 Utiliser un code promo</h3>
        <form onSubmit={handleRedeem} className="flex gap-2 items-start">
          <input
            value={redeemCode}
            onChange={(e) => { setRedeemCode(e.target.value.toUpperCase()); setRedeemMsg(null); }}
            placeholder="Entrez votre code"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-400"
            disabled={redeemLoading}
          />
          <button
            type="submit"
            disabled={redeemLoading || !redeemCode.trim()}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {redeemLoading ? '...' : 'Valider'}
          </button>
        </form>
        {redeemMsg && (
          <p className={`text-sm mt-2 ${redeemMsg.ok ? 'text-green-600' : 'text-red-600'}`}>
            {redeemMsg.text}
          </p>
        )}
      </div>

      {/* Explications du modèle */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">Comment fonctionne la commission ?</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Une commission est prélevée automatiquement sur chaque commande <strong>livrée</strong></li>
          <li>• Le taux dépend de votre plan (FREE 3% · STARTER 1.5% · PRO 0.5%)</li>
          <li>• Si votre solde passe sous {data.minimumBalance} TND, les nouvelles commandes sont suspendues</li>
          <li>• Rechargez par virement bancaire — contactez <strong>contact@shopforge.tech</strong></li>
        </ul>
      </div>

      {/* Historique transactions */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Dernières transactions</h3>
        </div>

        {data.transactions.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">
            Aucune transaction pour le moment
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {data.transactions.map((tx) => {
              const cfg = TX_TYPE_CONFIG[tx.type] ?? TX_TYPE_CONFIG.ADJUSTMENT;
              const isPositive = cfg.positive;
              return (
                <div key={tx.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color} whitespace-nowrap`}>
                      {cfg.label}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-gray-700 truncate">{tx.description}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(tx.createdAt).toLocaleDateString('fr-TN', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`font-semibold text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {isPositive ? '+' : '-'}{Number(tx.amount).toFixed(3)} TND
                    </p>
                    <p className="text-xs text-gray-400">
                      Solde : {Number(tx.balanceAfter).toFixed(3)} TND
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="px-5 py-3 border-t border-gray-100 text-center">
          <a href="mailto:contact@shopforge.tech?subject=Recharge wallet ShopForge" className="text-sm text-blue-600 hover:underline">
            Recharger mon wallet par virement →
          </a>
        </div>
      </div>
    </div>
  );
}
