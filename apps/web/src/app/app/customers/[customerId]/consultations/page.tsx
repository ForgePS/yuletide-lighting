'use client';

import { useParams } from 'next/navigation';
import { useState, type ChangeEvent } from 'react';
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

type ConsultationType = 'phone' | 'virtual' | 'on_site' | 'returning_customer' | 'commercial_site_survey';

type SurveyForm = {
  customerGoals: string;
  budgetRange: string;
  preferredColors: string;
  preferredLightStyle: string;
  powerAvailability: string;
  accessRequirements: string;
  safetyConcerns: string;
  measurementsNotes: string;
  followUpAction: string;
  notes: string;
};

const emptySurvey = (): SurveyForm => ({
  customerGoals: '',
  budgetRange: '',
  preferredColors: '',
  preferredLightStyle: '',
  powerAvailability: '',
  accessRequirements: '',
  safetyConcerns: '',
  measurementsNotes: '',
  followUpAction: '',
  notes: '',
});

function surveyPayload(form: SurveyForm) {
  return {
    customerGoals: form.customerGoals || null,
    budgetRange: form.budgetRange || null,
    preferredColors: form.preferredColors || null,
    preferredLightStyle: form.preferredLightStyle || null,
    powerAvailability: form.powerAvailability || null,
    accessRequirements: form.accessRequirements || null,
    safetyConcerns: form.safetyConcerns || null,
    measurementsNotes: form.measurementsNotes || null,
    followUpAction: form.followUpAction || null,
    notes: form.notes || null,
  };
}

function SurveyFields({
  form,
  setForm,
}: {
  form: SurveyForm;
  setForm: (next: SurveyForm) => void;
}) {
  const set = (key: keyof SurveyForm) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [key]: e.target.value });

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <textarea
        className="input min-h-[72px] sm:col-span-2"
        placeholder="Customer goals"
        value={form.customerGoals}
        onChange={set('customerGoals')}
      />
      <input className="input" placeholder="Budget range" value={form.budgetRange} onChange={set('budgetRange')} />
      <input
        className="input"
        placeholder="Preferred colors"
        value={form.preferredColors}
        onChange={set('preferredColors')}
      />
      <input
        className="input"
        placeholder="Preferred light style (C9, mini, permanent…)"
        value={form.preferredLightStyle}
        onChange={set('preferredLightStyle')}
      />
      <input
        className="input"
        placeholder="Power availability"
        value={form.powerAvailability}
        onChange={set('powerAvailability')}
      />
      <textarea
        className="input min-h-[72px] sm:col-span-2"
        placeholder="Access requirements (gates, dogs, ladder access…)"
        value={form.accessRequirements}
        onChange={set('accessRequirements')}
      />
      <textarea
        className="input min-h-[72px] sm:col-span-2"
        placeholder="Safety concerns"
        value={form.safetyConcerns}
        onChange={set('safetyConcerns')}
      />
      <textarea
        className="input min-h-[72px] sm:col-span-2"
        placeholder="Measurements & roof notes"
        value={form.measurementsNotes}
        onChange={set('measurementsNotes')}
      />
      <input
        className="input sm:col-span-2"
        placeholder="Follow-up action"
        value={form.followUpAction}
        onChange={set('followUpAction')}
      />
      <textarea
        className="input min-h-[72px] sm:col-span-2"
        placeholder="General notes"
        value={form.notes}
        onChange={set('notes')}
      />
    </div>
  );
}

