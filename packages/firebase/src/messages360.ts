import type {
  Automation,
  Campaign,
  Conversation,
  ConversationMessage,
  InternalChannel,
  InternalMessage,
  MessageTemplate,
  MessagingDashboardKpis,
  NotificationRecord,
  ReviewRequest,
  TimelineEvent,
} from '@clcrm/types';
import {
  aiGenerateMessage,
  classifyMessage,
  DEFAULT_AUTOMATIONS,
  DEFAULT_INTERNAL_CHANNELS,
  DEFAULT_MESSAGE_TEMPLATES,
  renderMessageTemplate,
} from '@clcrm/types';
import { nanoid } from 'nanoid';
import { getAdminFirestore, Timestamp } from './admin';
import { mapTimestampsFromData } from './firestore-utils';
import { colCreate, colDelete, colGet, colList, colUpdate } from './firestore';

function ts() {
  return Timestamp.now();
}

function orgPath(orgId: string, collection: string) {
  return `organizations/${orgId}/${collection}`;
}

function mapDoc<T>(data: Record<string, unknown>): T {
  return mapTimestampsFromData(data) as unknown as T;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function appBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'https://yuletide-lighting.web.app').replace(/\/$/, '');
}

async function ensurePortalAccessUrlForCustomer(orgId: string, customerId: string) {
  const customer = await colGet<{ portalToken?: string | null; portalEnabled?: boolean }>(orgId, 'customers', customerId);
  if (!customer) return `${appBaseUrl()}/portal/login`;
  let portalToken = customer.portalToken ?? null;
  const updates: Record<string, unknown> = {};
  if (!portalToken) {
    portalToken = nanoid(32);
    updates.portalToken = portalToken;
  }
  if (!customer.portalEnabled) {
    updates.portalEnabled = true;
    updates.portalInviteSentAt = new Date();
  }
  if (Object.keys(updates).length > 0) {
    await colUpdate(orgId, 'customers', customerId, updates);
  }
  return portalToken ? `${appBaseUrl()}/portal/${portalToken}` : `${appBaseUrl()}/portal/login`;
}

function hasPortalPlaceholder(text?: string | null) {
  if (!text) return false;
  return (
    /%7Btoken%7D/i.test(text)
    || /\{\{\s*token\s*\}\}/i.test(text)
    || /\{\s*token\s*\}/i.test(text)
    || /\{\{\s*portal(?:_|)link\s*\}\}/i.test(text)
    || /\{\s*portal(?:_|)link\s*\}/i.test(text)
    || /\{\{\s*portal(?:_|)url\s*\}\}/i.test(text)
    || /\{\s*portal(?:_|)url\s*\}/i.test(text)
    || /\/portal\/(%7Btoken%7D|\{token\})/i.test(text)
  );
}

async function replacePortalPlaceholders(
  orgId: string,
  customerId: string,
  text?: string | null,
) {
  if (!text) return text ?? undefined;
  if (!hasPortalPlaceholder(text)) return text;
  const portalAccessUrl = await ensurePortalAccessUrlForCustomer(orgId, customerId);
  return text
    .replace(/\/portal\/(%7Btoken%7D|\{token\})/gi, portalAccessUrl)
    .replace(/portal\/(%7Btoken%7D|\{token\})/gi, portalAccessUrl)
    .replace(/%7Btoken%7D/gi, portalAccessUrl)
    .replace(/\{\{\s*token\s*\}\}/gi, portalAccessUrl)
    .replace(/\{\s*token\s*\}/gi, portalAccessUrl)
    .replace(/\{\{\s*portal(?:_|)link\s*\}\}/gi, portalAccessUrl)
    .replace(/\{\s*portal(?:_|)link\s*\}/gi, portalAccessUrl)
    .replace(/\{\{\s*portal(?:_|)url\s*\}\}/gi, portalAccessUrl)
    .replace(/\{\s*portal(?:_|)url\s*\}/gi, portalAccessUrl);
}

