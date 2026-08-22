'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Plus, Search, Upload, FileText, ExternalLink, Send, Copy, Link2 } from 'lucide-react';
import type { MultiYearAgreement, MultiYearAgreementStatus } from '@clcrm/types';
import { formatAgreementStatusLabel, isAgreementSignedStatus } from '@clcrm/types';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';

const STATUS_OPTIONS: Array<{ value: MultiYearAgreementStatus | ''; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'awaiting_signature', label: 'Awaiting signature' },
  { value: 'signed', label: 'Signed' },
  { value: 'active', label: 'Active' },
  { value: 'renewal_due', label: 'Renewal due' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100);
}

function statusClass(status: MultiYearAgreementStatus | string | null | undefined) {
  if (status === 'active' || status === 'signed') return 'bg-emerald-500/10 text-emerald-700';
  if (status === 'awaiting_signature') return 'bg-sky-500/10 text-sky-700';
  if (status === 'renewal_due') return 'bg-amber-500/10 text-amber-700';
  if (status === 'cancelled') return 'bg-red-500/10 text-red-700';
  return 'bg-muted text-muted-foreground';
}

function publicAgreementUrl(token: string) {
  if (typeof window === 'undefined') return `/a/${token}`;
  return `${window.location.origin}/a/${token}`;
}

