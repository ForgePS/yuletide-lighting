'use client';

import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { LoadingState, EmptyState } from '@/components/ui/states';

export function CrewStatsCards() {
  const { data, isLoading } = trpc.crew360.dashboard.useQuery();
  if (isLoading || !data) return <LoadingState message="Loading crew stats..." />;

  const cards = [
    { label: 'Jobs today', value: String(data.jobsToday) },
    { label: 'In progress', value: String(data.jobsInProgress) },
    { label: 'Completed today', value: String(data.jobsCompletedToday) },
    { label: 'Active crews', value: String(data.activeCrews) },
    { label: 'Open issues', value: String(data.openIssues) },
    { label: 'Photos today', value: String(data.photosUploadedToday) },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((c) => (
        <div key={c.label} className="card p-4">
          <p className="text-xs text-muted-foreground">{c.label}</p>
          <p className="mt-1 text-lg font-semibold">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

export function CrewJobsTable() {
  const { data, isLoading } = trpc.crew360.jobs.today.useQuery({});

  if (isLoading) return <LoadingState message="Loading crew jobs..." />;
  if (!data?.length) {
    return (
      <EmptyState
        title="No crew jobs scheduled today"
        description="Scheduled installs and takedowns appear here with checklist progress from the field."
      />
    );
  }

  return (
    <div className="card overflow-hidden">
      <table className="data-table">
        <thead>
          <tr>
            <th>Job</th>
            <th>Customer</th>
            <th>Property</th>
            <th>Time</th>
            <th>Checklist</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => {
            const done = row.checklist.filter((c) => c.done).length;
            return (
              <tr key={row.job.id}>
                <td className="font-medium">{row.job.title}</td>
                <td>{row.customer.businessName || `${row.customer.firstName} ${row.customer.lastName}`.trim()}</td>
                <td className="text-muted-foreground">{row.property.addressLine1}, {row.property.city}</td>
                <td className="text-muted-foreground">
                  {row.job.scheduledStart?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) ?? '—'}
                </td>
                <td>{done}/{row.checklist.length}</td>
                <td>
                  <Link href={`/app/crew/jobs/${row.job.id}`} className="text-xs text-primary hover:underline">View</Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function CrewDashboard() {
  return (
    <div className="space-y-6">
      <CrewStatsCards />
      <CrewJobsTable />
    </div>
  );
}
