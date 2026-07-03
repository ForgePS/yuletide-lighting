'use client';

import { useState } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { EmptyState, LoadingState } from '@/components/ui/states';
import { formatServiceAddress } from '@/components/customer-address-fields';
import {
  formatPropertyAddress,
  installComplexityBadgeClass,
  labelInstallComplexity,
  labelPropertyProfileType,
} from '@/lib/property-profile-utils';
import { PropertyProfileForm } from '@/components/properties/property-profile-form';
import { SITE_HAZARD_OPTIONS } from '@/lib/customer360-utils';
import type { Property } from '@clcrm/types';
import { ChevronRight } from 'lucide-react';

export function PropertyList({ customerId }: { customerId: string }) {
  const { toast } = useToast();
  const { data, isLoading, refetch } = trpc.customer360.properties.list.useQuery({ customerId });
  const [showForm, setShowForm] = useState(false);
  const create = trpc.customer360.properties.create.useMutation({
    onSuccess: (property) => {
      toast('Property profile created', 'success');
      refetch();
      setShowForm(false);
      window.location.href = `/app/customers/${customerId}/property/${property.id}`;
    },
    onError: () => toast('Could not add property', 'error'),
  });

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h2 className="font-semibold">Property profiles</h2>
        <button type="button" className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Add property profile'}
        </button>
      </div>
      {showForm && (
        <PropertyProfileForm
          loading={create.isPending}
          onSubmit={(data) => create.mutate({ customerId, data: data as never })}
          submitLabel="Create property profile"
        />
      )}
      {!data?.length && !showForm ? (
        <EmptyState
          title="No property profiles yet"
          description="Capture roofline, access, power, photos, and install complexity to speed up estimates."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data?.map((p) => <PropertyCard key={p.id} customerId={customerId} property={p as Property} />)}
        </div>
      )}
    </div>
  );
}

function PropertyCard({ customerId, property }: { customerId: string; property: Property }) {
  return (
    <Link
      href={`/app/customers/${customerId}/property/${property.id}`}
      className="card-hover block p-5"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{property.propertyName}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{formatPropertyAddress(property)}</p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{labelPropertyProfileType(property.propertyType)}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs ${installComplexityBadgeClass(property.installComplexity)}`}>
          {labelInstallComplexity(property.installComplexity)}
        </span>
      </div>
      {property.gateCode && <p className="mt-2 text-sm"><span className="text-muted-foreground">Gate:</span> {property.gateCode}</p>}
      {property.siteHazards?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {property.siteHazards.map((h) => (
            <span key={h} className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
              {SITE_HAZARD_OPTIONS.find((o) => o.value === h)?.label ?? h}
            </span>
          ))}
        </div>
      )}
      {(property.treeCount ?? property.shrubCount ?? property.estimatedRooflineFeet) != null && (
        <p className="mt-2 text-xs text-muted-foreground">
          {property.estimatedRooflineFeet ? `${property.estimatedRooflineFeet} ft roofline · ` : ''}
          Trees: {property.treeCount ?? 0} · Shrubs: {property.shrubCount ?? 0}
        </p>
      )}
      {!property.estimatedRooflineFeet && (
        <p className="mt-2 text-xs text-muted-foreground">{formatServiceAddress(property)}</p>
      )}
    </Link>
  );
}

export { PropertyProfileForm as PropertyForm };
