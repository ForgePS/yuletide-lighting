'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { channelIcon, statusBadge, priorityBadge } from '@/lib/message-utils';
import { formatDate } from '@clcrm/ui';
import { useToast } from '@/lib/toast';
import { LoadingState, EmptyState } from '@/components/ui/states';
import { MessageComposer } from './message-composer';
import type { ConversationStatus } from '@clcrm/types';

const STATUS_OPTIONS: { value: ConversationStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'waiting_on_customer', label: 'Waiting on customer' },
  { value: 'waiting_on_staff', label: 'Waiting on staff' },
  { value: 'closed', label: 'Closed' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
] as const;

export function UnifiedInbox() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [assignedUserName, setAssignedUserName] = useState('');

  const { data: conversations, isLoading, refetch: refetchList } = trpc.messages360.conversations.list.useQuery();
  const { data: thread, refetch: refetchThread } = trpc.messages360.conversations.getById.useQuery(
    { conversationId: selectedId! },
    { enabled: !!selectedId },
  );

  const updateConversation = trpc.messages360.conversations.update.useMutation({
    onSuccess: () => {
      toast('Conversation updated', 'success');
      refetchList();
      refetchThread();
    },
    onError: (e) => toast(e.message, 'error'),
  });

  const markRead = trpc.messages360.conversations.markRead.useMutation({
    onSuccess: () => {
      refetchList();
      refetchThread();
    },
    onError: (e) => toast(e.message, 'error'),
  });

  const deleteConversation = trpc.messages360.conversations.delete.useMutation({
    onSuccess: () => {
      toast('Conversation deleted', 'success');
      setSelectedId(null);
      refetchList();
      utils.messages360.dashboard.invalidate();
    },
    onError: (e) => toast(e.message, 'error'),
  });

  function handleSelectConversation(id: string) {
    setSelectedId(id);
    const conv = conversations?.find((c) => c.id === id);
    setAssignedUserName(conv?.assignedUserName ?? '');
  }

  function handleMarkAllRead() {
    if (!thread) return;
    const unread = thread.messages.filter((m) => m.direction === 'inbound' && m.status !== 'read');
    if (!unread.length) {
      toast('No unread messages', 'info');
      return;
    }
    Promise.all(
      unread.map((m) =>
        markRead.mutateAsync({ conversationId: thread.conversation.id, messageId: m.id }),
      ),
    ).then(() => toast('Marked as read', 'success'));
  }

  if (isLoading) return <LoadingState message="Loading inbox..." />;
  if (!conversations?.length) return <EmptyState title="Inbox empty" description="Customer messages from SMS, email, and portal appear here." />;

  const activeConv = thread?.conversation;

  return (
    <div className="flex h-[calc(100vh-14rem)] gap-4">
      <div className="w-80 flex-shrink-0 overflow-y-auto rounded-xl border bg-white">
        {conversations.map((conv) => (
          <button
            key={conv.id}
            type="button"
            onClick={() => handleSelectConversation(conv.id)}
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
        {selectedId && thread && activeConv ? (
          <>
            <div className="border-b p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{activeConv.customerName}</h2>
                  <p className="text-sm text-muted-foreground capitalize">{activeConv.category.replace(/_/g, ' ')} · {activeConv.source}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeConv.unreadCount > 0 && (
                    <button type="button" className="btn-secondary text-sm" onClick={handleMarkAllRead} disabled={markRead.isPending}>
                      Mark all read
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-secondary text-sm text-red-600"
                    onClick={() => {
                      if (confirm('Delete this conversation? Messages cannot be recovered.')) {
                        deleteConversation.mutate({ conversationId: activeConv.id });
                      }
                    }}
                    disabled={deleteConversation.isPending}
                  >
                    <Trash2 className="mr-1 inline h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <label className="block text-sm">
                  <span className="text-xs text-muted-foreground">Status</span>
                  <select
                    className="input mt-1 w-full text-sm"
                    value={activeConv.status}
                    onChange={(e) =>
                      updateConversation.mutate({
                        conversationId: activeConv.id,
                        status: e.target.value as ConversationStatus,
                      })
                    }
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="text-xs text-muted-foreground">Priority</span>
                  <select
                    className="input mt-1 w-full text-sm"
                    value={activeConv.priority}
                    onChange={(e) =>
                      updateConversation.mutate({
                        conversationId: activeConv.id,
                        priority: e.target.value as 'low' | 'normal' | 'high' | 'critical',
                      })
                    }
                  >
                    {PRIORITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="text-xs text-muted-foreground">Assigned to</span>
                  <div className="mt-1 flex gap-1">
                    <input
                      className="input w-full text-sm"
                      value={assignedUserName}
                      onChange={(e) => setAssignedUserName(e.target.value)}
                      placeholder="Rep name"
                    />
                    <button
                      type="button"
                      className="btn-secondary shrink-0 text-sm"
                      onClick={() =>
                        updateConversation.mutate({
                          conversationId: activeConv.id,
                          assignedUserName: assignedUserName || undefined,
                        })
                      }
                    >
                      Save
                    </button>
                  </div>
                </label>
              </div>
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
              onSent={() => { refetchThread(); refetchList(); }}
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
