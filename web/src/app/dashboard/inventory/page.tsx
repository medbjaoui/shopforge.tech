'use client';
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import PageHeader from '@/components/dashboard/PageHeader';
import LoadingSkeleton from '@/components/dashboard/LoadingSkeleton';
import Pagination from '@/components/Pagination';

interface Movement {
  id: string; type: string; quantity: number;
  stockBefore: number; stockAfter: number;
  reason: string | null; reference: string | null;
  createdAt: string;
  product: { name: string };
  variant: { name: string } | null;
}

interface Summary {
  totalProducts: number; totalStockValue: number;
  lowStockCount: number; outOfStockCount: number;
  recentMovements: Movement[];
}

interface Product { id: string; name: string; variants: { id: string; name: string }[] }

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  PURCHASE:   { label: 'Achat',       color: 'bg-blue-100 text-blue-700' },
  SALE:       { label: 'Vente',       color: 'bg-green-100 text-green-700' },
  RETURN:     { label: 'Retour',      color: 'bg-orange-100 text-orange-700' },
  ADJUSTMENT: { label: 'Ajustement',  color: 'bg-gray-100 text-gray-700' },
  DAMAGE:     { label: 'Perte',       color: 'bg-red-100 text-red-700' },
  INITIAL:    { label: 'Initial',     color: 'bg-purple-100 text-purple-700' },
};

