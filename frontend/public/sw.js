const CACHE_NAME = 'humbee-cache-v2';
const STATIC_ASSETS = ['/manifest.json', '/logo.svg'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function isApiRequest(url) {
  return url.pathname.startsWith('/api');
}

function isDocumentRequest(request) {
  return request.mode === 'navigate' || request.destination === 'document';
}

function isScriptOrStyle(request) {
  return request.destination === 'script' || request.destination === 'style';
}

function networkFirst(request) {
  return fetch(request)
    .then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    })
    .catch(() => caches.match(request));
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isApiRequest(url)) return;

  if (isDocumentRequest(request) || isScriptOrStyle(request)) {
    event.respondWith(
      networkFirst(request).then(
        (response) => response || caches.match('/index.html')
      )
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
