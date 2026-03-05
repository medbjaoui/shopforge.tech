'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/dashboard/PageHeader';

interface Stats {
  totalOrders: number;
  monthOrders: number;
  todayOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  monthRevenue: number;
  todayRevenue: number;
  previousMonthOrders: number;
  previousMonthRevenue: number;
}

interface TenantInfo {
  _count: { products: number };
  plan: string;
  logo: string | null;
  codEnabled: boolean;
  isPublished: boolean;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  totalAmount: string;
  status: string;
  createdAt: string;
  items: { quantity: number }[];
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING:    { label: 'En attente',  color: 'bg-yellow-100 text-yellow-700' },
  CONFIRMED:  { label: 'Confirmé',    color: 'bg-blue-100 text-blue-700' },
  PROCESSING: { label: 'En cours',    color: 'bg-purple-100 text-purple-700' },
  SHIPPED:    { label: 'Expédié',     color: 'bg-indigo-100 text-indigo-700' },
  DELIVERED:  { label: 'Livré',       color: 'bg-green-100 text-green-700' },
  CANCELLED:  { label: 'Annulé',      color: 'bg-red-100 text-red-700' },
};

const QUICK_ACTIONS = [
  { label: 'Ajouter un produit', href: '/dashboard/products', icon: '⊞', color: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
  { label: 'Voir les commandes', href: '/dashboard/orders', icon: '◈', color: 'bg-green-50 text-green-600 hover:bg-green-100' },
  { label: 'Analytiques', href: '/dashboard/analytics', icon: '◎', color: 'bg-purple-50 text-purple-600 hover:bg-purple-100' },
  { label: 'Paramètres', href: '/dashboard/settings', icon: '▲', color: 'bg-gray-50 text-gray-600 hover:bg-gray-100' },
];

export default function DashboardPage() {
  const { store } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, tenantRes, ordersRes] = await Promise.all([
          api.get('/orders/stats'),
          api.get('/tenants/me'),
          api.get('/orders?status=PENDING'),
        ]);
        setStats(statsRes.data);
        setTenant(tenantRes.data);
        const orders = Array.isArray(ordersRes.data) ? ordersRes.data : ordersRes.data.data;
        setRecentOrders((orders ?? []).slice(0, 8));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-100 rounded w-48 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  const planLabel: Record<string, string> = { FREE: 'Gratuit', STARTER: 'Starter', PRO: 'Pro' };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tableau de bord"
        subtitle={`${store?.slug}.shopforge.tech · Plan ${planLabel[tenant?.plan ?? ''] ?? tenant?.plan ?? ''}`}
        actions={stats && stats.pendingOrders > 0 ? (
          <Link
            href="/dashboard/orders?status=PENDING"
            className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-2 rounded-xl text-sm font-medium hover:bg-yellow-100 transition-colors"
          >
            <span className="w-5 h-5 bg-yellow-400 text-white rounded-full flex items-center justify-center text-xs font-bold">
              {stats.pendingOrders}
            </span>
            commande{stats.pendingOrders > 1 ? 's' : ''} en attente
          </Link>
        ) : undefined}
      />

      {/* Readiness checklist — shown until store is fully ready */}
      {tenant && (!tenant.isPublished || !tenant.logo || tenant._count.products === 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold text-gray-900 text-sm">
                {tenant.isPublished ? '✅ Boutique en ligne — finalisez votre configuration' : '🔧 Votre boutique n\'est pas encore publiée'}
              </h2>
              {!tenant.isPublished && (
                <p className="text-xs text-gray-500 mt-0.5">Ajoutez votre premier produit pour la mettre en ligne automatiquement.</p>
              )}
            </div>
            <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
              {[!!tenant.logo, tenant._count.products > 0, tenant.codEnabled].filter(Boolean).length} / 3
            </span>
          </div>
          <div className="space-y-2">
            <ReadinessItem
              done={tenant._count.products > 0}
              label="Ajoutez au moins 1 produit"
              note={!tenant.isPublished && tenant._count.products === 0 ? 'Votre boutique sera publiée automatiquement !' : undefined}
              href="/dashboard/products"
            />
            <ReadinessItem
              done={!!tenant.logo}
              label="Ajoutez votre logo"
              href="/dashboard/settings"
            />
            <ReadinessItem
              done={tenant.codEnabled}
              label="Activez le paiement à la livraison"
              href="/dashboard/settings"
            />
          </div>
          {tenant.isPublished && (
            <div className="mt-3 pt-3 border-t border-amber-200 flex items-center justify-between">
              <span className="text-xs text-gray-500">URL de votre boutique :</span>
              <a
                href={`https://${store?.slug}.shopforge.tech`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono font-semibold text-orange-600 hover:underline"
              >
                {store?.slug}.shopforge.tech ↗
              </a>
            </div>
          )}
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="CA ce mois"
          value={`${(stats?.monthRevenue ?? 0).toFixed(2)} TND`}
          sub={`Aujourd'hui : ${(stats?.todayRevenue ?? 0).toFixed(2)} TND`}
          accent="green"
          icon="◎"
          change={stats?.previousMonthRevenue ? ((stats.monthRevenue - stats.previousMonthRevenue) / stats.previousMonthRevenue) * 100 : undefined}
        />
        <StatCard
          title="Commandes / mois"
          value={stats?.monthOrders ?? 0}
          sub={`${stats?.todayOrders ?? 0} aujourd'hui`}
          accent="blue"
          icon="◈"
          href="/dashboard/orders"
          change={stats?.previousMonthOrders ? ((stats.monthOrders - stats.previousMonthOrders) / stats.previousMonthOrders) * 100 : undefined}
        />
        <StatCard
          title="En attente"
          value={stats?.pendingOrders ?? 0}
          sub="à confirmer"
          accent={stats?.pendingOrders ? 'yellow' : 'gray'}
          icon="▲"
          href="/dashboard/orders?status=PENDING"
        />
        <StatCard
          title="Produits"
          value={tenant?._count.products ?? 0}
          sub="dans la boutique"
          accent="purple"
          icon="⊞"
          href="/dashboard/products"
        />
      </div>

      {/* CA total + Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-gradient-to-r from-gray-900 to-gray-700 rounded-2xl p-6 text-white flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400 mb-1">Chiffre d&apos;affaires total</p>
            <p className="text-3xl sm:text-4xl font-bold">{(stats?.totalRevenue ?? 0).toFixed(2)} TND</p>
            <p className="text-sm text-gray-400 mt-1">{stats?.totalOrders ?? 0} commandes au total</p>
          </div>
          <Link
            href="/dashboard/orders"
            className="hidden sm:block text-sm text-gray-300 hover:text-white border border-gray-600 px-4 py-2 rounded-lg hover:border-gray-400 transition-colors"
          >
            Voir les commandes →
          </Link>
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Actions rapides</p>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_ACTIONS.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl text-center transition-colors ${a.color}`}
              >
                <span className="text-lg">{a.icon}</span>
                <span className="text-[11px] font-medium leading-tight">{a.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Commandes en attente + Boutique */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Commandes en attente */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Commandes en attente</h2>
            <Link href="/dashboard/orders" className="text-sm text-blue-600 hover:underline">
              Voir toutes →
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-2xl mb-2">🎉</p>
              <p className="text-gray-400 text-sm">Aucune commande en attente.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentOrders.map((order) => {
                const s = STATUS_LABELS[order.status] ?? { label: order.status, color: 'bg-gray-100 text-gray-600' };
                const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);
                const date = new Date(order.createdAt);
                return (
                  <Link
                    key={order.id}
                    href={`/dashboard/orders?id=${order.id}`}
                    className="px-6 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{order.customerName}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {order.orderNumber} · {itemCount} article{itemCount > 1 ? 's' : ''} ·{' '}
                        {date.toLocaleDateString('fr-TN')} {date.toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${s.color}`}>{s.label}</span>
                      <span className="text-sm font-bold text-gray-900">
                        {Number(order.totalAmount).toFixed(2)} TND
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Store info sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Ma boutique</p>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Plan</span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                  tenant?.plan === 'PRO' ? 'bg-purple-100 text-purple-700'
                  : tenant?.plan === 'STARTER' ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700'
                }`}>
                  {planLabel[tenant?.plan ?? ''] ?? tenant?.plan}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Produits</span>
                <span className="text-sm font-semibold text-gray-900">{tenant?._count.products ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Commandes totales</span>
                <span className="text-sm font-semibold text-gray-900">{stats?.totalOrders ?? 0}</span>
              </div>
            </div>
            {tenant?.plan === 'FREE' && (
              <Link
                href="/dashboard/billing"
                className="mt-4 block text-center bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Passer au plan supérieur
              </Link>
            )}
          </div>

          <a
            href={`/store/${store?.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-white rounded-xl shadow-sm p-5 hover:bg-gray-50 transition-colors group"
          >
            <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center text-orange-500 group-hover:bg-orange-100 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Voir ma boutique</p>
              <p className="text-xs text-gray-400">{store?.slug}.shopforge.tech</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title, value, sub, accent, icon, href, change,
}: {
  title: string;
  value: string | number;
  sub: string;
  accent: 'green' | 'blue' | 'yellow' | 'purple' | 'gray';
  icon: string;
  href?: string;
  change?: number;
}) {
  const accents = {
    green:  { bg: 'bg-green-50',  text: 'text-green-700',  icon: 'bg-green-100 text-green-600' },
    blue:   { bg: 'bg-blue-50',   text: 'text-blue-700',   icon: 'bg-blue-100 text-blue-600' },
    yellow: { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: 'bg-yellow-100 text-yellow-600' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-700', icon: 'bg-purple-100 text-purple-600' },
    gray:   { bg: 'bg-white',     text: 'text-gray-700',   icon: 'bg-gray-100 text-gray-500' },
  };
  const c = accents[accent];

  const card = (
    <div className={`${c.bg} rounded-xl p-5 border border-transparent hover:shadow-sm transition-shadow`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</p>
        <span className={`w-7 h-7 rounded-lg ${c.icon} flex items-center justify-center text-sm`}>{icon}</span>
      </div>
      <p className={`text-2xl font-bold ${c.text}`}>{value}</p>
      <div className="flex items-center gap-2 mt-1">
        <p className="text-xs text-gray-400">{sub}</p>
        {change !== undefined && !isNaN(change) && isFinite(change) && (
          <span className={`text-xs font-semibold ${change >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );

  return href ? <Link href={href}>{card}</Link> : card;
}

function ReadinessItem({ done, label, href, note }: { done: boolean; label: string; href: string; note?: string }) {
  return (
    <Link href={href} className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${done ? 'bg-green-50 cursor-default pointer-events-none' : 'bg-white border border-gray-100 hover:border-amber-300'}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
        {done ? '✓' : '○'}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${done ? 'text-green-700 line-through' : 'text-gray-900'}`}>{label}</p>
        {note && !done && <p className="text-xs text-amber-600 mt-0.5">{note}</p>}
      </div>
      {!done && <span className="text-gray-400 text-xs shrink-0">→</span>}
    </Link>
  );
}
