'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { LoadingState } from '@/components/ui/states';
import {
  AVERY_LAYOUTS,
  POSTCARD_SIZES,
  PRINT_TEMPLATE_OPTIONS,
  QR_PLACEMENT_OPTIONS,
  downloadDataUrl,
  downloadQrZip,
  printAverySheet,
  printPostcard,
  printQrSheet,
  qrToPngDataUrl,
  type PrintTemplateKind,
  type QrPlacementMode,
} from '@/lib/portal-qr';

const EXPIRY_PRESETS: Array<{ label: string; days: number | null }> = [
  { label: 'No fixed expiration', days: null },
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
];

const PRESET_FILTERS = [
  { id: 'all', label: 'All customers' },
  { id: 'active', label: 'Active customers' },
  { id: 'portal_not_activated', label: 'Portal not activated' },
  { id: 'no_active_qr', label: 'No active QR' },
  { id: 'has_active_qr', label: 'Has active QR' },
  { id: 'installation_scheduled', label: 'Installation scheduled' },
  { id: 'takedown_scheduled', label: 'Takedown scheduled' },
  { id: 'rebooking_eligible', label: 'Rebooking eligible' },
] as const;

type ResultRow = {
  customerId: string;
  qrId: string;
  accessUrl: string;
  name: string;
  propertyLabel?: string;
};

