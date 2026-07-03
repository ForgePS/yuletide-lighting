'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  onIdTokenChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  type User,
  updateProfile,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getCachedAuthToken, setCachedAuthToken, writeAuthCookie } from '@/lib/auth-token';

type AuthState = {
  user: User | null;
  loading: boolean;
  idToken: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, companyName?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

async function syncSession(user: User, forceRefresh = false) {
  const token = await user.getIdToken(forceRefresh);
  setCachedAuthToken(token);
  writeAuthCookie(token);
  return token;
}

export function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsub = onIdTokenChanged(auth, async (nextUser) => {
      setUser(nextUser);
      try {
        if (nextUser) {
          const token = await nextUser.getIdToken(!getCachedAuthToken());
          setIdToken(token);
          setCachedAuthToken(token);
          writeAuthCookie(token);
        } else {
          setIdToken(null);
          setCachedAuthToken(null);
          writeAuthCookie(null);
        }
      } catch {
        setIdToken(null);
        setCachedAuthToken(null);
        writeAuthCookie(null);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  async function signIn(email: string, password: string) {
    if (!auth) throw new Error('Auth is not available');
    const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    const token = await syncSession(credential.user, true);
    setUser(credential.user);
    setIdToken(token);
    setLoading(false);
  }

  async function signUp(email: string, password: string, companyName?: string) {
    if (!auth) throw new Error('Auth is not available');
    const credential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    if (companyName?.trim()) {
      await updateProfile(credential.user, { displayName: companyName.trim() });
    }
    const token = await syncSession(credential.user, true);
    setUser(credential.user);
    setIdToken(token);
    setLoading(false);
  }

  async function resetPassword(email: string) {
    if (!auth) throw new Error('Auth is not available');
    await sendPasswordResetEmail(auth, email.trim().toLowerCase());
  }

  async function signOut() {
    if (!auth) return;
    setCachedAuthToken(null);
    writeAuthCookie(null);
    await firebaseSignOut(auth);
  }

  return (
    <AuthContext.Provider value={{ user, loading, idToken, signIn, signUp, resetPassword, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within FirebaseAuthProvider');
  return ctx;
}
