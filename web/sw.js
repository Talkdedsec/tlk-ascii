/* Offline support: the app shell is cached on install; everything else
   (demo pictures, FIGlet fonts) is cached the first time it is used.
   Cached files are served at once and refreshed in the background. */
const CACHE = 'tlk-ascii-1.3.0';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/version.js', 'js/i18n.js', 'js/charsets.js', 'js/palettes.js', 'js/presets.js', 'js/looks.js',
  'js/renderer.js', 'js/sources.js', 'js/exporter.js', 'js/vendor/gifenc.js', 'js/vendor/figlet.js',
  'js/banner.js', 'js/gif.js', 'js/state.js', 'js/ui.js', 'js/panel.js', 'js/rail.js', 'js/commands.js', 'js/app.js',
  'fonts/IBMPlexSans.woff2', 'fonts/IBMPlexMono-Regular.woff2', 'fonts/IBMPlexMono-Bold.woff2',
  'fonts/VT323-Regular.woff2', 'fonts/PressStart2P-Regular.woff2', 'fonts/UnifrakturMaguntia-Book.woff2',
  'fonts/PirataOne-Regular.woff2', 'fonts/GrenzeGotisch.woff2', 'fonts/Jacquard24-Regular.woff2',
  'fonts/NotoSansRunic-Regular.woff2', 'fonts/NotoSansSymbols2-Subset.woff2',
  'icons/icon-64.png', 'icons/icon-192.png', 'icons/icon-512.png', 'demos/skull.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('tlk-ascii-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(caches.open(CACHE).then(async (cache) => {
    const hit = await cache.match(req, { ignoreSearch: true });
    const fresh = fetch(req).then((res) => {
      if (res.ok && res.type === 'basic') cache.put(req, res.clone());
      return res;
    }).catch(() => hit);
    return hit || fresh;
  }));
});
