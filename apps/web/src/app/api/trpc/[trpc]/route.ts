import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@clcrm/api';
import { createAuthContext } from '@/lib/auth';
import { PORTAL_SESSION_COOKIE } from '@yuletide/firebase';

function clientIp(req: Request): string | null {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || null;
  return req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip') || null;
}

function readPortalSessionCookie(req: Request): string | null {
  const cookie = req.headers.get('cookie') ?? '';
  const match = cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${PORTAL_SESSION_COOKIE}=`));
  if (!match) return null;
  const value = match.slice(`${PORTAL_SESSION_COOKIE}=`.length).trim();
  return value || null;
}

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: async () => ({
      auth: await createAuthContext(),
      portalSessionToken: readPortalSessionCookie(req),
      ip: clientIp(req),
      userAgent: req.headers.get('user-agent'),
    }),
  });

export { handler as GET, handler as POST };
