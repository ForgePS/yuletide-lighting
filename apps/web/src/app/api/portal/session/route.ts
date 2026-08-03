import { NextResponse } from 'next/server';
import {
  PORTAL_SESSION_COOKIE,
  establishPortalSessionFromAccessToken,
  portalSessionCookieOptions,
  verifyPortalSessionTokenServer,
} from '@yuletide/firebase';
import { portalSessionTokenScopeConflict } from '@clcrm/types';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

const NO_STORE = 'no-store';

function setPortalCookie(res: NextResponse, token: string | null, expiresAt?: Date) {
  if (!token || !expiresAt) {
    res.cookies.set(PORTAL_SESSION_COOKIE, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
    return;
  }
  const opts = portalSessionCookieOptions(expiresAt);
  res.cookies.set(opts.name, token, {
    httpOnly: opts.httpOnly,
    secure: opts.secure,
    sameSite: opts.sameSite,
    path: opts.path,
    expires: opts.expires,
  });
}

/**
 * Create dedicated portal session cookie from:
 * - magic accessToken (P2-S2 compatibility), or
 * - already-minted sessionToken (invitation claim / OTP verify).
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { accessToken?: string; sessionToken?: string };
    const sessionToken = body.sessionToken?.trim();
    if (sessionToken && sessionToken.length >= 16) {
      const context = await verifyPortalSessionTokenServer(sessionToken);
      if (!context) {
        return NextResponse.json({ error: 'Invalid access' }, { status: 401 });
      }
      // Cookie TTL: use signed payload exp when present via re-verify path.
      // Session tokens already carry expiry; use 12h maxAge fallback from cookie options.
      const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
      const res = NextResponse.json({
        ok: true,
        context: {
          organizationId: context.organizationId,
          customerId: context.customerId,
          portalAccountId: context.portalAccountId,
          portalUserId: context.portalUserId,
          role: context.role,
          enabledFeatures: context.enabledFeatures,
          sessionVersion: context.sessionVersion,
        },
      });
      res.headers.set('Cache-Control', NO_STORE);
      setPortalCookie(res, sessionToken, expiresAt);
      return res;
    }

    const accessToken = body.accessToken?.trim();
    if (!accessToken || accessToken.length < 8) {
      return NextResponse.json(
        { error: 'Invalid access' },
        { status: 400, headers: { 'Cache-Control': NO_STORE } },
      );
    }

    const session = await establishPortalSessionFromAccessToken(accessToken);
    if (!session) {
      return NextResponse.json(
        { error: 'Invalid access' },
        { status: 401, headers: { 'Cache-Control': NO_STORE } },
      );
    }

    const cookieStore = await cookies();
    const existingCookie = cookieStore.get(PORTAL_SESSION_COOKIE)?.value ?? null;
    if (existingCookie) {
      const existingContext = await verifyPortalSessionTokenServer(existingCookie);
      if (
        existingContext &&
        portalSessionTokenScopeConflict(existingContext.customerId, session.context.customerId)
      ) {
        return NextResponse.json(
          { error: 'Session conflict — link is for a different customer account.' },
          { status: 409, headers: { 'Cache-Control': NO_STORE } },
        );
      }
    }
    const res = NextResponse.json({
      ok: true,
      context: {
        organizationId: session.context.organizationId,
        customerId: session.context.customerId,
        portalAccountId: session.context.portalAccountId,
        portalUserId: session.context.portalUserId,
        role: session.context.role,
        enabledFeatures: session.context.enabledFeatures,
        sessionVersion: session.context.sessionVersion,
      },
    });
    res.headers.set('Cache-Control', NO_STORE);
    setPortalCookie(res, session.token, session.expiresAt);
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Portal session failed';
    console.error('[api/portal/session]', message);
    return NextResponse.json(
      { error: 'Invalid access' },
      { status: 401, headers: { 'Cache-Control': NO_STORE } },
    );
  }
}

export async function GET(req: Request) {
  const cookie = req.headers.get('cookie') ?? '';
  const match = cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${PORTAL_SESSION_COOKIE}=`));
  const token = match?.slice(`${PORTAL_SESSION_COOKIE}=`.length) ?? null;
  if (!token) {
    return NextResponse.json({ ok: false, context: null }, { status: 401 });
  }
  const context = await verifyPortalSessionTokenServer(token);
  if (!context) {
    const res = NextResponse.json({ ok: false, context: null }, { status: 401 });
    setPortalCookie(res, null);
    return res;
  }
  return NextResponse.json({ ok: true, context });
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.headers.set('Cache-Control', NO_STORE);
  setPortalCookie(res, null);
  return res;
}
