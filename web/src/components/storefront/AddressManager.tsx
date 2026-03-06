'use client';
import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Address {
  id: string;
  label: string;
  line1: string;
  line2?: string;
  city: string;
  governorate: string;
  postalCode?: string;
  country: string;
  isDefault: boolean;
}

interface Props {
  token: string;
  tenantSlug: string;
}

export default function AddressManager({ token, tenantSlug }: Props) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    label: 'Domicile',
    line1: '',
    line2: '',
    city: '',
    governorate: '',
    postalCode: '',
    country: 'Tunisie',
    isDefault: false,
  });

  const loadAddresses = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/store/auth/addresses`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Tenant-Slug': tenantSlug,
        },
      });
      const data = await res.json();
      setAddresses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading addresses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, [token, tenantSlug]);

  const handleSave = async () => {
    try {
      const url = editing
        ? `${API_URL}/store/auth/addresses/${editing}`
        : `${API_URL}/store/auth/addresses`;
      const method = editing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-Tenant-Slug': tenantSlug,
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error('Erreur lors de l\'enregistrement');

      await loadAddresses();
      setShowForm(false);
      setEditing(null);
      setForm({
        label: 'Domicile',
        line1: '',
        line2: '',
        city: '',
        governorate: '',
        postalCode: '',
        country: 'Tunisie',
        isDefault: false,
      });
    } catch (err) {
      alert('Erreur lors de l\'enregistrement de l\'adresse');
    }
  };

  const handleEdit = (address: Address) => {
    setEditing(address.id);
    setForm({
      label: address.label,
      line1: address.line1,
      line2: address.line2 || '',
      city: address.city,
      governorate: address.governorate,
      postalCode: address.postalCode || '',
      country: address.country,
      isDefault: address.isDefault,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette adresse ?')) return;
    try {
      await fetch(`${API_URL}/store/auth/addresses/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Tenant-Slug': tenantSlug,
        },
      });
      await loadAddresses();
    } catch (err) {
      alert('Erreur lors de la suppression');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await fetch(`${API_URL}/store/auth/addresses/${id}/set-default`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Tenant-Slug': tenantSlug,
        },
      });
      await loadAddresses();
    } catch (err) {
      alert('Erreur lors de la mise à jour');
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-400">Chargement...</div>;
  }

  return (
    <div className="space-y-4">
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
        >
          + Ajouter une adresse
        </button>
      )}

      {showForm && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">
            {editing ? 'Modifier l\'adresse' : 'Nouvelle adresse'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Label</label>
              <input
                type="text"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="Domicile, Bureau, etc."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Adresse</label>
              <input
                type="text"
                value={form.line1}
                onChange={(e) => setForm({ ...form, line1: e.target.value })}
                placeholder="Rue, numéro"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Complément (optionnel)</label>
              <input
                type="text"
                value={form.line2}
                onChange={(e) => setForm({ ...form, line2: e.target.value })}
                placeholder="Bâtiment, étage, etc."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Ville</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Gouvernorat</label>
                <input
                  type="text"
                  value={form.governorate}
                  onChange={(e) => setForm({ ...form, governorate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Code postal (optionnel)</label>
                <input
                  type="text"
                  value={form.postalCode}
                  onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Pays</label>
                <input
                  type="text"
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={form.isDefault}
                onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="isDefault" className="text-sm text-gray-700">
                Définir comme adresse par défaut
              </label>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSave}
                disabled={!form.line1 || !form.city || !form.governorate}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-500 disabled:opacity-50"
              >
                Enregistrer
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                  setForm({
                    label: 'Domicile',
                    line1: '',
                    line2: '',
                    city: '',
                    governorate: '',
                    postalCode: '',
                    country: 'Tunisie',
                    isDefault: false,
                  });
                }}
                className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {addresses.length === 0 && !showForm ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-3xl mb-2">📍</p>
          <p className="text-sm">Aucune adresse enregistrée</p>
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 text-sm">{addr.label}</span>
                  {addr.isDefault && (
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                      Par défaut
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(addr)}
                    className="text-xs text-gray-500 hover:text-indigo-600"
                  >
                    Modifier
                  </button>
                  {!addr.isDefault && (
                    <>
                      <span className="text-gray-300">•</span>
                      <button
                        onClick={() => handleSetDefault(addr.id)}
                        className="text-xs text-gray-500 hover:text-indigo-600"
                      >
                        Définir par défaut
                      </button>
                    </>
                  )}
                  <span className="text-gray-300">•</span>
                  <button
                    onClick={() => handleDelete(addr.id)}
                    className="text-xs text-red-500 hover:text-red-600"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-700">{addr.line1}</p>
              {addr.line2 && <p className="text-sm text-gray-700">{addr.line2}</p>}
              <p className="text-sm text-gray-500">
                {addr.city}, {addr.governorate}
                {addr.postalCode && ` ${addr.postalCode}`}
              </p>
              <p className="text-sm text-gray-400">{addr.country}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
