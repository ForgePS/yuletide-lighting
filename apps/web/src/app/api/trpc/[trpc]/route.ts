import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@clcrm/api';
import { createAuthContext } from '@/lib/auth';

function clientIp(req: Request): string | null {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || null;
  return req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip') || null;
}

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: async () => ({
      auth: await createAuthContext(),
      ip: clientIp(req),
      userAgent: req.headers.get('user-agent'),
    }),
  });

export { handler as GET, handler as POST };
