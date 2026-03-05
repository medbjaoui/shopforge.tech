// ShopForge Service Worker — Network-first with background cache update
const CACHE_NAME = 'shopforge-v2';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin GET requests, skip API and Next.js internals
  if (
    event.request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/api/')
  ) {
    return;
  }

  // Cache-first for static files (images, fonts, manifests)
  const isStatic =
    url.pathname.match(/\.(png|jpg|jpeg|svg|ico|webp|woff2?|css|js)$/) ||
    url.pathname === '/manifest.json';

  if (isStatic) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Network-first for pages (no pre-caching, avoids install errors)
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
