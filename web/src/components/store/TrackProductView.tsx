'use client';

import { useEffect } from 'react';
import { trackProductView } from '@/lib/tracker';
import { trackViewContent } from '@/lib/meta';

export default function TrackProductView({
  productId,
  productSlug,
  price,
  category,
}: {
  productId: string;
  productSlug: string;
  price: number;
  category?: string;
}) {
  useEffect(() => {
    trackProductView(productId, productSlug, price, category);
    trackViewContent({ id: productId, name: productSlug, price, category });
  }, [productId, productSlug, price, category]);

  return null;
}
