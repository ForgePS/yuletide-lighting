'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { portalAppPath, portalSessionInput } from '@/lib/portal-paths';
import { formatDate } from '@clcrm/ui';
import { PortalAuthedFrame } from '@/components/portal/portal-shell';
import { PortalSplitView, PortalStatusPill } from '@/components/portal/portal-mobile';
import { LoadingState } from '@/components/ui/states';

export function PortalDocumentsPage() {
  return (
    <PortalAuthedFrame title="Documents" feature="documents">
      {({ enabledFeatures }) => <DocumentsBody />}
    </PortalAuthedFrame>
  );
}

function DocumentsBody() {
  const { data, isLoading, isError } = trpc.portal360.public.documents.useQuery(portalSessionInput);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (isLoading) return <LoadingState message="Loading documents..." />;
  if (isError) return <p className="text-base text-red-600">Could not load documents.</p>;
  if (!data?.length) {
    return (
      <p className="rounded-2xl border border-stone-200 bg-white p-6 text-base text-stone-600">
        No shared documents yet.
      </p>
    );
  }

  const selected = data.find((d) => d.id === selectedId) ?? data[0]!;

  return (
    <PortalSplitView
      list={
        <ul className="space-y-2 rounded-2xl border border-stone-200 bg-white p-2 shadow-sm md:max-h-[70vh] md:overflow-y-auto">
          {data.map((doc) => {
            const active = doc.id === selected.id;
            return (
              <li key={doc.id}>
                <button
                  type="button"
                  className={`flex w-full min-h-14 flex-col items-start rounded-xl px-3 py-3 text-left ${
                    active ? 'bg-stone-100' : 'hover:bg-stone-50'
                  }`}
                  onClick={() => setSelectedId(doc.id)}
                >
                  <span className="font-semibold text-stone-900">{doc.title}</span>
                  <span className="mt-0.5 text-sm capitalize text-stone-500">{doc.category}</span>
                </button>
              </li>
            );
          })}
        </ul>
      }
      detail={
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm md:min-h-[20rem]">
          <PortalStatusPill>{selected.category}</PortalStatusPill>
          <h3 className="mt-3 text-xl font-bold text-stone-900">{selected.title}</h3>
          <p className="mt-2 text-base text-stone-600">Shared {formatDate(selected.createdAt)}</p>
          {selected.url ? (
            <a
              href={selected.url}
              target="_blank"
              rel="noreferrer"
              className="btn-primary mt-5 inline-flex min-h-11 w-full items-center justify-center text-base md:w-auto"
            >
              Open document
            </a>
          ) : (
            <p className="mt-4 text-base text-stone-500">
              No file link available — contact your lighting company.
            </p>
          )}
          {selected.url && /\.(png|jpe?g|gif|webp)(\?|$)/i.test(selected.url) && (
            <div className="mt-5 overflow-hidden rounded-xl border border-stone-100 bg-stone-50">
              {/* preview for image docs on tablet/desktop */}
              <img
                src={selected.url}
                alt=""
                className="mx-auto max-h-[28rem] w-auto object-contain"
              />
            </div>
          )}
        </div>
      }
    />
  );
}
