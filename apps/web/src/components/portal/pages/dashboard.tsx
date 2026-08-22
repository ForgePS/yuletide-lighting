'use client';

import Link from 'next/link';
import Image from 'next/image';
import { trpc } from '@/lib/trpc';
import { portalAppPath, portalSessionInput } from '@/lib/portal-paths';
import { formatScheduleLabel } from '@clcrm/types';
import { formatCurrency, formatDate } from '@clcrm/ui';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { labelProposalStatus } from '@/lib/proposal-utils';
import { PortalShell, PortalFeatureFallback } from '@/components/portal/portal-shell';
import {
  PortalNextActionCard,
  PortalSection,
  PortalStatusPill,
  PortalDashboardGrid,
  type PortalNextAction,
} from '@/components/portal/portal-mobile';

export function PortalDashboardPage() {
  const { data, isLoading, isError } = trpc.portal360.public.dashboard.useQuery(portalSessionInput);
  const { data: signing } = trpc.portal360.public.signingHub.useQuery(portalSessionInput, {
    enabled: Boolean(data?.enabledFeatures?.includes('e_sign')),
  });
  const markRead = trpc.portal360.public.markNotificationRead.useMutation();

  if (isLoading) return <LoadingState message="Loading your portal..." />;
  if (isError || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100 p-4">
        <ErrorState message="Portal access not found or disabled. Check your link or contact your provider." />
      </div>
    );
  }

  const brandColor = data.settings.portalPrimaryColor ?? data.organization?.brandColor ?? '#B91C1C';
  const customerName =
    data.customer.businessName ||
    `${data.customer.firstName ?? ''} ${data.customer.lastName ?? ''}`.trim();
  const features = data.enabledFeatures ?? [];

  const unpaid = data.invoices.filter(
    (i) => i.status !== 'paid' && i.status !== 'void' && i.status !== 'cancelled',
  );
  const balanceDue = unpaid.reduce(
    (sum, i) => sum + Math.max(0, i.subtotalCents - i.amountPaidCents),
    0,
  );
  const actionableProposal = data.proposals.find(
    (p) =>
      p.publicToken &&
      !['approved', 'deposit_paid', 'scheduled', 'declined', 'expired'].includes(p.status),
  );
  const signItem = signing?.items?.[0];
  const nextAppt = data.schedule[0];
  const activeJob = data.jobs.find((j) => !['completed', 'cancelled', 'closed'].includes(j.stage));

  let nextAction: PortalNextAction | null = null;
  if (features.includes('e_sign') && signItem?.href) {
    nextAction = {
      eyebrow: 'Next action',
      title: signItem.title,
      body: 'Something needs your signature or approval.',
      href: signItem.href.startsWith('/') ? signItem.href : portalAppPath('sign'),
      cta: signItem.kind === 'mockup' ? 'Review design' : 'Review & sign',
      tone: 'danger',
    };
  } else if (
    features.includes('proposals') &&
    actionableProposal?.publicToken &&
    data.settings.permissions.approveDesigns
  ) {
    nextAction = {
      eyebrow: 'Next action',
      title: 'Your proposal is ready',
      body: `${actionableProposal.title} · ${formatCurrency(actionableProposal.subtotalCents)}`,
      href: `/p/${actionableProposal.publicToken}`,
      cta: 'Review proposal',
      tone: 'warn',
    };
  } else if (
    features.includes('billing') &&
    balanceDue > 0 &&
    unpaid[0]?.publicToken &&
    data.settings.allowOnlinePayments
  ) {
    nextAction = {
      eyebrow: 'Next action',
      title: `${formatCurrency(balanceDue)} balance due`,
      body: `Invoice ${unpaid[0].invoiceNumber} needs payment.`,
      href: `/pay/${unpaid[0].publicToken}`,
      cta: 'Pay now',
      tone: 'danger',
    };
  } else if (features.includes('scheduling') && nextAppt) {
    nextAction = {
      eyebrow: 'Next action',
      title: 'Upcoming appointment',
      body: `${nextAppt.title} · ${formatDate(nextAppt.startAt)}`,
      href: portalAppPath('schedule'),
      cta: 'View schedule',
      tone: 'info',
    };
  } else if (features.includes('install_tracking') && activeJob) {
    nextAction = {
      eyebrow: 'Next action',
      title: 'Project in progress',
      body: `${activeJob.title} · ${formatScheduleLabel(activeJob.stage)}`,
      href: portalAppPath('jobs', activeJob.id),
      cta: 'Track installation',
      tone: 'info',
    };
  } else if (features.includes('service_requests') && data.settings.allowServiceRequests) {
    nextAction = {
      eyebrow: 'Next action',
      title: 'Need help with your lights?',
      body: 'Report an issue with photos from your phone.',
      href: portalAppPath('service-request'),
      cta: 'Request service',
      tone: 'success',
    };
  }

  const unreadNotes = (data.notifications ?? []).filter((n) => !n.readAt).slice(0, 3);

  return (
    <PortalShell
      companyName={data.organization?.companyName ?? 'Customer Portal'}
      brandColor={brandColor}
      enabledFeatures={features}
      notifications={data.notifications ?? []}
    >
      <p className="text-base text-stone-600">
        Welcome, <span className="font-semibold text-stone-900">{customerName || 'there'}</span>
      </p>

      {nextAction && <PortalNextActionCard action={nextAction} brandColor={brandColor} />}

      <PortalDashboardGrid>
        {features.includes('scheduling') && nextAppt && (
          <PortalSection eyebrow="Upcoming appointment" title={nextAppt.title}>
            <p className="text-base text-stone-600">{formatDate(nextAppt.startAt)}</p>
            <p className="mt-1 capitalize text-stone-500">
              {formatScheduleLabel(nextAppt.appointmentType)}
            </p>
            {nextAppt.propertyAddress && (
              <p className="mt-1 text-sm text-stone-400">{nextAppt.propertyAddress}</p>
            )}
            <Link
              href={portalAppPath('schedule')}
              className="mt-3 inline-flex min-h-11 items-center text-base font-medium text-primary hover:underline"
            >
              View all appointments →
            </Link>
          </PortalSection>
        )}

        {features.includes('install_tracking') && activeJob && (
          <PortalSection eyebrow="Current project" title={activeJob.title}>
            <PortalStatusPill tone="info">{formatScheduleLabel(activeJob.stage)}</PortalStatusPill>
            {activeJob.scheduledStart && (
              <p className="mt-2 text-base text-stone-600">
                Scheduled {formatDate(activeJob.scheduledStart)}
              </p>
            )}
            <Link
              href={portalAppPath('jobs', activeJob.id)}
              className="mt-3 inline-flex min-h-11 items-center text-base font-medium text-primary hover:underline"
            >
              View details →
            </Link>
          </PortalSection>
        )}

        {features.includes('billing') && balanceDue > 0 && (
          <PortalSection eyebrow="Outstanding balance" title={formatCurrency(balanceDue)}>
            <p className="text-base text-stone-600">
              {unpaid.length} open invoice{unpaid.length === 1 ? '' : 's'}
            </p>
            <Link
              href={portalAppPath('billing')}
              className="btn-primary mt-4 inline-flex min-h-11 w-full items-center justify-center text-base sm:w-auto"
            >
              View billing
            </Link>
          </PortalSection>
        )}
      </PortalDashboardGrid>

      {unreadNotes.length > 0 && (
        <PortalSection
          title="Alerts"
          action={
            <Link
              href={portalAppPath('notifications')}
              className="text-sm text-primary hover:underline"
            >
              All
            </Link>
          }
        >
          <ul className="space-y-3">
            {unreadNotes.map((n) => (
              <li key={n.id} className="rounded-xl border border-red-100 bg-red-50/50 px-4 py-3">
                <p className="font-medium text-stone-900">{n.title}</p>
                <p className="mt-1 text-base text-stone-600">{n.body}</p>
                <button
                  type="button"
                  className="mt-2 min-h-11 text-sm font-medium text-primary hover:underline"
                  onClick={() => markRead.mutate({ ...portalSessionInput, notificationId: n.id })}
                >
                  Mark read
                </button>
              </li>
            ))}
          </ul>
        </PortalSection>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <PortalSection title="Quick actions">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
            {[
              features.includes('e_sign') && { href: portalAppPath('sign'), label: 'Sign' },
              features.includes('billing') && { href: portalAppPath('billing'), label: 'Pay' },
              features.includes('proposals') && {
                href: portalAppPath('proposals'),
                label: 'Proposals',
              },
              features.includes('service_requests') &&
                data.settings.allowServiceRequests && {
                  href: portalAppPath('service-request'),
                  label: 'Service',
                },
              features.includes('messaging') && {
                href: portalAppPath('messages'),
                label: 'Messages',
              },
              features.includes('scheduling') &&
                data.settings.allowSelfScheduling && {
                  href: portalAppPath('schedule-request'),
                  label: 'Request visit',
                },
              features.includes('rebooking') && { href: portalAppPath('rebook'), label: 'Rebook' },
              features.includes('properties') && {
                href: portalAppPath('properties'),
                label: 'Properties',
              },
            ]
              .filter(Boolean)
              .map((item) => (
                <Link
                  key={(item as { href: string }).href}
                  href={(item as { href: string }).href}
                  className="flex min-h-12 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 px-3 text-center text-sm font-semibold text-stone-800"
                >
                  {(item as { label: string }).label}
                </Link>
              ))}
          </div>
        </PortalSection>

        {(data.timeline?.length ?? 0) > 0 && (
          <PortalSection title="Recent activity">
            <ul className="space-y-3">
              {data.timeline.slice(0, 6).map((ev) => (
                <li key={ev.id} className="border-b border-stone-100 pb-3 last:border-0">
                  <p className="font-medium text-stone-900">{ev.title}</p>
                  {ev.description && <p className="text-base text-stone-600">{ev.description}</p>}
                  <p className="mt-1 text-sm text-stone-400">{formatDate(ev.occurredAt)}</p>
                </li>
              ))}
            </ul>
          </PortalSection>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {features.includes('proposals') ? (
          data.proposals.length > 0 && (
            <PortalSection
              title="Proposals"
              action={
                <Link
                  href={portalAppPath('proposals')}
                  className="text-sm text-primary hover:underline"
                >
                  View all
                </Link>
              }
            >
              <ul className="space-y-3">
                {data.proposals.slice(0, 3).map((p) => (
                  <li key={p.id} className="rounded-xl border border-stone-100 p-3">
                    <p className="font-medium text-stone-900">{p.title}</p>
                    <p className="mt-1 text-base text-stone-500">
                      {formatCurrency(p.subtotalCents)} · {labelProposalStatus(p.status)}
                    </p>
                    {p.publicToken && data.settings.permissions.approveDesigns && (
                      <Link
                        href={`/p/${p.publicToken}`}
                        className="btn-primary mt-3 inline-flex min-h-11 w-full items-center justify-center text-base sm:w-auto"
                      >
                        {['approved', 'deposit_paid', 'scheduled'].includes(p.status)
                          ? 'View'
                          : 'Review & approve'}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </PortalSection>
          )
        ) : (
          <PortalFeatureFallback
            title="Proposals unavailable"
            message="Proposal access is not enabled for your portal."
          />
        )}

        {features.includes('mockups') && data.mockups.length > 0 && (
          <PortalSection
            title="Designs"
            action={
              <Link
                href={portalAppPath('mockups')}
                className="text-sm text-primary hover:underline"
              >
                View all
              </Link>
            }
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {data.mockups.slice(0, 2).map((m) => (
                <div key={m.id} className="overflow-hidden rounded-xl border border-stone-200">
                  <div className="relative aspect-video bg-stone-100">
                    <Image
                      src={m.renderedImageUrl ?? m.imageUrl}
                      alt={m.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 p-3">
                    <p className="text-base font-medium text-stone-900">{m.name}</p>
                    {m.approvalToken &&
                      m.status === 'in_review' &&
                      data.settings.permissions.approveDesigns && (
                        <Link
                          href={`/m/${m.approvalToken}`}
                          className="min-h-11 text-sm font-medium text-primary hover:underline"
                        >
                          Review
                        </Link>
                      )}
                  </div>
                </div>
              ))}
            </div>
          </PortalSection>
        )}
      </div>
    </PortalShell>
  );
}
