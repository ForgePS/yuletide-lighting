'use client';

import { useMemo, useState } from 'react';
import { keepPreviousData } from '@tanstack/react-query';
import { Ban, ChevronLeft, ChevronRight } from 'lucide-react';
import { dateKeyInTimeZone, findBlackoutForDateKey } from '@clcrm/types';
import { trpc } from '@/lib/trpc';
import { AppointmentDetailsDialog, AppointmentDialog } from './appointment-dialog';
import { BlackoutDialog, formatBlackoutRange } from './blackout-dialog';
import { categoryLabel } from '@/lib/schedule-utils';
import { formatDate } from '@clcrm/ui';
import { useToast } from '@/lib/toast';
import { LoadingState, EmptyState } from '@/components/ui/states';
import { WeatherRiskBadge } from '@/components/jobs';
import type { CalendarEvent } from '@clcrm/types';

type ViewMode = 'week' | 'month' | 'agenda';

type EventItemProps = { event: CalendarEvent; onDragStart: () => void; onOpen: () => void };

function EventCard({ event, onDragStart, onOpen }: EventItemProps) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onOpen}
      className="cursor-pointer rounded border-l-4 bg-white p-2 text-xs shadow-sm hover:shadow"
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

function EventChip({ event, onDragStart, onOpen }: EventItemProps) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onOpen}
      title={`${event.title}${event.propertyAddress ? ` · ${event.propertyAddress}` : ''}`}
      className="cursor-pointer truncate rounded px-1.5 py-0.5 text-[11px] font-medium hover:brightness-95"
      style={{ backgroundColor: `${event.color}20`, color: event.color }}
    >
      <span className="mr-1 opacity-75">{event.startAt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</span>
      {event.title}
    </div>
  );
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_CELL_EVENT_LIMIT = 3;

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfWeek(date: Date): Date {
  return addDays(startOfDay(date), -date.getDay());
}

function visibleRange(view: ViewMode, cursor: Date): { start: Date; end: Date; days: Date[] } {
  if (view === 'week') {
    const start = startOfWeek(cursor);
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    return { start, end: addDays(start, 7), days };
  }
  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  if (view === 'agenda') {
    return { start: monthStart, end: new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1), days: [] };
  }
  const start = startOfWeek(monthStart);
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  return { start, end: addDays(start, 42), days };
}

