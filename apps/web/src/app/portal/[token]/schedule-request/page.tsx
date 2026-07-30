'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { LoadingState } from '@/components/ui/states';

const APPOINTMENT_TYPES = [
  { value: 'estimate_visit', label: 'Estimate visit' },
  { value: 'design_consultation', label: 'Design consultation' },
  { value: 'installation', label: 'Installation' },
  { value: 'takedown', label: 'Takedown' },
  { value: 'service_call', label: 'Service call' },
] as const;

export default function PortalScheduleRequestPage() {
  const token = useParams().token as string;
  const router = useRouter();
  const { toast } = useToast();
  const { data, isLoading } = trpc.portal360.public.dashboard.useQuery({ token });
  const submit = trpc.portal360.public.submitScheduleRequest.useMutation({
    onSuccess: (res) => {
      toast(res.message, 'success');
      router.push(`/portal/${token}`);
    },
    onError: (e) => toast(e.message, 'error'),
  });

  const [appointmentType, setAppointmentType] = useState<(typeof APPOINTMENT_TYPES)[number]['value']>('installation');
  const [propertyId, setPropertyId] = useState('');
  const [preferredWindows, setPreferredWindows] = useState('');
  const [notes, setNotes] = useState('');

  if (isLoading) return <LoadingState message="Loading..." />;

  const features = data?.enabledFeatures ?? [];
  const canRequest =
    features.includes('scheduling') && Boolean(data?.settings.allowSelfScheduling);

  if (data && !canRequest) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100 p-4">
        <div className="max-w-md rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold">Schedule requests unavailable</h1>
          <p className="mt-2 text-sm text-stone-600">
            Self-scheduling is not enabled for your portal. Contact your lighting company to request an appointment.
          </p>
          <Link href={`/portal/${token}`} className="mt-4 inline-block text-sm text-primary hover:underline">
            ← Back to portal
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-100 via-stone-50 to-red-50/40 py-8">
      <div className="mx-auto max-w-lg rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <Link href={`/portal/${token}`} className="text-sm text-primary hover:underline">← Back to portal</Link>
        <h1 className="mt-4 text-xl font-bold text-stone-900">Request an appointment</h1>
        <p className="mt-1 text-sm text-stone-600">
          Tell us when you prefer — we&apos;ll confirm the time with you. This does not book a slot automatically.
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit.mutate({
              token,
              appointmentType,
              propertyId: propertyId || undefined,
              preferredWindows: preferredWindows || undefined,
              notes: notes || undefined,
            });
          }}
        >
          <label className="block text-sm">
            <span className="font-medium">Appointment type</span>
            <select
              className="input mt-1 w-full"
              value={appointmentType}
              onChange={(e) => setAppointmentType(e.target.value as typeof appointmentType)}
            >
              {APPOINTMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>
          {data?.properties && data.properties.length > 0 && (
            <label className="block text-sm">
              <span className="font-medium">Property (optional)</span>
              <select className="input mt-1 w-full" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
                <option value="">—</option>
                {data.properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.label} — {p.addressLine1}, {p.city}</option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-sm">
            <span className="font-medium">Preferred windows</span>
            <input
              className="input mt-1 w-full"
              placeholder="e.g. Weekday mornings, Dec 1–10"
              value={preferredWindows}
              onChange={(e) => setPreferredWindows(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Notes</span>
            <textarea
              className="input mt-1 min-h-[100px] w-full"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <button type="submit" className="btn-primary w-full" disabled={submit.isPending}>
            {submit.isPending ? 'Submitting…' : 'Submit request'}
          </button>
        </form>
      </div>
    </div>
  );
}
