'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { trackAddToCart } from '@/lib/meta';

export interface CartItem {
  productId: string;
  variantId?: string;
  name: string;
  variantName?: string;
  price: number;
  quantity: number;
  slug: string;
  image?: string;
}

interface CartState {
  items: CartItem[];
  total: number;
  count: number;
  addItem: (item: Omit<CartItem, 'quantity'>, qty?: number) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQty: (productId: string, qty: number, variantId?: string) => void;
  clear: () => void;
}

function itemKey(productId: string, variantId?: string) {
  return `${productId}::${variantId ?? ''}`;
}

const CartContext = createContext<CartState | null>(null);

export function CartProvider({ storeSlug, children }: { storeSlug: string; children: ReactNode }) {
  const storageKey = `cart_${storeSlug}`;
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) setItems(JSON.parse(stored));
    } catch { /* ignore */ }
  }, [storageKey]);

  const save = (newItems: CartItem[]) => {
    setItems(newItems);
    localStorage.setItem(storageKey, JSON.stringify(newItems));
  };

  const addItem = (item: Omit<CartItem, 'quantity'>, qty = 1) => {
    trackAddToCart({ productId: item.productId, name: item.name, price: item.price, quantity: qty });
    setItems((prev) => {
      const key = itemKey(item.productId, item.variantId);
      const existing = prev.find((i) => itemKey(i.productId, i.variantId) === key);
      const updated = existing
        ? prev.map((i) =>
            itemKey(i.productId, i.variantId) === key
              ? { ...i, quantity: i.quantity + qty }
              : i,
          )
        : [...prev, { ...item, quantity: qty }];
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });
  };

  const removeItem = (productId: string, variantId?: string) => {
    save(items.filter((i) => itemKey(i.productId, i.variantId) !== itemKey(productId, variantId)));
  };

  const updateQty = (productId: string, qty: number, variantId?: string) => {
    const key = itemKey(productId, variantId);
    if (qty <= 0) return removeItem(productId, variantId);
    save(items.map((i) => itemKey(i.productId, i.variantId) === key ? { ...i, quantity: qty } : i));
  };

  const clear = () => {
    setItems([]);
    localStorage.removeItem(storageKey);
  };

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, total, count, addItem, removeItem, updateQty, clear }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
