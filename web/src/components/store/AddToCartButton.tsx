'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { trackAddToCart } from '@/lib/tracker';

interface Variant {
  id: string;
  name: string;
  price: number | null;
  stock: number;
}

interface Props {
  product: { id: string; name: string; price: number; slug: string; image?: string };
  variants: Variant[];
  outOfStock: boolean;
  storeSlug: string;
  themeBtn?: string;
}

export default function AddToCartButton({ product, variants, outOfStock, storeSlug, themeBtn = 'bg-gray-900 hover:bg-gray-700' }: Props) {
  const { addItem } = useCart();
  const router = useRouter();
  const [added, setAdded] = useState(false);
  const [qty, setQty] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    variants.length === 1 ? variants[0].id : '',
  );

  const hasVariants = variants.length > 0;
  const selectedVariant = variants.find((v) => v.id === selectedVariantId);
  const effectivePrice =
    selectedVariant?.price !== undefined && selectedVariant.price !== null
      ? selectedVariant.price
      : product.price;

  const variantOutOfStock = hasVariants
    ? selectedVariant ? selectedVariant.stock === 0 : false
    : outOfStock;

  const needsSelection = hasVariants && !selectedVariantId;
  const canAct = !variantOutOfStock && !needsSelection;

  const doAddToCart = () => {
    if (!canAct) return false;
    addItem(
      {
        productId: product.id,
        variantId: selectedVariantId || undefined,
        name: product.name,
        variantName: selectedVariant?.name,
        price: effectivePrice,
        slug: product.slug,
        image: product.image,
      },
      qty,
    );
    trackAddToCart(product.id, selectedVariantId || null, effectivePrice, qty);
    return true;
  };

  const handleAdd = () => {
    if (!doAddToCart()) return;
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    if (!doAddToCart()) return;
    router.push(`/store/${storeSlug}/checkout`);
  };

  return (
    <div className="space-y-4">
      {/* Variant selector */}
      {hasVariants && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Choisir une option</p>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedVariantId(v.id)}
                disabled={v.stock === 0}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                  v.stock === 0
                    ? 'border-gray-200 text-gray-300 cursor-not-allowed line-through'
                    : selectedVariantId === v.id
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-300 text-gray-700 hover:border-gray-600'
                }`}
              >
                {v.name}
                {v.price !== null && v.price !== product.price && (
                  <span className="ml-1 text-xs opacity-70">+{(Number(v.price) - product.price).toFixed(2)}</span>
                )}
              </button>
            ))}
          </div>
          {selectedVariant && selectedVariant.price !== null && (
            <p className="mt-2 text-2xl font-bold text-gray-900">{effectivePrice.toFixed(2)} TND</p>
          )}
        </div>
      )}

      {/* Quantity selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-700">Quantité</span>
        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-50 text-lg font-medium transition-colors"
          >
            −
          </button>
          <span className="w-10 text-center text-sm font-semibold text-gray-900">{qty}</span>
          <button
            onClick={() => setQty((q) => q + 1)}
            className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-50 text-lg font-medium transition-colors"
          >
            +
          </button>
        </div>
      </div>

      {/* CTAs */}
      <div className="flex flex-col gap-3">
        {/* Primary: Buy now */}
        <button
          onClick={handleBuyNow}
          disabled={!canAct}
          className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all ${
            canAct
              ? `${themeBtn} text-white shadow-sm`
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {variantOutOfStock ? 'Épuisé' : needsSelection ? 'Choisir une option' : 'Acheter maintenant →'}
        </button>

        {/* Secondary: Add to cart */}
        <button
          onClick={handleAdd}
          disabled={!canAct}
          className={`w-full py-3 rounded-xl font-semibold text-sm border-2 transition-all ${
            !canAct
              ? 'border-gray-200 text-gray-400 cursor-not-allowed'
              : added
              ? 'border-green-500 text-green-700 bg-green-50'
              : 'border-gray-300 text-gray-700 hover:border-gray-500 hover:bg-gray-50'
          }`}
        >
          {added ? '✓ Ajouté au panier !' : 'Ajouter au panier'}
        </button>
      </div>
    </div>
  );
}
