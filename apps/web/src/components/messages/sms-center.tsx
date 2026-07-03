'use client';

import { useMemo, useState } from 'react';
import { formatDate } from '@clcrm/ui';
import type { CustomerListItem } from '@clcrm/types';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { EmptyState, LoadingState } from '@/components/ui/states';

function customerName(customer: CustomerListItem) {
  return customer.businessName || `${customer.firstName} ${customer.lastName}`.trim();
}

function customerSmsNumber(customer: CustomerListItem) {
  return customer.mobilePhone || customer.phone || '';
}

export function SmsCenter() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [singleBody, setSingleBody] = useState('');
  const [bulkName, setBulkName] = useState('Bulk SMS');
  const [bulkBody, setBulkBody] = useState('');
  const [selectedBulkIds, setSelectedBulkIds] = useState<string[]>([]);
  const [inboundBody, setInboundBody] = useState('');
  const { data: customersData, isLoading: customersLoading } = trpc.customer360.list.useQuery(
    { page: 1, pageSize: 100, enrich: 'none' },
    { staleTime: 30_000, retry: 1 },
  );
  const { data: conversations, isLoading: conversationsLoading } = trpc.messages360.conversations.list.useQuery();
  const { data: thread, refetch: refetchThread } = trpc.messages360.conversations.getByCustomer.useQuery(
    { customerId: selectedCustomerId },
    { enabled: !!selectedCustomerId },
  );

  const customers = customersData?.items ?? [];
  const smsCustomers = useMemo(
    () => customers.filter((customer) => customer.smsOptIn !== false && !!customerSmsNumber(customer)),
    [customers],
  );
  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId);
  const smsConversations = conversations?.filter((conversation) => conversation.source === 'sms' || conversation.source === 'mixed') ?? [];
  const smsMessages = thread?.messages.filter((message) => message.channel === 'sms') ?? [];

  const sendSingle = trpc.messages360.send.useMutation({
    onSuccess: () => {
      toast('SMS sent', 'success');
      setSingleBody('');
      refetchThread();
      utils.messages360.conversations.list.invalidate();
    },
    onError: (error) => toast(error.message || 'Could not send SMS', 'error'),
  });
  const sendBulk = trpc.messages360.sms.sendBulk.useMutation({
    onSuccess: (result) => {
      toast(`Bulk SMS sent to ${result.sent} customer(s)`, 'success');
      setBulkBody('');
      setSelectedBulkIds([]);
      utils.messages360.conversations.list.invalidate();
      utils.messages360.campaigns.list.invalidate();
    },
    onError: (error) => toast(error.message || 'Could not send bulk SMS', 'error'),
  });
  const receiveSms = trpc.messages360.sms.receive.useMutation({
    onSuccess: () => {
      toast('Inbound SMS logged', 'success');
      setInboundBody('');
      refetchThread();
      utils.messages360.conversations.list.invalidate();
    },
    onError: (error) => toast(error.message || 'Could not log inbound SMS', 'error'),
  });

  function toggleBulkCustomer(customerId: string) {
    setSelectedBulkIds((ids) =>
      ids.includes(customerId) ? ids.filter((id) => id !== customerId) : [...ids, customerId],
    );
  }

  if (customersLoading || conversationsLoading) return <LoadingState message="Loading SMS center..." />;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-6">
        <section className="card space-y-4 p-6">
          <div>
            <h2 className="font-semibold">Send Individual SMS</h2>
            <p className="text-sm text-muted-foreground">Send a text to one customer and keep it in their conversation log.</p>
          </div>
          <select className="input" value={selectedCustomerId} onChange={(event) => setSelectedCustomerId(event.target.value)}>
            <option value="">Select a customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customerName(customer)} {customerSmsNumber(customer) ? `- ${customerSmsNumber(customer)}` : '- no phone'}
              </option>
            ))}
          </select>
          {selectedCustomer && selectedCustomer.smsOptIn === false && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">This customer is opted out of SMS.</p>
          )}
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!selectedCustomerId || !singleBody.trim()) return;
              sendSingle.mutate({ customerId: selectedCustomerId, conversationId: thread?.conversation.id, channel: 'sms', body: singleBody });
            }}
          >
            <textarea
              className="input min-h-28"
              value={singleBody}
              onChange={(event) => setSingleBody(event.target.value)}
              placeholder="Type an SMS message..."
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">{singleBody.length}/1600 characters</span>
              <button
                type="submit"
                className="btn-primary"
                disabled={sendSingle.isPending || !selectedCustomerId || !singleBody.trim() || selectedCustomer?.smsOptIn === false}
              >
                Send SMS
              </button>
            </div>
          </form>
        </section>

        <section className="card space-y-4 p-6">
          <div>
            <h2 className="font-semibold">Send Bulk SMS</h2>
            <p className="text-sm text-muted-foreground">Select opted-in customers and send one SMS to everyone. Each send is logged to that customer profile.</p>
          </div>
          <input className="input" value={bulkName} onChange={(event) => setBulkName(event.target.value)} placeholder="Campaign name" />
          <textarea
            className="input min-h-28"
            value={bulkBody}
            onChange={(event) => setBulkBody(event.target.value)}
            placeholder="Bulk SMS message..."
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary text-sm" onClick={() => setSelectedBulkIds(smsCustomers.map((customer) => customer.id))}>
              Select all opted-in
            </button>
            <button type="button" className="btn-secondary text-sm" onClick={() => setSelectedBulkIds([])}>
              Clear
            </button>
            <span className="self-center text-sm text-muted-foreground">{selectedBulkIds.length} selected</span>
          </div>
          <div className="max-h-64 overflow-y-auto rounded-xl border">
            {smsCustomers.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">No SMS opted-in customers with phone numbers found.</div>
            ) : (
              smsCustomers.map((customer) => (
                <label key={customer.id} className="flex cursor-pointer items-center gap-3 border-b px-4 py-3 text-sm last:border-b-0">
                  <input
                    type="checkbox"
                    checked={selectedBulkIds.includes(customer.id)}
                    onChange={() => toggleBulkCustomer(customer.id)}
                  />
                  <span className="flex-1">
                    <span className="font-medium">{customerName(customer)}</span>
                    <span className="ml-2 text-muted-foreground">{customerSmsNumber(customer)}</span>
                  </span>
                </label>
              ))
            )}
          </div>
          <button
            type="button"
            className="btn-primary"
            disabled={sendBulk.isPending || !bulkBody.trim() || selectedBulkIds.length === 0}
            onClick={() => sendBulk.mutate({ name: bulkName || 'Bulk SMS', customerIds: selectedBulkIds, body: bulkBody })}
          >
            {sendBulk.isPending ? 'Sending...' : 'Send bulk SMS'}
          </button>
        </section>
      </div>

      <aside className="space-y-6">
        <section className="card p-4">
          <h2 className="font-semibold">SMS Conversations</h2>
          <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
            {smsConversations.length === 0 ? (
              <EmptyState title="No SMS conversations" description="Sent and received texts will show up here." />
            ) : (
              smsConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  className={`w-full rounded-lg border p-3 text-left text-sm hover:bg-muted/30 ${selectedCustomerId === conversation.customerId ? 'bg-red-50' : ''}`}
                  onClick={() => setSelectedCustomerId(conversation.customerId)}
                >
                  <p className="font-medium">{conversation.customerName || 'Customer'}</p>
                  <p className="truncate text-xs text-muted-foreground">{conversation.lastMessagePreview || 'No messages'}</p>
                  <p className="mt-1 text-xs capitalize text-muted-foreground">{conversation.status.replace(/_/g, ' ')}</p>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="card p-4">
          <h2 className="font-semibold">Selected Conversation</h2>
          {!selectedCustomerId ? (
            <p className="mt-4 text-sm text-muted-foreground">Select a customer or conversation to see the SMS thread.</p>
          ) : (
            <div className="mt-4 space-y-3">
              <div className="max-h-96 space-y-3 overflow-y-auto">
                {smsMessages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No SMS messages yet.</p>
                ) : (
                  smsMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`rounded-lg p-3 text-sm ${message.direction === 'outbound' ? 'bg-red-50 text-red-900' : 'bg-muted'}`}
                    >
                      <p className="text-xs capitalize text-muted-foreground">{message.direction} - {message.status}</p>
                      <p className="mt-1 whitespace-pre-wrap">{message.body}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatDate(message.createdAt)}</p>
                    </div>
                  ))
                )}
              </div>
              <form
                className="border-t pt-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!selectedCustomerId || !inboundBody.trim()) return;
                  receiveSms.mutate({ customerId: selectedCustomerId, body: inboundBody });
                }}
              >
                <textarea
                  className="input min-h-20"
                  value={inboundBody}
                  onChange={(event) => setInboundBody(event.target.value)}
                  placeholder="Log an inbound SMS reply..."
                />
                <button type="submit" className="btn-secondary mt-2 text-sm" disabled={receiveSms.isPending || !inboundBody.trim()}>
                  Log inbound reply
                </button>
              </form>
            </div>
          )}
        </section>
      </aside>
    </div>
  );
}
