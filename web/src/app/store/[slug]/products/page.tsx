'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import ProductCard from '@/components/store/ProductCard';
import { getTheme, getThemeUtils } from '@/lib/themes';

interface Category { id: string; name: string; slug: string }
interface Product {
  id: string; name: string; slug: string; price: string;
  comparePrice: string | null; stock: number; images: string[];
  description: string | null; category: { name: string; slug: string } | null;
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type SortKey = '' | 'price-asc' | 'price-desc' | 'name-az' | 'name-za';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: '', label: 'Pertinence' },
  { value: 'price-asc', label: 'Prix : croissant' },
  { value: 'price-desc', label: 'Prix : décroissant' },
  { value: 'name-az', label: 'Nom : A → Z' },
  { value: 'name-za', label: 'Nom : Z → A' },
];

function sortProducts(products: Product[], sort: SortKey): Product[] {
  if (!sort) return products;
  return [...products].sort((a, b) => {
    switch (sort) {
      case 'price-asc': return Number(a.price) - Number(b.price);
      case 'price-desc': return Number(b.price) - Number(a.price);
      case 'name-az': return a.name.localeCompare(b.name, 'fr');
      case 'name-za': return b.name.localeCompare(a.name, 'fr');
      default: return 0;
    }
  });
}

export default function ProductsPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortKey>('');
  const [themeKey, setThemeKey] = useState<string>('default');

  const currentCategory = searchParams.get('category') ?? '';
  const currentSearch = searchParams.get('q') ?? '';
  const [searchInput, setSearchInput] = useState(currentSearch);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateParams = useCallback((updates: Record<string, string>) => {
    const p = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v) p.set(k, v); else p.delete(k);
    }
    router.push(`${pathname}?${p.toString()}`);
  }, [searchParams, router, pathname]);

  // Load categories + tenant theme once
  useEffect(() => {
    fetch(`${API}/categories/public`, { headers: { 'X-Tenant-Slug': params.slug } })
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => {});
    fetch(`${API}/tenants/public/${params.slug}`)
      .then((r) => r.json())
      .then((t) => { if (t.theme) setThemeKey(t.theme); })
      .catch(() => {});
  }, [params.slug]);

  // Load products when filters change
  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (currentSearch) qs.set('q', currentSearch);
    if (currentCategory) qs.set('category', currentCategory);
    fetch(`${API}/products/public?${qs}`, { headers: { 'X-Tenant-Slug': params.slug } })
      .then((r) => r.json())
      .then((data) => { setProducts(Array.isArray(data) ? data : data.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [params.slug, currentSearch, currentCategory]);

  // Debounced search as user types (300ms)
  useEffect(() => {
    if (searchInput === currentSearch) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateParams({ q: searchInput, category: currentCategory });
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const clearAll = () => { setSearchInput(''); updateParams({ q: '', category: '' }); };
  const hasFilters = !!(currentSearch || currentCategory);
  const sorted = sortProducts(products, sort);
  const theme = getTheme(themeKey);
  const tu = getThemeUtils(theme);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex-1">
          Tous les produits
          {!loading && <span className="ml-2 text-base font-normal text-gray-400">({products.length})</span>}
        </h1>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 shrink-0">Trier par</label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className={`border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 ${tu.focusRing} bg-white`}
          >
            {SORT_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="relative flex items-center">
          <svg className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Rechercher..."
            className={`border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 ${tu.focusRing} w-full sm:w-56`}
          />
          {searchInput && (
            <button
              onClick={() => { setSearchInput(''); updateParams({ q: '', category: currentCategory }); }}
              className="absolute right-2 text-gray-400 hover:text-gray-600"
              aria-label="Effacer la recherche"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Category pills */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => updateParams({ category: '', q: currentSearch })}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              !currentCategory ? tu.pillActive : tu.pillInactive
            }`}
          >
            Tout
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => updateParams({ category: cat.slug, q: currentSearch })}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                currentCategory === cat.slug ? tu.pillActive : tu.pillInactive
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Active filters summary */}
      {hasFilters && !loading && (
        <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
          <span>
            <strong>{products.length}</strong> résultat{products.length !== 1 ? 's' : ''}
            {currentSearch && <> pour <span className="font-medium">«&nbsp;{currentSearch}&nbsp;»</span></>}
            {currentCategory && categories.find(c => c.slug === currentCategory) && (
              <> dans <span className="font-medium">{categories.find(c => c.slug === currentCategory)?.name}</span></>
            )}
          </span>
          <button onClick={clearAll} className="text-blue-600 hover:underline text-xs">
            × Effacer
          </button>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-xl aspect-square animate-pulse" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-lg mb-2 font-medium text-gray-500">Aucun produit trouvé</p>
          {hasFilters && (
            <button onClick={clearAll} className="text-blue-600 text-sm hover:underline mt-1">
              Voir tous les produits
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {sorted.map((p) => (
            <ProductCard key={p.id} product={p} storeSlug={params.slug} themeBtn={theme.btn} cardHover={tu.cardHover} />
          ))}
        </div>
      )}
    </div>
  );
}
