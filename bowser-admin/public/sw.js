self.addEventListener('push', function (event) {
    console.log('Push event received:', event)
    if (event.data) {
      const data = event.data.json()
      const options = {
        body: data.body,
        icon: data.icon || '/icon-512x512.png',
        vibrate: [100, 50, 100],
        data: {
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