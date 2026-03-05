'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/admin-api';
import { PageHeader, KpiCard, SectionCard, SkeletonGrid } from '@/components/admin/AdminUI';
import { StoreIcon, ChartIcon, WalletIcon, ReceiptIcon, AlertIcon, BellIcon } from '@/components/admin/AdminIcons';
import { PLAN_BADGE_COLORS, PLAN_BAR_COLORS, formatTnd } from '@/components/admin/AdminConstants';

interface TopTenant {
  id: string; name: string; slug: string; plan: string; orders: number; products: number; revenue: number;
}

interface Stats {
  totalTenants: number; activeTenants: number; totalProducts: number;
  totalOrders: number; totalRevenue: string | number;
  planBreakdown: Record<string, number>; topTenants: TopTenant[];
}

interface Alerts {
  lowWallets: number; suspendedTenants: number; pendingOrders48h: number; total: number;
  lowWalletTenants: { id: string; name: string; slug: string; balance: number; minimumBalance: number }[];
}

const PERIODS = [
  { label: 'Tout', value: 0 },
  { label: '30j', value: 30 },
  { label: '7j', value: 7 },
];

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [alerts, setAlerts] = useState<Alerts | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(0); // 0 = all time

  useEffect(() => {
    setLoading(true);
    const url = period > 0 ? `/stats?days=${period}` : '/stats';
    Promise.all([
      adminApi.get(url),
      adminApi.get('/alerts'),
    ]).then(([s, a]) => {
      setStats(s.data);
      setAlerts(a.data);
    }).finally(() => setLoading(false));
  }, [period]);

  const plans = stats?.planBreakdown ?? {};

  return (
    <div>
      <PageHeader title="Vue d'ensemble" subtitle="Panel d'administration ShopForge">
        <div className="flex items-center gap-2">
          {/* Period filter */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  period === p.value
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Link href="/admin/tenants" className="text-xs text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors">
            Boutiques
          </Link>
          <Link href="/admin/settings" className="text-xs text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors">
            Paramètres
          </Link>
        </div>
      </PageHeader>

      {/* Alerts banner */}
      {alerts && alerts.total > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <BellIcon size={16} className="text-red-500" />
            <p className="text-sm font-semibold text-red-600">
              {alerts.total} alerte{alerts.total > 1 ? 's' : ''} active{alerts.total > 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {alerts.lowWallets > 0 && (
              <Link href="/admin/wallet" className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg transition-colors">
                <WalletIcon size={13} className="text-red-500" />
                <span className="text-xs text-red-600">
                  <strong>{alerts.lowWallets}</strong> wallet{alerts.lowWallets > 1 ? 's' : ''} bas
                </span>
              </Link>
            )}
            {alerts.pendingOrders48h > 0 && (
              <Link href="/admin/tenants" className="flex items-center gap-1.5 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-3 py-1.5 rounded-lg transition-colors">
                <AlertIcon size={13} className="text-orange-500" />
                <span className="text-xs text-orange-600">
                  <strong>{alerts.pendingOrders48h}</strong> commande{alerts.pendingOrders48h > 1 ? 's' : ''} en attente +48h
                </span>
              </Link>
            )}
            {alerts.suspendedTenants > 0 && (
              <Link href="/admin/tenants" className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors">
                <StoreIcon size={13} className="text-gray-500" />
                <span className="text-xs text-gray-500">
                  <strong>{alerts.suspendedTenants}</strong> boutique{alerts.suspendedTenants > 1 ? 's' : ''} suspendue{alerts.suspendedTenants > 1 ? 's' : ''}
                </span>
              </Link>
            )}
          </div>
          {/* Low wallet tenants detail */}
          {alerts.lowWalletTenants.length > 0 && (
            <div className="mt-3 pt-3 border-t border-red-200 space-y-1">
              {alerts.lowWalletTenants.map((t) => (
                <Link key={t.id} href={`/admin/tenants/${t.id}`} className="flex items-center justify-between hover:bg-red-50 px-2 py-1 rounded-lg transition-colors">
                  <span className="text-xs text-red-700 font-medium">{t.name}</span>
                  <span className="text-xs text-red-500 font-mono">
                    {t.balance.toFixed(3)} / {t.minimumBalance} TND
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* KPI Cards */}
      {loading ? (
        <>
          <SkeletonGrid cols={4} rows={1} />
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-48 bg-gray-200 rounded-xl animate-pulse" />
            <div className="lg:col-span-2 h-48 bg-gray-200 rounded-xl animate-pulse" />
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <KpiCard
              label="Boutiques"
              value={String(stats?.totalTenants ?? 0)}
              sub={`${stats?.activeTenants ?? 0} actives`}
              icon={<StoreIcon size={18} />}
              href="/admin/tenants"
            />
            <KpiCard
              label="Produits"
              value={String(stats?.totalProducts ?? 0)}
              sub="plateforme"
              icon={<ReceiptIcon size={18} />}
            />
            <KpiCard
              label={period > 0 ? `Commandes (${period}j)` : 'Commandes'}
              value={String(stats?.totalOrders ?? 0)}
              sub={period > 0 ? `derniers ${period} jours` : 'plateforme'}
              icon={<ChartIcon size={18} />}
              href="/admin/performance"
            />
            <KpiCard
              label={period > 0 ? `CA (${period}j)` : 'CA total'}
              value={formatTnd(Number(stats?.totalRevenue ?? 0))}
              sub={period > 0 ? `derniers ${period} jours` : 'plateforme'}
              icon={<WalletIcon size={18} />}
              highlight
              href="/admin/billing"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Plans breakdown */}
            <SectionCard title="Répartition des plans">
              <div className="space-y-3">
                {(['FREE', 'STARTER', 'PRO'] as const).map((plan) => {
                  const count = plans[plan] ?? 0;
                  const total = stats?.totalTenants || 1;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={plan}>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span className={`font-medium px-2 py-0.5 rounded-full ${PLAN_BADGE_COLORS[plan]}`}>{plan}</span>
                        <span>{count} boutique{count !== 1 ? 's' : ''} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className={`${PLAN_BAR_COLORS[plan]} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            {/* Top boutiques */}
            <SectionCard
              title="Top boutiques"
              action={
                <Link href="/admin/performance" className="text-xs text-indigo-600 hover:text-indigo-500 transition-colors">
                  Voir tout &rarr;
                </Link>
              }
              className="lg:col-span-2"
              noPadding
            >
              {!stats?.topTenants?.length ? (
                <p className="text-center text-gray-500 text-sm py-8">Aucune boutique</p>
              ) : (
                <div className="divide-y divide-gray-200">
                  {stats.topTenants.map((t) => (
                    <Link key={t.id} href={`/admin/tenants/${t.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-900 text-sm font-medium truncate">{t.name}</span>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${PLAN_BADGE_COLORS[t.plan as keyof typeof PLAN_BADGE_COLORS] || 'bg-gray-700 text-gray-400'}`}>
                            {t.plan}
                          </span>
                        </div>
                        <p className="text-gray-500 text-xs">{t.orders} commandes · {t.products} produits</p>
                      </div>
                      <span className="text-gray-900 text-sm font-mono ml-4 flex-shrink-0">
                        {t.revenue.toFixed(2)} TND
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
}
