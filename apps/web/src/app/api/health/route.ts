import { NextResponse } from 'next/server';

/**
 * Lightweight production health endpoint for uptime checks.
 * Does not expose secrets; returns process-level readiness only.
 */
export async function GET() {
  const checks = {
    app: 'ok' as const,
    timestamp: new Date().toISOString(),
    node: process.version,
    env: {
      hasFirebaseProject: Boolean(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
      hasAppUrl: Boolean(process.env.NEXT_PUBLIC_APP_URL),
      hasStripe: Boolean(process.env.STRIPE_SECRET_KEY),
      hasTwilio: Boolean(process.env.TWILIO_ACCOUNT_SID),
    },
  };

  return NextResponse.json(
    {
      status: 'ok',
      checks,
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}
