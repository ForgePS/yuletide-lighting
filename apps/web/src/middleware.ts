import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isFirebaseIdTokenStructurallyValid } from '@/lib/session-token';

const publicPaths = [
  '/',
  '/pricing',
  '/privacy',
  '/terms',
  '/subscription-terms',
  '/accessibility',
  '/sign-in',
  '/sign-up',
  '/access-denied',
  '/onboarding',
  '/a/',
  '/p/',
  '/pay/',
  '/portal/',
  '/m/',
  '/review/',
  '/api/health',
  '/api/auth/session',
  '/api/trpc/proposals.getByToken',
  '/api/trpc/proposals.accept',
  '/api/trpc/proposals360.public.getByToken',
  '/api/trpc/proposals360.public.approve',
  '/api/trpc/invoices.getByToken',
  '/api/trpc/invoices360.public.getByToken',
  '/api/trpc/invoices360.public.recordView',
  '/api/trpc/portal360.public.dashboard',
  '/api/trpc/portal360.public.submitServiceRequest',
  '/api/trpc/portal360.public.uploadServicePhoto',
  '/api/trpc/portal360.public.submitRebook',
  '/api/trpc/portal360.public.rebookInfo',
  '/api/trpc/portal360.public.timeline',
  '/api/trpc/portal360.public.notifications',
  '/api/trpc/portal360.public.markNotificationRead',
  '/api/trpc/portal360.public.markAllNotificationsRead',
  '/api/trpc/portal360.public.agreements',
  '/api/trpc/portal360.public.documents',
  '/api/trpc/portal360.public.storage',
  '/api/trpc/portal360.public.reviews',
  '/api/trpc/portal360.public.referrals',
  '/api/trpc/portal360.public.messages',
  '/api/trpc/portal360.public.sendMessage',
  '/api/trpc/portal360.public.properties',
  '/api/trpc/portal360.public.consultations',
  '/api/trpc/portal360.public.takedowns',
  '/api/trpc/portal360.public.submitScheduleRequest',
  '/api/trpc/portal360.public.invoices',
  '/api/trpc/portal360.public.proposals',
  '/api/trpc/portal360.public.mockups',
  '/api/trpc/portal360.public.jobs',
  '/api/trpc/portal360.public.jobDetail',
  '/api/trpc/portal360.public.signingHub',
  '/api/trpc/portal360.public.contacts',
  '/api/trpc/portal360.public.serviceRequests',
  '/api/trpc/portal360.public.qrLanding',
  '/api/trpc/portal360.public.qrSendCode',
  '/api/trpc/portal360.public.qrVerify',
  '/api/trpc/reviews360.public.getByToken',
  '/api/trpc/reviews360.public.submitFeedback',
  '/api/trpc/mockups360.public.getByToken',
  '/api/trpc/mockups360.public.approve',
  '/api/trpc/agreements360.public.getByToken',
  '/api/trpc/agreements360.public.sign',
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
    // Firebase Hosting only forwards the `__session` cookie to Cloud Run.
    const token = req.cookies.get('__session')?.value ?? null;
    if (!isFirebaseIdTokenStructurallyValid(token)) {
      const signIn = new URL('/sign-in', req.url);
      signIn.searchParams.set('next', pathname);
      signIn.searchParams.set('bounced', '1');
      return NextResponse.redirect(signIn);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)'],
};
