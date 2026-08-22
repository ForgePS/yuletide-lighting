'use client';

import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/lib/firebase-auth';
import { LoadingState, EmptyState } from '@/components/ui/states';
import { useToast } from '@/lib/toast';
import { Navigation, Play, CheckCircle2 } from 'lucide-react';

export function FieldTodayJobs() {
  const { idToken, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const ready = !authLoading && !!idToken;
  const { data, isLoading, refetch } = trpc.crew.mySchedule.useQuery(
    { date: new Date().toISOString() },
    { enabled: ready, staleTime: 30_000 },
  );

  const clockIn = trpc.crew.clockIn.useMutation({
    onSuccess: () => { toast('Clocked in', 'success'); refetch(); },
    onError: (e) => toast(e.message, 'error'),
  });
  const complete = trpc.crew.completeJob.useMutation({
    onSuccess: () => { toast('Job completed', 'success'); refetch(); },
    onError: (e) => toast(e.message, 'error'),
  });
  const start = trpc.crew.startJob.useMutation({
    onSuccess: () => { toast('Job started', 'success'); refetch(); },
    onError: (e) => toast(e.message, 'error'),
  });

  if (!ready || isLoading) return <LoadingState message="Loading today's jobs..." />;

  if (!data?.length) {
    return (
      <EmptyState
        title="No jobs today"
        description="Your scheduled installs and service calls will appear here."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Today&apos;s jobs</h1>
        <p className="text-sm text-muted-foreground">{data.length} scheduled</p>
      </div>

      {data.map((item) => {
        const address = `${item.property.addressLine1}, ${item.property.city}`;
        const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
        return (
          <article key={item.job.id} className="card space-y-3 p-4">
            <div>
              <h2 className="font-semibold">{item.job.title}</h2>
              <p className="text-sm text-muted-foreground">
                {item.customer.firstName} {item.customer.lastName}
              </p>
              <p className="mt-1 text-sm">{address}</p>
              {item.job.scheduledStart && (
                <p className="mt-1 text-sm font-medium text-primary">
                  {new Date(item.job.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary flex-1 text-sm">
                <Navigation className="h-4 w-4" />
                Navigate
              </a>
              <Link href={`/app/field/jobs/${item.job.id}`} className="btn-secondary flex-1 text-center text-sm">
                Details
              </Link>
            </div>

            <div className="flex flex-wrap gap-2 border-t pt-3">
              <button
                type="button"
                className="btn-secondary flex-1 text-sm"
                disabled={clockIn.isPending}
                onClick={() => {
                  navigator.geolocation.getCurrentPosition(
                    (pos) => clockIn.mutate({
                      jobId: item.job.id,
                      clockIn: new Date().toISOString(),
                      latitude: pos.coords.latitude,
                      longitude: pos.coords.longitude,
                    }),
                    () => clockIn.mutate({ jobId: item.job.id, clockIn: new Date().toISOString() }),
                  );
                }}
              >
                Clock in
              </button>
              <button
                type="button"
                className="btn-secondary flex-1 text-sm"
                disabled={start.isPending}
                onClick={() => start.mutate({ jobId: item.job.id })}
              >
                <Play className="h-4 w-4" />
                Start
              </button>
              <button
                type="button"
                className="btn-primary flex-1 text-sm"
                disabled={complete.isPending}
                onClick={() => complete.mutate({ jobId: item.job.id })}
              >
                <CheckCircle2 className="h-4 w-4" />
                Done
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
