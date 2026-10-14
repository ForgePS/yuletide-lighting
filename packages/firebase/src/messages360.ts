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
  fillMessagePlaceholders,
  hasMessagePlaceholders,
  htmlMessageToPlainText,
  looksLikeHtmlMessage,
  resolveOutboundMessageStatus,
} from '@clcrm/types';
import { createHmac, timingSafeEqual } from 'crypto';
import { getAdminFirestore, Timestamp } from './admin';
import { mapTimestampsFromData } from './firestore-utils';
import { colCreate, colGet, colList, colUpdate, getOrganization } from './firestore';
import {
  deliverCustomerEmail,
  EmailDeliveryError,
  type CustomerEmailDeliveryResult,
} from './email-delivery';
import { DEMO_EMAIL_SIMULATED, isDemoOrganization } from './demo-tenant';

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

async function msgCreate(orgId: string, conversationId: string, data: Record<string, unknown>) {
  const db = getAdminFirestore();
  const ref = db.collection(`${orgPath(orgId, 'conversations')}/${conversationId}/messages`).doc();
  const now = ts();
  await ref.set({ ...data, createdAt: now, updatedAt: now });
  return mapDoc<ConversationMessage>({
    id: ref.id,
    conversationId,
    ...data,
    createdAt: now,
    updatedAt: now,
  });
}

async function msgList(orgId: string, conversationId: string) {
  const db = getAdminFirestore();
  const snap = await db
    .collection(`${orgPath(orgId, 'conversations')}/${conversationId}/messages`)
    .orderBy('createdAt', 'asc')
    .get();
  return snap.docs.map((d) =>
    mapDoc<ConversationMessage>({ id: d.id, conversationId, ...d.data()! }),
  );
}

