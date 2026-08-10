'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { useAnalyticsYear } from '@/lib/analytics-year-context';
import {
  INSTALL_TYPE_OPTIONS,
  FINANCING_OPTION_LABELS,
  labelInstallType,
  DEFAULT_PROPOSAL_TERMS,
} from '@/lib/proposal-utils';
import { buildScopeFromProperty, labelInstallComplexity } from '@/lib/property-profile-utils';
import { ProposalLineItemsEditor } from './proposal-line-items-editor';
import type { ProposalLineItem, Property } from '@clcrm/types';
import { LoadingState } from '@/components/ui/states';

type PricingMode = 'packages' | 'line_items';

type PackageDraft = {
  key: 'good' | 'better' | 'best';
  tier: 'basic' | 'recommended' | 'premium';
  label: string;
  description: string;
  inclusions: string[];
  isRecommended: boolean;
};

type FormState = {
  customerId: string;
  propertyId: string;
  title: string;
  salespersonName: string;
  installType: string;
  season: string;
  scopeOfWork: string;
  propertyPhotoUrl: string;
  designId: string;
  linearFootage: number;
  treeWrapCount: number;
  laborHours: number;
  financingOption: string;
  depositPercent: number;
  notes: string;
  lineItems: ProposalLineItem[];
  /** Typeable proposal total in dollars (only used in line-items mode). */
  proposalPriceDollars: string;
  installDate: string;
  removalDate: string;
  termsAndConditions: string;
  pricingMode: PricingMode;
  packages: PackageDraft[];
};

const EMPTY_PACKAGES: PackageDraft[] = [
  { key: 'good', tier: 'basic', label: 'Good', description: '', inclusions: [], isRecommended: false },
  { key: 'better', tier: 'recommended', label: 'Better', description: '', inclusions: [], isRecommended: true },
  { key: 'best', tier: 'premium', label: 'Best', description: '', inclusions: [], isRecommended: false },
];

