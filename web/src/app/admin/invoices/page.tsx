'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/admin-api';
import { PageHeader, KpiCard, SearchInput, Badge, Spinner } from '@/components/admin/AdminUI';
import { ReceiptIcon, WalletIcon } from '@/components/admin/AdminIcons';
import {
  InvoiceStatus, INVOICE_STATUS_COLORS, INVOICE_STATUS_LABELS, formatDate, formatTnd,
} from '@/components/admin/AdminConstants';

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  totalTTC: number | string;
  finalTotal: number | string;
  timbreFiscal: number | string;
  totalTVA: number | string;
  sellerName: string;
  buyerName: string;
  buyerEmail: string;
  paymentMethod: string;
  issuedAt: string;
  tenant: { id: string; name: string; slug: string };
}

interface InvoicesData {
  invoices: Invoice[];
  total: number;
  page: number;
  totalPages: number;
}

export default function AdminInvoicesPage() {
  const [data, setData] = useState<InvoicesData | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const fetchInvoices = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const { data } = await adminApi.get(`/invoices?page=${p}&limit=30`);
      setData(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices(page);
  }, [page, fetchInvoices]);

  useEffect(() => {
    adminApi.get('/invoices/stats').then((r) => setStats(r.data));
  }, []);

  const filtered =
    data?.invoices.filter(
      (inv) =>
        !search ||
        inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
        inv.buyerName.toLowerCase().includes(search.toLowerCase()) ||
        inv.tenant.name.toLowerCase().includes(search.toLowerCase()),
    ) ?? [];

  return (
    <div>
      <PageHeader title="Factures" subtitle={data ? `${data.total} facture${data.total > 1 ? 's' : ''} au total` : undefined} />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <KpiCard label="Total factures" value={String(stats.totalInvoices)} icon={<ReceiptIcon size={18} />} />
          <KpiCard label="Ce mois" value={String(stats.monthInvoices)} icon={<ReceiptIcon size={18} />} />
          <KpiCard
            label="Chiffre d'affaires"
            value={formatTnd(Number(stats.totalRevenue))}
            icon={<WalletIcon size={18} />}
            highlight
          />
          <KpiCard
            label="TVA collectee"
            value={formatTnd(Number(stats.totalTVA))}
            sub="Ce mois"
          />
        </div>
      )}

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Rechercher par numero, client, boutique..."
        className="mb-4"
      />

      {/* Table */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
        {loading ? (
          <Spinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">N° Facture</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Boutique</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">TTC</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">TVA</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Final</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-gray-500">
                      {search ? 'Aucun resultat' : 'Aucune facture'}
                    </td>
                  </tr>
                )}
                {filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors cursor-pointer">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/invoices/${inv.id}`}
                        className="font-mono text-xs text-orange-600 hover:text-orange-500 transition-colors"
                      >
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/tenants/${inv.tenant.id}`}
                        className="text-indigo-600 hover:text-indigo-500 text-xs font-medium transition-colors"
                      >
                        {inv.tenant.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900 text-sm">{inv.buyerName}</p>
                      <p className="text-gray-500 text-xs">{inv.buyerEmail}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={INVOICE_STATUS_LABELS[inv.status]} color={INVOICE_STATUS_COLORS[inv.status]} />
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 font-mono text-sm whitespace-nowrap">
                      {Number(inv.totalTTC).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-orange-400 font-mono text-xs whitespace-nowrap">
                      {Number(inv.totalTVA).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-400 font-mono text-sm font-semibold whitespace-nowrap">
                      {Number(inv.finalTotal).toFixed(2)} TND
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400 text-xs whitespace-nowrap">
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
