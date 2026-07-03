'use client';

import Link from 'next/link';
import Image from 'next/image';
import { trpc } from '@/lib/trpc';
import { formatCurrency, formatDate, formatStage } from '@clcrm/ui';
import { LoadingState } from '@/components/ui/states';
import { MaterialRequirementsPanel } from './material-requirements-panel';
import { WeatherRiskBadge } from './weather-risk-badge';

export function JobDetail({ jobId }: { jobId: string }) {
  const { data, isLoading, refetch } = trpc.jobs.getById.useQuery({ jobId });
  const reserveInventory = trpc.jobs.reserveInventory.useMutation({ onSuccess: () => refetch() });
  const completeInstall = trpc.jobs.completeInstall.useMutation({ onSuccess: () => refetch() });
  const markRemoval = trpc.jobs.markRemovalComplete.useMutation({ onSuccess: () => refetch() });

  if (isLoading) return <LoadingState message="Loading job..." />;
  if (!data) return <p className="text-muted-foreground">Job not found.</p>;

  const { job, customer, property, proposal, mockups, materials, calendarEvent } = data;
  const customerName = customer
    ? customer.businessName || `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim()
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{job.title}</h1>
          <p className="text-muted-foreground capitalize">{formatStage(job.stage)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {job.stage === 'accepted_proposal' && (
            <button type="button" className="btn-secondary text-sm" onClick={() => reserveInventory.mutate({ jobId })}>
              Reserve inventory
            </button>
          )}
          {job.stage === 'scheduled' && (
            <button type="button" className="btn-primary text-sm" onClick={() => completeInstall.mutate({ jobId })}>
              Mark installed
            </button>
          )}
          {job.stage === 'removal_scheduled' && (
            <button type="button" className="btn-primary text-sm" onClick={() => markRemoval.mutate({ jobId })}>
              Mark removed
            </button>
          )}
          {calendarEvent && (
            <Link href="/app/schedule/calendar" className="btn-secondary text-sm">
              View on calendar
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card space-y-3 p-4">
          <h2 className="font-semibold">Customer</h2>
          {customer ? (
            <>
              <p>{customerName}</p>
              {customer.phone && <p className="text-sm"><a href={`tel:${customer.phone}`} className="text-primary">{customer.phone}</a></p>}
              {customer.email && <p className="text-sm"><a href={`mailto:${customer.email}`} className="text-primary">{customer.email}</a></p>}
              {customer.id && (
                <Link href={`/app/customers/${customer.id}`} className="text-sm text-primary hover:underline">
                  View customer profile
                </Link>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No customer linked</p>
          )}
        </div>

        <div className="card space-y-3 p-4">
          <h2 className="font-semibold">Property</h2>
          {property ? (
            <>
              <p>{property.addressLine1}, {property.city} {property.state}</p>
              {property.installComplexity && (
                <p className="text-sm capitalize">Complexity: {property.installComplexity.replace(/_/g, ' ')}</p>
              )}
              {property.estimatedRooflineFeet && (
                <p className="text-sm text-muted-foreground">~{property.estimatedRooflineFeet} ft roofline</p>
              )}
              {property.installNotes && <p className="text-sm text-muted-foreground">{property.installNotes}</p>}
              {property.gfciNotes && <p className="text-sm text-muted-foreground">GFCI: {property.gfciNotes}</p>}
              {(property.ladderRequired || property.liftRequired) && (
                <p className="text-sm text-amber-700">
                  {property.ladderRequired && 'Ladder required'}
                  {property.ladderRequired && property.liftRequired && ' · '}
                  {property.liftRequired && 'Lift required'}
                </p>
              )}
              <Link href={`/app/customers/${property.customerId}/property/${property.id}`} className="text-sm text-primary hover:underline">
                View property profile
              </Link>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No property linked</p>
          )}
        </div>
      </div>

      {calendarEvent && (
        <div className="card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold">Schedule</h2>
            <WeatherRiskBadge risk={calendarEvent.weatherRisk} />
          </div>
          <p className="mt-2 text-sm">{formatDate(calendarEvent.startAt)} — {formatDate(calendarEvent.endAt)}</p>
          {calendarEvent.crewName && <p className="text-sm text-muted-foreground">Crew: {calendarEvent.crewName}</p>}
        </div>
      )}

      {proposal && (
        <div className="card p-4">
          <h2 className="font-semibold">Proposal</h2>
          <p className="mt-2 text-sm">{formatCurrency(proposal.subtotalCents)} · {proposal.status.replace(/_/g, ' ')}</p>
          {proposal.installDate && <p className="text-sm text-muted-foreground">Install: {formatDate(proposal.installDate)}</p>}
          {proposal.removalDate && <p className="text-sm text-muted-foreground">Removal: {formatDate(proposal.removalDate)}</p>}
          <Link href={`/app/proposals/${proposal.id}`} className="mt-2 inline-block text-sm text-primary hover:underline">
            View proposal
          </Link>
        </div>
      )}

      {mockups.length > 0 && (
        <div className="card p-4">
          <h2 className="mb-3 font-semibold">Design mockups</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mockups.map((m) => (
              <div key={m.id} className="overflow-hidden rounded-lg border">
                <div className="relative aspect-video bg-muted">
                  <Image src={m.renderedImageUrl ?? m.imageUrl} alt={m.name} fill className="object-cover" unoptimized />
                </div>
                <p className="p-2 text-sm font-medium">{m.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <MaterialRequirementsPanel materials={materials} />
    </div>
  );
}
