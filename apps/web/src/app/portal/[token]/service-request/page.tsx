'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { LoadingState, ErrorState } from '@/components/ui/states';

const CATEGORIES = [
  { value: 'lights_out', label: 'Lights out / section dark' },
  { value: 'timer_issue', label: 'Timer issue' },
  { value: 'damage', label: 'Damage' },
  { value: 'loose_material', label: 'Loose material' },
  { value: 'weather_related', label: 'Weather related' },
  { value: 'customer_request', label: 'Other request' },
];

export default function PortalServiceRequestPage() {
  const rawToken = useParams().token as string;
  const token = decodeURIComponent(rawToken ?? '').trim();
  const looksLikePlaceholderToken = /^\{.+\}$/.test(token) || token.toLowerCase() === 'token';
  const router = useRouter();
  const { toast } = useToast();
  const { data, isLoading, isError } = trpc.portal360.public.dashboard.useQuery(
    { token },
    { enabled: !looksLikePlaceholderToken && token.length >= 8 },
  );
  const submit = trpc.portal360.public.submitServiceRequest.useMutation({
    onSuccess: () => {
      toast('Service request submitted', 'success');
      router.push(`/portal/${token}`);
    },
    onError: (e) => toast(e.message, 'error'),
  });

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('customer_request');
  const [propertyId, setPropertyId] = useState('');

  if (looksLikePlaceholderToken) {
    return (
      <div className="mesh-bg flex min-h-screen items-center justify-center p-4">
        <ErrorState message="This link still contains a placeholder token. Open the full portal link from your invite, or paste your access code at /portal/login." />
      </div>
    );
  }
  if (isLoading) return <LoadingState message="Loading..." />;
  if (isError || !data) {
    return (
      <div className="mesh-bg flex min-h-screen items-center justify-center p-4">
        <ErrorState message="Portal access not found or disabled. Check your link or contact your provider." />
      </div>
    );
  }

  return (
    <div className="mesh-bg min-h-screen py-8">
      <div className="card mx-auto max-w-lg p-6">
        <Link href={`/portal/${token}`} className="text-sm text-primary hover:underline">← Back to portal</Link>
        <h1 className="mt-4 text-xl font-bold">Request service</h1>
        <p className="mt-1 text-sm text-muted-foreground">Describe the issue and we&apos;ll schedule a visit.</p>

        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit.mutate({ token, title, description, category, propertyId: propertyId || undefined });
          }}
        >
          <label className="block text-sm">
            <span className="font-medium">Issue summary</span>
            <input className="input mt-1 w-full" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Category</span>
            <select className="input mt-1 w-full" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </label>
          {data?.properties && data.properties.length > 0 && (
            <label className="block text-sm">
              <span className="font-medium">Property (optional)</span>
              <select className="input mt-1 w-full" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
                <option value="">—</option>
                {data.properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.label} — {p.addressLine1}, {p.city}</option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-sm">
            <span className="font-medium">Details</span>
            <textarea className="input mt-1 min-h-[120px] w-full" value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <button type="submit" className="btn-primary w-full" disabled={submit.isPending}>
            {submit.isPending ? 'Submitting…' : 'Submit request'}
          </button>
        </form>
      </div>
    </div>
  );
}
