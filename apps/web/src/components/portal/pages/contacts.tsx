'use client';

import { trpc } from '@/lib/trpc';
import { portalAppPath, portalSessionInput } from '@/lib/portal-paths';
import { formatPortalStatusLabel } from '@clcrm/types';
import { PortalAuthedFrame } from '@/components/portal/portal-shell';
import { LoadingState } from '@/components/ui/states';

export function PortalContactsPage() {
  return (
    <PortalAuthedFrame title="Contacts">
      {({ enabledFeatures }) => <ContactsBody />}
    </PortalAuthedFrame>
  );
}

function ContactsBody() {
  const { data, isLoading, isError } = trpc.portal360.public.contacts.useQuery(portalSessionInput);
  if (isLoading) return <LoadingState message="Loading contacts..." />;
  if (isError) return <p className="text-sm text-red-600">Could not load contacts.</p>;
  if (!data?.length) {
    return (
      <p className="rounded-2xl border border-stone-200 bg-white p-6 text-sm text-stone-600">
        No contacts on file yet. Your lighting company manages these records.
      </p>
    );
  }
  return (
    <ul className="space-y-3">
      {data.map((c) => (
        <li key={c.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-stone-900">
                {c.firstName} {c.lastName}
                {c.isPrimary ? (
                  <span className="ml-2 text-xs font-medium text-stone-500">Primary</span>
                ) : null}
              </p>
              {(c.role || c.title) && (
                <p className="mt-1 text-sm capitalize text-stone-500">
                  {[c.role ? formatPortalStatusLabel(c.role) : null, c.title].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          </div>
          <div className="mt-3 space-y-1 text-sm text-stone-700">
            {c.email && <p>{c.email}</p>}
            {c.phone && <p>{c.phone}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}
