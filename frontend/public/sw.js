// Service Worker for Chat App background notifications

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle notification click from outside the app / Windows Action Center / Android
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const conversationId = event.notification.data?.conversation_id;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // If an existing window/tab is open, focus it and tell it to open the conversation
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if ("focus" in client) {
            if (conversationId) {
              client.postMessage({
                type: "SELECT_CONVERSATION",
                conversation_id: conversationId,
              });
            }
            return client.focus();
          }
        }
        // If no window is open, open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow("/app");
        }
      })
  );
});
