'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/admin-api';
import { PageHeader, SearchInput, Badge, Spinner } from '@/components/admin/AdminUI';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { useToast } from '@/components/admin/Toast';
import { Plan, PLAN_LABELS, PLAN_BADGE_COLORS } from '@/components/admin/AdminConstants';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: Plan;
  isActive: boolean;
  createdAt: string;
  _count: { users: number; products: number; orders: number };
}

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState<{ id: string; name: string; active: boolean } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchTenants();
  }, []);

  async function fetchTenants() {
    try {
      const { data } = await adminApi.get('/tenants');
      setTenants(data);
    } finally {
      setLoading(false);
    }
  }

  async function toggleTenant(id: string) {
    setActionId(id);
    setConfirm(null);
    try {
      const { data } = await adminApi.patch(`/tenants/${id}/toggle`);
      setTenants((prev) =>
        prev.map((t) => (t.id === id ? { ...t, isActive: data.isActive } : t)),
      );
      toast('success', data.isActive ? 'Boutique reactivee' : 'Boutique suspendue');
    } catch {
      toast('error', 'Erreur lors de la modification');
    } finally {
      setActionId(null);
    }
  }

  async function updatePlan(id: string, plan: Plan) {
    setActionId(id);
    try {
      const { data } = await adminApi.patch(`/tenants/${id}/plan`, { plan });
      setTenants((prev) =>
        prev.map((t) => (t.id === id ? { ...t, plan: data.plan } : t)),
      );
      toast('success', `Plan mis a jour vers ${PLAN_LABELS[plan]}`);
    } catch {
      toast('error', 'Erreur lors du changement de plan');
    } finally {
      setActionId(null);
    }
  }

  const filtered = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader title="Boutiques" subtitle={`${tenants.length} boutique${tenants.length > 1 ? 's' : ''} enregistree${tenants.length > 1 ? 's' : ''}`} />

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Rechercher par nom ou slug..."
        className="mb-4"
      />

      {/* Table */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Boutique</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Plan</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Produits</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Commandes</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Users</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-500">
                    Aucune boutique trouvee
                  </td>
                </tr>
              )}
              {filtered.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/tenants/${tenant.id}`}
                      className="text-gray-900 font-medium hover:text-indigo-600 transition-colors"
                    >
                      {tenant.name}
                    </Link>
                    <p className="text-gray-500 text-xs font-mono">{tenant.slug}.shopforge.tech</p>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={tenant.plan}
                      disabled={actionId === tenant.id}
                      onChange={(e) => updatePlan(tenant.id, e.target.value as Plan)}
                      className={`text-xs font-medium px-2.5 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 ${PLAN_BADGE_COLORS[tenant.plan]}`}
                    >
                      {(Object.keys(PLAN_LABELS) as Plan[]).map((p) => (
                        <option key={p} value={p} className="bg-white text-gray-900">
                          {PLAN_LABELS[p]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-700">{tenant._count.products}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{tenant._count.orders}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{tenant._count.users}</td>
                  <td className="px-4 py-3">
                    <Badge
                      label={tenant.isActive ? 'Active' : 'Suspendue'}
                      color={tenant.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}
                      dot
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setConfirm({ id: tenant.id, name: tenant.name, active: tenant.isActive })}
                      disabled={actionId === tenant.id}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                        tenant.isActive
                          ? 'bg-red-50 text-red-600 hover:bg-red-100'
                          : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                      }`}
                    >
                      {actionId === tenant.id ? '...' : tenant.isActive ? 'Suspendre' : 'Activer'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.active ? 'Suspendre la boutique' : 'Reactiver la boutique'}
        message={confirm ? `Voulez-vous ${confirm.active ? 'suspendre' : 'reactiver'} la boutique "${confirm.name}" ?` : ''}
        confirmLabel={confirm?.active ? 'Suspendre' : 'Reactiver'}
        variant={confirm?.active ? 'danger' : 'success'}
        loading={!!actionId}
        onConfirm={() => confirm && toggleTenant(confirm.id)}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
