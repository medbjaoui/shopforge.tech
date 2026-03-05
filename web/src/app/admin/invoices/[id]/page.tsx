'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminApi } from '@/lib/admin-api';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPriceHT: number | string;
  unitPriceTTC: number | string;
  totalHT: number | string;
  totalTVA: number | string;
  totalTTC: number | string;
  tvaRate: number | string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  totalHT: number | string;
  totalTVA: number | string;
  totalTTC: number | string;
  timbreFiscal: number | string;
  shippingFeeHT: number | string;
  shippingFeeTVA: number | string;
  discountAmount: number | string;
  finalTotal: number | string;
  tvaRate: number | string;
  sellerName: string;
  sellerAddress: string | null;
  sellerPhone: string | null;
  sellerEmail: string | null;
  sellerMF: string;
  sellerRNE: string | null;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string | null;
  buyerAddress: any;
  paymentMethod: string;
  issuedAt: string;
  items: InvoiceItem[];
  order: { id: string; orderNumber: string; status: string; createdAt: string };
  tenant: { id: string; name: string; slug: string };
}

const PAYMENT_LABELS: Record<string, string> = {
  COD: 'Paiement a la livraison',
  BANK_TRANSFER: 'Virement bancaire',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  ISSUED: 'Emise',
  CANCELLED: 'Annulee',
};

