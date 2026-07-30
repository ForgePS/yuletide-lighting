'use client';

import { useParams, useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { formatDate } from '@clcrm/ui';
import { useToast } from '@/lib/toast';
import { PortalAuthedFrame } from '@/components/portal/portal-shell';
import { PortalStickyBar, PortalStatusPill } from '@/components/portal/portal-mobile';
import { LoadingState } from '@/components/ui/states';

const CATEGORIES = [
  { value: 'lights_out', label: 'Lights out' },
  { value: 'timer_issue', label: 'Timer' },
  { value: 'damage', label: 'Damage' },
  { value: 'loose_material', label: 'Loose material' },
  { value: 'weather_related', label: 'Weather' },
  { value: 'customer_request', label: 'Other' },
];

const URGENCY = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
] as const;

async function compressImage(file: File, maxEdge = 1600, quality = 0.72): Promise<{ base64: string; contentType: 'image/jpeg'; filename: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not process photo');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  const base64 = dataUrl.split(',')[1] ?? '';
  return { base64, contentType: 'image/jpeg', filename: file.name.replace(/\.\w+$/, '') + '.jpg' };
}

export default function PortalServiceRequestPage() {
  const token = useParams().token as string;
  return (
    <PortalAuthedFrame token={token} title="Request service" feature="service_requests" stickyPad>
      {({ token: accessToken }) => <ServiceBody token={accessToken} />}
    </PortalAuthedFrame>
  );
}

