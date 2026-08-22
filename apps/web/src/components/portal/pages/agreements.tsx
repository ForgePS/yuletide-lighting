'use client';

import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { portalAppPath, portalSessionInput } from '@/lib/portal-paths';
import { formatPortalStatusLabel } from '@clcrm/types';
import { formatCurrency, formatDate } from '@clcrm/ui';
import { PortalAuthedFrame } from '@/components/portal/portal-shell';
import { PortalResponsiveTable, PortalStatusPill } from '@/components/portal/portal-mobile';
import { LoadingState } from '@/components/ui/states';

export function PortalAgreementsPage() {
  return (
    <PortalAuthedFrame title="Agreements" feature="agreements">
      {({ enabledFeatures }) => <AgreementsBody />}
    </PortalAuthedFrame>
  );
}

function AgreementsBody() {
  const { data, isLoading, isError } =
    trpc.portal360.public.agreements.useQuery(portalSessionInput);
  if (isLoading) return <LoadingState message="Loading agreements..." />;
  if (isError) return <p className="text-base text-red-600">Could not load agreements.</p>;
  if (!data?.length) {
    return (
      <p className="rounded-2xl border border-stone-200 bg-white p-6 text-base text-stone-600">
        No agreements yet.
      </p>
    );
  }

  return (
    <PortalResponsiveTable
      rows={data}
      columns={[
        {
          key: 'title',
          header: 'Agreement',
          cell: (a) => (
            <div>
              <p className="font-semibold">{a.title}</p>
              <p className="text-sm text-stone-500">{a.optionLabel || a.optionCode}</p>
            </div>
          ),
        },
        {
          key: 'season',
          header: 'Seasons',
          cell: (a) => `${a.startSeason}–${a.endSeason}`,
        },
        {
          key: 'value',
          header: 'Annual',
          cell: (a) => formatCurrency(a.annualValueCents ?? 0),
        },
        {
          key: 'status',
          header: 'Status',
          cell: (a) => <PortalStatusPill>{formatPortalStatusLabel(a.status)}</PortalStatusPill>,
        },
        {
          key: 'action',
          header: '',
          className: 'text-right',
          cell: (a) => {
            if (a.publicToken && ['awaiting_signature', 'sent', 'draft'].includes(a.status)) {
              return (
                <Link href={`/a/${a.publicToken}`} className="btn-primary text-sm">
                  Sign
                </Link>
              );
            }
            if (a.signedDocumentUrl) {
              return (
                <a
                  href={a.signedDocumentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary text-sm"
                >
                  PDF
                </a>
              );
            }
            if (a.publicToken) {
              return (
                <Link href={`/a/${a.publicToken}`} className="btn-secondary text-sm">
                  View
                </Link>
              );
            }
            return null;
          },
        },
      ]}
      mobileCard={(a) => (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-stone-900">{a.title}</p>
              <p className="mt-1 text-base text-stone-500">
                {a.optionLabel || a.optionCode} · {a.startSeason}–{a.endSeason}
              </p>
              {a.propertyLabel && <p className="text-sm text-stone-400">{a.propertyLabel}</p>}
              <p className="mt-2 text-base text-stone-700">
                {formatCurrency(a.annualValueCents ?? 0)}/yr
              </p>
              {a.signedAt && (
                <p className="mt-1 text-sm text-stone-500">
                  Signed {formatDate(a.signedAt)}
                  {a.signedByName ? ` by ${a.signedByName}` : ''}
                </p>
              )}
            </div>
            <PortalStatusPill>{formatPortalStatusLabel(a.status)}</PortalStatusPill>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {a.publicToken && ['awaiting_signature', 'sent', 'draft'].includes(a.status) && (
              <Link
                href={`/a/${a.publicToken}`}
                className="btn-primary inline-flex min-h-11 items-center justify-center text-base"
              >
                Review & sign
              </Link>
            )}
            {a.signedDocumentUrl && (
              <a
                href={a.signedDocumentUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary inline-flex min-h-11 items-center justify-center text-base"
              >
                View PDF
              </a>
            )}
            {a.publicToken && !['awaiting_signature', 'sent', 'draft'].includes(a.status) && (
              <Link
                href={`/a/${a.publicToken}`}
                className="btn-secondary inline-flex min-h-11 items-center justify-center text-base"
              >
                View
              </Link>
            )}
          </div>
        </div>
      )}
    />
  );
}