export default function CustomerConsultationsPage() {
  const customerId = useParams().customerId as string;
  const { toast } = useToast();
  const { data, isLoading, isError, error, refetch } = trpc.customer360.consultations.list.useQuery({
    customerId,
  });
  const propertiesQuery = trpc.customer360.properties.list.useQuery({ customerId });
  const create = trpc.customer360.consultations.create.useMutation({
    onSuccess: () => {
      toast('Consultation scheduled', 'success');
      refetch();
      setShowForm(false);
      setSurvey(emptySurvey());
    },
    onError: (e) => toast(e.message, 'error'),
  });
  const complete = trpc.customer360.consultations.complete.useMutation({
    onSuccess: () => {
      toast('Consultation completed', 'success');
      refetch();
      setCompletingId(null);
      setCompleteForm(emptySurvey());
    },
    onError: (e) => toast(e.message, 'error'),
  });

  const [showForm, setShowForm] = useState(false);
  const [consultationType, setConsultationType] = useState<ConsultationType>('on_site');
  const [propertyId, setPropertyId] = useState('');
  const [survey, setSurvey] = useState<SurveyForm>(emptySurvey);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [completeForm, setCompleteForm] = useState<SurveyForm>(emptySurvey);

  if (isLoading) return <LoadingState message="Loading consultations..." />;
  if (isError) {
    return (
      <ErrorState
        message={error?.message ?? 'Could not load consultations.'}
        onRetry={() => void refetch()}
      />
    );
  }

  const properties = propertiesQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Consultations & property surveys</h2>
          <p className="text-sm text-muted-foreground">
            Capture goals, access notes, power, and measurements before proposal creation.
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
              propertyId: propertyId || null,
              scheduledAt: new Date(),
              ...surveyPayload(survey),
            });
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              className="input"
              value={consultationType}
              onChange={(e) => setConsultationType(e.target.value as ConsultationType)}
            >
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select className="input" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
              <option value="">Property (optional)</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.addressLine1}
                  {p.city ? `, ${p.city}` : ''}
                </option>
              ))}
            </select>
          </div>
          <SurveyFields form={survey} setForm={setSurvey} />
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
            <div key={item.id} className="card space-y-3 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{TYPE_LABELS[item.consultationType] ?? item.consultationType}</p>
                  <p className="mt-1 text-sm capitalize text-muted-foreground">{item.status.replace(/_/g, ' ')}</p>
                  {item.scheduledAt && (
                    <p className="mt-1 text-sm text-muted-foreground">Scheduled {formatDate(item.scheduledAt)}</p>
                  )}
                </div>
                {item.status === 'scheduled' && completingId !== item.id && (
                  <button
                    type="button"
                    className="btn-secondary text-sm"
                    onClick={() => {
                      setCompletingId(item.id);
                      setCompleteForm({
                        customerGoals: item.customerGoals ?? '',
                        budgetRange: item.budgetRange ?? '',
                        preferredColors: item.preferredColors ?? '',
                        preferredLightStyle: item.preferredLightStyle ?? '',
                        powerAvailability: item.powerAvailability ?? '',
                        accessRequirements: item.accessRequirements ?? '',
                        safetyConcerns: item.safetyConcerns ?? '',
                        measurementsNotes: item.measurementsNotes ?? '',
                        followUpAction: item.followUpAction ?? '',
                        notes: item.notes ?? '',
                      });
                    }}
                  >
                    Complete survey
                  </button>
                )}
              </div>

              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                {item.customerGoals && (
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground">Goals</dt>
                    <dd>{item.customerGoals}</dd>
                  </div>
                )}
                {item.budgetRange && (
                  <div>
                    <dt className="text-muted-foreground">Budget</dt>
                    <dd>{item.budgetRange}</dd>
                  </div>
                )}
                {item.preferredColors && (
                  <div>
                    <dt className="text-muted-foreground">Colors</dt>
                    <dd>{item.preferredColors}</dd>
                  </div>
                )}
                {item.preferredLightStyle && (
                  <div>
                    <dt className="text-muted-foreground">Light style</dt>
                    <dd>{item.preferredLightStyle}</dd>
                  </div>
                )}
                {item.powerAvailability && (
                  <div>
                    <dt className="text-muted-foreground">Power</dt>
                    <dd>{item.powerAvailability}</dd>
                  </div>
                )}
                {item.accessRequirements && (
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground">Access</dt>
                    <dd>{item.accessRequirements}</dd>
                  </div>
                )}
                {item.safetyConcerns && (
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground">Safety</dt>
                    <dd>{item.safetyConcerns}</dd>
                  </div>
                )}
                {item.measurementsNotes && (
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground">Measurements</dt>
                    <dd>{item.measurementsNotes}</dd>
                  </div>
                )}
                {item.followUpAction && (
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground">Follow-up</dt>
                    <dd>{item.followUpAction}</dd>
                  </div>
                )}
                {item.notes && (
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground">Notes</dt>
                    <dd>{item.notes}</dd>
                  </div>
                )}
              </dl>

              {completingId === item.id && (
                <form
                  className="space-y-4 border-t border-border pt-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    complete.mutate({
                      consultationId: item.id,
                      ...surveyPayload(completeForm),
                    });
                  }}
                >
                  <p className="text-sm font-medium">Complete property survey</p>
                  <SurveyFields form={completeForm} setForm={setCompleteForm} />
                  <div className="flex flex-wrap gap-2">
                    <button type="submit" className="btn-primary" disabled={complete.isPending}>
                      Mark completed
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setCompletingId(null);
                        setCompleteForm(emptySurvey());
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
