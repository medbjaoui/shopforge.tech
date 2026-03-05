// Meta Pixel + Conversions API helpers
// Pixel fires client-side; deduplication with CAPI via event_id = orderId

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

/** Returns true if the pixel has been initialised on this page */
function pixelReady(): boolean {
  return typeof window !== 'undefined' && typeof window.fbq === 'function';
}

export function fbqTrack(event: string, params?: Record<string, unknown>, eventId?: string) {
  if (!pixelReady()) return;
  if (eventId) {
    window.fbq!('track', event, params ?? {}, { eventID: eventId });
  } else {
    window.fbq!('track', event, params ?? {});
  }
}

// ─── Standard events ────────────────────────────────────────────────────────

export function trackViewContent(product: {
  id: string;
  name: string;
  price: number;
  category?: string;
}) {
  fbqTrack('ViewContent', {
    content_ids: [product.id],
    content_name: product.name,
    content_type: 'product',
    value: product.price,
    currency: 'TND',
  });
}

export function trackAddToCart(item: {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}) {
  fbqTrack('AddToCart', {
    content_ids: [item.productId],
    content_name: item.name,
    content_type: 'product',
    value: item.price * item.quantity,
    currency: 'TND',
    num_items: item.quantity,
  });
}

export function trackInitiateCheckout(params: { numItems: number; value: number }) {
  fbqTrack('InitiateCheckout', {
    num_items: params.numItems,
    value: params.value,
    currency: 'TND',
  });
}

export function trackAddPaymentInfo(paymentType: string) {
  fbqTrack('AddPaymentInfo', { payment_type: paymentType, currency: 'TND' });
}

export function trackPurchase(params: {
  orderId: string;
  total: number;
  numItems: number;
  itemIds: string[];
}) {
  fbqTrack(
    'Purchase',
    {
      value: params.total,
      currency: 'TND',
      num_items: params.numItems,
      content_ids: params.itemIds,
      content_type: 'product',
    },
    params.orderId, // eventID for deduplication with CAPI
  );
}