function ServiceBody({ token }: { token: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = trpc.portal360.public.dashboard.useQuery({ token });
  const { data: history } = trpc.portal360.public.serviceRequests.useQuery({ token });
  const upload = trpc.portal360.public.uploadServicePhoto.useMutation();
  const submit = trpc.portal360.public.submitServiceRequest.useMutation({
    onSuccess: () => {
      toast('Service request submitted', 'success');
      utils.portal360.public.serviceRequests.invalidate({ token });
      router.push(`/portal/${token}`);
    },
    onError: (e) => toast(e.message, 'error'),
  });

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('customer_request');
  const [propertyId, setPropertyId] = useState('');
  const [priority, setPriority] = useState<(typeof URGENCY)[number]['value']>('normal');
  const [locationNote, setLocationNote] = useState('');
  const [accessInstructions, setAccessInstructions] = useState('');
  const [photos, setPhotos] = useState<Array<{ url: string; preview: string }>>([]);
  const [uploading, setUploading] = useState(false);

  if (isLoading) return <LoadingState message="Loading..." />;

  if (data && (!data.settings.allowServiceRequests || !data.settings.permissions.requestService)) {
    return (
      <p className="rounded-2xl border border-stone-200 bg-white p-6 text-base text-stone-600">
        Service requests are not enabled for your account. Contact your lighting company for help.
      </p>
    );
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, 6 - photos.length)) {
        if (!file.type.startsWith('image/')) {
          toast('Please choose an image', 'error');
          continue;
        }
        const compressed = await compressImage(file);
        const uploaded = await upload.mutateAsync({
          token,
          dataBase64: compressed.base64,
          contentType: compressed.contentType,
          filename: compressed.filename,
        });
        setPhotos((prev) => [...prev, { url: uploaded.url, preview: URL.createObjectURL(file) }]);
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Upload failed', 'error');
    } finally {
      setUploading(false);
      if (cameraRef.current) cameraRef.current.value = '';
      if (libraryRef.current) libraryRef.current.value = '';
    }
  }

  return (
    <>
      <form
        id="service-form"
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit.mutate({
            token,
            title: title || CATEGORIES.find((c) => c.value === category)?.label || 'Service request',
            description,
            category,
            propertyId: propertyId || undefined,
            priority,
            locationNote: locationNote || undefined,
            accessInstructions: accessInstructions || undefined,
            photoUrls: photos.map((p) => p.url),
          });
        }}
      >
        {(data?.properties?.length ?? 0) > 0 && (
          <label className="block text-base">
            <span className="font-semibold">Property</span>
            <select className="input mt-1 min-h-11 w-full text-base" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
              <option value="">Select property</option>
              {data!.properties.map((p) => (
                <option key={p.id} value={p.id}>{p.label} — {p.addressLine1}, {p.city}</option>
              ))}
            </select>
          </label>
        )}

        <div>
          <p className="font-semibold text-base">Issue category</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                className={`min-h-12 rounded-xl border px-3 text-sm font-semibold ${
                  category === c.value ? 'border-red-600 bg-red-50 text-red-900' : 'border-stone-200 bg-white text-stone-800'
                }`}
                onClick={() => setCategory(c.value)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="font-semibold text-base">Photos</p>
          <p className="mt-1 text-sm text-stone-500">Take a photo first — it helps us diagnose faster.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className="btn-primary min-h-11 flex-1 text-base" disabled={uploading || photos.length >= 6} onClick={() => cameraRef.current?.click()}>
              {uploading ? 'Uploading…' : 'Take photo'}
            </button>
            <button type="button" className="btn-secondary min-h-11 flex-1 text-base" disabled={uploading || photos.length >= 6} onClick={() => libraryRef.current?.click()}>
              Upload
            </button>
          </div>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => void handleFiles(e.target.files)} />
          <input ref={libraryRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => void handleFiles(e.target.files)} />
          {photos.length > 0 && (
            <ul className="mt-3 grid grid-cols-3 gap-2">
              {photos.map((p, idx) => (
                <li key={p.url} className="relative aspect-square overflow-hidden rounded-xl border border-stone-200">
                  <img src={p.preview || p.url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    className="absolute right-1 top-1 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white"
                    onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <label className="block text-base">
          <span className="font-semibold">Short description</span>
          <textarea
            className="input mt-1 min-h-[100px] w-full text-base"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What’s wrong?"
            required
          />
        </label>

        <label className="block text-base">
          <span className="font-semibold">Where on the property?</span>
          <input className="input mt-1 min-h-11 w-full text-base" value={locationNote} onChange={(e) => setLocationNote(e.target.value)} placeholder="e.g. Front left eaves" />
        </label>

        <div>
          <p className="font-semibold text-base">Urgency</p>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {URGENCY.map((u) => (
              <button
                key={u.value}
                type="button"
                className={`min-h-11 rounded-xl border text-sm font-semibold ${
                  priority === u.value ? 'border-red-600 bg-red-50 text-red-900' : 'border-stone-200 bg-white'
                }`}
                onClick={() => setPriority(u.value)}
              >
                {u.label}
              </button>
            ))}
          </div>
        </div>

        <label className="block text-base">
          <span className="font-semibold">Access instructions</span>
          <input className="input mt-1 min-h-11 w-full text-base" value={accessInstructions} onChange={(e) => setAccessInstructions(e.target.value)} placeholder="Gate code, dog, parking…" />
        </label>

        <label className="block text-base">
          <span className="font-semibold">Summary title (optional)</span>
          <input className="input mt-1 min-h-11 w-full text-base" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Auto-filled from category if blank" />
        </label>
      </form>

      {(history?.length ?? 0) > 0 && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900">Your requests</h2>
          <ul className="mt-3 space-y-3">
            {history!.map((item) => (
              <li key={item.id} className="border-b border-stone-100 pb-3 last:border-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-stone-900">{item.title}</p>
                  <PortalStatusPill>{item.status.replace(/_/g, ' ')}</PortalStatusPill>
                </div>
                <p className="mt-1 text-sm text-stone-500">{formatDate(item.createdAt)}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <PortalStickyBar>
        <button
          type="submit"
          form="service-form"
          className="btn-primary inline-flex min-h-11 w-full items-center justify-center text-base"
          disabled={submit.isPending || uploading || !description.trim()}
        >
          {submit.isPending ? 'Submitting…' : 'Submit request'}
        </button>
      </PortalStickyBar>
    </>
  );
}
