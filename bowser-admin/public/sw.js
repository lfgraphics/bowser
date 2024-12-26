// Intercept fetch requests and serve from cache if available
// self.addEventListener('fetch', event => {
//   event.respondWith(
//     caches.match(event.request).then(response => {
//       return response || fetch(event.request);
//     })
//   );
// });

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
  console.log('Notification click received:', event);
  // Extract the URL from the notification's data
  const targetUrl = event.notification.data?.url || 'https://itpl-bowser-admin.vercel.app';
  console.log(event)
  // Open the URL dynamically
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if the URL is already open
      for (let client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // Open a new window if not already open
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
  // Close the notification
  event.notification.close();
});
