const admin = require('firebase-admin');

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY;

let isFirebaseAvailable = false;

if (projectId && clientEmail && privateKey) {
  try {
    // Format private key properly if it has escaped newlines
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.slice(1, -1);
    }
    const formattedKey = privateKey.replace(/\\n/g, '\n');

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: formattedKey
      })
    });
    isFirebaseAvailable = true;
    console.log('[Firebase Admin] Firebase Admin SDK successfully initialized.');
  } catch (error) {
    console.error('[Firebase Admin Error] Failed to initialize Firebase Admin SDK:', error.message);
  }
} else {
  console.warn('[Firebase Admin Warning] Missing Firebase environment variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY). Push notifications will run in mock mode.');
}

module.exports = {
  admin,
  isFirebaseAvailable
};
