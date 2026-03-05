'use client';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { api } from '@/lib/api';
import Pagination from '@/components/Pagination';
import PageHeader from '@/components/dashboard/PageHeader';
import LoadingSkeleton from '@/components/dashboard/LoadingSkeleton';
import { imageUrl } from '@/lib/imageUrl';

interface Variant {
  id: string;
  name: string;
  price: number | null;
  stock: number;
  sku: string | null;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  price: string;
  comparePrice: string | null;
  costPrice: string | null;
  stock: number;
  isActive: boolean;
  images: string[];
  category: { id: string; name: string } | null;
  variants: Variant[];
  barcode: string | null;
  lowStockThreshold: number;
}

interface Category {
  id: string;
  name: string;
}

const emptyForm = {
  name: '',
  slug: '',
  description: '',
  price: '',
  comparePrice: '',
  costPrice: '',
  stock: '0',
  isActive: true,
  categoryId: '',
  images: [] as string[],
  barcode: '',
  lowStockThreshold: '5',
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  const [imagePreview, setImagePreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [variantForm, setVariantForm] = useState({ name: '', price: '', stock: '0' });
  const [savingVariant, setSavingVariant] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (selectedIds.size === products.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(products.map((p) => p.id)));
  };
  const handleBulk = async (action: 'delete' | 'activate' | 'deactivate') => {
    if (selectedIds.size === 0) return;
    if (action === 'delete' && !confirm(`Supprimer ${selectedIds.size} produit(s) ?`)) return;
    setBulkLoading(true);
    try {
      await api.patch('/products/bulk', { ids: Array.from(selectedIds), action });
      setSelectedIds(new Set());
      await load();
    } catch (e) { console.error(e); }
    finally { setBulkLoading(false); }
  };

  // Import CSV
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; errors: string[] } | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      const { data } = await api.post('/products/import', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(data);
      setImportFile(null);
      await load();
    } catch (e: any) {
      setImportResult({ created: 0, errors: [e?.response?.data?.message || 'Erreur import'] });
    } finally {
      setImporting(false);
    }
  };

  // Inline stock edit
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [stockInput, setStockInput] = useState('');

  const handleStockEdit = (p: Product) => {
    setEditingStockId(p.id);
    setStockInput(String(p.stock));
  };

  const handleStockSave = async (productId: string) => {
    const val = parseInt(stockInput);
    if (isNaN(val) || val < 0) { setEditingStockId(null); return; }
    try {
      await api.patch(`/products/${productId}`, { stock: val });
      await load();
    } catch (e) { console.error(e); }
    setEditingStockId(null);
  };

  const load = useCallback(async (p = page) => {
    try {
      const [prodRes, catRes] = await Promise.all([
        api.get(`/products?page=${p}&limit=20`),
        api.get('/categories'),
      ]);
      setProducts(prodRes.data.data);
      setTotal(prodRes.data.total);
      setTotalPages(prodRes.data.totalPages);
      setCategories(catRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const handlePageChange = (p: number) => { setPage(p); };

  const handleNameChange = (name: string) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 50);
    setForm((f) => ({ ...f, name, slug }));
  };

  const handleAiDescription = async () => {
    if (!form.name.trim()) { setError('Saisissez un nom de produit avant de générer la description.'); return; }
    setAiGenerating(true);
    setError('');
    try {
      const categoryName = categories.find((c) => c.id === form.categoryId)?.name;
      const { data } = await api.post('/ai/product-description', {
        productName: form.name,
        ...(categoryName && { category: categoryName }),
        ...(form.price && { price: parseFloat(form.price) }),
        ...(form.description && { existingDescription: form.description }),
      });
      setForm((f) => ({ ...f, description: data.description }));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la génération IA');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/uploads', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImagePreview(imageUrl(data.url));
      setForm((f) => ({ ...f, images: [data.url] }));
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload: any = {
        name: form.name,
        slug: form.slug,
        price: parseFloat(form.price),
        stock: parseInt(form.stock),
        isActive: form.isActive,
        images: form.images,
        lowStockThreshold: parseInt(form.lowStockThreshold) || 5,
      };
      if (form.description) payload.description = form.description;
      if (form.comparePrice) payload.comparePrice = parseFloat(form.comparePrice);
      if (form.costPrice) payload.costPrice = parseFloat(form.costPrice);
      if (form.barcode) payload.barcode = form.barcode;
      if (form.categoryId) payload.categoryId = form.categoryId;

      const { data } = await api.post('/products', payload);
      setForm(emptyForm);
      setImagePreview('');
      setShowForm(false);
      setEditingProduct(data);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (product: Product) => {
    try {
      await api.patch(`/products/${product.id}`, { isActive: !product.isActive });
      await load();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce produit et toutes ses variantes ?')) return;
    try {
      await api.delete(`/products/${id}`);
      await load();
    } catch (e) { console.error(e); }
  };

  const handleAddVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setSavingVariant(true);
    try {
      await api.post(`/products/${editingProduct.id}/variants`, {
        name: variantForm.name,
        stock: parseInt(variantForm.stock),
        ...(variantForm.price ? { price: parseFloat(variantForm.price) } : {}),
      });
      setVariantForm({ name: '', price: '', stock: '0' });
      const { data } = await api.get(`/products/${editingProduct.id}`);
      setEditingProduct(data);
      await load();
    } catch (err: any) {
      console.error(err);
    } finally {
      setSavingVariant(false);
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    if (!editingProduct) return;
    try {
      await api.delete(`/products/${editingProduct.id}/variants/${variantId}`);
      const { data } = await api.get(`/products/${editingProduct.id}`);
      setEditingProduct(data);
      await load();
    } catch (e) { console.error(e); }
  };

  // Sorting
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock' | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const toggleSort = (col: 'name' | 'price' | 'stock') => {
    if (sortBy === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(col); setSortDir('asc'); }
  };

  const sortedProducts = useMemo(() => {
    if (!sortBy) return products;
    return [...products].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortBy === 'price') cmp = Number(a.price) - Number(b.price);
      else if (sortBy === 'stock') cmp = a.stock - b.stock;
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }, [products, sortBy, sortDir]);

  const lowStock = products.filter((p) => {
    const threshold = p.lowStockThreshold ?? 5;
    if (p.variants.length > 0) return p.variants.some((v) => v.stock <= threshold && v.stock > 0);
    return p.stock <= threshold && p.stock > 0;
  });
  const outOfStock = products.filter((p) => {
    if (p.variants.length > 0) return p.variants.every((v) => v.stock === 0);
    return p.stock === 0;
  });

  return (
    <div>
      <PageHeader
        title="Produits"
        subtitle={`${products.length} produit${products.length > 1 ? 's' : ''}`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowImport(true); setImportResult(null); setImportFile(null); }}
              className="border border-gray-200 text-gray-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Importer CSV
            </button>
            <button
              onClick={async () => {
                const { data } = await api.get('/products/export/csv', { responseType: 'blob' });
                const url = URL.createObjectURL(data);
                const a = document.createElement('a'); a.href = url; a.download = 'produits.csv'; a.click();
                URL.revokeObjectURL(url);
              }}
              className="border border-gray-200 text-gray-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Exporter CSV
            </button>
            <button
              onClick={() => { setShowForm(true); setError(''); }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              + Ajouter un produit
            </button>
          </div>
        }
      >
        {/* Stock alerts */}
        {(outOfStock.length > 0 || lowStock.length > 0) && (
          <div className="space-y-2">
            {outOfStock.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3 text-sm">
                <span className="text-red-500 font-bold text-base">!</span>
                <span className="text-red-700">
                  <strong>{outOfStock.length} produit{outOfStock.length > 1 ? 's' : ''} épuisé{outOfStock.length > 1 ? 's' : ''}</strong>
                  {' '}— {outOfStock.map((p) => p.name).join(', ')}
                </span>
              </div>
            )}
            {lowStock.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-center gap-3 text-sm">
                <span className="text-orange-500 font-bold text-base">⚠</span>
                <span className="text-orange-700">
                  <strong>{lowStock.length} produit{lowStock.length > 1 ? 's' : ''} en stock bas</strong>
                  {' '}— {lowStock.map((p) => p.name).join(', ')}
                </span>
              </div>
            )}
          </div>
        )}
      </PageHeader>

      {/* Modal création */}
      {showForm && (
        <div className="modal-overlay fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="modal-dialog bg-white rounded-xl shadow-xl w-full max-w-lg my-4">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Nouveau produit</h2>
              <button onClick={() => { setShowForm(false); setError(''); setImagePreview(''); setForm(emptyForm); }} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>}

              {/* Image upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Image</label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 rounded-xl h-32 flex items-center justify-center cursor-pointer hover:border-blue-400 transition-colors overflow-hidden"
                >
                  {imagePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <p className="text-sm text-gray-400">{uploading ? 'Upload...' : 'Cliquer pour ajouter une image'}</p>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </div>

              {/* Nom */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                <input type="text" value={form.name} onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" required />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                <input type="text" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono" required />
              </div>

              {/* Description */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">Description</label>
                  <button
                    type="button"
                    onClick={handleAiDescription}
                    disabled={aiGenerating || !form.name.trim()}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-600 hover:text-purple-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {aiGenerating ? (
                      <>
                        <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                        Génération...
                      </>
                    ) : (
                      <>{'\u2728'} Générer avec l&apos;IA</>
                    )}
                  </button>
                </div>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3} maxLength={500} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none" />
                <div className="flex justify-end mt-1">
                  <span className={`text-xs font-medium ${form.description.length > 450 ? 'text-red-500' : form.description.length > 375 ? 'text-orange-500' : 'text-gray-400'}`}>
                    {form.description.length} / 500
                  </span>
                </div>
              </div>

              {/* Prix */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prix (TND) *</label>
                  <input type="number" step="0.01" min="0" value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prix barré (TND)</label>
                  <input type="number" step="0.01" min="0" placeholder="Optionnel" value={form.comparePrice}
                    onChange={(e) => setForm({ ...form, comparePrice: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
              </div>

              {/* Stock + Catégorie */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock *</label>
                  <input type="number" min="0" value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                  <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white">
                    <option value="">Sans catégorie</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="isActive" checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                <label htmlFor="isActive" className="text-sm text-gray-700">Visible sur la boutique</label>
              </div>

              {/* Options avancées */}
              <div className="border border-gray-100 rounded-lg overflow-hidden">
                <button type="button" onClick={() => setShowAdvanced((v) => !v)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors">
                  <span>Options avancées (slug, prix d&apos;achat, code-barres, seuil alerte)</span>
                  <span className="text-gray-400">{showAdvanced ? '▲' : '▼'}</span>
                </button>
                {showAdvanced && (
                  <div className="px-3 pb-3 pt-1 space-y-3 border-t border-gray-100 bg-gray-50/50">
                    {/* Slug */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL)</label>
                      <input type="text" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono" required />
                    </div>
                    {/* Prix d'achat + Code-barres */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Prix d&apos;achat (TND)</label>
                        <input type="number" step="0.01" min="0" placeholder="Optionnel" value={form.costPrice}
                          onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Code-barres</label>
                        <input type="text" placeholder="EAN / UPC" value={form.barcode}
                          onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono" />
                      </div>
                    </div>
                    {/* Seuil alerte stock */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Seuil alerte stock</label>
                      <input type="number" min="0" value={form.lowStockThreshold}
                        onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                      <p className="text-xs text-gray-400 mt-1">Alerte affichée quand le stock passe sous ce seuil.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving || uploading}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {saving ? 'Création...' : 'Créer le produit'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setError(''); setImagePreview(''); setForm(emptyForm); }}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal import CSV */}
      {showImport && (
        <div className="modal-overlay fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="modal-dialog bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Importer des produits</h2>
              <button onClick={() => setShowImport(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700 space-y-1">
                <p className="font-semibold">Format CSV attendu (séparateur: point-virgule)</p>
                <p className="font-mono text-blue-600">name;price;stock;description;slug</p>
                <p>La première ligne (en-têtes) est ignorée. Le slug est optionnel.</p>
              </div>

              <div
                onClick={() => importRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl py-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
              >
                {importFile ? (
                  <div>
                    <p className="text-sm font-medium text-gray-900">{importFile.name}</p>
                    <p className="text-xs text-gray-400 mt-1">{(importFile.size / 1024).toFixed(1)} Ko</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Cliquer pour sélectionner un fichier CSV</p>
                )}
              </div>
              <input ref={importRef} type="file" accept=".csv,text/csv" className="hidden"
                onChange={(e) => { setImportFile(e.target.files?.[0] ?? null); setImportResult(null); }} />

              {importResult && (
                <div className={`rounded-lg p-3 text-sm ${importResult.created > 0 ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                  {importResult.created > 0 && <p className="font-medium">{importResult.created} produit{importResult.created > 1 ? 's' : ''} importé{importResult.created > 1 ? 's' : ''}</p>}
                  {importResult.errors.length > 0 && (
                    <ul className="list-disc list-inside mt-1 space-y-0.5 text-xs">
                      {importResult.errors.slice(0, 10).map((err, i) => <li key={i}>{err}</li>)}
                      {importResult.errors.length > 10 && <li>... et {importResult.errors.length - 10} autres erreurs</li>}
                    </ul>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={handleImport} disabled={!importFile || importing}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {importing ? 'Import en cours...' : 'Importer'}
                </button>
                <button onClick={() => setShowImport(false)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Panel variantes */}
      {editingProduct && (
        <div className="modal-overlay fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="modal-dialog bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">Variantes — {editingProduct.name}</h2>
                <p className="text-xs text-gray-500 mt-0.5">ex : Rouge/M, Bleu/L, 256GB...</p>
              </div>
              <button onClick={() => setEditingProduct(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
              {editingProduct.variants.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Aucune variante. Ajoutez-en ci-dessous.</p>
              ) : editingProduct.variants.map((v) => (
                <div key={v.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{v.name}</p>
                    <p className="text-xs text-gray-500">
                      {v.price !== null ? `${Number(v.price).toFixed(2)} TND` : 'Prix produit'} · Stock : {v.stock}
                    </p>
                  </div>
                  <button onClick={() => handleDeleteVariant(v.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">
                    Supprimer
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddVariant} className="px-6 py-4 border-t border-gray-100 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Nouvelle variante</p>
              <div className="grid grid-cols-3 gap-2">
                <input type="text" placeholder="Nom *" value={variantForm.name}
                  onChange={(e) => setVariantForm({ ...variantForm, name: e.target.value })}
                  className="col-span-3 sm:col-span-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                <input type="number" step="0.01" min="0" placeholder="Prix (opt.)" value={variantForm.price}
                  onChange={(e) => setVariantForm({ ...variantForm, price: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input type="number" min="0" placeholder="Stock" value={variantForm.stock}
                  onChange={(e) => setVariantForm({ ...variantForm, stock: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>
              <button type="submit" disabled={savingVariant}
                className="w-full bg-gray-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors">
                {savingVariant ? 'Ajout...' : '+ Ajouter'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="bg-gray-900 text-white rounded-xl px-5 py-3 flex items-center justify-between">
          <span className="text-sm font-medium">{selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => handleBulk('activate')} disabled={bulkLoading}
              className="px-3 py-1.5 bg-green-600 rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
              Activer
            </button>
            <button onClick={() => handleBulk('deactivate')} disabled={bulkLoading}
              className="px-3 py-1.5 bg-yellow-600 rounded-lg text-xs font-medium hover:bg-yellow-700 disabled:opacity-50 transition-colors">
              Désactiver
            </button>
            <button onClick={() => handleBulk('delete')} disabled={bulkLoading}
              className="px-3 py-1.5 bg-red-600 rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50 transition-colors">
              Supprimer
            </button>
            <button onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 border border-white/30 rounded-lg text-xs font-medium hover:bg-white/10 transition-colors">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <LoadingSkeleton type="table" rows={8} />
        ) : products.length === 0 ? (
          <div className="px-6 py-20 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl text-gray-300">⊞</span>
            </div>
            <p className="text-gray-900 font-medium mb-1">Aucun produit</p>
            <p className="text-gray-400 text-sm mb-5">Commencez par ajouter votre premier produit à votre boutique.</p>
            <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">+ Ajouter un produit</button>
          </div>
        ) : (
          <>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-3 py-3 w-10">
                  <input type="checkbox" checked={products.length > 0 && selectedIds.size === products.length} onChange={toggleAll}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none" onClick={() => toggleSort('name')}>
                  Produit {sortBy === 'name' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none" onClick={() => toggleSort('price')}>
                  Prix {sortBy === 'price' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none" onClick={() => toggleSort('stock')}>
                  Stock {sortBy === 'stock' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Variantes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortedProducts.map((p) => (
                <tr key={p.id} className={`transition-colors ${selectedIds.has(p.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                  <td className="px-3 py-4">
                    <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {p.images?.[0] ? (
                        <Image src={imageUrl(p.images[0])} alt={p.name} width={40} height={40} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-300 text-lg flex-shrink-0">◈</div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{p.name}</p>
                        {p.category && <p className="text-xs text-blue-600">{p.category.name}</p>}
                        <p className="text-xs text-gray-400 font-mono">{p.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-gray-900">{Number(p.price).toFixed(2)} TND</p>
                    {p.comparePrice && (
                      <p className="text-xs text-gray-400 line-through">{Number(p.comparePrice).toFixed(2)} TND</p>
                    )}
                    {p.costPrice && (
                      <p className="text-xs text-emerald-600 font-medium">
                        Marge {((Number(p.price) - Number(p.costPrice)) / Number(p.price) * 100).toFixed(0)}%
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingStockId === p.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number" min="0"
                          value={stockInput}
                          onChange={(e) => setStockInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleStockSave(p.id); if (e.key === 'Escape') setEditingStockId(null); }}
                          autoFocus
                          className="w-16 border border-blue-400 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button onClick={() => handleStockSave(p.id)} className="text-green-600 hover:text-green-800 text-xs font-bold">✓</button>
                        <button onClick={() => setEditingStockId(null)} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleStockEdit(p)}
                        className={`text-sm font-medium hover:underline decoration-dashed ${
                          p.stock === 0 ? 'text-red-600' : p.stock <= (p.lowStockThreshold ?? 5) ? 'text-orange-500' : 'text-gray-900'
                        }`}
                        title="Cliquer pour modifier le stock"
                      >
                        {p.stock}
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => setEditingProduct(p)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                      {p.variants.length > 0 ? `${p.variants.length} variante${p.variants.length > 1 ? 's' : ''}` : '+ Ajouter'}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => handleToggle(p)}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                        p.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}>
                      {p.isActive ? 'Actif' : 'Inactif'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleDelete(p.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} total={total} onPageChange={handlePageChange} />
          </>
        )}
      </div>
    </div>
  );
}
