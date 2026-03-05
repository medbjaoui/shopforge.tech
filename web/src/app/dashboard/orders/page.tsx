'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Pagination from '@/components/Pagination';
import PageHeader from '@/components/dashboard/PageHeader';
import LoadingSkeleton from '@/components/dashboard/LoadingSkeleton';
import { imageUrl } from '@/lib/imageUrl';

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: string;
  product: { name: string; images: string[] };
  variant: { name: string } | null;
}

const PAYMENT_LABELS: Record<string, string> = {
  COD: 'Paiement à la livraison',
  BANK_TRANSFER: 'Virement bancaire',
  CLICK_TO_PAY: 'Carte bancaire (ClicToPay)',
  FLOUSSI: 'Mobile (Floussi)',
};

const PAYMENT_STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  PENDING:  { label: 'En attente', cls: 'bg-yellow-50 text-yellow-700' },
  PAID:     { label: 'Payé',       cls: 'bg-green-50 text-green-700' },
  FAILED:   { label: 'Échoué',     cls: 'bg-red-50 text-red-700' },
  REFUNDED: { label: 'Remboursé',  cls: 'bg-blue-50 text-blue-700' },
};

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  totalAmount: string;
  shippingFee: string | null;
  discountAmount: string | null;
  couponCode: string | null;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  notes: string | null;
  shippingAddress: Record<string, string> | null;
  returnReason: string | null;
  returnRequestedAt: string | null;
  refundAmount: string | null;
  refundedAt: string | null;
  exchangeReason: string | null;
  exchangeRequestedAt: string | null;
  exchangedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

interface TenantCarrier {
  id: string;
  carrierId: string;
  isDefault: boolean;
  carrier: { id: string; name: string; slug: string; logoUrl: string | null };
}

interface Shipment {
  id: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  status: string;
  rawStatus: string | null;
  lastSyncedAt: string | null;
  notes: string | null;
  carrier: { name: string; slug: string; logoUrl: string | null; apiType: string };
}

const ALL_STATUSES = ['ALL', 'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'EXCHANGE_REQUESTED', 'EXCHANGED', 'RETURN_REQUESTED', 'RETURNED', 'REFUNDED', 'CANCELLED'];

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  ALL:               { label: 'Toutes',            color: 'text-gray-600',   bg: 'bg-gray-100' },
  PENDING:           { label: 'En attente',        color: 'text-yellow-700', bg: 'bg-yellow-100' },
  CONFIRMED:         { label: 'Confirmé',          color: 'text-blue-700',   bg: 'bg-blue-100' },
  PROCESSING:        { label: 'En cours',          color: 'text-purple-700', bg: 'bg-purple-100' },
  SHIPPED:           { label: 'Expédié',           color: 'text-indigo-700', bg: 'bg-indigo-100' },
  DELIVERED:         { label: 'Livré',             color: 'text-green-700',  bg: 'bg-green-100' },
  EXCHANGE_REQUESTED:{ label: 'Échange demandé',   color: 'text-violet-700', bg: 'bg-violet-100' },
  EXCHANGED:         { label: 'Échangé',           color: 'text-violet-900', bg: 'bg-violet-200' },
  RETURN_REQUESTED:  { label: 'Retour demandé',    color: 'text-orange-700', bg: 'bg-orange-100' },
  RETURNED:          { label: 'Retourné',          color: 'text-amber-700',  bg: 'bg-amber-100' },
  REFUNDED:          { label: 'Remboursé',         color: 'text-teal-700',   bg: 'bg-teal-100' },
  CANCELLED:         { label: 'Annulé',            color: 'text-red-700',    bg: 'bg-red-100' },
};

const SHIPMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  PICKED_UP: 'Pris en charge',
  IN_TRANSIT: 'En transit',
  OUT_FOR_DELIVERY: 'En livraison',
  DELIVERED: 'Livré',
  FAILED: 'Échec',
  RETURNED: 'Retourné',
};

const SHIPMENT_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  PICKED_UP: 'bg-blue-100 text-blue-700',
  IN_TRANSIT: 'bg-indigo-100 text-indigo-700',
  OUT_FOR_DELIVERY: 'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  RETURNED: 'bg-orange-100 text-orange-700',
};

const NEXT_STATUS: Record<string, string[]> = {
  PENDING:            ['CONFIRMED', 'CANCELLED'],
  CONFIRMED:          ['PROCESSING', 'CANCELLED'],
  PROCESSING:         ['SHIPPED', 'CANCELLED'],
  SHIPPED:            ['DELIVERED', 'CANCELLED'],  // retour géré séparément via formulaire
  DELIVERED:          [],                           // état quasi-terminal — échange géré séparément
  EXCHANGE_REQUESTED: ['EXCHANGED', 'DELIVERED'],  // confirmer ou annuler l'échange
  RETURN_REQUESTED:   ['RETURNED', 'SHIPPED'],     // confirmer ou rejeter le retour
  RETURNED:           ['REFUNDED'],
  REFUNDED:           [],
  EXCHANGED:          [],
  CANCELLED:          [],
};

