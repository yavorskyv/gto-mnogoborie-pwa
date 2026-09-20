const VERSION = 'v177';
const CACHE_NAME = `gto-app-${VERSION}`;

// App Shell v175: full-site display recovery and Hero module syntax fix.
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/tokens.css?v=173',
  './css/mobile.css?v=173',
  './css/detail.css?v=173',
  './css/mobile-polish.css?v=173',
  './css/desktop.css?v=173',
  './data/home_summary.json?v=173',
  './js/mobile.js?v=173',
  './assets/favicon.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/logo-tight.png',
  './assets/logo-clean.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.allSettled(CORE_ASSETS.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((clients) => {
        clients.forEach((client) => client.postMessage({ type: 'NEW_VERSION', version: VERSION }));
      })
  );
});

const putInCache = async (request, response) => {
  if (request.method !== 'GET' || !response || response.status !== 200) return;
  const cache = await caches.open(CACHE_NAME);
  cache.put(request, response.clone());
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  // Внешние ресурсы (gto.com.ru, VK, Rutube, шрифты) — только сеть, без кэширования тяжёлого чужого медиа.
  if (!sameOrigin) return;

  // Версионированные статические ассеты (?v=…) неизменяемы в пределах версии → сначала кэш.
  if (url.search.includes('v=')) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((resp) => {
        putInCache(request, resp);
        return resp;
      }))
    );
    return;
  }

  // Навигация (HTML) — сначала сеть ради свежести, офлайн-фолбэк на кэш/оболочку.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then((resp) => {
        putInCache(request, resp);
        return resp;
      }).catch(() => caches.match(request).then((c) => c || caches.match('./index.html')))
    );
    return;
  }

  // Прочее того же origin (JSON событий, картинки, медиа) — stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((resp) => {
        putInCache(request, resp);
        return resp;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
