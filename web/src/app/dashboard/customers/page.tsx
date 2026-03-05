'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '@/lib/api';
import Pagination from '@/components/Pagination';
import PageHeader from '@/components/dashboard/PageHeader';
import LoadingSkeleton from '@/components/dashboard/LoadingSkeleton';
import { GOVERNORATES } from '@/lib/governorates';

/* ── Types ──────────────────────────────────────────────────────────── */

interface Tag { id: string; name: string; color: string }
interface Address {
  id: string; label: string | null; line1: string; line2: string | null;
  city: string; governorate: string; postalCode: string | null; isDefault: boolean;
}
interface CustomerOrder {
  id: string; orderNumber: string; status: string; totalAmount: string; createdAt: string;
}
interface Customer {
  id: string; firstName: string; lastName: string; phone: string;
  email: string | null; company: string | null; matriculeFiscal: string | null;
  source: string; status: string; totalSpent: string; orderCount: number;
  lastOrderAt: string | null; notes: string | null; createdAt: string;
  tags: Tag[]; addresses: Address[];
}
interface Stats {
  totalCustomers: number; newThisMonth: number; activeCustomers: number; averageOrderValue: number;
}
interface SegmentCounts { [key: string]: number }

const SEGMENTS = [
  { key: 'ALL', label: 'Tous' },
  { key: 'NEW', label: 'Nouveaux' },
  { key: 'ACTIVE', label: 'Actifs' },
  { key: 'VIP', label: 'VIP' },
  { key: 'AT_RISK', label: 'À risque' },
  { key: 'INACTIVE', label: 'Inactifs' },
];

