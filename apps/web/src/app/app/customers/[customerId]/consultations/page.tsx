'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { formatDate } from '@/lib/customer360-utils';

const TYPE_LABELS: Record<string, string> = {
  phone: 'Phone',
  virtual: 'Virtual',
  on_site: 'On-site',
  returning_customer: 'Returning customer',
  commercial_site_survey: 'Commercial site survey',
};

export default function CustomerConsultationsPage() {
  const customerId = useParams().customerId as string;
  const { toast } = useToast();
  const { data, isLoading, isError, error, refetch } = trpc.customer360.consultations.list.useQuery({
    customerId,
  });
  const create = trpc.customer360.consultations.create.useMutation({
    onSuccess: () => {
      toast('Consultation scheduled', 'success');
      refetch();
      setShowForm(false);
    },
    onError: (e) => toast(e.message, 'error'),
  });
  const complete = trpc.customer360.consultations.complete.useMutation({
    onSuccess: () => {
      toast('Consultation completed', 'success');
      refetch();
    },
    onError: (e) => toast(e.message, 'error'),
  });

  const [showForm, setShowForm] = useState(false);
  const [consultationType, setConsultationType] = useState<'phone' | 'virtual' | 'on_site' | 'returning_customer' | 'commercial_site_survey'>('on_site');
  const [customerGoals, setCustomerGoals] = useState('');
  const [budgetRange, setBudgetRange] = useState('');
  const [notes, setNotes] = useState('');

  if (isLoading) return <LoadingState message="Loading consultations..." />;
  if (isError) {
    return (
      <ErrorState
        message={error?.message ?? 'Could not load consultations.'}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Consultations & property surveys</h2>
          <p className="text-sm text-muted-foreground">
            Capture goals, access notes, and measurements before proposal creation.
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Schedule consultation'}
        </button>
      </div>

      {showForm && (
        <form
          className="card space-y-4 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate({
              customerId,
              consultationType,
              customerGoals: customerGoals || null,
              budgetRange: budgetRange || null,
              notes: notes || null,
              scheduledAt: new Date(),
            });
          }}
        >
          <select
            className="input"
            value={consultationType}
            onChange={(e) => setConsultationType(e.target.value as typeof consultationType)}
          >
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <textarea
            className="input min-h-[72px]"
            placeholder="Customer goals"
            value={customerGoals}
            onChange={(e) => setCustomerGoals(e.target.value)}
          />
          <input
            className="input"
            placeholder="Budget range"
            value={budgetRange}
            onChange={(e) => setBudgetRange(e.target.value)}
          />
          <textarea
            className="input min-h-[72px]"
            placeholder="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <button type="submit" className="btn-primary" disabled={create.isPending}>
            Save consultation
          </button>
        </form>
      )}

      {!data?.length ? (
        <EmptyState
          title="No consultations yet"
          description="Schedule a phone, virtual, or on-site survey before drafting a proposal."
        />
      ) : (
        <div className="space-y-3">
          {data.map((item) => (
            <div key={item.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{TYPE_LABELS[item.consultationType] ?? item.consultationType}</p>
                  <p className="mt-1 text-sm capitalize text-muted-foreground">{item.status.replace(/_/g, ' ')}</p>
                  {item.scheduledAt && (
                    <p className="mt-1 text-sm text-muted-foreground">Scheduled {formatDate(item.scheduledAt)}</p>
                  )}
                  {item.customerGoals && <p className="mt-2 text-sm">{item.customerGoals}</p>}
                  {item.budgetRange && (
                    <p className="mt-1 text-sm text-muted-foreground">Budget: {item.budgetRange}</p>
                  )}
                  {item.notes && <p className="mt-1 text-sm text-muted-foreground">{item.notes}</p>}
                </div>
                {item.status === 'scheduled' && (
                  <button
                    type="button"
                    className="btn-secondary text-sm"
                    disabled={complete.isPending}
                    onClick={() => complete.mutate({ consultationId: item.id })}
                  >
                    Mark completed
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
