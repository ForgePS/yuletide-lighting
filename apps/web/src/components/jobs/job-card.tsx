'use client';

import Link from 'next/link';
import { formatStage } from '@clcrm/ui';
import { WeatherRiskBadge } from './weather-risk-badge';

type JobCardProps = {
  job: {
    id: string;
    title: string;
    stage: string;
    customerId?: string;
    scheduledStart?: Date | string | null;
  };
  customerName?: string | null;
  propertyAddress?: string | null;
  installComplexity?: string | null;
  weatherRisk?: boolean;
  crewName?: string | null;
  onSchedule?: () => void;
};

export function JobCard({
  job,
  customerName,
  propertyAddress,
  installComplexity,
  weatherRisk,
  crewName,
  onSchedule,
}: JobCardProps) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/app/jobs/${job.id}`} className="font-medium hover:text-primary hover:underline">
          {job.title}
        </Link>
        <WeatherRiskBadge risk={weatherRisk} />
      </div>
      {customerName && <p className="mt-1 text-sm text-muted-foreground">{customerName}</p>}
      {propertyAddress && <p className="text-xs text-muted-foreground">{propertyAddress}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-muted px-2 py-0.5">{formatStage(job.stage)}</span>
        {installComplexity && (
          <span className="rounded-full bg-muted px-2 py-0.5 capitalize">{installComplexity.replace(/_/g, ' ')}</span>
        )}
        {crewName && <span className="text-muted-foreground">{crewName}</span>}
      </div>
      {job.scheduledStart && (
        <p className="mt-2 text-xs text-muted-foreground">
          Scheduled: {new Date(job.scheduledStart).toLocaleString()}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {onSchedule && ['accepted_proposal', 'deposit_paid', 'inventory_reserved'].includes(job.stage) && (
          <button type="button" onClick={onSchedule} className="text-xs text-primary hover:underline">
            Schedule
          </button>
        )}
        <Link href={`/app/jobs/${job.id}`} className="text-xs text-muted-foreground hover:underline">
          View details
        </Link>
      </div>
    </div>
  );
}
