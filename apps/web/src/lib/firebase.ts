'use client';

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

const FIREBASE_DEFAULTS = {
  apiKey: 'AIzaSyD9jk7wARDfxpaYxigLKTJ13gK7eCBhCEY',
  authDomain: 'yuletide-lighting.firebaseapp.com',
  projectId: 'yuletide-lighting',
  storageBucket: 'yuletide-lighting.firebasestorage.app',
  messagingSenderId: '928287362183',
  appId: '1:928287362183:web:e0cca4d6e2f6d89cc3bc22',
} as const;

function readEnv(key: string, fallback: string) {
  const value = process.env[key];
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function getFirebaseConfig() {
  return {
    apiKey: readEnv('NEXT_PUBLIC_FIREBASE_API_KEY', FIREBASE_DEFAULTS.apiKey),
    authDomain: readEnv('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', FIREBASE_DEFAULTS.authDomain),
    projectId: readEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID', FIREBASE_DEFAULTS.projectId),
    storageBucket: readEnv('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', FIREBASE_DEFAULTS.storageBucket),
    messagingSenderId: readEnv(
      'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
      FIREBASE_DEFAULTS.messagingSenderId,
    ),
    appId: readEnv('NEXT_PUBLIC_FIREBASE_APP_ID', FIREBASE_DEFAULTS.appId),
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
  try {
    if (!firebaseAuth) {
      firebaseAuth = getAuth(getFirebaseApp());
    }
    return firebaseAuth;
  } catch (err) {
    console.error('[firebase] auth unavailable', err);
    return null;
  }
}
