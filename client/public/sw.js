// Service Worker for Biz-Insights Multilingual Translator PWA Push Notifications

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  try {
    const data = event.data.json();
    const title = data.title || "New Message";

    const options = {
      body: data.body || "You have a new message.",
      icon: data.icon || "/ai-chat-platform/logo192.png",
      badge: data.badge || "/ai-chat-platform/logo192.png",
      vibrate: [100, 50, 100],
      data: data.data || {},
      tag: data.data?.sessionId || "new-msg",
      renotify: true,
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error("Failed to display push notification:", err);
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If a window is already open, focus it and redirect
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.focus();
            // Navigate to target path
            if ("navigate" in client) {
              return client.navigate(targetUrl);
            }
          }
        }
        // If no window is open, open a new one
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      }),
  );
});