function n2(v: number | string) {
  return Number(v).toFixed(2);
}
function n3(v: number | string) {
  return Number(v).toFixed(3);
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatAddress(addr: any): string {
  if (!addr) return '';
  if (typeof addr === 'string') return addr;
  const parts: string[] = [];
  if (addr.street || addr.address || addr.line1) parts.push(addr.street || addr.address || addr.line1);
  if (addr.city) parts.push(addr.city);
  if (addr.state || addr.governorate) parts.push(addr.state || addr.governorate);
  if (addr.zipCode || addr.postalCode) parts.push(addr.zipCode || addr.postalCode);
  return parts.join(', ') || JSON.stringify(addr);
}

export default function AdminInvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.id) return;
    adminApi
      .get(`/invoices/${params.id}`)
      .then((r) => setInvoice(r.data))
      .catch(() => router.push('/admin/invoices'))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!invoice) return null;

  const tvaPercent = Math.round(Number(invoice.tvaRate) * 100);

  return (
    <div>
      {/* Top bar — hidden on print */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin/invoices')}
            className="text-gray-500 hover:text-gray-900 text-sm transition-colors"
          >
            &larr; Retour
          </button>
          <h1 className="text-xl font-bold text-gray-900">{invoice.invoiceNumber}</h1>
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              invoice.status === 'ISSUED'
                ? 'bg-emerald-50 text-emerald-600'
                : invoice.status === 'CANCELLED'
                  ? 'bg-red-50 text-red-600'
                  : 'bg-amber-50 text-amber-600'
            }`}
          >
            {STATUS_LABELS[invoice.status] ?? invoice.status}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/tenants/${invoice.tenant.id}`}
            className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
          >
            {invoice.tenant.name} — {invoice.order.orderNumber}
          </Link>
          <button
            onClick={() => window.print()}
            className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Imprimer
          </button>
        </div>
      </div>

      {/* Invoice card — the print target */}
      <div
        id="invoice-print"
        className="bg-white text-gray-900 rounded-2xl border border-gray-200 shadow-sm p-8 sm:p-10 print:border-0 print:rounded-none print:shadow-none print:p-0"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-6 mb-8 pb-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-1">FACTURE</h2>
            <p className="text-lg font-bold text-orange-500">{invoice.invoiceNumber}</p>
          </div>
          <div className="text-right sm:text-right">
            <p className="text-sm text-gray-500">Date d'emission</p>
            <p className="font-semibold">{formatDate(invoice.issuedAt)}</p>
            <p className="text-xs text-gray-400 mt-1">
              {PAYMENT_LABELS[invoice.paymentMethod] ?? invoice.paymentMethod}
            </p>
          </div>
        </div>

        {/* Seller / Buyer */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Vendeur
            </p>
            <p className="font-bold text-gray-900">{invoice.sellerName}</p>
            {invoice.sellerAddress && (
              <p className="text-sm text-gray-600">{invoice.sellerAddress}</p>
            )}
            {invoice.sellerPhone && (
              <p className="text-sm text-gray-600">{invoice.sellerPhone}</p>
            )}
            {invoice.sellerEmail && (
              <p className="text-sm text-gray-600">{invoice.sellerEmail}</p>
            )}
            <div className="mt-2 space-y-0.5">
              <p className="text-sm">
                <span className="font-semibold text-gray-700">MF :</span>{' '}
                <span className="font-mono text-gray-900">{invoice.sellerMF}</span>
              </p>
              {invoice.sellerRNE && (
                <p className="text-sm">
                  <span className="font-semibold text-gray-700">RNE :</span>{' '}
                  <span className="font-mono text-gray-900">{invoice.sellerRNE}</span>
                </p>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Acheteur
            </p>
            <p className="font-bold text-gray-900">{invoice.buyerName}</p>
            <p className="text-sm text-gray-600">{invoice.buyerEmail}</p>
            {invoice.buyerPhone && (
              <p className="text-sm text-gray-600">{invoice.buyerPhone}</p>
            )}
            {invoice.buyerAddress && (
              <p className="text-sm text-gray-600 mt-1">
                {formatAddress(invoice.buyerAddress)}
              </p>
            )}
          </div>
        </div>

        {/* Reference */}
        <div className="bg-gray-50 rounded-lg px-4 py-2.5 mb-6 text-sm print:bg-gray-100">
          <span className="text-gray-500">Commande :</span>{' '}
          <span className="font-mono font-semibold">{invoice.order.orderNumber}</span>
        </div>

        {/* Items table */}
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-2.5 font-semibold text-gray-700">Description</th>
              <th className="text-center py-2.5 font-semibold text-gray-700 w-16">Qte</th>
              <th className="text-right py-2.5 font-semibold text-gray-700">PU HT</th>
              <th className="text-right py-2.5 font-semibold text-gray-700">
                TVA {tvaPercent}%
              </th>
              <th className="text-right py-2.5 font-semibold text-gray-700">Total TTC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoice.items.map((item) => (
              <tr key={item.id}>
                <td className="py-2.5 text-gray-900">{item.description}</td>
                <td className="py-2.5 text-center text-gray-600">{item.quantity}</td>
                <td className="py-2.5 text-right font-mono text-gray-700">
                  {n3(item.unitPriceHT)}
                </td>
                <td className="py-2.5 text-right font-mono text-gray-500">
                  {n3(item.totalTVA)}
                </td>
                <td className="py-2.5 text-right font-mono font-semibold text-gray-900">
                  {n2(item.totalTTC)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="border-t-2 border-gray-200 pt-4">
          <div className="max-w-xs ml-auto space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Sous-total HT</span>
              <span className="font-mono">{n3(invoice.totalHT)} TND</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">TVA {tvaPercent}%</span>
              <span className="font-mono">{n3(invoice.totalTVA)} TND</span>
            </div>
            {Number(invoice.shippingFeeHT) > 0 && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">Livraison HT</span>
                  <span className="font-mono">{n3(invoice.shippingFeeHT)} TND</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">TVA livraison</span>
                  <span className="font-mono">{n3(invoice.shippingFeeTVA)} TND</span>
                </div>
              </>
            )}
            {Number(invoice.discountAmount) > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Remise</span>
                <span className="font-mono">-{n2(invoice.discountAmount)} TND</span>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-200 pt-2">
              <span className="text-gray-700 font-semibold">Total TTC</span>
              <span className="font-mono font-semibold">{n2(invoice.totalTTC)} TND</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Timbre fiscal</span>
              <span className="font-mono">{n3(invoice.timbreFiscal)} TND</span>
            </div>
            <div className="flex justify-between border-t-2 border-gray-900 pt-2 mt-2">
              <span className="text-gray-900 font-extrabold text-base">TOTAL A PAYER</span>
              <span className="font-mono font-extrabold text-base text-orange-600">
                {n2(invoice.finalTotal)} TND
              </span>
            </div>
          </div>
        </div>

        {/* Footer legal */}
        <div className="mt-10 pt-6 border-t border-gray-200 text-xs text-gray-400 text-center print:mt-16">
          <p>
            Facture generee par ShopForge — shopforge.tech
          </p>
          <p className="mt-1">
            Conforme au Code de la TVA tunisien — TVA {tvaPercent}% — Timbre fiscal 0.600 TND
          </p>
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #invoice-print,
          #invoice-print * {
            visibility: visible;
          }
          #invoice-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            padding: 20mm !important;
          }
        }
      `}</style>
    </div>
  );
}