export async function ensureConversation(
  orgId: string,
  customerId: string,
  opts?: { propertyId?: string; source?: Conversation['source'] },
): Promise<Conversation> {
  const db = getAdminFirestore();
  const snap = await db
    .collection(orgPath(orgId, 'conversations'))
    .where('customerId', '==', customerId)
    .limit(1)
    .get();
  if (!snap.empty) return mapDoc<Conversation>({ id: snap.docs[0]!.id, ...snap.docs[0]!.data()! });

  const customer = await colGet<{ firstName?: string; lastName?: string }>(
    orgId,
    'customers',
    customerId,
  );
  const customerName = customer
    ? `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim()
    : null;
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
  const snap = await db
    .collection(orgPath(orgId, 'conversations'))
    .orderBy('lastActivityAt', 'desc')
    .get();
  if (!snap.empty) return snap.docs.map((d) => mapDoc<Conversation>({ id: d.id, ...d.data()! }));

  // Migrate legacy messageThreads
  const threads = await colList<{
    id: string;
    customerId: string;
    unreadCount?: number;
    lastMessageAt?: Date;
  }>(orgId, 'messageThreads');
  for (const thread of threads) {
    await ensureConversation(orgId, thread.customerId);
  }
  const refreshed = await db
    .collection(orgPath(orgId, 'conversations'))
    .orderBy('lastActivityAt', 'desc')
    .get();
  return refreshed.docs.map((d) => mapDoc<Conversation>({ id: d.id, ...d.data()! }));
}

export async function getConversation(orgId: string, conversationId: string) {
  const raw = await colGet<Record<string, unknown>>(orgId, 'conversations', conversationId);
  if (!raw) return null;
  return mapDoc<Conversation>({ id: conversationId, ...raw });
}

export async function updateConversation(
  orgId: string,
  conversationId: string,
  data: Partial<Conversation>,
  userId?: string | null,
) {
  await colUpdate(orgId, 'conversations', conversationId, { ...data, updatedBy: userId });
  return getConversation(orgId, conversationId);
}

async function deliverEmailForOrg(
  orgId: string,
  input: { to: string; subject: string; text: string },
): Promise<CustomerEmailDeliveryResult> {
  const org = await getOrganization(orgId);
  if (isDemoOrganization(org)) {
    return { status: 'disabled', reason: DEMO_EMAIL_SIMULATED };
  }
  const { getCompanySettings } = await import('./settings360');
  const company = await getCompanySettings(orgId).catch(() => null);
  return deliverCustomerEmail({
    ...input,
    companyName: company?.dbaName || company?.companyName || org?.companyName || null,
    replyTo: company?.email?.trim() || null,
  });
}

function joinAddress(line1?: string | null, city?: string | null): string {
  return [line1?.trim(), city?.trim()].filter(Boolean).join(', ');
}

/** Values for CUSTOMER_MESSAGE_PLACEHOLDERS, from the customer, their first property, and company settings. */
export async function buildCustomerMessageVars(
  orgId: string,
  customerId: string,
): Promise<Record<string, string>> {
  const customer = await colGet<{
    firstName?: string | null;
    lastName?: string | null;
    businessName?: string | null;
    billingAddressLine1?: string | null;
    billingCity?: string | null;
    mailingAddressLine1?: string | null;
    mailingCity?: string | null;
  }>(orgId, 'customers', customerId);

  const { listCustomerProperties360 } = await import('./customer360');
  const { getCompanySettings } = await import('./settings360');
  const [properties, company, org] = await Promise.all([
    listCustomerProperties360(orgId, customerId).catch(() => []),
    getCompanySettings(orgId).catch(() => null),
    getOrganization(orgId).catch(() => null),
  ]);
  const property = properties.find((p) => p.addressLine1?.trim()) ?? null;

  const firstName = customer?.firstName?.trim() ?? '';
  const lastName = customer?.lastName?.trim() ?? '';
  const address =
    joinAddress(property?.addressLine1, property?.city) ||
    joinAddress(customer?.billingAddressLine1, customer?.billingCity) ||
    joinAddress(customer?.mailingAddressLine1, customer?.mailingCity);

  return {
    customerName: customer?.businessName?.trim() || `${firstName} ${lastName}`.trim() || 'there',
    firstName: firstName || customer?.businessName?.trim() || 'there',
    lastName,
    address,
    city: property?.city?.trim() || customer?.billingCity?.trim() || customer?.mailingCity?.trim() || '',
    companyName: company?.dbaName || company?.companyName || org?.companyName || '',
    companyPhone: company?.phone?.trim() || '',
  };
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
    /** Staff notification trigger; defaults to manual_outbound. */
    notificationTrigger?: string;
    /** When true, skip the staff notifications row (automation writes its own). */
    skipStaffNotification?: boolean;
    /** Extra placeholder values; customer placeholders are filled automatically. */
    vars?: Record<string, string>;
  },
  userId?: string | null,
  userName?: string | null,
) {
  if (input.channel !== 'internal' && (hasMessagePlaceholders(input.body) || hasMessagePlaceholders(input.subject))) {
    const vars = { ...(await buildCustomerMessageVars(orgId, input.customerId)), ...(input.vars ?? {}) };
    input = {
      ...input,
      body: fillMessagePlaceholders(input.body, vars),
      subject: input.subject === undefined ? undefined : fillMessagePlaceholders(input.subject, vars),
    };
  }

  if (input.channel === 'sms' && looksLikeHtmlMessage(input.body)) {
    input = { ...input, body: htmlMessageToPlainText(input.body) };
  }

  if (input.channel === 'sms') {
    const customer = await findCustomerForSms(orgId, { customerId: input.customerId });
    if (!customer) throw new Error('Customer not found');
    if (customer.smsOptIn === false) {
      throw new Error('Customer is opted out of SMS');
    }
  }

  let emailRecipient: string | null = null;
  if (input.channel === 'email') {
    const customer = await colGet<{ email?: string | null; emailOptIn?: boolean }>(
      orgId,
      'customers',
      input.customerId,
    );
    if (!customer) throw new Error('Customer not found');
    if (customer.emailOptIn === false) {
      throw new Error('Customer is opted out of email');
    }
    emailRecipient = customer.email?.trim() || null;
    if (!emailRecipient) throw new Error('Customer has no email address on file');
  }

  const conversation = input.conversationId
    ? await getConversation(orgId, input.conversationId)
    : await ensureConversation(orgId, input.customerId, {
        source: input.channel === 'portal' ? 'portal' : (input.channel as Conversation['source']),
      });

  if (!conversation) throw new Error('Conversation not found');

  const classification = classifyMessage(input.body);
  const now = new Date();
  // SMS has no Twilio adapter here yet — never claim provider delivery for it.
  let status = resolveOutboundMessageStatus({
    channel: input.channel,
    scheduledAt: input.scheduledAt ?? null,
    now,
    providerAdapterActive: false,
  });
  const deliveryMetadata: Record<string, unknown> = {};
  let deliveryError: string | null = null;

  if (emailRecipient && status !== 'queued') {
    const delivery = await deliverEmailForOrg(orgId, {
      to: emailRecipient,
      subject: input.subject?.trim() || 'Message from your lighting company',
      text: input.body,
    });
    deliveryMetadata.to = emailRecipient;
    if (delivery.status === 'sent') {
      status = 'sent';
      deliveryMetadata.provider = 'resend';
      deliveryMetadata.providerMessageId = delivery.providerMessageId;
    } else if (delivery.status === 'failed') {
      status = 'failed';
      deliveryError = delivery.reason;
      deliveryMetadata.deliveryError = delivery.reason;
    } else {
      deliveryMetadata.deliveryNote = delivery.reason;
    }
  }

  if (input.scheduledAt) deliveryMetadata.scheduledAt = input.scheduledAt;

  const message = await msgCreate(orgId, conversation.id, {
    channel: input.channel,
    direction: 'outbound',
    body: input.body,
    subject: input.subject ?? null,
    status,
    sentByUserId: userId ?? null,
    sentByUserName: userName ?? null,
    deliveredAt: status === 'recorded' || status === 'sent' ? now : null,
    readAt: null,
    openedAt: null,
    attachmentUrls: input.attachmentUrls ?? [],
    metadata: Object.keys(deliveryMetadata).length ? deliveryMetadata : null,
    createdBy: userId,
    updatedBy: userId,
  });

  if (deliveryError) {
    throw new EmailDeliveryError(`Email could not be sent: ${deliveryError}`);
  }

  await colUpdate(orgId, 'conversations', conversation.id, {
    lastActivityAt: now,
    lastMessagePreview: input.body.slice(0, 120),
    status: 'waiting_on_customer',
    category: classification.category,
    priority: classification.priority,
    updatedBy: userId,
  });

  // Legacy flat `messages` dual-write removed (P0.2B write freeze).

  if (!input.skipStaffNotification) {
    await colCreate(orgId, 'notifications', {
      organizationId: orgId,
      customerId: input.customerId,
      trigger: input.notificationTrigger ?? 'manual_outbound',
      channel: input.channel,
      title: input.subject ?? 'Message sent',
      body: input.body.slice(0, 200),
      status,
      sentAt: now,
    });
  }

  if (input.channel === 'portal') {
    try {
      const { notifyPortalCustomer } = await import('./portal360');
      await notifyPortalCustomer(orgId, input.customerId, {
        category: 'messaging',
        title: input.subject ?? 'New message',
        body: input.body.slice(0, 160),
        actionUrl: '/messages',
      });
    } catch {
      // Best-effort
    }
  }

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
  return (
    customers.find((customer) => {
      const numbers = [customer.mobilePhone, customer.phone].map(normalizePhone).filter(Boolean);
      return numbers.some((number) => number.endsWith(phone) || phone.endsWith(number));
    }) ?? null
  );
}

export async function sendBulkSms360(
  orgId: string,
  input: { name: string; customerIds: string[]; body: string },
  userId?: string | null,
  userName?: string | null,
) {
  const uniqueCustomerIds = Array.from(new Set(input.customerIds));
  const results: Array<{
    customerId: string;
    status: 'sent' | 'skipped' | 'failed';
    reason?: string;
  }> = [];
  let deliveredCount = 0;

  const campaign = (await colCreate(orgId, 'campaigns', {
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
  })) as unknown as Campaign;

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
      await sendMessage360(
        orgId,
        { customerId, channel: 'sms', body: input.body },
        userId,
        userName ?? 'Bulk SMS',
      );
      deliveredCount += 1;
      results.push({ customerId, status: 'sent' });
    } catch (error) {
      results.push({
        customerId,
        status: 'failed',
        reason: error instanceof Error ? error.message : 'Send failed',
      });
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

function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function phonesMatchForTwilio(configured: string, inbound: string): boolean {
  const configuredDigits = normalizePhoneDigits(configured);
  const digits = normalizePhoneDigits(inbound);
  if (configuredDigits.length < 7 || digits.length < 7) return false;
  return (
    configuredDigits === digits ||
    configuredDigits.endsWith(digits) ||
    digits.endsWith(configuredDigits)
  );
}

/** YL-S26 — collect all org ids whose configured Twilio number matches inbound To. */
export function collectTwilioPhoneOrgMatches(
  orgs: Array<{ id: string; twilioPhoneNumber?: string | null }>,
  toPhone: string,
): string[] {
  const digits = normalizePhoneDigits(toPhone);
  if (digits.length < 7) return [];
  const matches: string[] = [];
  for (const org of orgs) {
    if (typeof org.twilioPhoneNumber !== 'string') continue;
    if (phonesMatchForTwilio(org.twilioPhoneNumber, toPhone)) {
      matches.push(org.id);
    }
  }
  return matches;
}

/**
 * Resolve tenant from Twilio inbound "To" number. Fail closed — never trust client organizationId.
 * YL-S26: return orgId only when exactly one org matches; collisions → null.
 */
export async function resolveOrganizationIdByTwilioToPhone(
  toPhone: string,
): Promise<string | null> {
  const digits = normalizePhoneDigits(toPhone);
  if (digits.length < 7) return null;

  const db = getAdminFirestore();
  const snap = await db.collection('organizations').where('twilioPhoneNumber', '!=', null).get();
  const orgs = snap.docs.map((doc) => ({
    id: doc.id,
    twilioPhoneNumber: doc.data()?.twilioPhoneNumber as string | null | undefined,
  }));
  const matches = collectTwilioPhoneOrgMatches(orgs, toPhone);
  if (matches.length !== 1) return null;
  return matches[0]!;
}

/**
 * YL-S26 — refuse assigning a Twilio number already used by another organization.
 */
export async function assertTwilioPhoneUnique(orgId: string, phone: string): Promise<void> {
  const digits = normalizePhoneDigits(phone);
  if (digits.length < 7) {
    throw new Error('Twilio phone number is invalid');
  }
  const db = getAdminFirestore();
  const snap = await db.collection('organizations').where('twilioPhoneNumber', '!=', null).get();
  const orgs = snap.docs.map((doc) => ({
    id: doc.id,
    twilioPhoneNumber: doc.data()?.twilioPhoneNumber as string | null | undefined,
  }));
  const matches = collectTwilioPhoneOrgMatches(orgs, phone).filter((id) => id !== orgId);
  if (matches.length > 0) {
    throw new Error('This Twilio phone number is already assigned to another organization');
  }
}

/**
 * YL-S14 — Twilio webhook signature check (HMAC-SHA1).
 * Fail closed when auth token or signature is missing.
 */
export function verifyTwilioRequestSignature(input: {
  authToken?: string | null;
  signature?: string | null;
  url: string;
  params: Record<string, string>;
}): { ok: boolean; reason?: string } {
  const token = typeof input.authToken === 'string' ? input.authToken.trim() : '';
  if (!token) return { ok: false, reason: 'TWILIO_AUTH_TOKEN_MISSING' };
  const signature = typeof input.signature === 'string' ? input.signature.trim() : '';
  if (!signature) return { ok: false, reason: 'SIGNATURE_MISSING' };
  const url = typeof input.url === 'string' ? input.url.trim() : '';
  if (!url) return { ok: false, reason: 'WEBHOOK_URL_MISSING' };

  const data =
    url +
    Object.keys(input.params)
      .sort()
      .reduce((acc, key) => acc + key + String(input.params[key] ?? ''), '');
  const expected = createHmac('sha1', token).update(Buffer.from(data, 'utf-8')).digest('base64');
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, reason: 'SIGNATURE_MISMATCH' };
    }
  } catch {
    return { ok: false, reason: 'SIGNATURE_MISMATCH' };
  }
  return { ok: true };
}

export async function receiveSms360(
  orgId: string,
  input: {
    customerId?: string | null;
    fromPhone?: string | null;
    body: string;
    providerMessageId?: string | null;
  },
) {
  const customer = await findCustomerForSms(orgId, input);
  if (!customer) throw new Error('Could not match inbound SMS to a customer');

  const conversation = await ensureConversation(orgId, customer.id, { source: 'sms' });
  const classification = classifyMessage(input.body);
  const now = new Date();
  const customerDisplayName =
    customer.businessName ??
    (`${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() || null);
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

  // Legacy flat `messages` dual-write removed (P0.2B write freeze).

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
  const conversation = await getConversation(orgId, conversationId);
  await db
    .doc(`${orgPath(orgId, 'conversations')}/${conversationId}/messages/${messageId}`)
    .update({
      status: 'read',
      readAt: ts(),
      updatedAt: ts(),
    });
  if (conversation) {
    await colUpdate(orgId, 'conversations', conversationId, {
      unreadCount: Math.max(0, (conversation.unreadCount ?? 0) - 1),
    });
  }
}

