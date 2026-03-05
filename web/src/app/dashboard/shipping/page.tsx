'use client';
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import PageHeader from '@/components/dashboard/PageHeader';

interface Carrier {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  description: string | null;
  apiType: string;
}

interface TenantCarrier {
  id: string;
  carrierId: string;
  apiKey: string | null;
  isActive: boolean;
  isDefault: boolean;
  carrier: Carrier;
}

interface Shipment {
  id: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  status: string;
  rawStatus: string | null;
  lastSyncedAt: string | null;
  notes: string | null;
  createdAt: string;
  carrier: { name: string; slug: string; logoUrl: string | null };
  order: { orderNumber: string; customerName: string; status: string };
}

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
  PENDING: 'bg-amber-900/40 text-amber-400',
  PICKED_UP: 'bg-blue-900/40 text-blue-400',
  IN_TRANSIT: 'bg-indigo-900/40 text-indigo-400',
  OUT_FOR_DELIVERY: 'bg-purple-900/40 text-purple-400',
  DELIVERED: 'bg-emerald-900/40 text-emerald-400',
  FAILED: 'bg-red-900/40 text-red-400',
  RETURNED: 'bg-orange-900/40 text-orange-400',
};

function fmt(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ShippingPage() {
  const [tab, setTab] = useState<'carriers' | 'shipments'>('carriers');
  const [availableCarriers, setAvailableCarriers] = useState<Carrier[]>([]);
  const [myCarriers, setMyCarriers] = useState<TenantCarrier[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  // Modal configure carrier
  const [configModal, setConfigModal] = useState<Carrier | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [configSaving, setConfigSaving] = useState(false);
  const [configError, setConfigError] = useState('');

  const loadCarriers = useCallback(async () => {
    setLoading(true);
    try {
      const [avail, mine] = await Promise.all([
        api.get('/shipping/carriers'),
        api.get('/shipping/my-carriers'),
      ]);
      setAvailableCarriers(avail.data);
      setMyCarriers(mine.data);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadShipments = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/shipping/shipments');
      setShipments(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'carriers') loadCarriers();
    else loadShipments();
  }, [tab, loadCarriers, loadShipments]);

  function isConfigured(carrierId: string) {
    return myCarriers.some((mc) => mc.carrierId === carrierId);
  }

  function getMyCarrier(carrierId: string) {
    return myCarriers.find((mc) => mc.carrierId === carrierId);
  }

  function openConfigure(carrier: Carrier) {
    setConfigModal(carrier);
    const existing = getMyCarrier(carrier.id);
    setApiKeyInput(existing?.apiKey ?? '');
    setConfigError('');
  }

  async function saveCarrierConfig() {
    if (!configModal) return;
    setConfigSaving(true);
    setConfigError('');
    try {
      await api.post(`/shipping/carriers/${configModal.id}`, {
        apiKey: apiKeyInput || undefined,
      });
      await loadCarriers();
      setConfigModal(null);
    } catch (e: any) {
      setConfigError(e?.response?.data?.message ?? 'Erreur lors de la configuration');
    } finally {
      setConfigSaving(false);
    }
  }

  async function removeCarrier(carrierId: string) {
    await api.delete(`/shipping/carriers/${carrierId}`);
    setMyCarriers((ms) => ms.filter((m) => m.carrierId !== carrierId));
  }

  async function setDefault(carrierId: string) {
    await api.patch(`/shipping/carriers/${carrierId}/default`);
    setMyCarriers((ms) => ms.map((m) => ({ ...m, isDefault: m.carrierId === carrierId })));
  }

  async function syncShipment(shipmentId: string) {
    setSyncing(shipmentId);
    try {
      const { data } = await api.post(`/shipping/shipments/${shipmentId}/sync`);
      setShipments((ss) => ss.map((s) => (s.id === shipmentId ? { ...s, status: data.status, rawStatus: data.rawStatus, lastSyncedAt: data.lastSyncedAt } : s)));
    } catch {
      // silently ignore
    } finally {
      setSyncing(null);
    }
  }

  return (
    <div>
      <PageHeader title="Livraison">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          {(['carriers', 'shipments'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                tab === t
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'carriers' ? '🚚 Transporteurs' : '📦 Expéditions'}
            </button>
          ))}
        </div>
      </PageHeader>

      {/* Configure carrier modal */}
      {configModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
              Configurer {configModal.name}
            </h2>
            {configModal.apiType !== 'generic' && (
              <p className="text-xs text-gray-500 mb-4">Entrez votre clé API personnelle pour ce transporteur.</p>
            )}
            {configModal.apiType === 'generic' && (
              <p className="text-xs text-gray-500 mb-4">Ce transporteur utilise un suivi manuel (pas d'API automatique).</p>
            )}

            {configModal.apiType !== 'generic' && (
              <div className="mb-4">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Clé API</label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Votre token/clé API..."
                />
                {configModal.apiType === 'aramex' && (
                  <p className="text-xs text-gray-400 mt-1">
                    Format Aramex : <span className="font-mono">AccountNumber|Username|Password|AccountPin|Entity|Country</span>
                  </p>
                )}
              </div>
            )}

            {configError && <p className="text-red-500 text-xs mb-3">{configError}</p>}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfigModal(null)}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={saveCarrierConfig}
                disabled={configSaving}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
              >
                {configSaving ? '...' : 'Activer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tab === 'carriers' ? (
        /* ── CARRIERS TAB ── */
        <div className="space-y-6">
          {/* My configured carriers */}
          {myCarriers.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Mes transporteurs actifs</h2>
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl divide-y divide-gray-100 dark:divide-gray-800">
                {myCarriers.map((mc) => (
                  <div key={mc.id} className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      {mc.carrier.logoUrl ? (
                        <img src={mc.carrier.logoUrl} alt={mc.carrier.name} className="w-9 h-9 object-contain rounded-lg bg-gray-50 dark:bg-gray-800 p-1" />
                      ) : (
                        <div className="w-9 h-9 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center text-base">🚚</div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{mc.carrier.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {mc.isDefault && (
                            <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full font-medium">
                              Par défaut
                            </span>
                          )}
                          <span className="text-xs text-gray-400 font-mono">{mc.carrier.apiType}</span>
                          {mc.apiKey && <span className="text-xs text-emerald-500">✓ Clé API</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!mc.isDefault && (
                        <button
                          onClick={() => setDefault(mc.carrierId)}
                          className="px-3 py-1.5 text-xs text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                          Définir défaut
                        </button>
                      )}
                      <button
                        onClick={() => openConfigure(mc.carrier)}
                        className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => removeCarrier(mc.carrierId)}
                        className="px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        Retirer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available carriers to add */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Transporteurs disponibles</h2>
            {availableCarriers.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-3xl mb-2">🚚</p>
                <p className="text-sm">Aucun transporteur disponible pour le moment.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableCarriers.map((c) => {
                  const configured = isConfigured(c.id);
                  return (
                    <div
                      key={c.id}
                      className={`bg-white dark:bg-gray-900 border rounded-xl p-4 flex flex-col gap-3 ${
                        configured ? 'border-blue-200 dark:border-blue-800' : 'border-gray-200 dark:border-gray-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {c.logoUrl ? (
                          <img src={c.logoUrl} alt={c.name} className="w-10 h-10 object-contain rounded-lg bg-gray-50 dark:bg-gray-800 p-1" />
                        ) : (
                          <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center text-xl">🚚</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{c.name}</p>
                          <p className="text-xs text-gray-400 font-mono">{c.apiType}</p>
                        </div>
                        {configured && (
                          <span className="text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                            Activé
                          </span>
                        )}
                      </div>
                      {c.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{c.description}</p>
                      )}
                      <button
                        onClick={() => openConfigure(c)}
                        className={`w-full text-sm font-medium py-2 rounded-lg transition-colors ${
                          configured
                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {configured ? 'Reconfigurer' : 'Activer'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── SHIPMENTS TAB ── */
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          {shipments.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">📦</p>
              <p className="text-sm">Aucune expédition créée</p>
              <p className="text-xs mt-1 text-gray-500">Les expéditions sont créées depuis les détails d'une commande.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Commande</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Transporteur</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">N° suivi</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Statut</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Sync</th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {shipments.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-mono text-xs text-gray-600 dark:text-gray-400">{s.order.orderNumber}</p>
                        <p className="text-xs text-gray-500">{s.order.customerName}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-900 dark:text-white">{s.carrier.name}</p>
                      </td>
                      <td className="px-4 py-3">
                        {s.trackingNumber ? (
                          s.trackingUrl ? (
                            <a
                              href={s.trackingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-xs text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              {s.trackingNumber}
                            </a>
                          ) : (
                            <span className="font-mono text-xs text-gray-600 dark:text-gray-400">{s.trackingNumber}</span>
                          )
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${SHIPMENT_STATUS_COLORS[s.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {SHIPMENT_STATUS_LABELS[s.status] ?? s.status}
                        </span>
                        {s.rawStatus && s.rawStatus !== 'MANUAL' && (
                          <p className="text-xs text-gray-400 mt-0.5">{s.rawStatus}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-gray-400">
                          {s.lastSyncedAt ? fmt(s.lastSyncedAt) : '—'}
                        </p>
                      </td>
                      <td className="px-5 py-3 text-right">
                        {s.trackingNumber && (
                          <button
                            onClick={() => syncShipment(s.id)}
                            disabled={syncing === s.id}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                          >
                            {syncing === s.id ? 'Sync...' : '↻ Sync'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
