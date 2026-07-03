'use client';

import { useEffect, useState } from 'react';
import { formatCurrency } from '@clcrm/ui';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import type { CreatorOrganizationDetail, CreatorSubscriptionSummary } from '@clcrm/types';

function formatDateInput(date: Date | null | undefined) {
  if (!date) return '';
  return date.toISOString().slice(0, 10);
}

function statusBadge(status: string, locked?: boolean) {
  if (locked) return 'bg-red-100 text-red-800';
  const map: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-800',
    trialing: 'bg-blue-100 text-blue-800',
    past_due: 'bg-amber-100 text-amber-800',
    canceled: 'bg-slate-100 text-slate-700',
    locked: 'bg-red-100 text-red-800',
    none: 'bg-slate-100 text-slate-600',
  };
  return map[status] ?? 'bg-slate-100 text-slate-700';
}

type SubscriptionOrg = Pick<
  CreatorOrganizationDetail,
  | 'id'
  | 'companyName'
  | 'subscriptionStatus'
  | 'subscriptionPlan'
  | 'trialEndsAt'
  | 'currentPeriodEnd'
  | 'cancelAtPeriodEnd'
  | 'isLocked'
  | 'hasAccess'
  | 'lockAt'
  | 'planLabel'
  | 'mrrCents'
  | 'stripeCustomerId'
  | 'stripeSubscriptionId'
>;

