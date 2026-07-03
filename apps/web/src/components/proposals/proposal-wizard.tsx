'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { PillSelect } from '@/components/ui/pill-select';
import { INSTALL_TYPE_OPTIONS } from '@/lib/proposal-utils';

const STEPS = ['Customer', 'Project', 'Design', 'Scope & pricing'];

export function ProposalWizard({ proposalId, initial }: { proposalId?: string; initial?: Record<string, unknown> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillCustomerId = searchParams.get('customerId') ?? '';
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    customerId: prefillCustomerId || String(initial?.customerId ?? ''),
    propertyId: String(initial?.propertyId ?? ''),
    title: String(initial?.title ?? ''),
    salespersonName: String(initial?.salespersonName ?? ''),
    installType: String(initial?.installType ?? 'roofline'),
    season: String(new Date().getFullYear()),
    scopeOfWork: String(initial?.scopeOfWork ?? ''),
    designId: '',
    propertyPhotoUrl: '',
    mockupIds: [] as string[],
    linearFootage: 100,
    treeWrapCount: 0,
    laborHours: 8,
    financingOption: 'deposit_50',
    depositPercent: 50,
    notes: '',
  });

  const [customerSearch, setCustomerSearch] = useState('');

  const { data: customers, isLoading: customersLoading } = trpc.customer360.list.useQuery(
    { page: 1, pageSize: 50, search: customerSearch || undefined, enrich: 'none' },
    { staleTime: 60_000 },
  );
  const { data: properties, isLoading: propertiesLoading } = trpc.customer360.properties.list.useQuery(
    { customerId: form.customerId },
    { enabled: !!form.customerId, staleTime: 30_000 },
  );
  const create = trpc.proposals360.create.useMutation();
  const update = trpc.proposals360.update.useMutation();

  const propertyOptions = properties ?? [];

  async function submit() {
    const pricing = {
      linearFootage: form.linearFootage,
      treeWrapCount: form.treeWrapCount,
      garlandLengthFt: 0,
      wreathCount: 0,
      specialtyDecorCount: 0,
      laborHours: form.laborHours,
      equipmentChargeCents: 0,
      travelChargeCents: 0,
      materialCostCents: 0,
      laborCostCents: 0,
    };
    const payload = {
      customerId: form.customerId,
      propertyId: form.propertyId,
      title: form.title,
      salespersonName: form.salespersonName,
      installType: form.installType as never,
      season: form.season,
      scopeOfWork: form.scopeOfWork,
      designId: form.designId || undefined,
      propertyPhotoUrl: form.propertyPhotoUrl || undefined,
      mockupIds: form.mockupIds,
      pricing,
      financingOption: form.financingOption as never,
      depositPercent: form.depositPercent,
      notes: form.notes || undefined,
    };
    try {
      if (proposalId) {
        await update.mutateAsync({ proposalId, data: payload });
        toast('Proposal updated', 'success');
        router.push(`/app/proposals/${proposalId}`);
      } else {
        const result = await create.mutateAsync(payload);
        toast('Proposal created', 'success');
        router.push(`/app/proposals/${result?.id}`);
      }
    } catch {
      toast('Could not save proposal', 'error');
    }
  }

  return (
    <div className="space-y-6">
      <PillSelect
        label="Wizard step"
        value={String(step)}
        onChange={(value) => setStep(Number(value))}
        options={STEPS.map((label, i) => ({ value: String(i), label: `${i + 1}. ${label}` }))}
        className="max-w-sm"
      />

      <div className="card p-6">
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="font-semibold">Select customer & property</h2>
            <input
              type="search"
              placeholder="Search customers by name, email, or phone..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="input"
            />
            <select
              required
              value={form.customerId}
              onChange={(e) => setForm({ ...form, customerId: e.target.value, propertyId: '' })}
              className="input"
              disabled={customersLoading}
            >
              <option value="">{customersLoading ? 'Loading customers...' : 'Select customer...'}</option>
              {customers?.items.map((c) => (
                <option key={c.id} value={c.id}>{c.businessName || `${c.firstName} ${c.lastName}`}</option>
              ))}
            </select>
            <select
              required
              value={form.propertyId}
              onChange={(e) => setForm({ ...form, propertyId: e.target.value })}
              className="input"
              disabled={!form.customerId || propertiesLoading}
            >
              <option value="">
                {!form.customerId ? 'Select a customer first' : propertiesLoading ? 'Loading properties...' : 'Select property...'}
              </option>
              {propertyOptions.map((p) => (
                <option key={p.id} value={p.id}>{p.propertyName ?? p.label} — {p.addressLine1}</option>
              ))}
            </select>
            <Link href="/app/customers/new" className="text-sm text-primary hover:underline">+ Create new customer</Link>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <h2 className="font-semibold sm:col-span-2">Project information</h2>
            <input required placeholder="Proposal name *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input sm:col-span-2" />
            <input placeholder="Salesperson" value={form.salespersonName} onChange={(e) => setForm({ ...form, salespersonName: e.target.value })} className="input" />
            <select value={form.installType} onChange={(e) => setForm({ ...form, installType: e.target.value })} className="input">
              {INSTALL_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <input placeholder="Season" value={form.season} onChange={(e) => setForm({ ...form, season: e.target.value })} className="input" />
            <select value={form.financingOption} onChange={(e) => setForm({ ...form, financingOption: e.target.value })} className="input">
              <option value="full_payment">Full payment</option>
              <option value="deposit_50">50% deposit</option>
              <option value="monthly">Monthly payments</option>
              <option value="financing_partner">Financing partner</option>
            </select>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-semibold">Design selection</h2>
            <input placeholder="Property photo URL" value={form.propertyPhotoUrl} onChange={(e) => setForm({ ...form, propertyPhotoUrl: e.target.value })} className="input" />
            <input placeholder="Design / mockup ID (optional)" value={form.designId} onChange={(e) => setForm({ ...form, designId: e.target.value })} className="input" />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">Before photo preview</div>
              <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">Mockup / after preview</div>
            </div>
            <p className="text-xs text-muted-foreground">Attach designs from customer profile or upload new mockups via the Mockups module.</p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-semibold">Scope of work & pricing</h2>
            <textarea
              className="input min-h-[160px]"
              placeholder="Scope of work — roofline lighting, tree wrapping, timer setup, removal, storage..."
              value={form.scopeOfWork}
              onChange={(e) => setForm({ ...form, scopeOfWork: e.target.value })}
            />
            <button type="button" className="btn-secondary text-sm" onClick={() => setForm({ ...form, scopeOfWork: 'Roofline C9 warm white, timer setup, professional installation, season takedown and storage included.' })}>
              AI generate scope (mock)
            </button>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="text-sm">Linear footage<input type="number" value={form.linearFootage} onChange={(e) => setForm({ ...form, linearFootage: Number(e.target.value) })} className="input mt-1" /></label>
              <label className="text-sm">Tree wraps<input type="number" value={form.treeWrapCount} onChange={(e) => setForm({ ...form, treeWrapCount: Number(e.target.value) })} className="input mt-1" /></label>
              <label className="text-sm">Labor hours<input type="number" value={form.laborHours} onChange={(e) => setForm({ ...form, laborHours: Number(e.target.value) })} className="input mt-1" /></label>
            </div>
            <p className="text-sm text-muted-foreground">Good / Better / Best packages will be auto-created from pricing inputs.</p>
            <label className="text-sm">Deposit %<input type="number" min={0} max={100} value={form.depositPercent} onChange={(e) => setForm({ ...form, depositPercent: Number(e.target.value) })} className="input mt-1 w-32" /></label>
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <button type="button" className="btn-secondary" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Back</button>
          {step < STEPS.length - 1 ? (
            <button type="button" className="btn-primary" onClick={() => setStep((s) => s + 1)}>Next</button>
          ) : (
            <button type="button" className="btn-primary" disabled={create.isPending || update.isPending} onClick={submit}>
              {proposalId ? 'Save proposal' : 'Create proposal'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProposalWizardLoader({ proposalId }: { proposalId?: string }) {
  return <ProposalWizard proposalId={proposalId} />;
}
