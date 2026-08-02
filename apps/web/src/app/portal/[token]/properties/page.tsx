'use client';

import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { PortalAuthedFrame } from '@/components/portal/portal-shell';
import { PortalSplitView, PortalStatusPill } from '@/components/portal/portal-mobile';
import { LoadingState } from '@/components/ui/states';

export default function PortalPropertiesPage() {
  const token = useParams().token as string;
  return (
    <PortalAuthedFrame token={token} title="Properties" feature="properties">
      {({ token: accessToken }) => <PropertiesBody token={accessToken} />}
    </PortalAuthedFrame>
  );
}

function PropertiesBody({ token }: { token: string }) {
  const { data, isLoading, isError } = trpc.portal360.public.properties.useQuery({ token });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (isLoading) return <LoadingState message="Loading properties..." />;
  if (isError) return <p className="text-base text-red-600">Could not load properties.</p>;
  if (!data?.length) {
    return (
      <p className="rounded-2xl border border-stone-200 bg-white p-6 text-base text-stone-600">
        No properties on file yet.
      </p>
    );
  }

  const selected = data.find((p) => p.id === selectedId) ?? data[0]!;

  const detail = (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <p className="text-xl font-bold text-stone-900">{selected.propertyName}</p>
      {selected.propertyType && (
        <div className="mt-2">
          <PortalStatusPill>{selected.propertyType.replace(/_/g, ' ')}</PortalStatusPill>
        </div>
      )}
      <p className="mt-3 text-base text-stone-600">
        {[selected.addressLine1, selected.addressLine2].filter(Boolean).join(', ')}
        <br />
        {[selected.city, selected.state, selected.postalCode].filter(Boolean).join(', ')}
      </p>
      {selected.accessInstructions && (
        <p className="mt-3 text-base text-stone-600">
          <span className="font-semibold text-stone-800">Access: </span>
          {selected.accessInstructions}
        </p>
      )}
      {selected.powerSourceLocations && (
        <p className="mt-2 text-base text-stone-600">
          <span className="font-semibold text-stone-800">Power: </span>
          {selected.powerSourceLocations}
        </p>
      )}
      {selected.previousYearDesignNotes && (
        <p className="mt-2 text-base text-stone-600">
          <span className="font-semibold text-stone-800">Prior design: </span>
          {selected.previousYearDesignNotes}
        </p>
      )}
      {selected.galleryPhotos.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-3">
          {selected.galleryPhotos
            .filter((g): g is typeof g & { url: string } => Boolean(g.url))
            .map((g) => (
              <div
                key={g.id}
                className="relative aspect-video overflow-hidden rounded-lg bg-stone-100"
              >
                <Image
                  src={g.url}
                  alt={g.label || selected.propertyName}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            ))}
        </div>
      )}
    </div>
  );

  if (data.length === 1) return detail;

  return (
    <PortalSplitView
      list={
        <ul className="space-y-2 rounded-2xl border border-stone-200 bg-white p-2 shadow-sm md:max-h-[70vh] md:overflow-y-auto">
          {data.map((p) => {
            const active = p.id === selected.id;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  className={`flex w-full min-h-14 flex-col items-start rounded-xl px-3 py-3 text-left ${
                    active ? 'bg-stone-100' : 'hover:bg-stone-50'
                  }`}
                  onClick={() => setSelectedId(p.id)}
                >
                  <span className="font-semibold text-stone-900">{p.propertyName}</span>
                  <span className="mt-0.5 text-sm text-stone-500">
                    {p.city}, {p.state}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      }
      detail={detail}
    />
  );
}
