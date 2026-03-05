'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const BATCH_INTERVAL = 5000; // flush every 5s
const MAX_BATCH = 20;

interface TrackEvent {
  event: string;
  properties?: Record<string, any>;
  page?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  deviceType?: string;
  sessionId?: string;
  visitorId?: string;
  customerId?: string;
  timestamp?: string;
}

let queue: TrackEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let currentSlug: string | null = null;

// ─── Visitor ID (persistent anonymous cookie) ──────────────────────────────

function getVisitorId(): string {
  if (typeof window === 'undefined') return '';
  let vid = localStorage.getItem('sf_visitor_id');
  if (!vid) {
    vid = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('sf_visitor_id', vid);
  }
  return vid;
}

// ─── Session ID (per browser session) ──────────────────────────────────────

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let sid = sessionStorage.getItem('sf_session_id');
  if (!sid) {
    sid = 's_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem('sf_session_id', sid);
  }
  return sid;
}

// ─── Device type ───────────────────────────────────────────────────────────

function getDeviceType(): string {
  if (typeof window === 'undefined') return 'unknown';
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

// ─── UTM from URL ──────────────────────────────────────────────────────────

function getUtmParams(): { utmSource?: string; utmMedium?: string; utmCampaign?: string } {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  const s = params.get('utm_source');
  const m = params.get('utm_medium');
  const c = params.get('utm_campaign');
  if (s) utm.utmSource = s;
  if (m) utm.utmMedium = m;
  if (c) utm.utmCampaign = c;
  // Persist UTM for the session
  if (s) sessionStorage.setItem('sf_utm_source', s);
  if (m) sessionStorage.setItem('sf_utm_medium', m);
  if (c) sessionStorage.setItem('sf_utm_campaign', c);
  // Fallback to session-stored UTM
  if (!s) { const v = sessionStorage.getItem('sf_utm_source'); if (v) utm.utmSource = v; }
  if (!m) { const v = sessionStorage.getItem('sf_utm_medium'); if (v) utm.utmMedium = v; }
  if (!c) { const v = sessionStorage.getItem('sf_utm_campaign'); if (v) utm.utmCampaign = v; }
  return utm;
}

// ─── Flush queue to API ────────────────────────────────────────────────────

async function flush() {
  if (queue.length === 0 || !currentSlug) return;
  const batch = queue.splice(0, MAX_BATCH);
  try {
    await fetch(`${API_URL}/analytics/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Slug': currentSlug,
      },
      body: JSON.stringify({ events: batch }),
      keepalive: true, // survives page navigation
    });
  } catch {
    // Put back failed events (max 1 retry)
    queue.unshift(...batch.slice(0, 5));
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, BATCH_INTERVAL);
}

// ─── Public API ────────────────────────────────────────────────────────────

export function initTracker(slug: string) {
  currentSlug = slug;
  // Flush on page unload
  if (typeof window !== 'undefined') {
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush();
    });
  }
}

export function track(event: string, properties?: Record<string, any>) {
  if (typeof window === 'undefined') return;

  const utm = getUtmParams();
  const evt: TrackEvent = {
    event,
    properties,
    page: window.location.pathname,
    referrer: document.referrer || undefined,
    ...utm,
    deviceType: getDeviceType(),
    sessionId: getSessionId(),
    visitorId: getVisitorId(),
    timestamp: new Date().toISOString(),
  };

  queue.push(evt);
  if (queue.length >= MAX_BATCH) {
    flush();
  } else {
    scheduleFlush();
  }
}

export function trackPageView(extra?: Record<string, any>) {
  track('page_view', extra);
}

export function trackProductView(productId: string, productSlug: string, price: number, category?: string) {
  track('product_view', { productId, productSlug, price, category });
}

export function trackAddToCart(productId: string, variantId: string | null, price: number, quantity: number) {
  track('add_to_cart', { productId, variantId, price, quantity });
}

export function trackRemoveFromCart(productId: string, quantity: number) {
  track('remove_from_cart', { productId, quantity });
}

export function trackCheckoutStart(cartValue: number, itemCount: number) {
  track('checkout_start', { cartValue, itemCount });
}

export function trackPurchase(orderId: string, total: number, itemCount: number, paymentMethod: string) {
  track('purchase', { orderId, total, itemCount, paymentMethod });
}

export function trackSearch(query: string, resultsCount: number) {
  track('search', { query, resultsCount });
}