async function msgCreate(orgId: string, conversationId: string, data: Record<string, unknown>) {
  const db = getAdminFirestore();
  const ref = db.collection(`${orgPath(orgId, 'conversations')}/${conversationId}/messages`).doc();
  const now = ts();
  await ref.set({ ...data, createdAt: now, updatedAt: now });
  return mapDoc<ConversationMessage>({ id: ref.id, conversationId, ...data, createdAt: now, updatedAt: now });
}

async function msgList(orgId: string, conversationId: string) {
  const db = getAdminFirestore();
  const snap = await db.collection(`${orgPath(orgId, 'conversations')}/${conversationId}/messages`).orderBy('createdAt', 'asc').get();
  return snap.docs.map((d) => mapDoc<ConversationMessage>({ id: d.id, conversationId, ...d.data()! }));
}

export async function ensureConversation(
  orgId: string,
  customerId: string,
  opts?: { propertyId?: string; source?: Conversation['source'] },
): Promise<Conversation> {
  const db = getAdminFirestore();
  const snap = await db.collection(orgPath(orgId, 'conversations')).where('customerId', '==', customerId).limit(1).get();
  if (!snap.empty) return mapDoc<Conversation>({ id: snap.docs[0]!.id, ...snap.docs[0]!.data()! });

  const customer = await colGet<{ firstName?: string; lastName?: string }>(orgId, 'customers', customerId);
  const customerName = customer ? `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() : null;
  const now = new Date();

  const created = await colCreate(orgId, 'conversations', {
    organizationId: orgId,
    customerId,
    customerName,
    propertyId: opts?.propertyId ?? null,
    propertyLabel: null,
    status: 'open',
    source: opts?.source ?? 'mixed',
    assignedUserId: null,
    assignedUserName: null,
    tags: [],
    priority: 'normal',
    category: 'general',
    lastActivityAt: now,
    lastMessagePreview: null,
    unreadCount: 0,
  });
  return mapDoc<Conversation>(created as Record<string, unknown>);
}

export async function listConversations(orgId: string): Promise<Conversation[]> {
  const db = getAdminFirestore();
  const snap = await db.collection(orgPath(orgId, 'conversations')).orderBy('lastActivityAt', 'desc').get();
  if (!snap.empty) return snap.docs.map((d) => mapDoc<Conversation>({ id: d.id, ...d.data()! }));

  // Migrate legacy messageThreads
  const threads = await colList<{ id: string; customerId: string; unreadCount?: number; lastMessageAt?: Date }>(orgId, 'messageThreads');
  for (const thread of threads) {
    await ensureConversation(orgId, thread.customerId);
  }
  const refreshed = await db.collection(orgPath(orgId, 'conversations')).orderBy('lastActivityAt', 'desc').get();
  return refreshed.docs.map((d) => mapDoc<Conversation>({ id: d.id, ...d.data()! }));
}

export async function getConversation(orgId: string, conversationId: string) {
  const raw = await colGet<Record<string, unknown>>(orgId, 'conversations', conversationId);
  if (!raw) return null;
  return mapDoc<Conversation>({ id: conversationId, ...raw });
}

export async function updateConversation(orgId: string, conversationId: string, data: Partial<Conversation>, userId?: string | null) {
  await colUpdate(orgId, 'conversations', conversationId, { ...data, updatedBy: userId });
  return getConversation(orgId, conversationId);
}

export async function sendMessage360(
  orgId: string,
  input: {
    customerId: string;
    conversationId?: string;
    channel: ConversationMessage['channel'];
    body: string;
    subject?: string;
    attachmentUrls?: string[];
    scheduledAt?: Date;
  },
  userId?: string | null,
  userName?: string | null,
) {
  const body = (await replacePortalPlaceholders(orgId, input.customerId, input.body)) ?? input.body;
  const subject = (await replacePortalPlaceholders(orgId, input.customerId, input.subject)) ?? input.subject;
  const conversation = input.conversationId
    ? await getConversation(orgId, input.conversationId)
    : await ensureConversation(orgId, input.customerId, { source: input.channel === 'portal' ? 'portal' : input.channel as Conversation['source'] });

  if (!conversation) throw new Error('Conversation not found');

  const classification = classifyMessage(body);
  const now = new Date();
  const message = await msgCreate(orgId, conversation.id, {
    channel: input.channel,
    direction: 'outbound',
    body,
    subject: subject ?? null,
    status: input.scheduledAt && input.scheduledAt > now ? 'sent' : 'delivered',
    sentByUserId: userId ?? null,
    sentByUserName: userName ?? null,
    deliveredAt: input.scheduledAt && input.scheduledAt > now ? null : now,
    readAt: null,
    openedAt: null,
    attachmentUrls: input.attachmentUrls ?? [],
    metadata: input.scheduledAt ? { scheduledAt: input.scheduledAt } : null,
    createdBy: userId,
    updatedBy: userId,
  });

  await colUpdate(orgId, 'conversations', conversation.id, {
    lastActivityAt: now,
    lastMessagePreview: body.slice(0, 120),
    status: 'waiting_on_customer',
    category: classification.category,
    priority: classification.priority,
    updatedBy: userId,
  });

  // Legacy compat
  await colCreate(orgId, 'messages', {
    threadId: conversation.id,
    customerId: input.customerId,
    channel: input.channel,
    direction: 'outbound',
    subject,
    body,
    sentByUserId: userId,
    isRead: false,
    status: 'delivered',
  });

  await colCreate(orgId, 'notifications', {
    organizationId: orgId,
    customerId: input.customerId,
    trigger: 'proposal_sent',
    channel: input.channel,
    title: subject ?? 'Message sent',
    body: body.slice(0, 200),
    status: 'delivered',
    sentAt: now,
  });

  return { conversation, message };
}

function normalizePhone(value?: string | null) {
  return (value ?? '').replace(/\D/g, '');
}

async function findCustomerForSms(
  orgId: string,
  input: { customerId?: string | null; fromPhone?: string | null },
) {
  if (input.customerId) {
    const customer = await colGet<{
      firstName?: string;
      lastName?: string;
      businessName?: string | null;
      phone?: string | null;
      mobilePhone?: string | null;
      smsOptIn?: boolean;
    }>(orgId, 'customers', input.customerId);
    if (customer) return { id: input.customerId, ...customer };
  }

  const phone = normalizePhone(input.fromPhone);
  if (!phone) return null;
  const customers = await colList<{
    id: string;
    firstName?: string;
    lastName?: string;
    businessName?: string | null;
    phone?: string | null;
    mobilePhone?: string | null;
    smsOptIn?: boolean;
  }>(orgId, 'customers');
  return customers.find((customer) => {
    const numbers = [customer.mobilePhone, customer.phone].map(normalizePhone).filter(Boolean);
    return numbers.some((number) => number.endsWith(phone) || phone.endsWith(number));
  }) ?? null;
}

export async function sendBulkSms360(
  orgId: string,
  input: { name: string; customerIds: string[]; body: string },
  userId?: string | null,
  userName?: string | null,
) {
  const uniqueCustomerIds = Array.from(new Set(input.customerIds));
  const results: Array<{ customerId: string; status: 'sent' | 'skipped' | 'failed'; reason?: string }> = [];
  let deliveredCount = 0;

  const campaign = await colCreate(orgId, 'campaigns', {
    organizationId: orgId,
    name: input.name,
    campaignType: 'sms',
    seasonalType: null,
    audience: [],
    templateId: null,
    subject: null,
    body: input.body,
    scheduledAt: null,
    sentAt: null,
    status: 'sending',
    recipientCount: uniqueCustomerIds.length,
    deliveredCount: 0,
    openedCount: 0,
    revenueCents: 0,
    createdBy: userId,
    updatedBy: userId,
  }) as unknown as Campaign;

  for (const customerId of uniqueCustomerIds) {
    const customer = await findCustomerForSms(orgId, { customerId });
    if (!customer) {
      results.push({ customerId, status: 'failed', reason: 'Customer not found' });
      continue;
    }
    if (customer.smsOptIn === false) {
      results.push({ customerId, status: 'skipped', reason: 'Customer is opted out of SMS' });
      continue;
    }
    if (!normalizePhone(customer.mobilePhone ?? customer.phone)) {
      results.push({ customerId, status: 'skipped', reason: 'No SMS-capable phone number' });
      continue;
    }

    try {
      await sendMessage360(orgId, { customerId, channel: 'sms', body: input.body }, userId, userName ?? 'Bulk SMS');
      deliveredCount += 1;
      results.push({ customerId, status: 'sent' });
    } catch (error) {
      results.push({ customerId, status: 'failed', reason: error instanceof Error ? error.message : 'Send failed' });
    }
  }

  await colUpdate(orgId, 'campaigns', campaign.id, {
    status: 'sent',
    sentAt: new Date(),
    deliveredCount,
    updatedBy: userId,
  });

  return {
    campaignId: campaign.id,
    requested: uniqueCustomerIds.length,
    sent: deliveredCount,
    skipped: results.filter((result) => result.status === 'skipped').length,
    failed: results.filter((result) => result.status === 'failed').length,
    results,
  };
}

export async function receiveSms360(
  orgId: string,
  input: { customerId?: string | null; fromPhone?: string | null; body: string; providerMessageId?: string | null },
) {
  const customer = await findCustomerForSms(orgId, input);
  if (!customer) throw new Error('Could not match inbound SMS to a customer');

  const conversation = await ensureConversation(orgId, customer.id, { source: 'sms' });
  const classification = classifyMessage(input.body);
  const now = new Date();
  const customerDisplayName = customer.businessName ?? (`${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() || null);
  const message = await msgCreate(orgId, conversation.id, {
    channel: 'sms',
    direction: 'inbound',
    body: input.body,
    subject: null,
    status: 'delivered',
    sentByUserId: null,
    sentByUserName: customerDisplayName,
    deliveredAt: now,
    readAt: null,
    openedAt: null,
    attachmentUrls: [],
    metadata: {
      fromPhone: input.fromPhone ?? null,
      providerMessageId: input.providerMessageId ?? null,
    },
  });

  await colUpdate(orgId, 'conversations', conversation.id, {
    lastActivityAt: now,
    lastMessagePreview: input.body.slice(0, 120),
    status: 'waiting_on_staff',
    source: conversation.source === 'mixed' ? 'mixed' : 'sms',
    unreadCount: (conversation.unreadCount ?? 0) + 1,
    category: classification.category,
    priority: classification.priority,
  });

  await colCreate(orgId, 'messages', {
    threadId: conversation.id,
    customerId: customer.id,
    channel: 'sms',
    direction: 'inbound',
    subject: null,
    body: input.body,
    sentByUserId: null,
    isRead: false,
    status: 'delivered',
  });

  return { conversation, message };
}

