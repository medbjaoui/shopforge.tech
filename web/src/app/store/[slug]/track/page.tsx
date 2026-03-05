'use client';
import { useState, useEffect } from 'react';
import { getTheme, getThemeUtils } from '@/lib/themes';

interface Props { params: { slug: string } }

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  CONFIRMED: 'Confirmée',
  PROCESSING: 'En préparation',
  SHIPPED: 'Expédiée',
  DELIVERED: 'Livrée',
  CANCELLED: 'Annulée',
  RETURN_REQUESTED: 'Retour demandé',
  RETURNED: 'Retournée',
  REFUNDED: 'Remboursée',
};

const STATUS_FLOW = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  PROCESSING: 'bg-purple-100 text-purple-800',
  SHIPPED: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  RETURN_REQUESTED: 'bg-orange-100 text-orange-800',
  RETURNED: 'bg-amber-100 text-amber-800',
  REFUNDED: 'bg-teal-100 text-teal-800',
};

interface OrderItem {
  quantity: number;
  unitPrice: number;
  product: { name: string; slug: string };
  variant: { name: string } | null;
}

interface Order {
  orderNumber: string;
  status: string;
  createdAt: string;
  totalAmount: string;
  customerName: string;
  notes: string | null;
  items: OrderItem[];
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function TrackPage({ params }: Props) {
  const [input, setInput] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [themeKey, setThemeKey] = useState('default');

  useEffect(() => {
    fetch(`${API}/tenants/public/${params.slug}`)
      .then((r) => r.json())
      .then((t) => { if (t.theme) setThemeKey(t.theme); })
      .catch(() => {});
  }, [params.slug]);

  const theme = getTheme(themeKey);
  const tu = getThemeUtils(theme);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = input.trim().toUpperCase();
    if (!num) return;
    setError('');
    setOrder(null);
    setLoading(true);
    try {
      const res = await fetch(`${API}/orders/track/${num}`, {
        headers: { 'X-Tenant-Slug': params.slug },
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.message || 'Commande introuvable');
      } else {
        setOrder(await res.json());
      }
    } catch {
      setError('Erreur réseau, veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const stepIndex = order ? STATUS_FLOW.indexOf(order.status) : -1;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Suivre ma commande</h1>
      <p className="text-sm text-gray-500 mb-8">Entrez votre numéro de commande pour voir son état.</p>

      <form onSubmit={handleTrack} className="flex gap-3 mb-8">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="ORD-1234567890"
          className={`flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 ${tu.focusRing}`}
        />
        <button
          type="submit"
          disabled={loading}
          className={`${theme.btn} text-white px-6 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50`}
        >
          {loading ? 'Recherche...' : 'Suivre'}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm mb-6">
          {error}
        </div>
      )}

      {order && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-6 shadow-sm">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono text-lg font-bold text-gray-900">{order.orderNumber}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Passée le {new Date(order.createdAt).toLocaleDateString('fr-FR', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </p>
            </div>
            <span className={`text-xs px-3 py-1.5 rounded-full font-semibold ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-700'}`}>
              {STATUS_LABELS[order.status] ?? order.status}
            </span>
          </div>

          {/* Progress stepper */}
          {order.status !== 'CANCELLED' && (
            <div>
              <div className="flex items-center gap-0">
                {STATUS_FLOW.map((s, i) => (
                  <div key={s} className="flex items-center flex-1 last:flex-none">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      i <= stepIndex ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {i < stepIndex ? '✓' : i + 1}
                    </div>
                    {i < STATUS_FLOW.length - 1 && (
                      <div className={`h-0.5 flex-1 mx-1 ${i < stepIndex ? 'bg-gray-900' : 'bg-gray-100'}`} />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex mt-2">
                {STATUS_FLOW.map((s) => (
                  <p key={s} className="flex-1 text-[10px] text-gray-400 text-center min-w-0 px-0.5">
                    {STATUS_LABELS[s]}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Items */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Articles</p>
            <div className="space-y-2">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium text-gray-900">{item.product.name}</span>
                    {item.variant && <span className="text-blue-600 text-xs ml-1">({item.variant.name})</span>}
                    <span className="text-gray-400 ml-1">× {item.quantity}</span>
                  </div>
                  <span className="font-medium text-gray-900">
                    {(Number(item.unitPrice) * item.quantity).toFixed(2)} TND
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="flex justify-between items-center border-t border-gray-100 pt-4">
            <span className="font-semibold text-gray-700">Total</span>
            <span className="font-bold text-lg text-gray-900">{Number(order.totalAmount).toFixed(2)} TND</span>
          </div>

          {order.notes && (
            <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
              <p className="font-medium text-gray-700 text-xs mb-1">Notes / Adresse</p>
              {order.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
