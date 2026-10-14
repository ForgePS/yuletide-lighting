'use client';

import { useState } from 'react';
import { htmlMessageToPlainText, looksLikeHtmlMessage } from '@clcrm/types';
import { trpc } from '@/lib/trpc';
import { CmsRichTextEditor } from '@/components/cms/cms-rich-text-editor';
import { useToast } from '@/lib/toast';
import { outboundSendToast } from '@/lib/message-utils';

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
    onSuccess: (result) => {
      toast(
        outboundSendToast(result?.message?.status, channel === 'sms' ? 'SMS' : channel === 'email' ? 'Email' : 'Message'),
        'success',
      );
      setBody('');
      setSubject('');
      onSent?.();
    },
    onError: (e) => {
      toast(e.message, 'error');
      onSent?.();
    },
  });

  return (
    <form
      className="border-t p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!htmlMessageToPlainText(body).trim()) return;
        send.mutate({ customerId, conversationId, channel, body, subject: channel === 'email' ? subject : undefined });
      }}
    >
      <div className="mb-2 flex flex-wrap gap-2">
        {(['sms', 'email', 'portal'] as const).map((c) => (
          <button key={c} type="button" onClick={() => { if (c !== 'email' && looksLikeHtmlMessage(body)) setBody(htmlMessageToPlainText(body)); setChannel(c); }} className={`rounded px-2 py-1 text-xs capitalize ${channel === c ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>{c}</button>
        ))}
        {templates?.slice(0, 4).map((t) => (
          <button key={t.id} type="button" onClick={() => { const next = t.channel === 'internal' ? 'email' : t.channel; setBody(next === 'email' ? t.body : htmlMessageToPlainText(t.body)); if (t.subject) setSubject(t.subject); setChannel(next); }} className="rounded bg-muted px-2 py-1 text-xs">{t.name}</button>
        ))}
      </div>
      {channel === 'email' && (
        <input className="input mb-2 w-full" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
      )}
      {channel === 'email' ? (
        <CmsRichTextEditor value={body} onChange={setBody} minHeightClass="min-h-72" />
      ) : (
        <textarea className="input min-h-24 w-full resize-y" rows={3} placeholder="Type a message..." value={body} onChange={(e) => setBody(e.target.value)} />
      )}
      <p className="mt-1 text-xs text-muted-foreground">
        {'{{customerName}}, {{firstName}}, {{address}}, {{city}}, {{companyName}}, {{companyPhone}}'} are filled in automatically.
      </p>
      <button type="submit" className="btn-primary mt-2" disabled={send.isPending}>Send</button>
    </form>
  );
}
