'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink, httpLink, splitLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import superjson from 'superjson';
import { useState, type ReactNode } from 'react';
import type { AppRouter } from '@clcrm/api';
import { useAuth } from '@/lib/firebase-auth';
import { getCachedAuthToken } from '@/lib/auth-token';
import { auth } from '@/lib/firebase';

export const trpc = createTRPCReact<AppRouter>();

function getBaseUrl() {
  if (typeof window !== 'undefined') return '';
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

const HEAVY_TRPC_PATHS = new Set([
  'reports360.commandCenter',
  'reports360.financial',
  'reports360.executive',
]);

async function authHeaders() {
  const cached = getCachedAuthToken();
  if (cached) {
    return { authorization: `Bearer ${cached}` };
  }
  const user = auth?.currentUser;
  if (!user) return {};
  try {
    const token = await user.getIdToken(false);
    return { authorization: `Bearer ${token}` };
  } catch {
    return {};
  }
}

function createTrpcLinks() {
  const url = `${getBaseUrl()}/api/trpc`;
  const shared = {
    transformer: superjson,
    headers: authHeaders,
    fetch(input: RequestInfo | URL, init?: RequestInit) {
      return fetch(input, { ...init, credentials: 'include' });
    },
  };

  return splitLink({
    condition(op) {
      return HEAVY_TRPC_PATHS.has(op.path);
    },
    true: httpLink({ url, ...shared }),
    false: httpBatchLink({ url, ...shared }),
  });
}

function TRPCInner({ children }: { children: ReactNode }) {
  const { loading } = useAuth();

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [createTrpcLinks()],
    }),
  );

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children as never}</QueryClientProvider>
    </trpc.Provider>
  );
}

export function TRPCProvider({ children }: { children: ReactNode }) {
  return <TRPCInner>{children}</TRPCInner>;
}
