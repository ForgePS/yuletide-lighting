'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { DISPATCH_STATUS_COLORS, formatCurrency } from '@/lib/schedule-utils';
import { formatDate } from '@clcrm/ui';
import { useToast } from '@/lib/toast';
import { LoadingState, EmptyState } from '@/components/ui/states';
import { CrewManager } from './crew-manager';

export function DispatchBoard() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.schedule360.dispatch.list.useQuery(undefined, { refetchInterval: 30000 });
  const update = trpc.schedule360.dispatch.update.useMutation({
    onSuccess: () => { toast('Dispatch updated', 'success'); utils.schedule360.dispatch.list.invalidate(); },
    onError: (e) => toast(e.message, 'error'),
  });

  if (isLoading) return <LoadingState message="Loading dispatch board..." />;
  if (!data?.length) return <EmptyState title="No dispatch entries" description="Schedule jobs to populate the dispatch board." />;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {data.map((entry) => (
        <div key={entry.id} className="card p-4">
          <div className="flex items-start justify-between">
            <h3 className="font-semibold">{entry.crewName}</h3>
            <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${DISPATCH_STATUS_COLORS[entry.status] ?? ''}`}>{entry.status.replace(/_/g, ' ')}</span>
          </div>
          <div className="mt-3 space-y-2 text-sm">
            <p><span className="text-muted-foreground">Current:</span> {entry.currentJobTitle ?? '—'}</p>
            <p><span className="text-muted-foreground">Next:</span> {entry.nextJobTitle ?? '—'}</p>
            {entry.eta && <p><span className="text-muted-foreground">ETA:</span> {formatDate(entry.eta)}</p>}
            <div className="h-2 rounded-full bg-muted">
              <div className="h-2 rounded-full bg-primary" style={{ width: `${entry.completionPercent}%` }} />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {(['en_route', 'arrived', 'working', 'completed'] as const).map((s) => (
              <button key={s} type="button" className="btn-secondary text-xs capitalize" onClick={() => update.mutate({ dispatchId: entry.id, status: s })}>{s.replace(/_/g, ' ')}</button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function CrewScheduler() {
  return <CrewManager />;
}

export function RoutePlanner() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const today = new Date();
  const { data: events } = trpc.schedule360.events.list.useQuery({ start: today, end: new Date(today.getTime() + 86400000) });
  const { data: routes, isLoading } = trpc.schedule360.routes.list.useQuery({ date: today });
  const optimize = trpc.schedule360.routes.optimize.useMutation({
    onSuccess: () => { toast('Route optimized', 'success'); utils.schedule360.routes.list.invalidate(); },
    onError: (e) => toast(e.message, 'error'),
  });

  if (isLoading) return <LoadingState />;
  return (
    <div className="space-y-6">
      <button type="button" className="btn-primary" disabled={!events?.length || optimize.isPending} onClick={() => optimize.mutate({ routeDate: today, eventIds: events!.map((e) => e.id) })}>
        Optimize today&apos;s routes
      </button>
      {!routes?.length ? <EmptyState title="No routes planned" description="Optimize routes from today's scheduled events." /> : (
        routes.map((route) => (
          <div key={route.id} className="card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">{route.crewName ?? 'Route'} — {formatDate(route.routeDate)}</h3>
              <span className="text-sm">Efficiency: {route.efficiencyScore}% · {route.totalDistanceMiles} mi · {route.totalTravelMinutes} min travel</span>
            </div>
            <ol className="mt-4 space-y-2 text-sm">
              {route.stops.map((stop) => (
                <li key={stop.id} className="flex gap-3 border-b py-2">
                  <span className="font-medium text-muted-foreground">{stop.order}.</span>
                  <div>
                    <p>{stop.customerName ?? 'Stop'}</p>
                    <p className="text-muted-foreground">{stop.address ?? '—'} · {stop.travelMinutes} min travel</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ))
      )}
    </div>
  );
}

export function ResourceScheduler() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data: events } = trpc.schedule360.events.list.useQuery(undefined);
  const { data: resources, isLoading } = trpc.schedule360.resources.list.useQuery();
  const { data: vehicles } = trpc.schedule360.vehicles.list.useQuery();
  const reserve = trpc.schedule360.resources.reserve.useMutation({
    onSuccess: () => { toast('Resource reserved', 'success'); utils.schedule360.resources.list.invalidate(); },
    onError: (e) => toast(e.message, 'error'),
  });

  if (isLoading) return <LoadingState />;
  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-4 font-semibold">Vehicles</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {vehicles?.map((v) => (
            <div key={v.id} className={`card p-4 ${v.isAvailable ? '' : 'opacity-60'}`}>
              <p className="font-medium">{v.name}</p>
              <p className="text-xs capitalize text-muted-foreground">{v.vehicleType.replace(/_/g, ' ')}</p>
            </div>
          ))}
        </div>
      </div>
      <form className="card space-y-4 p-6" onSubmit={(e) => {
        e.preventDefault();
        const eventId = events?.[0]?.id;
        if (!eventId) return;
        const start = events[0]!.startAt;
        reserve.mutate({ resourceName: 'Lift Equipment', resourceType: 'lift', eventId, startAt: start, endAt: events[0]!.endAt });
      }}>
        <h2 className="font-semibold">Reserve resource</h2>
        <button type="submit" className="btn-primary" disabled={!events?.length || reserve.isPending}>Reserve lift for first event</button>
      </form>
      {resources?.length ? (
        <table className="data-table w-full">
          <thead><tr><th>Resource</th><th>Type</th><th>Event</th><th>Start</th><th>End</th></tr></thead>
          <tbody>
            {resources.map((r) => (
              <tr key={r.id}><td>{r.resourceName}</td><td className="capitalize">{r.resourceType}</td><td>{r.eventId.slice(0, 8)}…</td><td>{formatDate(r.startAt)}</td><td>{formatDate(r.endAt)}</td></tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}

export function SeasonalPlanner() {
  const { data: plan } = trpc.schedule360.seasonPlan.useQuery();
  const { data: analytics } = trpc.schedule360.analytics.useQuery();
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plan?.map((entry) => (
          <div key={entry.phase} className="card p-4">
            <p className="text-sm font-semibold">{entry.month} — {entry.label}</p>
            <p className="mt-2 text-2xl font-bold">{entry.projectedJobs} jobs</p>
            <p className="text-sm text-muted-foreground">{formatCurrency(entry.projectedRevenueCents)} projected</p>
            <div className="mt-3 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${entry.capacityPercent}%` }} /></div>
            <p className="mt-1 text-xs text-muted-foreground">{entry.capacityPercent}% capacity</p>
          </div>
        ))}
      </div>
      {analytics && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card p-4"><p className="text-xs text-muted-foreground">On-time arrival</p><p className="text-lg font-semibold">{analytics.onTimeArrivalPercent}%</p></div>
          <div className="card p-4"><p className="text-xs text-muted-foreground">Schedule efficiency</p><p className="text-lg font-semibold">{analytics.scheduleEfficiencyPercent}%</p></div>
          <div className="card p-4"><p className="text-xs text-muted-foreground">Revenue/crew</p><p className="text-lg font-semibold">{formatCurrency(analytics.revenuePerCrewCents)}</p></div>
          <div className="card p-4"><p className="text-xs text-muted-foreground">Revenue/day</p><p className="text-lg font-semibold">{formatCurrency(analytics.revenuePerDayCents)}</p></div>
        </div>
      )}
    </div>
  );
}

