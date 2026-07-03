'use client';

import { useState } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { LoadingState, EmptyState } from '@/components/ui/states';

export function TemplateManager() {
  const { data, isLoading } = trpc.mockups360.templates.list.useQuery();
  if (isLoading) return <LoadingState />;
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {data?.map((t) => (
        <div key={t.id} className="card p-4">
          <p className="font-semibold">{t.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
          <p className="mt-2 text-xs capitalize">{t.lightType} · {t.pattern.replace(/_/g, ' ')}</p>
        </div>
      ))}
    </div>
  );
}

export function DecorationLibrary() {
  const { data, isLoading } = trpc.mockups360.library.list.useQuery();
  if (isLoading) return <LoadingState />;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {data?.map((a) => (
        <div key={a.id} className="card overflow-hidden">
          <div className="flex aspect-square items-center justify-center bg-muted/30 text-4xl">🎄</div>
          <div className="p-3">
            <p className="font-medium">{a.name}</p>
            <p className="text-xs capitalize text-muted-foreground">{a.category.replace(/_/g, ' ')}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function MeasurementEnginePage() {
  const { data: mockups } = trpc.mockups360.list.useQuery();
  const [mockupId, setMockupId] = useState('');
  const { toast } = useToast();
  const { data: measurements, refetch } = trpc.mockups360.measurements.list.useQuery({ mockupId }, { enabled: !!mockupId });
  const save = trpc.mockups360.measurements.save.useMutation({ onSuccess: () => { toast('Measurements saved', 'success'); refetch(); } });
  const setScale = trpc.mockups360.scale.set.useMutation({ onSuccess: () => toast('Scale set', 'success') });

  return (
    <div className="space-y-6">
      <select className="input max-w-md" value={mockupId} onChange={(e) => setMockupId(e.target.value)}>
        <option value="">Select design</option>
        {mockups?.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
      {mockupId && (
        <>
          <form className="card flex flex-wrap items-end gap-4 p-4" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            setScale.mutate({ mockupId, knownFeet: Number(fd.get('feet')), pixelLength: Number(fd.get('pixels')) });
          }}>
            <div><label className="text-xs">Known length (ft)</label><input name="feet" type="number" step="0.1" className="input" defaultValue="10" /></div>
            <div><label className="text-xs">Pixel length</label><input name="pixels" type="number" className="input" defaultValue="200" /></div>
            <button type="submit" className="btn-primary">Set scale</button>
            <button type="button" className="btn-secondary" onClick={() => save.mutate({ mockupId })}>Calculate measurements</button>
          </form>
          {measurements?.length ? (
            <table className="data-table w-full">
              <thead><tr><th>Label</th><th>Pixels</th><th>Feet</th><th>Feature</th></tr></thead>
              <tbody>
                {measurements.map((m) => (
                  <tr key={m.id}><td>{m.label}</td><td>{Math.round(m.pixelLength)}</td><td>{m.realWorldFeet}</td><td className="capitalize">{m.featureType?.replace(/_/g, ' ') ?? '—'}</td></tr>
                ))}
              </tbody>
            </table>
          ) : <EmptyState title="No measurements" description="Set scale and calculate from design strands." />}
        </>
      )}
    </div>
  );
}

export function ExportManager() {
  const { data: mockups } = trpc.mockups360.list.useQuery();
  const [mockupId, setMockupId] = useState('');
  const { toast } = useToast();
  const { data: exports, refetch } = trpc.mockups360.exports.list.useQuery({ mockupId }, { enabled: !!mockupId });
  const createExport = trpc.mockups360.exports.create.useMutation({ onSuccess: () => { toast('Export generated', 'success'); refetch(); } });
  const createProposal = trpc.mockups360.proposals.createFromMockup.useMutation({
    onSuccess: () => toast('Proposal created', 'success'),
    onError: (e) => toast(e.message, 'error'),
  });

  const types = [
    { key: 'material_list' as const, label: 'Material list' },
    { key: 'install_sheet' as const, label: 'Install sheet' },
    { key: 'pick_list' as const, label: 'Pick list' },
    { key: 'crew_work_order' as const, label: 'Crew work order' },
  ];

  return (
    <div className="space-y-6">
      <select className="input max-w-md" value={mockupId} onChange={(e) => setMockupId(e.target.value)}>
        <option value="">Select design</option>
        {mockups?.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
      {mockupId && (
        <>
          <div className="flex flex-wrap gap-2">
            {types.map((t) => (
              <button key={t.key} type="button" className="btn-secondary text-sm" onClick={() => createExport.mutate({ mockupId, exportType: t.key })}>{t.label}</button>
            ))}
            <button type="button" className="btn-primary text-sm" onClick={() => {
              const m = mockups?.find((x) => x.id === mockupId);
              if (m?.customerId) createProposal.mutate({ mockupId, customerId: m.customerId, propertyId: m.propertyId });
              else toast('Customer ID required on mockup', 'error');
            }}>Create proposal</button>
          </div>
          {exports?.map((ex) => (
            <pre key={ex.id} className="card whitespace-pre-wrap p-4 text-sm">{ex.content}</pre>
          ))}
        </>
      )}
    </div>
  );
}

export function AIStudioPage() {
  const [style, setStyle] = useState('Warm white classic design');
  const [mockupId, setMockupId] = useState('');
  const { toast } = useToast();
  const { data: mockups } = trpc.mockups360.list.useQuery();
  const design = trpc.mockups360.ai.design.useMutation({
    onSuccess: (r) => toast(`Generated: ${r.designName}`, 'success'),
    onError: (e) => toast(e.message, 'error'),
  });

  const presets = ['Warm white classic design', 'Premium design', 'HOA design', 'Commercial design'];

  return (
    <div className="space-y-6">
      <div className="card space-y-4 p-6">
        <h2 className="font-semibold">AI Design Assistant</h2>
        <select className="input" value={mockupId} onChange={(e) => setMockupId(e.target.value)}>
          <option value="">New design (preview only)</option>
          {mockups?.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button key={p} type="button" className="btn-secondary text-xs" onClick={() => setStyle(p)}>{p}</button>
          ))}
        </div>
        <textarea className="input" rows={2} value={style} onChange={(e) => setStyle(e.target.value)} />
        <button type="button" className="btn-primary" disabled={design.isPending} onClick={() => design.mutate({ style, mockupId: mockupId || undefined })}>Generate design</button>
      </div>
      {design.data && (
        <div className="card space-y-3 p-6 text-sm">
          <h3 className="font-semibold">{design.data.designName}</h3>
          <p>{design.data.description}</p>
          <p className="text-muted-foreground">~{design.data.estimatedLinearFeet} linear feet</p>
          <div><p className="font-medium">Upsells</p><ul>{design.data.upsells.map((u) => <li key={u}>• {u}</li>)}</ul></div>
          <div><p className="font-medium">Color packages</p><ul>{design.data.colorPackages.map((c) => <li key={c}>• {c}</li>)}</ul></div>
          {mockupId && <Link href={`/app/mockups/${mockupId}`} className="text-primary hover:underline">Open in studio →</Link>}
        </div>
      )}
    </div>
  );
}
