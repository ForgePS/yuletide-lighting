import { NextRequest, NextResponse } from 'next/server';
import {
  authorizePortalPath,
  requirePortalRouteAccess,
  PORTAL_PUBLIC_MESSAGES,
} from '@yuletide/firebase';
import { portalAuthorizeRouteSchema } from '@clcrm/validators';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

/**
 * Canonical portal route authorization (P2-S5).
 * REST surface avoids AppRouter inference drops on the large portal360 router.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = portalAuthorizeRouteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          allowed: false,
          reason: 'AUTH_REQUIRED',
          message: PORTAL_PUBLIC_MESSAGES.accessUnavailable,
        },
        { status: 200, headers: { 'Cache-Control': 'private, no-store' } },
      );
    }

    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('__portal_session')?.value ?? null;
    // Session-first routes (P2-S7) send '' — only a real magic token counts.
    const requestToken =
      parsed.data.token && parsed.data.token.length >= 8 ? parsed.data.token : null;
    const auth = { token: requestToken, sessionToken };

    if (parsed.data.pathname) {
      // ['portal', 'app' | token, 'jobs', jobId] — index is identical for both shapes.
      const parts = parsed.data.pathname.split('/').filter(Boolean);
      const resourceId =
        parsed.data.resourceId ||
        (parts[0] === 'portal' &&
        (parts[1] === 'app' || parts.length >= 3) &&
        parts[2] === 'jobs' &&
        parts[3]
          ? parts[3]
          : undefined);
      const result = await authorizePortalPath({
        pathname: parsed.data.pathname,
        auth,
        resourceId,
      });
      if ('public' in result && result.public) {
        return NextResponse.json(
          { allowed: true },
          { headers: { 'Cache-Control': 'private, no-store' } },
        );
      }
      if (!result.allowed) {
        return NextResponse.json(
          { allowed: false, reason: result.reason, message: result.publicMessage },
          { headers: { 'Cache-Control': 'private, no-store' } },
        );
      }
      return NextResponse.json(
        { allowed: true },
        { headers: { 'Cache-Control': 'private, no-store' } },
      );
    }

    const result = await requirePortalRouteAccess({
      auth,
      feature: parsed.data.feature,
      action: parsed.data.action,
      resource:
        parsed.data.resourceType && parsed.data.resourceId
          ? { type: parsed.data.resourceType, id: parsed.data.resourceId }
          : undefined,
    });
    if (!result.allowed) {
      return NextResponse.json(
        { allowed: false, reason: result.reason, message: result.publicMessage },
        { headers: { 'Cache-Control': 'private, no-store' } },
      );
    }
    return NextResponse.json(
      { allowed: true },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch {
    return NextResponse.json(
      {
        allowed: false,
        reason: 'AUTH_REQUIRED',
        message: PORTAL_PUBLIC_MESSAGES.accessUnavailable,
      },
      { status: 200, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }
}
