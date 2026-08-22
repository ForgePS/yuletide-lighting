'use client';

/**
 * YL-S26 — Staff invite claim (Auth user + org membership).
 */
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirebaseApp } from '@/lib/firebase';
import { LoadingState } from '@/components/ui/states';

type UiState = 'loading' | 'ready' | 'working' | 'success' | 'unavailable';

const INVITE_UNAVAILABLE =
  'This invitation is invalid or has expired. Ask your admin to send a new invite.';

export default function StaffInviteClaimPage() {
  const token = useParams().token as string;
  const router = useRouter();
  const [state, setState] = useState<UiState>('loading');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token || token.length < 16) {
      setState('unavailable');
      setMessage(INVITE_UNAVAILABLE);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/trpc/settings360.previewInvite?input=${encodeURIComponent(
            JSON.stringify({ json: { token } }),
          )}`,
        );
        const data = await res.json();
        const payload = data?.result?.data?.json as
          | { ok: false }
          | { ok: true; email: string; firstName: string | null; lastName: string | null }
          | undefined;
        if (cancelled) return;
        if (!payload?.ok) {
          setState('unavailable');
          setMessage(INVITE_UNAVAILABLE);
          return;
        }
        setEmail(payload.email);
        setFirstName(payload.firstName ?? '');
        setLastName(payload.lastName ?? '');
        setState('ready');
      } catch {
        if (!cancelled) {
          setState('unavailable');
          setMessage(INVITE_UNAVAILABLE);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onClaim(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setMessage('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setMessage('Passwords do not match.');
      return;
    }
    setState('working');
    setMessage('');
    try {
      const res = await fetch('/api/trpc/settings360.claimInvite', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          json: {
            token,
            password,
            firstName: firstName || null,
            lastName: lastName || null,
          },
        }),
      });
      const data = await res.json();
      if (data.error) {
        setState('ready');
        setMessage(data.error?.json?.message ?? data.error?.message ?? INVITE_UNAVAILABLE);
        return;
      }
      const auth = getAuth(getFirebaseApp());
      await signInWithEmailAndPassword(auth, email, password);
      setState('success');
      setMessage('Account created. Opening the app…');
      router.replace('/app');
    } catch {
      setState('ready');
      setMessage(INVITE_UNAVAILABLE);
    }
  }

  if (state === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100 p-4">
        <LoadingState message="Loading invitation…" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-100 p-4">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-[11px] font-medium uppercase tracking-wide text-stone-500">Team invite</p>
        <h1 className="mt-1 text-xl font-bold text-stone-900">Join your organization</h1>
        <p className="mt-2 text-sm text-stone-600">
          Set a password to activate your staff account
          {email ? (
            <>
              {' '}
              for <span className="font-medium text-stone-800">{email}</span>
            </>
          ) : null}
          .
        </p>

        {(state === 'unavailable' || message) && (
          <p
            className={`mt-4 rounded-xl p-3 text-sm ${
              state === 'success' ? 'bg-green-50 text-green-900' : 'bg-stone-50 text-stone-700'
            }`}
            role={state === 'success' ? 'status' : 'alert'}
          >
            {message || INVITE_UNAVAILABLE}
          </p>
        )}

        {(state === 'ready' || state === 'working') && (
          <form className="mt-6 space-y-4" onSubmit={onClaim}>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-stone-700">First name</span>
              <input
                className="input w-full"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-stone-700">Last name</span>
              <input
                className="input w-full"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-stone-700">Password *</span>
              <input
                className="input w-full"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-stone-700">Confirm password *</span>
              <input
                className="input w-full"
                type="password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </label>
            <button
              type="submit"
              className="btn-primary w-full"
              disabled={state === 'working'}
            >
              {state === 'working' ? 'Creating account…' : 'Accept invitation'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-stone-500">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-stone-800 underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
