'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';

export default function RoutesPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: jobs } = trpc.jobs.list.useQuery({ stage: 'scheduled' });
  const { data: routes, refetch } = trpc.schedule.getRoutes.useQuery({
    date: today.toISOString(),
  });
  const optimizeRoute = trpc.schedule.optimizeRoute.useMutation({ onSuccess: () => refetch() });

  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);

  function toggleJob(id: string) {
    setSelectedJobs((prev) =>
      prev.includes(id) ? prev.filter((j) => j !== id) : [...prev, id],
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Routes</h1>
      <p className="text-muted-foreground">Optimize daily crew routes</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-6">
          <h2 className="font-semibold">Scheduled jobs</h2>
          <div className="mt-4 space-y-2">
            {jobs?.map((job) => (
              <label key={job.id} className="flex items-center gap-2 rounded-lg border p-3">
                <input
                  type="checkbox"
                  checked={selectedJobs.includes(job.id)}
                  onChange={() => toggleJob(job.id)}
                />
                {job.title}
              </label>
            ))}
          </div>
          <button
            onClick={() =>
              optimizeRoute.mutate({
                routeDate: today.toISOString(),
                jobIds: selectedJobs,
              })
            }
            disabled={selectedJobs.length === 0}
            className="mt-4 btn-primary disabled:opacity-50"
          >
            Optimize route
          </button>
        </div>

        <div className="rounded-xl border bg-white p-6">
          <h2 className="font-semibold">Today&apos;s routes</h2>
          {routes?.map((route) => (
            <div key={route.id} className="mt-4">
              <ol className="list-decimal space-y-2 pl-5 text-sm">
                {route.stops.map((stop) => (
                  <li key={stop.jobId}>
                    {stop.order}. {stop.address}
                  </li>
                ))}
              </ol>
            </div>
          ))}
          {(!routes || routes.length === 0) && (
            <p className="mt-4 text-sm text-muted-foreground">No routes generated yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
