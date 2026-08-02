import type { AuthContext, Context } from '@clcrm/api';
import { appRouter } from '@clcrm/api';
import { buildAuthContext, type SeedAuthOptions } from './auth-context';

export type AppCaller = ReturnType<typeof appRouter.createCaller>;

/**
 * Build a tRPC caller against the REAL firestore appRouter with real middleware
 * (protectedProcedure, requireModule, requirePermission, officeProcedure, etc.).
 * Mirrors apps/web createContext: { auth, ip, userAgent }.
 */
export function createTestCaller(auth: AuthContext | null, extras?: Partial<Context>): AppCaller {
  const ctx: Context = {
    auth,
    portalSessionToken: extras?.portalSessionToken ?? null,
    ip: extras?.ip ?? '127.0.0.1',
    userAgent: extras?.userAgent ?? 'integration-test',
  };
  return appRouter.createCaller(ctx);
}

export function createCallerForAuth(opts: SeedAuthOptions): AppCaller {
  return createTestCaller(buildAuthContext(opts));
}

export function createUnauthenticatedCaller(): AppCaller {
  return createTestCaller(null);
}

export async function expectTrpcCode(
  promise: Promise<unknown>,
  code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'BAD_REQUEST' | 'INTERNAL_SERVER_ERROR',
): Promise<void> {
  try {
    await promise;
    throw new Error(`Expected TRPCError ${code} but call succeeded`);
  } catch (err) {
    const e = err as { code?: string; message?: string };
    if (e.code !== code) {
      throw new Error(
        `Expected TRPCError ${code}, got ${e.code ?? 'unknown'}: ${e.message ?? err}`,
      );
    }
  }
}
