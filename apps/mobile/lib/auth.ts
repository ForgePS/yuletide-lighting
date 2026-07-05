import Constants from 'expo-constants';
import { setAuthToken, clearAuthToken } from './api';

const FIREBASE_API_KEY =
  process.env.EXPO_PUBLIC_FIREBASE_API_KEY ??
  (Constants.expoConfig?.extra?.firebaseApiKey as string | undefined);

type FirebaseSignInResponse = {
  idToken: string;
  refreshToken: string;
  localId: string;
  email: string;
};

export async function signInWithEmail(email: string, password: string) {
  if (!FIREBASE_API_KEY) {
    throw new Error('Firebase API key is not configured for the mobile app.');
  }

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
        returnSecureToken: true,
      }),
    },
  );

  const data = await res.json();
  if (!res.ok) {
    const message =
      data?.error?.message === 'INVALID_LOGIN_CREDENTIALS'
        ? 'Invalid email or password'
        : data?.error?.message ?? 'Sign in failed';
    throw new Error(message);
  }

  const payload = data as FirebaseSignInResponse;
  await setAuthToken(payload.idToken);
  return payload;
}

export async function signOut() {
  await clearAuthToken();
}
