'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/admin-api';
import { PageHeader, KpiCard, SectionCard, Spinner } from '@/components/admin/AdminUI';
import { WalletIcon, StoreIcon, ChartIcon } from '@/components/admin/AdminIcons';
import { PLAN_BADGE_COLORS, PLAN_BAR_COLORS, formatTnd, formatGrowth, growthColor } from '@/components/admin/AdminConstants';

interface PlanInfo { count: number; price: number; label: string }
interface TopTenant {
  id: string; name: string; slug: string; plan: string;
  revenueMonth: number; ordersMonth: number; planPrice: number;
}
interface MonthlyGmv { month: string; gmv: number; orders: number }

interface BillingStats {
  mrr: number;
  arr: number;
  totalActive: number;
  totalPaying: number;
  arpu: number;
  arppu: number;
  plans: Record<string, PlanInfo>;
  gmv: {
    thisMonth: number; lastMonth: number; growth: number;
    total: number; avgOrderValue: number;
  };
  orders: { thisMonth: number; lastMonth: number };
  tenants: { newThisMonth: number; newLastMonth: number; growth: number };
  monthlyGmv: MonthlyGmv[];
  topTenants: TopTenant[];
}

export default function AdminBillingPage() {
  const [data, setData] = useState<BillingStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.get('/billing').then(({ data }) => {
      setData(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (!data) return <p className="text-red-400">Erreur de chargement.</p>;

  const maxGmv = Math.max(...data.monthlyGmv.map((m) => m.gmv), 1);

  return (
    <div>
      <PageHeader title="Billing & MRR" subtitle="Suivi financier de la plateforme" />

      {/* KPI Cards Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="MRR" value={formatTnd(data.mrr)} sub="Revenu mensuel recurrent" icon={<WalletIcon size={18} />} highlight />
        <KpiCard label="ARR" value={formatTnd(data.arr)} sub="Revenu annuel projete" icon={<WalletIcon size={18} />} />
        <KpiCard
          label="GMV ce mois"
          value={formatTnd(data.gmv.thisMonth)}
          sub={<span className={growthColor(data.gmv.growth)}>{formatGrowth(data.gmv.growth)} vs mois dernier</span>}
          icon={<ChartIcon size={18} />}
        />
        <KpiCard
          label="Panier moyen"
          value={formatTnd(data.gmv.avgOrderValue)}
          sub={`${data.orders.thisMonth} commandes ce mois`}
          icon={<ChartIcon size={18} />}
        />
      </div>

      {/* KPI Cards Row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          label="Tenants actifs"
          value={String(data.totalActive)}
          sub={`dont ${data.totalPaying} payant${data.totalPaying > 1 ? 's' : ''}`}
          icon={<StoreIcon size={18} />}
        />
        <KpiCard label="ARPU" value={formatTnd(data.arpu)} sub="Revenu moyen / tenant" />
        <KpiCard label="ARPPU" value={formatTnd(data.arppu)} sub="Revenu moyen / payant" />
        <KpiCard
          label="Nouvelles boutiques"
          value={`+${data.tenants.newThisMonth}`}
          sub={<span className={growthColor(data.tenants.growth)}>{formatGrowth(data.tenants.growth)} vs mois dernier</span>}
          icon={<StoreIcon size={18} />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Plans breakdown */}
        <SectionCard title="Revenus par plan">
          <div className="space-y-4">
            {(['FREE', 'STARTER', 'PRO'] as const).map((plan) => {
              const info = data.plans[plan];
              const revenue = info.count * info.price;
              return (
                <div key={plan}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PLAN_BADGE_COLORS[plan]}`}>
                        {info.label}
                      </span>
                      <span className="text-xs text-gray-500">{info.count} tenant{info.count > 1 ? 's' : ''}</span>
                    </div>
                    <span className="text-sm font-mono text-gray-900">{formatTnd(revenue)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 w-16">{formatTnd(info.price)}/m</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`${PLAN_BAR_COLORS[plan]} h-1.5 rounded-full transition-all`}
                        style={{ width: `${data.mrr > 0 ? (revenue / data.mrr) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between">
            <span className="text-sm text-gray-500 font-medium">Total MRR</span>
            <span className="text-lg font-bold text-gray-900 font-mono">{formatTnd(data.mrr)}</span>
          </div>
          {data.mrr === 0 && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-600">
              Aucun revenu recurrent. Convertissez des tenants FREE vers STARTER ou PRO.
            </div>
          )}
        </SectionCard>

        {/* GMV Chart */}
        <SectionCard
          title="Volume de ventes (GMV) — 6 mois"
          action={<span className="text-xs text-gray-500">Total : {formatTnd(data.gmv.total)}</span>}
          className="lg:col-span-2"
        >
          <div className="flex items-end gap-2 h-40">
            {data.monthlyGmv.map((m) => {
              const pct = maxGmv > 0 ? (m.gmv / maxGmv) * 100 : 0;
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-500 font-mono">{m.gmv > 0 ? Math.round(m.gmv) : ''}</span>
                  <div className="w-full bg-gray-200 rounded-t-md flex flex-col justify-end" style={{ height: '120px' }}>
                    <div
                      className="bg-indigo-500 rounded-t-md transition-all hover:bg-indigo-400"
                      style={{ height: `${Math.max(pct, 2)}%` }}
                      title={`${m.month}: ${formatTnd(m.gmv)} (${m.orders} cmd)`}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500 text-center leading-tight">{m.month}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-200 text-xs text-gray-500">
            <span>Ce mois : <strong className="text-gray-900">{formatTnd(data.gmv.thisMonth)}</strong></span>
            <span>Mois dernier : {formatTnd(data.gmv.lastMonth)}</span>
            <span className={growthColor(data.gmv.growth)}>{formatGrowth(data.gmv.growth)}</span>
          </div>
        </SectionCard>
      </div>

      {/* Top tenants */}
      <SectionCard
        title="Top boutiques ce mois (GMV)"
        action={
          <Link href="/admin/performance" className="text-xs text-indigo-600 hover:text-indigo-500 transition-colors">
            Voir performance detaillee &rarr;
          </Link>
        }
        noPadding
      >
        {data.topTenants.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-8">Aucune vente ce mois.</p>
        ) : (
          <table className="w-full">
            <thead className="border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Boutique</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Abo/mois</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Commandes</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">GMV mois</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.topTenants.filter((t) => t.revenueMonth > 0).slice(0, 10).map((t, i) => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs text-gray-600 font-mono w-5">{i + 1}.</span>
                      <Link href={`/admin/tenants/${t.id}`} className="text-sm text-gray-900 hover:text-indigo-400 transition-colors font-medium">
                        {t.name}
                      </Link>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${PLAN_BADGE_COLORS[t.plan as keyof typeof PLAN_BADGE_COLORS] ?? PLAN_BADGE_COLORS.FREE}`}>
                      {t.plan}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center text-xs text-gray-500 font-mono">
                    {formatTnd(t.planPrice)}
                  </td>
                  <td className="px-5 py-3 text-center text-sm text-gray-700">
                    {t.ordersMonth}
                  </td>
                  <td className="px-5 py-3 text-right text-sm text-gray-900 font-mono font-medium">
                    {formatTnd(t.revenueMonth)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>

      {/* Conversion funnel hint */}
      {data.totalPaying === 0 && (
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-amber-600 mb-2">Monetisation : actions recommandees</h3>
          <ul className="text-xs text-amber-700 space-y-1.5 list-disc list-inside">
            <li>Integrer un gateway de paiement (Flouci, Konnect) pour collecter les abonnements</li>
            <li>Reduire les limites du plan FREE pour inciter les upgrades</li>
            <li>Ajouter un trial de 14 jours sur le plan STARTER pour les nouveaux tenants</li>
            <li>Envoyer des notifications quand un tenant atteint 80% de sa limite</li>
          </ul>
        </div>
      )}
    </div>
  );
}
