/* nesprite-draw service worker — makes the editor fully available offline.
   The app is 100% self-contained (all HTML/CSS/JS inline, no external
   requests), so precaching this short list of files is enough to run the
   whole editor with no network. Bump CACHE when any cached file changes. */
const CACHE = 'nesprite-draw-v3';

/* Relative paths so the same SW works at the GitHub Pages subpath
   (/nesprite/) and from a plain file/server root alike. */
const ASSETS = [
  './',
  'index.html',
  'how-to.html',
  'manifest.json',
  'favicon.png',
  'apple-touch-icon.png',
  'icon-192.png',
  'icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // Navigations: serve cached index when offline so the app always boots.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(() => caches.match(req).then(r => r || caches.match('index.html')))
    );
    return;
  }

  // Everything else: cache-first, fall back to network and cache the result.
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      if (res && res.ok && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => cached))
  );
});
