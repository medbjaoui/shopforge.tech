'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCustomer } from '@/contexts/CustomerContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING:          { label: 'En attente',    color: 'bg-yellow-100 text-yellow-700' },
  CONFIRMED:        { label: 'Confirmée',     color: 'bg-blue-100 text-blue-700' },
  PROCESSING:       { label: 'En préparation', color: 'bg-indigo-100 text-indigo-700' },
  SHIPPED:          { label: 'Expédiée',      color: 'bg-purple-100 text-purple-700' },
  PICKED_UP:        { label: 'Récupérée',     color: 'bg-orange-100 text-orange-700' },
  DELIVERED:        { label: 'Livrée',        color: 'bg-green-100 text-green-700' },
  CANCELLED:        { label: 'Annulée',       color: 'bg-red-100 text-red-700' },
  RETURN_REQUESTED: { label: 'Retour demandé', color: 'bg-amber-100 text-amber-700' },
  REFUNDED:         { label: 'Remboursée',    color: 'bg-gray-100 text-gray-600' },
};

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: string;
  paymentMethod: string;
  createdAt: string;
  items: { productName: string; quantity: number; unitPrice: string }[];
  shipment: { trackingNumber: string; carrier: string; status: string } | null;
}

export default function AccountPage({ params }: { params: { slug: string } }) {
  const { customer, token, isLoggedIn, isLoading, logout } = useCustomer();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'orders' | 'profile'>('orders');

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.replace(`/store/${params.slug}/account/login`);
    }
  }, [isLoading, isLoggedIn, params.slug, router]);

  // Load orders
  useEffect(() => {
    if (!isLoggedIn || !token) return;
    setOrdersLoading(true);
    fetch(`${API_URL}/store/auth/orders`, {
      headers: { Authorization: `Bearer ${token}`, 'X-Tenant-Slug': params.slug },
    })
      .then(r => r.json())
      .then(data => setOrders(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setOrdersLoading(false));
  }, [isLoggedIn, token, params.slug]);

  if (isLoading) {
    return <div className="min-h-[50vh] flex items-center justify-center text-gray-400">Chargement...</div>;
  }
  if (!isLoggedIn || !customer) return null;

  const handleLogout = () => {
    logout(params.slug);
    router.push(`/store/${params.slug}`);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mon compte</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Bonjour, <span className="font-medium text-gray-700">{customer.firstName}</span> 👋
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-400 hover:text-gray-700 transition-colors border border-gray-200 rounded-lg px-3 py-1.5"
        >
          Se déconnecter
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-50 rounded-2xl p-4 text-center">
          <p className="text-2xl font-extrabold text-gray-900">{customer.orderCount}</p>
          <p className="text-xs text-gray-500 mt-1">Commandes</p>
        </div>
        <div className="bg-gray-50 rounded-2xl p-4 text-center">
          <p className="text-2xl font-extrabold text-gray-900">
            {Number(customer.totalSpent).toFixed(0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">TND dépensés</p>
        </div>
        <div className="bg-gray-50 rounded-2xl p-4 text-center">
          <p className="text-2xl font-extrabold text-gray-900">
            {orders.filter(o => !['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(o.status)).length}
          </p>
          <p className="text-xs text-gray-500 mt-1">En cours</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        {(['orders', 'profile'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'orders' ? 'Mes commandes' : 'Mon profil'}
          </button>
        ))}
      </div>

      {/* Orders tab */}
      {activeTab === 'orders' && (
        <div>
          {ordersLoading ? (
            <div className="text-center py-12 text-gray-400">Chargement des commandes...</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">📦</p>
              <p className="text-gray-500 font-medium">Aucune commande pour le moment.</p>
              <Link href={`/store/${params.slug}/products`}
                className="inline-block mt-4 bg-gray-900 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-700 transition-colors">
                Voir les produits →
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map(order => {
                const s = STATUS_LABELS[order.status] ?? { label: order.status, color: 'bg-gray-100 text-gray-600' };
                return (
                  <div key={order.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="font-bold text-gray-900 text-sm">#{order.orderNumber}</span>
                        <span className="text-gray-400 text-xs ml-2">
                          {new Date(order.createdAt).toLocaleDateString('fr-TN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${s.color}`}>{s.label}</span>
                    </div>

                    {/* Items */}
                    <div className="space-y-1 mb-3">
                      {order.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-gray-700">{item.quantity}× {item.productName}</span>
                          <span className="text-gray-500">{(Number(item.unitPrice) * item.quantity).toFixed(2)} TND</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <span className="font-bold text-gray-900">{Number(order.totalAmount).toFixed(2)} TND</span>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        {order.shipment?.trackingNumber && (
                          <Link href={`/store/${params.slug}/track?n=${order.shipment.trackingNumber}`}
                            className="text-blue-500 hover:underline font-medium">
                            Suivre →
                          </Link>
                        )}
                        <span>{order.paymentMethod === 'COD' ? '💵 Livraison' : '🏦 Virement'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Profile tab */}
      {activeTab === 'profile' && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Prénom</p>
              <p className="font-medium text-gray-900">{customer.firstName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Nom</p>
              <p className="font-medium text-gray-900">{customer.lastName}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Email</p>
            <p className="font-medium text-gray-900">{customer.email ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Téléphone</p>
            <p className="font-medium text-gray-900">{customer.phone}</p>
          </div>
        </div>
      )}
    </div>
  );
}
