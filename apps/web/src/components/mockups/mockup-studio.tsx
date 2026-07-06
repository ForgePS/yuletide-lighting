'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { MockupStrand } from '@clcrm/types';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { PropertyPhotoCapture } from '@/components/property-photo-capture';
import { AuthenticatedImage } from '@/components/authenticated-image';
import { PillSelect } from '@/components/ui/pill-select';
import { LoadingState } from '@/components/ui/states';
import { MockupApprovalPanel, MockupProposalPanel } from './mockup-approval-panel';
import { strandFromPreset } from './lighting-layer-toolbar';

const MockupCanvas = dynamic(() => import('./mockup-canvas').then((m) => m.MockupCanvas), {
  ssr: false,
  loading: () => <LoadingState message="Loading canvas..." />,
});

export function PropertyUploader({ onUploaded }: { onUploaded: (url: string) => void }) {
  return <PropertyPhotoCapture value="" onChange={onUploaded} />;
}

export function NewMockupPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { data: properties } = trpc.customer360.properties.listAll.useQuery({});
  const [propertyId, setPropertyId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [name, setName] = useState('New Design');

  const selectedProperty = properties?.find((p) => p.id === propertyId);

  useEffect(() => {
    if (selectedProperty?.photos?.front_elevation && !imageUrl) {
      setImageUrl(selectedProperty.photos.front_elevation);
    }
  }, [selectedProperty, imageUrl]);

  const create = trpc.mockups360.create.useMutation({
    onSuccess: (m) => { toast('Design created', 'success'); router.push(`/app/mockups/${m!.id}`); },
    onError: (e) => toast(e.message, 'error'),
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PropertyPhotoCapture value={imageUrl} onChange={setImageUrl} />

      <div className="space-y-4">
        <label className="block space-y-1">
          <span className="text-sm text-muted-foreground">Property</span>
          <select className="input min-h-12 w-full" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
            <option value="">Select property…</option>
            {properties?.map((p) => (
              <option key={p.id} value={p.id}>{p.label || p.propertyName} — {p.addressLine1}, {p.city}</option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-muted-foreground">Design name</span>
          <input className="input min-h-12 w-full" placeholder="Design name" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
      </div>

      <button
        type="button"
        className="btn-primary min-h-12 w-full text-base"
        disabled={!propertyId || !imageUrl || create.isPending}
        onClick={() => create.mutate({
          propertyId,
          customerId: selectedProperty?.customerId,
          name,
          imageUrl,
        })}
      >
        {create.isPending ? 'Creating...' : 'Create design'}
      </button>
    </div>
  );
}

function CompareSlider({ before, after }: { before: string; after: string }) {
  const [sliderPos, setSliderPos] = useState(50);

  return (
    <div className="relative overflow-hidden rounded-xl border touch-pan-y" style={{ aspectRatio: '4/3' }}>
      <AuthenticatedImage value={before} alt="Before" className="absolute inset-0 h-full w-full object-cover" fallback={<div className="absolute inset-0 bg-muted" />} />
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${sliderPos}%` }}>
        <AuthenticatedImage value={after} alt="After" className="h-full w-full object-cover brightness-110" fallback={<div className="h-full bg-muted" />} />
      </div>
      <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-lg" style={{ left: `${sliderPos}%` }} />
      <input type="range" min={0} max={100} value={sliderPos} onChange={(e) => setSliderPos(Number(e.target.value))} className="absolute bottom-3 left-3 right-3 z-10 h-8" aria-label="Before and after comparison" />
    </div>
  );
}

export function MockupStudio({ mockupId }: { mockupId: string }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data: mockup, isLoading } = trpc.mockups360.getById.useQuery({ mockupId });
  const { data: materials } = trpc.mockups360.materials.generate.useQuery({ mockupId }, { enabled: !!mockup });
  const update = trpc.mockups360.update.useMutation({
    onSuccess: () => { toast('Saved', 'success'); utils.mockups360.getById.invalidate({ mockupId }); },
    onError: (e) => toast(e.message, 'error'),
  });
  const detect = trpc.mockups360.ai.detect.useMutation({ onSuccess: () => { toast('AI detection complete', 'success'); utils.mockups360.getById.invalidate({ mockupId }); } });
  const version = trpc.mockups360.versions.create.useMutation({ onSuccess: () => toast('Version saved', 'success') });

  const [compareMode, setCompareMode] = useState<'side' | 'slider'>('slider');
  const [showCamera, setShowCamera] = useState(false);
  const [strands, setStrands] = useState<MockupStrand[]>([]);
  const [brightness, setBrightness] = useState(0.5);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (mockup && !initialized) {
      setStrands(mockup.strands);
      setBrightness(mockup.backgroundBrightness);
      setInitialized(true);
    }
  }, [mockup, initialized]);

  const currentMockup = mockup;
  if (isLoading || !currentMockup) return <LoadingState message="Loading studio..." />;

  const afterImage = currentMockup.renderedImageUrl ?? currentMockup.imageUrl;

  function applyDetectedSuggestions() {
    const detectedFeatures = currentMockup?.detectedFeatures ?? [];
    if (!detectedFeatures.length) {
      toast('Run AI detect first', 'error');
      return;
    }
    const generated = detectedFeatures
      .filter((feature) => feature.points.length >= 2 && feature.confidence >= 0.55)
      .map((feature, idx) => {
        const type = feature.type;
        const presetId = type === 'tree' || type === 'bush'
          ? 'tree_wrap'
          : type === 'window' || type === 'door' || type === 'walkway'
            ? 'garland'
            : type === 'column' || type === 'garage'
              ? 'commercial'
              : 'roofline';
        const color = presetId === 'tree_wrap' ? '#00AA44' : presetId === 'commercial' ? '#F5F5F5' : '#FFD700';
        return {
          ...strandFromPreset(feature.points, presetId, color),
          id: `${presetId}-${idx}-${crypto.randomUUID()}`,
        };
      });
    if (!generated.length) {
      toast('No usable detections found', 'error');
      return;
    }
    setStrands((prev) => [...prev, ...generated]);
    toast(`Added ${generated.length} AI-suggested layer${generated.length > 1 ? 's' : ''}`, 'success');
  }

  function saveStrands() {
    update.mutate({
      mockupId,
      strands: strands.map((strand) => ({
        id: strand.id,
        points: strand.points,
        color: strand.color,
        lightType: strand.lightType,
        pattern: strand.pattern,
        bulbSize: strand.bulbSize,
        spacing: strand.spacing,
        brightness: strand.brightness,
        layerId: strand.layerId ?? undefined,
        layerType: strand.layerType ?? 'lighting',
      })),
      backgroundBrightness: brightness,
    });
  }

  return (
    <div className="space-y-4 pb-24 lg:space-y-6 lg:pb-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold sm:text-xl">{mockup.name}</h2>
          <p className="text-sm text-muted-foreground">
            v{mockup.versionNumber} · {strands.length} strands · {mockup.aiDetectionComplete ? 'AI detected' : 'Manual trace'}
          </p>
        </div>
        <div className="hidden flex-wrap gap-2 lg:flex">
          <button type="button" className="btn-secondary text-sm" onClick={() => detect.mutate({ mockupId })}>AI detect</button>
          <button type="button" className="btn-secondary text-sm" onClick={applyDetectedSuggestions}>Apply AI layers</button>
          <button type="button" className="btn-secondary text-sm" onClick={() => version.mutate({ mockupId, revisionNotes: 'Manual save' })}>Save version</button>
          <button type="button" className="btn-primary text-sm" onClick={() => update.mutate({ mockupId, status: 'approved' })}>Approve internally</button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <PillSelect
          label="View mode"
          value={compareMode}
          onChange={(value) => setCompareMode(value as 'side' | 'slider')}
          options={[
            { value: 'slider', label: 'Before / after slider' },
            { value: 'side', label: 'Side by side' },
          ]}
          className="min-w-[12rem]"
        />
        <button type="button" className="btn-secondary shrink-0 text-sm" onClick={() => setShowCamera((v) => !v)}>
          {showCamera ? 'Hide camera' : 'Retake photo'}
        </button>
      </div>

      {showCamera && (
        <PropertyPhotoCapture value={mockup.imageUrl} onChange={(path) => update.mutate({ mockupId, imageUrl: path })} className="max-w-xl" />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {compareMode === 'slider' ? (
            <CompareSlider before={mockup.imageUrl} after={afterImage} />
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <AuthenticatedImage value={mockup.imageUrl} alt="Before" className="aspect-[4/3] w-full rounded-lg border object-cover" fallback={<div className="aspect-[4/3] rounded-lg bg-muted" />} />
              <AuthenticatedImage value={afterImage} alt="After" className="aspect-[4/3] w-full rounded-lg border object-cover brightness-110" fallback={<div className="aspect-[4/3] rounded-lg bg-muted" />} />
            </div>
          )}

          <MockupCanvas
            imageUrl={mockup.imageUrl}
            strands={strands}
            brightness={brightness}
            onStrandsChange={setStrands}
            onBrightnessChange={setBrightness}
            onSave={saveStrands}
            saving={update.isPending}
          />
        </div>

        <div className="space-y-4">
          <MockupApprovalPanel mockupId={mockupId} status={mockup.status} approvalToken={mockup.approvalToken} />
          <MockupProposalPanel
            mockupId={mockupId}
            customerId={mockup.customerId}
            propertyId={mockup.propertyId}
            linkedProposalId={mockup.linkedProposalId}
          />

          {mockup.detectedFeatures.length > 0 && (
            <div className="card p-4">
              <h3 className="font-semibold">AI detections</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {mockup.detectedFeatures.map((f, i) => (
                  <li key={i} className="capitalize">{f.type.replace(/_/g, ' ')} · {Math.round(f.confidence * 100)}%</li>
                ))}
              </ul>
            </div>
          )}

          {materials && (
            <div className="card p-4">
              <h3 className="font-semibold">Materials</h3>
              <p className="mt-2 text-2xl font-bold">{materials.totalLinearFeet} ft</p>
              <p className="text-sm text-muted-foreground">{materials.bulbCount} bulbs · {materials.strandCount} strands · ~{materials.laborHoursEstimate}h labor</p>
            </div>
          )}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-border bg-surface/95 p-3 backdrop-blur safe-bottom lg:hidden">
        <button type="button" className="btn-secondary min-h-11 flex-1 text-sm" onClick={() => detect.mutate({ mockupId })}>AI detect</button>
        <button type="button" className="btn-secondary min-h-11 flex-1 text-sm" onClick={applyDetectedSuggestions}>Apply AI</button>
        <button type="button" className="btn-secondary min-h-11 flex-1 text-sm" onClick={saveStrands}>Save</button>
        <button type="button" className="btn-primary min-h-11 flex-1 text-sm" onClick={() => update.mutate({ mockupId, status: 'approved' })}>Approve</button>
      </div>
    </div>
  );
}
