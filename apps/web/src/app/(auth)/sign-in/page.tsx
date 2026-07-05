'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/firebase-auth';
import { AuthLayout } from '@/components/auth-layout';
import { authErrorMessage } from '@/lib/auth-errors';

export default function SignInPage() {
  const { signIn, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/app');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <AuthLayout title="Welcome back" subtitle="Sign in to your installer account">
        <p className="mt-6 text-center text-sm text-muted-foreground">Loading...</p>
      </AuthLayout>
    );
  }

  if (user) {
    return (
      <AuthLayout title="Welcome back" subtitle="Sign in to your installer account">
        <p className="mt-6 text-center text-sm text-muted-foreground">Redirecting to your dashboard...</p>
      </AuthLayout>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await signIn(email, password);
      router.replace('/app');
    } catch (err) {
      setError(authErrorMessage(err, 'Invalid email or password'));
    } finally {
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
