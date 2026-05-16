self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let payload = {
    title: 'JARVIS',
    body: '새 알림이 도착했습니다.',
    data: {},
  }

  if (event.data) {
    try {
      payload = {
        ...payload,
        ...event.data.json(),
      }
    } catch {
      payload.body = event.data.text()
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'JARVIS', {
      body: payload.body || '새 알림이 도착했습니다.',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      data: payload.data || {},
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const matchingClient = clients.find((client) => {
        const clientUrl = new URL(client.url)
        const target = new URL(targetUrl, self.location.origin)

        return clientUrl.origin === target.origin
      })

      if (matchingClient) {
        return matchingClient.focus()
      }

      return self.clients.openWindow(targetUrl)
    }),
  )
})
