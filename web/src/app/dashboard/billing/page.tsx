'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import PageHeader from '@/components/dashboard/PageHeader';
import LoadingSkeleton from '@/components/dashboard/LoadingSkeleton';

interface UsageBar {
  used: number;
  limit: number;
  unlimited: boolean;
}

interface Plan {
  key: string;
  label: string;
  priceMonthly: number;
  maxProducts: number;
  maxOrdersPerMonth: number;
  isCurrent: boolean;
}

interface UsageData {
  plan: string;
  planLabel: string;
  priceMonthly: number;
  usage: {
    products: UsageBar;
    ordersThisMonth: UsageBar;
  };
  availablePlans: Plan[];
}

interface WalletData {
  balance: number;
  totalCommission: number;
  minimumBalance: number;
}

function ProgressBar({ used, limit, unlimited, label }: UsageBar & { label: string }) {
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const danger = !unlimited && pct >= 90;
  const warning = !unlimited && pct >= 70 && pct < 90;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-gray-700 font-medium">{label}</span>
        <span className={`font-mono text-sm ${danger ? 'text-red-600' : 'text-gray-500'}`}>
          {used} / {unlimited ? '∞' : limit}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        {unlimited ? (
          <div className="bg-indigo-500 h-2 rounded-full w-full opacity-20" />
        ) : (
          <div
            className={`h-2 rounded-full transition-all ${
              danger ? 'bg-red-500' : warning ? 'bg-amber-500' : 'bg-indigo-500'
            }`}
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
      {danger && (
        <p className="text-xs text-red-500 mt-1">Limite presque atteinte — passez au plan supérieur</p>
      )}
    </div>
  );
}

// Commission rate per plan
const COMMISSION: Record<string, { rate: string; color: string }> = {
  FREE:    { rate: '3%',   color: 'text-orange-600 bg-orange-50 border-orange-200' },
  STARTER: { rate: '1.5%', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  PRO:     { rate: '0.5%', color: 'text-green-600 bg-green-50 border-green-200' },
};

const PLAN_FEATURES: Record<string, string[]> = {
  FREE:    ['30 produits', 'Commandes illimitées', 'Commission 3% sur livraison', 'Support communauté'],
  STARTER: ['200 produits', 'Commandes illimitées', 'Commission 1.5% sur livraison', 'Support email'],
  PRO:     ['Produits illimités', 'Commandes illimitées', 'Commission 0.5% sur livraison', 'Support prioritaire'],
};

export default function BillingPage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/tenants/me/usage'),
      api.get('/wallet'),
    ]).then(([usageRes, walletRes]) => {
      setData(usageRes.data);
      setWallet(walletRes.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl">
        <PageHeader title="Abonnement & Tarification" subtitle="Votre plan, commissions et utilisation" />
        <LoadingSkeleton type="cards" rows={3} />
      </div>
    );
  }

  if (!data) return null;

  const commission = COMMISSION[data.plan] ?? COMMISSION.FREE;
  const walletLow = wallet && wallet.balance < wallet.minimumBalance;

  return (
    <div className="max-w-4xl">
      <PageHeader title="Abonnement & Tarification" subtitle="Votre plan, commissions et utilisation" />

      {/* Alerte solde bas */}
      {walletLow && (
        <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="font-semibold text-red-700 text-sm">Solde wallet insuffisant</p>
            <p className="text-red-600 text-sm mt-0.5">
              Votre solde ({wallet!.balance.toFixed(3)} TND) est sous le minimum requis ({wallet!.minimumBalance} TND).
              Les nouvelles commandes sont bloquées.
            </p>
            <a
              href="mailto:contact@shopforge.tech?subject=Recharge wallet ShopForge"
              className="inline-block mt-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              Contacter pour recharger
            </a>
          </div>
        </div>
      )}

      {/* Plan actuel + Wallet */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Plan actuel</p>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-gray-900">{data.planLabel}</h2>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
                {data.priceMonthly === 0 ? 'Gratuit' : `${data.priceMonthly} TND/mois`}
              </span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${commission.color}`}>
                Commission {commission.rate} / livraison
              </span>
            </div>
          </div>

          {wallet && (
            <div className={`rounded-xl border p-3.5 text-right min-w-[140px] ${walletLow ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
              <p className="text-xs text-gray-500 mb-0.5">Solde wallet</p>
              <p className={`text-xl font-bold ${walletLow ? 'text-red-600' : 'text-gray-900'}`}>
                {wallet.balance.toFixed(3)} TND
              </p>
              <a href="/dashboard/wallet" className="text-xs text-blue-600 hover:underline">
                Voir détails →
              </a>
            </div>
          )}
        </div>

        {/* Usage */}
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <ProgressBar {...data.usage.products} label="Produits" />
          <ProgressBar {...data.usage.ordersThisMonth} label="Commandes ce mois" />
        </div>
      </div>

      {/* Explication du modèle de commission */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 mb-6">
        <h3 className="font-bold text-blue-900 mb-3">Comment fonctionne la tarification ?</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-lg p-3 border border-blue-100 text-center">
            <p className="text-2xl font-bold text-gray-900">0 TND</p>
            <p className="text-xs text-gray-600 mt-0.5">Abonnement mensuel</p>
            <p className="text-xs text-green-600 font-medium mt-1">Gratuit pour toujours</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-blue-100 text-center">
            <p className="text-2xl font-bold text-orange-600">{commission.rate}</p>
            <p className="text-xs text-gray-600 mt-0.5">Commission par livraison</p>
            <p className="text-xs text-gray-500 mt-1">Déduite automatiquement</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-blue-100 text-center">
            <p className="text-2xl font-bold text-gray-900">COD</p>
            <p className="text-xs text-gray-600 mt-0.5">Paiement à la livraison</p>
            <p className="text-xs text-blue-600 font-medium mt-1">Adapté à la Tunisie</p>
          </div>
        </div>
        <ul className="text-sm text-blue-800 space-y-1.5">
          <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">•</span>Vous ne payez <strong>rien</strong> tant que vous n'avez pas livré de commandes</li>
          <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">•</span>La commission est prélevée sur le <strong>montant total</strong> de la commande au statut <strong>Livré</strong></li>
          <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">•</span>En cas de retour, la commission est <strong>remboursée</strong> automatiquement</li>
          <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">•</span>Rechargez votre wallet par <strong>virement bancaire</strong> pour maintenir un solde positif</li>
        </ul>
      </div>

      {/* Plans disponibles */}
      <h2 className="text-base font-semibold text-gray-900 mb-3">Comparer les plans</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {data.availablePlans.map((plan) => {
          const pc = COMMISSION[plan.key] ?? COMMISSION.FREE;
          return (
            <div
              key={plan.key}
              className={`bg-white rounded-xl border p-5 relative ${
                plan.isCurrent
                  ? 'border-blue-500 ring-2 ring-blue-100'
                  : 'border-gray-200'
              }`}
            >
              {plan.isCurrent && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs font-medium bg-blue-500 text-white px-3 py-0.5 rounded-full whitespace-nowrap">
                  Plan actuel
                </span>
              )}

              <p className="font-bold text-gray-900 mb-1">{plan.label}</p>

              {/* Prix abonnement */}
              <p className="text-2xl font-bold text-gray-900 mb-1">
                {plan.priceMonthly === 0 ? (
                  <span>Gratuit</span>
                ) : (
                  <>{plan.priceMonthly} <span className="text-sm font-normal text-gray-500">TND/mois</span></>
                )}
              </p>

              {/* Commission badge */}
              <div className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border mb-4 ${pc.color}`}>
                <span>Commission {pc.rate}</span>
                <span className="font-normal text-gray-500">/ livraison COD</span>
              </div>

              <ul className="space-y-2 mb-5">
                {(PLAN_FEATURES[plan.key] ?? []).map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-green-500 flex-shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              {plan.isCurrent ? (
                <div className="w-full text-center text-sm text-gray-400 py-2">
                  Plan actuel
                </div>
              ) : (
                <a
                  href={`mailto:contact@shopforge.tech?subject=Changement plan ShopForge — ${plan.label}`}
                  className="block w-full text-center text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 transition-colors"
                >
                  {plan.priceMonthly > data.priceMonthly ? 'Passer à ce plan' : 'Choisir ce plan'}
                </a>
              )}
            </div>
          );
        })}
      </div>

      {/* Exemple de calcul */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-5">
        <h3 className="font-semibold text-gray-800 mb-3 text-sm">Exemple concret — Plan {data.planLabel}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          {[
            { orders: 10,  avg: 80 },
            { orders: 50,  avg: 80 },
            { orders: 200, avg: 80 },
          ].map(({ orders, avg }) => {
            const rate = parseFloat(commission.rate) / 100;
            const revenue = orders * avg;
            const comm = revenue * rate;
            return (
              <div key={orders} className="bg-white rounded-lg border border-gray-200 p-3">
                <p className="text-gray-500 text-xs mb-2">{orders} livraisons · {avg} TND moy.</p>
                <p className="font-medium text-gray-700">Revenu : <span className="text-gray-900 font-bold">{revenue.toFixed(0)} TND</span></p>
                <p className="text-orange-600">Commission : <span className="font-bold">{comm.toFixed(1)} TND</span></p>
                <p className="text-green-700 font-semibold mt-1">Net : {(revenue - comm).toFixed(1)} TND</p>
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-5 text-xs text-gray-400 text-center">
        Pour changer de plan, contactez-nous à{' '}
        <a href="mailto:contact@shopforge.tech" className="text-blue-500 hover:underline">
          contact@shopforge.tech
        </a>
      </p>
    </div>
  );
}
