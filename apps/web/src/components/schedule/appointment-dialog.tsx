'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Trash2, X } from 'lucide-react';
import { dateKeyInTimeZone, findBlackoutForDateKey, formatScheduleLabel } from '@clcrm/types';
import type { AppointmentType, CalendarEvent, ScheduleBlackout } from '@clcrm/types';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

const APPOINTMENT_TYPES: AppointmentType[] = [
  'estimate_visit',
  'design_consultation',
  'installation',
  'takedown',
  'service_call',
  'warranty_repair',
  'storage_retrieval',
  'storage_intake',
  'commercial_project',
  'permanent_lighting_install',
  'internal_meeting',
];

function localDateTime(dateKey: string, time: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(y!, m! - 1, d!, hh ?? 0, mm ?? 0, 0, 0);
}

export function AppointmentDetailsDialog({
  event,
  onClose,
}: {
  event: CalendarEvent | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [confirming, setConfirming] = useState(false);
  const remove = trpc.schedule360.events.delete.useMutation({
    onSuccess: () => {
      toast('Appointment deleted', 'success');
      utils.schedule360.invalidate();
      setConfirming(false);
      onClose();
    },
    onError: (e) => toast(e.message, 'error'),
  });

  if (!event) return null;

  const dateLabel = event.startAt.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const timeLabel = event.allDay
    ? 'All day'
    : `${event.startAt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} – ${event.endAt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close" onClick={onClose} />
        <div className="relative z-10 w-full max-w-md space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span
                className="rounded-full px-2 py-0.5 text-xs font-medium"
                style={{ backgroundColor: `${event.color}20`, color: event.color }}
              >
                {formatScheduleLabel(event.appointmentType)}
              </span>
              <h2 className="mt-2 text-lg font-semibold">{event.title}</h2>
            </div>
            <button type="button" className="btn-ghost px-2" aria-label="Close" onClick={onClose}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">When</dt>
              <dd>{dateLabel} · {timeLabel}</dd>
            </div>
            {event.customerName && (
              <div>
                <dt className="text-xs text-muted-foreground">Customer</dt>
                <dd>
                  {event.customerId ? (
                    <Link href={`/app/customers/${event.customerId}`} className="text-primary hover:underline">{event.customerName}</Link>
                  ) : event.customerName}
                </dd>
              </div>
            )}
            {event.propertyAddress && (
              <div>
                <dt className="text-xs text-muted-foreground">Address</dt>
                <dd>{event.propertyAddress}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-muted-foreground">Crew</dt>
              <dd>{event.crewName ?? 'Unassigned'}</dd>
            </div>
            {event.notes && (
              <div>
                <dt className="text-xs text-muted-foreground">Notes</dt>
                <dd className="whitespace-pre-wrap">{event.notes}</dd>
              </div>
            )}
          </dl>
          <div className="flex justify-between gap-2 pt-2">
            <button
              type="button"
              className="btn-secondary text-red-600"
              onClick={() => setConfirming(true)}
              disabled={remove.isPending}
            >
              <Trash2 className="mr-1 inline h-4 w-4" />
              Delete
            </button>
            <button type="button" className="btn-primary" onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={confirming}
        title="Delete appointment?"
        message={
          event.jobId
            ? `"${event.title}" will be removed from the calendar and its job will no longer show a scheduled date.`
            : `"${event.title}" will be removed from the calendar. This can't be undone.`
        }
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
        onConfirm={() => remove.mutate({ eventId: event.id })}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}

export function AppointmentDialog({
  open,
  initialDate,
  blackouts,
  onClose,
}: {
  open: boolean;
  initialDate: Date;
  blackouts: ScheduleBlackout[];
  onClose: () => void;
}) {
  if (!open) return null;
  return <AppointmentDialogForm initialDate={initialDate} blackouts={blackouts} onClose={onClose} />;
}