const STATUS_FLOW = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function OrdersPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Order | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'ALL');

  // Expédition
  const [shipment, setShipment] = useState<Shipment | null | undefined>(undefined); // undefined = pas encore chargé
  const [myCarriers, setMyCarriers] = useState<TenantCarrier[]>([]);
  const [showShipmentForm, setShowShipmentForm] = useState(false);
  const [shipForm, setShipForm] = useState({ carrierId: '', trackingNumber: '', notes: '' });
  const [shipSaving, setShipSaving] = useState(false);
  const [shipError, setShipError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [statusError, setStatusError] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (selectedIds.size === orders.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(orders.map((o) => o.id)));
  };
  const handleBulkStatus = async (status: string) => {
    if (selectedIds.size === 0) return;
    if (status === 'CANCELLED' && !confirm(`Annuler ${selectedIds.size} commande(s) ?`)) return;
    setBulkLoading(true);
    try {
      await api.patch('/orders/bulk/status', { ids: Array.from(selectedIds), status });
      setSelectedIds(new Set());
      await load(statusFilter, search);
    } catch (e) { console.error(e); }
    finally { setBulkLoading(false); }
  };

  // Retour / Remboursement / Échange
  const [returnReason, setReturnReason] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [exchangeReason, setExchangeReason] = useState('');

  // Wallet lock
  const [walletLocked, setWalletLocked] = useState(false);

  // AI Response
  const [aiContext, setAiContext] = useState('confirmation');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const load = useCallback(async (status: string, q: string, p = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status && status !== 'ALL') params.set('status', status);
      if (q) params.set('q', q);
      params.set('page', String(p));
      params.set('limit', '20');
      const { data: res } = await api.get(`/orders?${params}`);
      setOrders(res.data);
      setTotalOrders(res.total);
      setTotalPages(res.totalPages);
      const orderId = searchParams.get('id');
      if (orderId) {
        const found = res.data.find((o: Order) => o.id === orderId);
        if (found) selectOrder(found);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [searchParams, page]); // eslint-disable-line

  // Charger les carriers + statut wallet au montage
  useEffect(() => {
    api.get('/shipping/my-carriers').then(({ data }) => setMyCarriers(data)).catch(() => {});
    api.get('/wallet').then(({ data }) => {
      if (data.balance < data.minimumBalance) setWalletLocked(true);
    }).catch(() => {});
  }, []);

  useEffect(() => { load(statusFilter, search); }, [statusFilter]); // eslint-disable-line

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load(statusFilter, search);
  };

  const selectOrder = async (order: Order) => {
    setSelected(order);
    setShipment(undefined);
    setShowShipmentForm(false);
    setShipError('');
    setStatusError('');
    setAiResponse('');
    setAiError('');
    // Pré-remplir le carrier par défaut
    const def = myCarriers.find((c) => c.isDefault) ?? myCarriers[0];
    setShipForm({ carrierId: def?.carrierId ?? '', trackingNumber: '', notes: '' });
    // Charger l'expédition de cette commande
    try {
      const { data } = await api.get(`/shipping/shipments/order/${order.id}`);
      setShipment(data ?? null);
    } catch {
      setShipment(null);
    }
  };

  const updateStatus = async (orderId: string, status: string) => {
    setUpdatingStatus(true);
    setStatusError('');
    try {
      await api.patch(`/orders/${orderId}/status`, { status });
      // Re-fetch la commande complète (avec items)
      const { data: refreshed } = await api.get(`/orders/${orderId}`);
      setSelected(refreshed);
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (search) params.set('q', search);
      params.set('page', String(page));
      params.set('limit', '20');
      const listRes = await api.get(`/orders?${params}`);
      setOrders(listRes.data.data ?? listRes.data);
      // Après passage en SHIPPED, rafraîchir l'expédition (auto-créée chez le transporteur)
      if (status === 'SHIPPED') {
        setShipment(undefined);
        try {
          const shipRes = await api.get(`/shipping/shipments/order/${orderId}`);
          setShipment(shipRes.data ?? null);
        } catch {
          setShipment(null);
        }
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? 'Erreur lors de la mise à jour';
      setStatusError(msg);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const createShipment = async () => {
    if (!selected || !shipForm.carrierId) { setShipError('Sélectionnez un transporteur'); return; }
    setShipSaving(true);
    setShipError('');
    try {
      const { data } = await api.post('/shipping/shipments', {
        orderId: selected.id,
        carrierId: shipForm.carrierId,
        trackingNumber: shipForm.trackingNumber || undefined,
        notes: shipForm.notes || undefined,
      });
      setShipment(data);
      setShowShipmentForm(false);
      // Rafraichir le statut de la commande (passe en SHIPPED)
      const updated = await api.get(`/orders/${selected.id}`);
      setSelected(updated.data);
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      const listRes = await api.get(`/orders?${params}`);
      setOrders(listRes.data);
    } catch (e: any) {
      setShipError(e?.response?.data?.message ?? 'Erreur lors de la création de l\'expédition');
    } finally {
      setShipSaving(false);
    }
  };

  const syncShipment = async () => {
    if (!shipment || !selected) return;
    setSyncing(true);
    try {
      const { data } = await api.post(`/shipping/shipments/${shipment.id}/sync`);
      setShipment((s) => s ? { ...s, status: data.status, rawStatus: data.rawStatus, lastSyncedAt: data.lastSyncedAt } : s);
    } catch {
      // silently ignore
    } finally {
      setSyncing(false);
    }
  };

  // Sorting
  const [sortBy, setSortBy] = useState<'date' | 'customer' | 'amount' | 'status' | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(col); setSortDir('asc'); }
  };

  const sortedOrders = useMemo(() => {
    if (!sortBy) return orders;
    return [...orders].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'date') cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      else if (sortBy === 'customer') cmp = a.customerName.localeCompare(b.customerName);
      else if (sortBy === 'amount') cmp = Number(a.totalAmount) - Number(b.totalAmount);
      else if (sortBy === 'status') cmp = a.status.localeCompare(b.status);
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }, [orders, sortBy, sortDir]);

  const totalAmount = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

  return (
    <div className="flex gap-5" style={{ height: 'calc(100vh - 8rem)' }}>
      {/* ── Liste commandes ── */}
      <div className={`flex flex-col min-w-0 ${selected ? 'hidden lg:flex lg:flex-1' : 'flex-1'}`}>
        <div className="mb-3">
          <PageHeader
            title="Commandes"
            subtitle={!loading ? `${orders.length} résultat${orders.length > 1 ? 's' : ''}${orders.length > 0 ? ` · ${totalAmount.toFixed(2)} TND` : ''}` : undefined}
            actions={
              <button
                onClick={async () => {
                  const { data } = await api.get('/orders/export/csv', { responseType: 'blob' });
                  const url = URL.createObjectURL(data);
                  const a = document.createElement('a'); a.href = url; a.download = 'commandes.csv'; a.click();
                  URL.revokeObjectURL(url);
                }}
                className="border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors shrink-0"
              >
                Exporter CSV
              </button>
            }
          />

          <div className="flex gap-1 flex-wrap mb-3">
            {ALL_STATUSES.map((s) => {
              const m = STATUS_META[s];
              const isActive = statusFilter === s;
              return (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive ? `${m.bg} ${m.color}` : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="Rechercher client, email, n° commande..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button type="submit" className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors">
              Chercher
            </button>
            {search && (
              <button type="button" onClick={() => { setSearch(''); load(statusFilter, ''); }}
                className="px-3 py-2 border border-gray-200 text-gray-500 text-sm rounded-lg hover:bg-gray-50">
                ×
              </button>
            )}
          </form>
        </div>

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="bg-gray-900 text-white rounded-xl px-4 py-2.5 mb-2 flex items-center justify-between">
            <span className="text-xs font-medium">{selectedIds.size} sélectionnée{selectedIds.size > 1 ? 's' : ''}</span>
            <div className="flex items-center gap-1.5">
              <button onClick={() => handleBulkStatus('CONFIRMED')} disabled={bulkLoading}
                className="px-2.5 py-1 bg-blue-600 rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50">Confirmer</button>
              <button onClick={() => handleBulkStatus('PROCESSING')} disabled={bulkLoading}
                className="px-2.5 py-1 bg-purple-600 rounded-lg text-xs font-medium hover:bg-purple-700 disabled:opacity-50">En cours</button>
              <button onClick={() => handleBulkStatus('SHIPPED')} disabled={bulkLoading}
                className="px-2.5 py-1 bg-indigo-600 rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50">Expédier</button>
              <button onClick={() => handleBulkStatus('DELIVERED')} disabled={bulkLoading}
                className="px-2.5 py-1 bg-green-600 rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50">Livrer</button>
              <button onClick={() => handleBulkStatus('CANCELLED')} disabled={bulkLoading}
                className="px-2.5 py-1 bg-red-600 rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50">Annuler</button>
              <button onClick={() => setSelectedIds(new Set())}
                className="px-2.5 py-1 border border-white/30 rounded-lg text-xs hover:bg-white/10">×</button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm flex-1 overflow-auto">
          {loading ? (
            <LoadingSkeleton type="table" rows={8} />
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl text-gray-300">◈</span>
              </div>
              <p className="text-gray-900 font-medium mb-1">Aucune commande</p>
              <p className="text-gray-400 text-sm">Les commandes apparaîtront ici.</p>
            </div>
          ) : (
            <>
            {/* ── Vue mobile : cards ── */}
            <div className="md:hidden divide-y divide-gray-50">
              {sortedOrders.map((o) => {
                const s = STATUS_META[o.status] ?? { label: o.status, color: 'text-gray-600', bg: 'bg-gray-100' };
                const date = new Date(o.createdAt);
                const itemCount = o.items.reduce((sum, i) => sum + i.quantity, 0);
                return (
                  <div key={o.id} onClick={() => selectOrder(o)}
                    className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors ${selectedIds.has(o.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                    <input type="checkbox" checked={selectedIds.has(o.id)} onChange={(e) => { e.stopPropagation(); toggleSelect(o.id); }}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 shrink-0" onClick={(e) => e.stopPropagation()} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className="text-xs font-mono text-gray-600 font-medium">{o.orderNumber}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${s.bg} ${s.color}`}>{s.label}</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 truncate">{o.customerName}</p>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-gray-400">
                          {date.toLocaleDateString('fr-TN')} · {itemCount} art.
                        </p>
                        <p className="text-sm font-bold text-gray-900">{Number(o.totalAmount).toFixed(2)} TND</p>
                      </div>
                    </div>
                    <span className="text-gray-300 text-sm shrink-0">›</span>
                  </div>
                );
              })}
            </div>

            {/* ── Vue desktop : table ── */}
            <table className="w-full hidden md:table">
              <thead className="sticky top-0 bg-white z-10 border-b border-gray-100">
                <tr>
                  <th className="px-3 py-3 w-10">
                    <input type="checkbox" checked={orders.length > 0 && selectedIds.size === orders.length} onChange={toggleAll}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none" onClick={() => toggleSort('date')}>
                    N° / Heure {sortBy === 'date' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none" onClick={() => toggleSort('customer')}>
                    Client {sortBy === 'customer' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none" onClick={() => toggleSort('amount')}>
                    Montant {sortBy === 'amount' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none" onClick={() => toggleSort('status')}>
                    Statut {sortBy === 'status' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sortedOrders.map((o) => {
                  const s = STATUS_META[o.status] ?? { label: o.status, color: 'text-gray-600', bg: 'bg-gray-100' };
                  const isSelected = selected?.id === o.id;
                  const date = new Date(o.createdAt);
                  const itemCount = o.items.reduce((sum, i) => sum + i.quantity, 0);
                  return (
                    <tr
                      key={o.id}
                      onClick={() => selectOrder(o)}
                      className={`cursor-pointer transition-colors ${selectedIds.has(o.id) ? 'bg-blue-50' : isSelected ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}
                    >
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedIds.has(o.id)} onChange={() => toggleSelect(o.id)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-mono text-gray-700 font-medium">{o.orderNumber}</p>
                        <p className="text-xs text-gray-400">
                          {date.toLocaleDateString('fr-TN')} {date.toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{o.customerName}</p>
                        <p className="text-xs text-gray-400 truncate max-w-[150px]">
                          {o.customerEmail} · {itemCount} art.
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-bold text-gray-900">{Number(o.totalAmount).toFixed(2)} TND</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${s.bg} ${s.color}`}>{s.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-4 pb-3">
              <Pagination page={page} totalPages={totalPages} total={totalOrders} onPageChange={(p) => { setPage(p); load(statusFilter, search, p); }} />
            </div>
            </>
          )}
        </div>
      </div>

      {/* ── Panneau détail ── */}
      {selected && (
        <div className="w-full lg:w-[420px] flex-shrink-0 bg-white rounded-xl shadow-sm flex flex-col overflow-hidden border border-gray-100">
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
            <div>
              <p className="font-mono text-sm font-bold text-gray-900">{selected.orderNumber}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(selected.createdAt).toLocaleDateString('fr-TN', {
                  weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
                })}
                {' '}à{' '}
                {new Date(selected.createdAt).toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <button
              onClick={() => { setSelected(null); router.replace('/dashboard/orders'); }}
              className="text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-xl"
            >
              ×
            </button>
          </div>

          {/* Wallet lock overlay */}
          {walletLocked && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50">
              <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center mb-4 text-2xl">🔒</div>
              <p className="font-semibold text-gray-900 mb-1">Commande verrouillée</p>
              <p className="text-sm text-gray-500 mb-4">
                Votre solde wallet est insuffisant. Rechargez votre compte pour accéder aux détails et traiter vos commandes.
              </p>
              <a href="/dashboard/wallet" className="px-4 py-2 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 transition-colors">
                Recharger mon wallet
              </a>
            </div>
          )}

          <div className={`flex-1 overflow-y-auto divide-y divide-gray-50 ${walletLocked ? 'hidden' : ''}`}>
            {/* Progression */}
            <div className="px-5 py-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Progression</p>
              {selected.status === 'CANCELLED' ? (
                <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-center">
                  <p className="text-sm text-red-600 font-medium">Commande annulée</p>
                </div>
              ) : (
                <>
                  <div className="flex gap-0.5 mb-1.5">
                    {STATUS_FLOW.map((s) => {
                      const currentIdx = STATUS_FLOW.indexOf(selected.status);
                      const idx = STATUS_FLOW.indexOf(s);
                      return (
                        <div
                          key={s}
                          className={`flex-1 h-2 rounded-full transition-colors ${
                            idx <= currentIdx ? 'bg-gray-900' : 'bg-gray-100'
                          }`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex justify-between">
                    {STATUS_FLOW.map((s) => {
                      const currentIdx = STATUS_FLOW.indexOf(selected.status);
                      const idx = STATUS_FLOW.indexOf(s);
                      return (
                        <span key={s} className={`text-xs ${idx <= currentIdx ? 'text-gray-700 font-medium' : 'text-gray-300'}`}>
                          {STATUS_META[s].label}
                        </span>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Actions statut */}
            {(() => {
              const CARRIER_LOCKED = ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'];
              const isCarrierLocked = !!shipment && CARRIER_LOCKED.includes(shipment.status);
              const canCancel = isCarrierLocked && ['FAILED', 'RETURNED'].includes(shipment?.status ?? '');
              const isShipped = selected.status === 'SHIPPED';
              const isDelivered = selected.status === 'DELIVERED';
              const isExchangeRequested = selected.status === 'EXCHANGE_REQUESTED';
              const isReturned = selected.status === 'RETURNED';
              const hasActions = NEXT_STATUS[selected.status]?.length > 0 || isShipped || isDelivered || isExchangeRequested || isReturned;

              if (!hasActions) return null;

              return (
                <div className="px-5 py-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Actions rapides</p>

                  {/* SHIPPED → Retour possible depuis expédition */}
                  {isShipped && (
                    <div className="space-y-2 mb-3 p-3 bg-orange-50 border border-orange-100 rounded-xl">
                      <p className="text-xs font-medium text-orange-700 mb-1">Initier un retour</p>
                      <input
                        type="text"
                        placeholder="Motif du retour..."
                        value={returnReason}
                        onChange={(e) => setReturnReason(e.target.value)}
                        className="w-full border border-orange-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                      />
                      <button
                        onClick={async () => {
                          if (!returnReason.trim()) { setStatusError('Motif requis'); return; }
                          setUpdatingStatus(true); setStatusError('');
                          try {
                            await api.patch(`/orders/${selected.id}/return`, { reason: returnReason });
                            const { data: refreshed } = await api.get(`/orders/${selected.id}`);
                            setSelected(refreshed); setReturnReason(''); await load(statusFilter, search);
                          } catch (e: any) { setStatusError(e?.response?.data?.message ?? 'Erreur'); }
                          finally { setUpdatingStatus(false); }
                        }}
                        disabled={updatingStatus}
                        className="w-full py-2 rounded-lg text-sm font-semibold bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 transition-all"
                      >
                        {updatingStatus ? '...' : 'Demander le retour'}
                      </button>
                    </div>
                  )}

                  {/* DELIVERED → Échange uniquement */}
                  {isDelivered && (
                    <div className="space-y-2 mb-3 p-3 bg-violet-50 border border-violet-100 rounded-xl">
                      <p className="text-xs font-medium text-violet-700 mb-1">🔄 Initier un échange</p>
                      <p className="text-xs text-violet-500 mb-2">Cette commande est livrée. Seul un échange est possible.</p>
                      <input
                        type="text"
                        placeholder="Motif de l'échange (taille, couleur...)"
                        value={exchangeReason}
                        onChange={(e) => setExchangeReason(e.target.value)}
                        className="w-full border border-violet-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
                      />
                      <button
                        onClick={async () => {
                          if (!exchangeReason.trim()) { setStatusError('Motif requis'); return; }
                          setUpdatingStatus(true); setStatusError('');
                          try {
                            await api.patch(`/orders/${selected.id}/exchange`, { reason: exchangeReason });
                            const { data: refreshed } = await api.get(`/orders/${selected.id}`);
                            setSelected(refreshed); setExchangeReason(''); await load(statusFilter, search);
                          } catch (e: any) { setStatusError(e?.response?.data?.message ?? 'Erreur'); }
                          finally { setUpdatingStatus(false); }
                        }}
                        disabled={updatingStatus}
                        className="w-full py-2 rounded-lg text-sm font-semibold bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition-all"
                      >
                        {updatingStatus ? '...' : 'Demander l\'échange'}
                      </button>
                    </div>
                  )}

                  {/* RETURNED → Remboursement */}
                  {isReturned && (
                    <div className="space-y-2 mb-3 p-3 bg-teal-50 border border-teal-100 rounded-xl">
                      <label className="block text-xs font-medium text-teal-700 mb-1">Montant remboursement (TND)</label>
                      <input
                        type="number" step="0.01" min="0"
                        max={Number(selected.totalAmount)}
                        placeholder={Number(selected.totalAmount).toFixed(2)}
                        value={refundAmount}
                        onChange={(e) => setRefundAmount(e.target.value)}
                        className="w-full border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                      />
                      <button
                        onClick={async () => {
                          const amt = parseFloat(refundAmount) || Number(selected.totalAmount);
                          setUpdatingStatus(true); setStatusError('');
                          try {
                            await api.patch(`/orders/${selected.id}/refund`, { amount: amt });
                            const { data: refreshed } = await api.get(`/orders/${selected.id}`);
                            setSelected(refreshed); setRefundAmount(''); await load(statusFilter, search);
                          } catch (e: any) { setStatusError(e?.response?.data?.message ?? 'Erreur'); }
                          finally { setUpdatingStatus(false); }
                        }}
                        disabled={updatingStatus}
                        className="w-full py-2 rounded-lg text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 transition-all"
                      >
                        {updatingStatus ? '...' : `Rembourser ${refundAmount ? parseFloat(refundAmount).toFixed(2) : Number(selected.totalAmount).toFixed(2)} TND`}
                      </button>
                    </div>
                  )}

                  {/* Boutons transitions standard */}
                  {isCarrierLocked && !canCancel && !isDelivered && !isExchangeRequested ? (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-700">
                      🔒 Verrouillé — le transporteur a pris en charge ce colis.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {(NEXT_STATUS[selected.status] ?? [])
                        .filter((s) => !isCarrierLocked || s === 'CANCELLED')
                        .filter((s) => !(isReturned && s === 'REFUNDED'))
                        .map((nextStatus) => {
                          const isCancel = nextStatus === 'CANCELLED';
                          const isNegative = isCancel || nextStatus === 'SHIPPED'; // SHIPPED = retour rejeté depuis RETURN_REQUESTED
                          const isExchangeConfirm = nextStatus === 'EXCHANGED';
                          const isExchangeReject = nextStatus === 'DELIVERED' && isExchangeRequested;
                          const isReturnReject = nextStatus === 'SHIPPED' && selected.status === 'RETURN_REQUESTED';
                          return (
                            <button
                              key={nextStatus}
                              onClick={() => updateStatus(selected.id, nextStatus)}
                              disabled={updatingStatus}
                              className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 ${
                                isCancel || isExchangeReject || isReturnReject
                                  ? 'border-2 border-red-200 text-red-600 hover:bg-red-50'
                                  : isExchangeConfirm
                                  ? 'bg-violet-600 text-white hover:bg-violet-700'
                                  : 'bg-gray-900 text-white hover:bg-gray-700'
                              }`}
                            >
                              {updatingStatus ? '...' : isCancel
                                ? 'Annuler la commande'
                                : isExchangeConfirm
                                ? 'Confirmer l\'échange'
                                : isExchangeReject
                                ? 'Annuler l\'échange'
                                : isReturnReject
                                ? 'Rejeter le retour'
                                : `Marquer comme "${STATUS_META[nextStatus]?.label ?? nextStatus}"`}
                            </button>
                          );
                        })}
                    </div>
                  )}
                  {statusError && (
                    <p className="text-xs text-red-500 mt-2">{statusError}</p>
                  )}
                </div>
              );
            })()}

            {/* Return info */}
            {selected.returnReason && (
              <div className="px-5 py-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Retour</p>
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-sm text-orange-800">
                  <p><strong>Motif :</strong> {selected.returnReason}</p>
                  {selected.returnRequestedAt && (
                    <p className="text-xs text-orange-500 mt-1">
                      Demandé le {new Date(selected.returnRequestedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  )}
                  {selected.refundAmount && (
                    <p className="mt-2 text-teal-700 font-semibold">
                      Remboursé : {Number(selected.refundAmount).toFixed(2)} TND
                      {selected.refundedAt && (
                        <span className="text-xs text-teal-500 font-normal ml-1">
                          le {new Date(selected.refundedAt).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Exchange info */}
            {selected.exchangeReason && (
              <div className="px-5 py-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Échange</p>
                <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 text-sm text-violet-800">
                  <p><strong>Motif :</strong> {selected.exchangeReason}</p>
                  {selected.exchangeRequestedAt && (
                    <p className="text-xs text-violet-500 mt-1">
                      Demandé le {new Date(selected.exchangeRequestedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  )}
                  {selected.exchangedAt && (
                    <p className="text-xs text-violet-600 font-semibold mt-1">
                      ✅ Échange confirmé le {new Date(selected.exchangedAt).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ── EXPÉDITION ── */}
            {selected.status !== 'CANCELLED' && (
              <div className="px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Expédition</p>
                  {shipment && shipment.trackingNumber && (
                    <button
                      onClick={syncShipment}
                      disabled={syncing}
                      className="text-xs text-blue-600 hover:underline disabled:opacity-50"
                    >
                      {syncing ? 'Sync...' : '↻ Actualiser'}
                    </button>
                  )}
                </div>

                {shipment === undefined ? (
                  /* Chargement */
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <div className="w-3 h-3 border border-gray-300 border-t-transparent rounded-full animate-spin" />
                    Chargement...
                  </div>
                ) : shipment ? (
                  /* Expédition existante */
                  <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Transporteur</span>
                      <span className="text-sm font-medium text-gray-900">{shipment.carrier.name}</span>
                    </div>
                    {shipment.trackingNumber && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">N° suivi</span>
                        {shipment.trackingUrl ? (
                          <a
                            href={shipment.trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-mono text-blue-600 hover:underline"
                          >
                            {shipment.trackingNumber}
                          </a>
                        ) : (
                          <span className="text-sm font-mono text-gray-700">{shipment.trackingNumber}</span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Statut</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SHIPMENT_STATUS_COLORS[shipment.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {SHIPMENT_STATUS_LABELS[shipment.status] ?? shipment.status}
                      </span>
                    </div>
                    {shipment.rawStatus && shipment.rawStatus !== 'MANUAL' && shipment.rawStatus !== 'NO_TOKEN' && (
                      <p className="text-xs text-gray-400 italic">{shipment.rawStatus}</p>
                    )}
                    {shipment.lastSyncedAt && (
                      <p className="text-xs text-gray-400">
                        Sync : {new Date(shipment.lastSyncedAt).toLocaleString('fr-TN')}
                      </p>
                    )}
                    {shipment.notes && (
                      <p className="text-xs text-gray-500 border-t border-gray-200 pt-2 mt-1">{shipment.notes}</p>
                    )}
                  </div>
                ) : myCarriers.length === 0 ? (
                  /* Aucun carrier configuré */
                  <div className="text-xs text-gray-400 bg-gray-50 rounded-xl p-3 text-center">
                    <p>Aucun transporteur configuré.</p>
                    <p className="mt-1">En cliquant sur «Expédier», la référence commande sera utilisée comme code de suivi.</p>
                    <a href="/dashboard/shipping" className="text-blue-600 hover:underline mt-1 inline-block">
                      Configurer un transporteur →
                    </a>
                  </div>
                ) : !showShipmentForm ? (
                  /* Bouton créer expédition */
                  <button
                    onClick={() => {
                      const def = myCarriers.find((c) => c.isDefault) ?? myCarriers[0];
                      setShipForm({ carrierId: def?.carrierId ?? '', trackingNumber: '', notes: '' });
                      setShowShipmentForm(true);
                    }}
                    className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors"
                  >
                    + Créer une expédition
                  </button>
                ) : (
                  /* Formulaire création */
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Transporteur *</label>
                      <select
                        value={shipForm.carrierId}
                        onChange={(e) => setShipForm((f) => ({ ...f, carrierId: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Sélectionner...</option>
                        {myCarriers.map((mc) => (
                          <option key={mc.carrierId} value={mc.carrierId}>
                            {mc.carrier.name}{mc.isDefault ? ' (défaut)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">N° de suivi</label>
                      <input
                        type="text"
                        value={shipForm.trackingNumber}
                        onChange={(e) => setShipForm((f) => ({ ...f, trackingNumber: e.target.value }))}
                        placeholder="Optionnel"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Notes</label>
                      <input
                        type="text"
                        value={shipForm.notes}
                        onChange={(e) => setShipForm((f) => ({ ...f, notes: e.target.value }))}
                        placeholder="Optionnel"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    {shipError && <p className="text-xs text-red-500">{shipError}</p>}
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setShowShipmentForm(false); setShipError(''); }}
                        className="flex-1 py-2 border border-gray-200 text-gray-500 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={createShipment}
                        disabled={shipSaving}
                        className="flex-1 py-2 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
                      >
                        {shipSaving ? '...' : 'Créer'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Client */}
            <div className="px-5 py-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Client</p>
              <div className="space-y-2">
                <Row label="Nom" value={selected.customerName} />
                <Row label="Email" value={selected.customerEmail} link={`mailto:${selected.customerEmail}`} />
                {selected.customerPhone && (
                  <Row label="Tél." value={selected.customerPhone} link={`tel:${selected.customerPhone}`} />
                )}
                <Row label="Paiement" value={PAYMENT_LABELS[selected.paymentMethod] ?? selected.paymentMethod ?? 'Livraison'} />
                {selected.paymentStatus && selected.paymentStatus !== 'PENDING' && (
                  <div className="flex items-center gap-2 text-xs py-1.5">
                    <span className="text-gray-500 w-32 shrink-0">Statut paiement</span>
                    <span className={`px-2 py-0.5 rounded-full font-medium ${(PAYMENT_STATUS_LABELS[selected.paymentStatus] ?? PAYMENT_STATUS_LABELS.PENDING).cls}`}>
                      {(PAYMENT_STATUS_LABELS[selected.paymentStatus] ?? PAYMENT_STATUS_LABELS.PENDING).label}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Adresse / Notes */}
            {(selected.notes || selected.shippingAddress) && (
              <div className="px-5 py-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Adresse / Notes</p>
                {selected.shippingAddress && Object.keys(selected.shippingAddress).length > 0 && (
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3 mb-2">
                    {Object.values(selected.shippingAddress).filter(Boolean).join(', ')}
                  </p>
                )}
                {selected.notes && (
                  <p className="text-sm text-gray-600 italic">{selected.notes}</p>
                )}
              </div>
            )}

            {/* Articles */}
            <div className="px-5 py-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Articles</p>
              <div className="space-y-3">
                {selected.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden flex items-center justify-center text-gray-300 text-base">
                      {item.product.images?.[0] ? (
                        <Image src={imageUrl(item.product.images[0])} alt={item.product.name} width={48} height={48} className="w-full h-full object-cover" />
                      ) : '◈'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.product.name}</p>
                      {item.variant && <p className="text-xs text-blue-600">{item.variant.name}</p>}
                      <p className="text-xs text-gray-400">{item.quantity} × {Number(item.unitPrice).toFixed(2)} TND</p>
                    </div>
                    <p className="text-sm font-bold text-gray-900 flex-shrink-0">
                      {(Number(item.unitPrice) * item.quantity).toFixed(2)} TND
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Response */}
            <div className="px-5 py-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Réponse IA</p>
              <div className="flex items-center gap-2 mb-3">
                <select
                  value={aiContext}
                  onChange={(e) => { setAiContext(e.target.value); setAiResponse(''); setAiError(''); }}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                  <option value="confirmation">Confirmation</option>
                  <option value="retard">Retard livraison</option>
                  <option value="probleme">Problème article</option>
                  <option value="retour">Acceptation retour</option>
                </select>
                <button
                  onClick={async () => {
                    setAiLoading(true); setAiError(''); setAiResponse('');
                    try {
                      const { data } = await api.post('/ai/order-response', {
                        orderId: selected.id,
                        context: aiContext,
                      });
                      setAiResponse(data.response);
                    } catch (err: any) {
                      setAiError(err.response?.data?.message || 'Erreur IA');
                    } finally {
                      setAiLoading(false);
                    }
                  }}
                  disabled={aiLoading}
                  className="inline-flex items-center gap-1 bg-purple-600 text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                  {aiLoading ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      ...
                    </>
                  ) : (
                    <>{'\u2728'} Générer</>
                  )}
                </button>
              </div>
              {aiError && <p className="text-xs text-red-500 mb-2">{aiError}</p>}
              {aiResponse && (
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-3">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{aiResponse}</p>
                  <button
                    onClick={() => { navigator.clipboard.writeText(aiResponse); }}
                    className="mt-2 text-xs text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Copier le message
                  </button>
                </div>
              )}
            </div>

            {/* Total */}
            <div className="px-5 py-5">
              {(() => {
                const subtotal = selected.items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0);
                const shipping = Number(selected.shippingFee ?? 0);
                const discount = Number(selected.discountAmount ?? 0);
                return (
                  <>
                    <div className="flex justify-between text-sm text-gray-500 mb-1">
                      <span>Sous-total ({selected.items.reduce((s, i) => s + i.quantity, 0)} articles)</span>
                      <span>{subtotal.toFixed(2)} TND</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-400 mb-1">
                      <span>Livraison</span>
                      <span>{shipping > 0 ? `${shipping.toFixed(2)} TND` : 'Gratuite'}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-sm text-green-600 mb-1">
                        <span>Réduction{selected.couponCode ? ` (${selected.couponCode})` : ''}</span>
                        <span>− {discount.toFixed(2)} TND</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-gray-900 text-lg border-t border-gray-100 pt-3 mt-2">
                      <span>Total</span>
                      <span>{Number(selected.totalAmount).toFixed(2)} TND</span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, link }: { label: string; value: string; link?: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="w-12 text-xs text-gray-400 pt-0.5 flex-shrink-0">{label}</span>
      {link ? (
        <a href={link} className="text-sm text-blue-600 hover:underline break-all">{value}</a>
      ) : (
        <span className="text-sm text-gray-900">{value}</span>
      )}
    </div>
  );
}
