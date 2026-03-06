'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/admin-api';
import { PageHeader, SectionCard, Badge, Spinner, EmptyState } from '@/components/admin/AdminUI';
import { SearchIcon, FilterIcon, FileTextIcon, BuildingIcon, CalendarIcon } from '@/components/admin/AdminIcons';

export default function AuditLogsPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [filters, setFilters] = useState({
    tenantId: '',
    action: '',
    entity: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    loadData();
  }, [pagination.page]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.tenantId && { tenantId: filters.tenantId }),
        ...(filters.action && { action: filters.action }),
        ...(filters.entity && { entity: filters.entity }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      });

      const { data } = await adminApi.get(`/audit-logs?${params}`);
      setLogs(data.data);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Erreur chargement logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data } = await adminApi.get('/audit-logs/stats');
      setStats(data);
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('create')) return 'emerald';
    if (action.includes('update') || action.includes('change')) return 'blue';
    if (action.includes('delete')) return 'red';
    return 'gray';
  };

  const applyFilters = () => {
    setPagination({ ...pagination, page: 1 });
    loadData();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="🛡️ Audit Logs" subtitle="Historique complet des actions sur la plateforme" />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm text-gray-600">Total (7j)</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalLogs}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm text-gray-600">Actions principales</p>
            <div className="mt-2 space-y-1">
              {stats.actionBreakdown?.slice(0, 3).map((item: any) => (
                <div key={item.action} className="text-xs flex justify-between">
                  <span className="truncate">{item.action}</span>
                  <span className="font-semibold">{item._count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm text-gray-600">Entités modifiées</p>
            <div className="mt-2 space-y-1">
              {stats.entityBreakdown?.slice(0, 3).map((item: any) => (
                <div key={item.entity} className="text-xs flex justify-between">
                  <span className="truncate">{item.entity}</span>
                  <span className="font-semibold">{item._count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm text-gray-600">Tenants actifs</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">{stats.mostActiveTenants?.length || 0}</p>
          </div>
        </div>
      )}

      {/* Filtres */}
      <SectionCard title="Filtres">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tenant ID</label>
            <input
              type="text"
              value={filters.tenantId}
              onChange={(e) => setFilters({ ...filters, tenantId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="ID du tenant"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
            <input
              type="text"
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="ex: order.status_change"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Entité</label>
            <select
              value={filters.entity}
              onChange={(e) => setFilters({ ...filters, entity: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Toutes</option>
              <option value="Order">Order</option>
              <option value="Product">Product</option>
              <option value="Tenant">Tenant</option>
              <option value="User">User</option>
              <option value="Customer">Customer</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date début</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date fin</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={applyFilters}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Appliquer
            </button>
            <button
              onClick={() => {
                setFilters({ tenantId: '', action: '', entity: '', startDate: '', endDate: '' });
                setPagination({ ...pagination, page: 1 });
              }}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Réinitialiser
            </button>
          </div>
        </div>
      </SectionCard>

      {/* Logs */}
      <SectionCard title={`Logs (${pagination.total} au total)`} subtitle={`Page ${pagination.page} sur ${pagination.totalPages}`}>
        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : logs.length === 0 ? (
          <EmptyState icon={<FileTextIcon size={40} />} title="Aucun log trouvé" subtitle="Essayez de modifier les filtres" />
        ) : (
          <div className="space-y-3">
            {logs.map((log: any) => (
              <div key={log.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge label={log.action.split('.')[1]?.toUpperCase() || 'ACTION'} color={getActionColor(log.action)} />
                      <span className="font-semibold">{log.entity}</span>
                      {log.entityId && <span className="text-xs text-gray-500">#{log.entityId.slice(0, 8)}</span>}
                    </div>
                    {log.tenant && (
                      <p className="text-sm text-gray-600 mb-2">
                        🏪 {log.tenant.name} ({log.tenant.slug})
                      </p>
                    )}
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <p>{new Date(log.createdAt).toLocaleDateString('fr-FR')}</p>
                    <p className="text-xs">{new Date(log.createdAt).toLocaleTimeString('fr-FR')}</p>
                    {log.ip && <p className="text-xs font-mono">{log.ip}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              disabled={pagination.page === 1}
              className="px-3 py-1 border rounded-md disabled:opacity-50"
            >
              ←
            </button>
            <span className="text-sm">
              Page {pagination.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              disabled={pagination.page === pagination.totalPages}
              className="px-3 py-1 border rounded-md disabled:opacity-50"
            >
              →
            </button>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
