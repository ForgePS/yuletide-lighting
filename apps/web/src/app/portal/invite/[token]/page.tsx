'use client';

/**
 * Customer invitation claim UI (P2-S3).
 * Minimal flow — no portal redesign. Session via P2-S2 __portal_session.
 */
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirebaseApp } from '@/lib/firebase';
import { LoadingState } from '@/components/ui/states';

type UiState = 'loading' | 'ready' | 'working' | 'success' | 'unavailable';

const ACCESS_UNAVAILABLE =
  'Portal access is unavailable. Please request a new access link or contact the business.';

export default function PortalInviteClaimPage() {
  const invitationToken = useParams().token as string;
  const router = useRouter();
  const [state, setState] = useState<UiState>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!invitationToken || invitationToken.length < 16) {
      setState('unavailable');
      setMessage(ACCESS_UNAVAILABLE);
      return;
    }
    setState('ready');
  }, [invitationToken]);

  async function onClaim() {
    setState('working');
    setMessage('');
    try {
      const auth = getAuth(getFirebaseApp());
      const cred = await signInAnonymously(auth);
      const idToken = await cred.user.getIdToken();
      const claimRes = await fetch('/api/portal/claim-invitation', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ invitationToken, idToken }),
      });
      const result = (await claimRes.json().catch(() => null)) as {
        ok?: boolean;
      } | null;
      if (!claimRes.ok || !result?.ok) {
        setState('unavailable');
        setMessage(ACCESS_UNAVAILABLE);
        return;
      }

      setState('success');
      setMessage('Access confirmed. Opening your portal…');
      router.replace('/portal/login');
    } catch {
      setState('unavailable');
      setMessage(ACCESS_UNAVAILABLE);
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-stone-100 to-red-50/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-[11px] font-medium uppercase tracking-wide text-stone-500">
          Customer portal
        </p>
        <h1 className="mt-1 text-xl font-bold text-stone-900">Accept invitation</h1>
        <p className="mt-2 text-base text-stone-600">
          Confirm this invitation to open your customer portal. Account details are shown only after
          access is verified.
        </p>

        {(state === 'unavailable' || (message && state !== 'success')) && (
          <p className="mt-4 rounded-xl bg-stone-50 p-3 text-sm text-stone-700" role="alert">
            {message || ACCESS_UNAVAILABLE}
          </p>
        )}

        {state === 'success' && (
          <p className="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-900" role="status">
            {message}
          </p>
        )}

        {(state === 'ready' || state === 'working') && (
          <button
            type="button"
            disabled={state === 'working'}
            onClick={() => void onClaim()}
            className="mt-6 flex min-h-12 w-full items-center justify-center rounded-xl bg-red-700 px-4 text-base font-semibold text-white disabled:opacity-60"
          >
            {state === 'working' ? 'Verifying…' : 'Continue'}
          </button>
        )}

        <p className="mt-4 text-center text-sm text-stone-500">
          <Link href="/portal/login" className="underline">
            Return to access page
          </Link>
        </p>
      </div>
    </div>
  );
}
