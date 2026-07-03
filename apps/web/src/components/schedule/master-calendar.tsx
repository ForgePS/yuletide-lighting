'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { categoryLabel } from '@/lib/schedule-utils';
import { formatDate } from '@clcrm/ui';
import { useToast } from '@/lib/toast';
import { LoadingState, EmptyState } from '@/components/ui/states';
import { WeatherRiskBadge } from '@/components/jobs';
import type { CalendarEvent } from '@clcrm/types';

type ViewMode = 'week' | 'month' | 'agenda';

function EventCard({ event, onDragStart }: { event: CalendarEvent; onDragStart: () => void }) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="cursor-grab rounded border-l-4 bg-white p-2 text-xs shadow-sm"
      style={{ borderLeftColor: event.color }}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="font-medium">{event.title}</p>
        <WeatherRiskBadge risk={event.weatherRisk} className="shrink-0 scale-90" />
      </div>
      <p className="text-muted-foreground capitalize">{categoryLabel(event.category)}</p>
      {event.propertyAddress && <p className="truncate text-muted-foreground">{event.propertyAddress}</p>}
      {event.crewName && <p className="text-muted-foreground">{event.crewName}</p>}
    </div>
  );
}

export function MasterCalendar() {
  const [view, setView] = useState<ViewMode>('week');
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const start = new Date(); start.setDate(1);
  const end = new Date(start); end.setMonth(end.getMonth() + 1);

  const { data: events, isLoading } = trpc.schedule360.events.list.useQuery({ start, end });
  const { data: crews } = trpc.schedule360.crews.list.useQuery();
  const move = trpc.schedule360.events.move.useMutation({
    onSuccess: (r) => {
      toast(r.conflicts.length ? `Moved with ${r.conflicts.length} conflict(s)` : 'Appointment moved', r.conflicts.length ? 'error' : 'success');
      utils.schedule360.invalidate();
    },
    onError: (e) => toast(e.message, 'error'),
  });
  const create = trpc.schedule360.events.create.useMutation({
    onSuccess: () => { toast('Appointment created', 'success'); utils.schedule360.invalidate(); },
    onError: (e) => toast(e.message, 'error'),
  });

  const [dragId, setDragId] = useState<string | null>(null);

  if (isLoading) return <LoadingState message="Loading calendar..." />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(['week', 'month', 'agenda'] as ViewMode[]).map((v) => (
          <button key={v} type="button" className={view === v ? 'btn-primary capitalize' : 'btn-secondary capitalize'} onClick={() => setView(v)}>{v}</button>
        ))}
        <button type="button" className="btn-primary ml-auto" onClick={() => create.mutate({
          title: 'New estimate visit',
          appointmentType: 'estimate_visit',
          startAt: new Date(Date.now() + 86400000),
        })}>+ New appointment</button>
      </div>

      {!events?.length ? (
        <EmptyState title="No appointments" description="Create appointments from jobs, proposals, or the wizard." />
      ) : view === 'agenda' ? (
        <div className="space-y-2">
          {events.map((e) => (
            <div key={e.id} className="card flex flex-wrap items-center justify-between gap-2 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{e.title}</p>
                  <WeatherRiskBadge risk={e.weatherRisk} />
                </div>
                <p className="text-sm text-muted-foreground">{formatDate(e.startAt)} — {formatDate(e.endAt)}</p>
                {e.propertyAddress && <p className="text-xs text-muted-foreground">{e.propertyAddress}</p>}
                {e.crewName && <p className="text-xs text-muted-foreground">Crew: {e.crewName}</p>}
              </div>
              <span className="rounded-full px-2 py-0.5 text-xs capitalize" style={{ backgroundColor: `${e.color}20`, color: e.color }}>{categoryLabel(e.category)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div
          className="grid gap-4 md:grid-cols-7"
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (!dragId) return;
            const event = events.find((x) => x.id === dragId);
            if (!event) return;
            const newStart = new Date(event.startAt);
            newStart.setDate(newStart.getDate() + 1);
            const duration = event.endAt.getTime() - event.startAt.getTime();
            move.mutate({ eventId: dragId, startAt: newStart, endAt: new Date(newStart.getTime() + duration) });
            setDragId(null);
          }}
        >
          {Array.from({ length: view === 'week' ? 7 : 28 }).map((_, i) => {
            const day = new Date(start);
            day.setDate(day.getDate() + i);
            const dayEvents = events.filter((e) => e.startAt.toDateString() === day.toDateString());
            return (
              <div key={i} className="min-h-[120px] rounded-lg border bg-muted/20 p-2">
                <p className="mb-2 text-xs font-medium">{day.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                <div className="space-y-1">
                  {dayEvents.map((e) => (
                    <EventCard key={e.id} event={e} onDragStart={() => setDragId(e.id)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {crews && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold">Crew lanes (drag to reassign)</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {crews.map((c) => (
              <span key={c.id} className="rounded-full bg-muted px-3 py-1 text-xs">{c.name} · {c.utilizationPercent}%</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function CalendarEventModal({ eventId }: { eventId?: string }) {
  const { data } = trpc.schedule360.events.getById.useQuery({ eventId: eventId! }, { enabled: !!eventId });
  if (!data) return null;
  return (
    <div className="card p-4 text-sm">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold">{data.title}</h3>
        <WeatherRiskBadge risk={data.weatherRisk} />
      </div>
      <p className="capitalize text-muted-foreground">{categoryLabel(data.category)} · {data.dispatchStatus.replace(/_/g, ' ')}</p>
      {data.customerName && <p className="mt-2">{data.customerName}</p>}
      {data.propertyAddress && <p className="text-muted-foreground">{data.propertyAddress}</p>}
      {data.crewName && <p className="text-muted-foreground">Crew: {data.crewName}</p>}
    </div>
  );
}