export default function BulkPortalQrPage() {
  const { toast } = useToast();
  const { data, isLoading } = trpc.customer360.list.useQuery({ pageSize: 200, enrich: 'full' });
  const { data: orgCodes } = trpc.portal360.qrOrgList.useQuery({ status: 'all', limit: 200 });
  const bulk = trpc.portal360.qrBulkGenerate.useMutation({
    onError: (e) => toast(e.message, 'error'),
  });

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [label, setLabel] = useState('Bulk welcome packet');
  const [search, setSearch] = useState('');
  const [preset, setPreset] = useState<(typeof PRESET_FILTERS)[number]['id']>('all');
  const [city, setCity] = useState('');
  const [customerType, setCustomerType] = useState('');
  const [tag, setTag] = useState('');
  const [salesperson, setSalesperson] = useState('');
  const [qrType, setQrType] = useState<'customer_portal'>('customer_portal');
  const [expiryDays, setExpiryDays] = useState<number | null>(null);
  const [printTemplate, setPrintTemplate] = useState<PrintTemplateKind>('sticker');
  const [averyId, setAveryId] = useState('5160');
  const [postcardSize, setPostcardSize] = useState('6x4');
  const [qrPlacement, setQrPlacement] = useState<QrPlacementMode>('blank_sticker');
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [failures, setFailures] = useState<Array<{ customerId: string; error: string }>>([]);
  const [busy, setBusy] = useState(false);

  const customers = data?.items ?? [];

  const qrByCustomer = useMemo(() => {
    const map = new Map<string, { active: boolean; activated: boolean; status: string }>();
    for (const c of orgCodes ?? []) {
      const prev = map.get(c.customerId);
      const isLive = (c.status === 'active' || c.status === 'reusable') && !c.expired;
      map.set(c.customerId, {
        active: Boolean(prev?.active || isLive),
        activated: Boolean(prev?.activated || c.activatedAt),
        status: isLive ? c.status : (prev?.status ?? c.status),
      });
    }
    return map;
  }, [orgCodes]);

  const cities = useMemo(() => {
    const set = new Set<string>();
    for (const c of customers) {
      const cityName = c.primaryProperty?.city || c.billingCity || c.mailingCity;
      if (cityName) set.add(cityName);
    }
    return Array.from(set).sort();
  }, [customers]);

  const salespeople = useMemo(() => {
    const set = new Set<string>();
    for (const c of customers) {
      if (c.assignedSalespersonName) set.add(c.assignedSalespersonName);
    }
    return Array.from(set).sort();
  }, [customers]);

  const tags = useMemo(() => {
    const set = new Set<string>();
    for (const c of customers) {
      for (const t of c.tags ?? []) set.add(t);
    }
    return Array.from(set).sort();
  }, [customers]);

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of customers) {
      map.set(
        c.id,
        c.businessName || `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || c.id,
      );
    }
    return map;
  }, [customers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      const name = nameById.get(c.id)?.toLowerCase() ?? '';
      const propCity = c.primaryProperty?.city || c.billingCity || c.mailingCity || '';
      const qr = qrByCustomer.get(c.id);
      if (q && !name.includes(q) && !(c.email ?? '').toLowerCase().includes(q) && !propCity.toLowerCase().includes(q)) {
        return false;
      }
      if (city && propCity !== city) return false;
      if (customerType && (c.customerType ?? 'residential') !== customerType) return false;
      if (tag && !(c.tags ?? []).includes(tag)) return false;
      if (salesperson && c.assignedSalespersonName !== salesperson) return false;

      switch (preset) {
        case 'active':
          return c.status === 'active' || c.status === 'scheduled' || c.status === 'installed';
        case 'portal_not_activated':
          return !qr?.activated;
        case 'no_active_qr':
          return !qr?.active;
        case 'has_active_qr':
          return Boolean(qr?.active);
        case 'installation_scheduled':
          return c.status === 'scheduled' || c.pipelineStage === 'scheduled';
        case 'takedown_scheduled':
          return c.status === 'takedown_pending' || c.pipelineStage === 'removal_scheduled';
        case 'rebooking_eligible':
          return c.status === 'storage' || c.pipelineStage === 'rebook_next_season' || c.pipelineStage === 'stored';
        default:
          return true;
      }
    });
  }, [customers, search, city, customerType, tag, salesperson, preset, nameById, qrByCustomer]);

  const selectedIds = useMemo(
    () => filtered.filter((c) => selected[c.id]).map((c) => c.id),
    [filtered, selected],
  );

  const existingActiveCount = selectedIds.filter((id) => qrByCustomer.get(id)?.active).length;
  const expiresAt = expiryDays == null ? null : new Date(Date.now() + expiryDays * 86400000);

  async function runBulk() {
    if (!selectedIds.length) {
      toast('Select at least one customer', 'error');
      return;
    }
    const res = await bulk.mutateAsync({
      customerIds: selectedIds,
      label: label || null,
      expiresAt,
      replaceExistingActivation: replaceExisting,
      type: qrType,
    });
    const mapped: ResultRow[] = res.created.map((row) => {
      const customer = customers.find((c) => c.id === row.customerId);
      const prop = customer?.primaryProperty;
      return {
        ...row,
        name: nameById.get(row.customerId) ?? row.customerId,
        propertyLabel: prop
          ? `${prop.addressLine1}, ${prop.city}`
          : undefined,
      };
    });
    setResults(mapped);
    setFailures((res.errors ?? []).map((e) => ({ customerId: e.customerId, error: e.message })));
    for (const row of mapped) {
      sessionStorage.setItem(`portal-qr-url:${row.customerId}`, row.accessUrl);
    }
    if (res.errors.length) {
      toast(`Created ${res.created.length}; ${res.errors.length} failed`, 'error');
    } else {
      toast(`Generated ${res.created.length} QR codes`, 'success');
    }
  }

  async function withBusy(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Export failed', 'error');
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) return <LoadingState message="Loading customers..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/app/customers" className="text-sm text-primary hover:underline">← Customers</Link>
          <h1 className="mt-2 text-2xl font-bold">Bulk portal QR codes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Filter customers, generate secure tokens, then export Avery sheets, postcards, or a ZIP of PNG/SVG files.
          </p>
        </div>
        <Link href="/app/settings/portal-qr" className="text-sm text-primary hover:underline">Org QR hub →</Link>
      </div>

      <div className="card space-y-4 p-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block text-sm">
            <span className="font-medium">Preset</span>
            <select className="input mt-1 w-full" value={preset} onChange={(e) => setPreset(e.target.value as typeof preset)}>
              {PRESET_FILTERS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium">Search</span>
            <input className="input mt-1 w-full" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, email, city" />
          </label>
          <label className="block text-sm">
            <span className="font-medium">City</span>
            <select className="input mt-1 w-full" value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="">Any</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium">Customer type</span>
            <select className="input mt-1 w-full" value={customerType} onChange={(e) => setCustomerType(e.target.value)}>
              <option value="">Any</option>
              {['residential', 'commercial', 'hoa', 'municipal', 'church', 'school'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium">Tag</span>
            <select className="input mt-1 w-full" value={tag} onChange={(e) => setTag(e.target.value)}>
              <option value="">Any</option>
              {tags.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium">Salesperson</span>
            <select className="input mt-1 w-full" value={salesperson} onChange={(e) => setSalesperson(e.target.value)}>
              <option value="">Any</option>
              {salespeople.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-sm">
            <span className="font-medium">Label</span>
            <input className="input mt-1 w-full" value={label} onChange={(e) => setLabel(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="font-medium">QR type</span>
            <select className="input mt-1 w-full" value={qrType} onChange={() => setQrType('customer_portal')}>
              <option value="customer_portal">Customer portal (activation)</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium">Expiration</span>
            <select
              className="input mt-1 w-full"
              value={expiryDays ?? ''}
              onChange={(e) => setExpiryDays(e.target.value === '' ? null : Number(e.target.value))}
            >
              {EXPIRY_PRESETS.map((p) => (
                <option key={p.label} value={p.days ?? ''}>{p.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium">Print template</span>
            <select className="input mt-1 w-full" value={printTemplate} onChange={(e) => setPrintTemplate(e.target.value as PrintTemplateKind)}>
              {PRINT_TEMPLATE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={replaceExisting} onChange={(e) => setReplaceExisting(e.target.checked)} />
          Replace existing active activation QR codes
        </label>

        <div className="rounded-xl border border-border bg-muted/20 px-3 py-2 text-sm">
          <p>
            <span className="font-medium">{filtered.length}</span> match filters ·{' '}
            <span className="font-medium">{selectedIds.length}</span> selected ·{' '}
            <span className="font-medium">{existingActiveCount}</span> already have an active QR
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary text-sm" onClick={() => {
            const next: Record<string, boolean> = { ...selected };
            for (const c of filtered) next[c.id] = true;
            setSelected(next);
          }}>Select filtered</button>
          <button type="button" className="btn-secondary text-sm" onClick={() => setSelected({})}>Clear</button>
          <button type="button" className="btn-primary text-sm" disabled={bulk.isPending} onClick={() => void runBulk()}>
            {bulk.isPending ? 'Generating…' : `Generate (${selectedIds.length})`}
          </button>
        </div>

        <ul className="max-h-80 overflow-y-auto divide-y rounded-xl border">
          {filtered.map((c) => {
            const qr = qrByCustomer.get(c.id);
            return (
              <li key={c.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(selected[c.id])}
                  onChange={(e) => setSelected((s) => ({ ...s, [c.id]: e.target.checked }))}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{nameById.get(c.id)}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {c.primaryProperty?.city || c.billingCity || '—'} · {c.customerType}
                    {qr?.active ? ` · QR ${qr.status.replace(/_/g, ' ')}` : ' · no active QR'}
                    {qr?.activated ? ' · activated' : ''}
                  </p>
                </div>
              </li>
            );
          })}
          {filtered.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">No customers match these filters.</li>
          )}
        </ul>
      </div>

      {results.length > 0 && (
        <div className="card space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Generated ({results.length})</h2>
            <p className="text-xs text-amber-800">Secure URLs are session-only — download or print now.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-sm">
              <span className="font-medium">Avery layout</span>
              <select className="input mt-1 w-full" value={averyId} onChange={(e) => setAveryId(e.target.value)}>
                {AVERY_LAYOUTS.map((l) => (
                  <option key={l.id} value={l.id}>{l.label}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="font-medium">Postcard size</span>
              <select className="input mt-1 w-full" value={postcardSize} onChange={(e) => setPostcardSize(e.target.value)}>
                {POSTCARD_SIZES.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="font-medium">QR placement</span>
              <select className="input mt-1 w-full" value={qrPlacement} onChange={(e) => setQrPlacement(e.target.value as QrPlacementMode)}>
                {QR_PLACEMENT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary text-sm" disabled={busy} onClick={() => void withBusy(async () => {
              await printAverySheet({
                layoutId: averyId,
                items: results.map((r) => ({
                  accessUrl: r.accessUrl,
                  title: r.name,
                  subtitle: label,
                })),
              });
            })}>
              Avery sheet PDF
            </button>
            <button type="button" className="btn-secondary text-sm" disabled={busy} onClick={() => void withBusy(async () => {
              for (const row of results) {
                await printPostcard({
                  accessUrl: row.accessUrl,
                  customerName: row.name,
                  propertyLabel: row.propertyLabel,
                  sizeId: postcardSize,
                  qrPlacement,
                  showBack: true,
                });
              }
            })}>
              Postcards
            </button>
            <button type="button" className="btn-secondary text-sm" disabled={busy} onClick={() => void withBusy(async () => {
              for (const row of results) {
                await printQrSheet({
                  accessUrl: row.accessUrl,
                  title: row.name,
                  subtitle: label || 'Customer portal',
                  template: printTemplate,
                  customerName: row.name,
                  propertyLabel: row.propertyLabel,
                  qrPlacement: printTemplate === 'postcard' ? qrPlacement : 'print_direct',
                  postcardSizeId: postcardSize,
                });
              }
            })}>
              Print template
            </button>
            <button type="button" className="btn-primary text-sm" disabled={busy} onClick={() => void withBusy(async () => {
              await downloadQrZip(
                results.map((r) => ({
                  accessUrl: r.accessUrl,
                  filenameBase: `portal-qr-${r.name}-${r.qrId.slice(0, 8)}`,
                })),
                `portal-qr-batch-${new Date().toISOString().slice(0, 10)}.zip`,
              );
              toast('ZIP downloaded', 'success');
            })}>
              Download ZIP
            </button>
          </div>

          {failures.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-900">
              <p className="font-medium">{failures.length} failed</p>
              <ul className="mt-1 space-y-1">
                {failures.map((f) => (
                  <li key={f.customerId}>{nameById.get(f.customerId) ?? f.customerId}: {f.error}</li>
                ))}
              </ul>
            </div>
          )}

          <ul className="space-y-2 text-sm">
            {results.map((row) => (
              <li key={row.qrId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2">
                <div className="min-w-0">
                  <p className="font-medium">{row.name}</p>
                  <p className="break-all font-mono text-[11px] text-muted-foreground">{row.accessUrl}</p>
                </div>
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={async () => {
                    const dataUrl = await qrToPngDataUrl(row.accessUrl);
                    downloadDataUrl(dataUrl, `portal-qr-${row.qrId.slice(0, 8)}.png`);
                  }}
                >
                  PNG
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
