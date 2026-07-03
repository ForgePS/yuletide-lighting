'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AlertTriangle, CreditCard, Lock, Tag } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { SUBSCRIPTION_PRICING, type SubscriptionPlan, type PromoCodePreview } from '@clcrm/types';
import { SettingsError, SettingsLoading, SettingsSection } from './settings-widgets';

function formatUsd(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function statusLabel(status: string) {
  switch (status) {
    case 'active': return 'Active';
    case 'trialing': return 'Trial';
    case 'past_due': return 'Past due';
    case 'canceled': return 'Canceled';
    case 'locked': return 'Locked';
    default: return 'No subscription';
  }
}

async function postStripeJson<T>(path: string, body?: object): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Request failed');
  return data as T;
}

type ListedPromoCode = {
  id: string;
  code: string;
  active: boolean;
  maxRedemptions: number | null;
  timesRedeemed: number;
  expiresAt: string | null;
  percentOff: number | null;
  amountOffCents: number | null;
  duration: string | null;
  description: string | null;
};

export function SubscriptionSettingsPage() {
  const searchParams = useSearchParams();
  const [busy, setBusy] = useState<SubscriptionPlan | 'portal' | 'promo' | 'create-promo' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoPreview, setPromoPreview] = useState<PromoCodePreview | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [adminCodes, setAdminCodes] = useState<ListedPromoCode[]>([]);
  const [showAdminPromos, setShowAdminPromos] = useState(false);
  const [newPromo, setNewPromo] = useState({
    code: '',
    percentOff: '20',
    amountOffCents: '',
    duration: 'once' as 'once' | 'repeating' | 'forever',
    durationInMonths: '3',
    maxRedemptions: '',
    description: '',
  });

  const { data: status, isLoading, isError, refetch } = trpc.billing.status.useQuery();
  const { data: payments } = trpc.billing.payments.useQuery(undefined, {
    enabled: !!status,
    retry: false,
  });

  useEffect(() => {
    if (searchParams.get('success') === '1') {
      setBanner('Subscription updated successfully. It may take a moment to reflect here.');
      refetch();
    }
    if (searchParams.get('canceled') === '1') {
      setBanner('Checkout was canceled. You can try again or use a different promo code.');
    }
  }, [searchParams, refetch]);

  useEffect(() => {
    void loadAdminCodes();
  }, []);

  async function loadAdminCodes() {
    try {
      const res = await fetch('/api/stripe/subscription/promo-codes');
      if (res.status === 403) {
        setShowAdminPromos(false);
        return;
      }
      if (!res.ok) return;
      const data = await res.json() as { codes: ListedPromoCode[] };
      setAdminCodes(data.codes ?? []);
      setShowAdminPromos(true);
    } catch {
      setShowAdminPromos(false);
    }
  }

  async function validatePromo(plan?: SubscriptionPlan) {
    const code = promoCode.trim();
    if (!code) {
      setPromoPreview(null);
      setPromoError(null);
      return;
    }
    setPromoError(null);
    setBusy('promo');
    try {
      const data = await postStripeJson<{ valid: boolean; preview: PromoCodePreview }>(
        '/api/stripe/subscription/validate-promo',
        { code, plan },
      );
      setPromoPreview(data.preview);
    } catch (err) {
      setPromoPreview(null);
      setPromoError(err instanceof Error ? err.message : 'Invalid promo code');
    } finally {
      setBusy(null);
    }
  }

  async function startCheckout(plan: SubscriptionPlan) {
    setActionError(null);
    setBusy(plan);
    try {
      const body: { plan: SubscriptionPlan; promoCode?: string } = { plan };
      if (promoCode.trim()) body.promoCode = promoCode.trim();
      const { url } = await postStripeJson<{ url?: string }>('/api/stripe/subscription/checkout', body);
      if (url) window.location.href = url;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not start checkout');
    } finally {
      setBusy(null);
    }
  }

  async function openPortal() {
    setActionError(null);
    setBusy('portal');
    try {
      const { url } = await postStripeJson<{ url?: string }>('/api/stripe/subscription/portal');
      if (url) window.location.href = url;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not open billing portal');
    } finally {
      setBusy(null);
    }
  }

  async function createPromoCode(e: React.FormEvent) {
    e.preventDefault();
    setActionError(null);
    setBusy('create-promo');
    try {
      await postStripeJson('/api/stripe/subscription/promo-codes', {
        code: newPromo.code,
        percentOff: newPromo.percentOff ? Number(newPromo.percentOff) : undefined,
        amountOffCents: newPromo.amountOffCents ? Number(newPromo.amountOffCents) : undefined,
        duration: newPromo.duration,
        durationInMonths: newPromo.duration === 'repeating' ? Number(newPromo.durationInMonths) : undefined,
        maxRedemptions: newPromo.maxRedemptions ? Number(newPromo.maxRedemptions) : undefined,
        description: newPromo.description || undefined,
      });
      setBanner(`Promo code ${newPromo.code.toUpperCase()} created.`);
      setNewPromo({ code: '', percentOff: '20', amountOffCents: '', duration: 'once', durationInMonths: '3', maxRedemptions: '', description: '' });
      await loadAdminCodes();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not create promo code');
    } finally {
      setBusy(null);
    }
  }

  if (isLoading) return <SettingsLoading message="Loading subscription..." />;
  if (isError || !status) {
    return <SettingsError message="Could not load subscription details." onRetry={() => refetch()} />;
  }

  const hasSubscription = !!status.stripeSubscriptionId;
  const showPlans = !hasSubscription || status.isLocked || status.status === 'canceled';

  return (
    <div className="space-y-8">
      {status.isLocked && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100">
          <Lock className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Account locked</p>
            <p className="mt-1 text-sm opacity-90">
              Your subscription expired. Access was locked at midnight after your billing period ended.
              Renew below to restore full access for your team.
            </p>
          </div>
        </div>
      )}

      {banner && (
        <div className="rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm">{banner}</div>
      )}

      {actionError && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {actionError}
        </div>
      )}

      <SettingsSection title="Current plan" description="Platform subscription for Yuletide Lighting CRM">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</dt>
            <dd className="mt-1 text-lg font-semibold">{statusLabel(status.status)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Plan</dt>
            <dd className="mt-1 text-lg font-semibold">
              {status.plan ? SUBSCRIPTION_PRICING[status.plan].label : '—'}
            </dd>
          </div>
          {status.currentPeriodEnd && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Current period ends</dt>
              <dd className="mt-1">{new Date(status.currentPeriodEnd).toLocaleString()}</dd>
            </div>
          )}
          {status.lockAt && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Access locks at</dt>
              <dd className="mt-1">{new Date(status.lockAt).toLocaleString()} (00:00 UTC day after period end)</dd>
            </div>
          )}
        </dl>

        {hasSubscription && !status.isLocked && (
          <button
            type="button"
            className="btn-secondary mt-6 inline-flex items-center gap-2"
            onClick={openPortal}
            disabled={busy !== null}
          >
            <CreditCard className="h-4 w-4" />
            {busy === 'portal' ? 'Opening portal...' : 'Manage billing & payment method'}
          </button>
        )}

        {status.cancelAtPeriodEnd && !status.isLocked && (
          <p className="mt-4 text-sm text-amber-700 dark:text-amber-400">
            Cancellation scheduled — access continues until the end of the current period.
          </p>
        )}
      </SettingsSection>

      {showPlans && (
        <SettingsSection title="Choose a plan" description="Monthly $75 · Yearly $750 (save $150)">
          <div className="mb-6 rounded-xl border border-border bg-muted/20 p-4">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Tag className="h-4 w-4 text-primary" />
              Promo code
            </label>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <input
                className="input flex-1 uppercase"
                placeholder="Enter code (e.g. LAUNCH20)"
                value={promoCode}
                onChange={(e) => {
                  setPromoCode(e.target.value.toUpperCase());
                  setPromoPreview(null);
                  setPromoError(null);
                }}
                onBlur={() => void validatePromo()}
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={() => void validatePromo()}
                disabled={busy === 'promo' || !promoCode.trim()}
              >
                {busy === 'promo' ? 'Checking...' : 'Apply code'}
              </button>
            </div>
            {promoError && <p className="mt-2 text-sm text-red-600">{promoError}</p>}
            {promoPreview && (
              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                <p className="font-medium">{promoPreview.code} applied</p>
                <p className="mt-1">
                  {promoPreview.percentOff
                    ? `${promoPreview.percentOff}% off`
                    : promoPreview.amountOffCents
                      ? `${formatUsd(promoPreview.amountOffCents)} off`
                      : 'Discount active'}
                  {' · '}
                  Monthly est. {formatUsd(promoPreview.estimatedMonthlyCents ?? SUBSCRIPTION_PRICING.monthly.amountCents)}
                  {' · '}
                  Yearly est. {formatUsd(promoPreview.estimatedYearlyCents ?? SUBSCRIPTION_PRICING.yearly.amountCents)}
                </p>
              </div>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              You can also enter a code on the Stripe checkout page if you skip this step.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {(['monthly', 'yearly'] as const).map((plan) => {
              const pricing = SUBSCRIPTION_PRICING[plan];
              const discounted = plan === 'monthly'
                ? promoPreview?.estimatedMonthlyCents
                : promoPreview?.estimatedYearlyCents;
              const highlight = plan === 'yearly';
              return (
                <div
                  key={plan}
                  className={highlight ? 'rounded-xl border border-primary/30 bg-primary/5 p-6' : 'rounded-xl border border-border p-6'}
                >
                  <p className="text-sm font-medium text-muted-foreground capitalize">{plan}</p>
                  {discounted != null && discounted < pricing.amountCents ? (
                    <div className="mt-2">
                      <p className="text-lg text-muted-foreground line-through">{formatUsd(pricing.amountCents)}</p>
                      <p className="text-3xl font-bold text-primary">{formatUsd(discounted)}</p>
                    </div>
                  ) : (
                    <p className="mt-2 text-3xl font-bold">{formatUsd(pricing.amountCents)}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {plan === 'monthly' ? 'per month' : 'per year'}
                  </p>
                  <button
                    type="button"
                    className={highlight ? 'btn-primary mt-6 w-full' : 'btn-secondary mt-6 w-full'}
                    onClick={() => startCheckout(plan)}
                    disabled={busy !== null}
                  >
                    {busy === plan ? 'Redirecting to checkout...' : `Subscribe ${plan}`}
                  </button>
                </div>
              );
            })}
          </div>
        </SettingsSection>
      )}

      {showAdminPromos && (
        <SettingsSection title="Promo codes" description="Create discount codes for new subscriptions (owner/admin)">
          <form className="grid gap-4 md:grid-cols-2" onSubmit={createPromoCode}>
            <label className="block space-y-1 md:col-span-2">
              <span className="text-sm text-muted-foreground">Code</span>
              <input required className="input uppercase" value={newPromo.code} onChange={(e) => setNewPromo({ ...newPromo, code: e.target.value.toUpperCase() })} placeholder="LAUNCH20" />
            </label>
            <label className="block space-y-1">
              <span className="text-sm text-muted-foreground">Percent off</span>
              <input type="number" min={1} max={100} className="input" value={newPromo.percentOff} onChange={(e) => setNewPromo({ ...newPromo, percentOff: e.target.value, amountOffCents: '' })} />
            </label>
            <label className="block space-y-1">
              <span className="text-sm text-muted-foreground">Or amount off (cents)</span>
              <input type="number" min={50} step={50} className="input" value={newPromo.amountOffCents} onChange={(e) => setNewPromo({ ...newPromo, amountOffCents: e.target.value, percentOff: '' })} placeholder="1500 = $15" />
            </label>
            <label className="block space-y-1">
              <span className="text-sm text-muted-foreground">Duration</span>
              <select className="input" value={newPromo.duration} onChange={(e) => setNewPromo({ ...newPromo, duration: e.target.value as typeof newPromo.duration })}>
                <option value="once">First invoice only</option>
                <option value="repeating">Repeating</option>
                <option value="forever">Forever</option>
              </select>
            </label>
            {newPromo.duration === 'repeating' && (
              <label className="block space-y-1">
                <span className="text-sm text-muted-foreground">Months</span>
                <input type="number" min={1} max={36} className="input" value={newPromo.durationInMonths} onChange={(e) => setNewPromo({ ...newPromo, durationInMonths: e.target.value })} />
              </label>
            )}
            <label className="block space-y-1">
              <span className="text-sm text-muted-foreground">Max redemptions (optional)</span>
              <input type="number" min={1} className="input" value={newPromo.maxRedemptions} onChange={(e) => setNewPromo({ ...newPromo, maxRedemptions: e.target.value })} />
            </label>
            <label className="block space-y-1 md:col-span-2">
              <span className="text-sm text-muted-foreground">Description (optional)</span>
              <input className="input" value={newPromo.description} onChange={(e) => setNewPromo({ ...newPromo, description: e.target.value })} placeholder="Launch discount" />
            </label>
            <button type="submit" className="btn-primary md:col-span-2" disabled={busy === 'create-promo'}>
              {busy === 'create-promo' ? 'Creating...' : 'Create promo code'}
            </button>
          </form>

          {adminCodes.length > 0 && (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Code</th>
                    <th className="pb-2 pr-4 font-medium">Discount</th>
                    <th className="pb-2 pr-4 font-medium">Used</th>
                    <th className="pb-2 font-medium">Expires</th>
                  </tr>
                </thead>
                <tbody>
                  {adminCodes.map((code) => (
                    <tr key={code.id} className="border-b border-border/60">
                      <td className="py-3 pr-4 font-mono font-medium">{code.code}</td>
                      <td className="py-3 pr-4">
                        {code.percentOff ? `${code.percentOff}%` : code.amountOffCents ? formatUsd(code.amountOffCents) : '—'}
                      </td>
                      <td className="py-3 pr-4">
                        {code.timesRedeemed}{code.maxRedemptions ? ` / ${code.maxRedemptions}` : ''}
                      </td>
                      <td className="py-3">{code.expiresAt ? new Date(code.expiresAt).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SettingsSection>
      )}

      {payments && payments.length > 0 && (
        <SettingsSection title="Payment history" description="Recent platform subscription charges">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Date</th>
                  <th className="pb-2 pr-4 font-medium">Plan</th>
                  <th className="pb-2 pr-4 font-medium">Amount</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-border/60">
                    <td className="py-3 pr-4">{new Date(p.paidAt).toLocaleDateString()}</td>
                    <td className="py-3 pr-4 capitalize">{p.plan ?? '—'}</td>
                    <td className="py-3 pr-4">{formatUsd(p.amountCents)}</td>
                    <td className="py-3 capitalize">{p.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SettingsSection>
      )}
    </div>
  );
}