export async function receivePortalMessage(
  orgId: string,
  input: { customerId: string; body: string; attachmentUrls?: string[] },
) {
  const conversation = await ensureConversation(orgId, input.customerId, { source: 'portal' });
  const classification = classifyMessage(input.body);
  const now = new Date();

  const message = await msgCreate(orgId, conversation.id, {
    channel: 'portal',
    direction: 'inbound',
    body: input.body,
    subject: null,
    status: 'delivered',
    sentByUserId: null,
    sentByUserName: null,
    deliveredAt: now,
    readAt: null,
    openedAt: null,
    attachmentUrls: input.attachmentUrls ?? [],
    metadata: null,
  });

  await colUpdate(orgId, 'conversations', conversation.id, {
    lastActivityAt: now,
    lastMessagePreview: input.body.slice(0, 120),
    status: 'waiting_on_staff',
    unreadCount: (conversation.unreadCount ?? 0) + 1,
    category: classification.category,
    priority: classification.priority,
  });

  return { conversation, message };
}

export async function markMessageRead(orgId: string, conversationId: string, messageId: string) {
  const db = getAdminFirestore();
  await db.doc(`${orgPath(orgId, 'conversations')}/${conversationId}/messages/${messageId}`).update({
    status: 'read',
    readAt: ts(),
    updatedAt: ts(),
  });
  const conversation = await getConversation(orgId, conversationId);
  if (conversation && (conversation.unreadCount ?? 0) > 0) {
    await colUpdate(orgId, 'conversations', conversationId, {
      unreadCount: Math.max(0, (conversation.unreadCount ?? 0) - 1),
    });
  }
}

