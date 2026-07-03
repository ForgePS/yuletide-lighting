'use client';

import Link from 'next/link';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { PropertyProfileForm } from './property-profile-form';
import {
  formatPropertyAddress,
  installComplexityBadgeClass,
  labelInstallComplexity,
  labelPropertyProfileType,
  propertyToFormValues,
} from '@/lib/property-profile-utils';
import { SITE_HAZARD_OPTIONS } from '@/lib/customer360-utils';
import { AuthenticatedImage } from '@/components/authenticated-image';
import { ArrowLeft, Edit } from 'lucide-react';

export function PropertyProfileDetail({
  customerId,
  propertyId,
}: {
  customerId: string;
  propertyId: string;
}) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);

  const { data: property, isLoading, error, refetch } = trpc.customer360.properties.getById.useQuery({
    customerId,
    propertyId,
  });

  const update = trpc.customer360.properties.update.useMutation({
    onSuccess: () => {
      toast('Property profile saved', 'success');
      refetch();
      setEditing(false);
    },
    onError: () => toast('Could not save property', 'error'),
  });

  if (isLoading) return <LoadingState />;
  if (error || !property) return <ErrorState message="Property not found" />;

  if (editing) {
    return (
      <div>
        <button type="button" className="btn-ghost mb-4 text-sm" onClick={() => setEditing(false)}>
          <ArrowLeft className="h-4 w-4" />
          Cancel editing
        </button>
        <PropertyProfileForm
          initial={propertyToFormValues(property)}
          loading={update.isPending}
          onSubmit={(data) => update.mutate({ customerId, propertyId, data: data as never })}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href={`/app/customers/${customerId}/properties`} className="text-sm text-primary hover:underline">
            ← Back to customer properties
          </Link>
          <h1 className="mt-2 text-2xl font-bold">{property.propertyName}</h1>
          <p className="mt-1 text-muted-foreground">{formatPropertyAddress(property)}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
              {labelPropertyProfileType(property.propertyType)}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${installComplexityBadgeClass(property.installComplexity)}`}>
              {labelInstallComplexity(property.installComplexity)} complexity
            </span>
            {property.ladderRequired && (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">Ladder</span>
            )}
            {property.liftRequired && (
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">Lift required</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary" onClick={() => setEditing(true)}>
            <Edit className="h-4 w-4" />
            Edit profile
          </button>
          <Link href={`/app/proposals/new?customerId=${customerId}`} className="btn-primary">
            Create proposal
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <InfoCard title="Roofline">
          <InfoRow label="Est. feet" value={property.estimatedRooflineFeet ?? '—'} />
          <InfoRow label="Peaks" value={property.peaks ?? '—'} />
          {property.roofMeasurementNotes && <p className="mt-2 text-sm text-muted-foreground">{property.roofMeasurementNotes}</p>}
        </InfoCard>
        <InfoCard title="Landscaping">
          <InfoRow label="Trees" value={property.treeCount ?? 0} />
          <InfoRow label="Shrubs" value={property.shrubCount ?? 0} />
          {property.wreathLocations && <InfoRow label="Wreaths" value={property.wreathLocations} />}
          {property.garlandLocations && <InfoRow label="Garland" value={property.garlandLocations} />}
        </InfoCard>
        <InfoCard title="Power & access">
          {property.powerSourceLocations && <InfoRow label="Power" value={property.powerSourceLocations} />}
          {property.gfciNotes && <InfoRow label="GFCI" value={property.gfciNotes} />}
          {property.accessInstructions && <InfoRow label="Access" value={property.accessInstructions} />}
          {property.gateCode && <InfoRow label="Gate" value={property.gateCode} />}
        </InfoCard>
        <InfoCard title="Previous season">
          <p className="text-sm text-muted-foreground">
            {property.previousYearDesignNotes || 'No prior design notes recorded.'}
          </p>
          <Link href={`/app/customers/${customerId}/designs`} className="mt-3 inline-block text-sm text-primary hover:underline">
            View design history →
          </Link>
        </InfoCard>
      </div>

      {property.siteHazards?.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold">Site hazards</h3>
          <div className="mt-2 flex flex-wrap gap-1">
            {property.siteHazards.map((h) => (
              <span key={h} className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                {SITE_HAZARD_OPTIONS.find((o) => o.value === h)?.label ?? h}
              </span>
            ))}
          </div>
          {property.siteHazardNotes && <p className="mt-2 text-sm text-muted-foreground">{property.siteHazardNotes}</p>}
        </div>
      )}

      {property.galleryPhotos && property.galleryPhotos.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold">Photos</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {property.galleryPhotos.map((photo) => (
              <div key={photo.id} className="overflow-hidden rounded-lg border border-border">
                <div className="aspect-[4/3]">
                  <AuthenticatedImage value={photo.url} alt={photo.label ?? 'Property'} className="h-full w-full object-cover" />
                </div>
                {photo.label && <p className="p-2 text-xs text-muted-foreground">{photo.label}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <h3 className="font-semibold">{title}</h3>
      <div className="mt-3 space-y-1">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-sm">
      <span className="text-muted-foreground">{label}: </span>
      <span>{value}</span>
    </div>
  );
}
