// Firebase project config. These values are NOT secrets — they are safe to ship
// in a client app. Your data is protected by Firestore security rules, not by
// hiding these. Paste the object from the Firebase console "Web app" setup here.
//
// Until real values are filled in, `firebaseEnabled` stays false and the app
// runs exactly as before (local-only, no sign-in shown).

export const firebaseConfig = {
  apiKey: 'PASTE_API_KEY',
  authDomain: 'PASTE_AUTH_DOMAIN',
  projectId: 'PASTE_PROJECT_ID',
  storageBucket: 'PASTE_STORAGE_BUCKET',
  messagingSenderId: 'PASTE_SENDER_ID',
  appId: 'PASTE_APP_ID',
}

export const firebaseEnabled = !Object.values(firebaseConfig).some(
  (v) => typeof v === 'string' && v.startsWith('PASTE_')
)
