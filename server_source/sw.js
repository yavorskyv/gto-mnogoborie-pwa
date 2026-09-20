const CACHE = 'lb-mobile-v32';
const SHELL = ['/gto2026/live.html', '/uploads/pwa_icon_192.png', '/uploads/pwa_icon_512.png'];
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {})));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data && e.data.text() }; }
  const title = d.title || 'Лидерборды';
  e.waitUntil(self.registration.showNotification(title, {
    body: d.body || d.message || '',
    icon: '/uploads/pwa_icon_192.png',
    badge: '/uploads/pwa_icon_192.png',
    data: { url: d.url || '/gto2026/live.html' }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/gto2026/live.html';
  e.waitUntil(clients.matchAll({ type: 'window' }).then(ws => {
    for (const w of ws) { if (w.url.includes('/gto2026/') && 'focus' in w) return w.focus(); }
    return clients.openWindow(url);
  }));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.startsWith('/api/')) return;            // live data: always network
  if (req.mode === 'navigate') {                            // app shell offline fallback
    e.respondWith(fetch(req).catch(() => caches.match('/gto2026/live.html')));
    return;
  }
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(resp => {
      if (resp.ok && url.origin === location.origin) {
        const cp = resp.clone();
        caches.open(CACHE).then(c => c.put(req, cp));
      }
      return resp;
    }).catch(() => hit))
  );
});
