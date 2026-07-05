'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/firebase-auth';
import { AuthLayout } from '@/components/auth-layout';
import { authErrorMessage } from '@/lib/auth-errors';

export default function SignUpPage() {
  const { signUp, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [company, setCompany] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && user) {
      router.replace('/app');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <AuthLayout title="Start your free trial" subtitle="Create your installer account in minutes">
        <p className="mt-6 text-center text-sm text-muted-foreground">Loading...</p>
      </AuthLayout>
    );
  }

  if (user) {
    return (
      <AuthLayout title="Start your free trial" subtitle="Create your installer account in minutes">
        <p className="mt-6 text-center text-sm text-muted-foreground">Redirecting to your dashboard...</p>
      </AuthLayout>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await signUp(email, password, company);
      router.replace('/app');
    } catch (err) {
      setError(authErrorMessage(err, 'Could not create account. Try a different email or stronger password.'));
    }
  }

  return (
    <AuthLayout title="Start your free trial" subtitle="Create your installer account in minutes">
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <div>
          <label htmlFor="company" className="mb-1.5 block text-sm font-medium">
            Company name
          </label>
          <input
            id="company"
            required
            placeholder="Bright Nights LLC"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="input"
          />
        </div>
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
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
          />
        </div>
        <button type="submit" className="btn-primary w-full py-3">
          Start 14-day free trial
        </button>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/sign-in" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
