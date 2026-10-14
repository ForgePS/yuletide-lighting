import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createDemoEntrySession, getDemoEntryStatus, kickoffDemoTenantSeed } from '@yuletide/firebase';

const enterSchema = z.object({
  mode: z.enum(['watch', 'guided', 'explore']),
});

export async function GET() {
  try {
    const status = await getDemoEntryStatus();
    return NextResponse.json(status);
  } catch (err) {
    return NextResponse.json(
      {
        enabled: false,
        configured: false,
        organizationId: null,
        error: err instanceof Error ? err.message : 'Demo status unavailable',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = enterSchema.parse(await request.json());
    const session = await createDemoEntrySession();
    kickoffDemoTenantSeed(session.organizationId);
    return NextResponse.json({ ...session, mode: body.mode });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid demo entry mode' }, { status: 400 });
    }

    const code = err instanceof Error ? err.message : 'DEMO_ENTRY_FAILED';
    const status =
      code === 'DEMO_ENTRY_DISABLED'
        ? 403
        : code === 'DEMO_NOT_CONFIGURED' || code === 'DEMO_USER_NOT_CONFIGURED'
          ? 503
          : code === 'DEMO_ENTRY_AUTH_UNAVAILABLE'
            ? 503
            : 500;

    return NextResponse.json(
      {
        error:
          code === 'DEMO_NOT_CONFIGURED'
            ? 'Demo environment is not provisioned yet.'
            : code === 'DEMO_USER_NOT_CONFIGURED'
              ? 'Demo sign-in user is not configured.'
              : code === 'DEMO_ENTRY_DISABLED'
                ? 'Demo entry is disabled in this environment.'
                : code === 'DEMO_ENTRY_AUTH_UNAVAILABLE'
                  ? 'Demo sign-in is unavailable. Re-run demo provision or set YULETIDE_DEMO_ENTRY_PASSWORD.'
                  : 'Could not start the demo.',
      },
      { status },
    );
  }
}
