'use client';
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import Pagination from '@/components/Pagination';
import PageHeader from '@/components/dashboard/PageHeader';
import LoadingSkeleton from '@/components/dashboard/LoadingSkeleton';

interface Review {
  id: string;
  rating: number;
  authorName: string;
  authorEmail: string;
  comment: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  product: { name: string; slug: string };
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  ALL:      { label: 'Tous',      color: 'text-gray-600',  bg: 'bg-gray-100' },
  PENDING:  { label: 'En attente', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  APPROVED: { label: 'Approuvé',  color: 'text-green-700', bg: 'bg-green-100' },
  REJECTED: { label: 'Rejeté',    color: 'text-red-700',   bg: 'bg-red-100' },
};

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-yellow-400 text-sm tracking-wider">
      {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
    </span>
  );
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // AI review analysis
  const [products, setProducts] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [aiSummary, setAiSummary] = useState<{ summary: string; reviewCount: number; avgRating: number } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const load = useCallback(async (status = filter, p = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status !== 'ALL') params.set('status', status);
      params.set('page', String(p));
      params.set('limit', '20');
      const { data: res } = await api.get(`/reviews?${params}`);
      setReviews(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filter, page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.get('/products?limit=200').then(({ data }) => {
      const list = Array.isArray(data) ? data : data.data;
      setProducts((list ?? []).map((p: any) => ({ id: p.id, name: p.name })));
    }).catch(() => {});
  }, []);

  const handleAiAnalysis = async () => {
    if (!selectedProductId) return;
    setAiLoading(true);
    setAiError('');
    setAiSummary(null);
    try {
      const { data } = await api.post('/ai/review-summary', { productId: selectedProductId });
      setAiSummary(data);
    } catch (err: any) {
      setAiError(err.response?.data?.message || 'Erreur lors de l\'analyse IA');
    } finally {
      setAiLoading(false);
    }
  };

  const handleStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await api.patch(`/reviews/${id}/status`, { status });
      await load();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet avis ?')) return;
    try {
      await api.delete(`/reviews/${id}`);
      await load();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Avis clients"
        subtitle="Modérez les avis laissés par vos clients"
        actions={
          <span className="text-sm text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
            {total} avis
          </span>
        }
      />

      {/* Filters */}
      <div className="flex gap-1 flex-wrap">
        {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((s) => {
          const m = STATUS_META[s];
          return (
            <button key={s} onClick={() => { setFilter(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === s ? `${m.bg} ${m.color}` : 'text-gray-500 hover:bg-gray-100'
              }`}>
              {m.label}
            </button>
          );
        })}
      </div>

      {/* AI Analysis */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={selectedProductId}
            onChange={(e) => { setSelectedProductId(e.target.value); setAiSummary(null); setAiError(''); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 min-w-[200px]"
          >
            <option value="">Sélectionner un produit...</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button
            onClick={handleAiAnalysis}
            disabled={!selectedProductId || aiLoading}
            className="inline-flex items-center gap-1.5 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {aiLoading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Analyse...
              </>
            ) : (
              <>{'\u2728'} Analyser les avis</>
            )}
          </button>
        </div>
        {aiError && <p className="text-sm text-red-500 mt-3">{aiError}</p>}
        {aiSummary && (
          <div className="mt-4 bg-purple-50 border border-purple-100 rounded-xl p-4">
            <div className="flex items-center gap-4 mb-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-700">{aiSummary.avgRating.toFixed(1)}</p>
                <p className="text-xs text-purple-500">Note moy.</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-700">{aiSummary.reviewCount}</p>
                <p className="text-xs text-purple-500">Avis analysés</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{aiSummary.summary}</p>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <LoadingSkeleton type="table" rows={5} />
        ) : reviews.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Aucun avis pour le moment.</div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Produit</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Auteur</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Note</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Commentaire</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reviews.map((r) => {
                  const sm = STATUS_META[r.status];
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900">{r.product.name}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-gray-900">{r.authorName}</p>
                        <p className="text-xs text-gray-400">{r.authorEmail}</p>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <Stars rating={r.rating} />
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        <p className="text-gray-600 truncate max-w-[200px]">{r.comment || '—'}</p>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${sm.bg} ${sm.color}`}>
                          {sm.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {r.status !== 'APPROVED' && (
                            <button onClick={() => handleStatus(r.id, 'APPROVED')}
                              className="px-2 py-1 text-xs font-medium text-green-600 hover:bg-green-50 rounded transition-colors">
                              Approuver
                            </button>
                          )}
                          {r.status !== 'REJECTED' && (
                            <button onClick={() => handleStatus(r.id, 'REJECTED')}
                              className="px-2 py-1 text-xs font-medium text-orange-600 hover:bg-orange-50 rounded transition-colors">
                              Rejeter
                            </button>
                          )}
                          <button onClick={() => handleDelete(r.id)}
                            className="px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50 rounded transition-colors">
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-5 pb-3">
              <Pagination page={page} totalPages={totalPages} total={total} onPageChange={(p) => { setPage(p); load(filter, p); }} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
