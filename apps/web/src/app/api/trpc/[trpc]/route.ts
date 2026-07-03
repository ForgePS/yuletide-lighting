import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@clcrm/api';
import { createAuthContext } from '@/lib/auth';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: async () => ({
      auth: await createAuthContext(),
    }),
  });

export { handler as GET, handler as POST };
