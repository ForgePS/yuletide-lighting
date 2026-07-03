'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';

export function MessageComposer({
  customerId,
  conversationId,
  onSent,
}: {
  customerId: string;
  conversationId?: string;
  onSent?: () => void;
}) {
  const { toast } = useToast();
  const [body, setBody] = useState('');
  const [subject, setSubject] = useState('');
  const [channel, setChannel] = useState<'sms' | 'email' | 'portal'>('sms');
  const { data: templates } = trpc.messages360.templates.list.useQuery();

  const send = trpc.messages360.send.useMutation({
    onSuccess: () => { toast('Message sent', 'success'); setBody(''); onSent?.(); },
    onError: (e) => toast(e.message, 'error'),
  });

  return (
    <form
      className="border-t p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!body.trim()) return;
        send.mutate({ customerId, conversationId, channel, body, subject: channel === 'email' ? subject : undefined });
      }}
    >
      <div className="mb-2 flex flex-wrap gap-2">
        {(['sms', 'email', 'portal'] as const).map((c) => (
          <button key={c} type="button" onClick={() => setChannel(c)} className={`rounded px-2 py-1 text-xs capitalize ${channel === c ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>{c}</button>
        ))}
        {templates?.slice(0, 4).map((t) => (
          <button key={t.id} type="button" onClick={() => { setBody(t.body); if (t.subject) setSubject(t.subject); setChannel(t.channel === 'internal' ? 'email' : t.channel); }} className="rounded bg-muted px-2 py-1 text-xs">{t.name}</button>
        ))}
      </div>
      {channel === 'email' && (
        <input className="input mb-2 w-full" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
      )}
      <textarea className="input w-full" rows={3} placeholder="Type a message..." value={body} onChange={(e) => setBody(e.target.value)} />
      <button type="submit" className="btn-primary mt-2" disabled={send.isPending}>Send</button>
    </form>
  );
}