function dateInputValue(d: unknown): string {
  if (!d) return '';
  if (d instanceof Date) {
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  }
  if (typeof d === 'object') {
    const o = d as { toDate?: () => Date; seconds?: number; _seconds?: number };
    if (typeof o.toDate === 'function') {
      try {
        const date = o.toDate();
        return date instanceof Date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : '';
      } catch {
        return '';
      }
    }
    const seconds = typeof o.seconds === 'number' ? o.seconds : typeof o._seconds === 'number' ? o._seconds : null;
    if (seconds != null) {
      const date = new Date(seconds * 1000);
      return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
    }
  }
  const date = new Date(typeof d === 'number' || typeof d === 'string' ? d : String(d));
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function dollarsFromCents(cents: unknown): string {
  const n = Number(cents);
  if (!Number.isFinite(n) || n <= 0) return '';
  return (n / 100).toFixed(2);
}

function defaultForm(initial?: Record<string, unknown>, prefillCustomerId?: string): FormState {
  return {
    customerId: prefillCustomerId || String(initial?.customerId ?? ''),
    propertyId: String(initial?.propertyId ?? ''),
    title: String(initial?.title ?? ''),
    salespersonName: String(initial?.salespersonName ?? ''),
    installType: String(initial?.installType ?? 'roofline'),
    season: String(initial?.season ?? new Date().getFullYear()),
    scopeOfWork: String(initial?.scopeOfWork ?? ''),
    propertyPhotoUrl: String(initial?.propertyPhotoUrl ?? ''),
    designId: String(initial?.designId ?? ''),
    linearFootage: Number((initial?.pricing as { linearFootage?: number })?.linearFootage ?? 100),
    treeWrapCount: Number((initial?.pricing as { treeWrapCount?: number })?.treeWrapCount ?? 0),
    laborHours: Number((initial?.pricing as { laborHours?: number })?.laborHours ?? 8),
    financingOption: String(initial?.financingOption ?? 'deposit_50'),
    depositPercent: Number(initial?.depositPercent ?? 50),
    notes: String(initial?.notes ?? ''),
    lineItems: (initial?.lineItems as ProposalLineItem[]) ?? [],
    proposalPriceDollars: dollarsFromCents(initial?.subtotalCents),
    installDate: dateInputValue(initial?.installDate),
    removalDate: dateInputValue(initial?.removalDate),
    termsAndConditions: String(initial?.termsAndConditions ?? DEFAULT_PROPOSAL_TERMS),
    pricingMode: 'packages',
    packages: EMPTY_PACKAGES,
  };
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function ProposalForm({ proposalId, initial }: { proposalId?: string; initial?: Record<string, unknown> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillCustomerId = searchParams.get('customerId') ?? '';
  const { toast } = useToast();
  const { year } = useAnalyticsYear();
  const [form, setForm] = useState<FormState>(() => defaultForm(initial, prefillCustomerId));
  const [customerSearch, setCustomerSearch] = useState('');
  const { data: proposalSettings } = trpc.settings360.proposals.useQuery(undefined, {
    staleTime: 60_000,
  });

  useEffect(() => {
    if (initial) setForm(defaultForm(initial, prefillCustomerId));
  }, [initial, prefillCustomerId]);

  useEffect(() => {
    if (!proposalSettings?.packageDefaults || proposalId) return;
    const d = proposalSettings.packageDefaults;
    setForm((prev) => ({
      ...prev,
      packages: [
        {
          key: 'good',
          tier: 'basic',
          label: d.good.label,
          description: d.good.description ?? '',
          inclusions: d.good.inclusions ?? [],
          isRecommended: false,
        },
        {
          key: 'better',
          tier: 'recommended',
          label: d.better.label,
          description: d.better.description ?? '',
          inclusions: d.better.inclusions ?? [],
          isRecommended: true,
        },
        {
          key: 'best',
          tier: 'premium',
          label: d.best.label,
          description: d.best.description ?? '',
          inclusions: d.best.inclusions ?? [],
          isRecommended: false,
        },
      ],
    }));
  }, [proposalSettings, proposalId]);

  const { data: customers, isLoading: customersLoading, isError: customersError } = trpc.customer360.list.useQuery(
    { page: 1, pageSize: 100, search: customerSearch || undefined, enrich: 'none' },
    { staleTime: 60_000 },
  );
  const { data: properties, isLoading: propertiesLoading } = trpc.customer360.properties.list.useQuery(
    { customerId: form.customerId },
    { enabled: !!form.customerId },
  );

  const create = trpc.proposals360.create.useMutation();
  const update = trpc.proposals360.update.useMutation();
  const saving = create.isPending || update.isPending;

  const selectedCustomer = customers?.items.find((c) => c.id === form.customerId);
  const customerLabel = selectedCustomer
    ? (selectedCustomer.businessName || `${selectedCustomer.firstName} ${selectedCustomer.lastName}`.trim())
    : null;

  async function submit() {
    if (!form.customerId || !form.propertyId) {
      toast('Select a customer and property', 'error');
      return;
    }
    if (!form.title.trim()) {
      toast('Enter a proposal name', 'error');
      return;
    }
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
    const typedCents = Math.round(parseFloat(form.proposalPriceDollars || '0') * 100);
    const preferPackages = form.pricingMode === 'packages';
    const packagesPayload = form.packages.map((pkg) => ({
      tier: pkg.tier,
      name: pkg.label,
      label: pkg.label,
      description: pkg.description,
      lineItems: [] as never[],
      products: pkg.inclusions,
      decorations: [] as string[],
      addOns: [] as string[],
      pricing,
      isRecommended: pkg.isRecommended,
    }));
    const payload = {
      customerId: form.customerId,
      propertyId: form.propertyId,
      title: form.title.trim(),
      salespersonName: form.salespersonName,
      installType: form.installType as never,
      season: form.season || String(year ?? new Date().getFullYear()),
      scopeOfWork: form.scopeOfWork,
      designId: form.designId || undefined,
      propertyPhotoUrl: form.propertyPhotoUrl || undefined,
      mockupIds: [] as string[],
      pricing,
      financingOption: form.financingOption as never,
      depositPercent: form.depositPercent,
      notes: form.notes || undefined,
      preferPackages,
      packages: packagesPayload,
      lineItems: preferPackages
        ? []
        : form.lineItems.map((item) => ({
            id: item.id,
            description: item.description,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
            ...(item.category ? { category: item.category } : {}),
            ...(item.inventoryItemId ? { inventoryItemId: item.inventoryItemId } : {}),
            ...(item.agreementCode ? { agreementCode: item.agreementCode } : {}),
          })),
      ...(!preferPackages &&
      Number.isFinite(typedCents) &&
      typedCents >= 0 &&
      form.proposalPriceDollars.trim() !== ''
        ? { subtotalCents: typedCents }
        : {}),
      installDate: form.installDate ? new Date(form.installDate) : null,
      removalDate: form.removalDate ? new Date(form.removalDate) : null,
      termsAndConditions: form.termsAndConditions || undefined,
    };
    try {
      if (proposalId) {
        await update.mutateAsync({ proposalId, data: payload });
        toast('Proposal saved', 'success');
        router.push(`/app/proposals/${proposalId}`);
      } else {
        const result = await create.mutateAsync(payload);
        toast('Proposal created', 'success');
        router.push(`/app/proposals/${result?.id}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save proposal';
      toast(message, 'error');
    }
  }

  return (
    <div className="space-y-4">
      <Section title="Customer & property">
        <div className="space-y-4">
          <input
            type="search"
            placeholder="Search customers by name, email, or phone..."
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            className="input"
          />
          {customersLoading && <p className="text-sm text-muted-foreground">Loading customers...</p>}
          {customersError && <p className="text-sm text-red-600">Could not load customers. Try again or create a new customer.</p>}
          {!customersLoading && (customers?.items.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground">
              No customers match.{' '}
              <Link href="/app/customers/new" className="text-primary hover:underline">Create a customer</Link>
            </p>
          )}
          {(customers?.items.length ?? 0) > 0 && (
            <div className="max-h-48 overflow-y-auto rounded-lg border border-border divide-y divide-border">
              {customers!.items.map((c) => {
                const label = c.businessName || `${c.firstName} ${c.lastName}`.trim();
                const selected = form.customerId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`block w-full px-4 py-2.5 text-left text-sm transition hover:bg-muted/60 ${selected ? 'bg-primary/10 font-medium text-primary' : ''}`}
                    onClick={() => setForm({ ...form, customerId: c.id, propertyId: '' })}
                  >
                    {label}
                    {c.email && <span className="ml-2 text-xs text-muted-foreground">{c.email}</span>}
                  </button>
                );
              })}
            </div>
          )}
          {customerLabel && (
            <p className="text-sm">Selected: <span className="font-medium">{customerLabel}</span></p>
          )}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Property</label>
            <select
              required
              value={form.propertyId}
              onChange={(e) => setForm({ ...form, propertyId: e.target.value })}
              className="input mt-1 w-full"
              disabled={!form.customerId || propertiesLoading}
            >
              <option value="">
                {!form.customerId ? 'Select a customer above' : propertiesLoading ? 'Loading properties...' : 'Select property...'}
              </option>
              {(properties ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.propertyName ?? p.label} — {p.addressLine1}, {p.city}, {p.state}
                </option>
              ))}
            </select>
            {form.customerId && !propertiesLoading && (properties?.length ?? 0) === 0 && (
              <p className="mt-2 text-sm text-muted-foreground">
                No properties for this customer.{' '}
                <Link href={`/app/customers/${form.customerId}/properties`} className="text-primary hover:underline">Add property profile</Link>
              </p>
            )}
            {form.propertyId && (properties ?? []).length > 0 && (
              <button
                type="button"
                className="btn-secondary mt-2 text-sm"
                onClick={() => {
                  const p = (properties ?? []).find((x) => x.id === form.propertyId) as Property | undefined;
                  if (!p) return;
                  const scope = buildScopeFromProperty(p);
                  setForm({
                    ...form,
                    linearFootage: p.estimatedRooflineFeet ?? form.linearFootage,
                    treeWrapCount: p.treeCount ?? form.treeWrapCount,
                    scopeOfWork: scope || form.scopeOfWork,
                    propertyPhotoUrl: p.galleryPhotos?.[0]?.url ?? form.propertyPhotoUrl,
                  });
                  toast('Imported from property profile', 'success');
                }}
              >
                Import from property profile
              </button>
            )}
            {form.propertyId && (() => {
              const p = (properties ?? []).find((x) => x.id === form.propertyId) as Property | undefined;
              if (!p?.installComplexity) return null;
              return (
                <p className="mt-2 text-xs text-muted-foreground">
                  Site complexity: {labelInstallComplexity(p.installComplexity)}
                  {p.ladderRequired ? ' · Ladder required' : ''}
                  {p.liftRequired ? ' · Lift required' : ''}
                </p>
              );
            })()}
          </div>
        </div>
      </Section>

      <Section title="Project details">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-1 sm:col-span-2 lg:col-span-3">
            <span className="text-xs font-medium text-muted-foreground">Proposal name *</span>
            <input required className="input w-full" placeholder="e.g. Lighting — Smith residence" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Category</span>
            <select className="input w-full" value={form.installType} onChange={(e) => setForm({ ...form, installType: e.target.value })}>
              {INSTALL_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Season / year</span>
            <input className="input w-full" value={form.season} onChange={(e) => setForm({ ...form, season: e.target.value })} placeholder={String(new Date().getFullYear())} />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Salesperson</span>
            <input className="input w-full" value={form.salespersonName} onChange={(e) => setForm({ ...form, salespersonName: e.target.value })} placeholder="Assign salesperson" />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Payment terms</span>
            <select className="input w-full" value={form.financingOption} onChange={(e) => setForm({ ...form, financingOption: e.target.value })}>
              {Object.entries(FINANCING_OPTION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Deposit %</span>
            <input type="number" min={0} max={100} className="input w-full" value={form.depositPercent} onChange={(e) => setForm({ ...form, depositPercent: Number(e.target.value) })} />
          </label>
        </div>
      </Section>

      <Section title="Scope of work">
        <textarea
          className="input min-h-[160px] w-full"
          placeholder="Describe what is included: roofline C9 warm white, tree wraps, timer setup, professional installation, takedown and storage..."
          value={form.scopeOfWork}
          onChange={(e) => setForm({ ...form, scopeOfWork: e.target.value })}
        />
        <button
          type="button"
          className="btn-secondary mt-3 text-sm"
          onClick={() => setForm({
            ...form,
            scopeOfWork: 'Professional installation of roofline LED lighting, timer setup, season takedown, and labeled storage included.',
          })}
        >
          Insert sample scope
        </button>
      </Section>

      <Section title="Pricing mode">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={form.pricingMode === 'packages' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setForm({ ...form, pricingMode: 'packages' })}
          >
            Packages (recommended)
          </button>
          <button
            type="button"
            className={form.pricingMode === 'line_items' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setForm({ ...form, pricingMode: 'line_items' })}
          >
            Use line items instead
          </button>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {form.pricingMode === 'packages'
            ? 'Packages set the proposal total and supersede line items. Customers choose a package on the public page.'
            : 'Line items set the proposal total. Packages stay hidden for this create flow.'}
        </p>
      </Section>

      <Section title="Pricing inputs">
        <p className="mb-4 text-sm text-muted-foreground">
          Measurements feed package pricing. Category: {labelInstallType(form.installType)}.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="space-y-1 text-sm">
            Linear footage
            <input type="number" min={0} className="input mt-1 w-full" value={form.linearFootage} onChange={(e) => setForm({ ...form, linearFootage: Number(e.target.value) })} />
          </label>
          <label className="space-y-1 text-sm">
            Tree wraps
            <input type="number" min={0} className="input mt-1 w-full" value={form.treeWrapCount} onChange={(e) => setForm({ ...form, treeWrapCount: Number(e.target.value) })} />
          </label>
          <label className="space-y-1 text-sm">
            Labor hours
            <input type="number" min={0} className="input mt-1 w-full" value={form.laborHours} onChange={(e) => setForm({ ...form, laborHours: Number(e.target.value) })} />
          </label>
        </div>
      </Section>

      {form.pricingMode === 'packages' ? (
        <Section title="Good / Better / Best packages">
          <p className="mb-4 text-sm text-muted-foreground">
            Edit what&apos;s included for this proposal. Org defaults come from{' '}
            <Link href="/app/proposals/packages" className="text-primary hover:underline">
              Package library
            </Link>
            . The recommended package becomes the selected total.
          </p>
          <div className="grid gap-4 lg:grid-cols-3">
            {form.packages.map((pkg, index) => (
              <div key={pkg.key} className="space-y-3 rounded-[var(--radius)] border border-border p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{pkg.key}</p>
                  <label className="flex items-center gap-1.5 text-xs">
                    <input
                      type="radio"
                      name="recommendedPackage"
                      checked={pkg.isRecommended}
                      onChange={() =>
                        setForm({
                          ...form,
                          packages: form.packages.map((p, i) => ({
                            ...p,
                            isRecommended: i === index,
                          })),
                        })
                      }
                    />
                    Recommended
                  </label>
                </div>
                <label className="block space-y-1 text-sm">
                  <span className="text-xs font-medium text-muted-foreground">Label</span>
                  <input
                    className="input w-full"
                    value={pkg.label}
                    onChange={(e) => {
                      const packages = [...form.packages];
                      packages[index] = { ...pkg, label: e.target.value };
                      setForm({ ...form, packages });
                    }}
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span className="text-xs font-medium text-muted-foreground">Description</span>
                  <textarea
                    className="input min-h-[80px] w-full"
                    value={pkg.description}
                    onChange={(e) => {
                      const packages = [...form.packages];
                      packages[index] = { ...pkg, description: e.target.value };
                      setForm({ ...form, packages });
                    }}
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span className="text-xs font-medium text-muted-foreground">What&apos;s included (one per line)</span>
                  <textarea
                    className="input min-h-[120px] w-full"
                    value={pkg.inclusions.join('\n')}
                    onChange={(e) => {
                      const packages = [...form.packages];
                      packages[index] = {
                        ...pkg,
                        inclusions: e.target.value
                          .split('\n')
                          .map((line) => line.trim())
                          .filter(Boolean),
                      };
                      setForm({ ...form, packages });
                    }}
                  />
                </label>
              </div>
            ))}
          </div>
        </Section>
      ) : (
        <Section title="Line item pricing">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Proposal price ($)</span>
              <input
                type="text"
                inputMode="decimal"
                className="input w-full"
                placeholder="0.00"
                value={form.proposalPriceDollars}
                onChange={(e) => setForm({ ...form, proposalPriceDollars: e.target.value })}
              />
            </label>
          </div>
          <div className="mt-4">
            <ProposalLineItemsEditor value={form.lineItems} onChange={(lineItems) => setForm({ ...form, lineItems })} />
          </div>
        </Section>
      )}

      <Section title="Schedule & terms">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Target install date</span>
            <input type="date" className="input w-full" value={form.installDate} onChange={(e) => setForm({ ...form, installDate: e.target.value })} />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Target removal date</span>
            <input type="date" className="input w-full" value={form.removalDate} onChange={(e) => setForm({ ...form, removalDate: e.target.value })} />
          </label>
        </div>
        <label className="mt-4 block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Terms & conditions</span>
          <textarea
            className="input min-h-[120px] w-full"
            value={form.termsAndConditions}
            onChange={(e) => setForm({ ...form, termsAndConditions: e.target.value })}
          />
        </label>
      </Section>

      <Section title="Design & files">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Property photo URL</span>
            <input className="input w-full" value={form.propertyPhotoUrl} onChange={(e) => setForm({ ...form, propertyPhotoUrl: e.target.value })} placeholder="https://..." />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Mockup / design ID</span>
            <input className="input w-full" value={form.designId} onChange={(e) => setForm({ ...form, designId: e.target.value })} placeholder="Optional" />
          </label>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Link mockups from the{' '}
          <Link href="/app/mockups" className="text-primary hover:underline">Mockups</Link>
          {' '}module after creating the proposal.
        </p>
      </Section>

      <Section title="Internal notes">
        <textarea
          className="input min-h-[100px] w-full"
          placeholder="Notes visible to your team only..."
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </Section>

      <div className="flex flex-wrap justify-end gap-2">
        <Link href={proposalId ? `/app/proposals/${proposalId}` : '/app/proposals'} className="btn-secondary">Cancel</Link>
        <button type="button" className="btn-primary" disabled={saving} onClick={submit}>
          {saving ? 'Saving…' : proposalId ? 'Save proposal' : 'Create proposal'}
        </button>
      </div>
    </div>
  );
}

export function ProposalFormLoader({ proposalId }: { proposalId?: string }) {
  const { data, isLoading } = trpc.proposals360.getById.useQuery(
    { proposalId: proposalId! },
    { enabled: !!proposalId },
  );
  if (proposalId && isLoading) return <LoadingState message="Loading proposal..." />;
  return <ProposalForm proposalId={proposalId} initial={data as Record<string, unknown> | undefined} />;
}
