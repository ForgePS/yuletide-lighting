'use client';

import { useParams, usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LoadingState } from '@/components/ui/states';
import { mapLegacyPortalPathToAppPath as mapLegacyPortalPathToAppPathCanonical } from '@clcrm/types';

/** Re-export canonical mapper for web callers. */
export const mapLegacyPortalPathToAppPath = mapLegacyPortalPathToAppPathCanonical;

type EntryState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'redirecting' };

async function exchangeMagicTokenForSession(
  accessToken: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const res = await fetch('/api/portal/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ accessToken }),
    });
    if (res.status === 409) {
      return {
        ok: false,
        message:
          'This link is for a different customer account. Sign out and open the correct portal link, or verify access again.',
      };
    }
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      return {
        ok: false,
        message: body?.error ?? 'Portal access not found or disabled.',
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: 'Could not establish portal session. Please try again.' };
  }
}

/**
 * Entry shim for legacy `/portal/{token}/...` URLs.
 * Exchanges magic token for `__portal_session`, then replaces URL with `/portal/app/...`.
 */
export function LegacyPortalEntryShim() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useState<EntryState>({ status: 'loading' });

  const token =
    typeof params.token === 'string'
      ? params.token
      : Array.isArray(params.token)
        ? params.token[0]
        : '';

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!token || token.length < 8) {
        if (!cancelled) {
          setState({ status: 'error', message: 'Invalid portal link.' });
        }
        return;
      }

      const destination = mapLegacyPortalPathToAppPath(pathname || `/portal/${token}`);
      if (!destination) {
        if (!cancelled) {
          setState({ status: 'error', message: 'This portal link is not recognized.' });
        }
        return;
      }

      const result = await exchangeMagicTokenForSession(token);
      if (cancelled) return;

      if (!result.ok) {
        setState({ status: 'error', message: result.message });
        return;
      }

      setState({ status: 'redirecting' });
      router.replace(destination);
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [token, pathname, router]);

  if (state.status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100 p-4">
        <div className="w-full max-w-lg space-y-4 rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-stone-900">Portal access unavailable</h1>
          <p className="text-base text-stone-600">{state.message}</p>
          <div className="flex flex-wrap justify-center gap-3 text-sm">
            <Link href="/portal/login" className="text-primary hover:underline">
              Verify portal access again
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <LoadingState
      message={state.status === 'redirecting' ? 'Opening your portal…' : 'Verifying portal access…'}
    />
  );
}
