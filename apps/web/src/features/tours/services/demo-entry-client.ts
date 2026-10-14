'use client';

import {
  onAuthStateChanged,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import type { DemoEntryMode } from '@clcrm/types';
import { DEMO_ENTRY_TOUR_ID } from '@clcrm/types';
import { auth } from '@/lib/firebase';
import {
  assertClientSessionCookie,
  clearServerSession,
  establishServerSession,
  writeClientSession,
} from '@/lib/auth-token';
import { TourActiveSessionStore } from '../services/tour-active-session';
import { TourPersistenceService } from '../services/tour-persistence';

type DemoEnterResponse = {
  method?: 'customToken' | 'password';
  customToken?: string;
  email?: string;
  password?: string;
  error?: string;
};

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  ms: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function waitForSignedOut(): Promise<void> {
  const clientAuth = auth;
  if (!clientAuth) return;
  await new Promise<void>((resolve) => {
    const unsub = onAuthStateChanged(clientAuth, (user) => {
      if (!user) {
        unsub();
        resolve();
      }
    });
    window.setTimeout(() => {
      unsub();
      resolve();
    }, 3_000);
  });
}

async function signInDemoUser(body: DemoEnterResponse): Promise<string> {
  if (!auth) {
    throw new Error('Authentication is not available in this browser.');
  }

  await signOut(auth).catch(() => {});
  await clearServerSession();
  await waitForSignedOut();

  if (body.method === 'password' && body.email && body.password) {
    const credential = await signInWithEmailAndPassword(auth, body.email, body.password);
    return credential.user.getIdToken(true);
  }

  if (!body.customToken) {
    throw new Error(body.error || 'Demo sign-in could not be started.');
  }

  const credential = await signInWithCustomToken(auth, body.customToken);
  return credential.user.getIdToken(true);
}

export async function launchDemoEntry(mode: DemoEntryMode): Promise<void> {
  TourActiveSessionStore.clear();
  TourPersistenceService.remove(DEMO_ENTRY_TOUR_ID);

  const res = await fetchWithTimeout(
    '/api/demo/enter',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mode }),
    },
    20_000,
  );

  const body = (await res.json().catch(() => null)) as DemoEnterResponse | null;

  if (!res.ok) {
    throw new Error(body?.error || 'Demo is not available right now.');
  }
  if (!body) {
    throw new Error('Demo sign-in could not be started.');
  }

  const token = await signInDemoUser(body);
  writeClientSession(token);
  await new Promise((resolve) => window.setTimeout(resolve, 50));
  writeClientSession(token);
  assertClientSessionCookie();

  try {
    await establishServerSession(token);
  } catch (err) {
    console.warn('[demo] HttpOnly session cookie unavailable; using client session cookie', err);
  }

  const destination = mode === 'explore' ? '/app' : `/app?demo=${mode}`;
  window.location.assign(destination);
}