export function SubscriptionControlPanel({
  org,
  compact = false,
  onUpdated,
}: {
  org: SubscriptionOrg;
  compact?: boolean;
  onUpdated?: () => void;
}) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const invalidate = () => {
    onUpdated?.();
    void utils.creator360.dashboard.invalidate();
    void utils.creator360.subscriptions.list.invalidate();
    void utils.creator360.organizations.get.invalidate({ organizationId: org.id });
  };

  const updateSub = trpc.creator360.organizations.updateSubscription.useMutation({
    onSuccess: () => { toast('Subscription saved', 'success'); invalidate(); },
    onError: (e) => toast(e.message, 'error'),
  });
  const extendTrial = trpc.creator360.organizations.extendTrial.useMutation({
    onSuccess: () => { toast('Trial extended', 'success'); invalidate(); },
    onError: (e) => toast(e.message, 'error'),
  });
  const applyPreset = trpc.creator360.subscriptions.applyPreset.useMutation({
    onSuccess: () => { toast('Preset applied', 'success'); invalidate(); },
    onError: (e) => toast(e.message, 'error'),
  });
  const lockOrg = trpc.creator360.organizations.lock.useMutation({
    onSuccess: () => { toast('Organization locked', 'success'); invalidate(); },
    onError: (e) => toast(e.message, 'error'),
  });
  const unlockOrg = trpc.creator360.organizations.unlock.useMutation({
    onSuccess: () => { toast('Organization unlocked', 'success'); invalidate(); },
    onError: (e) => toast(e.message, 'error'),
  });

  const [status, setStatus] = useState(org.subscriptionStatus);
  const [plan, setPlan] = useState(org.subscriptionPlan ?? '');
  const [trialEndsAt, setTrialEndsAt] = useState(formatDateInput(org.trialEndsAt));
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState(formatDateInput(org.currentPeriodEnd));
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(org.cancelAtPeriodEnd);
  const [note, setNote] = useState('');
  const [trialDays, setTrialDays] = useState(14);
  const [compDays, setCompDays] = useState(30);

  useEffect(() => {
    setStatus(org.subscriptionStatus);
    setPlan(org.subscriptionPlan ?? '');
    setTrialEndsAt(formatDateInput(org.trialEndsAt));
    setCurrentPeriodEnd(formatDateInput(org.currentPeriodEnd));
    setCancelAtPeriodEnd(org.cancelAtPeriodEnd);
  }, [org]);

  const presets: Array<{ id: Parameters<typeof applyPreset.mutate>[0]['preset']; label: string; days?: number }> = [
    { id: 'start_trial', label: 'Start trial', days: 14 },
    { id: 'activate_monthly', label: 'Activate monthly' },
    { id: 'activate_yearly', label: 'Activate yearly' },
    { id: 'complimentary', label: 'Complimentary access', days: compDays },
    { id: 'reactivate', label: 'Reactivate' },
    { id: 'mark_past_due', label: 'Mark past due' },
    { id: 'cancel', label: 'Cancel at period end' },
  ];

  return (
    <div className="card space-y-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Subscription control</h2>
          {!compact && <p className="text-sm text-muted-foreground">{org.companyName}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge(org.subscriptionStatus, org.isLocked)}`}>
            {org.isLocked ? 'locked' : org.subscriptionStatus}
          </span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${org.hasAccess ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
            {org.hasAccess ? 'Has access' : 'No access'}
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Plan</p>
          <p className="font-medium">{org.planLabel ?? 'None'}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">MRR contribution</p>
          <p className="font-medium">{formatCurrency(org.mrrCents)}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Trial ends</p>
          <p className="font-medium">{org.trialEndsAt?.toLocaleDateString() ?? '—'}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Period / lock</p>
          <p className="font-medium">{org.currentPeriodEnd?.toLocaleDateString() ?? '—'}</p>
          {org.lockAt && <p className="text-xs text-red-700">Locks {org.lockAt.toLocaleDateString()}</p>}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Quick presets</p>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="btn-secondary text-xs"
              disabled={applyPreset.isPending}
              onClick={() => applyPreset.mutate({
                organizationId: org.id,
                preset: preset.id,
                days: preset.id === 'complimentary' ? compDays : preset.days,
                note: note || undefined,
              })}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <label className="mt-3 block text-sm">
          Complimentary days
          <input className="input mt-1 w-28" type="number" min={1} max={730} value={compDays} onChange={(e) => setCompDays(Number(e.target.value))} />
        </label>
      </div>

      <div className="grid gap-4 border-t pt-4 md:grid-cols-2">
        <label className="block text-sm">
          Status
          <select className="input mt-1 w-full" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            {['none', 'trialing', 'active', 'past_due', 'canceled', 'locked'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Plan
          <select className="input mt-1 w-full" value={plan} onChange={(e) => setPlan(e.target.value)}>
            <option value="">None</option>
            <option value="monthly">Monthly ($75/mo)</option>
            <option value="yearly">Yearly ($750/yr)</option>
          </select>
        </label>
        <label className="block text-sm">
          Trial end date
          <input className="input mt-1 w-full" type="date" value={trialEndsAt} onChange={(e) => setTrialEndsAt(e.target.value)} />
        </label>
        <label className="block text-sm">
          Current period end
          <input className="input mt-1 w-full" type="date" value={currentPeriodEnd} onChange={(e) => setCurrentPeriodEnd(e.target.value)} />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={cancelAtPeriodEnd} onChange={(e) => setCancelAtPeriodEnd(e.target.checked)} />
        Cancel at period end
      </label>

      <label className="block text-sm">
        Admin note (audit log)
        <input className="input mt-1 w-full" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional reason for change" />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-primary"
          disabled={updateSub.isPending}
          onClick={() => updateSub.mutate({
            organizationId: org.id,
            subscriptionStatus: status,
            subscriptionPlan: plan ? (plan as 'monthly' | 'yearly') : null,
            trialEndsAt: trialEndsAt ? new Date(`${trialEndsAt}T12:00:00`) : null,
            currentPeriodEnd: currentPeriodEnd ? new Date(`${currentPeriodEnd}T12:00:00`) : null,
            cancelAtPeriodEnd,
            note: note || undefined,
          })}
        >
          Save subscription
        </button>
        <div className="flex items-end gap-2">
          <label className="text-sm">
            Extend trial
            <input className="input mt-1 w-20" type="number" min={1} max={365} value={trialDays} onChange={(e) => setTrialDays(Number(e.target.value))} />
          </label>
          <button type="button" className="btn-secondary" disabled={extendTrial.isPending} onClick={() => extendTrial.mutate({ organizationId: org.id, additionalDays: trialDays, note: note || undefined })}>
            Extend
          </button>
        </div>
        {org.isLocked ? (
          <button type="button" className="btn-secondary" disabled={unlockOrg.isPending} onClick={() => unlockOrg.mutate({ organizationId: org.id, note: note || undefined })}>Unlock org</button>
        ) : (
          <button type="button" className="btn-secondary text-red-700" disabled={lockOrg.isPending} onClick={() => lockOrg.mutate({ organizationId: org.id, note: note || undefined })}>Lock org</button>
        )}
      </div>

      {(org.stripeCustomerId || org.stripeSubscriptionId) && (
        <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
          {org.stripeCustomerId && <p>Stripe customer: {org.stripeCustomerId}</p>}
          {org.stripeSubscriptionId && <p>Stripe subscription: {org.stripeSubscriptionId}</p>}
        </div>
      )}
    </div>
  );
}

export function SubscriptionSummaryRowActions({
  org,
  onUpdated,
}: {
  org: CreatorSubscriptionSummary;
  onUpdated?: () => void;
}) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const applyPreset = trpc.creator360.subscriptions.applyPreset.useMutation({
    onSuccess: () => {
      toast('Updated', 'success');
      onUpdated?.();
      void utils.creator360.subscriptions.list.invalidate();
      void utils.creator360.dashboard.invalidate();
    },
    onError: (e) => toast(e.message, 'error'),
  });
  const lockOrg = trpc.creator360.organizations.lock.useMutation({
    onSuccess: () => { toast('Locked', 'success'); onUpdated?.(); void utils.creator360.subscriptions.list.invalidate(); },
  });
  const unlockOrg = trpc.creator360.organizations.unlock.useMutation({
    onSuccess: () => { toast('Unlocked', 'success'); onUpdated?.(); void utils.creator360.subscriptions.list.invalidate(); },
  });

  return (
    <div className="flex flex-wrap gap-1">
      <button type="button" className="btn-secondary px-2 py-1 text-xs" disabled={applyPreset.isPending} onClick={() => applyPreset.mutate({ organizationId: org.id, preset: 'activate_monthly' })}>Monthly</button>
      <button type="button" className="btn-secondary px-2 py-1 text-xs" disabled={applyPreset.isPending} onClick={() => applyPreset.mutate({ organizationId: org.id, preset: 'start_trial', days: 14 })}>Trial</button>
      <button type="button" className="btn-secondary px-2 py-1 text-xs" disabled={applyPreset.isPending} onClick={() => applyPreset.mutate({ organizationId: org.id, preset: 'complimentary', days: 30 })}>Comp 30d</button>
      {org.isLocked ? (
        <button type="button" className="btn-secondary px-2 py-1 text-xs" disabled={unlockOrg.isPending} onClick={() => unlockOrg.mutate({ organizationId: org.id })}>Unlock</button>
      ) : (
        <button type="button" className="btn-secondary px-2 py-1 text-xs text-red-700" disabled={lockOrg.isPending} onClick={() => lockOrg.mutate({ organizationId: org.id })}>Lock</button>
      )}
    </div>
  );
}
