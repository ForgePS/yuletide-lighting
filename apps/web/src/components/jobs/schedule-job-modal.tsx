'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';

type ScheduleJobModalProps = {
  jobId: string;
  jobTitle: string;
  onClose: () => void;
  onScheduled?: () => void;
};

export function ScheduleJobModal({ jobId, jobTitle, onClose, onScheduled }: ScheduleJobModalProps) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data: crews } = trpc.schedule360.crews.list.useQuery();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  const [crewId, setCrewId] = useState('');
  const [scheduledStart, setScheduledStart] = useState(
    tomorrow.toISOString().slice(0, 16),
  );

  const schedule = trpc.jobs.schedule.useMutation({
    onSuccess: () => {
      toast('Job scheduled', 'success');
      utils.jobs.invalidate();
      utils.schedule360.invalidate();
      onScheduled?.();
      onClose();
    },
    onError: (e) => toast(e.message, 'error'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="card w-full max-w-md p-6">
        <h2 className="text-lg font-semibold">Schedule job</h2>
        <p className="mt-1 text-sm text-muted-foreground">{jobTitle}</p>
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            schedule.mutate({
              jobId,
              crewId: crewId || undefined,
              scheduledStart: new Date(scheduledStart).toISOString(),
            });
          }}
        >
          <label className="block text-sm">
            <span className="font-medium">Start time</span>
            <input
              type="datetime-local"
              className="input mt-1 w-full"
              value={scheduledStart}
              onChange={(e) => setScheduledStart(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Crew</span>
            <select className="input mt-1 w-full" value={crewId} onChange={(e) => setCrewId(e.target.value)}>
              <option value="">Assign later</option>
              {crews?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={schedule.isPending}>
              {schedule.isPending ? 'Scheduling…' : 'Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