export async function getCustomerTimeline(orgId: string, customerId: string): Promise<TimelineEvent[]> {
  const conversation = await ensureConversation(orgId, customerId);
  const messages = await msgList(orgId, conversation.id);
  const events: TimelineEvent[] = messages.map((m) => ({
    id: m.id,
    type: m.channel === 'sms'
      ? (m.direction === 'outbound' ? 'sms_sent' : 'sms_received')
      : m.channel === 'email'
        ? (m.direction === 'outbound' ? 'email_sent' : 'email_opened')
        : 'portal_message',
    title: m.direction === 'outbound' ? `${m.channel.toUpperCase()} sent` : `${m.channel.toUpperCase()} received`,
    description: m.body.slice(0, 200),
    occurredAt: m.createdAt,
    channel: m.channel,
  }));

  const notifications = await colList<{ id: string; customerId?: string; title: string; sentAt?: Date; createdAt: Date }>(orgId, 'notifications');
  for (const a of notifications.filter((n) => n.customerId === customerId)) {
    events.push({
      id: a.id,
      type: 'internal_note',
      title: a.title,
      occurredAt: a.sentAt ?? a.createdAt,
    });
  }

  return events.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
}

export async function ensureMessageTemplates(orgId: string): Promise<MessageTemplate[]> {
  const db = getAdminFirestore();
  const snap = await db.collection(orgPath(orgId, 'templates')).get();
  if (!snap.empty) return snap.docs.map((d) => mapDoc<MessageTemplate>({ id: d.id, ...d.data()! }));

  const legacy = await colList<{ id: string; name: string; body: string }>(orgId, 'messageTemplates');
  if (legacy.length) {
    return legacy.map((t) => mapDoc<MessageTemplate>({
      id: t.id, organizationId: orgId, name: t.name, category: 'proposal_follow_up',
      channel: 'email', subject: null, body: t.body, variables: [], isActive: true,
      createdAt: new Date(), updatedAt: new Date(),
    }));
  }

  const now = ts();
  const templates: MessageTemplate[] = [];
  for (const t of DEFAULT_MESSAGE_TEMPLATES) {
    const ref = db.collection(orgPath(orgId, 'templates')).doc();
    const data = { organizationId: orgId, ...t, createdAt: now, updatedAt: now };
    await ref.set(data);
    templates.push(mapDoc<MessageTemplate>({ id: ref.id, ...data }));
  }
  return templates;
}