export async function getCustomerTimeline(
  orgId: string,
  customerId: string,
): Promise<TimelineEvent[]> {
  const conversation = await ensureConversation(orgId, customerId);
  const messages = await msgList(orgId, conversation.id);
  const events: TimelineEvent[] = messages.map((m) => ({
    id: m.id,
    type:
      m.channel === 'sms'
        ? m.direction === 'outbound'
          ? 'sms_sent'
          : 'sms_received'
        : m.channel === 'email'
          ? m.direction === 'outbound'
            ? 'email_sent'
            : 'email_opened'
          : 'portal_message',
    title:
      m.direction === 'outbound'
        ? `${m.channel.toUpperCase()} sent`
        : `${m.channel.toUpperCase()} received`,
    description: m.body.slice(0, 200),
    occurredAt: m.createdAt,
    channel: m.channel,
  }));

  const notifications = await colList<{
    id: string;
    customerId?: string;
    title: string;
    sentAt?: Date;
    createdAt: Date;
  }>(orgId, 'notifications');
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

  const legacy = await colList<{ id: string; name: string; body: string }>(
    orgId,
    'messageTemplates',
  );
  if (legacy.length) {
    return legacy.map((t) =>
      mapDoc<MessageTemplate>({
        id: t.id,
        organizationId: orgId,
        name: t.name,
        category: 'proposal_follow_up',
        channel: 'email',
        subject: null,
        body: t.body,
        variables: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
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

export async function createMessageTemplate(
  orgId: string,
  input: Omit<
    MessageTemplate,
    keyof import('@clcrm/types').MessageAuditFields | 'id' | 'organizationId' | 'variables'
  >,
  userId?: string | null,
) {
  const variables = extractTemplateVariables(input.subject, input.body);
  const created = await colCreate(orgId, 'templates', {
    organizationId: orgId,
    ...input,
    variables,
    createdBy: userId,
    updatedBy: userId,
  });
  return mapDoc<MessageTemplate>(created as Record<string, unknown>);
}

export async function updateMessageTemplate(
  orgId: string,
  templateId: string,
  input: Partial<{
    name: string;
    category: MessageTemplate['category'];
    channel: MessageTemplate['channel'];
    subject: string | null;
    body: string;
    isActive: boolean;
  }>,
  userId?: string | null,
) {
  const patch: Record<string, unknown> = { ...input, updatedBy: userId ?? null };
  if (input.body !== undefined || input.subject !== undefined) {
    const current = await colGet<MessageTemplate>(orgId, 'templates', templateId);
    patch.variables = extractTemplateVariables(
      input.subject !== undefined ? input.subject : current?.subject,
      input.body !== undefined ? input.body : (current?.body ?? ''),
    );
  }
  await colUpdate(orgId, 'templates', templateId, patch);
  return colGet<MessageTemplate>(orgId, 'templates', templateId);
}

function extractTemplateVariables(
  subject: string | null | undefined,
  body: string | null | undefined,
) {
  const text = `${subject ?? ''}\n${body ?? ''}`;
  return [...new Set([...text.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1]))];
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

export async function createAutomation(
  orgId: string,
  input: Omit<
    Automation,
    keyof import('@clcrm/types').MessageAuditFields | 'id' | 'organizationId' | 'sentCount'
  >,
  userId?: string | null,
) {
  return colCreate(orgId, 'automations', {
    organizationId: orgId,
    ...input,
    sentCount: 0,
    createdBy: userId,
    updatedBy: userId,
  }) as Promise<Automation>;
}

export async function toggleAutomation(
  orgId: string,
  automationId: string,
  isActive: boolean,
  userId?: string | null,
) {
  await colUpdate(orgId, 'automations', automationId, { isActive, updatedBy: userId });
  return colGet<Automation>(orgId, 'automations', automationId);
}

export async function updateAutomation(
  orgId: string,
  automationId: string,
  input: Partial<{
    name: string;
    subject: string | null;
    body: string;
    delayDays: number;
    isActive: boolean;
  }>,
  userId?: string | null,
) {
  await colUpdate(orgId, 'automations', automationId, { ...input, updatedBy: userId ?? null });
  return colGet<Automation>(orgId, 'automations', automationId);
}

export async function triggerAutomation(
  orgId: string,
  trigger: Automation['trigger'],
  customerId: string,
  vars: Record<string, string> = {},
  userId?: string | null,
) {
  const automations = (await ensureAutomations(orgId)).filter(
    (a) => a.trigger === trigger && a.isActive,
  );
  const results = [];

  for (const auto of automations) {
    const body = fillMessagePlaceholders(auto.body, vars);
    const subject = auto.subject ? fillMessagePlaceholders(auto.subject, vars) : undefined;

    if (auto.channel === 'internal') {
      const channels = await ensureInternalChannels(orgId);
      const dispatch = channels.find((c) => c.channelType === 'dispatch') ?? channels[0];
      if (dispatch) {
        await sendInternalMessage(orgId, dispatch.id, body, userId ?? 'system', 'Automation');
      }
    } else {
      const result = await sendMessage360(
        orgId,
        {
          customerId,
          channel: auto.channel,
          body,
          subject,
          notificationTrigger: trigger,
          skipStaffNotification: true,
        },
        userId,
        'Automation',
      );
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
      status: 'recorded',
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
  input: Omit<
    Campaign,
    | keyof import('@clcrm/types').MessageAuditFields
    | 'id'
    | 'organizationId'
    | 'sentAt'
    | 'status'
    | 'recipientCount'
    | 'deliveredCount'
    | 'openedCount'
    | 'revenueCents'
  >,
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
    const channels: Array<'sms' | 'email'> =
      campaign.campaignType === 'mixed' ? ['sms', 'email'] : [campaign.campaignType];
    for (const channel of channels) {
      await sendMessage360(
        orgId,
        {
          customerId: customer.id,
          channel,
          body: campaign.body,
          subject: campaign.subject ?? undefined,
        },
        userId,
        'Campaign',
      );
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
  const snap = await db
    .collection(`${orgPath(orgId, 'internalChannels')}/${channelId}/messages`)
    .orderBy('createdAt', 'asc')
    .get();
  return snap.docs.map((d) => mapDoc<InternalMessage>({ id: d.id, channelId, ...d.data()! }));
}

export async function listReviewRequests(orgId: string) {
  return colList<ReviewRequest>(orgId, 'reviewRequests');
}

export async function createReviewRequest(
  orgId: string,
  input: {
    customerId: string;
    jobId?: string;
    channel: ReviewRequest['channel'];
    reviewUrl?: string;
  },
  userId?: string | null,
) {
  const customer = await colGet<{ firstName?: string; lastName?: string }>(
    orgId,
    'customers',
    input.customerId,
  );
  const customerName = customer
    ? `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim()
    : null;

  const request = (await colCreate(orgId, 'reviewRequests', {
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
  })) as ReviewRequest;

  await sendMessage360(
    orgId,
    {
      customerId: input.customerId,
      channel: input.channel,
      body: `Hi ${customerName ?? 'there'}! Thank you for choosing us. We'd love a review: ${input.reviewUrl ?? 'https://g.page/review'}`,
    },
    userId,
    'Review Engine',
  );

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
      if (m.status === 'delivered' || m.status === 'read' || m.status === 'opened')
        messagesDelivered++;
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
