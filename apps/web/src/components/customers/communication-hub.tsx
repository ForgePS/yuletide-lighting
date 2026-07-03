'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { EmptyState, LoadingState } from '@/components/ui/states';
import { COMMUNICATION_TYPE_OPTIONS, formatDate } from '@/lib/customer360-utils';
import type { CommunicationRecord, CommunicationType, CommunicationDirection } from '@clcrm/types';

export function CommunicationHub({ customerId }: { customerId: string }) {
  const { toast } = useToast();
  const [typeFilter, setTypeFilter] = useState<string>('');
  const { data, isLoading, refetch } = trpc.customer360.communications.list.useQuery({
    customerId,
    type: typeFilter || undefined,
  });
  const { data: smsThread, refetch: refetchSmsThread } = trpc.messages360.conversations.getByCustomer.useQuery({ customerId });
  const [showForm, setShowForm] = useState(false);
  const [smsBody, setSmsBody] = useState('');
  const create = trpc.customer360.communications.create.useMutation({
    onSuccess: () => { toast('Communication logged', 'success'); refetch(); setShowForm(false); },
    onError: () => toast('Could not log communication', 'error'),
  });
  const sendSms = trpc.messages360.send.useMutation({
    onSuccess: () => {
      toast('SMS sent', 'success');
      setSmsBody('');
      refetchSmsThread();
    },
    onError: (error) => toast(error.message || 'Could not send SMS', 'error'),
  });

  const pendingFollowUps = data?.filter((c) => c.followUpRequired && c.followUpDate) ?? [];
  const smsMessages = smsThread?.messages.filter((message) => message.channel === 'sms') ?? [];

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-2">
        <h2 className="font-semibold">Communications</h2>
        <div className="flex gap-2">
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input py-1.5 text-sm">
            <option value="">All types</option>
            {COMMUNICATION_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button type="button" className="btn-primary" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : 'Add'}</button>
        </div>
      </div>

      {pendingFollowUps.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>{pendingFollowUps.length} pending follow-up(s)</strong>
          <ul className="mt-2 space-y-1">
            {pendingFollowUps.map((c) => (
              <li key={c.id}>{c.subject ?? c.body.slice(0, 60)} — due {c.followUpDate ? formatDate(c.followUpDate) : '—'}</li>
            ))}
          </ul>
        </div>
      )}

      {showForm && <CommunicationForm onSubmit={(data) => create.mutate({ customerId, data: data as never })} loading={create.isPending} />}

      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold">SMS Correspondence</h3>
            <p className="text-sm text-muted-foreground">Texts sent from the SMS center, bulk campaigns, and replies stay here.</p>
          </div>
        </div>
        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!smsBody.trim()) return;
            sendSms.mutate({
              customerId,
              conversationId: smsThread?.conversation.id,
              channel: 'sms',
              body: smsBody,
            });
          }}
        >
          <textarea
            className="input min-h-20"
            value={smsBody}
            onChange={(event) => setSmsBody(event.target.value)}
            placeholder="Send this customer an SMS..."
          />
          <button type="submit" className="btn-primary" disabled={sendSms.isPending || !smsBody.trim()}>
            Send SMS
          </button>
        </form>
        <div className="mt-4 max-h-96 space-y-3 overflow-y-auto">
          {smsMessages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No SMS messages yet.</p>
          ) : (
            smsMessages.map((message) => (
              <div
                key={message.id}
                className={`rounded-lg p-3 text-sm ${message.direction === 'outbound' ? 'bg-red-50 text-red-900' : 'bg-muted'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium capitalize">{message.direction} · {message.status}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(message.createdAt)}</p>
                </div>
                <p className="mt-1 whitespace-pre-wrap">{message.body}</p>
                {message.sentByUserName && <p className="mt-1 text-xs text-muted-foreground">{message.sentByUserName}</p>}
              </div>
            ))
          )}
        </div>
      </div>

      {!data?.length && !showForm ? (
        <EmptyState title="No communications yet" description="Log calls, emails, SMS, and internal notes." />
      ) : (
        <div className="space-y-3">
          {data?.map((c) => <CommunicationCard key={c.id} comm={c as CommunicationRecord} />)}
        </div>
      )}
    </div>
  );
}

function CommunicationCard({ comm }: { comm: CommunicationRecord }) {
  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold capitalize">{comm.type.replace(/_/g, ' ')} · {comm.direction}</span>
        <span className="text-xs text-muted-foreground">{formatDate(comm.occurredAt)}</span>
      </div>
      {comm.subject && <p className="mt-1 font-medium">{comm.subject}</p>}
      <p className="mt-2 text-sm text-muted-foreground">{comm.body}</p>
      {comm.employeeName && <p className="mt-1 text-xs text-muted-foreground">{comm.employeeName}</p>}
    </div>
  );
}

function CommunicationForm({ onSubmit, loading }: { onSubmit: (data: Record<string, unknown>) => void; loading?: boolean }) {
  const [form, setForm] = useState({
    type: 'internal_note' as CommunicationType,
    direction: 'internal' as CommunicationDirection,
    subject: '',
    body: '',
    followUpRequired: false,
    followUpDate: '',
  });
  return (
    <form className="card space-y-4 p-6" onSubmit={(e) => {
      e.preventDefault();
      onSubmit({
        ...form,
        followUpDate: form.followUpDate ? new Date(form.followUpDate) : null,
      });
    }}>
      <div className="grid gap-4 sm:grid-cols-2">
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as CommunicationType })} className="input">
          {COMMUNICATION_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value as CommunicationDirection })} className="input">
          <option value="inbound">Inbound</option>
          <option value="outbound">Outbound</option>
          <option value="internal">Internal</option>
        </select>
      </div>
      <input placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="input" />
      <textarea required placeholder="Message *" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="input min-h-[100px]" />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.followUpRequired} onChange={(e) => setForm({ ...form, followUpRequired: e.target.checked })} />
        Follow-up required
      </label>
      {form.followUpRequired && (
        <input type="date" value={form.followUpDate} onChange={(e) => setForm({ ...form, followUpDate: e.target.value })} className="input" />
      )}
      <button type="submit" className="btn-primary" disabled={loading}>Save</button>
    </form>
  );
}