export async function createMessageTemplate(orgId: string, input: Omit<MessageTemplate, keyof import('@clcrm/types').MessageAuditFields | 'id' | 'organizationId' | 'variables'>, userId?: string | null) {
  const created = await colCreate(orgId, 'templates', { organizationId: orgId, ...input, variables: [], createdBy: userId, updatedBy: userId });
  return mapDoc<MessageTemplate>(created as Record<string, unknown>);
}

export async function updateMessageTemplate(
  orgId: string,
  templateId: string,
  input: Partial<MessageTemplate>,
  userId?: string | null,
) {
  await colUpdate(orgId, 'templates', templateId, { ...input, updatedBy: userId });
  return colGet<MessageTemplate>(orgId, 'templates', templateId);
}

export async function deleteMessageTemplate(orgId: string, templateId: string) {
  await colDelete(orgId, 'templates', templateId);
  return { success: true as const };
}

export async function ensureAutomations(orgId: string): Promise<Automation[]> {
  const db = getAdminFirestore();
  const snap = await db.collection(orgPath(orgId, 'automations')).get();
  if (!snap.empty) return snap.docs.map((d) => mapDoc<Automation>({ id: d.id, ...d.data()! }));

  const legacy = await colList<Automation>(orgId, 'automations');
  if (legacy.length) return legacy;

  const now = ts();
  const automations: Automation[] = [];
  for (const a of DEFAULT_AUTOMATIONS) {
    const ref = db.collection(orgPath(orgId, 'automations')).doc();
    const data = { organizationId: orgId, ...a, sentCount: 0, createdAt: now, updatedAt: now };
    await ref.set(data);
    automations.push(mapDoc<Automation>({ id: ref.id, ...data }));
  }
  return automations;
}

