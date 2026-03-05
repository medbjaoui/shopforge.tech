'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  totalTTC: number | string;
  finalTotal: number | string;
  totalTVA: number | string;
  timbreFiscal: number | string;
  buyerName: string;
  buyerEmail: string;
  paymentMethod: string;
  issuedAt: string;
}

interface InvoicesData {
  invoices: Invoice[];
  total: number;
  page: number;
  totalPages: number;
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  ISSUED: 'Emise',
  CANCELLED: 'Annulee',
};

const STATUS_COLORS: Record<string, string> = {
  ISSUED: 'bg-emerald-50 text-emerald-600',
  CANCELLED: 'bg-red-50 text-red-600',
  DRAFT: 'bg-amber-50 text-amber-600',
};

function formatTnd(v: number) {
  return v.toFixed(3) + ' TND';
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function MerchantInvoicesPage() {
  const [data, setData] = useState<InvoicesData | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const fetchInvoices = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/invoices?page=${p}&limit=20`);
      setData(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices(page);
  }, [page, fetchInvoices]);

  useEffect(() => {
    api.get('/invoices/stats').then((r) => setStats(r.data));
  }, []);

  const filtered =
    data?.invoices.filter(
      (inv) =>
        !search ||
        inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
        inv.buyerName.toLowerCase().includes(search.toLowerCase()),
    ) ?? [];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Mes Factures</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {data ? `${data.total} facture${data.total > 1 ? 's' : ''}` : 'Chargement...'}
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Total factures</p>
            <p className="text-lg font-bold text-gray-900">{stats.totalInvoices}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Ce mois</p>
            <p className="text-lg font-bold text-gray-900">{stats.monthInvoices}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Chiffre d'affaires</p>
            <p className="text-lg font-bold text-emerald-600">{formatTnd(Number(stats.totalRevenue))}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">TVA collectee</p>
            <p className="text-lg font-bold text-orange-500">{formatTnd(Number(stats.totalTVA))}</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par numero ou client..."
          className="w-full sm:w-80 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">N° Facture</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Client</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Statut</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">TTC</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">TVA</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400 text-sm">
                      {search ? 'Aucun resultat' : 'Aucune facture'}
                    </td>
                  </tr>
                )}
                {filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/invoices/${inv.id}`}
                        className="font-mono text-xs text-orange-600 hover:text-orange-500 font-semibold transition-colors"
                      >
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900 text-sm">{inv.buyerName}</p>
                      <p className="text-gray-400 text-xs">{inv.buyerEmail}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[inv.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABELS[inv.status] ?? inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-gray-900">
                      {Number(inv.totalTTC).toFixed(3)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-orange-500 hidden sm:table-cell">
                      {Number(inv.totalTVA).toFixed(3)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-emerald-600">
                      {Number(inv.finalTotal).toFixed(3)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400 text-xs hidden md:table-cell">
                      {formatDate(inv.issuedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 px-4 py-3 border-t border-gray-200">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg disabled:opacity-30 transition-colors"
            >
              Precedent
            </button>
            <span className="text-xs text-gray-500">
              Page {data.page} / {data.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
              className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg disabled:opacity-30 transition-colors"
            >
              Suivant
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
