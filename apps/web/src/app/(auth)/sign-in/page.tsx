'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/firebase-auth';
import { AuthLayout } from '@/components/auth-layout';
import { authErrorMessage } from '@/lib/auth-errors';
import {
  establishServerSession,
  clearServerSession,
  writeAuthCookie,
  setCachedAuthToken,
} from '@/lib/auth-token';

const LOOP_KEY = 'clcrm-auth-redirect-count';
const LOOP_TS_KEY = 'clcrm-auth-redirect-ts';

function readLoopCount() {
  try {
    const ts = Number(sessionStorage.getItem(LOOP_TS_KEY) || '0');
    if (Date.now() - ts > 15_000) {
      sessionStorage.removeItem(LOOP_KEY);
      sessionStorage.removeItem(LOOP_TS_KEY);
      return 0;
    }
    return Number(sessionStorage.getItem(LOOP_KEY) || '0');
  } catch {
    return 0;
  }
}

function bumpLoopCount() {
  try {
    const next = readLoopCount() + 1;
    sessionStorage.setItem(LOOP_KEY, String(next));
    sessionStorage.setItem(LOOP_TS_KEY, String(Date.now()));
    return next;
  } catch {
    return 99;
  }
}

function clearLoopCount() {
  try {
    sessionStorage.removeItem(LOOP_KEY);
    sessionStorage.removeItem(LOOP_TS_KEY);
  } catch {
    /* ignore */
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        window.clearTimeout(timer);
        reject(err);
      },
    );
  });
}

function SignInForm() {
  const { signIn, signOut, user, loading } = useAuth();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<'idle' | 'redirecting' | 'stopped'>('idle');
  const started = useRef(false);

  const nextPath = searchParams.get('next') || '/app';
  const safeNext =
    nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/app';
  const bounced = searchParams.get('bounced') === '1';
  const reset = searchParams.get('reset') === '1';

  useEffect(() => {
    if (reset) clearLoopCount();
  }, [reset]);

  useEffect(() => {
    if (loading || !user || started.current || status === 'stopped') return;

    // Only stop after repeated failures — first bounce is often a stale cookie race.
    if (readLoopCount() >= 3) {
      started.current = true;
      setStatus('stopped');
      setError(
        'Sign-in kept bouncing between pages. Your session was cleared — enter your email and password again.',
      );
      clearLoopCount();
      void clearServerSession();
      void signOut();
      return;
    }

    // Clear bounce query so retries don't look like a fresh failure loop in the URL.
    if (bounced && typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('bounced');
      window.history.replaceState({}, '', url.pathname + url.search);
    }

    started.current = true;
    setStatus('redirecting');

    const watchdog = window.setTimeout(() => {
      clearLoopCount();
      setStatus('stopped');
      setError('Opening the dashboard took too long. Please sign in again.');
      setBusy(false);
      started.current = false;
      void clearServerSession();
      void signOut();
    }, 8_000);

    void (async () => {
      try {
        const token = await withTimeout(user.getIdToken(false), 5_000, 'Auth token');
        setCachedAuthToken(token);
        writeAuthCookie(token);
        // Fire-and-forget — never block navigation on the session API.
        void establishServerSession(token);
        bumpLoopCount();
        window.clearTimeout(watchdog);
        window.location.replace(safeNext);
      } catch (err) {
        window.clearTimeout(watchdog);
        clearLoopCount();
        setStatus('stopped');
        setError(authErrorMessage(err, 'Could not open the dashboard. Try signing in again.'));
        setBusy(false);
        started.current = false;
        await clearServerSession();
        await signOut();
      }
    })();

    // Intentionally no cleanup cancel — idToken/status updates must not abort navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per signed-in user
  }, [loading, user]);

  async function cancelAndReset() {
    clearLoopCount();
    setStatus('stopped');
    started.current = false;
    writeAuthCookie(null);
    setCachedAuthToken(null);
    try {
      await clearServerSession();
      await signOut();
    } catch {
      /* ignore */
    }
    window.location.replace('/sign-in?reset=1');
  }

  if (loading || (user && status === 'redirecting')) {
    return (
      <AuthLayout title="Welcome back" subtitle="Sign in to your installer account">
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {user ? 'Opening your dashboard...' : 'Loading...'}
        </p>
        <button type="button" className="btn-secondary mt-4 w-full" onClick={() => void cancelAndReset()}>
          Cancel and sign in again
        </button>
      </AuthLayout>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    clearLoopCount();
    started.current = false;
    setStatus('idle');
    try {
      await signIn(email, password);
    } catch (err) {
      setError(authErrorMessage(err, 'Invalid email or password'));
      setBusy(false);
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your installer account">
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium">
              Password
            </label>
            <Link href="/sign-in/forgot-password" className="text-xs font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
          />
        </div>
        <button type="submit" className="btn-primary w-full py-3" disabled={busy}>
          {busy ? 'Signing in...' : 'Sign in'}
        </button>
        <p className="text-center text-sm text-muted-foreground">
          No account?{' '}
          <Link href="/sign-up" className="font-medium text-primary hover:underline">
            Start free trial
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <AuthLayout title="Welcome back" subtitle="Sign in to your installer account">
          <p className="mt-6 text-center text-sm text-muted-foreground">Loading...</p>
        </AuthLayout>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
