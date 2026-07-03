'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PortalLoginPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [error, setError] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = token.trim();
    if (trimmed.length < 8) {
      setError('Enter your portal access code.');
      return;
    }
    router.push(`/portal/${trimmed}`);
  }

  return (
    <div className="mesh-bg flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-md p-8 shadow-soft">
        <h1 className="text-2xl font-bold">Customer portal</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter the access code from your invitation email to view proposals, schedules, and more.
        </p>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <label className="block text-sm">
            <span className="font-medium">Access code</span>
            <input
              className="input mt-1 w-full font-mono"
              value={token}
              onChange={(e) => { setToken(e.target.value); setError(''); }}
              placeholder="Paste your portal link code"
              autoComplete="off"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn-primary w-full">Continue</button>
        </form>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Need help? Contact your lighting company directly.
        </p>
        <p className="mt-2 text-center text-xs">
          <Link href="/" className="text-primary hover:underline">Back to home</Link>
        </p>
      </div>
    </div>
  );
}
