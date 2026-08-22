/**
 * Client helper for dedicated portal session cookie (__portal_session).
 * ENVIRONMENT=EMULATOR / local — never logs tokens.
 */
export async function establishPortalSessionCookie(accessToken: string): Promise<boolean> {
  try {
    const res = await fetch('/api/portal/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ accessToken }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function clearPortalSessionCookie(): Promise<void> {
  try {
    await fetch('/api/portal/session', {
      method: 'DELETE',
      credentials: 'same-origin',
    });
  } catch {
    // ignore
  }
}

export type PortalRouteAuthClientResult =
  | { allowed: true }
  | { allowed: false; reason?: string; message?: string };

/** Canonical route authorization via REST (P2-S5). */
export async function authorizePortalRouteClient(input: {
  token?: string;
  feature?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  pathname?: string;
}): Promise<PortalRouteAuthClientResult> {
  try {
    const res = await fetch('/api/portal/authorize-route', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      return { allowed: false, message: 'This portal section is not available.' };
    }
    const json = (await res.json()) as PortalRouteAuthClientResult;
    if (json && typeof json === 'object' && 'allowed' in json) return json;
    return { allowed: false, message: 'This portal section is not available.' };
  } catch {
    return { allowed: false, message: 'This portal section is not available.' };
  }
}