export async function createAutomation(orgId: string, input: Omit<Automation, keyof import('@clcrm/types').MessageAuditFields | 'id' | 'organizationId' | 'sentCount'>, userId?: string | null) {
  return colCreate(orgId, 'automations', { organizationId: orgId, ...input, sentCount: 0, createdBy: userId, updatedBy: userId }) as Promise<Automation>;
}

export async function updateAutomation(
  orgId: string,
  automationId: string,
  input: Partial<Automation>,
  userId?: string | null,
) {
  await colUpdate(orgId, 'automations', automationId, { ...input, updatedBy: userId });
  return colGet<Automation>(orgId, 'automations', automationId);
}

export async function deleteAutomation(orgId: string, automationId: string) {
  await colDelete(orgId, 'automations', automationId);
  return { success: true as const };
}

export async function toggleAutomation(orgId: string, automationId: string, isActive: boolean, userId?: string | null) {
  await colUpdate(orgId, 'automations', automationId, { isActive, updatedBy: userId });
  return colGet<Automation>(orgId, 'automations', automationId);
}

export async function triggerAutomation(
  orgId: string,
  trigger: Automation['trigger'],
  customerId: string,
  vars: Record<string, string> = {},
  userId?: string | null,
) {
  const automations = (await ensureAutomations(orgId)).filter((a) => a.trigger === trigger && a.isActive);
  const results = [];

  for (const auto of automations) {
    const body = renderMessageTemplate(auto.body, vars);
    const subject = auto.subject ? renderMessageTemplate(auto.subject, vars) : undefined;

    if (auto.channel === 'internal') {
      const channels = await ensureInternalChannels(orgId);
      const dispatch = channels.find((c) => c.channelType === 'dispatch') ?? channels[0];
      if (dispatch) {
        await sendInternalMessage(orgId, dispatch.id, body, userId ?? 'system', 'Automation');
      }
    } else {
      const result = await sendMessage360(orgId, {
        customerId,
        channel: auto.channel,
        body,
        subject,
      }, userId, 'Automation');
      results.push(result);
    }

    await colUpdate(orgId, 'automations', auto.id, { sentCount: auto.sentCount + 1 });
    await colCreate(orgId, 'notifications', {
      organizationId: orgId,
      customerId,
      trigger,
      channel: auto.channel,
      title: auto.name,
      body: body.slice(0, 200),
      status: 'sent',
      sentAt: new Date(),
    });
  }

  return results;
}

export async function listCampaigns(orgId: string) {
  return colList<Campaign>(orgId, 'campaigns');
}

