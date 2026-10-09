import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  push,
  set,
  get,
  remove,
  onValue,
  query,
  limitToLast,
  serverTimestamp,
  Database
} from 'firebase/database';

// User's provided Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB-KCwg6WtgjYNsY_B7fwVZxsUNRLgzX6E",
  authDomain: "chatnova-21675.firebaseapp.com",
  databaseURL: "https://chatnova-21675-default-rtdb.firebaseio.com",
  projectId: "chatnova-21675",
  storageBucket: "chatnova-21675.firebasestorage.app",
  messagingSenderId: "550189017450",
  appId: "1:550189017450:web:ade82587b2618c1769dd13",
  measurementId: "G-K5WWTFH0SF"
};

// Initialize Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Realtime Database
export const rtdb: Database = getDatabase(app);

export {
  ref,
  push,
  set,
  get,
  remove,
  onValue,
  query,
  limitToLast,
  serverTimestamp
};

