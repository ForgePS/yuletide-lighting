'use client';

import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/lib/firebase-auth';
import { LoadingState } from '@/components/ui/states';
import { useToast } from '@/lib/toast';
import { Navigation, Camera } from 'lucide-react';

export function FieldJobDetail({ jobId }: { jobId: string }) {
  const { idToken, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const ready = !authLoading && !!idToken;
  const { data, isLoading, refetch } = trpc.crew.getJob.useQuery({ jobId }, { enabled: ready });

  const complete = trpc.crew.completeJob.useMutation({
    onSuccess: () => { toast('Job completed', 'success'); refetch(); },
    onError: (e) => toast(e.message, 'error'),
  });

  if (!ready || isLoading || !data) return <LoadingState message="Loading job..." />;

  const address = `${data.property.addressLine1}, ${data.property.city}, ${data.property.state}`;
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;

  return (
    <div className="space-y-4">
      <Link href="/app/field" className="text-sm text-primary hover:underline">← Today</Link>
      <div>
        <h1 className="text-xl font-bold">{data.job.title}</h1>
        <p className="text-sm text-muted-foreground">
          {data.customer.firstName} {data.customer.lastName}
        </p>
      </div>

      <div className="card p-4">
        <p className="font-medium">{address}</p>
        {data.customer.phone && (
          <a href={`tel:${data.customer.phone}`} className="mt-2 inline-block text-sm text-primary">
            {data.customer.phone}
          </a>
        )}
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="btn-primary mt-3 w-full">
          <Navigation className="h-4 w-4" />
          Navigate
        </a>
      </div>

      <div className="card p-4">
        <h2 className="font-semibold">Checklist</h2>
        <ul className="mt-3 space-y-2">
          {data.checklist.map((item) => (
            <li key={item.id} className="flex items-center gap-2 text-sm">
              <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${item.done ? 'bg-green-100 text-green-800' : 'bg-muted'}`}>
                {item.done ? '✓' : '·'}
              </span>
              {item.label}
            </li>
          ))}
        </ul>
      </div>

      {data.materials.length > 0 && (
        <div className="card p-4">
          <h2 className="font-semibold">Materials</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {data.materials.map((m) => (
              <li key={m.id} className="flex justify-between">
                <span>{m.name}</span>
                <span className="text-muted-foreground">×{m.quantity}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Link href={`/app/field/signs/add?jobId=${jobId}`} className="btn-secondary w-full">
          <Camera className="h-4 w-4" />
          Log marketing sign
        </Link>
        <button
          type="button"
          className="btn-primary w-full"
          disabled={complete.isPending}
          onClick={() => complete.mutate({ jobId })}
        >
          Mark job complete
        </button>
      </div>
    </div>
  );
}