export async function createCampaign(
  orgId: string,
  input: Omit<Campaign, keyof import('@clcrm/types').MessageAuditFields | 'id' | 'organizationId' | 'sentAt' | 'status' | 'recipientCount' | 'deliveredCount' | 'openedCount' | 'revenueCents'>,
  userId?: string | null,
) {
  const customers = await colList<{ id: string; tags?: string[] }>(orgId, 'customers');
  const recipientCount = customers.length;

  return colCreate(orgId, 'campaigns', {
    organizationId: orgId,
    ...input,
    status: input.scheduledAt ? 'scheduled' : 'draft',
    recipientCount,
    deliveredCount: 0,
    openedCount: 0,
    revenueCents: 0,
    sentAt: null,
    createdBy: userId,
    updatedBy: userId,
  }) as Promise<Campaign>;
}

export async function sendCampaign(orgId: string, campaignId: string, userId?: string | null) {
  const campaign = await colGet<Campaign>(orgId, 'campaigns', campaignId);
  if (!campaign) throw new Error('Campaign not found');

  const customers = await colList<{ id: string }>(orgId, 'customers');
  let delivered = 0;

  for (const customer of customers.slice(0, 50)) {
    const channels: Array<'sms' | 'email'> = campaign.campaignType === 'mixed' ? ['sms', 'email'] : [campaign.campaignType];
    for (const channel of channels) {
      await sendMessage360(orgId, { customerId: customer.id, channel, body: campaign.body, subject: campaign.subject ?? undefined }, userId, 'Campaign');
      delivered++;
    }
  }

  await colUpdate(orgId, 'campaigns', campaignId, {
    status: 'sent',
    sentAt: new Date(),
    deliveredCount: delivered,
    updatedBy: userId,
  });

  return colGet<Campaign>(orgId, 'campaigns', campaignId);
}

export async function updateCampaign(
  orgId: string,
  campaignId: string,
  input: Partial<Campaign>,
  userId?: string | null,
) {
  await colUpdate(orgId, 'campaigns', campaignId, { ...input, updatedBy: userId });
  return colGet<Campaign>(orgId, 'campaigns', campaignId);
}

export async function deleteCampaign(orgId: string, campaignId: string) {
  await colDelete(orgId, 'campaigns', campaignId);
  return { success: true as const };
}

export async function deleteConversation(orgId: string, conversationId: string) {
  await colDelete(orgId, 'conversations', conversationId);
  return { success: true as const };
}

