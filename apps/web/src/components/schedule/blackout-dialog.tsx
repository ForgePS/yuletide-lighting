'use client';

import { useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { dateKeyInTimeZone } from '@clcrm/types';
import type { ScheduleBlackout } from '@clcrm/types';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';

export function formatBlackoutRange(b: Pick<ScheduleBlackout, 'startDate' | 'endDate'>): string {
  const fmt = (key: string) => {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y!, m! - 1, d!).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };
  return b.startDate === b.endDate ? fmt(b.startDate) : `${fmt(b.startDate)} – ${fmt(b.endDate)}`;
}

export function BlackoutDialog({
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
  return <BlackoutDialogForm initialDate={initialDate} blackouts={blackouts} onClose={onClose} />;
}

function BlackoutDialogForm({
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
  const initialKey = dateKeyInTimeZone(initialDate);
  const [form, setForm] = useState({ startDate: initialKey, endDate: initialKey, reason: '' });

  const create = trpc.schedule360.blackouts.create.useMutation({
    onSuccess: () => {
      toast('Dates blocked out', 'success');
      utils.schedule360.blackouts.invalidate();
      setForm({ startDate: initialKey, endDate: initialKey, reason: '' });
    },
    onError: (e) => toast(e.message, 'error'),
  });
  const remove = trpc.schedule360.blackouts.delete.useMutation({
    onSuccess: () => {
      toast('Block-out removed', 'success');
      utils.schedule360.blackouts.invalidate();
    },
    onError: (e) => toast(e.message, 'error'),
  });

  const rangeError = form.startDate && form.endDate && form.endDate < form.startDate ? 'End date must be on or after the start date.' : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close" onClick={onClose} />
      <div className="relative z-10 max-h-[90vh] w-full max-w-lg space-y-5 overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Block out dates</h2>
          <button type="button" className="btn-ghost px-2" aria-label="Close" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          Blocked days show on the calendar, and nobody can book or move appointments onto them.
        </p>

        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (rangeError) return;
            create.mutate({ startDate: form.startDate, endDate: form.endDate, reason: form.reason.trim() || undefined });
          }}
        >
          <label className="block text-sm">
            <span className="mb-1 block font-medium">From</span>
            <input
              type="date"
              className="input w-full"
              value={form.startDate}
              onChange={(e) => {
                const startDate = e.target.value;
                setForm((f) => ({ ...f, startDate, endDate: f.endDate < startDate ? startDate : f.endDate }));
              }}
              required
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Through</span>
            <input
              type="date"
              className="input w-full"
              value={form.endDate}
              min={form.startDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              required
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium">Reason (optional)</span>
            <input
              className="input w-full"
              placeholder="e.g. Christmas Day, crew vacation"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              maxLength={200}
            />
          </label>
          {rangeError && <p className="text-sm text-red-600 sm:col-span-2">{rangeError}</p>}
          <div className="flex justify-end sm:col-span-2">
            <button type="submit" className="btn-primary" disabled={create.isPending || !!rangeError}>
              {create.isPending ? 'Saving...' : 'Block out'}
            </button>
          </div>
        </form>

        <div>
          <h3 className="mb-2 text-sm font-semibold">Blocked dates</h3>
          {!blackouts.length ? (
            <p className="text-sm text-muted-foreground">No dates are blocked out.</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {blackouts.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{formatBlackoutRange(b)}</p>
                    {b.reason && <p className="truncate text-xs text-muted-foreground">{b.reason}</p>}
                  </div>
                  <button
                    type="button"
                    className="btn-ghost px-2 text-red-600"
                    aria-label="Remove block-out"
                    disabled={remove.isPending}
                    onClick={() => remove.mutate({ blackoutId: b.id })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
