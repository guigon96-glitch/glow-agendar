/* Glow Studio: cache do aplicativo para abrir rápido e funcionar sem internet. Os dados ficam no aparelho e na nuvem, nunca aqui. */
const V = 'glow-v29';
self.addEventListener('install', (e) => { self.skipWaiting(); e.waitUntil(caches.open(V).then((c) => c.addAll(['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png']).catch(() => {}))); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return; // API e Google passam direto
  e.respondWith(fetch(r).then((resp) => { if (resp && resp.ok) { const cp = resp.clone(); caches.open(V).then((c) => c.put(r, cp)); } return resp; }).catch(() => caches.match(r).then((m) => m || (r.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
});
