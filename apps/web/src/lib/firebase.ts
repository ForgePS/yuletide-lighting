'use client';

import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

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

export function getFirebaseApp() {
  return getApps().length ? getApps()[0]! : initializeApp(getFirebaseConfig());
}

function clientAuth() {
  return getAuth(getFirebaseApp());
}

function clientFirestore() {
  return getFirestore(getFirebaseApp());
}

function clientStorage() {
  return getStorage(getFirebaseApp());
}

export const auth =
  typeof window !== 'undefined' ? clientAuth() : (null as unknown as ReturnType<typeof getAuth>);
export const firestore =
  typeof window !== 'undefined'
    ? clientFirestore()
    : (null as unknown as ReturnType<typeof getFirestore>);
export const storage =
  typeof window !== 'undefined'
    ? clientStorage()
    : (null as unknown as ReturnType<typeof getStorage>);
