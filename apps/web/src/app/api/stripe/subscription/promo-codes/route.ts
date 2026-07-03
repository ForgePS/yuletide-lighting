import { NextRequest, NextResponse } from 'next/server';
import { createAuthContext } from '@/lib/auth';
import { createStripePromotionCode, listActivePromotionCodes } from '@/lib/subscription-stripe';
import { createPromoCodeSchema } from '@clcrm/validators';

function requireAdmin(ctx: NonNullable<Awaited<ReturnType<typeof createAuthContext>>>) {
  if (!['owner', 'admin'].includes(ctx.role)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const ctx = await createAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const denied = requireAdmin(ctx);
  if (denied) return denied;

  const codes = await listActivePromotionCodes();
  return NextResponse.json({ codes });
}

export async function POST(req: NextRequest) {
  const ctx = await createAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const denied = requireAdmin(ctx);
  if (denied) return denied;

  const parsed = createPromoCodeSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid promo code settings' }, { status: 400 });
  }

  if (parsed.data.duration === 'repeating' && !parsed.data.durationInMonths) {
    return NextResponse.json({ error: 'Repeating discounts need duration in months' }, { status: 400 });
  }

  try {
    const preview = await createStripePromotionCode(parsed.data);
    return NextResponse.json({ created: true, preview });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not create promo code in Stripe';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
