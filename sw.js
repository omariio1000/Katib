// Offline support: always try the network first (so updates arrive immediately),
// keep a copy of everything, and fall back to the copy when offline.
const CACHE = 'katib-v1';
const SHELL = [
  './', 'index.html', 'css/style.css', 'manifest.webmanifest', 'icons/icon.svg',
  'js/data/layouts.js', 'js/arabic.js', 'js/data/words.js', 'js/data/texts.js',
  'js/lessons.js', 'js/engine.js', 'js/keyboard.js', 'js/app.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.open(CACHE).then(cache =>
    fetch(e.request)
      .then(res => {
        if (res.ok || res.type === 'opaque') cache.put(e.request, res.clone());
        return res;
      })
      .catch(() => cache.match(e.request, { ignoreSearch: true }))
  ));
});
