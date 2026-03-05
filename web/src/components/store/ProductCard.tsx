'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { imageUrl } from '@/lib/imageUrl';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: string;
  comparePrice: string | null;
  stock: number;
  images: string[];
  description: string | null;
}

export default function ProductCard({
  product,
  storeSlug,
  themeBtn = 'bg-gray-900 hover:bg-gray-700',
  cardHover = 'group-hover:text-orange-500',
}: {
  product: Product;
  storeSlug: string;
  themeBtn?: string;
  cardHover?: string;
}) {
  const { addItem } = useCart();
  const { toggle, isInWishlist } = useWishlist();
  const liked = isInWishlist(product.id);
  const price = Number(product.price);
  const comparePrice = product.comparePrice ? Number(product.comparePrice) : null;
  const outOfStock = product.stock === 0;
  const img = product.images?.[0] ? imageUrl(product.images[0]) : null;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (outOfStock) return;
    addItem({ productId: product.id, name: product.name, price, slug: product.slug, image: product.images?.[0] });
  };

  return (
    <Link href={`/store/${storeSlug}/products/${product.slug}`}>
      <div className="group bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
        {/* Image */}
        <div className="aspect-square bg-gray-50 flex items-center justify-center relative overflow-hidden">
          {img ? (
            <Image
              src={img}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="text-gray-200 text-5xl select-none">◈</div>
          )}
          {outOfStock && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
              <span className="text-xs font-semibold text-gray-500 bg-white px-2 py-1 rounded-full border">
                Épuisé
              </span>
            </div>
          )}
          {comparePrice && comparePrice > price && (
            <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              -{Math.round(((comparePrice - price) / comparePrice) * 100)}%
            </div>
          )}
          {/* Wishlist heart */}
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle({ productId: product.id, name: product.name, price, slug: product.slug, image: product.images?.[0] }); }}
            className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              liked ? 'bg-red-500 text-white' : 'bg-white/80 text-gray-400 hover:bg-white hover:text-red-500'
            }`}
          >
            <svg className="w-4 h-4" fill={liked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className={`text-sm font-semibold text-gray-900 mb-1 line-clamp-2 ${cardHover} transition-colors`}>
            {product.name}
          </h3>

          <div className="flex items-center gap-2 mb-3">
            <span className="text-base font-bold text-gray-900">{price.toFixed(2)} TND</span>
            {comparePrice && comparePrice > price && (
              <span className="text-sm text-gray-400 line-through">{comparePrice.toFixed(2)}</span>
            )}
          </div>

          <button
            onClick={handleAddToCart}
            disabled={outOfStock}
            className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors text-white ${
              outOfStock ? 'bg-gray-200 !text-gray-400 cursor-not-allowed' : themeBtn
            }`}
          >
            {outOfStock ? 'Épuisé' : 'Ajouter au panier'}
          </button>
        </div>
      </div>
    </Link>
  );
}
