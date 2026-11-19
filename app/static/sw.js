// Service Worker：缓存应用外壳，数据/影像始终走网络（保证与 NAS 一致）
const CACHE = 'usvault-v4';
const SHELL = ['/', '/index.html', '/style.css', '/pathology_dict.js', '/app.js', '/manifest.webmanifest',
  '/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) =>
    Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (/^\/(api|media|thumb)\//.test(url.pathname)) return; // 不缓存数据与影像
  // 网络优先（绕过旧 HTTP 缓存），离线时回退缓存
  e.respondWith(
    fetch(new Request(e.request, { cache: 'no-cache' })).then((r) => {
      const copy = r.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return r;
    }).catch(() => caches.match(e.request).then((r) => r || caches.match('/index.html')))
  );
});
