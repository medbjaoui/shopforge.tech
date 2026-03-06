'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useWishlist } from '@/contexts/WishlistContext';
import { useCart } from '@/contexts/CartContext';
import { getTheme, getThemeUtils } from '@/lib/themes';
import { imageUrl } from '@/lib/imageUrl';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function WishlistPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { items, remove, clear } = useWishlist();
  const { addItem } = useCart();
  const [themeKey, setThemeKey] = useState('default');

  useEffect(() => {
    fetch(`${API_URL}/tenants/public/${slug}`)
      .then((r) => r.json())
      .then((t) => { if (t.theme) setThemeKey(t.theme); })
      .catch(() => {});
  }, [slug]);

  const theme = getTheme(themeKey);
  const tu = getThemeUtils(theme);

  const handleAddToCart = (item: typeof items[0]) => {
    addItem({ productId: item.productId, name: item.name, price: item.price, slug: item.slug, image: item.image });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-gray-400 mb-6">
        <Link href={`/`} className="hover:text-gray-600 transition-colors">Accueil</Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">Mes favoris</span>
      </nav>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes favoris</h1>
          <p className="text-sm text-gray-500 mt-1">{items.length} produit{items.length !== 1 ? 's' : ''}</p>
        </div>
        {items.length > 0 && (
          <button onClick={clear} className="text-sm text-red-500 hover:text-red-700 transition-colors">
            Tout supprimer
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl text-gray-200 mb-4">
            <svg className="w-16 h-16 mx-auto text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <p className="text-gray-400 text-sm mb-4">Votre liste de favoris est vide.</p>
          <Link href={`/products`}
            className={`inline-block px-6 py-2.5 ${theme.btn} text-white text-sm font-medium rounded-lg transition-colors`}>
            Découvrir nos produits
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.productId} className="flex items-center gap-4 bg-white border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow">
              {/* Image */}
              <Link href={`/products/${item.slug}`} className="shrink-0">
                <div className="w-20 h-20 rounded-lg bg-gray-50 overflow-hidden flex items-center justify-center">
                  {item.image ? (
                    <Image src={imageUrl(item.image)} alt={item.name} width={80} height={80} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-gray-200 text-2xl">◈</span>
                  )}
                </div>
              </Link>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <Link href={`/products/${item.slug}`}
                  className={`text-sm font-semibold text-gray-900 ${tu.linkHover} transition-colors line-clamp-1`}>
                  {item.name}
                </Link>
                <p className="text-base font-bold text-gray-900 mt-1">{item.price.toFixed(2)} TND</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => { handleAddToCart(item); remove(item.productId); }}
                  className={`px-4 py-2 ${theme.btn} text-white text-xs font-semibold rounded-lg transition-colors`}
                >
                  Ajouter au panier
                </button>
                <button
                  onClick={() => remove(item.productId)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Retirer des favoris"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
