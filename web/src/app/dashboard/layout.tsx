'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import Sidebar from '@/components/dashboard/Sidebar';
import TopBar from '@/components/dashboard/TopBar';
import { LogoIcon } from '@/components/Logo';

function OrderNotificationBanner({ pendingCount, newOrders, onDismiss }: {
  pendingCount: number;
  newOrders: number;
  onDismiss: () => void;
}) {
  if (newOrders === 0) return null;

  return (
    <div className="bg-blue-600 text-white px-4 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-3 text-sm">
        <span className="bg-white/20 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
          {newOrders}
        </span>
        <span>
          <strong>{newOrders} nouvelle{newOrders > 1 ? 's' : ''} commande{newOrders > 1 ? 's' : ''}</strong>
          {' '}en attente ({pendingCount} total)
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/orders?status=PENDING"
          className="bg-white text-blue-600 px-3 py-1 rounded-lg text-xs font-semibold hover:bg-blue-50 transition-colors"
        >
          Voir
        </Link>
        <button
          onClick={onDismiss}
          className="text-white/70 hover:text-white text-lg leading-none"
        >
          x
        </button>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, store } = useAuth();
  const router = useRouter();

  // Order stats polling (shared between banner and sidebar badge)
  const [pendingCount, setPendingCount] = useState(0);
  const [newOrders, setNewOrders] = useState(0);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const lastCount = useRef<number | null>(null);

  // Mobile sidebar state
  const [mobileOpen, setMobileOpen] = useState(false);

  const checkOrders = useCallback(async () => {
    try {
      const { data } = await api.get('/orders/stats');
      const current = data.pendingOrders ?? 0;
      setPendingCount(current);
      if (lastCount.current !== null && current > lastCount.current) {
        const diff = current - lastCount.current;
        setNewOrders(diff);
        setBannerDismissed(false);
        try {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 800;
          gain.gain.value = 0.1;
          osc.start();
          osc.stop(ctx.currentTime + 0.15);
        } catch {}
      }
      lastCount.current = current;
    } catch {}
  }, []);

  useEffect(() => {
    checkOrders();
    const interval = setInterval(checkOrders, 30000);
    return () => clearInterval(interval);
  }, [checkOrders]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/login');
    } else if (store && store.onboardingCompleted === false) {
      router.replace('/onboarding');
    }
  }, [isAuthenticated, isLoading, store, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500 text-sm">Chargement...</div>
      </div>
    );
  }

  if (!isAuthenticated || store?.onboardingCompleted === false) return null;

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar
        pendingCount={pendingCount}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-auto">
        {/* Mobile top bar */}
        <div className="md:hidden sticky top-0 z-30 bg-gray-900 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LogoIcon size={24} />
            <span className="text-sm font-semibold truncate">{store?.name ?? 'ShopForge'}</span>
          </div>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-800 transition-colors"
          >
            {mobileOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        <TopBar pendingCount={pendingCount} />

        {!bannerDismissed && (
          <OrderNotificationBanner
            pendingCount={pendingCount}
            newOrders={newOrders}
            onDismiss={() => setBannerDismissed(true)}
          />
        )}
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 sm:py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
