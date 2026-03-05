'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import PageHeader from '@/components/dashboard/PageHeader';

interface DailyRevenue { date: string; revenue: number }
interface TopProduct { name: string; revenue: number; quantity: number }
interface StatusDist { status: string; count: number }

interface Analytics {
  dailyRevenue: DailyRevenue[];
  topProducts: TopProduct[];
  statusDistribution: StatusDist[];
}

interface Funnel {
  visitors: number;
  pageViews: number;
  productViews: number;
  addToCarts: number;
  checkoutStarts: number;
  purchases: number;
}

interface TrafficSource {
  source: string;
  count: number;
  percent: number;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente', CONFIRMED: 'Confirmée', PROCESSING: 'En préparation',
  SHIPPED: 'Expédiée', DELIVERED: 'Livrée', CANCELLED: 'Annulée',
  RETURN_REQUESTED: 'Retour demandé', RETURNED: 'Retournée', REFUNDED: 'Remboursée',
};
const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-400', CONFIRMED: 'bg-blue-400', PROCESSING: 'bg-purple-400',
  SHIPPED: 'bg-indigo-400', DELIVERED: 'bg-green-400', CANCELLED: 'bg-red-400',
  RETURN_REQUESTED: 'bg-orange-400', RETURNED: 'bg-amber-400', REFUNDED: 'bg-teal-400',
};

