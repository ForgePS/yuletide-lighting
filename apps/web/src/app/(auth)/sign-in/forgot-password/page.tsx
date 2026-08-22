'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/firebase-auth';
import { AuthLayout } from '@/components/auth-layout';
import { authErrorMessage } from '@/lib/auth-errors';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err) {
      setError(authErrorMessage(err, 'Could not send reset email. Check the address and try again.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout title="Reset your password" subtitle="We will email you a link to choose a new password">
      {sent ? (
        <div className="mt-6 space-y-4">
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            If an account exists for <strong>{email.trim().toLowerCase()}</strong>, a reset link is on its way. Check your inbox and spam folder.
          </p>
          <Link href="/sign-in" className="btn-primary block w-full py-3 text-center">
            Back to sign in
          </Link>
        </div>
      ) : (
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
              autoFocus
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
          </div>
          <button type="submit" className="btn-primary w-full py-3" disabled={busy}>
            {busy ? 'Sending...' : 'Send reset link'}
          </button>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/sign-in" className="font-medium text-primary hover:underline">
              Back to sign in
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