export async function ensureInternalChannels(orgId: string): Promise<InternalChannel[]> {
  const db = getAdminFirestore();
  const snap = await db.collection(orgPath(orgId, 'internalChannels')).get();
  if (!snap.empty) return snap.docs.map((d) => mapDoc<InternalChannel>({ id: d.id, ...d.data()! }));

  const now = ts();
  const channels: InternalChannel[] = [];
  for (const ch of DEFAULT_INTERNAL_CHANNELS) {
    const ref = db.collection(orgPath(orgId, 'internalChannels')).doc();
    const data = {
      organizationId: orgId,
      name: ch.name,
      channelType: ch.channelType,
      memberIds: [],
      isDirect: false,
      lastMessageAt: null,
      lastMessagePreview: null,
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(data);
    channels.push(mapDoc<InternalChannel>({ id: ref.id, ...data }));
  }
  return channels;
}

export async function sendInternalMessage(
  orgId: string,
  channelId: string,
  body: string,
  userId: string,
  userName?: string | null,
  mentions: string[] = [],
  attachmentUrls: string[] = [],
) {
  const db = getAdminFirestore();
  const ref = db.collection(`${orgPath(orgId, 'internalChannels')}/${channelId}/messages`).doc();
  const now = ts();
  const data = {
    channelId,
    body,
    sentByUserId: userId,
    sentByUserName: userName ?? null,
    mentions,
    attachmentUrls,
    readByUserIds: [userId],
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(data);

  await db.doc(`${orgPath(orgId, 'internalChannels')}/${channelId}`).update({
    lastMessageAt: now,
    lastMessagePreview: body.slice(0, 120),
    updatedAt: now,
  });

  return mapDoc<InternalMessage>({ id: ref.id, ...data });
}

export async function listInternalMessages(orgId: string, channelId: string) {
  const db = getAdminFirestore();
  const snap = await db.collection(`${orgPath(orgId, 'internalChannels')}/${channelId}/messages`).orderBy('createdAt', 'asc').get();
  return snap.docs.map((d) => mapDoc<InternalMessage>({ id: d.id, channelId, ...d.data()! }));
}

export async function listReviewRequests(orgId: string) {
  return colList<ReviewRequest>(orgId, 'reviewRequests');
}

export async function createReviewRequest(
  orgId: string,
  input: { customerId: string; jobId?: string; channel: ReviewRequest['channel']; reviewUrl?: string },
  userId?: string | null,
) {
  const customer = await colGet<{ firstName?: string; lastName?: string }>(orgId, 'customers', input.customerId);
  const customerName = customer ? `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() : null;

  const request = await colCreate(orgId, 'reviewRequests', {
    organizationId: orgId,
    customerId: input.customerId,
    customerName,
    jobId: input.jobId ?? null,
    channel: input.channel,
    reviewUrl: input.reviewUrl ?? null,
    status: 'pending',
    sentAt: null,
    clickedAt: null,
    submittedAt: null,
    createdBy: userId,
    updatedBy: userId,
  }) as ReviewRequest;

  await sendMessage360(orgId, {
    customerId: input.customerId,
    channel: input.channel,
    body: `Hi ${customerName ?? 'there'}! Thank you for choosing us. We'd love a review: ${input.reviewUrl ?? 'https://g.page/review'}`,
  }, userId, 'Review Engine');

  await colUpdate(orgId, 'reviewRequests', request.id, { status: 'sent', sentAt: new Date() });
  return colGet<ReviewRequest>(orgId, 'reviewRequests', request.id);
}

export async function getMessagingDashboard(orgId: string): Promise<MessagingDashboardKpis> {
  const today = startOfToday();
  const conversations = await listConversations(orgId);
  const campaigns = await listCampaigns(orgId);
  const reviews = await listReviewRequests(orgId);
  const automations = await ensureAutomations(orgId);

  let messagesSentToday = 0;
  let messagesDelivered = 0;
  let messagesOpened = 0;
  let smsResponses = 0;
  let emailResponses = 0;

  for (const conv of conversations) {
    const msgs = await msgList(orgId, conv.id);
    for (const m of msgs) {
      if (m.createdAt >= today && m.direction === 'outbound') messagesSentToday++;
      if (m.status === 'delivered' || m.status === 'read' || m.status === 'opened') messagesDelivered++;
      if (m.status === 'opened' || m.openedAt) messagesOpened++;
      if (m.channel === 'sms' && m.direction === 'inbound') smsResponses++;
      if (m.channel === 'email' && m.direction === 'inbound') emailResponses++;
    }
  }

  return {
    messagesSentToday,
    messagesDelivered,
    messagesOpened,
    smsResponses,
    emailResponses,
    activeConversations: conversations.filter((c) => c.status !== 'closed').length,
    automationMessagesSent: automations.reduce((s, a) => s + a.sentCount, 0),
    reviewRequestsSent: reviews.filter((r) => r.status !== 'pending').length,
    reviewsReceived: reviews.filter((r) => r.status === 'submitted').length,
    renewalCampaignRevenueCents: campaigns.reduce((s, c) => s + c.revenueCents, 0),
  };
}

export async function listNotifications(orgId: string) {
  return colList<NotificationRecord>(orgId, 'notifications');
}

export async function aiCommunicationAssistant(prompt: string) {
  return aiGenerateMessage(prompt);
}

export async function getConversationMessages(orgId: string, conversationId: string) {
  return msgList(orgId, conversationId);
}

export async function getConversationByCustomer(orgId: string, customerId: string) {
  const conversation = await ensureConversation(orgId, customerId);
  const messages = await msgList(orgId, conversation.id);
  return { conversation, messages };
}
