'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { PageHeader, KpiCard, SectionCard, Spinner } from '@/components/admin/AdminUI';
import { ChartIcon } from '@/components/admin/AdminIcons';
import { formatTnd, PLAN_BADGE_COLORS } from '@/components/admin/AdminConstants';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function analyticsApi() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
  return axios.create({
    baseURL: `${API_URL}/analytics`,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

interface ChurnStats {
  totalActive: number;
  churned: number;
  churnRate: number;
  prevChurned: number;
  planBreakdown: Record<string, number>;
  churnedTenants: Array<{
    id: string; name: string; slug: string; plan: string;
    lastActivityAt: string | null;
    _count: { orders: number; products: number };
  }>;
}

interface LtvStats {
  avgLtv: number;
  totalRevenue: number;
  tenantsWithRevenue: number;
  avgLifespanDays: number;
  byPlan: Record<string, { tenants: number; totalLtv: number; avgLtv: number }>;
}

interface ActivationStats {
  period: number;
  registered: number;
  withProduct: number;
  withOrder: number;
  activated: number;
  retained: number;
  rates: { productRate: number; orderRate: number; activationRate: number; retentionRate: number };
}

interface CohortMonth {
  month: string;
  registered: number;
  retention: number[];
}

interface AnalyticsSummary {
  churn: ChurnStats;
  ltv: LtvStats;
  activation: ActivationStats;
  cohorts: CohortMonth[];
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsApi().get('/admin/summary')
      .then(({ data }) => { setData(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (!data) return <p className="text-red-400">Erreur de chargement.</p>;

  const { churn, ltv, activation, cohorts } = data;

  // Cohort heatmap colors
  const retColor = (pct: number) => {
    if (pct >= 80) return 'bg-green-500 text-white';
    if (pct >= 60) return 'bg-green-400 text-white';
    if (pct >= 40) return 'bg-yellow-400 text-gray-900';
    if (pct >= 20) return 'bg-orange-400 text-white';
    return 'bg-red-400 text-white';
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics SaaS" subtitle="Metriques strategiques de la plateforme" />

      {/* ─── KPIs Row 1 ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<ChartIcon />}
          label="LTV moyen"
          value={formatTnd(ltv.avgLtv)}
          sub={`${ltv.tenantsWithRevenue} tenants actifs`}
        />
        <KpiCard
          icon={<span className="text-lg">📉</span>}
          label="Churn Rate"
          value={`${churn.churnRate}%`}
          sub={`${churn.churned} churnés / ${churn.totalActive} actifs`}
          color={churn.churnRate > 10 ? 'text-red-500' : churn.churnRate > 5 ? 'text-orange-500' : 'text-green-500'}
        />
        <KpiCard
          icon={<span className="text-lg">🚀</span>}
          label="Activation"
          value={`${activation.rates.activationRate}%`}
          sub={`${activation.activated} / ${activation.registered} (${activation.period}j)`}
        />
        <KpiCard
          icon={<span className="text-lg">🔄</span>}
          label="Retention"
          value={`${activation.rates.retentionRate}%`}
          sub={`${activation.retained} retenus sur ${activation.activated} activés`}
        />
      </div>

      {/* ─── Activation Funnel ──────────────────────────────────── */}
      <SectionCard title="Funnel d'activation" subtitle={`Derniers ${activation.period} jours`}>
        <div className="space-y-3">
          {[
            { label: 'Inscrits', value: activation.registered, rate: 100 },
            { label: 'Avec produit', value: activation.withProduct, rate: activation.rates.productRate },
            { label: 'Avec commande', value: activation.withOrder, rate: activation.rates.orderRate },
            { label: 'Activés', value: activation.activated, rate: activation.rates.activationRate },
            { label: 'Retenus (30j)', value: activation.retained, rate: activation.rates.retentionRate },
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-sm text-gray-500 w-32 shrink-0">{step.label}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all"
                  style={{ width: `${step.rate}%` }}
                />
                <span className="absolute inset-0 flex items-center px-3 text-xs font-semibold text-gray-700">
                  {step.value} ({step.rate}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ─── Cohort Retention Heatmap ──────────────────────────── */}
        <SectionCard title="Rétention par cohorte" subtitle="Taux de rétention mensuel par mois d'inscription">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left text-gray-500 font-medium pb-2 pr-3">Cohorte</th>
                  <th className="text-center text-gray-500 font-medium pb-2 px-1">Inscrits</th>
                  {Array.from({ length: Math.max(...cohorts.map(c => c.retention.length), 1) }, (_, i) => (
                    <th key={i} className="text-center text-gray-500 font-medium pb-2 px-1">M{i}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cohorts.map((c) => (
                  <tr key={c.month}>
                    <td className="font-medium text-gray-700 py-1 pr-3 whitespace-nowrap">{c.month}</td>
                    <td className="text-center text-gray-600 py-1 px-1">{c.registered}</td>
                    {c.retention.map((pct, i) => (
                      <td key={i} className="py-1 px-1">
                        <div className={`text-center rounded px-2 py-1 font-semibold ${retColor(pct)}`}>
                          {pct}%
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* ─── LTV by Plan ──────────────────────────────────────── */}
        <SectionCard title="LTV par plan" subtitle={`Durée de vie moyenne : ${ltv.avgLifespanDays} jours`}>
          <div className="space-y-4">
            {Object.entries(ltv.byPlan).map(([plan, info]) => (
              <div key={plan} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${PLAN_BADGE_COLORS[plan as keyof typeof PLAN_BADGE_COLORS] ?? 'bg-gray-100 text-gray-600'}`}>
                    {plan}
                  </span>
                  <span className="text-sm text-gray-600">{info.tenants} tenants</span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{formatTnd(info.avgLtv)}</p>
                  <p className="text-xs text-gray-400">Total: {formatTnd(info.totalLtv)}</p>
                </div>
              </div>
            ))}
            <div className="pt-3 border-t border-gray-100 flex justify-between">
              <span className="text-sm font-medium text-gray-600">LTV moyen global</span>
              <span className="font-bold text-lg text-gray-900">{formatTnd(ltv.avgLtv)}</span>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* ─── Churn Analysis ─────────────────────────────────────── */}
      <SectionCard title="Analyse du churn" subtitle={`${churn.churned} tenant(s) churné(s) ce mois`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">{churn.churnRate}%</p>
            <p className="text-xs text-gray-500">Taux de churn</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">{churn.churned}</p>
            <p className="text-xs text-gray-500">Churnés ce mois</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">{churn.prevChurned}</p>
            <p className="text-xs text-gray-500">Churnés mois précédent</p>
          </div>
        </div>

        {/* Plan breakdown */}
        {Object.keys(churn.planBreakdown).length > 0 && (
          <div className="flex gap-3 mb-4">
            {Object.entries(churn.planBreakdown).map(([plan, count]) => (
              <span key={plan} className={`text-xs font-semibold px-2.5 py-1 rounded ${PLAN_BADGE_COLORS[plan as keyof typeof PLAN_BADGE_COLORS] ?? 'bg-gray-100 text-gray-600'}`}>
                {plan}: {count}
              </span>
            ))}
          </div>
        )}

        {/* Churned tenants table */}
        {churn.churnedTenants.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase tracking-wider">
                  <th className="text-left pb-2 font-medium">Boutique</th>
                  <th className="text-center pb-2 font-medium">Plan</th>
                  <th className="text-center pb-2 font-medium">Produits</th>
                  <th className="text-center pb-2 font-medium">Commandes</th>
                  <th className="text-right pb-2 font-medium">Dernière activité</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {churn.churnedTenants.slice(0, 10).map((t) => (
                  <tr key={t.id}>
                    <td className="py-2 font-medium text-gray-800">{t.name}</td>
                    <td className="py-2 text-center">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${PLAN_BADGE_COLORS[t.plan as keyof typeof PLAN_BADGE_COLORS] ?? ''}`}>{t.plan}</span>
                    </td>
                    <td className="py-2 text-center text-gray-600">{t._count.products}</td>
                    <td className="py-2 text-center text-gray-600">{t._count.orders}</td>
                    <td className="py-2 text-right text-gray-400 text-xs">
                      {t.lastActivityAt ? new Date(t.lastActivityAt).toLocaleDateString('fr-TN') : 'Jamais'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
