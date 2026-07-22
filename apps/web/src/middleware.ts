import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isFirebaseIdTokenStructurallyValid } from '@/lib/session-token';

const publicPaths = [
  '/',
  '/pricing',
  '/sign-in',
  '/sign-up',
  '/access-denied',
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
  '/api/trpc/websiteCms.public.getPage',
  '/api/trpc/websiteCms.public.getGlobals',
  '/api/trpc/siteCms.forms.publicGet',
  '/api/trpc/siteCms.forms.publicSubmit',
  '/api/trpc/siteCms.collections.publicEntries',
  '/api/trpc/siteCms.notices.active',
  '/api/trpc/siteCms.seo.publicRobots',
  '/api/trpc/messages360.public.receiveSms',
  '/api/webhooks',
  '/api/inngest',
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = publicPaths.some((p) => pathname === p || pathname.startsWith(p));

  if (isPublic) return NextResponse.next();

  if (pathname.startsWith('/app') || pathname.startsWith('/creator')) {
    const token = req.cookies.get('firebase-token')?.value;
    if (!isFirebaseIdTokenStructurallyValid(token)) {
      const signIn = new URL('/sign-in', req.url);
      signIn.searchParams.set('next', pathname);
      return NextResponse.redirect(signIn);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)'],
};
