// Firebase project config. These values are NOT secrets — they are safe to ship
// in a client app. Your data is protected by Firestore security rules, not by
// hiding these.

export const firebaseConfig = {
  apiKey: 'AIzaSyC1b3di5t09degcvLvatLPeGFNhpNc8W9g',
  authDomain: 'tough-mudder-7e66e.firebaseapp.com',
  projectId: 'tough-mudder-7e66e',
  storageBucket: 'tough-mudder-7e66e.firebasestorage.app',
  messagingSenderId: '169215353456',
  appId: '1:169215353456:web:b8aa19e54c3b325fabcab5',
  measurementId: 'G-4Y9F1ESZ1V',
}

export const firebaseEnabled = !Object.values(firebaseConfig).some(
  (v) => typeof v === 'string' && v.startsWith('PASTE_')
)
