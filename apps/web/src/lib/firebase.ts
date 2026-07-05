'use client';

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

function getFirebaseConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}

let firebaseApp: FirebaseApp | undefined;
let firebaseAuth: Auth | undefined;

export function getFirebaseApp() {
  if (typeof window === 'undefined') {
    throw new Error('Firebase client is only available in the browser');
  }
  if (!firebaseApp) {
    firebaseApp = getApps().length ? getApps()[0]! : initializeApp(getFirebaseConfig());
  }
  return firebaseApp;
}

export function getClientAuth(): Auth | null {
  if (typeof window === 'undefined') return null;
  if (!firebaseAuth) {
    firebaseAuth = getAuth(getFirebaseApp());
  }
  return firebaseAuth;
}