const PERIODS = [
  { label: '7 jours', days: 7 },
  { label: '30 jours', days: 30 },
  { label: '90 jours', days: 90 },
];

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [sources, setSources] = useState<TrafficSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  // AI Insights
  const [aiInsights, setAiInsights] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const handleAiInsights = async () => {
    setAiLoading(true);
    setAiError('');
    try {
      const { data } = await api.post('/ai/dashboard-insights');
      setAiInsights(data.insights);
    } catch (err: any) {
      setAiError(err.response?.data?.message || 'Erreur lors de la génération des insights');
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/orders/analytics?days=${days}`),
      api.get(`/analytics/funnel?days=${days}`).catch(() => ({ data: null })),
      api.get(`/analytics/sources?days=${days}`).catch(() => ({ data: [] })),
    ]).then(([analyticsRes, funnelRes, sourcesRes]) => {
      setData(analyticsRes.data);
      setFunnel(funnelRes.data);
      setSources(sourcesRes.data ?? []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-100 rounded w-48 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!data) return <div className="text-gray-400">Erreur lors du chargement.</div>;

  const maxRevenue = Math.max(...data.dailyRevenue.map((d) => d.revenue), 1);
  const totalRevenue = data.dailyRevenue.reduce((s, d) => s + d.revenue, 0);
  const totalOrders = data.statusDistribution.reduce((s, d) => s + d.count, 0);
  const deliveredCount = data.statusDistribution.find(s => s.status === 'DELIVERED')?.count ?? 0;
  const cancelledCount = data.statusDistribution.find(s => s.status === 'CANCELLED')?.count ?? 0;
  const conversionRate = totalOrders > 0 ? ((deliveredCount / totalOrders) * 100) : 0;

  const periodLabel = PERIODS.find(p => p.days === days)?.label ?? `${days} jours`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytiques"
        subtitle={`Performances des ${periodLabel}`}
        actions={
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {PERIODS.map((p) => (
              <button
                key={p.days}
                onClick={() => setDays(p.days)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  days === p.days
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        }
      />

      {/* KPI summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label={`CA (${periodLabel})`}
          value={`${totalRevenue.toFixed(2)} TND`}
          accent="blue"
        />
        <KpiCard
          label="Commandes"
          value={String(totalOrders)}
          accent="green"
        />
        <KpiCard
          label="Panier moyen"
          value={`${totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : '0.00'} TND`}
          accent="purple"
        />
        <KpiCard
          label="Taux de livraison"
          value={`${conversionRate.toFixed(1)}%`}
          sub={cancelledCount > 0 ? `${cancelledCount} annulée${cancelledCount > 1 ? 's' : ''}` : undefined}
          accent="orange"
        />
      </div>

      {/* Revenue chart */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-gray-900">Chiffre d&apos;affaires — {periodLabel}</h2>
          <span className="text-sm font-bold text-gray-900">{totalRevenue.toFixed(2)} TND</span>
        </div>
        {totalRevenue === 0 ? (
          <div className="text-center py-10 text-gray-300">
            <p className="text-lg">Pas encore de données</p>
            <p className="text-sm mt-1">Les données apparaîtront après vos premières commandes.</p>
          </div>
        ) : (
          <div className="relative">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-6 w-16 flex flex-col justify-between text-[10px] text-gray-400 text-right pr-2">
              <span>{maxRevenue.toFixed(0)}</span>
              <span>{(maxRevenue / 2).toFixed(0)}</span>
              <span>0</span>
            </div>
            <div className="ml-16">
              <div className="flex items-end gap-[2px] h-48 overflow-hidden">
                {data.dailyRevenue.map((d) => {
                  const pct = maxRevenue > 0 ? (d.revenue / maxRevenue) * 100 : 0;
                  const date = new Date(d.date);
                  const label = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
                  return (
                    <div key={d.date} className="flex-1 flex flex-col items-center justify-end group relative">
                      <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                        <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                          {label}<br />{d.revenue.toFixed(2)} TND
                        </div>
                        <div className="w-2 h-2 bg-gray-900 rotate-45 -mt-1" />
                      </div>
                      <div
                        className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                        style={{ height: `${Math.max(pct, d.revenue > 0 ? 2 : 0)}%` }}
                      />
                    </div>
                  );
                })}
              </div>
              {/* X-axis labels */}
              <div className="flex justify-between mt-2">
                {data.dailyRevenue.filter((_, i) => {
                  const step = Math.max(1, Math.floor(data.dailyRevenue.length / 6));
                  return i % step === 0 || i === data.dailyRevenue.length - 1;
                }).map((d) => (
                  <span key={d.date} className="text-[10px] text-gray-400">
                    {new Date(d.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top products */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Top produits</h2>
          {data.topProducts.length === 0 ? (
            <p className="text-gray-400 text-sm py-6 text-center">Aucune donnée disponible.</p>
          ) : (
            <div className="space-y-3">
              {data.topProducts.map((p, i) => {
                const maxR = data.topProducts[0].revenue;
                const pct = maxR > 0 ? (p.revenue / maxR) * 100 : 0;
                return (
                  <div key={p.name}>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold w-5 h-5 rounded flex items-center justify-center ${
                          i === 0 ? 'bg-yellow-100 text-yellow-700'
                          : i === 1 ? 'bg-gray-100 text-gray-600'
                          : i === 2 ? 'bg-orange-100 text-orange-600'
                          : 'text-gray-400'
                        }`}>{i + 1}</span>
                        <span className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{p.name}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-semibold text-gray-900">{p.revenue.toFixed(2)} TND</span>
                        <span className="text-xs text-gray-400 ml-1">({p.quantity} vte{p.quantity > 1 ? 's' : ''})</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Status distribution */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Statut des commandes</h2>
          {data.statusDistribution.length === 0 ? (
            <p className="text-gray-400 text-sm py-6 text-center">Aucune commande.</p>
          ) : (
            <>
              {/* Mini donut-like visual */}
              <div className="flex gap-1 h-3 rounded-full overflow-hidden mb-4">
                {data.statusDistribution.map((s) => {
                  const pct = totalOrders > 0 ? (s.count / totalOrders) * 100 : 0;
                  return (
                    <div
                      key={s.status}
                      className={`${STATUS_COLORS[s.status] ?? 'bg-gray-400'} transition-all`}
                      style={{ width: `${Math.max(pct, 1)}%` }}
                      title={`${STATUS_LABELS[s.status] ?? s.status}: ${s.count}`}
                    />
                  );
                })}
              </div>
              <div className="space-y-2.5">
                {data.statusDistribution.map((s) => {
                  const pct = totalOrders > 0 ? Math.round((s.count / totalOrders) * 100) : 0;
                  return (
                    <div key={s.status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[s.status] ?? 'bg-gray-400'}`} />
                        <span className="text-sm text-gray-700">{STATUS_LABELS[s.status] ?? s.status}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{s.count}</span>
                        <span className="text-xs text-gray-400 w-10 text-right">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Funnel + Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Funnel */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Funnel de conversion</h2>
          {funnel && funnel.visitors > 0 ? (() => {
            const steps = [
              { label: 'Visiteurs', value: funnel.visitors },
              { label: 'Vues produit', value: funnel.productViews },
              { label: 'Ajout panier', value: funnel.addToCarts },
              { label: 'Checkout', value: funnel.checkoutStarts },
              { label: 'Achats', value: funnel.purchases },
            ];
            return (
              <div className="space-y-3">
                {steps.map((step, i) => {
                  const pct = funnel.visitors > 0 ? Math.round((step.value / funnel.visitors) * 100) : 0;
                  return (
                    <div key={i}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-600">{step.label}</span>
                        <span className="text-sm font-semibold text-gray-900">{step.value} <span className="text-xs text-gray-400">({pct}%)</span></span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                {funnel.visitors > 0 && funnel.purchases > 0 && (
                  <div className="pt-3 border-t border-gray-100 flex justify-between">
                    <span className="text-sm font-medium text-gray-600">Taux de conversion global</span>
                    <span className="font-bold text-green-600">{((funnel.purchases / funnel.visitors) * 100).toFixed(1)}%</span>
                  </div>
                )}
              </div>
            );
          })() : (
            <p className="text-sm text-gray-400 text-center py-8">Les donn\u00e9es de funnel appara\u00eetront au fur et \u00e0 mesure que votre boutique re\u00e7oit des visiteurs.</p>
          )}
        </div>

        {/* Traffic Sources */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Sources de trafic</h2>
          {sources.length > 0 ? (
            <div className="space-y-3">
              {sources.slice(0, 8).map((s, i) => {
                const icons: Record<string, string> = {
                  direct: '\uD83C\uDFE0', facebook: '\uD83D\uDCD8', instagram: '\uD83D\uDCF7',
                  google: '\uD83D\uDD0D', tiktok: '\uD83C\uDFB5',
                };
                return (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{icons[s.source.toLowerCase()] ?? '\uD83C\uDF10'}</span>
                      <span className="text-sm font-medium text-gray-700 capitalize">{s.source}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-gray-100 rounded-full h-1.5">
                        <div className="bg-orange-400 h-1.5 rounded-full" style={{ width: `${s.percent}%` }} />
                      </div>
                      <span className="text-sm font-semibold text-gray-900 w-12 text-right">{s.percent}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">Les sources de trafic appara\u00eetront quand vos visiteurs arriveront via des liens UTM.</p>
          )}
        </div>
      </div>

      {/* AI Insights */}
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Insights IA</h2>
          <button
            onClick={handleAiInsights}
            disabled={aiLoading}
            className="inline-flex items-center gap-1.5 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {aiLoading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Analyse...
              </>
            ) : aiInsights ? (
              <>{'\u2728'} Actualiser</>
            ) : (
              <>{'\u2728'} Générer les insights</>
            )}
          </button>
        </div>
        {aiError && <p className="text-sm text-red-500 mb-3">{aiError}</p>}
        {aiInsights ? (
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{aiInsights}</p>
        ) : !aiLoading && (
          <p className="text-sm text-gray-400 text-center py-4">Cliquez sur le bouton pour obtenir des recommandations personnalisées basées sur vos données.</p>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, accent }: {
  label: string;
  value: string;
  sub?: string;
  accent: 'blue' | 'green' | 'purple' | 'orange';
}) {
  const colors = {
    blue: 'bg-blue-50 border-blue-100',
    green: 'bg-green-50 border-green-100',
    purple: 'bg-purple-50 border-purple-100',
    orange: 'bg-orange-50 border-orange-100',
  };
  return (
    <div className={`${colors[accent]} border rounded-xl p-4`}>
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}
