importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyBr8Sjk2xeytT1SbZfQhLt7-CD8YhMxND0",
  authDomain: "shree-siddhivinayak-trading.firebaseapp.com",
  projectId: "shree-siddhivinayak-trading",
  storageBucket: "shree-siddhivinayak-trading.firebasestorage.app",
  messagingSenderId: "317092170539",
  appId: "1:317092170539:web:26b9ace20267884b5d136e",
  measurementId: "G-XZ34NJBX72"
};

// Initialize Firebase App in Service Worker context
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Handle background notification events
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message received:', payload);
  
  const notificationTitle = payload.notification?.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/manifest-icon-192.png',
    badge: '/manifest-icon-192.png',
    data: payload.data
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click to focus or open dashboard window/tab
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event);
  
  event.notification.close();

  // Retrieve the direct action link or default back to admin orders list
  const targetUrl = event.notification.data?.url 
    ? event.notification.data.url 
    : '/admin/orders';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // 1. Search for any active window client matching the origin host
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.startsWith(self.location.origin)) {
          // Focus the existing window tab and redirect it
          return client.focus().then(() => {
            if (client.navigate) {
              return client.navigate(targetUrl);
            }
          });
        }
      }
      
      // 2. If no window client is open, launch a new window targeting the exact URL
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
