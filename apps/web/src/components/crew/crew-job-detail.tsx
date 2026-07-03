'use client';

import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { LoadingState } from '@/components/ui/states';
import { AuthenticatedImage } from '@/components/authenticated-image';

export function CrewJobDetail({ jobId }: { jobId: string }) {
  const { data, isLoading } = trpc.crew360.jobs.detail.useQuery({ jobId });

  if (isLoading || !data) return <LoadingState message="Loading crew job..." />;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app/crew" className="text-sm text-muted-foreground hover:text-primary">← Crew hub</Link>
        <h1 className="mt-1 text-2xl font-bold">{data.job.title}</h1>
        <p className="text-muted-foreground">
          {data.customer.businessName || `${data.customer.firstName} ${data.customer.lastName}`.trim()} · {data.property.addressLine1}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-semibold">Field checklist</h2>
          <ul className="mt-4 space-y-2">
            {data.checklist.map((item) => (
              <li key={item.id} className="flex items-center gap-2 text-sm">
                <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${item.done ? 'bg-green-100 text-green-800' : 'bg-muted text-muted-foreground'}`}>
                  {item.done ? '✓' : '·'}
                </span>
                {item.label}
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-6">
          <h2 className="font-semibold">Materials</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {data.materials.map((m) => (
              <li key={m.id} className="flex justify-between border-b border-dashed py-1">
                <span>{m.name}</span>
                <span className="text-muted-foreground">×{m.quantity}</span>
              </li>
            ))}
            {!data.materials.length && <li className="text-muted-foreground">No materials reserved.</li>}
          </ul>
        </div>
      </div>

      {data.photos.length > 0 && (
        <div className="card p-6">
          <h2 className="mb-4 font-semibold">Field photos</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {data.photos.map((photo) => (
              <div key={photo.id} className="aspect-square overflow-hidden rounded-lg border">
                <AuthenticatedImage value={photo.url} alt="" className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-6">
        <h2 className="font-semibold">Activity log</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {data.activity.map((a) => (
            <li key={a.id} className="flex justify-between border-b border-dashed pb-2">
              <span className="capitalize">{a.action.replace(/_/g, ' ')}</span>
              <span className="text-muted-foreground">{a.createdAt.toLocaleString()}</span>
            </li>
          ))}
          {!data.activity.length && <li className="text-muted-foreground">No field activity yet.</li>}
        </ul>
      </div>
    </div>
  );
}
