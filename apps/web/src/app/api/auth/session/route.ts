import { NextResponse } from 'next/server';
import { isFirebaseIdTokenStructurallyValid } from '@/lib/session-token';
import { AUTH_COOKIE_NAME } from '@/lib/auth-token';

export const runtime = 'nodejs';

const MAX_AGE = 60 * 60; // 1 hour

function sessionCookie(token: string | null) {
  if (!token) {
    return `${AUTH_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
  }
  return `${AUTH_COOKIE_NAME}=${token}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { idToken?: string };
    const idToken = body.idToken?.trim();
    if (!isFirebaseIdTokenStructurallyValid(idToken)) {
      return NextResponse.json({ error: 'Missing or invalid idToken' }, { status: 400 });
    }

    const res = NextResponse.json({ ok: true });
    // Required so Firebase Hosting CDN does not cache personalized auth responses.
    res.headers.set('Cache-Control', 'private');
    res.headers.set('Set-Cookie', sessionCookie(idToken!));
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Session create failed';
    console.error('[api/auth/session]', message);
    return NextResponse.json({ error: 'Session create failed' }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.headers.set('Cache-Control', 'private');
  res.headers.set('Set-Cookie', sessionCookie(null));
  return res;
}