async function uploadAgreementFile(file: File) {
  const form = new FormData();
  form.append('file', file);
  form.append('folder', 'agreements');
  const res = await fetch('/api/upload', { method: 'POST', body: form, credentials: 'include' });
  const data = (await res.json()) as { url?: string; path?: string; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Upload failed');
  return (data.url ?? data.path) as string;
}

function AgreementForm({ onCancel, onSaved }: { onCancel: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const year = new Date().getFullYear();
  const { data: customers } = trpc.customer360.list.useQuery({ page: 1, pageSize: 100, enrich: 'none' });
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [title, setTitle] = useState(`${year} Holiday Lighting Agreement`);
  const [optionCode, setOptionCode] = useState('A');
  const [optionLabel, setOptionLabel] = useState('3 Year');
  const [startSeason, setStartSeason] = useState(year);
  const [endSeason, setEndSeason] = useState(year + 2);
  const [annualValue, setAnnualValue] = useState('');
  const create = trpc.agreements360.create.useMutation({
    onSuccess: () => {
      toast('Agreement added', 'success');
      onSaved();
    },
    onError: (error) => toast(error.message || 'Could not add agreement', 'error'),
  });

  const selectedCustomerName = useMemo(() => {
    const customer = customers?.items.find((item) => item.id === customerId);
    if (!customer) return customerName;
    return customer.businessName || `${customer.firstName} ${customer.lastName}`.trim();
  }, [customerId, customerName, customers?.items]);

  return (
    <form
      className="card mt-4 grid gap-4 p-4 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        create.mutate({
          customerId,
          customerName: selectedCustomerName,
          propertyId: '',
          propertyLabel: '',
          title,
          status: 'draft',
          optionCode,
          optionLabel,
          startSeason,
          endSeason,
          annualValueCents: Math.round((Number(annualValue) || 0) * 100),
          depositPercent: 50,
          autoGenerateProjects: true,
          linkedProjectIds: [],
          notes: '',
          source: 'manual',
          signedAt: null,
          cancelledAt: null,
          nextRenewalDate: new Date(`${endSeason}-08-01T12:00:00`),
        });
      }}
    >
      <select
        className="input"
        value={customerId}
        onChange={(event) => {
          const value = event.target.value;
          setCustomerId(value);
          const customer = customers?.items.find((item) => item.id === value);
          setCustomerName(customer?.businessName || (customer ? `${customer.firstName} ${customer.lastName}` : ''));
        }}
      >
        <option value="">Select linked customer</option>
        {customers?.items.map((customer) => (
          <option key={customer.id} value={customer.id}>
            {customer.businessName || `${customer.firstName} ${customer.lastName}`}
          </option>
        ))}
      </select>
      <input className="input" placeholder="Customer name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
      <input className="input md:col-span-2" placeholder="Agreement title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <input className="input" placeholder="Option code (A-E)" value={optionCode} onChange={(e) => setOptionCode(e.target.value)} required />
      <input className="input" placeholder="Option label" value={optionLabel} onChange={(e) => setOptionLabel(e.target.value)} required />
      <input className="input" type="number" placeholder="Start season" value={startSeason} onChange={(e) => setStartSeason(Number(e.target.value))} required />
      <input className="input" type="number" placeholder="End season" value={endSeason} onChange={(e) => setEndSeason(Number(e.target.value))} required />
      <input className="input md:col-span-2" type="number" min="0" step="0.01" placeholder="Annual value" value={annualValue} onChange={(e) => setAnnualValue(e.target.value)} />
      <div className="flex gap-2 md:col-span-2">
        <button type="submit" className="btn-primary" disabled={create.isPending}>
          {create.isPending ? 'Saving...' : 'Save agreement'}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function ImportExistingAgreementForm({ onCancel, onSaved }: { onCancel: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const year = new Date().getFullYear();
  const { data: customers } = trpc.customer360.list.useQuery({ page: 1, pageSize: 100, enrich: 'none' });
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [title, setTitle] = useState(`${year} Holiday Lighting Agreement`);
  const [optionCode, setOptionCode] = useState('A');
  const [optionLabel, setOptionLabel] = useState('Imported agreement');
  const [startSeason, setStartSeason] = useState(year);
  const [endSeason, setEndSeason] = useState(year + 2);
  const [annualValue, setAnnualValue] = useState('');
  const [signedDate, setSignedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const createAgreement = trpc.agreements360.create.useMutation();
  const createDocument = trpc.customer360.documents.create.useMutation();

  const selectedCustomerName = useMemo(() => {
    if (!customerId) return customerName.trim() || 'Unassigned';
    const customer = customers?.items.find((item) => item.id === customerId);
    if (!customer) return customerName.trim() || 'Unassigned';
    return customer.businessName || `${customer.firstName} ${customer.lastName}`.trim();
  }, [customerId, customerName, customers?.items]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!file) {
      toast('Choose the signed agreement file to upload', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const signedDocumentUrl = await uploadAgreementFile(file);
      const signedAt = signedDate ? new Date(`${signedDate}T12:00:00`) : new Date();
      const agreement = await createAgreement.mutateAsync({
        customerId: customerId || '',
        customerName: selectedCustomerName,
        propertyId: '',
        propertyLabel: '',
        title,
        status: 'active',
        optionCode,
        optionLabel,
        startSeason,
        endSeason,
        annualValueCents: Math.round((Number(annualValue) || 0) * 100),
        depositPercent: 50,
        autoGenerateProjects: true,
        linkedProjectIds: [],
        notes: `Imported from existing file: ${file.name}`,
        source: 'imported',
        signedDocumentUrl,
        signedAt,
        cancelledAt: null,
        nextRenewalDate: new Date(`${endSeason}-08-01T12:00:00`),
      });
      if (customerId) {
        await createDocument.mutateAsync({
          customerId,
          title,
          category: 'agreement',
          url: signedDocumentUrl,
          notes: `Linked to agreement ${agreement.id}`,
          relatedRecordType: 'agreement',
          relatedRecordId: agreement.id,
        });
      }
      toast(customerId ? 'Agreement imported' : 'Agreement uploaded — assign a customer when ready', 'success');
      onSaved();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not import agreement', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card mt-4 grid gap-4 p-4 md:grid-cols-2" onSubmit={(e) => void handleSubmit(e)}>
      <div className="md:col-span-2">
        <h2 className="font-semibold">Import existing agreement</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a signed PDF now. Customer is optional — you can assign it later from Agreements or the customer Sales tab.
        </p>
      </div>
      <select
        className="input"
        value={customerId}
        onChange={(event) => {
          const value = event.target.value;
          setCustomerId(value);
          const customer = customers?.items.find((item) => item.id === value);
          setCustomerName(customer?.businessName || (customer ? `${customer.firstName} ${customer.lastName}` : ''));
        }}
      >
        <option value="">No customer yet (assign later)</option>
        {customers?.items.map((customer) => (
          <option key={customer.id} value={customer.id}>
            {customer.businessName || `${customer.firstName} ${customer.lastName}`}
          </option>
        ))}
      </select>
      <input
        className="input"
        placeholder="Customer name (optional)"
        value={customerName}
        onChange={(e) => setCustomerName(e.target.value)}
      />
      <input className="input md:col-span-2" placeholder="Agreement title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <input className="input" placeholder="Option code (A-E)" value={optionCode} onChange={(e) => setOptionCode(e.target.value)} required />
      <input className="input" placeholder="Option label" value={optionLabel} onChange={(e) => setOptionLabel(e.target.value)} required />
      <input className="input" type="number" placeholder="Start season" value={startSeason} onChange={(e) => setStartSeason(Number(e.target.value))} required />
      <input className="input" type="number" placeholder="End season" value={endSeason} onChange={(e) => setEndSeason(Number(e.target.value))} required />
      <input className="input" type="number" min="0" step="0.01" placeholder="Annual value" value={annualValue} onChange={(e) => setAnnualValue(e.target.value)} />
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-muted-foreground">Signed date</span>
        <input className="input" type="date" value={signedDate} onChange={(e) => setSignedDate(e.target.value)} />
      </label>
      <label className="block text-sm md:col-span-2">
        <span className="mb-1 block font-medium text-muted-foreground">Signed agreement file</span>
        <input
          className="input"
          type="file"
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
          required
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        {file ? <p className="mt-1 text-xs text-muted-foreground">{file.name}</p> : null}
      </label>
      <div className="flex gap-2 md:col-span-2">
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Importing...' : 'Import agreement'}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function AssignCustomerControl({
  agreement,
  onAssigned,
}: {
  agreement: MultiYearAgreement;
  onAssigned: () => void;
}) {
  const { toast } = useToast();
  const { data: customers } = trpc.customer360.list.useQuery({ page: 1, pageSize: 100, enrich: 'none' });
  const [customerId, setCustomerId] = useState('');
  const [open, setOpen] = useState(false);
  const update = trpc.agreements360.update.useMutation();
  const createDocument = trpc.customer360.documents.create.useMutation();

  if (agreement.customerId) return null;

  async function assign() {
    if (!customerId) {
      toast('Select a customer', 'error');
      return;
    }
    const customer = customers?.items.find((item) => item.id === customerId);
    const name =
      customer?.businessName ||
      (customer ? `${customer.firstName} ${customer.lastName}`.trim() : '') ||
      'Customer';
    try {
      await update.mutateAsync({
        agreementId: agreement.id,
        data: { customerId, customerName: name },
      });
      if (agreement.signedDocumentUrl) {
        await createDocument.mutateAsync({
          customerId,
          title: agreement.title,
          category: 'agreement',
          url: agreement.signedDocumentUrl,
          notes: `Linked to agreement ${agreement.id}`,
          relatedRecordType: 'agreement',
          relatedRecordId: agreement.id,
        });
      }
      toast('Agreement assigned to customer', 'success');
      setOpen(false);
      onAssigned();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not assign agreement', 'error');
    }
  }

  if (!open) {
    return (
      <button type="button" className="text-sm font-medium text-primary hover:underline" onClick={() => setOpen(true)}>
        Assign
      </button>
    );
  }

  return (
    <div className="flex min-w-[200px] flex-col gap-2">
      <select className="input text-sm" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
        <option value="">Select customer</option>
        {customers?.items.map((customer) => (
          <option key={customer.id} value={customer.id}>
            {customer.businessName || `${customer.firstName} ${customer.lastName}`}
          </option>
        ))}
      </select>
      <div className="flex gap-1">
        <button type="button" className="btn-primary px-2 py-1 text-xs" disabled={update.isPending} onClick={() => void assign()}>
          Save
        </button>
        <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function AgreementActions({
  agreement,
  onChanged,
}: {
  agreement: MultiYearAgreement;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const send = trpc.agreements360.sendForSignature.useMutation({
    onSuccess: async (updated) => {
      toast('Sent for signature', 'success');
      const token = updated?.publicToken;
      if (token) {
        try {
          await navigator.clipboard.writeText(publicAgreementUrl(token));
          toast('Signing link copied', 'success');
        } catch {
          /* clipboard optional */
        }
      }
      await utils.agreements360.list.invalidate();
      onChanged();
    },
    onError: (error) => toast(error.message || 'Could not send for signature', 'error'),
  });

  const canSend =
    !isAgreementSignedStatus(agreement.status) &&
    agreement.status !== 'completed' &&
    agreement.status !== 'cancelled';

  async function copyLink() {
    const token = agreement.publicToken?.trim();
    if (!token) {
      toast('No signing link yet — send for signature first', 'error');
      return;
    }
    try {
      await navigator.clipboard.writeText(publicAgreementUrl(token));
      toast('Signing link copied', 'success');
    } catch {
      toast('Could not copy link', 'error');
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {canSend && (
        <button
          type="button"
          className="btn-secondary px-2 py-1 text-xs"
          disabled={send.isPending}
          onClick={() => send.mutate({ agreementId: agreement.id })}
        >
          <Send className="h-3.5 w-3.5" />
          {agreement.status === 'awaiting_signature' ? 'Resend' : 'Send for signature'}
        </button>
      )}
      {(agreement.publicToken || agreement.status === 'awaiting_signature') && (
        <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={() => void copyLink()}>
          <Copy className="h-3.5 w-3.5" />
          Copy link
        </button>
      )}
      {agreement.publicToken && (
        <a
          href={publicAgreementUrl(agreement.publicToken)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary px-2 py-1 text-xs"
        >
          <Link2 className="h-3.5 w-3.5" />
          Open
        </a>
      )}
      <AssignCustomerControl agreement={agreement} onAssigned={onChanged} />
    </div>
  );
}

function AgreementsTable({
  agreements,
  onChanged,
}: {
  agreements: MultiYearAgreement[];
  onChanged: () => void;
}) {
  if (agreements.length === 0) {
    return (
      <EmptyState
        title="No agreements found"
        description="Create or import multi-year agreements to track renewals, linked seasonal projects, and future revenue."
        icon={FileText}
      />
    );
  }

  return (
    <div className="card overflow-hidden">
      <table className="data-table">
        <thead>
          <tr>
            <th>Agreement</th>
            <th>Customer</th>
            <th>Status</th>
            <th>Term</th>
            <th>Annual</th>
            <th>Total</th>
            <th>Projects</th>
            <th>File</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {agreements.map((agreement) => (
            <tr key={agreement.id}>
              <td>
                <p className="font-medium">{agreement.title}</p>
                <p className="text-xs text-muted-foreground">{agreement.optionCode} · {agreement.optionLabel}</p>
              </td>
              <td>
                {agreement.customerId ? (
                  <Link href={`/app/customers/${agreement.customerId}`} className="text-primary hover:underline">
                    {agreement.customerName}
                  </Link>
                ) : (
                  <span className="text-amber-700">{agreement.customerName || 'Unassigned'}</span>
                )}
              </td>
              <td>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(agreement.status)}`}>
                  {formatAgreementStatusLabel(agreement.status)}
                </span>
              </td>
              <td className="text-muted-foreground">{agreement.startSeason}-{agreement.endSeason}</td>
              <td>{formatCurrency(agreement.annualValueCents)}</td>
              <td>{formatCurrency(agreement.totalValueCents)}</td>
              <td className="text-muted-foreground">{agreement.linkedProjectIds?.length ?? 0}</td>
              <td>
                {agreement.signedDocumentUrl ? (
                  <a
                    href={agreement.signedDocumentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    View file
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td>
                <AgreementActions agreement={agreement} onChanged={onChanged} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AgreementsListPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<MultiYearAgreementStatus | ''>('');
  const [mode, setMode] = useState<'none' | 'create' | 'import'>('none');
  const { data, isLoading, isError, refetch } = trpc.agreements360.list.useQuery(
    { page: 1, pageSize: 100, search: search || undefined, status: status || undefined },
    { staleTime: 30_000, retry: 1 },
  );

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="page-header mb-0">
          <h1 className="page-title">Agreements</h1>
          <p className="page-subtitle">{data?.total ?? 0} multi-year agreements</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setMode(mode === 'import' ? 'none' : 'import')}
          >
            <Upload className="h-4 w-4" />
            Import existing
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setMode(mode === 'create' ? 'none' : 'create')}
          >
            <Plus className="h-4 w-4" />
            New agreement
          </button>
        </div>
      </div>

      {mode === 'create' && (
        <AgreementForm
          onCancel={() => setMode('none')}
          onSaved={() => {
            setMode('none');
            void refetch();
          }}
        />
      )}
      {mode === 'import' && (
        <ImportExistingAgreementForm
          onCancel={() => setMode('none')}
          onSaved={() => {
            setMode('none');
            void refetch();
          }}
        />
      )}

      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search agreement, customer, option..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <select className="input max-w-xs" value={status} onChange={(e) => setStatus(e.target.value as MultiYearAgreementStatus | '')}>
          {STATUS_OPTIONS.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
        </select>
      </div>

      <div className="mt-6">
        {isLoading && <LoadingState message="Loading agreements..." />}
        {isError && <ErrorState message="Could not load agreements." onRetry={() => refetch()} />}
        {!isLoading && !isError && (
          <AgreementsTable agreements={data?.items ?? []} onChanged={() => void refetch()} />
        )}
      </div>
    </div>
  );
}
