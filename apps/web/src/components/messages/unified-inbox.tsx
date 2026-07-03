'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { channelIcon, statusBadge, priorityBadge } from '@/lib/message-utils';
import { formatDate } from '@clcrm/ui';
import { useToast } from '@/lib/toast';
import { LoadingState, EmptyState } from '@/components/ui/states';
import { MessageComposer } from './message-composer';

export function UnifiedInbox() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: conversations, isLoading } = trpc.messages360.conversations.list.useQuery();
  const { data: thread, refetch: refetchThread } = trpc.messages360.conversations.getById.useQuery(
    { conversationId: selectedId! },
    { enabled: !!selectedId },
  );

  if (isLoading) return <LoadingState message="Loading inbox..." />;
  if (!conversations?.length) return <EmptyState title="Inbox empty" description="Customer messages from SMS, email, and portal appear here." />;

  return (
    <div className="flex h-[calc(100vh-14rem)] gap-4">
      <div className="w-80 flex-shrink-0 overflow-y-auto rounded-xl border bg-white">
        {conversations.map((conv) => (
          <button
            key={conv.id}
            type="button"
            onClick={() => setSelectedId(conv.id)}
            className={`w-full border-b p-4 text-left hover:bg-muted/30 ${selectedId === conv.id ? 'bg-red-50' : ''}`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium">{conv.customerName ?? 'Customer'}</p>
              {conv.unreadCount > 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{conv.unreadCount}</span>}
            </div>
            <p className="mt-1 truncate text-xs text-muted-foreground">{conv.lastMessagePreview ?? 'No messages'}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${statusBadge(conv.status)}`}>{conv.status.replace(/_/g, ' ')}</span>
              <span className={`text-xs capitalize ${priorityBadge(conv.priority)}`}>{conv.priority}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="flex flex-1 flex-col rounded-xl border bg-white">
        {selectedId && thread ? (
          <>
            <div className="border-b p-4">
              <h2 className="font-semibold">{thread.conversation.customerName}</h2>
              <p className="text-sm text-muted-foreground capitalize">{thread.conversation.category.replace(/_/g, ' ')} · {thread.conversation.source}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {thread.messages.map((msg) => (
                <div key={msg.id} className={`mb-3 max-w-[80%] rounded-lg p-3 text-sm ${msg.direction === 'outbound' ? 'ml-auto bg-red-50 text-red-900' : 'bg-muted'}`}>
                  <p className="text-xs text-muted-foreground">{channelIcon(msg.channel)} {msg.channel} · {msg.status}</p>
                  {msg.subject && <p className="mt-1 font-medium">{msg.subject}</p>}
                  <p className="mt-1 whitespace-pre-wrap">{msg.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDate(msg.createdAt)}</p>
                </div>
              ))}
            </div>
            <MessageComposer
              customerId={thread.conversation.customerId}
              conversationId={thread.conversation.id}
              onSent={() => { refetchThread(); }}
            />
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">Select a conversation</div>
        )}
      </div>
    </div>
  );
}

export function ConversationView() {
  const [customerId, setCustomerId] = useState('');
  const { data: customers } = trpc.customers.list.useQuery({});
  const { data: timeline } = trpc.messages360.conversations.timeline.useQuery(
    { customerId },
    { enabled: !!customerId },
  );
  const { data: thread } = trpc.messages360.conversations.getByCustomer.useQuery(
    { customerId },
    { enabled: !!customerId },
  );

  return (
    <div className="space-y-6">
      <select className="input max-w-sm" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
        <option value="">Select customer</option>
        {customers?.items.map((c) => (
          <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
        ))}
      </select>

      {customerId && thread && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card p-4">
            <h3 className="font-semibold">Messages</h3>
            <div className="mt-4 max-h-96 space-y-3 overflow-y-auto">
              {thread.messages.map((msg) => (
                <div key={msg.id} className="rounded-lg border p-3 text-sm">
                  <p className="text-xs capitalize text-muted-foreground">{msg.channel} · {msg.direction}</p>
                  <p className="mt-1">{msg.body}</p>
                </div>
              ))}
            </div>
            <MessageComposer customerId={customerId} conversationId={thread.conversation.id} />
          </div>
          <div className="card p-4">
            <h3 className="font-semibold">Unified timeline</h3>
            <ol className="mt-4 space-y-3 border-l-2 border-border pl-4">
              {timeline?.map((e) => (
                <li key={e.id} className="relative text-sm">
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
                  <p className="font-medium">{e.title}</p>
                  {e.description && <p className="text-muted-foreground">{e.description}</p>}
                  <p className="text-xs text-muted-foreground">{formatDate(e.occurredAt)}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
