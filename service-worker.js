const CACHE_NAME = 'adaptive-routine-v49';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/splash/apple-splash-640-1136.png',
  './icons/splash/apple-splash-750-1334.png',
  './icons/splash/apple-splash-1242-2208.png',
  './icons/splash/apple-splash-1125-2436.png',
  './icons/splash/apple-splash-828-1792.png',
  './icons/splash/apple-splash-1242-2688.png',
  './icons/splash/apple-splash-1080-2340.png',
  './icons/splash/apple-splash-1170-2532.png',
  './icons/splash/apple-splash-1284-2778.png',
  './icons/splash/apple-splash-1179-2556.png',
  './icons/splash/apple-splash-1290-2796.png',
  './icons/splash/apple-splash-1536-2048.png',
  './icons/splash/apple-splash-1668-2388.png',
  './icons/splash/apple-splash-2048-2732.png',
  './src/app.js',
  './src/storage.js',
  './src/timeUtils.js',
  './src/focusTrap.js',
  './src/backup.js',
  './src/components/modeToggle.js',
  './src/components/scheduleRow.js',
  './src/components/detailSheet.js',
  './src/components/modeLog.js',
  './src/components/navBar.js',
  './src/components/toast.js',
  './src/components/exportModeLog.js',
  './src/components/onboarding.js',
  './src/components/templatesList.js',
  './src/components/templateBuilder.js',
  './src/config/mode-notes.json',
  './src/templates/index.json',
  './src/templates/prayer-anchored.json',
  './src/templates/generic.json',
  './src/anchors/prayer-times.json',
  './src/anchors/none.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// Cache-first for app shell, falling back to network. Anything fetched
// successfully over the network also gets stashed for next time offline.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});