function rangeLabel(view: ViewMode, cursor: Date, days: Date[]): string {
  if (view === 'week' && days.length) {
    const first = days[0]!;
    const last = days[days.length - 1]!;
    const sameMonth = first.getMonth() === last.getMonth();
    const startLabel = first.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const endLabel = last.toLocaleDateString(undefined, sameMonth ? { day: 'numeric' } : { month: 'short', day: 'numeric' });
    return `${startLabel} – ${endLabel}, ${last.getFullYear()}`;
  }
  return cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function MasterCalendar() {
  const [view, setView] = useState<ViewMode>('month');
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const { toast } = useToast();
  const utils = trpc.useUtils();
  // Query keys hash the Date inputs, so the range must only change when the user navigates.
  const range = useMemo(() => visibleRange(view, cursor), [view, cursor]);
  const today = startOfDay(new Date());

  const { data: events, isLoading } = trpc.schedule360.events.list.useQuery(
    { start: range.start, end: range.end },
    { placeholderData: keepPreviousData },
  );
  const { data: crews } = trpc.schedule360.crews.list.useQuery();
  const { data: blackoutData } = trpc.schedule360.blackouts.list.useQuery();
  const blackouts = blackoutData ?? [];
  const [appointmentDate, setAppointmentDate] = useState<Date | null>(null);
  const [blackoutOpen, setBlackoutOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const defaultDialogDate = () => {
    if (today >= range.start && today < range.end) return today;
    return view === 'week' ? range.start : new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  };

  const step = (direction: 1 | -1) => {
    setCursor((current) =>
      view === 'week'
        ? addDays(current, 7 * direction)
        : new Date(current.getFullYear(), current.getMonth() + direction, 1),
    );
  };
  const move = trpc.schedule360.events.move.useMutation({
    onSuccess: (r) => {
      toast(r.conflicts.length ? `Moved with ${r.conflicts.length} conflict(s)` : 'Appointment moved', r.conflicts.length ? 'error' : 'success');
      utils.schedule360.invalidate();
    },
    onError: (e) => toast(e.message, 'error'),
  });
  const [dragId, setDragId] = useState<string | null>(null);

  if (isLoading) return <LoadingState message="Loading calendar..." />;

  const allEvents = [...(events ?? [])].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

  const dropOnDay = (day: Date) => {
    if (!dragId) return;
    const event = allEvents.find((x) => x.id === dragId);
    setDragId(null);
    if (!event) return;
    const blocked = findBlackoutForDateKey(blackouts, dateKeyInTimeZone(day));
    if (blocked) {
      toast(`That day is blocked out${blocked.reason ? ` (${blocked.reason})` : ''}.`, 'error');
      return;
    }
    const newStart = new Date(day);
    newStart.setHours(event.startAt.getHours(), event.startAt.getMinutes(), 0, 0);
    if (newStart.getTime() === event.startAt.getTime()) return;
    const duration = event.endAt.getTime() - event.startAt.getTime();
    move.mutate({ eventId: event.id, startAt: newStart, endAt: new Date(newStart.getTime() + duration) });
  };

  return (
    <div className="space-y-4" data-tour="schedule-calendar">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <button type="button" className="btn-secondary px-2" aria-label="Previous" onClick={() => step(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" className="btn-secondary" onClick={() => setCursor(startOfDay(new Date()))}>Today</button>
          <button type="button" className="btn-secondary px-2" aria-label="Next" onClick={() => step(1)}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <h2 className="text-lg font-semibold">{rangeLabel(view, cursor, range.days)}</h2>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {(['month', 'week', 'agenda'] as ViewMode[]).map((v) => (
            <button key={v} type="button" className={view === v ? 'btn-primary capitalize' : 'btn-secondary capitalize'} onClick={() => setView(v)}>{v}</button>
          ))}
          <button type="button" className="btn-secondary" onClick={() => setBlackoutOpen(true)}>
            <Ban className="mr-1 inline h-4 w-4" />
            Block out dates
          </button>
          <button type="button" className="btn-primary" onClick={() => setAppointmentDate(defaultDialogDate())}>+ New appointment</button>
        </div>
      </div>

      {view === 'agenda' && blackouts.some((b) => b.endDate >= dateKeyInTimeZone(range.start) && b.startDate < dateKeyInTimeZone(range.end)) && (
        <div className="space-y-1">
          {blackouts
            .filter((b) => b.endDate >= dateKeyInTimeZone(range.start) && b.startDate < dateKeyInTimeZone(range.end))
            .map((b) => (
              <p key={b.id} className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                Blocked out: {formatBlackoutRange(b)}{b.reason ? ` · ${b.reason}` : ''}
              </p>
            ))}
        </div>
      )}

      {view === 'agenda' ? (
        !allEvents.length ? (
          <EmptyState title="No appointments this month" description="Create appointments from jobs, proposals, or the wizard." />
        ) : (
        <div className="space-y-2">
          {allEvents.map((e) => (
            <div
              key={e.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedEvent(e)}
              onKeyDown={(k) => { if (k.key === 'Enter') setSelectedEvent(e); }}
              className="card flex cursor-pointer flex-wrap items-center justify-between gap-2 p-4 hover:shadow-md"
            >
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
        )
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="grid grid-cols-7 border-b bg-muted/40">
            {WEEKDAYS.map((d) => (
              <div key={d} className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {range.days.map((day, i) => {
              const dayEvents = allEvents.filter((e) => e.startAt.toDateString() === day.toDateString());
              const isToday = day.getTime() === today.getTime();
              const outsideMonth = view === 'month' && day.getMonth() !== cursor.getMonth();
              const shown = view === 'month' ? dayEvents.slice(0, MONTH_CELL_EVENT_LIMIT) : dayEvents;
              const hidden = dayEvents.length - shown.length;
              const blocked = findBlackoutForDateKey(blackouts, dateKeyInTimeZone(day));
              return (
                <div
                  key={day.toISOString()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => dropOnDay(day)}
                  onClick={(e) => {
                    if (blocked || (e.target as HTMLElement).closest('[draggable],button')) return;
                    setAppointmentDate(day);
                  }}
                  title={blocked ? `Blocked out${blocked.reason ? `: ${blocked.reason}` : ''}` : 'Click to add an appointment'}
                  className={[
                    'border-b border-r p-1.5',
                    i % 7 === 6 ? 'border-r-0' : '',
                    view === 'week' ? 'min-h-[22rem]' : 'min-h-[7rem]',
                    blocked
                      ? 'cursor-not-allowed bg-[repeating-linear-gradient(135deg,rgba(239,68,68,0.08)_0,rgba(239,68,68,0.08)_6px,transparent_6px,transparent_12px)]'
                      : 'cursor-pointer hover:bg-muted/20',
                    outsideMonth ? 'bg-muted/30 text-muted-foreground' : '',
                  ].join(' ')}
                >
                  <div className="mb-1 flex items-center justify-between gap-1">
                    {blocked ? (
                      <span className="truncate rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-700">
                        {blocked.reason || 'Blocked'}
                      </span>
                    ) : (
                      <span />
                    )}
                    <span
                      className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-medium ${isToday ? 'bg-primary text-primary-foreground' : ''}`}
                    >
                      {view === 'week' ? day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : day.getDate()}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {shown.map((e) =>
                      view === 'week' ? (
                        <EventCard key={e.id} event={e} onDragStart={() => setDragId(e.id)} onOpen={() => setSelectedEvent(e)} />
                      ) : (
                        <EventChip key={e.id} event={e} onDragStart={() => setDragId(e.id)} onOpen={() => setSelectedEvent(e)} />
                      ),
                    )}
                    {hidden > 0 && (
                      <button type="button" className="px-1 text-[11px] font-medium text-primary hover:underline" onClick={() => { setCursor(day); setView('week'); }}>
                        +{hidden} more
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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

      <AppointmentDialog
        open={!!appointmentDate}
        initialDate={appointmentDate ?? today}
        blackouts={blackouts}
        onClose={() => setAppointmentDate(null)}
      />
      <AppointmentDetailsDialog event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      <BlackoutDialog
        open={blackoutOpen}
        initialDate={defaultDialogDate()}
        blackouts={blackouts}
        onClose={() => setBlackoutOpen(false)}
      />
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
      <p className="capitalize text-muted-foreground">{categoryLabel(data.category)} · {categoryLabel(data.dispatchStatus)}</p>
      {data.customerName && <p className="mt-2">{data.customerName}</p>}
      {data.propertyAddress && <p className="text-muted-foreground">{data.propertyAddress}</p>}
      {data.crewName && <p className="text-muted-foreground">Crew: {data.crewName}</p>}
    </div>
  );
}
