/* Only public application shell/assets. API/auth responses are never cached. */
const CACHE = 'game-shelf-shell-v2';
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.addAll(['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png']),
      ),
  );
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('game-shelf-shell-') && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener('fetch', (event) => {
  const request = event.request,
    url = new URL(request.url);
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/')
  )
    return;
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Root HTML is a public client shell; no collection or session is rendered into it.
          if (response.ok && url.pathname === '/') {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE).then((cache) => cache.put('/', copy)));
          }
          return response;
        })
        .catch(
          async () =>
            (await caches.match('/')) ||
            new Response('Offline. Open Game Shelf online once before using offline reading.', {
              status: 503,
              headers: { 'Content-Type': 'text/plain' },
            }),
        ),
    );
    return;
  }
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    // Network-first also avoids stale development chunks; immutable production assets use HTTP caching.
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy)));
          }
          return response;
        })
        .catch(async () => (await caches.match(request)) || Response.error()),
    );
  }
});