export function NotificationManager() {
  const { toast } = useToast();
  const { data: events } = trpc.schedule360.events.list.useQuery(undefined);
  const notify = trpc.schedule360.events.notify.useMutation({
    onSuccess: () => toast('Notification sent', 'success'),
    onError: (e) => toast(e.message, 'error'),
  });

  const types = [
    { key: 'confirmation' as const, label: 'Booking confirmation' },
    { key: 'reminder_48h' as const, label: '48-hour reminder' },
    { key: 'reminder_24h' as const, label: '24-hour reminder' },
    { key: 'crew_en_route' as const, label: 'Crew en route' },
    { key: 'completion' as const, label: 'Completion notice' },
  ];

  return (
    <div className="space-y-4">
      {events?.slice(0, 8).map((event) => (
        <div key={event.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="font-medium">{event.title}</p>
            <p className="text-sm text-muted-foreground">{formatDate(event.startAt)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {types.map((t) => (
              <button key={t.key} type="button" className="btn-secondary text-xs" onClick={() => notify.mutate({ eventId: event.id, type: t.key })}>{t.label}</button>
            ))}
          </div>
        </div>
      ))}
      {!events?.length && <EmptyState title="No events" description="Schedule appointments to send notifications." />}
    </div>
  );
}

export function AISchedulingAssistant() {
  const [question, setQuestion] = useState('Show available crews Friday');
  const { data, refetch, isFetching } = trpc.schedule360.aiQuery.useQuery({ question }, { enabled: false });
  const { toast } = useToast();

  return (
    <div className="card space-y-4 p-6">
      <h2 className="font-semibold">AI Scheduling Assistant</h2>
      <div className="flex gap-2">
        <input className="input flex-1" value={question} onChange={(e) => setQuestion(e.target.value)} />
        <button type="button" className="btn-primary" disabled={isFetching} onClick={() => refetch().then(() => toast('Query complete'))}>Ask</button>
      </div>
      {data && (
        <div className="space-y-3 text-sm">
          <p>{data.answer}</p>
          {data.recommendations.map((r) => <p key={r} className="text-muted-foreground">• {r}</p>)}
          {data.events.slice(0, 5).map((e) => (
            <div key={e.id} className="flex justify-between border-t py-2">
              <span>{e.title}</span>
              <span className="text-muted-foreground">{e.crewName ?? 'Unassigned'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AvailabilityView() {
  const { data: crews } = trpc.schedule360.crews.list.useQuery();
  const { data: templates } = trpc.schedule360.templates.list.useQuery();
  return (
    <div className="space-y-8">
      <CrewScheduler />
      <div>
        <h2 className="mb-4 font-semibold">Schedule templates</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {templates?.map((t) => (
            <div key={t.id} className="card p-4 text-sm">
              <p className="font-medium">{t.name}</p>
              <p className="text-muted-foreground">{t.estimatedLaborHours}h · {t.crewSize} crew · {t.equipmentRequired.join(', ')}</p>
            </div>
          ))}
        </div>
      </div>
      <AISchedulingAssistant />
    </div>
  );
}
