import { NextResponse } from 'next/server';

/** Public Mapbox token for client map rendering (pk.ey…). Prefer server MAPBOX_TOKEN. */
export async function GET() {
  const token = (process.env.MAPBOX_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '').trim();
  if (!token) {
    return NextResponse.json({ token: null, error: 'Mapbox token not configured' }, { status: 503 });
  }
  return NextResponse.json({ token });
}