export default function InventoryPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterProduct, setFilterProduct] = useState('');
  const [filterType, setFilterType] = useState('');
  const [products, setProducts] = useState<Product[]>([]);

  // Adjustment modal
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjProduct, setAdjProduct] = useState('');
  const [adjVariant, setAdjVariant] = useState('');
  const [adjQty, setAdjQty] = useState('');
  const [adjType, setAdjType] = useState('ADJUSTMENT');
  const [adjReason, setAdjReason] = useState('');
  const [adjCost, setAdjCost] = useState('');
  const [adjSaving, setAdjSaving] = useState(false);
  const [adjError, setAdjError] = useState('');

  const loadSummary = useCallback(async () => {
    try {
      const { data } = await api.get('/inventory/summary');
      setSummary(data);
    } catch (e) { console.error(e); }
  }, []);

  const loadMovements = useCallback(async (p = page) => {
    try {
      const params = new URLSearchParams();
      params.set('page', String(p));
      params.set('limit', '20');
      if (filterProduct) params.set('productId', filterProduct);
      if (filterType) params.set('type', filterType);
      const { data: res } = await api.get(`/inventory/movements?${params}`);
      setMovements(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, filterProduct, filterType]);

  const loadProducts = useCallback(async () => {
    try {
      const { data: res } = await api.get('/products?limit=999');
      setProducts(res.data);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { loadSummary(); loadProducts(); }, [loadSummary, loadProducts]);
  useEffect(() => { setLoading(true); loadMovements(); }, [loadMovements]);

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdjError('');
    setAdjSaving(true);
    try {
      await api.post('/inventory/adjust', {
        productId: adjProduct,
        ...(adjVariant ? { variantId: adjVariant } : {}),
        quantity: parseInt(adjQty),
        type: adjType,
        reason: adjReason || undefined,
        ...(adjCost ? { costPrice: parseFloat(adjCost) } : {}),
      });
      setShowAdjust(false);
      resetAdjForm();
      loadSummary();
      loadMovements(1);
      setPage(1);
    } catch (err: any) {
      setAdjError(err.response?.data?.message || 'Erreur');
    } finally {
      setAdjSaving(false);
    }
  };

  const resetAdjForm = () => {
    setAdjProduct(''); setAdjVariant(''); setAdjQty('');
    setAdjType('ADJUSTMENT'); setAdjReason(''); setAdjCost(''); setAdjError('');
  };

  const selectedProduct = products.find((p) => p.id === adjProduct);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventaire"
        subtitle={summary ? `Valeur totale : ${summary.totalStockValue.toFixed(2)} TND` : undefined}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                const { data } = await api.get('/inventory/export/csv', { responseType: 'blob' });
                const url = URL.createObjectURL(data);
                const a = document.createElement('a'); a.href = url; a.download = 'mouvements-stock.csv'; a.click();
                URL.revokeObjectURL(url);
              }}
              className="border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-50"
            >
              Exporter CSV
            </button>
            <button
              onClick={() => { resetAdjForm(); setShowAdjust(true); }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              + Ajuster le stock
            </button>
          </div>
        }
      />

      {/* Summary cards */}
      {summary ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-xs font-medium text-gray-500 mb-1">Valeur du stock</p>
            <p className="text-2xl font-bold text-gray-900">{summary.totalStockValue.toFixed(0)} <span className="text-sm font-normal text-gray-500">TND</span></p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-xs font-medium text-gray-500 mb-1">Total produits</p>
            <p className="text-2xl font-bold text-gray-900">{summary.totalProducts}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-xs font-medium text-gray-500 mb-1">Stock bas</p>
            <p className={`text-2xl font-bold ${summary.lowStockCount > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
              {summary.lowStockCount}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-xs font-medium text-gray-500 mb-1">Rupture de stock</p>
            <p className={`text-2xl font-bold ${summary.outOfStockCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {summary.outOfStockCount}
            </p>
          </div>
        </div>
      ) : (
        <LoadingSkeleton type="cards" rows={4} />
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterProduct}
          onChange={(e) => { setFilterProduct(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tous les produits</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tous les types</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        {(filterProduct || filterType) && (
          <button
            onClick={() => { setFilterProduct(''); setFilterType(''); setPage(1); }}
            className="text-xs text-gray-500 hover:text-gray-700 px-2"
          >
            Effacer filtres
          </button>
        )}
      </div>

      {/* Movements table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <LoadingSkeleton type="table" rows={8} />
        ) : movements.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            Aucun mouvement de stock enregistré.
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Produit</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Quantité</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Stock</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Raison</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Référence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {movements.map((m) => {
                  const t = TYPE_LABELS[m.type] ?? { label: m.type, color: 'bg-gray-100 text-gray-700' };
                  return (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 text-gray-500 text-xs">
                        {new Date(m.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-900">{m.product.name}</p>
                        {m.variant && <p className="text-xs text-gray-400">{m.variant.name}</p>}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${t.color}`}>{t.label}</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`font-mono font-bold ${m.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center hidden md:table-cell text-gray-500 text-xs">
                        {m.stockBefore} → {m.stockAfter}
                      </td>
                      <td className="px-5 py-3 hidden lg:table-cell text-gray-500 text-xs truncate max-w-[150px]">
                        {m.reason || '—'}
                      </td>
                      <td className="px-5 py-3 hidden lg:table-cell text-gray-500 text-xs font-mono">
                        {m.reference || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-5 pb-3">
              <Pagination page={page} totalPages={totalPages} total={total} onPageChange={(p) => setPage(p)} />
            </div>
          </>
        )}
      </div>

      {/* Adjustment modal */}
      {showAdjust && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Ajuster le stock</h2>
              <button onClick={() => setShowAdjust(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <form onSubmit={handleAdjust} className="px-6 py-4 space-y-4">
              {adjError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{adjError}</div>}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Produit *</label>
                <select value={adjProduct} onChange={(e) => { setAdjProduct(e.target.value); setAdjVariant(''); }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" required>
                  <option value="">Sélectionner un produit</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              {selectedProduct && selectedProduct.variants.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Variante</label>
                  <select value={adjVariant} onChange={(e) => setAdjVariant(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    <option value="">Produit principal</option>
                    {selectedProduct.variants.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Quantité *</label>
                  <input type="number" value={adjQty} onChange={(e) => setAdjQty(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="+10 ou -5" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Type *</label>
                  <select value={adjType} onChange={(e) => setAdjType(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    <option value="ADJUSTMENT">Ajustement</option>
                    <option value="PURCHASE">Achat</option>
                    <option value="DAMAGE">Perte / casse</option>
                    <option value="INITIAL">Stock initial</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Raison</label>
                <input type="text" value={adjReason} onChange={(e) => setAdjReason(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Réapprovisionnement fournisseur..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Prix d'achat unitaire (TND)</label>
                <input type="number" min="0" step="0.01" value={adjCost} onChange={(e) => setAdjCost(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Optionnel" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={adjSaving}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {adjSaving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
                <button type="button" onClick={() => setShowAdjust(false)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
