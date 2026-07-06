'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { formatDate } from '@clcrm/ui';
import { useToast } from '@/lib/toast';
import { LoadingState, EmptyState } from '@/components/ui/states';

const TEMPLATE_CATEGORIES = [
  'proposal_follow_up', 'estimate_reminder', 'appointment_confirmation', 'crew_arrival',
  'completion_notice', 'invoice_reminder', 'review_request', 'renewal_offer',
] as const;

const CAMPAIGN_AUDIENCES = [
  'residential', 'commercial', 'hoa', 'previous_customers', 'high_value', 'at_risk',
] as const;

const AUTOMATION_TRIGGERS = [
  'proposal_sent', 'proposal_viewed', 'proposal_not_approved', 'job_scheduled',
  'crew_en_route', 'crew_arrived', 'job_completed', 'invoice_created', 'invoice_viewed',
  'payment_reminder', 'payment_received', 'invoice_overdue', 'installation_completed', 'review_request',
] as const;

export function CampaignManager() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    campaignType: 'mixed' as 'email' | 'sms' | 'mixed',
    audience: ['previous_customers'] as typeof CAMPAIGN_AUDIENCES[number][],
    subject: '',
    body: '',
  });

  const { data, isLoading } = trpc.messages360.campaigns.list.useQuery();
  const send = trpc.messages360.campaigns.send.useMutation({
    onSuccess: () => { toast('Campaign sent', 'success'); utils.messages360.campaigns.list.invalidate(); },
    onError: (e) => toast(e.message, 'error'),
  });
  const create = trpc.messages360.campaigns.create.useMutation({
    onSuccess: () => { toast('Campaign created', 'success'); utils.messages360.campaigns.list.invalidate(); resetForm(); },
    onError: (e) => toast(e.message, 'error'),
  });
  const update = trpc.messages360.campaigns.update.useMutation({
    onSuccess: () => { toast('Campaign updated', 'success'); utils.messages360.campaigns.list.invalidate(); resetForm(); },
    onError: (e) => toast(e.message, 'error'),
  });
  const remove = trpc.messages360.campaigns.delete.useMutation({
    onSuccess: () => { toast('Campaign deleted', 'success'); utils.messages360.campaigns.list.invalidate(); },
    onError: (e) => toast(e.message, 'error'),
  });

  function resetForm() {
    setEditingId(null);
    setForm({ name: '', campaignType: 'mixed', audience: ['previous_customers'], subject: '', body: '' });
  }

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <form
        className="card space-y-4 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (editingId) update.mutate({ campaignId: editingId, ...form });
          else create.mutate(form);
        }}
      >
        <h2 className="font-semibold">{editingId ? 'Edit campaign' : 'Create campaign'}</h2>
        <input className="input w-full" placeholder="Campaign name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <select className="input w-full" value={form.campaignType} onChange={(e) => setForm({ ...form, campaignType: e.target.value as typeof form.campaignType })}>
          <option value="email">Email</option>
          <option value="sms">SMS</option>
          <option value="mixed">Mixed</option>
        </select>
        <input className="input w-full" placeholder="Subject (email)" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
        <textarea className="input min-h-[100px] w-full" placeholder="Message body" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required />
        <div className="flex gap-2">
          <button type="submit" className="btn-primary" disabled={create.isPending || update.isPending}>
            {editingId ? 'Save changes' : 'Create campaign'}
          </button>
          {editingId ? <button type="button" className="btn-secondary" onClick={resetForm}>Cancel</button> : null}
        </div>
      </form>

      {!data?.length ? <EmptyState title="No campaigns" description="Schedule email or SMS campaigns for seasonal renewals." /> : (
        <div className="space-y-3">
          {data.map((c) => (
            <div key={c.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-sm text-muted-foreground capitalize">{c.campaignType} · {c.status} · {c.recipientCount} recipients</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {c.status !== 'sent' ? (
                  <button type="button" className="btn-secondary text-sm" onClick={() => send.mutate({ campaignId: c.id })}>Send</button>
                ) : null}
                <button type="button" className="btn-ghost text-sm" onClick={() => {
                  setEditingId(c.id);
                  setForm({ name: c.name, campaignType: c.campaignType, audience: c.audience as typeof form.audience, subject: c.subject ?? '', body: c.body });
                }}>Edit</button>
                <button type="button" className="text-sm text-red-600 hover:underline" onClick={() => { if (confirm('Delete campaign?')) remove.mutate({ campaignId: c.id }); }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function TemplateManager() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    category: 'proposal_follow_up' as typeof TEMPLATE_CATEGORIES[number],
    channel: 'email' as 'sms' | 'email' | 'portal' | 'internal',
    subject: '',
    body: '',
  });

  const { data, isLoading } = trpc.messages360.templates.list.useQuery();
  const create = trpc.messages360.templates.create.useMutation({
    onSuccess: () => { toast('Template created', 'success'); utils.messages360.templates.list.invalidate(); resetForm(); },
    onError: (e) => toast(e.message, 'error'),
  });
  const update = trpc.messages360.templates.update.useMutation({
    onSuccess: () => { toast('Template updated', 'success'); utils.messages360.templates.list.invalidate(); resetForm(); },
    onError: (e) => toast(e.message, 'error'),
  });
  const remove = trpc.messages360.templates.delete.useMutation({
    onSuccess: () => { toast('Template deleted', 'success'); utils.messages360.templates.list.invalidate(); },
    onError: (e) => toast(e.message, 'error'),
  });

  function resetForm() {
    setEditingId(null);
    setForm({ name: '', category: 'proposal_follow_up', channel: 'email', subject: '', body: '' });
  }

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <form className="card space-y-4 p-6" onSubmit={(e) => {
        e.preventDefault();
        if (editingId) update.mutate({ templateId: editingId, ...form });
        else create.mutate(form);
      }}>
        <h2 className="font-semibold">{editingId ? 'Edit template' : 'Create template'}</h2>
        <input className="input w-full" placeholder="Template name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <div className="grid gap-3 sm:grid-cols-2">
          <select className="input w-full" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as typeof form.category })}>
            {TEMPLATE_CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
          </select>
          <select className="input w-full" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value as typeof form.channel })}>
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="portal">Portal</option>
          </select>
        </div>
        <input className="input w-full" placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
        <textarea className="input min-h-[120px] w-full" placeholder="Body — use {{customerName}} variables" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required />
        <div className="flex gap-2">
          <button type="submit" className="btn-primary" disabled={create.isPending || update.isPending}>
            {editingId ? 'Save template' : 'Create template'}
          </button>
          {editingId ? <button type="button" className="btn-secondary" onClick={resetForm}>Cancel</button> : null}
        </div>
      </form>

      <div className="grid gap-4 md:grid-cols-2">
        {data?.map((t) => (
          <div key={t.id} className="card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{t.name}</p>
                <span className="text-xs capitalize text-muted-foreground">{t.category.replace(/_/g, ' ')} · {t.channel}</span>
              </div>
              <div className="flex gap-2">
                <button type="button" className="text-xs text-primary hover:underline" onClick={() => {
                  setEditingId(t.id);
                  setForm({ name: t.name, category: t.category as typeof form.category, channel: t.channel, subject: t.subject ?? '', body: t.body });
                }}>Edit</button>
                <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => { if (confirm('Delete template?')) remove.mutate({ templateId: t.id }); }}>Delete</button>
              </div>
            </div>
            {t.subject ? <p className="mt-2 text-sm font-medium">{t.subject}</p> : null}
            <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{t.body}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AutomationBuilder() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    trigger: 'proposal_sent' as typeof AUTOMATION_TRIGGERS[number],
    channel: 'email' as 'sms' | 'email' | 'portal' | 'internal',
    subject: '',
    body: '',
    delayDays: 0,
  });

  const { data, isLoading } = trpc.messages360.automations.list.useQuery();
  const create = trpc.messages360.automations.create.useMutation({
    onSuccess: () => { toast('Automation created', 'success'); utils.messages360.automations.list.invalidate(); resetForm(); },
    onError: (e) => toast(e.message, 'error'),
  });
  const update = trpc.messages360.automations.update.useMutation({
    onSuccess: () => { toast('Automation updated', 'success'); utils.messages360.automations.list.invalidate(); resetForm(); },
    onError: (e) => toast(e.message, 'error'),
  });
  const remove = trpc.messages360.automations.delete.useMutation({
    onSuccess: () => { toast('Automation deleted', 'success'); utils.messages360.automations.list.invalidate(); },
    onError: (e) => toast(e.message, 'error'),
  });
  const toggle = trpc.messages360.automations.toggle.useMutation({
    onSuccess: () => { toast('Automation updated'); utils.messages360.automations.list.invalidate(); },
  });

  function resetForm() {
    setEditingId(null);
    setForm({ name: '', trigger: 'proposal_sent', channel: 'email', subject: '', body: '', delayDays: 0 });
  }

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <form className="card space-y-4 p-6" onSubmit={(e) => {
        e.preventDefault();
        if (editingId) update.mutate({ automationId: editingId, ...form });
        else create.mutate(form);
      }}>
        <h2 className="font-semibold">{editingId ? 'Edit automation' : 'Create automation'}</h2>
        <input className="input w-full" placeholder="Automation name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <select className="input w-full" value={form.trigger} onChange={(e) => setForm({ ...form, trigger: e.target.value as typeof form.trigger })}>
          {AUTOMATION_TRIGGERS.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
        </select>
        <select className="input w-full" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value as typeof form.channel })}>
          <option value="email">Email</option>
          <option value="sms">SMS</option>
        </select>
        <input type="number" min={0} className="input w-full" placeholder="Delay (days)" value={form.delayDays} onChange={(e) => setForm({ ...form, delayDays: Number(e.target.value) })} />
        <textarea className="input min-h-[100px] w-full" placeholder="Message body" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required />
        <div className="flex gap-2">
          <button type="submit" className="btn-primary" disabled={create.isPending || update.isPending}>
            {editingId ? 'Save automation' : 'Create automation'}
          </button>
          {editingId ? <button type="button" className="btn-secondary" onClick={resetForm}>Cancel</button> : null}
        </div>
      </form>

      <div className="space-y-3">
        {data?.map((a) => (
          <div key={a.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">{a.name}</p>
              <p className="text-sm text-muted-foreground capitalize">{a.trigger.replace(/_/g, ' ')} · {a.channel} · {a.delayDays}d delay · {a.sentCount} sent</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={`text-sm ${a.isActive ? 'btn-secondary' : 'btn-primary'}`} onClick={() => toggle.mutate({ automationId: a.id, isActive: !a.isActive })}>
                {a.isActive ? 'Disable' : 'Enable'}
              </button>
              <button type="button" className="btn-ghost text-sm" onClick={() => {
                setEditingId(a.id);
                setForm({ name: a.name, trigger: a.trigger as typeof form.trigger, channel: a.channel, subject: a.subject ?? '', body: a.body, delayDays: a.delayDays });
              }}>Edit</button>
              <button type="button" className="text-sm text-red-600 hover:underline" onClick={() => { if (confirm('Delete automation?')) remove.mutate({ automationId: a.id }); }}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function InternalChat() {
  const [channelId, setChannelId] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const { toast } = useToast();
  const { data: channels } = trpc.messages360.internal.channels.useQuery();
  const { data: messages, refetch } = trpc.messages360.internal.messages.useQuery(
    { channelId: channelId! },
    { enabled: !!channelId },
  );
  const send = trpc.messages360.internal.send.useMutation({
    onSuccess: () => { setBody(''); refetch(); },
    onError: (e) => toast(e.message, 'error'),
  });

  return (
    <div className="flex h-[calc(100vh-14rem)] gap-4">
      <div className="w-56 flex-shrink-0 space-y-1 overflow-y-auto rounded-xl border bg-white p-2">
        {channels?.map((ch) => (
          <button key={ch.id} type="button" onClick={() => setChannelId(ch.id)} className={`w-full rounded-lg p-3 text-left text-sm ${channelId === ch.id ? 'bg-red-50 font-medium' : 'hover:bg-muted/30'}`}>
            # {ch.name}
          </button>
        ))}
      </div>
      <div className="flex flex-1 flex-col rounded-xl border bg-white">
        {channelId ? (
          <>
            <div className="flex-1 overflow-y-auto p-4">
              {messages?.map((m) => (
                <div key={m.id} className="mb-3 rounded-lg bg-muted p-3 text-sm">
                  <p className="text-xs font-medium">{m.sentByUserName ?? 'Team'}</p>
                  <p className="mt-1">{m.body}</p>
                </div>
              ))}
            </div>
            <form className="border-t p-4" onSubmit={(e) => { e.preventDefault(); if (!body.trim()) return; send.mutate({ channelId, body }); }}>
              <textarea className="input w-full" rows={2} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message #channel..." />
              <button type="submit" className="btn-primary mt-2" disabled={send.isPending}>Send</button>
            </form>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">Select a channel</div>
        )}
      </div>
    </div>
  );
}

export function ReviewRequestCenter() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data: customers } = trpc.customers.list.useQuery({ page: 1, pageSize: 50 });
  const { data: reviews, isLoading } = trpc.messages360.reviews.list.useQuery();
  const create = trpc.messages360.reviews.create.useMutation({
    onSuccess: () => { toast('Review request sent', 'success'); utils.messages360.reviews.list.invalidate(); },
    onError: (e) => toast(e.message, 'error'),
  });

  if (isLoading) return <LoadingState />;
  return (
    <div className="space-y-6">
      <form className="card space-y-4 p-6" onSubmit={(e) => {
        e.preventDefault();
        const customerId = customers?.items[0]?.id;
        if (!customerId) return;
        create.mutate({ customerId, channel: 'sms' });
      }}>
        <h2 className="font-semibold">Send review request</h2>
        <p className="text-sm text-muted-foreground">Send SMS review request to first customer in list.</p>
        <button type="submit" className="btn-primary" disabled={create.isPending || !customers?.items.length}>Send review request</button>
      </form>
      {!reviews?.length ? <EmptyState title="No review requests" description="Review requests are sent after installation completes." /> : (
        <table className="data-table w-full">
          <thead><tr><th>Customer</th><th>Channel</th><th>Status</th><th>Sent</th></tr></thead>
          <tbody>
            {reviews.map((r) => (
              <tr key={r.id}>
                <td>{r.customerName ?? r.customerId}</td>
                <td className="capitalize">{r.channel}</td>
                <td className="capitalize">{r.status}</td>
                <td>{r.sentAt ? formatDate(r.sentAt) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function AICommunicationAssistant() {
  const [prompt, setPrompt] = useState('Write a proposal follow-up');
  const { data, refetch, isFetching } = trpc.messages360.aiGenerate.useQuery({ prompt }, { enabled: false });
  const { toast } = useToast();

  return (
    <div className="card space-y-4 p-6">
      <h2 className="font-semibold">AI Communication Assistant</h2>
      <div className="flex gap-2">
        <input className="input flex-1" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Write a payment reminder..." />
        <button type="button" className="btn-primary" disabled={isFetching} onClick={() => { refetch().then(() => toast('Generated')); }}>Generate</button>
      </div>
      {data ? (
        <div className="space-y-3 text-sm">
          <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4">{data.generatedText}</pre>
          <ul className="space-y-1 text-muted-foreground">
            {data.suggestions.map((s) => <li key={s}>• {s}</li>)}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function MessagingSettingsPage() {
  return (
    <div className="space-y-8">
      <AICommunicationAssistant />
      <div className="card p-6">
        <h2 className="font-semibold">Channel settings</h2>
        <p className="mt-2 text-sm text-muted-foreground">Configure Twilio SMS and email signatures in Organization Settings.</p>
      </div>
    </div>
  );
}
