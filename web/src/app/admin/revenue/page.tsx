'use client';
import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/admin-api';
import { PageHeader, KpiCard, SectionCard, SkeletonGrid } from '@/components/admin/AdminUI';
import { WalletIcon, TrendingIcon, ChartIcon, ReceiptIcon } from '@/components/admin/AdminIcons';
import { formatTnd } from '@/components/admin/AdminConstants';

interface RevenueByType {
  COMMISSION: number;
  SUBSCRIPTION: number;
}

interface MonthRevenue {
  totalRevenue: number;
  totalTransactions: number;
}

interface RevenueSummary {
  totalRevenue: number;
  totalTransactions: number;
  revenueByType: RevenueByType;
  mrr: number;
  arr: number;
  activeSubscriptions: number;
  thisMonth: MonthRevenue;
}

interface HistoryItem {
  period: string;
  commissions: number;
  commissionsCount: number;
  subscriptions: number;
  subscriptionsCount: number;
  totalRevenue: number;
}

export default function AdminRevenuePage() {
  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState(12);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      adminApi.get('/revenue/summary'),
      adminApi.get(`/revenue/history?months=${months}`),
    ])
      .then(([summaryRes, historyRes]) => {
        setSummary(summaryRes.data);
        setHistory(historyRes.data ?? []);
      })
      .catch((err) => console.error('Error fetching revenue:', err))
      .finally(() => setLoading(false));
  }, [months]);

  const commissionsTotal = summary?.revenueByType?.COMMISSION ?? 0;
  const subscriptionsTotal = summary?.revenueByType?.SUBSCRIPTION ?? 0;
  const commissionsPercent =
    summary?.totalRevenue ? Math.round((commissionsTotal / summary.totalRevenue) * 100) : 0;
  const subscriptionsPercent =
    summary?.totalRevenue ? Math.round((subscriptionsTotal / summary.totalRevenue) * 100) : 0;

  // Calculate growth (compare current month vs previous month)
  const currentMonth = history[0];
  const previousMonth = history[1];
  const monthGrowth =
    previousMonth && previousMonth.totalRevenue > 0
      ? Math.round(((currentMonth?.totalRevenue ?? 0 - previousMonth.totalRevenue) / previousMonth.totalRevenue) * 100)
      : 0;

  return (
    <div>
      <PageHeader
        title="Revenus Plateforme"
        subtitle="Chiffre d'affaires et revenus récurrents ShopForge"
      >
        <div className="flex items-center gap-2">
          {/* Period filter */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5">
            {[6, 12, 24].map((m) => (
              <button
                key={m}
                onClick={() => setMonths(m)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  months === m
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {m} mois
              </button>
            ))}
          </div>
        </div>
      </PageHeader>

      {loading ? (
        <>
          <SkeletonGrid cols={4} rows={1} />
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-gray-200 rounded-xl animate-pulse" />
            <div className="h-96 bg-gray-200 rounded-xl animate-pulse" />
          </div>
        </>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <KpiCard
              label="CA Total"
              value={formatTnd(summary?.totalRevenue ?? 0)}
              sub={`${summary?.totalTransactions ?? 0} transactions`}
              icon={<WalletIcon size={18} />}
              highlight
            />
            <KpiCard
              label="MRR"
              value={formatTnd(summary?.mrr ?? 0)}
              sub={`${summary?.activeSubscriptions ?? 0} abonnements actifs`}
              icon={<TrendingIcon size={18} />}
            />
            <KpiCard
              label="ARR"
              value={formatTnd(summary?.arr ?? 0)}
              sub="MRR × 12 mois"
              icon={<ChartIcon size={18} />}
            />
            <KpiCard
              label="Ce mois"
              value={formatTnd(summary?.thisMonth?.totalRevenue ?? 0)}
              sub={
                monthGrowth > 0
                  ? `↗ +${monthGrowth}% vs mois dernier`
                  : monthGrowth < 0
                  ? `↘ ${monthGrowth}% vs mois dernier`
                  : 'Stable'
              }
              icon={<ReceiptIcon size={18} />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Revenue breakdown by type */}
            <SectionCard title="Répartition des revenus">
              <div className="space-y-4">
                {/* Commissions */}
                <div>
                  <div className="flex justify-between text-sm text-gray-700 mb-2">
                    <span className="font-medium">💰 Commissions</span>
                    <span className="font-mono">{formatTnd(commissionsTotal)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-green-600 h-2.5 rounded-full transition-all"
                      style={{ width: `${commissionsPercent}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{commissionsPercent}% du total</p>
                </div>

                {/* Subscriptions */}
                <div>
                  <div className="flex justify-between text-sm text-gray-700 mb-2">
                    <span className="font-medium">📅 Abonnements</span>
                    <span className="font-mono">{formatTnd(subscriptionsTotal)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2.5 rounded-full transition-all"
                      style={{ width: `${subscriptionsPercent}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{subscriptionsPercent}% du total</p>
                </div>
              </div>

              {/* Info box */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700 font-medium mb-1">📊 Définition CA</p>
                <p className="text-xs text-blue-600 leading-relaxed">
                  Le chiffre d&apos;affaires (CA) représente uniquement les revenus réels de ShopForge :
                  commissions sur commandes livrées + abonnements mensuels. Les recharges wallet (TOPUP)
                  ne sont PAS comptées (passif au bilan).
                </p>
              </div>
            </SectionCard>

            {/* MRR Details */}
            <SectionCard title="Revenus Récurrents Mensuels (MRR)">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-gray-900">{formatTnd(summary?.mrr ?? 0)}</p>
                    <p className="text-sm text-gray-500 mt-1">MRR actuel</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-indigo-600">{formatTnd(summary?.arr ?? 0)}</p>
                    <p className="text-sm text-gray-500 mt-1">ARR projeté</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Abonnements actifs</span>
                    <span className="font-semibold text-gray-900">{summary?.activeSubscriptions ?? 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Revenu moyen / tenant</span>
                    <span className="font-semibold text-gray-900">
                      {summary?.activeSubscriptions
                        ? formatTnd((summary.mrr ?? 0) / summary.activeSubscriptions)
                        : '0 TND'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Info box */}
              <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-xs text-purple-700 font-medium mb-1">💡 MRR & ARR</p>
                <p className="text-xs text-purple-600 leading-relaxed">
                  MRR = Revenus mensuels récurrents (plans STARTER 29 TND + PRO 79 TND).
                  ARR = Annual Recurring Revenue (MRR × 12).
                </p>
              </div>
            </SectionCard>
          </div>

          {/* Revenue History */}
          <SectionCard title={`Évolution des revenus (${months} derniers mois)`}>
            {!history?.length ? (
              <p className="text-center text-gray-500 text-sm py-8">Aucune donnée disponible</p>
            ) : (
              <>
                {/* Chart visualization */}
                <div className="mb-6">
                  <div className="flex items-end gap-1 h-48">
                    {history.slice().reverse().map((item, idx) => {
                      const maxRevenue = Math.max(...history.map((h) => h.totalRevenue), 1);
                      const heightPercent = (item.totalRevenue / maxRevenue) * 100;
                      const isCurrentMonth = idx === history.length - 1;

                      return (
                        <div
                          key={item.period}
                          className="flex-1 flex flex-col items-center gap-1 group"
                        >
                          <div className="relative w-full">
                            {/* Tooltip on hover */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                              <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-xl">
                                <p className="font-semibold">{item.period}</p>
                                <p className="text-gray-300">Total: {formatTnd(item.totalRevenue)}</p>
                                <p className="text-green-300">
                                  Commissions: {formatTnd(item.commissions)} ({item.commissionsCount})
                                </p>
                                <p className="text-purple-300">
                                  Abonnements: {formatTnd(item.subscriptions)} ({item.subscriptionsCount})
                                </p>
                              </div>
                            </div>

                            {/* Bar */}
                            <div
                              className={`w-full rounded-t-md transition-all cursor-pointer ${
                                isCurrentMonth
                                  ? 'bg-gradient-to-t from-indigo-600 to-indigo-400'
                                  : 'bg-gradient-to-t from-gray-400 to-gray-300 group-hover:from-indigo-500 group-hover:to-indigo-400'
                              }`}
                              style={{ height: `${Math.max(heightPercent, 5)}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-gray-500 font-mono mt-1">
                            {item.period.split('-')[1]}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-y border-gray-200">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Période</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Commissions</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Abonnements</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {history.map((item, idx) => {
                        const isCurrentMonth = idx === 0;
                        return (
                          <tr
                            key={item.period}
                            className={`${isCurrentMonth ? 'bg-indigo-50' : 'hover:bg-gray-50'} transition-colors`}
                          >
                            <td className="px-4 py-3 text-gray-900 font-medium">
                              {item.period}
                              {isCurrentMonth && (
                                <span className="ml-2 text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                                  En cours
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-mono text-green-600">{formatTnd(item.commissions)}</span>
                              <span className="ml-2 text-xs text-gray-500">({item.commissionsCount})</span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-mono text-purple-600">{formatTnd(item.subscriptions)}</span>
                              <span className="ml-2 text-xs text-gray-500">({item.subscriptionsCount})</span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-mono text-gray-900 font-semibold">{formatTnd(item.totalRevenue)}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
}
