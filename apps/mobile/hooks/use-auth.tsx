import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { getAuthToken } from '@/lib/api';
import { signInWithEmail, signOut as firebaseSignOut } from '@/lib/auth';

type AuthContextValue = {
  ready: boolean;
  signedIn: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    getAuthToken()
      .then((token) => setSignedIn(!!token))
      .finally(() => setReady(true));
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmail(email, password);
    setSignedIn(true);
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut();
    setSignedIn(false);
  }, []);

  return (
    <AuthContext.Provider value={{ ready, signedIn, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
