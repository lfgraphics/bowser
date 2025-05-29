const Base_Url = "http://localhost:5000"

self.addEventListener('push', function (event) {
  if (!event.data) return;

  const data = event.data.json();
  console.log('[SW] Push received:', data);

  const options = {
    body: data.body,
    icon: data.icon || '/icon-512x512.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || 'https://itpl-bowser-admin.vercel.app',
      dateOfArrival: Date.now(),
      primaryKey: data.id || 'unknown',
    },
  };

  event.waitUntil(
    (async () => {
      try {
        // Send delivery acknowledgment to backend
        if (data?.id) {
          const response = await fetch('http://localhost:5000/notification-update/request-delivered', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: data.id }),
          });

          const result = await response.text();
          console.log('[SW] Delivery response:', result);
        } else {
          console.warn('[SW] No ID provided in push data');
        }

        // Show the notification
        await self.registration.showNotification(data.title, options);
      } catch (err) {
        console.error('[SW] Error handling push:', err);
      }
    })()
  );
});


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
