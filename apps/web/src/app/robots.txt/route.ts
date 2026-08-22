import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { getSeoGlobals } = await import('@yuletide/firebase');
    const seo = await getSeoGlobals();
    return new NextResponse(seo.robotsTxt, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
    });
  } catch {
    return new NextResponse('User-agent: *\nAllow: /\nSitemap: /sitemap.xml\n', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
