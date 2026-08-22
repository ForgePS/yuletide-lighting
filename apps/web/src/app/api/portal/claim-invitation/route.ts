import { NextResponse } from 'next/server';
import {
  claimPortalInvitation,
  createPortalSessionContext,
  getAdminAuth,
  portalSessionCookieOptions,
} from '@yuletide/firebase';

export const runtime = 'nodejs';

const ACCESS_UNAVAILABLE =
  'Portal access is unavailable. Please request a new access link or contact the business.';

/**
 * Canonical invitation claim (P2-S3).
 * Uses P2-S2 session minting; sets __portal_session cookie.
 * ENVIRONMENT=EMULATOR for automated evidence.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { invitationToken?: string; idToken?: string };
    const invitationToken = body.invitationToken?.trim() ?? '';
    const idToken = body.idToken?.trim() ?? '';
    if (invitationToken.length < 16 || idToken.length < 20) {
      return NextResponse.json({ ok: false, message: ACCESS_UNAVAILABLE }, { status: 400 });
    }

    const decoded = await getAdminAuth().verifyIdToken(idToken);
    const result = await claimPortalInvitation({
      invitationToken,
      authUserId: decoded.uid,
    });
    if (!result.ok) {
      return NextResponse.json({ ok: false, message: ACCESS_UNAVAILABLE }, { status: 401 });
    }

    const session = await createPortalSessionContext({
      organizationId: result.organizationId,
      customerId: result.customerId,
      portalAccountId: result.portalAccountId,
      portalUserId: result.portalUserId,
    });
    if (!session) {
      return NextResponse.json({ ok: false, message: ACCESS_UNAVAILABLE }, { status: 401 });
    }

    const res = NextResponse.json({
      ok: true,
      message: 'Access confirmed.',
      expiresAt: session.expiresAt.toISOString(),
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
    res.headers.set('Cache-Control', 'private');
    const opts = portalSessionCookieOptions(session.expiresAt);
    res.cookies.set(opts.name, session.token, {
      httpOnly: opts.httpOnly,
      secure: opts.secure,
      sameSite: opts.sameSite,
      path: opts.path,
      expires: opts.expires,
    });
    return res;
  } catch {
    return NextResponse.json({ ok: false, message: ACCESS_UNAVAILABLE }, { status: 401 });
  }
}
