'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ChevronDown, ExternalLink, FileImage, Trash2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';
import {
  INSTALL_TYPE_OPTIONS,
  PIPELINE_COLUMNS,
  PROPOSAL_STAGE_LABELS,
  deriveProposalStage,
  formatCurrency,
  formatDate,
  formatDateTime,
  labelProposalStatus,
} from '@/lib/proposal-utils';
import { InvoiceCreateForm } from '@/components/invoices/invoice-create-form';
import {
  ProposalActivityTimeline,
  ProposalAgreementsSection,
  ProposalCustomerProperty,
  ProposalFinancialSummary,
  ProposalScheduleTerms,
  ProposalPackagesDetail,
  ProposalPricingSection,
  ProposalScopeSection,
} from './proposal-detail-sections';
import type { ProposalStatus } from '@clcrm/types';

type GeneralForm = {
  title: string;
  installType: string;
  season: string;
  status: ProposalStatus;
  salespersonName: string;
  notes: string;
  propertyPhotoUrl: string;
};

export function ProposalDetail({ proposalId }: { proposalId: string }) {
  const { toast } = useToast();
  const router = useRouter();
  const optionsRef = useRef<HTMLDivElement>(null);
  const { data, isLoading, isError, refetch } = trpc.proposals360.getById.useQuery({ proposalId });
  const { data: customer } = trpc.customer360.getBasic.useQuery(
    { customerId: data?.customerId ?? '' },
    { enabled: !!data?.customerId, staleTime: 60_000 },
  );
  const { data: propertyList } = trpc.customer360.properties.list.useQuery(
    { customerId: data?.customerId ?? '' },
    { enabled: !!data?.customerId, staleTime: 60_000 },
  );
  const { data: allMockups } = trpc.mockups360.list.useQuery(undefined, { enabled: !!data });
  const { data: allInvoices } = trpc.invoices360.list.useQuery(undefined, { enabled: !!data });

  const update = trpc.proposals360.update.useMutation({
    onSuccess: () => { toast('Proposal saved', 'success'); refetch(); },
    onError: () => toast('Could not save proposal', 'error'),
  });
  const send = trpc.proposals360.send.useMutation({
    onSuccess: () => { toast('Proposal sent', 'success'); refetch(); },
  });
  const collectDeposit = trpc.proposals360.collectDeposit.useMutation({
    onSuccess: () => { toast('Deposit recorded', 'success'); refetch(); },
  });
  const remove = trpc.proposals360.delete.useMutation({
    onSuccess: () => { toast('Proposal removed', 'success'); router.push('/app/proposals'); },
    onError: () => toast('Could not remove proposal', 'error'),
  });
  const { data: upsells } = trpc.proposals360.upsells.useQuery({ proposalId }, { enabled: !!data });

  const [form, setForm] = useState<GeneralForm | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [mockupPickerOpen, setMockupPickerOpen] = useState(false);

  useEffect(() => {
    if (!data) return;
    setForm({
      title: data.title,
      installType: data.installType ?? 'roofline',
      season: data.season ?? String(new Date().getFullYear()),
      status: data.status,
      salespersonName: data.salespersonName ?? '',
      notes: data.notes ?? '',
      propertyPhotoUrl: data.propertyPhotoUrl ?? '',
    });
  }, [data]);

  const linkedInvoices = useMemo(
    () => (allInvoices ?? []).filter((inv) => inv.proposalId === proposalId && inv.status !== 'cancelled'),
    [allInvoices, proposalId],
  );
  const linkedMockups = useMemo(
    () => (allMockups ?? []).filter((m) => data?.mockupIds?.includes(m.id)),
    [allMockups, data?.mockupIds],
  );
  const propertyMockups = useMemo(
    () => (allMockups ?? []).filter((m) => m.propertyId === data?.propertyId && !data?.mockupIds?.includes(m.id)),
    [allMockups, data?.propertyId, data?.mockupIds],
  );

  const customerName = customer?.businessName
    || (customer ? `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() : '');
  const property = propertyList?.find((p) => p.id === data?.propertyId);
  const propertyLabel = property
    ? `${property.addressLine1}, ${property.city}, ${property.state}`
    : undefined;

  const canCreateInvoice = data?.status === 'approved' && linkedInvoices.length === 0;
  const stage = data
    ? deriveProposalStage(data.status, {
        hasActiveInvoice: linkedInvoices.length > 0,
        depositPaid: data.depositStatus === 'paid',
      })
    : 'proposal';
  const portalUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/p/${data?.publicToken ?? ''}`
    : `/p/${data?.publicToken ?? ''}`;
  const dirty = form && data && (
    form.title !== data.title
    || form.installType !== (data.installType ?? 'roofline')
    || form.season !== (data.season ?? '')
    || form.status !== data.status
    || form.salespersonName !== (data.salespersonName ?? '')
    || form.notes !== (data.notes ?? '')
    || form.propertyPhotoUrl !== (data.propertyPhotoUrl ?? '')
  );

  function save() {
    if (!form) return;
    update.mutate({
      proposalId,
      data: {
        title: form.title,
        installType: form.installType as never,
        season: form.season,
        status: form.status,
        salespersonName: form.salespersonName,
        notes: form.notes,
        propertyPhotoUrl: form.propertyPhotoUrl || undefined,
      },
    });
  }

  function attachMockup(mockupId: string) {
    if (!data) return;
    const mockupIds = [...new Set([...(data.mockupIds ?? []), mockupId])];
    update.mutate({ proposalId, data: { mockupIds } }, {
      onSuccess: () => {
        toast('Mockup linked', 'success');
        setMockupPickerOpen(false);
      },
    });
  }

  function detachMockup(mockupId: string) {
    if (!data) return;
    update.mutate({
      proposalId,
      data: { mockupIds: (data.mockupIds ?? []).filter((id) => id !== mockupId) },
    }, { onSuccess: () => toast('Mockup removed', 'success') });
  }

  if (isLoading || !form) return <LoadingState message="Loading proposal..." />;
  if (isError || !data) return <ErrorState message="Proposal not found." onRetry={() => refetch()} />;

  const fileCount = (form.propertyPhotoUrl ? 1 : 0) + (data.contractUrl ? 1 : 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Link href="/app/proposals" className="btn-ghost mt-1 shrink-0 px-2" aria-label="Back to proposals">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold sm:text-2xl">
              {customerName ? `${customerName}` : 'Proposal'}
              {form.title && form.title !== customerName ? ` — ${form.title}` : ''}
            </h1>
            {propertyLabel && (
              <p className="mt-1 text-sm text-muted-foreground truncate">{propertyLabel}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative" ref={optionsRef}>
            <button
              type="button"
              className="btn-secondary inline-flex items-center gap-1"
              onClick={() => setOptionsOpen((v) => !v)}
            >
              Options
              <ChevronDown className="h-4 w-4" />
            </button>
            {optionsOpen && (
              <>
                <button type="button" className="fixed inset-0 z-40" aria-label="Close menu" onClick={() => setOptionsOpen(false)} />
                <div className="absolute right-0 z-50 mt-1 min-w-[12rem] rounded-xl border border-border bg-surface py-1 shadow-lg">
                  {['draft', 'ready_to_send', 'internal_review'].includes(data.status) && (
                    <button type="button" className="block w-full px-4 py-2 text-left text-sm hover:bg-muted" onClick={() => { send.mutate({ proposalId }); setOptionsOpen(false); }}>
                      Send to customer
                    </button>
                  )}
                  {canCreateInvoice && (
                    <button type="button" className="block w-full px-4 py-2 text-left text-sm hover:bg-muted" onClick={() => { setInvoiceOpen(true); setOptionsOpen(false); }}>
                      Create invoice
                    </button>
                  )}
                  {data.status === 'approved' && data.depositStatus !== 'paid' && (
                    <button type="button" className="block w-full px-4 py-2 text-left text-sm hover:bg-muted" onClick={() => { setDepositOpen(true); setOptionsOpen(false); }}>
                      Collect deposit
                    </button>
                  )}
                  <a href={portalUrl} target="_blank" rel="noreferrer" className="block px-4 py-2 text-sm hover:bg-muted">
                    Open customer portal
                  </a>
                  <Link href={`/app/proposals/${proposalId}/edit`} className="block px-4 py-2 text-sm hover:bg-muted" onClick={() => setOptionsOpen(false)}>
                    Full editor
                  </Link>
                  <Link href={`/app/customers/${data.customerId}`} className="block px-4 py-2 text-sm hover:bg-muted" onClick={() => setOptionsOpen(false)}>
                    View customer
                  </Link>
                </div>
              </>
            )}
          </div>
          <Link href={`/app/proposals/${proposalId}/present`} className="btn-secondary">Summary</Link>
          <button type="button" className="btn-primary" disabled={!dirty || update.isPending} onClick={save}>
            {update.isPending ? 'Saving…' : 'Save'}
          </button>
          <button type="button" className="btn border border-red-300 bg-red-600 text-white hover:bg-red-700" onClick={() => setRemoveOpen(true)}>Delete</button>
        </div>
      </div>

      {upsells && upsells.totalPotentialCents > 0 && (
        <div className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm">
          Upsell opportunity: <strong>{formatCurrency(upsells.totalPotentialCents)}</strong> — {upsells.suggestions.map((s) => s.label).join(', ')}
        </div>
      )}

      <ProposalFinancialSummary data={data} />
      <ProposalScheduleTerms data={data} />

      <ProposalCustomerProperty customer={customer} property={property} customerId={data.customerId} />

      <ProposalScopeSection
        scopeOfWork={data.scopeOfWork}
        aiScopeOfWork={data.aiScopeOfWork}
        editHref={`/app/proposals/${proposalId}/edit`}
      />

      <ProposalPricingSection data={data} editHref={`/app/proposals/${proposalId}/edit`} />

      <ProposalPackagesDetail packages={data.packages ?? []} selectedPackageId={data.selectedPackageId} />

      <ProposalAgreementsSection data={data} />

      <ProposalActivityTimeline data={data} />

      <section className="card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">General</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Name</span>
            <input className="input w-full" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Category</span>
            <select className="input w-full" value={form.installType} onChange={(e) => setForm({ ...form, installType: e.target.value })}>
              {INSTALL_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Year</span>
            <input className="input w-full" value={form.season} onChange={(e) => setForm({ ...form, season: e.target.value })} placeholder="2025" />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Stage</span>
            <div className="input flex items-center bg-muted/40 text-sm">{PROPOSAL_STAGE_LABELS[stage]}</div>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Status</span>
            <select className="input w-full" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ProposalStatus })}>
              {PIPELINE_COLUMNS.map((s) => (
                <option key={s} value={s}>{labelProposalStatus(s)}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Salesperson</span>
            <input className="input w-full" value={form.salespersonName} onChange={(e) => setForm({ ...form, salespersonName: e.target.value })} placeholder="Assign salesperson" />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Valid until</span>
            <div className="input flex items-center bg-muted/40 text-sm">{data.validUntil ? formatDate(data.validUntil) : '—'}</div>
          </label>
          {data.acceptedAt && (
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Accepted</span>
              <div className="input flex items-center bg-muted/40 text-sm">
                {formatDateTime(data.acceptedAt)}{data.acceptedByName ? ` · ${data.acceptedByName}` : ''}
              </div>
            </label>
          )}
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Portal link</span>
            <div className="input flex items-center truncate bg-muted/40 text-xs">
              <a href={portalUrl} target="_blank" rel="noreferrer" className="truncate text-primary hover:underline">{portalUrl}</a>
            </div>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Engagement</span>
            <div className="input flex items-center bg-muted/40 text-sm">
              {data.viewCount} views · Sent {data.sentAt ? formatDate(data.sentAt) : '—'}
            </div>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Updated</span>
            <div className="input flex items-center bg-muted/40 text-sm">{formatDateTime(data.updatedAt)}</div>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Created</span>
            <div className="input flex items-center bg-muted/40 text-sm">{formatDateTime(data.createdAt)}</div>
          </label>
        </div>
      </section>

      <section className="card p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Files ({fileCount})</h2>
          <Link href={`/app/proposals/${proposalId}/edit`} className="btn-secondary text-sm">Upload / manage</Link>
        </div>
        {fileCount === 0 ? (
          <EmptyState title="No files" description="Add a property photo or generate a contract in the full editor." />
        ) : (
          <ul className="mt-4 space-y-3">
            {form.propertyPhotoUrl && (
              <li className="flex items-center gap-4 rounded-lg border border-border p-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.propertyPhotoUrl} alt="Property" className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">Property photo</p>
                  <p className="truncate text-xs text-muted-foreground">Included on proposal</p>
                </div>
                <a href={form.propertyPhotoUrl} target="_blank" rel="noreferrer" className="btn-ghost px-2" aria-label="Open photo">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </li>
            )}
            {data.contractUrl && (
              <li className="flex items-center gap-4 rounded-lg border border-border p-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-muted">
                  <FileImage className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">Contract</p>
                  <p className="text-xs text-muted-foreground">
                    Generated {data.contractGeneratedAt ? formatDateTime(data.contractGeneratedAt) : '—'}
                  </p>
                </div>
                <a href={data.contractUrl} target="_blank" rel="noreferrer" className="btn-secondary text-sm">Open</a>
              </li>
            )}
          </ul>
        )}
        <label className="mt-4 block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Property photo URL</span>
          <input
            className="input w-full"
            value={form.propertyPhotoUrl}
            onChange={(e) => setForm({ ...form, propertyPhotoUrl: e.target.value })}
            placeholder="https://..."
          />
        </label>
      </section>

      <section className="card p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Mockups ({linkedMockups.length})</h2>
          <button type="button" className="btn-secondary text-sm" onClick={() => setMockupPickerOpen((v) => !v)}>
            {mockupPickerOpen ? 'Cancel' : 'Link mockup'}
          </button>
        </div>
        {mockupPickerOpen && (
          <div className="mt-4 rounded-lg border border-border bg-muted/20 p-4">
            {propertyMockups.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No mockups for this property.{' '}
                <Link href="/app/mockups/new" className="text-primary hover:underline">Create one</Link>
              </p>
            ) : (
              <ul className="space-y-2">
                {propertyMockups.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 text-sm">
                    <span>{m.name}</span>
                    <button type="button" className="btn-primary px-3 py-1 text-xs" onClick={() => attachMockup(m.id)}>Add</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {linkedMockups.length === 0 ? (
          <EmptyState title="No mockups" description="Link a design mockup to include it on the customer proposal." />
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {linkedMockups.map((m) => (
              <li key={m.id} className="overflow-hidden rounded-lg border border-border">
                <Link href={`/app/mockups/${m.id}`} className="block">
                  <div className="aspect-video bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={m.thumbnailUrl ?? m.renderedImageUrl ?? m.imageUrl}
                      alt={m.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 p-3">
                    <span className="truncate text-sm font-medium">{m.name}</span>
                    <button
                      type="button"
                      className="btn-ghost shrink-0 px-2 text-destructive"
                      aria-label="Remove mockup"
                      onClick={(e) => { e.preventDefault(); detachMockup(m.id); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Notes</h2>
        <textarea
          className="input mt-4 min-h-[120px] w-full"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Internal notes about this proposal..."
        />
      </section>

      {linkedInvoices.length > 0 && (
        <section className="card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Invoices</h2>
          <div className="mt-4 space-y-2">
            {linkedInvoices.map((inv) => (
              <Link
                key={inv.id}
                href={`/app/invoices/${inv.id}`}
                className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm hover:border-primary/40"
              >
                <span className="font-medium text-primary">{inv.invoiceNumber}</span>
                <span className="capitalize text-muted-foreground">{inv.status.replace(/_/g, ' ')} · {formatCurrency(inv.balanceDueCents)} due</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {invoiceOpen && (
        <InvoiceCreateForm
          defaultProposalId={proposalId}
          defaultSubtotalCents={data.subtotalCents}
          defaultDepositPercent={data.depositPercent}
          onCancel={() => setInvoiceOpen(false)}
          onSuccess={() => setInvoiceOpen(false)}
        />
      )}

      <ConfirmDialog
        open={depositOpen}
        title="Record deposit payment?"
        message="This marks the deposit as paid (Stripe/Square integration placeholder)."
        confirmLabel="Mark paid"
        onCancel={() => setDepositOpen(false)}
        onConfirm={() => { collectDeposit.mutate({ proposalId }); setDepositOpen(false); }}
        loading={collectDeposit.isPending}
      />
      <ConfirmDialog
        open={removeOpen}
        title="Remove proposal?"
        message={`This removes "${data.title}" and any linked draft job from the system.`}
        confirmLabel="Remove proposal"
        destructive
        onCancel={() => setRemoveOpen(false)}
        onConfirm={() => remove.mutate({ proposalId })}
        loading={remove.isPending}
      />
    </div>
  );
}