function AppointmentDialogForm({
  initialDate,
  blackouts,
  onClose,
}: {
  initialDate: Date;
  blackouts: ScheduleBlackout[];
  onClose: () => void;
}) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [customerSearch, setCustomerSearch] = useState('');
  const { data: customers, isLoading: customersLoading } = trpc.customer360.list.useQuery(
    { page: 1, pageSize: 50, search: customerSearch || undefined, enrich: 'none' },
    { staleTime: 60_000 },
  );
  const { data: crews } = trpc.schedule360.crews.list.useQuery();
  const [form, setForm] = useState({
    title: '',
    appointmentType: 'estimate_visit' as AppointmentType,
    customerId: '',
    crewId: '',
    date: dateKeyInTimeZone(initialDate),
    allDay: false,
    startTime: '09:00',
    endTime: '10:00',
    notes: '',
  });

  const create = trpc.schedule360.events.create.useMutation({
    onSuccess: (result) => {
      const conflicts = result.conflicts.length;
      toast(conflicts ? `Appointment created with ${conflicts} conflict(s)` : 'Appointment created', conflicts ? 'error' : 'success');
      utils.schedule360.invalidate();
      onClose();
    },
    onError: (e) => toast(e.message, 'error'),
  });

  const blackout = form.date ? findBlackoutForDateKey(blackouts, form.date) : null;
  const startAt = form.date ? localDateTime(form.date, form.allDay ? '00:00' : form.startTime) : null;
  const endAt = form.date
    ? form.allDay
      ? new Date(localDateTime(form.date, '00:00').getTime() + 86400000)
      : localDateTime(form.date, form.endTime)
    : null;
  const timeError = startAt && endAt && endAt <= startAt ? 'End time must be after the start time.' : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startAt || !endAt || timeError || blackout) return;
    create.mutate({
      title: form.title.trim() || formatScheduleLabel(form.appointmentType),
      appointmentType: form.appointmentType,
      customerId: form.customerId || undefined,
      crewId: form.crewId || undefined,
      startAt,
      endAt,
      allDay: form.allDay,
      notes: form.notes.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close" onClick={onClose} />
      <form onSubmit={submit} className="relative z-10 max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">New appointment</h2>
          <button type="button" className="btn-ghost px-2" aria-label="Close" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium">Type</span>
            <select
              className="input w-full"
              value={form.appointmentType}
              onChange={(e) => setForm({ ...form, appointmentType: e.target.value as AppointmentType })}
            >
              {APPOINTMENT_TYPES.map((t) => (
                <option key={t} value={t}>{formatScheduleLabel(t)}</option>
              ))}
            </select>
          </label>

          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium">Title</span>
            <input
              className="input w-full"
              placeholder={formatScheduleLabel(form.appointmentType)}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              maxLength={200}
            />
          </label>

          <div className="text-sm sm:col-span-2">
            <span className="mb-1 block font-medium">Customer (optional)</span>
            <input
              type="search"
              className="input mb-2 w-full"
              placeholder="Search customers..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
            />
            <select
              className="input w-full"
              value={form.customerId}
              onChange={(e) => setForm({ ...form, customerId: e.target.value })}
              disabled={customersLoading}
            >
              <option value="">{customersLoading ? 'Loading...' : 'No customer'}</option>
              {(customers?.items ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {[c.firstName, c.lastName].filter(Boolean).join(' ') || c.businessName || c.id}
                </option>
              ))}
            </select>
          </div>

          <label className="block text-sm">
            <span className="mb-1 block font-medium">Date</span>
            <input
              type="date"
              className="input w-full"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
          </label>

          <label className="flex items-end gap-2 pb-2 text-sm">
            <input type="checkbox" checked={form.allDay} onChange={(e) => setForm({ ...form, allDay: e.target.checked })} />
            All day
          </label>

          {!form.allDay && (
            <>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Start</span>
                <input
                  type="time"
                  className="input w-full"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  required
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">End</span>
                <input
                  type="time"
                  className="input w-full"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  required
                />
              </label>
            </>
          )}

          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium">Crew (optional)</span>
            <select className="input w-full" value={form.crewId} onChange={(e) => setForm({ ...form, crewId: e.target.value })}>
              <option value="">Unassigned</option>
              {(crews ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>

          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium">Notes</span>
            <textarea
              className="input min-h-20 w-full resize-y"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              maxLength={5000}
            />
          </label>
        </div>

        {blackout && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            This day is blocked out{blackout.reason ? ` (${blackout.reason})` : ''}. Pick another date or remove the block-out.
          </p>
        )}
        {timeError && <p className="text-sm text-red-600">{timeError}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={create.isPending}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={create.isPending || !!blackout || !!timeError}>
            {create.isPending ? 'Saving...' : 'Create appointment'}
          </button>
        </div>
      </form>
    </div>
  );
}
