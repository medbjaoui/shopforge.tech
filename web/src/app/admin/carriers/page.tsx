'use client';
import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/admin-api';
import { PageHeader, Badge, Spinner, EmptyState } from '@/components/admin/AdminUI';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { useToast } from '@/components/admin/Toast';
import { PlusIcon, TruckIcon } from '@/components/admin/AdminIcons';

interface Carrier {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  apiBaseUrl: string | null;
  apiType: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

const API_TYPES = ['generic', 'aramex', 'dhl', 'laposte-tn'];

const empty = {
  name: '',
  slug: '',
  logoUrl: '',
  apiBaseUrl: '',
  apiType: 'generic',
  description: '',
};

export default function AdminCarriersPage() {
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Carrier | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toggleConfirm, setToggleConfirm] = useState<Carrier | null>(null);
  const { toast } = useToast();

  async function load() {
    setLoading(true);
    try {
      const { data } = await adminApi.get('/carriers');
      setCarriers(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setError('');
    setShowForm(true);
  }

  function openEdit(c: Carrier) {
    setEditing(c);
    setForm({
      name: c.name,
      slug: c.slug,
      logoUrl: c.logoUrl ?? '',
      apiBaseUrl: c.apiBaseUrl ?? '',
      apiType: c.apiType,
      description: c.description ?? '',
    });
    setError('');
    setShowForm(true);
  }

  async function save() {
    if (!form.name || !form.slug) { setError('Nom et slug obligatoires'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name,
        slug: form.slug,
        logoUrl: form.logoUrl || undefined,
        apiBaseUrl: form.apiBaseUrl || undefined,
        apiType: form.apiType,
        description: form.description || undefined,
      };
      if (editing) {
        const { data } = await adminApi.patch(`/carriers/${editing.id}`, payload);
        setCarriers((cs) => cs.map((c) => (c.id === editing.id ? data : c)));
        toast('success', 'Transporteur modifie');
      } else {
        const { data } = await adminApi.post('/carriers', payload);
        setCarriers((cs) => [...cs, data]);
        toast('success', 'Transporteur ajoute');
      }
      setShowForm(false);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(c: Carrier) {
    setToggleConfirm(null);
    try {
      const { data } = await adminApi.patch(`/carriers/${c.id}/toggle`);
      setCarriers((cs) => cs.map((x) => (x.id === c.id ? { ...x, isActive: data.isActive } : x)));
      toast('success', data.isActive ? `${c.name} active` : `${c.name} desactive`);
    } catch {
      toast('error', 'Erreur lors de la modification');
    }
  }

  return (
    <div>
      <PageHeader title="Transporteurs" subtitle={`${carriers.length} transporteur${carriers.length > 1 ? 's' : ''}`}>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <PlusIcon size={16} />
          Ajouter
        </button>
      </PageHeader>

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 shadow-xl rounded-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5">
              {editing ? 'Modifier le transporteur' : 'Nouveau transporteur'}
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Nom *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Aramex"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Slug *</label>
                  <input
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                    disabled={!!editing}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                    placeholder="aramex"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Type d&apos;API</label>
                <select
                  value={form.apiType}
                  onChange={(e) => setForm((f) => ({ ...f, apiType: e.target.value }))}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {API_TYPES.map((t) => (
                    <option key={t} value={t} className="bg-white">{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">URL de base de l&apos;API</label>
                <input
                  value={form.apiBaseUrl}
                  onChange={(e) => setForm((f) => ({ ...f, apiBaseUrl: e.target.value }))}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="https://api.carrier.com/track"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Logo URL</label>
                <input
                  value={form.logoUrl}
                  onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Description courte..."
                />
              </div>

              {error && <p className="text-red-500 text-xs">{error}</p>}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
              >
                {saving ? '...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
        {loading ? (
          <Spinner />
        ) : carriers.length === 0 ? (
          <EmptyState
            icon={<TruckIcon size={40} />}
            title="Aucun transporteur configure"
            action="Ajouter le premier transporteur"
            onAction={openCreate}
          />
        ) : (
          <div className="divide-y divide-gray-200">
            {carriers.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-4">
                  {c.logoUrl ? (
                    <img src={c.logoUrl} alt={c.name} className="w-10 h-10 object-contain rounded-lg bg-gray-100 p-1" />
                  ) : (
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
                      <TruckIcon size={20} />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-gray-900 font-medium text-sm">{c.name}</p>
                      <span className="text-xs text-gray-500 font-mono bg-gray-100 px-1.5 py-0.5 rounded">{c.apiType}</span>
                      <Badge
                        label={c.isActive ? 'Actif' : 'Inactif'}
                        color={c.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}
                      />
                    </div>
                    <p className="text-gray-500 text-xs font-mono mt-0.5">{c.slug}</p>
                    {c.description && <p className="text-gray-500 text-xs mt-0.5">{c.description}</p>}
                    {c.apiBaseUrl && <p className="text-gray-600 text-xs font-mono mt-0.5 truncate max-w-xs">{c.apiBaseUrl}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEdit(c)}
                    className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => setToggleConfirm(c)}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                      c.isActive
                        ? 'text-red-600 hover:bg-red-50'
                        : 'text-emerald-600 hover:bg-emerald-50'
                    }`}
                  >
                    {c.isActive ? 'Desactiver' : 'Activer'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!toggleConfirm}
        title={toggleConfirm?.isActive ? 'Desactiver le transporteur' : 'Activer le transporteur'}
        message={toggleConfirm ? `Voulez-vous ${toggleConfirm.isActive ? 'desactiver' : 'activer'} "${toggleConfirm.name}" ?` : ''}
        confirmLabel={toggleConfirm?.isActive ? 'Desactiver' : 'Activer'}
        variant={toggleConfirm?.isActive ? 'danger' : 'success'}
        onConfirm={() => toggleConfirm && toggle(toggleConfirm)}
        onCancel={() => setToggleConfirm(null)}
      />
    </div>
  );
}
