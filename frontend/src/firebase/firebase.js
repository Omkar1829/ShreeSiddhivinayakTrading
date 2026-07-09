import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import api from '../services/api';

const firebaseConfig = {
  apiKey: "AIzaSyBr8Sjk2xeytT1SbZfQhLt7-CD8YhMxND0",
  authDomain: "shree-siddhivinayak-trading.firebaseapp.com",
  projectId: "shree-siddhivinayak-trading",
  storageBucket: "shree-siddhivinayak-trading.firebasestorage.app",
  messagingSenderId: "317092170539",
  appId: "1:317092170539:web:26b9ace20267884b5d136e",
  measurementId: "G-XZ34NJBX72"
};

let app = null;
let messaging = null;

try {
  app = initializeApp(firebaseConfig);
  messaging = getMessaging(app);
} catch (err) {
  console.error('[Firebase Client Init Error] Failed to initialize Firebase:', err.message);
}

/**
 * Request notification permissions and fetch FCM device token
 */
export const requestNotificationPermission = async () => {
  if (!messaging) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('[Notification Permission] Granted.');
      
      // Get the registration token
      const token = await getToken(messaging);
      
      if (token) {
        console.log('[FCM Token] Retrieved successfully.');
        return token;
      } else {
        console.warn('[FCM Token] No registration token available.');
      }
    } else {
      console.warn('[Notification Permission] Denied.');
    }
  } catch (error) {
    console.error('[FCM Client Error] An error occurred while retrieving token:', error);
  }
  return null;
};

/**
 * Register device FCM token to backend
 * @param {string} token - FCM registration token
 */
export const registerDeviceToken = async (token) => {
  if (!token) return;

  try {
    const userAgent = navigator.userAgent;
    let browser = 'Unknown Browser';
    let os = 'Unknown OS';
    let deviceType = 'Desktop';

    if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Macintosh')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) { os = 'Android'; deviceType = 'Mobile/Tablet'; }
    else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) { os = 'iOS'; deviceType = 'Mobile/Tablet'; }

    await api.post('/api/notifications/devices', {
      fcmToken: token,
      browser,
      os,
      deviceType
    });
    console.log('[FCM Registry] Device token registered to backend.');
  } catch (err) {
    console.error('[FCM Registry Error] Failed to register device token:', err);
  }
};

/**
 * Listen for messages when the app is in the foreground
 */
export const onForegroundMessage = (callback) => {
  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => {
    console.log('[FCM Foreground Message] Received:', payload);
    callback(payload);
  });
};

export { app, messaging };
