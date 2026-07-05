'use client';

import { useState } from 'react';
import { COMPANY } from '@/lib/company';
import { Send } from 'lucide-react';

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', city: '', message: '' });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const subject = encodeURIComponent(`Quote request from ${form.name}`);
    const body = encodeURIComponent(
      `Name: ${form.name}\nEmail: ${form.email}\nPhone: ${form.phone}\nCity: ${form.city}\n\n${form.message}`,
    );
    window.location.href = `mailto:${COMPANY.email}?subject=${subject}&body=${body}`;
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="card p-10 text-center">
        <p className="text-lg font-semibold">Opening your email client…</p>
        <p className="mt-2 text-muted-foreground">
          If it didn&apos;t open, email us directly at{' '}
          <a href={COMPANY.emailHref} className="text-primary hover:underline">{COMPANY.email}</a>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-5 p-8">
      <h2 className="font-display text-xl font-bold">Request a free quote</h2>
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
          <span className="text-muted-foreground">Phone</span>
          <input type="tel" className="input mt-1" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </label>
        <label className="block text-sm">
          <span className="text-muted-foreground">City</span>
          <input className="input mt-1" placeholder="e.g. Stuttgart" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </label>
      </div>
      <label className="block text-sm">
        <span className="text-muted-foreground">Tell us about your project *</span>
        <textarea
          className="input mt-1"
          rows={5}
          required
          placeholder="Residential roofline, commercial storefront, event lighting..."
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
