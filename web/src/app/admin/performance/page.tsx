'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/admin-api';
import { PageHeader, KpiCard, SearchInput, Spinner } from '@/components/admin/AdminUI';
import { WalletIcon, ChartIcon } from '@/components/admin/AdminIcons';
import { PLAN_BADGE_COLORS, formatTnd } from '@/components/admin/AdminConstants';

interface TenantPerf {
  id: string;
  name: string;
  slug: string;
  plan: string;
  isActive: boolean;
  createdAt: string;
  products: number;
  totalOrders: number;
  ordersThisMonth: number;
  deliveredOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
}

type SortKey = 'totalRevenue' | 'totalOrders' | 'ordersThisMonth' | 'avgOrderValue' | 'products';

export default function AdminPerformancePage() {
  const [data, setData] = useState<TenantPerf[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortKey>('totalRevenue');
  const [search, setSearch] = useState('');

  useEffect(() => {
    adminApi.get('/tenants/performance').then(({ data }) => {
      setData(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const sorted = [...data]
    .filter((t) => !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.slug.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (b[sortBy] as number) - (a[sortBy] as number));

  const totalRevenue = data.reduce((s, t) => s + t.totalRevenue, 0);
  const totalOrders = data.reduce((s, t) => s + t.totalOrders, 0);
  const totalMonthOrders = data.reduce((s, t) => s + t.ordersThisMonth, 0);

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'totalRevenue', label: 'CA total' },
    { key: 'totalOrders', label: 'Commandes' },
    { key: 'ordersThisMonth', label: 'Ce mois' },
    { key: 'avgOrderValue', label: 'Panier moyen' },
    { key: 'products', label: 'Produits' },
  ];

  return (
    <div>
      <PageHeader title="Performance des boutiques" subtitle="Vue detaillee de la performance par boutique" />

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <KpiCard label="CA total plateforme" value={formatTnd(totalRevenue)} icon={<WalletIcon size={18} />} highlight />
        <KpiCard label="Commandes totales" value={String(totalOrders)} icon={<ChartIcon size={18} />} />
        <KpiCard label="Commandes ce mois" value={String(totalMonthOrders)} icon={<ChartIcon size={18} />} />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Rechercher une boutique..." />
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">Trier par :</span>
          {sortOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key)}
              className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                sortBy === opt.key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-500 hover:text-gray-900 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
        {loading ? (
          <Spinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Boutique</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Plan</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Produits</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Commandes</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ce mois</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Livrees</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">CA total</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Panier moy.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-gray-500">
                      {search ? 'Aucun resultat' : 'Aucune boutique'}
                    </td>
                  </tr>
                )}
                {sorted.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/admin/tenants/${t.id}`} className="text-indigo-600 hover:text-indigo-500 font-medium transition-colors">
                        {t.name}
                      </Link>
                      <p className="text-gray-600 text-xs font-mono">{t.slug}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PLAN_BADGE_COLORS[t.plan as keyof typeof PLAN_BADGE_COLORS] || 'bg-gray-700 text-gray-400'}`}>
                        {t.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 font-mono">{t.products}</td>
                    <td className="px-4 py-3 text-right text-gray-700 font-mono">{t.totalOrders}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={t.ordersThisMonth > 0 ? 'text-green-600 font-medium' : 'text-gray-500'}>
                        {t.ordersThisMonth}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 font-mono">{t.deliveredOrders}</td>
                    <td className="px-4 py-3 text-right text-gray-900 font-mono font-medium whitespace-nowrap">
                      {formatTnd(t.totalRevenue)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 font-mono whitespace-nowrap">
                      {formatTnd(t.avgOrderValue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
