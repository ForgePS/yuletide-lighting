'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function extractPortalToken(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const match = trimmed.match(/\/portal\/([A-Za-z0-9_-]{8,})/i);
  if (match?.[1]) return match[1];
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(withProtocol);
    const parts = url.pathname.split('/').filter(Boolean);
    const idx = parts.findIndex((p) => p.toLowerCase() === 'portal');
    if (idx >= 0 && parts[idx + 1] && parts[idx + 1]!.length >= 8) {
      return parts[idx + 1]!;
    }
  } catch {
    // not a URL
  }
  return trimmed.replace(/^#+/, '').trim();
}

export default function PortalLoginPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [error, setError] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const extracted = extractPortalToken(token);
    if (extracted.length < 8) {
      setError('Paste your portal link or access code (at least 8 characters).');
      return;
    }
    router.push(`/portal/${extracted}`);
  }

  return (
    <div className="mesh-bg flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-md p-8 shadow-soft">
        <h1 className="text-2xl font-bold">Customer portal</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Paste the full portal link from your invitation email, or enter the access code.
        </p>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <label className="block text-sm">
            <span className="font-medium">Portal link or access code</span>
            <input
              className="input mt-1 w-full font-mono"
              value={token}
              onChange={(e) => { setToken(e.target.value); setError(''); }}
              placeholder="https://…/portal/… or access code"
              autoComplete="off"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn-primary w-full">Continue</button>
        </form>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Access is via a private link. Closing this page does not revoke the link — contact your lighting company to rotate access.
        </p>
        <p className="mt-2 text-center text-xs">
          <Link href="/" className="text-primary hover:underline">Back to home</Link>
        </p>
      </div>
    </div>
  );
}
