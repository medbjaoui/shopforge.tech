'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminApi } from '@/lib/admin-api';
import { PageHeader, KpiCard, Badge, Spinner, SectionCard } from '@/components/admin/AdminUI';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { useToast } from '@/components/admin/Toast';
import { StoreIcon, ChartIcon, WalletIcon } from '@/components/admin/AdminIcons';
import {
  Plan, PLAN_LABELS, PLAN_BADGE_COLORS, ROLE_COLORS, UserRole,
  OrderStatus, STATUS_COLORS, STATUS_LABELS, formatTnd, formatDate,
} from '@/components/admin/AdminConstants';

interface TenantDetail {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  plan: Plan;
  isActive: boolean;
  createdAt: string;
  totalRevenue: number | string;
  _count: { users: number; products: number; orders: number };
  users: Array<{
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: UserRole;
    isActive: boolean;
    createdAt: string;
  }>;
  orders: Array<{
    id: string;
    orderNumber: string;
    status: OrderStatus;
    totalAmount: number | string;
    customerName: string;
    customerEmail: string;
    createdAt: string;
  }>;
}

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { toast } = useToast();

  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<Plan | null>(null);

  // Domain state
  const [domainInput, setDomainInput] = useState('');
  const [domainSaving, setDomainSaving] = useState(false);
  const [cnameTarget, setCnameTarget] = useState('');

  useEffect(() => {
    adminApi.get(`/tenants/${id}`).then(({ data }) => {
      setTenant(data);
      setDomainInput(data.domain ?? '');
      setLoading(false);
    }).catch(() => {
      setLoading(false);
      router.push('/admin/tenants');
    });
    adminApi.get('/cloudflare/cname-target').then(({ data }) => {
      setCnameTarget(data.cnameTarget ?? '');
    }).catch(() => {});
  }, [id, router]);

  async function toggle() {
    if (!tenant) return;
    setActionLoading(true);
    setConfirm(false);
    try {
      const { data } = await adminApi.patch(`/tenants/${id}/toggle`);
      setTenant((t) => t ? { ...t, isActive: data.isActive } : t);
      toast('success', data.isActive ? 'Boutique reactivee' : 'Boutique suspendue');
    } catch {
      toast('error', 'Erreur lors de la modification');
    } finally {
      setActionLoading(false);
    }
  }

  async function updatePlan(plan: Plan) {
    setActionLoading(true);
    try {
      const { data } = await adminApi.patch(`/tenants/${id}/plan`, { plan });
      setTenant((t) => t ? { ...t, plan: data.plan } : t);
      toast('success', `Plan mis a jour vers ${PLAN_LABELS[plan]}`);
    } catch {
      toast('error', 'Erreur lors du changement de plan');
    } finally {
      setActionLoading(false);
    }
  }

  async function saveDomain() {
    setDomainSaving(true);
    const newDomain = domainInput.trim().toLowerCase() || null;
    try {
      await adminApi.patch(`/tenants/${id}/domain`, { domain: newDomain });
      setTenant((t) => t ? { ...t, domain: newDomain } : t);
      toast('success', newDomain
        ? 'Domaine enregistré — tunnel Cloudflare configuré automatiquement'
        : 'Domaine supprimé');
    } catch (e: any) {
      toast('error', e?.response?.data?.message ?? 'Erreur lors de la sauvegarde');
    } finally {
      setDomainSaving(false);
    }
  }

  if (loading) return <Spinner />;
  if (!tenant) return null;

  return (
    <div>
      <PageHeader
        title={tenant.name}
        breadcrumb={[
          { label: 'Boutiques', href: '/admin/tenants' },
          { label: tenant.name },
        ]}
      >
        <Badge
          label={tenant.isActive ? 'Active' : 'Suspendue'}
          color={tenant.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}
          dot
        />
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="space-y-4">
          <SectionCard title="Informations">
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-500 text-xs mb-0.5">URL ShopForge</p>
                <p className="text-gray-900 font-mono">{tenant.slug}.shopforge.tech</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-0.5">Creee le</p>
                <p className="text-gray-900">{formatDate(tenant.createdAt)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-0.5">Plan</p>
                <select
                  value={tenant.plan}
                  disabled={actionLoading}
                  onChange={(e) => setPendingPlan(e.target.value as Plan)}
                  className={`text-xs font-medium px-2.5 py-1 rounded-full border-0 cursor-pointer focus:outline-none ${PLAN_BADGE_COLORS[tenant.plan]}`}
                >
                  {(['FREE', 'STARTER', 'PRO'] as Plan[]).map((p) => (
                    <option key={p} value={p} className="bg-white text-gray-900">{PLAN_LABELS[p]}</option>
                  ))}
                </select>
              </div>
            </div>
          </SectionCard>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <KpiCard label="Produits" value={String(tenant._count.products)} icon={<StoreIcon size={16} />} />
            <KpiCard label="Commandes" value={String(tenant._count.orders)} icon={<ChartIcon size={16} />} />
            <KpiCard label="Utilisateurs" value={String(tenant._count.users)} />
            <KpiCard label="CA total" value={formatTnd(Number(tenant.totalRevenue))} icon={<WalletIcon size={16} />} highlight />
          </div>

          {/* Domaine personnalisé */}
          <SectionCard title="Domaine personnalisé">
            <div className="space-y-3">
              {tenant.domain ? (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse flex-shrink-0" />
                  <span className="font-mono text-xs text-green-600 truncate">{tenant.domain}</span>
                </div>
              ) : (
                <p className="text-xs text-gray-500">Non configuré</p>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value.toLowerCase())}
                  placeholder="boutique.domain.com"
                  className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400 min-w-0"
                />
                <button
                  onClick={saveDomain}
                  disabled={domainSaving}
                  className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-medium disabled:opacity-50 transition-colors shrink-0"
                >
                  {domainSaving ? '...' : 'OK'}
                </button>
              </div>

              {cnameTarget && (
                <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1.5">
                  <p className="font-semibold text-gray-700">Instructions DNS marchand :</p>
                  <p>Créer un CNAME :</p>
                  <code className="block bg-gray-100 rounded px-2 py-1.5 font-mono text-blue-600 break-all">
                    {domainInput || 'boutique.domain.com'} → {cnameTarget}
                  </code>
                  <p className="text-gray-500">SSL automatique. Propagation : 5-30 min.</p>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Actions */}
          <SectionCard title="Actions">
            <button
              onClick={() => setConfirm(true)}
              disabled={actionLoading}
              className={`w-full text-sm font-medium px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50 ${
                tenant.isActive
                  ? 'bg-red-50 text-red-600 hover:bg-red-100'
                  : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
              }`}
            >
              {actionLoading ? '...' : tenant.isActive ? 'Suspendre la boutique' : 'Reactiver la boutique'}
            </button>
          </SectionCard>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Users */}
          <SectionCard title={`Utilisateurs (${tenant._count.users})`} noPadding>
            <div className="divide-y divide-gray-100">
              {tenant.users.length === 0 && (
                <p className="text-center text-gray-500 text-sm py-6">Aucun utilisateur</p>
              )}
              {tenant.users.map((u) => (
                <div key={u.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm text-gray-900 font-medium">
                      {u.firstName} {u.lastName || ''}
                      {!u.firstName && !u.lastName && <span className="text-gray-400">Sans nom</span>}
                    </p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge label={u.role} color={ROLE_COLORS[u.role]} />
                    {!u.isActive && <Badge label="inactif" color="bg-red-50 text-red-600" />}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Orders */}
          <SectionCard title={`Commandes recentes (${tenant._count.orders} total)`} noPadding>
            {tenant.orders.length === 0 ? (
              <p className="text-center text-gray-500 text-sm py-8">Aucune commande</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">N°</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Client</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Statut</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-gray-500">Montant</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-gray-500">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {tenant.orders.map((o) => (
                      <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 font-mono text-xs text-gray-400">{o.orderNumber}</td>
                        <td className="px-4 py-3">
                          <p className="text-gray-900 text-xs">{o.customerName}</p>
                          <p className="text-gray-500 text-xs">{o.customerEmail}</p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge label={STATUS_LABELS[o.status]} color={STATUS_COLORS[o.status]} />
                        </td>
                        <td className="px-5 py-3 text-right text-gray-900 text-xs font-mono">
                          {Number(o.totalAmount).toFixed(2)} TND
                        </td>
                        <td className="px-5 py-3 text-right text-gray-400 text-xs">{formatDate(o.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>
      </div>

      <ConfirmDialog
        open={confirm}
        title={tenant.isActive ? 'Suspendre la boutique' : 'Reactiver la boutique'}
        message={`Voulez-vous ${tenant.isActive ? 'suspendre' : 'reactiver'} la boutique "${tenant.name}" ?`}
        confirmLabel={tenant.isActive ? 'Suspendre' : 'Reactiver'}
        variant={tenant.isActive ? 'danger' : 'success'}
        loading={actionLoading}
        onConfirm={toggle}
        onCancel={() => setConfirm(false)}
      />

      <ConfirmDialog
        open={!!pendingPlan}
        title="Changer le plan"
        message={pendingPlan ? `Passer "${tenant.name}" de ${PLAN_LABELS[tenant.plan]} vers ${PLAN_LABELS[pendingPlan]} ?` : ''}
        confirmLabel="Confirmer"
        variant="default"
        loading={actionLoading}
        onConfirm={async () => {
          if (pendingPlan) await updatePlan(pendingPlan);
          setPendingPlan(null);
        }}
        onCancel={() => setPendingPlan(null)}
      />
    </div>
  );
}
