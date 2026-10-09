import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  push,
  set,
  update,
  get,
  remove,
  onValue,
  query,
  limitToLast,
  serverTimestamp,
  onDisconnect,
  Database
} from 'firebase/database';

// User's provided Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyB-KCwg6WtgjYNsY_B7fwVZxsUNRLgzX6E",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "chatnova-21675.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://chatnova-21675-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "chatnova-21675",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "chatnova-21675.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "550189017450",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:550189017450:web:ade82587b2618c1769dd13",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-K5WWTFH0SF"
};

// Initialize Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Realtime Database
export const rtdb: Database = getDatabase(app);

export {
  ref,
  push,
  set,
  update,
  get,
  remove,
  onValue,
  query,
  limitToLast,
  serverTimestamp,
  onDisconnect
};

