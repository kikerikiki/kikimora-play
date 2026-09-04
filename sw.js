// Kikimora PWA Service Worker.
// Cached Engine + Shell komplett, damit der zweite Start offline und schnell
// läuft. CACHE_VERSION wird vom Build-Skript (web/build_web.ps1) pro Export
// gestempelt — neuer Build verdrängt damit den alten Cache.
const CACHE_VERSION = 'kikimora-20260904-161309';

const CORE = [
  './',
  'index.js',
  'index.wasm',
  'index.pck',
  'index.audio.worklet.js',
  'index.audio.position.worklet.js',
  'manifest.json',
  'kikolo.png',
  'fonts/fraunces-italic-var.woff2',
  'fonts/inter-var.woff2',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
    return; // API-Calls (Proxy) und Fremd-Origins nie anfassen.
  }
  // Cache-first: alles Statische liegt nach dem Install im Cache; was fehlt,
  // kommt vom Netz und wird nachgelegt.
  event.respondWith(
    caches.match(event.request, { ignoreSearch: event.request.mode === 'navigate' }).then((hit) => {
      if (hit) {
        return hit;
      }
      return fetch(event.request).then((resp) => {
        if (resp.ok && resp.type === 'basic') {
          const copy = resp.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
        }
        return resp;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('./');
        }
        throw new Error('offline und nicht im Cache: ' + url.pathname);
      });
    })
  );
});
