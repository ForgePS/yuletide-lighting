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

type AuthState = {
  user: User | null;
  loading: boolean;
  idToken: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, companyName?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  waitForSession: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsub = onIdTokenChanged(auth, async (u) => {
      setUser(u);
      try {
        if (u) {
          const token = await u.getIdToken();
          setIdToken(token);
          const secure = window.location.protocol === 'https:' ? '; Secure' : '';
          document.cookie = `firebase-token=${token}; path=/; max-age=3600; SameSite=Lax${secure}`;
        } else {
          setIdToken(null);
          document.cookie = 'firebase-token=; path=/; max-age=0';
        }
      } catch {
        setIdToken(null);
        document.cookie = 'firebase-token=; path=/; max-age=0';
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  async function waitForSession() {
    if (!auth) throw new Error('Auth is not available');
    const user = auth.currentUser;
    if (!user) return;
    const token = await user.getIdToken();
    setIdToken(token);
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `firebase-token=${token}; path=/; max-age=3600; SameSite=Lax${secure}`;
  }

  async function signIn(email: string, password: string) {
    if (!auth) throw new Error('Auth is not available');
    await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    await waitForSession();
  }

  async function signUp(email: string, password: string, companyName?: string) {
    if (!auth) throw new Error('Auth is not available');
    const credential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    if (companyName?.trim()) {
      await updateProfile(credential.user, { displayName: companyName.trim() });
    }
    await waitForSession();
  }

  async function resetPassword(email: string) {
    if (!auth) throw new Error('Auth is not available');
    await sendPasswordResetEmail(auth, email.trim().toLowerCase());
  }

  async function signOut() {
    if (!auth) return;
    await firebaseSignOut(auth);
  }

  return (
    <AuthContext.Provider value={{ user, loading, idToken, signIn, signUp, resetPassword, signOut, waitForSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within FirebaseAuthProvider');
  return ctx;
}
