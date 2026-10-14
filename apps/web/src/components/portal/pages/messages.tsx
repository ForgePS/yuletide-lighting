'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { htmlMessageToPlainText } from '@clcrm/types';
import { trpc } from '@/lib/trpc';
import { portalAppPath, portalSessionInput } from '@/lib/portal-paths';
import { formatDateTime } from '@/lib/proposal-utils';
import { PortalAuthedFrame } from '@/components/portal/portal-shell';
import { PortalSplitView, PortalSection } from '@/components/portal/portal-mobile';
import { LoadingState } from '@/components/ui/states';
import { useToast } from '@/lib/toast';

export function PortalMessagesPage() {
  return (
    <PortalAuthedFrame title="Messages" feature="messaging" stickyPad>
      {({ enabledFeatures }) => <MessagesBody />}
    </PortalAuthedFrame>
  );
}

function MessagesBody() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const bottomRef = useRef<HTMLDivElement>(null);
  const { data, isLoading, isError } = trpc.portal360.public.messages.useQuery(portalSessionInput);
  const { data: contacts } = trpc.portal360.public.contacts.useQuery(portalSessionInput);
  const send = trpc.portal360.public.sendMessage.useMutation({
    onSuccess: () => {
      setBody('');
      utils.portal360.public.messages.invalidate(portalSessionInput);
      toast('Message sent', 'success');
    },
    onError: (e) => toast(e.message, 'error'),
  });
  const [body, setBody] = useState('');

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data?.messages?.length]);

  if (isLoading) return <LoadingState message="Loading messages..." />;
  if (isError) return <p className="text-base text-red-600">Could not load messages.</p>;

  const thread = (
    <div className="flex flex-col">
      <div className="mb-28 max-h-[55vh] space-y-3 overflow-y-auto rounded-2xl border border-stone-200 bg-white p-4 shadow-sm md:mb-0 md:max-h-[min(28rem,60vh)]">
        {!data?.messages.length ? (
          <p className="text-base text-stone-600">
            No messages yet. Send a note to your lighting company below.
          </p>
        ) : (
          data.messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-base ${
                m.direction === 'inbound'
                  ? 'ml-auto bg-red-700 text-white'
                  : 'bg-stone-100 text-stone-900'
              }`}
            >
              <p className="whitespace-pre-wrap">{htmlMessageToPlainText(m.body)}</p>
              <p
                className={`mt-1 text-xs ${m.direction === 'inbound' ? 'text-red-100' : 'text-stone-400'}`}
              >
                {formatDateTime(m.createdAt)}
              </p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <form
        className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 border-t border-stone-200 bg-white/95 p-3 backdrop-blur md:static md:mt-4 md:rounded-2xl md:border md:p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!body.trim() || send.isPending) return;
          send.mutate({ ...portalSessionInput, body: body.trim() });
        }}
      >
        <div className="mx-auto flex max-w-4xl gap-2 md:max-w-none">
          <label className="sr-only" htmlFor="portal-message">
            Message
          </label>
          <textarea
            id="portal-message"
            className="input min-h-11 flex-1 resize-none text-base"
            rows={2}
            placeholder="Write a message…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <button
            type="submit"
            className="btn-primary min-h-11 shrink-0 px-4 text-base"
            disabled={send.isPending || !body.trim()}
          >
            {send.isPending ? '…' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );

  const side = (
    <div className="hidden space-y-4 md:block">
      <PortalSection title="Conversation">
        <p className="text-base text-stone-600">
          Messages go to your lighting company office. Keep payment and scheduling questions here.
        </p>
        <Link
          href={portalAppPath('service-request')}
          className="mt-3 inline-flex min-h-11 items-center text-base font-medium text-primary hover:underline"
        >
          Prefer a service ticket? →
        </Link>
      </PortalSection>
      {(contacts?.length ?? 0) > 0 && (
        <PortalSection title="Your contacts">
          <ul className="space-y-2">
            {contacts!.slice(0, 5).map((c) => (
              <li key={c.id} className="text-base text-stone-700">
                <span className="font-medium">
                  {[c.firstName, c.lastName].filter(Boolean).join(' ') || 'Contact'}
                </span>
                {(c.role || c.title) && (
                  <span className="text-stone-500"> · {c.role || c.title}</span>
                )}
                {c.email && <p className="text-sm text-stone-500">{c.email}</p>}
              </li>
            ))}
          </ul>
        </PortalSection>
      )}
    </div>
  );

  return (
    <PortalSplitView list={thread} detail={side} listWidthClass="w-full md:w-[66%] lg:w-[70%]" />
  );
}
