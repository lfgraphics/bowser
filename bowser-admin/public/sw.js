const CACHE_NAME = 'my-app-cache-v1';
const urlsToCache = [
  '/',
  '/favicon.ico',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/styles/global.css',
];

// During installation, cache necessary assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

// During activation, clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Intercept fetch requests and serve from cache if available
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});

self.addEventListener('push', function (event) {
  console.log('Push event received:', event)
  if (event.data) {
    const data = event.data.json()
    const options = {
      body: data.body,
      icon: data.icon || '/icon-512x512.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || "https://itpl-bowser-admin.vercel.app",
        dateOfArrival: Date.now(),
        primaryKey: '2',
      },
    }
    event.waitUntil(self.registration.showNotification(data.title, options))
  }
})

self.addEventListener('notificationclick', function (event) {
  console.log('Notification click received:', event)
  event.notification.close()
  event.waitUntil(clients.openWindow('https://itpl-bowser-admin.vercel.app'))
})

self.addEventListener('fetch', event => {
  // Ensure only requests within scope are handled
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request);
      })
    );
  }
});
