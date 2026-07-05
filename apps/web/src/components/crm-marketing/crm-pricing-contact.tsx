'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Send } from 'lucide-react';
import { CRM_PRODUCT } from '@/lib/crm-marketing';
import type { PricingContent } from '@/lib/marketing-content-types';

export function CrmPricingView({ pricing }: { pricing: PricingContent }) {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">Simple pricing</p>
        <h1 className="font-display mt-3 text-4xl font-bold tracking-tight sm:text-5xl">{pricing.title}</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">{pricing.subtitle}</p>
      </div>

      <div className="mt-14 grid gap-6 md:grid-cols-2">
        {(pricing.plans ?? []).map((plan) => {
          if (!plan?.name) return null;
          return (
            <div
              key={plan.name}
              className={plan.highlight ? 'card relative overflow-hidden border-primary/30 p-8 shadow-glow' : 'card p-8'}
            >
              {plan.badge ? (
                <span className="absolute right-6 top-6 rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent-foreground">
                  {plan.badge}
                </span>
              ) : null}
              <h2 className={plan.highlight ? 'text-lg font-semibold text-primary' : 'text-lg text-muted-foreground'}>
                {plan.name}
              </h2>
              <p className="mt-3 text-5xl font-bold tracking-tight">{plan.price}</p>
              <p className="text-sm text-muted-foreground">{plan.period}</p>
              <ul className="mt-8 space-y-3">
                {(plan.features ?? []).map((feature) =>
                  feature ? (
                    <li key={feature} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {feature}
                    </li>
                  ) : null,
                )}
              </ul>
              <Link
                href="/sign-up"
                className={plan.highlight ? 'btn-primary mt-8 w-full py-3' : 'btn-secondary mt-8 w-full py-3'}
              >
                Start free trial
              </Link>
            </div>
          );
        })}
      </div>

      <p className="mt-10 text-center text-sm text-muted-foreground">
        All plans include every module · {CRM_PRODUCT.trialDays}-day trial · Questions?{' '}
        <Link href="/for-installers/contact" className="text-primary hover:underline">Contact us</Link>
      </p>
    </main>
  );
}

export function CrmContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    company: '',
    teamSize: '',
    message: '',
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const subject = encodeURIComponent(`CRM demo request — ${form.company || form.name}`);
    const body = encodeURIComponent(
      `Name: ${form.name}\nEmail: ${form.email}\nCompany: ${form.company}\nTeam size: ${form.teamSize}\n\n${form.message}`,
    );
    window.location.href = `mailto:${CRM_PRODUCT.supportEmail}?subject=${subject}&body=${body}`;
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="card p-10 text-center">
        <p className="text-lg font-semibold">Opening your email client…</p>
        <p className="mt-2 text-muted-foreground">
          Or email us at{' '}
          <a href={`mailto:${CRM_PRODUCT.supportEmail}`} className="text-primary hover:underline">
            {CRM_PRODUCT.supportEmail}
          </a>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-5 p-8">
      <h2 className="font-display text-xl font-bold">Request a demo or ask a question</h2>
      <p className="text-sm text-muted-foreground">
        Tell us about your company and we&apos;ll help you get set up for the season.
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-muted-foreground">Name *</span>
          <input className="input mt-1" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label className="block text-sm">
          <span className="text-muted-foreground">Email *</span>
          <input type="email" className="input mt-1" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-muted-foreground">Company *</span>
          <input className="input mt-1" required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
        </label>
        <label className="block text-sm">
          <span className="text-muted-foreground">Team size</span>
          <input className="input mt-1" placeholder="e.g. 4 crews, 12 people" value={form.teamSize} onChange={(e) => setForm({ ...form, teamSize: e.target.value })} />
        </label>
      </div>
      <label className="block text-sm">
        <span className="text-muted-foreground">What are you looking to solve? *</span>
        <textarea
          className="input mt-1"
          rows={5}
          required
          placeholder="Proposals, crew scheduling, inventory, sign tracking..."
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
        />
      </label>
      <button type="submit" className="btn-primary w-full py-4 text-base sm:w-auto sm:px-10">
        <Send className="h-4 w-4" />
        Send message
      </button>
    </form>
  );
}
