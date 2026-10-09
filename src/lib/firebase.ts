import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

// User's provided Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB-KCwg6WtgjYNsY_B7fwVZxsUNRLgzX6E",
  authDomain: "chatnova-21675.firebaseapp.com",
  projectId: "chatnova-21675",
  storageBucket: "chatnova-21675.firebasestorage.app",
  messagingSenderId: "550189017450",
  appId: "1:550189017450:web:ade82587b2618c1769dd13",
  measurementId: "G-K5WWTFH0SF"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore
export const db = getFirestore(app);

export {
  collection,
  addDoc,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp
};
