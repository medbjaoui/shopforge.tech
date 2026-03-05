'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export interface WishlistItem {
  productId: string;
  name: string;
  price: number;
  slug: string;
  image?: string;
}

interface WishlistState {
  items: WishlistItem[];
  count: number;
  toggle: (item: WishlistItem) => void;
  isInWishlist: (productId: string) => boolean;
  remove: (productId: string) => void;
  clear: () => void;
}

const WishlistContext = createContext<WishlistState | null>(null);

export function WishlistProvider({ storeSlug, children }: { storeSlug: string; children: ReactNode }) {
  const storageKey = `wishlist_${storeSlug}`;
  const [items, setItems] = useState<WishlistItem[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) setItems(JSON.parse(stored));
    } catch { /* ignore */ }
  }, [storageKey]);

  const save = (newItems: WishlistItem[]) => {
    setItems(newItems);
    localStorage.setItem(storageKey, JSON.stringify(newItems));
  };

  const toggle = (item: WishlistItem) => {
    const exists = items.some((i) => i.productId === item.productId);
    if (exists) {
      save(items.filter((i) => i.productId !== item.productId));
    } else {
      save([...items, item]);
    }
  };

  const isInWishlist = (productId: string) => items.some((i) => i.productId === productId);

  const remove = (productId: string) => save(items.filter((i) => i.productId !== productId));

  const clear = () => {
    setItems([]);
    localStorage.removeItem(storageKey);
  };

  return (
    <WishlistContext.Provider value={{ items, count: items.length, toggle, isInWishlist, remove, clear }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}
