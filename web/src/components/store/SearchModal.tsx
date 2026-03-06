'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface SearchResult {
  id: string;
  name: string;
  slug: string;
  price: string;
  images: string[];
}

function imageUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${API_URL}${path}`;
}

export default function SearchModal({
  slug,
  isDark,
  onClose,
}: {
  slug: string;
  isDark: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const search = useCallback(
    async (q: string) => {
      if (q.trim().length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(
          `${API_URL}/products/public?q=${encodeURIComponent(q.trim())}&limit=8`,
          { headers: { 'X-Tenant-Slug': slug } }
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data.data ?? data);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    },
    [slug]
  );

  const handleChange = (value: string) => {
    setQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(value), 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Rechercher un produit..."
            className="flex-1 text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
          />
          <button onClick={onClose} className="text-xs text-gray-400 border border-gray-200 rounded px-1.5 py-0.5 font-mono">
            ESC
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {loading && (
            <div className="px-5 py-8 text-center text-sm text-gray-400">Recherche...</div>
          )}

          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-gray-400">
              Aucun produit trouvé pour &quot;{query}&quot;
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="py-2">
              {results.map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  onClick={onClose}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  {product.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrl(product.images[0])}
                      alt={product.name}
                      className="w-10 h-10 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-300 shrink-0">
                      <span className="text-lg">&#x25C8;</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                    <p className="text-xs text-gray-500">{Number(product.price).toFixed(2)} TND</p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {!loading && query.trim().length < 2 && (
            <div className="px-5 py-8 text-center text-sm text-gray-400">
              Tapez au moins 2 caractères...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
