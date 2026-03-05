'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { initTracker, trackPageView } from '@/lib/tracker';

export default function StoreTracker({ slug }: { slug: string }) {
  useEffect(() => {
    initTracker(slug);
  }, [slug]);

  const pathname = usePathname();
  useEffect(() => {
    trackPageView();
  }, [pathname]);

  return null;
}
