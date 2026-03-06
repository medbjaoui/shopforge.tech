'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  paymentMethod: string;
  createdAt: string;
  customer: {
    firstName: string;
    lastName: string;
    phone: string;
  };
  shipment?: {
    address: string;
    city: string;
    governorate: string;
  };
  items: Array<{
    quantity: number;
    product: { name: string };
  }>;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
  CONFIRMED: { label: 'Confirmée', color: 'bg-blue-100 text-blue-700' },
  PROCESSING: { label: 'En préparation', color: 'bg-purple-100 text-purple-700' },
  SHIPPED: { label: 'Expédiée', color: 'bg-indigo-100 text-indigo-700' },
  DELIVERED: { label: 'Livrée', color: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'Annulée', color: 'bg-red-100 text-red-700' },
  RETURNED: { label: 'Retournée', color: 'bg-gray-100 text-gray-700' },
};

const LOGISTIC_STATUSES = ['CONFIRMED', 'PROCESSING'];

export default function LogisticsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');

  const loadOrders = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 100 };
      if (selectedStatus && selectedStatus !== 'all') {
        params.status = selectedStatus;
      }
      const res = await api.get('/orders', { params });
      const allOrders = res.data.orders || [];

      // Filter for logistics: only CONFIRMED or PROCESSING
      let filtered = allOrders.filter((o: Order) =>
        LOGISTIC_STATUSES.includes(o.status)
      );

      // Apply date filter if set
      if (dateFilter) {
        const targetDate = new Date(dateFilter);
        filtered = filtered.filter((o: Order) => {
          const orderDate = new Date(o.createdAt);
          return orderDate.toDateString() === targetDate.toDateString();
        });
      }

      setOrders(filtered);
    } catch (err) {
      console.error('Error loading orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [selectedStatus, dateFilter]);

  const toggleSelectOrder = (id: string) => {
    const newSet = new Set(selectedOrders);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedOrders(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedOrders.size === orders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(orders.map(o => o.id)));
    }
  };

  const handleBulkUpdate = async () => {
    if (!bulkStatus || selectedOrders.size === 0) return;
    if (!confirm(`Mettre à jour ${selectedOrders.size} commande(s) vers "${STATUS_LABELS[bulkStatus]?.label}" ?`)) return;

    try {
      await api.patch('/orders/bulk/status', {
        ids: Array.from(selectedOrders),
        status: bulkStatus,
      });
      alert('Statuts mis à jour avec succès');
      setSelectedOrders(new Set());
      setBulkStatus('');
      loadOrders();
    } catch (err) {
      alert('Erreur lors de la mise à jour');
    }
  };

  const printLabels = () => {
    if (selectedOrders.size === 0) {
      alert('Veuillez sélectionner au moins une commande');
      return;
    }

    const selectedOrdersList = orders.filter(o => selectedOrders.has(o.id));

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Étiquettes d'expédition</title>
        <style>
          @media print {
            @page { margin: 1cm; }
            body { margin: 0; }
            .label { page-break-after: always; }
            .label:last-child { page-break-after: avoid; }
          }
          body {
            font-family: Arial, sans-serif;
            font-size: 12pt;
          }
          .label {
            border: 2px solid #000;
            padding: 20px;
            margin-bottom: 20px;
            width: 10cm;
            min-height: 7cm;
          }
          .label h2 {
            margin: 0 0 10px 0;
            font-size: 18pt;
            border-bottom: 2px solid #000;
            padding-bottom: 5px;
          }
          .label p {
            margin: 5px 0;
          }
          .label .strong {
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        ${selectedOrdersList.map(order => `
          <div class="label">
            <h2>Commande #${order.orderNumber}</h2>
            <p class="strong">Destinataire:</p>
            <p>${order.customer.firstName} ${order.customer.lastName}</p>
            <p>${order.customer.phone}</p>
            ${order.shipment ? `
              <p class="strong" style="margin-top: 15px;">Adresse:</p>
              <p>${order.shipment.address}</p>
              <p>${order.shipment.city}, ${order.shipment.governorate}</p>
            ` : ''}
            <p class="strong" style="margin-top: 15px;">Articles:</p>
            ${order.items.map(item => `
              <p>• ${item.quantity}x ${item.product.name}</p>
            `).join('')}
            <p class="strong" style="margin-top: 15px;">Total: ${order.totalAmount.toFixed(3)} TND</p>
          </div>
        `).join('')}
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">📦 Logistique</h1>
        <p className="text-sm text-gray-500 mt-1">Commandes à préparer et à expédier</p>
      </div>

      {/* Filters & Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Status Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Statut</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Tous</option>
              <option value="CONFIRMED">Confirmées</option>
              <option value="PROCESSING">En préparation</option>
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Bulk Status Update */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Mise à jour en masse ({selectedOrders.size})
            </label>
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={selectedOrders.size === 0}
            >
              <option value="">Changer statut...</option>
              <option value="PROCESSING">En préparation</option>
              <option value="SHIPPED">Expédiée</option>
              <option value="DELIVERED">Livrée</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-end gap-2">
            <button
              onClick={handleBulkUpdate}
              disabled={!bulkStatus || selectedOrders.size === 0}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Appliquer
            </button>
            <button
              onClick={printLabels}
              disabled={selectedOrders.size === 0}
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Imprimer étiquettes"
            >
              🖨️
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
          <div className="text-2xl font-bold text-blue-900">
            {orders.filter(o => o.status === 'CONFIRMED').length}
          </div>
          <div className="text-xs text-blue-600">Confirmées</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
          <div className="text-2xl font-bold text-purple-900">
            {orders.filter(o => o.status === 'PROCESSING').length}
          </div>
          <div className="text-xs text-purple-600">En préparation</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          <div className="text-2xl font-bold text-gray-900">{orders.length}</div>
          <div className="text-xs text-gray-600">Total à traiter</div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {orders.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-4xl mb-2">✅</p>
            <p>Aucune commande à préparer</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedOrders.size === orders.length && orders.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Commande
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Articles
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Adresse
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className={selectedOrders.has(order.id) ? 'bg-indigo-50' : 'hover:bg-gray-50'}
                  >
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedOrders.has(order.id)}
                        onChange={() => toggleSelectOrder(order.id)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">#{order.orderNumber}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {order.customer.firstName} {order.customer.lastName}
                      </div>
                      <div className="text-xs text-gray-500">{order.customer.phone}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-xs text-gray-600">
                        {order.items.map((item, idx) => (
                          <div key={idx}>
                            {item.quantity}x {item.product.name}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {order.shipment ? (
                        <div className="text-xs text-gray-600">
                          <div>{order.shipment.address}</div>
                          <div>{order.shipment.city}, {order.shipment.governorate}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          STATUS_LABELS[order.status]?.color || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {STATUS_LABELS[order.status]?.label || order.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {order.totalAmount.toFixed(3)} TND
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
