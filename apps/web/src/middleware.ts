import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicPaths = [
  '/',
  '/pricing',
  '/sign-in',
  '/sign-up',
  '/admin',
  '/admin/',
  '/p/',
  '/pay/',
  '/portal/',
  '/m/',
  '/review/',
  '/api/trpc/proposals.getByToken',
  '/api/trpc/proposals.accept',
  '/api/trpc/proposals360.public.getByToken',
  '/api/trpc/proposals360.public.approve',
  '/api/trpc/invoices.getByToken',
  '/api/trpc/invoices360.public.getByToken',
  '/api/trpc/invoices360.public.recordView',
  '/api/trpc/reviews360.public.getByToken',
  '/api/trpc/reviews360.public.submitFeedback',
  '/api/webhooks',
  '/api/inngest',
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = publicPaths.some((p) => pathname === p || pathname.startsWith(p));

  if (isPublic) return NextResponse.next();

  const token = req.cookies.get('firebase-token')?.value;
  if (!token && (pathname.startsWith('/app') || pathname.startsWith('/creator'))) {
    return NextResponse.redirect(new URL('/sign-in', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)'],
};