const SEGMENT_COLORS: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-700',
  ACTIVE: 'bg-green-100 text-green-700',
  VIP: 'bg-purple-100 text-purple-700',
  AT_RISK: 'bg-orange-100 text-orange-700',
  INACTIVE: 'bg-gray-100 text-gray-500',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  SHIPPED: 'bg-indigo-100 text-indigo-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  RETURNED: 'bg-orange-100 text-orange-700',
  REFUNDED: 'bg-gray-100 text-gray-600',
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState('ALL');
  const [tagFilter, setTagFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [stats, setStats] = useState<Stats | null>(null);
  const [segmentCounts, setSegmentCounts] = useState<SegmentCounts>({});
  const [tags, setTags] = useState<Tag[]>([]);

  // Drawer
  const [selected, setSelected] = useState<Customer | null>(null);
  const [drawerTab, setDrawerTab] = useState<'profile' | 'orders' | 'addresses'>('profile');
  const [drawerOrders, setDrawerOrders] = useState<CustomerOrder[]>([]);
  const [drawerOrdersPage, setDrawerOrdersPage] = useState(1);
  const [drawerOrdersTotal, setDrawerOrdersTotal] = useState(0);
  const [editNotes, setEditNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ firstName: '', lastName: '', phone: '', email: '', company: '', matriculeFiscal: '' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Tag management
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#6366f1');

  // Address modal
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState({ label: '', line1: '', line2: '', city: '', governorate: '', postalCode: '', isDefault: false });
  const [savingAddress, setSavingAddress] = useState(false);

  // Sorting
  const [sortBy, setSortBy] = useState<'name' | 'orders' | 'spent' | 'lastOrder' | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(col); setSortDir('asc'); }
  };

  const sortedCustomers = useMemo(() => {
    if (!sortBy) return customers;
    return [...customers].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      else if (sortBy === 'orders') cmp = a.orderCount - b.orderCount;
      else if (sortBy === 'spent') cmp = Number(a.totalSpent) - Number(b.totalSpent);
      else if (sortBy === 'lastOrder') cmp = (a.lastOrderAt ?? '').localeCompare(b.lastOrderAt ?? '');
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }, [customers, sortBy, sortDir]);

  /* ── Load ──────────────────────────────────────────────────────────── */

  const loadCustomers = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: '20' });
      if (search) params.set('search', search);
      if (segment !== 'ALL') params.set('segment', segment);
      if (tagFilter) params.set('tagId', tagFilter);
      const { data } = await api.get(`/customers?${params}`);
      setCustomers(data.data);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, search, segment, tagFilter]);

  const loadMeta = useCallback(async () => {
    try {
      const [s, sc, t] = await Promise.all([
        api.get('/customers/stats'),
        api.get('/customers/segments'),
        api.get('/customers/tags'),
      ]);
      setStats(s.data);
      setSegmentCounts(sc.data);
      setTags(t.data);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { loadCustomers(); }, [loadCustomers]);
  useEffect(() => { loadMeta(); }, [loadMeta]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); loadCustomers(1); }, 400);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  /* ── Drawer helpers ────────────────────────────────────────────────── */

  const openDrawer = async (c: Customer) => {
    setSelected(c);
    setDrawerTab('profile');
    setEditNotes(c.notes || '');
    setDrawerOrdersPage(1);
    loadDrawerOrders(c.id, 1);
  };

  const loadDrawerOrders = async (customerId: string, p: number) => {
    try {
      const { data } = await api.get(`/customers/${customerId}/orders?page=${p}&limit=5`);
      setDrawerOrders(data.data);
      setDrawerOrdersTotal(data.total);
    } catch (e) { console.error(e); }
  };

  const refreshSelected = async (id: string) => {
    try {
      const { data } = await api.get(`/customers/${id}`);
      setSelected(data);
      setEditNotes(data.notes || '');
    } catch (e) { console.error(e); }
  };

  const handleSaveNotes = async () => {
    if (!selected) return;
    setSavingNotes(true);
    try {
      await api.patch(`/customers/${selected.id}/notes`, { notes: editNotes });
      await refreshSelected(selected.id);
    } catch (e) { console.error(e); }
    finally { setSavingNotes(false); }
  };

  const handleAddTag = async (tagId: string) => {
    if (!selected) return;
    try {
      await api.post(`/customers/${selected.id}/tags`, { tagId });
      await refreshSelected(selected.id);
      loadMeta();
    } catch (e) { console.error(e); }
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!selected) return;
    try {
      await api.delete(`/customers/${selected.id}/tags/${tagId}`);
      await refreshSelected(selected.id);
      loadMeta();
    } catch (e) { console.error(e); }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    try {
      await api.post('/customers/tags', { name: newTagName.trim(), color: newTagColor });
      setNewTagName('');
      loadMeta();
    } catch (e) { console.error(e); }
  };

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm('Supprimer ce tag ?')) return;
    try {
      await api.delete(`/customers/tags/${tagId}`);
      if (tagFilter === tagId) setTagFilter('');
      loadMeta();
      loadCustomers();
    } catch (e) { console.error(e); }
  };

  /* ── Create customer ──────────────────────────────────────────────── */

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      await api.post('/customers', {
        firstName: createForm.firstName,
        lastName: createForm.lastName,
        phone: createForm.phone,
        ...(createForm.email ? { email: createForm.email } : {}),
        ...(createForm.company ? { company: createForm.company } : {}),
        ...(createForm.matriculeFiscal ? { matriculeFiscal: createForm.matriculeFiscal } : {}),
      });
      setShowCreate(false);
      setCreateForm({ firstName: '', lastName: '', phone: '', email: '', company: '', matriculeFiscal: '' });
      loadCustomers();
      loadMeta();
    } catch (err: any) {
      setCreateError(err?.response?.data?.message || 'Erreur lors de la création');
    } finally { setCreating(false); }
  };

  /* ── Address CRUD ──────────────────────────────────────────────────── */

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSavingAddress(true);
    try {
      await api.post(`/customers/${selected.id}/addresses`, {
        label: addressForm.label || undefined,
        line1: addressForm.line1,
        line2: addressForm.line2 || undefined,
        city: addressForm.city,
        governorate: addressForm.governorate,
        postalCode: addressForm.postalCode || undefined,
        isDefault: addressForm.isDefault,
      });
      setShowAddressForm(false);
      setAddressForm({ label: '', line1: '', line2: '', city: '', governorate: '', postalCode: '', isDefault: false });
      await refreshSelected(selected.id);
    } catch (e) { console.error(e); }
    finally { setSavingAddress(false); }
  };

  const handleRemoveAddress = async (addressId: string) => {
    if (!selected || !confirm('Supprimer cette adresse ?')) return;
    try {
      await api.delete(`/customers/${selected.id}/addresses/${addressId}`);
      await refreshSelected(selected.id);
    } catch (e) { console.error(e); }
  };

  /* ── Segment for a customer ─────────────────────────────────────── */

  const getSegment = (c: Customer): string => {
    const now = Date.now();
    const created = new Date(c.createdAt).getTime();
    const lastOrder = c.lastOrderAt ? new Date(c.lastOrderAt).getTime() : 0;
    const daysSinceCreated = (now - created) / 86400000;
    const daysSinceLastOrder = lastOrder ? (now - lastOrder) / 86400000 : Infinity;
    if (c.orderCount > 10 || Number(c.totalSpent) > 1000) return 'VIP';
    if (daysSinceCreated < 30) return 'NEW';
    if (daysSinceLastOrder < 60) return 'ACTIVE';
    if (daysSinceLastOrder <= 120) return 'AT_RISK';
    return 'INACTIVE';
  };

  /* ── CSV Export ─────────────────────────────────────────────────── */

  const handleExport = async () => {
    try {
      const { data } = await api.get('/customers/export/csv', { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const a = document.createElement('a'); a.href = url; a.download = 'clients.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error(e); }
  };

  /* ── Render ──────────────────────────────────────────────────────── */

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        subtitle={stats ? `${stats.totalCustomers} client${stats.totalCustomers !== 1 ? 's' : ''}` : ''}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={handleExport}
              className="border border-gray-200 text-gray-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              Exporter CSV
            </button>
            <button onClick={() => { setShowCreate(true); setCreateError(''); }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              + Nouveau client
            </button>
          </div>
        }
      />

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total clients', value: stats.totalCustomers, color: 'text-gray-900' },
            { label: 'Nouveaux ce mois', value: stats.newThisMonth, color: 'text-blue-600' },
            { label: 'Clients actifs', value: stats.activeCustomers, color: 'text-green-600' },
            { label: 'Panier moyen', value: `${stats.averageOrderValue.toFixed(2)} TND`, color: 'text-purple-600' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl shadow-sm p-4">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        {/* Segments */}
        <div className="flex flex-wrap gap-2">
          {SEGMENTS.map((s) => {
            const count = s.key === 'ALL' ? total : (segmentCounts[s.key] ?? 0);
            return (
              <button key={s.key} onClick={() => { setSegment(s.key); setPage(1); }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  segment === s.key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {s.label} <span className="ml-1 opacity-60">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Tags + Search */}
        <div className="flex flex-wrap items-center gap-2">
          {tags.map((t) => (
            <button key={t.id} onClick={() => { setTagFilter(tagFilter === t.id ? '' : t.id); setPage(1); }}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                tagFilter === t.id ? 'ring-2 ring-offset-1 ring-gray-400' : ''
              }`}
              style={{ backgroundColor: `${t.color}20`, color: t.color, borderColor: `${t.color}40` }}>
              {t.name}
            </button>
          ))}
          <div className="flex-1 min-w-[200px]">
            <input
              type="search" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher nom, téléphone, email..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <LoadingSkeleton type="table" rows={8} />
        ) : customers.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl text-gray-300">▲</span>
            </div>
            <p className="text-gray-900 font-medium mb-1">{search || segment !== 'ALL' || tagFilter ? 'Aucun client trouvé' : 'Aucun client'}</p>
            <p className="text-gray-400 text-sm">{search || segment !== 'ALL' || tagFilter ? 'Essayez avec d\'autres filtres.' : 'Vos clients apparaîtront ici après leur première commande.'}</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none" onClick={() => toggleSort('name')}>
                    Client {sortBy === 'name' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Tags</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none" onClick={() => toggleSort('orders')}>
                    Commandes {sortBy === 'orders' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none" onClick={() => toggleSort('spent')}>
                    Total dépensé {sortBy === 'spent' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Segment</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell cursor-pointer hover:text-gray-700 select-none" onClick={() => toggleSort('lastOrder')}>
                    Dernière commande {sortBy === 'lastOrder' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sortedCustomers.map((c) => {
                  const seg = getSegment(c);
                  return (
                    <tr key={c.id} onClick={() => openDrawer(c)}
                      className="hover:bg-gray-50 transition-colors cursor-pointer">
                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900">{c.firstName} {c.lastName}</p>
                        <p className="text-xs text-gray-400">{c.phone}</p>
                        {c.email && <p className="text-xs text-gray-400">{c.email}</p>}
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {c.tags.map((t, i) => (
                            <span key={t.id ?? t.name ?? i} className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                              style={{ backgroundColor: `${t.color}20`, color: t.color }}>
                              {t.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                          {c.orderCount}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-gray-900">
                        {Number(c.totalSpent).toFixed(2)} TND
                      </td>
                      <td className="px-5 py-4 text-center hidden lg:table-cell">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${SEGMENT_COLORS[seg] || 'bg-gray-100 text-gray-500'}`}>
                          {SEGMENTS.find((s) => s.key === seg)?.label || seg}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right text-gray-400 text-xs hidden lg:table-cell">
                        {c.lastOrderAt
                          ? new Date(c.lastOrderAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-5 pb-3">
              <Pagination page={page} totalPages={totalPages} total={total} onPageChange={(p) => { setPage(p); }} />
            </div>
          </>
        )}
      </div>

      {/* ── Create modal ──────────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Nouveau client</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleCreate} className="px-6 py-4 space-y-3">
              {createError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{createError}</div>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Prénom *</label>
                  <input type="text" value={createForm.firstName} onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nom *</label>
                  <input type="text" value={createForm.lastName} onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Téléphone *</label>
                <input type="tel" value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="+216 XX XXX XXX" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Optionnel" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Entreprise</label>
                  <input type="text" value={createForm.company} onChange={(e) => setCreateForm({ ...createForm, company: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Optionnel" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Matricule fiscal</label>
                  <input type="text" value={createForm.matriculeFiscal} onChange={(e) => setCreateForm({ ...createForm, matriculeFiscal: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="B2B" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={creating}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {creating ? 'Création...' : 'Créer le client'}
                </button>
                <button type="button" onClick={() => setShowCreate(false)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Customer Drawer ────────────────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30" onClick={() => setSelected(null)} />
          <div className="w-full max-w-lg bg-white shadow-xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{selected.firstName} {selected.lastName}</h2>
                <p className="text-sm text-gray-500">{selected.phone}</p>
                {selected.email && <p className="text-xs text-gray-400">{selected.email}</p>}
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${SEGMENT_COLORS[getSegment(selected)] || 'bg-gray-100 text-gray-500'}`}>
                    {SEGMENTS.find((s) => s.key === getSegment(selected))?.label}
                  </span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${selected.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {selected.status === 'ACTIVE' ? 'Actif' : 'Inactif'}
                  </span>
                  <span className="text-xs text-gray-400">Source: {selected.source === 'CHECKOUT' ? 'Commande' : selected.source === 'MANUAL' ? 'Manuel' : 'Import'}</span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100">
              {(['profile', 'orders', 'addresses'] as const).map((tab) => (
                <button key={tab} onClick={() => setDrawerTab(tab)}
                  className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${
                    drawerTab === tab ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  {tab === 'profile' ? 'Profil' : tab === 'orders' ? `Commandes (${selected.orderCount})` : `Adresses (${selected.addresses.length})`}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* ── Profile tab ──────────────────────────────────────── */}
              {drawerTab === 'profile' && (
                <>
                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-gray-900">{selected.orderCount}</p>
                      <p className="text-[10px] text-gray-500 uppercase">Commandes</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-gray-900">{Number(selected.totalSpent).toFixed(0)}</p>
                      <p className="text-[10px] text-gray-500 uppercase">TND dépensé</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-gray-900">
                        {selected.orderCount > 0 ? (Number(selected.totalSpent) / selected.orderCount).toFixed(0) : '—'}
                      </p>
                      <p className="text-[10px] text-gray-500 uppercase">Panier moyen</p>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 text-sm">
                    {selected.company && (
                      <div className="flex justify-between"><span className="text-gray-500">Entreprise</span><span className="font-medium">{selected.company}</span></div>
                    )}
                    {selected.matriculeFiscal && (
                      <div className="flex justify-between"><span className="text-gray-500">Matricule fiscal</span><span className="font-mono">{selected.matriculeFiscal}</span></div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-500">Client depuis</span>
                      <span>{new Date(selected.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tags</p>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {selected.tags.map((t) => (
                        <span key={t.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{ backgroundColor: `${t.color}20`, color: t.color }}>
                          {t.name}
                          <button onClick={() => handleRemoveTag(t.id)} className="hover:opacity-70">&times;</button>
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {tags.filter((t) => !selected.tags.some((st) => st.id === t.id)).map((t) => (
                        <button key={t.id} onClick={() => handleAddTag(t.id)}
                          className="px-2 py-0.5 rounded-full text-[10px] font-medium border border-dashed transition-colors hover:opacity-80"
                          style={{ color: t.color, borderColor: `${t.color}60` }}>
                          + {t.name}
                        </button>
                      ))}
                    </div>
                    {/* Create new tag */}
                    <div className="flex items-center gap-2 mt-3">
                      <input type="color" value={newTagColor} onChange={(e) => setNewTagColor(e.target.value)}
                        className="w-7 h-7 rounded border-0 cursor-pointer" />
                      <input type="text" value={newTagName} onChange={(e) => setNewTagName(e.target.value)}
                        placeholder="Nouveau tag..." className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <button onClick={handleCreateTag} disabled={!newTagName.trim()}
                        className="text-xs text-blue-600 font-medium hover:underline disabled:opacity-30">Créer</button>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Notes</p>
                    <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)}
                      rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Notes internes sur ce client..." />
                    {editNotes !== (selected.notes || '') && (
                      <button onClick={handleSaveNotes} disabled={savingNotes}
                        className="mt-1 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                        {savingNotes ? 'Enregistrement...' : 'Enregistrer'}
                      </button>
                    )}
                  </div>

                  {/* Tag management */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Gestion des tags</p>
                    <div className="space-y-1">
                      {tags.map((t) => (
                        <div key={t.id} className="flex items-center justify-between py-1">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                            <span className="text-sm">{t.name}</span>
                          </div>
                          <button onClick={() => handleDeleteTag(t.id)} className="text-[10px] text-red-400 hover:text-red-600">Supprimer</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* ── Orders tab ──────────────────────────────────────── */}
              {drawerTab === 'orders' && (
                <>
                  {drawerOrders.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">Aucune commande.</p>
                  ) : (
                    <div className="space-y-2">
                      {drawerOrders.map((o) => (
                        <div key={o.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium text-gray-900 font-mono">{o.orderNumber}</p>
                            <p className="text-xs text-gray-400">
                              {new Date(o.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[o.status] || 'bg-gray-100 text-gray-500'}`}>
                              {o.status}
                            </span>
                            <p className="text-sm font-semibold text-gray-900 mt-1">{Number(o.totalAmount).toFixed(2)} TND</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {drawerOrdersTotal > 5 && (
                    <div className="flex justify-center gap-2 pt-2">
                      <button disabled={drawerOrdersPage <= 1}
                        onClick={() => { const p = drawerOrdersPage - 1; setDrawerOrdersPage(p); loadDrawerOrders(selected.id, p); }}
                        className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-30">&larr; Précédent</button>
                      <span className="text-xs text-gray-400">Page {drawerOrdersPage}</span>
                      <button disabled={drawerOrdersPage * 5 >= drawerOrdersTotal}
                        onClick={() => { const p = drawerOrdersPage + 1; setDrawerOrdersPage(p); loadDrawerOrders(selected.id, p); }}
                        className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-30">Suivant &rarr;</button>
                    </div>
                  )}
                </>
              )}

              {/* ── Addresses tab ────────────────────────────────────── */}
              {drawerTab === 'addresses' && (
                <>
                  {selected.addresses.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">Aucune adresse enregistrée.</p>
                  ) : (
                    <div className="space-y-2">
                      {selected.addresses.map((a) => (
                        <div key={a.id} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              {a.label && <span className="text-xs font-semibold text-gray-700">{a.label}</span>}
                              {a.isDefault && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">Par défaut</span>}
                            </div>
                            <button onClick={() => handleRemoveAddress(a.id)} className="text-[10px] text-red-400 hover:text-red-600">Supprimer</button>
                          </div>
                          <p className="text-sm text-gray-900">{a.line1}</p>
                          {a.line2 && <p className="text-sm text-gray-500">{a.line2}</p>}
                          <p className="text-sm text-gray-500">{a.city}, {a.governorate} {a.postalCode || ''}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add address */}
                  {!showAddressForm ? (
                    <button onClick={() => setShowAddressForm(true)}
                      className="text-sm text-blue-600 font-medium hover:underline">
                      + Ajouter une adresse
                    </button>
                  ) : (
                    <form onSubmit={handleAddAddress} className="space-y-3 border border-gray-200 rounded-lg p-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase">Nouvelle adresse</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Label</label>
                          <input type="text" value={addressForm.label} onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Domicile" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Code postal</label>
                          <input type="text" value={addressForm.postalCode} onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value })}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Adresse *</label>
                        <input type="text" value={addressForm.line1} onChange={(e) => setAddressForm({ ...addressForm, line1: e.target.value })}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Complément</label>
                        <input type="text" value={addressForm.line2} onChange={(e) => setAddressForm({ ...addressForm, line2: e.target.value })}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Gouvernorat *</label>
                          <select value={addressForm.governorate} onChange={(e) => setAddressForm({ ...addressForm, governorate: e.target.value })}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" required>
                            <option value="">Sélectionner...</option>
                            {GOVERNORATES.map((g) => <option key={g} value={g}>{g}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Ville *</label>
                          <input type="text" value={addressForm.city} onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="isDefault" checked={addressForm.isDefault}
                          onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                        <label htmlFor="isDefault" className="text-sm text-gray-700">Adresse par défaut</label>
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" disabled={savingAddress}
                          className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                          {savingAddress ? 'Ajout...' : 'Ajouter'}
                        </button>
                        <button type="button" onClick={() => setShowAddressForm(false)}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                          Annuler
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
