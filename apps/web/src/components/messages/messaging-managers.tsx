'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { formatDate } from '@clcrm/ui';
import { useToast } from '@/lib/toast';
import { LoadingState, EmptyState } from '@/components/ui/states';

export function CampaignManager() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.messages360.campaigns.list.useQuery();
  const send = trpc.messages360.campaigns.send.useMutation({
    onSuccess: () => { toast('Campaign sent', 'success'); utils.messages360.campaigns.list.invalidate(); },
    onError: (e) => toast(e.message, 'error'),
  });
  const create = trpc.messages360.campaigns.create.useMutation({
    onSuccess: () => { toast('Campaign created', 'success'); utils.messages360.campaigns.list.invalidate(); },
    onError: (e) => toast(e.message, 'error'),
  });

  if (isLoading) return <LoadingState />;
  return (
    <div className="space-y-6">
      <form className="card space-y-4 p-6" onSubmit={(e) => {
        e.preventDefault();
        create.mutate({
          name: 'Early booking campaign',
          campaignType: 'mixed',
          audience: ['previous_customers'],
          subject: 'Book your holiday lighting early!',
          body: 'Hi {{customerName}}, secure your installation date before the calendar fills up!',
          seasonalType: 'august_early_booking',
        });
      }}>
        <h2 className="font-semibold">Quick campaign</h2>
        <p className="text-sm text-muted-foreground">Create an August early booking mixed campaign for previous customers.</p>
        <button type="submit" className="btn-primary" disabled={create.isPending}>Create campaign</button>
      </form>
      {!data?.length ? <EmptyState title="No campaigns" description="Schedule email or SMS campaigns for seasonal renewals." /> : (
        <div className="space-y-3">
          {data.map((c) => (
            <div key={c.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-sm text-muted-foreground capitalize">{c.campaignType} · {c.status} · {c.recipientCount} recipients</p>
              </div>
              {c.status !== 'sent' && (
                <button type="button" className="btn-secondary text-sm" onClick={() => send.mutate({ campaignId: c.id })}>Send now</button>
              )}
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
  const { data, isLoading } = trpc.messages360.templates.list.useQuery();
  const update = trpc.messages360.templates.update.useMutation({
    onSuccess: () => {
      toast('Template saved', 'success');
      void utils.messages360.templates.list.invalidate();
      setEditingId(null);
    },
    onError: (e) => toast(e.message, 'error'),
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: '', subject: '', body: '' });

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title text-2xl">Email & SMS templates</h1>
        <p className="page-subtitle">Edit the wording customers receive. Use variables like {'{{customerName}}'}.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {data?.map((t) => {
          const editing = editingId === t.id;
          return (
            <div key={t.id} className="card space-y-3 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{t.name}</p>
                <span className="text-xs capitalize text-muted-foreground">{t.category.replace(/_/g, ' ')} · {t.channel}</span>
              </div>
              {editing ? (
                <>
                  <input
                    className="input"
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    placeholder="Template name"
                  />
                  {t.channel !== 'sms' ? (
                    <input
                      className="input"
                      value={draft.subject}
                      onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                      placeholder="Subject"
                    />
                  ) : null}
                  <textarea
                    className="input min-h-[140px] font-mono text-sm"
                    value={draft.body}
                    onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                    placeholder="Message body"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn-primary text-sm"
                      disabled={update.isPending}
                      onClick={() =>
                        update.mutate({
                          templateId: t.id,
                          data: {
                            name: draft.name,
                            subject: draft.subject || undefined,
                            body: draft.body,
                          },
                        })
                      }
                    >
                      Save
                    </button>
                    <button type="button" className="btn-secondary text-sm" onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {t.subject ? <p className="text-sm font-medium">{t.subject}</p> : null}
                  <pre className="whitespace-pre-wrap text-xs text-muted-foreground">{t.body}</pre>
                  <p className="text-xs text-muted-foreground">Variables: {t.variables.join(', ') || 'auto-detected'}</p>
                  <button
                    type="button"
                    className="btn-secondary text-sm"
                    onClick={() => {
                      setEditingId(t.id);
                      setDraft({ name: t.name, subject: t.subject ?? '', body: t.body });
                    }}
                  >
                    Edit
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AutomationBuilder() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.messages360.automations.list.useQuery();
  const toggle = trpc.messages360.automations.toggle.useMutation({
    onSuccess: () => { toast('Automation updated'); utils.messages360.automations.list.invalidate(); },
  });
  const update = trpc.messages360.automations.update.useMutation({
    onSuccess: () => {
      toast('Automation saved', 'success');
      void utils.messages360.automations.list.invalidate();
      setEditingId(null);
    },
    onError: (e) => toast(e.message, 'error'),
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: '', subject: '', body: '', delayDays: 0 });

  if (isLoading) return <LoadingState />;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title text-2xl">Message automations</h1>
        <p className="page-subtitle">Enable rules and edit the messages customers receive for each trigger.</p>
      </div>
      <div className="space-y-3">
        {data?.map((a) => {
          const editing = editingId === a.id;
          return (
            <div key={a.id} className="card space-y-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{a.name}</p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {a.trigger.replace(/_/g, ' ')} · {a.channel} · {a.delayDays}d delay · {a.sentCount} sent
                  </p>
                </div>
                <div className="flex gap-2">
                  {!editing ? (
                    <button
                      type="button"
                      className="btn-secondary text-sm"
                      onClick={() => {
                        setEditingId(a.id);
                        setDraft({
                          name: a.name,
                          subject: a.subject ?? '',
                          body: a.body,
                          delayDays: a.delayDays,
                        });
                      }}
                    >
                      Edit copy
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={`text-sm ${a.isActive ? 'btn-secondary' : 'btn-primary'}`}
                    onClick={() => toggle.mutate({ automationId: a.id, isActive: !a.isActive })}
                  >
                    {a.isActive ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>
              {editing ? (
                <>
                  <input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                  {a.channel !== 'sms' ? (
                    <input
                      className="input"
                      value={draft.subject}
                      onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                      placeholder="Subject"
                    />
                  ) : null}
                  <textarea
                    className="input min-h-[120px] font-mono text-sm"
                    value={draft.body}
                    onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                  />
                  <label className="block text-sm">
                    <span className="mb-1 block text-muted-foreground">Delay (days)</span>
                    <input
                      className="input max-w-[120px]"
                      type="number"
                      min={0}
                      value={draft.delayDays}
                      onChange={(e) => setDraft({ ...draft, delayDays: Number(e.target.value) })}
                    />
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn-primary text-sm"
                      disabled={update.isPending}
                      onClick={() =>
                        update.mutate({
                          automationId: a.id,
                          data: {
                            name: draft.name,
                            subject: draft.subject || null,
                            body: draft.body,
                            delayDays: draft.delayDays,
                          },
                        })
                      }
                    >
                      Save
                    </button>
                    <button type="button" className="btn-secondary text-sm" onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <pre className="whitespace-pre-wrap text-xs text-muted-foreground">{a.body}</pre>
              )}
            </div>
          );
        })}
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
            <form className="border-t p-4" onSubmit={(e) => { e.preventDefault(); if (!body.trim() || !channelId) return; send.mutate({ channelId, body }); }}>
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
        <p className="text-sm text-muted-foreground">Automatically sends SMS review request to first customer (demo).</p>
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
      {data && (
        <div className="space-y-3 text-sm">
          <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4">{data.generatedText}</pre>
          <ul className="space-y-1 text-muted-foreground">
            {data.suggestions.map((s) => <li key={s}>• {s}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

export function MessagingSettingsPage() {
  return (
    <div className="space-y-8">
      <AICommunicationAssistant />
      <div className="card p-6">
        <h2 className="font-semibold">Channel settings</h2>
        <p className="mt-2 text-sm text-muted-foreground">Configure Twilio SMS and email signatures in Organization Settings. Two-way SMS integration available in MSG-002.</p>
      </div>
    </div>
  );
}
