import { NextRequest, NextResponse } from 'next/server';
import { createAuthContext } from '@/lib/auth';
import { previewPromotionCode } from '@/lib/subscription-stripe';
import { validatePromoCodeSchema } from '@clcrm/validators';

export async function POST(req: NextRequest) {
  const ctx = await createAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = validatePromoCodeSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter a valid promo code' }, { status: 400 });
  }

  const preview = await previewPromotionCode(parsed.data.code, parsed.data.plan);
  if (!preview) {
    return NextResponse.json({ error: 'Invalid or expired promo code' }, { status: 404 });
  }

  return NextResponse.json({ valid: true, preview });
}
