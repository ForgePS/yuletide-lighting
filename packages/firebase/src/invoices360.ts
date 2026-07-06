import type {
  AgingBucketSummary,
  AiCollectionsQueryResult,
  CashFlowForecast,
  CollectionQueueItem,
  CustomerBalanceSummary,
  CustomerStatement,
  InvoiceActivity,
  InvoiceAnalytics,
  InvoiceDashboardKpis,
  InvoiceDispute,
  InvoicePayment,
  InvoiceRecord,
  InvoiceReminder,
  InvoiceStatus,
  InvoiceTemplate,
  ReminderStage,
  ReminderTemplate,
} from '@clcrm/types';
import {
  computeAgingBucket,
  computeBalanceDue,
  computeCollectionRisk,
  computeDaysOverdue,
  DEFAULT_REMINDER_TEMPLATES,
  getNextReminderStage,
  normalizeInvoiceStatus,
  renderTemplate,
} from '@clcrm/types';
import { getAdminFirestore, Timestamp } from './admin';
import { mapTimestampsFromData } from './firestore-utils';
import { colCreate, colDelete, colGet, colList, colUpdate, getByPublicToken, nanoid as firestoreNanoid } from './firestore';
import { getInvoiceSettings } from './settings360';

function ts() {
  return Timestamp.now();
}

function orgPath(orgId: string, collection: string) {
  return `organizations/${orgId}/${collection}`;
}

function mapDoc<T>(data: Record<string, unknown>): T {
  return mapTimestampsFromData(data) as unknown as T;
}

const DEFAULT_INVOICE_TEMPLATE: Omit<InvoiceTemplate, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'> = {
  organizationId: '',
  name: 'Default invoice template',
  description: 'Standard invoice layout',
  logoUrl: null,
  backgroundImageUrl: null,
  primaryColor: '#DC2626',
  pageWidth: 1024,
  pageHeight: 1325,
  contentHtml: '<h1>Invoice {{invoiceNumber}}</h1><p>Customer: {{customerName}}</p><p>Due: {{dueDate}}</p><p>Total: {{subtotal}}</p><p>Balance due: {{balanceDue}}</p>',
  blocks: [
    { id: 'title', type: 'field', x: 5, y: 4, width: 45, height: 8, fieldKey: 'invoiceNumber', content: 'Invoice #{{invoiceNumber}}', textSize: 32, align: 'left' },
    { id: 'customer', type: 'field', x: 5, y: 16, width: 50, height: 6, fieldKey: 'customerName', content: 'Customer: {{customerName}}', textSize: 16, align: 'left' },
    { id: 'due-date', type: 'field', x: 5, y: 24, width: 35, height: 5, fieldKey: 'dueDate', content: 'Due date: {{dueDate}}', textSize: 14, align: 'left' },
    { id: 'balance', type: 'field', x: 60, y: 16, width: 35, height: 10, fieldKey: 'balanceDue', content: 'Balance Due: {{balanceDue}}', textSize: 24, align: 'right' },
  ],
  isDefault: true,
  isActive: true,
};

function normalizeInvoice(raw: Record<string, unknown>): InvoiceRecord {
  const subtotalCents = Number(raw.subtotalCents ?? 0);
  const amountPaidCents = Number(raw.amountPaidCents ?? 0);
  const balanceDueCents = computeBalanceDue({ subtotalCents, amountPaidCents });
  const dueDate = raw.dueDate instanceof Date ? raw.dueDate : new Date(String(raw.dueDate ?? Date.now()));
  const daysOverdue = computeDaysOverdue(dueDate);
  const status = normalizeInvoiceStatus(String(raw.status ?? 'draft'));
  const agingBucket = computeAgingBucket(dueDate, balanceDueCents);
  const risk = computeCollectionRisk(daysOverdue, balanceDueCents);

  return {
    id: String(raw.id),
    organizationId: String(raw.organizationId ?? ''),
    invoiceNumber: String(raw.invoiceNumber ?? ''),
    customerId: String(raw.customerId ?? ''),
    customerName: (raw.customerName as string) ?? null,
    propertyAddress: (raw.propertyAddress as string) ?? null,
    proposalId: (raw.proposalId as string) ?? null,
    status: balanceDueCents <= 0 && amountPaidCents > 0 ? 'paid' : status,
    subtotalCents,
    depositPercent: Number(raw.depositPercent ?? 50),
    depositCents: Number(raw.depositCents ?? 0),
    amountPaidCents,
    balanceDueCents,
    dueDate,
    sentAt: (raw.sentAt as Date) ?? null,
    openedAt: (raw.openedAt as Date) ?? null,
    paidAt: (raw.paidAt as Date) ?? null,
    viewCount: Number(raw.viewCount ?? 0),
    lastViewedAt: (raw.lastViewedAt as Date) ?? null,
    paymentAttempts: Number(raw.paymentAttempts ?? 0),
    publicToken: String(raw.publicToken ?? ''),
    remindersPaused: Boolean(raw.remindersPaused),
    reminderStage: (raw.reminderStage as ReminderStage) ?? null,
    nextReminderAt: (raw.nextReminderAt as Date) ?? null,
    activeDisputeId: (raw.activeDisputeId as string) ?? null,
    inCollectionQueue: Boolean(raw.inCollectionQueue),
    collectionRiskLevel: (raw.collectionRiskLevel as InvoiceRecord['collectionRiskLevel']) ?? risk.level,
    agingBucket,
    daysOverdue,
    notes: (raw.notes as string) ?? null,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt : new Date(),
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt : new Date(),
    createdBy: (raw.createdBy as string) ?? null,
    updatedBy: (raw.updatedBy as string) ?? null,
  };
}

async function subCreate<T>(
  orgId: string,
  invoiceId: string,
  sub: 'payments' | 'activity' | 'reminders' | 'disputes',
  data: Record<string, unknown>,
): Promise<T> {
  const db = getAdminFirestore();
  const ref = db.collection(`${orgPath(orgId, 'invoices')}/${invoiceId}/${sub}`).doc();
  const now = ts();
  await ref.set({ ...data, createdAt: now, updatedAt: now });
  return mapDoc<T>({ id: ref.id, ...data, createdAt: now, updatedAt: now });
}

async function subList<T>(orgId: string, invoiceId: string, sub: string): Promise<T[]> {
  const db = getAdminFirestore();
  const snap = await db.collection(`${orgPath(orgId, 'invoices')}/${invoiceId}/${sub}`).orderBy('createdAt', 'desc').get();
  return snap.docs.map((d) => mapDoc<T>({ id: d.id, ...d.data()! }));
}

export async function logInvoiceActivity(
  orgId: string,
  invoiceId: string,
  type: InvoiceActivity['type'],
  title: string,
  opts?: { description?: string; userId?: string; userName?: string; metadata?: Record<string, unknown> },
) {
  return subCreate<InvoiceActivity>(orgId, invoiceId, 'activity', {
    invoiceId,
    type,
    title,
    description: opts?.description ?? null,
    userId: opts?.userId ?? null,
    userName: opts?.userName ?? null,
    metadata: opts?.metadata ?? null,
    occurredAt: new Date(),
  });
}

export async function listInvoices360(orgId: string): Promise<InvoiceRecord[]> {
  const rows = await colList<Record<string, unknown>>(orgId, 'invoices');
  return rows.map((r) => normalizeInvoice({ ...r, organizationId: orgId }));
}

export async function getInvoice360(orgId: string, invoiceId: string): Promise<InvoiceRecord | null> {
  const raw = await colGet<Record<string, unknown>>(orgId, 'invoices', invoiceId);
  if (!raw) return null;
  return normalizeInvoice({ ...raw, id: invoiceId, organizationId: orgId });
}

export async function createInvoice360(
  orgId: string,
  input: {
    customerId: string;
    proposalId?: string;
    subtotalCents: number;
    depositPercent?: number;
    dueDays?: number;
    notes?: string;
  },
  userId?: string | null,
) {
  const invoiceSettings = await getInvoiceSettings(orgId, userId);
  const depositPercent = input.depositPercent ?? invoiceSettings.depositRequiredPercent;
  const dueDays = input.dueDays ?? invoiceSettings.paymentTermsDays;

  const customer = await colGet<{ firstName?: string; lastName?: string }>(orgId, 'customers', input.customerId);
  const all = await colList<{ id: string }>(orgId, 'invoices');
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + dueDays);
  const depositCents = Math.round(input.subtotalCents * (depositPercent / 100));
  const customerName = customer ? `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() : null;

  const invoice = await colCreate(orgId, 'invoices', {
    organizationId: orgId,
    customerId: input.customerId,
    customerName,
    proposalId: input.proposalId ?? null,
    invoiceNumber: `INV-${String(all.length + 1).padStart(5, '0')}`,
    status: 'draft',
    subtotalCents: input.subtotalCents,
    depositPercent,
    depositCents,
    amountPaidCents: 0,
    dueDate,
    viewCount: 0,
    paymentAttempts: 0,
    publicToken: firestoreNanoid(32),
    remindersPaused: false,
    inCollectionQueue: false,
    notes: input.notes ?? null,
    createdBy: userId,
    updatedBy: userId,
  }) as Record<string, unknown>;

  await logInvoiceActivity(orgId, String(invoice.id), 'created', 'Invoice created', { userId: userId ?? undefined });
  return normalizeInvoice({ ...invoice, organizationId: orgId });
}

export async function createInvoiceFromProposal360(
  orgId: string,
  input: { proposalId: string; depositPercent?: number; dueDays?: number },
  userId?: string | null,
) {
  const proposal = await colGet<Record<string, unknown>>(orgId, 'proposals', input.proposalId);
  if (!proposal) throw new Error('Proposal not found');
  const status = String(proposal.status ?? '');
  if (status !== 'approved' && status !== 'accepted') {
    throw new Error('Proposal must be approved before creating an invoice');
  }

  return createInvoice360(orgId, {
    customerId: String(proposal.customerId),
    proposalId: input.proposalId,
    subtotalCents: Number(proposal.subtotalCents ?? 0),
    depositPercent: input.depositPercent,
    dueDays: input.dueDays,
  }, userId);
}

export async function sendInvoice360(orgId: string, invoiceId: string, userId?: string | null) {
  const now = new Date();
  await colUpdate(orgId, 'invoices', invoiceId, {
    status: 'sent',
    sentAt: now,
    nextReminderAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    updatedBy: userId,
  });
  await logInvoiceActivity(orgId, invoiceId, 'sent', 'Invoice sent', { userId: userId ?? undefined });
  return getInvoice360(orgId, invoiceId);
}

export async function updateInvoice360(
  orgId: string,
  invoiceId: string,
  input: {
    subtotalCents?: number;
    depositPercent?: number;
    dueDate?: Date;
    notes?: string;
    propertyAddress?: string;
    remindersPaused?: boolean;
  },
  userId?: string | null,
) {
  const invoice = await getInvoice360(orgId, invoiceId);
  if (!invoice) throw new Error('Invoice not found');

  const subtotalCents = input.subtotalCents ?? invoice.subtotalCents;
  const depositPercent = input.depositPercent ?? invoice.depositPercent;
  const depositCents = Math.round(subtotalCents * (depositPercent / 100));
  const balanceDueCents = computeBalanceDue({ subtotalCents, amountPaidCents: invoice.amountPaidCents });
  const patch: Record<string, unknown> = {
    ...input,
    subtotalCents,
    depositPercent,
    depositCents,
    status: balanceDueCents <= 0 && invoice.amountPaidCents > 0 ? 'paid' : invoice.status,
    updatedBy: userId,
  };

  if (input.notes !== undefined) patch.notes = input.notes || null;
  if (input.propertyAddress !== undefined) patch.propertyAddress = input.propertyAddress || null;
  await colUpdate(orgId, 'invoices', invoiceId, patch);
  await logInvoiceActivity(orgId, invoiceId, 'status_changed', 'Invoice edited', { userId: userId ?? undefined });
  return getInvoice360(orgId, invoiceId);
}

export async function voidInvoice360(orgId: string, invoiceId: string, userId?: string | null) {
  const invoice = await getInvoice360(orgId, invoiceId);
  if (!invoice) throw new Error('Invoice not found');
  await colUpdate(orgId, 'invoices', invoiceId, {
    status: invoice.amountPaidCents > 0 ? 'refunded' : 'cancelled',
    remindersPaused: true,
    inCollectionQueue: false,
    updatedBy: userId,
  });
  await logInvoiceActivity(orgId, invoiceId, 'status_changed', 'Invoice removed from active AR', { userId: userId ?? undefined });
  return getInvoice360(orgId, invoiceId);
}

export async function deleteInvoice360(orgId: string, invoiceId: string, userId?: string | null) {
  const invoice = await getInvoice360(orgId, invoiceId);
  if (!invoice) throw new Error('Invoice not found');
  if (invoice.amountPaidCents > 0 || invoice.status !== 'draft') {
    return voidInvoice360(orgId, invoiceId, userId);
  }
  await colDelete(orgId, 'invoices', invoiceId);
  return { deleted: true };
}

export async function recordInvoicePayment360(
  orgId: string,
  input: {
    invoiceId: string;
    amountCents: number;
    paymentType: InvoicePayment['paymentType'];
    paymentMethod: InvoicePayment['paymentMethod'];
    transactionId?: string;
    processor?: string;
    feesCents?: number;
    paidAt?: Date;
    notes?: string;
  },
  userId?: string | null,
) {
  const invoice = await getInvoice360(orgId, input.invoiceId);
  if (!invoice) throw new Error('Invoice not found');

  const paidAt = input.paidAt ?? new Date();
  await subCreate(orgId, input.invoiceId, 'payments', {
    invoiceId: input.invoiceId,
    amountCents: input.amountCents,
    paymentType: input.paymentType,
    paymentMethod: input.paymentMethod,
    transactionId: input.transactionId ?? null,
    processor: input.processor ?? null,
    feesCents: input.feesCents ?? 0,
    paidAt,
    notes: input.notes ?? null,
    createdBy: userId,
    updatedBy: userId,
  });

  const newPaid = invoice.amountPaidCents + input.amountCents;
  const balance = computeBalanceDue({ subtotalCents: invoice.subtotalCents, amountPaidCents: newPaid });
  let status: InvoiceStatus = balance <= 0 ? 'paid' : 'partially_paid';

  await colUpdate(orgId, 'invoices', input.invoiceId, {
    amountPaidCents: newPaid,
    status,
    paidAt: balance <= 0 ? paidAt : invoice.paidAt,
    remindersPaused: balance <= 0,
    inCollectionQueue: false,
    updatedBy: userId,
  });

  await logInvoiceActivity(orgId, input.invoiceId, 'payment_received', `Payment of $${(input.amountCents / 100).toFixed(2)} received`, {
    userId: userId ?? undefined,
    metadata: { amountCents: input.amountCents, paymentMethod: input.paymentMethod },
  });

  const depositMet = newPaid >= (invoice.depositCents ?? 0) && invoice.amountPaidCents < (invoice.depositCents ?? 0);
  if (depositMet && invoice.customerId) {
    try {
      const { fireAutomationTrigger } = await import('./automation360');
      await fireAutomationTrigger(orgId, 'deposit_paid', {
        customerId: invoice.customerId,
        customerName: invoice.customerName ?? 'Customer',
        invoiceId: input.invoiceId,
        vars: {
          amount: `$${(input.amountCents / 100).toFixed(2)}`,
          invoiceNumber: invoice.invoiceNumber,
        },
      }, userId);
    } catch {
      // Best-effort
    }
  }

  return getInvoice360(orgId, input.invoiceId);
}

export async function listInvoicePayments(orgId: string, invoiceId: string) {
  return subList<InvoicePayment>(orgId, invoiceId, 'payments');
}

export async function listInvoiceActivity(orgId: string, invoiceId: string) {
  return subList<InvoiceActivity>(orgId, invoiceId, 'activity');
}

export async function listInvoiceReminders(orgId: string, invoiceId: string) {
  return subList<InvoiceReminder>(orgId, invoiceId, 'reminders');
}

export async function controlReminders360(
  orgId: string,
  invoiceId: string,
  action: 'pause' | 'resume' | 'skip' | 'send_manual',
  opts?: { channel?: 'email' | 'sms'; stage?: ReminderStage; userId?: string; userName?: string },
) {
  const invoice = await getInvoice360(orgId, invoiceId);
  if (!invoice) throw new Error('Invoice not found');

  if (action === 'pause') {
    await colUpdate(orgId, 'invoices', invoiceId, { remindersPaused: true, updatedBy: opts?.userId });
    await logInvoiceActivity(orgId, invoiceId, 'status_changed', 'Reminders paused', { userId: opts?.userId });
  } else if (action === 'resume') {
    await colUpdate(orgId, 'invoices', invoiceId, { remindersPaused: false, updatedBy: opts?.userId });
    await logInvoiceActivity(orgId, invoiceId, 'status_changed', 'Reminders resumed', { userId: opts?.userId });
  } else if (action === 'skip') {
    await logInvoiceActivity(orgId, invoiceId, 'status_changed', 'Next reminder skipped', { userId: opts?.userId });
  } else if (action === 'send_manual') {
    const stage = opts?.stage ?? invoice.reminderStage ?? 'overdue_3';
    await sendReminder360(orgId, invoiceId, stage, opts?.channel ?? 'email', opts?.userId);
  }

  return getInvoice360(orgId, invoiceId);
}

async function sendReminder360(orgId: string, invoiceId: string, stage: ReminderStage, channel: 'email' | 'sms', userId?: string) {
  const invoice = await getInvoice360(orgId, invoiceId);
  if (!invoice || invoice.remindersPaused || invoice.balanceDueCents <= 0) return null;

  const templates = await ensureReminderTemplates(orgId);
  const template = templates.find((t) => t.stage === stage && t.channel === channel) ?? templates[0];
  const vars = {
    customerName: invoice.customerName ?? 'Customer',
    invoiceNumber: invoice.invoiceNumber,
    dueDate: invoice.dueDate.toLocaleDateString(),
    balanceDue: `$${(invoice.balanceDueCents / 100).toFixed(2)}`,
    paymentLink: `/pay/${invoice.publicToken}`,
    propertyAddress: invoice.propertyAddress ?? '',
  };

  const reminder = await subCreate<InvoiceReminder>(orgId, invoiceId, 'reminders', {
    invoiceId,
    stage,
    channel,
    status: 'sent',
    scheduledAt: new Date(),
    sentAt: new Date(),
    templateId: template?.id ?? null,
    subject: template ? renderTemplate(template.subject, vars) : `Reminder: ${invoice.invoiceNumber}`,
    body: template ? renderTemplate(template.body, vars) : '',
  });

  await colUpdate(orgId, 'invoices', invoiceId, { reminderStage: stage, nextReminderAt: null });
  await logInvoiceActivity(orgId, invoiceId, 'reminder_sent', `Reminder sent (${stage})`, { userId, metadata: { stage, channel } });
  return reminder;
}

export async function processInvoiceReminders(orgId: string) {
  const invoices = await listInvoices360(orgId);
  let processed = 0;

  for (const invoice of invoices) {
    if (invoice.remindersPaused || invoice.balanceDueCents <= 0 || invoice.status === 'paid' || invoice.activeDisputeId) continue;

    const daysUntilDue = Math.ceil((invoice.dueDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    const nextStage = getNextReminderStage(invoice.daysOverdue, daysUntilDue, invoice.reminderStage);
    if (!nextStage) continue;

    if (invoice.daysOverdue >= 30 && !invoice.inCollectionQueue) {
      await syncCollectionQueue(orgId, invoice);
    }

    if (invoice.daysOverdue > 0 && invoice.status === 'sent') {
      await colUpdate(orgId, 'invoices', invoice.id, { status: 'overdue' });
    }

    await sendReminder360(orgId, invoice.id, nextStage, 'email');
    processed++;
  }

  return { processed };
}

export async function ensureReminderTemplates(orgId: string): Promise<ReminderTemplate[]> {
  const db = getAdminFirestore();
  const snap = await db.collection(orgPath(orgId, 'reminderTemplates')).get();
  if (!snap.empty) return snap.docs.map((d) => mapDoc<ReminderTemplate>({ id: d.id, ...d.data()! }));

  const now = ts();
  const templates: ReminderTemplate[] = [];
  for (const t of DEFAULT_REMINDER_TEMPLATES) {
    const ref = db.collection(orgPath(orgId, 'reminderTemplates')).doc();
    const data = { organizationId: orgId, ...t, createdAt: now, updatedAt: now };
    await ref.set(data);
    templates.push(mapDoc<ReminderTemplate>({ id: ref.id, ...data }));
  }
  return templates;
}

export async function createReminderTemplate(orgId: string, input: Omit<ReminderTemplate, keyof import('@clcrm/types').InvoiceAuditFields | 'id' | 'organizationId' | 'version'>, userId?: string | null) {
  return colCreate(orgId, 'reminderTemplates', { organizationId: orgId, ...input, version: 1, createdBy: userId, updatedBy: userId }) as Promise<ReminderTemplate>;
}

export async function updateReminderTemplate(
  orgId: string,
  templateId: string,
  input: Partial<Omit<ReminderTemplate, keyof import('@clcrm/types').InvoiceAuditFields | 'id' | 'organizationId' | 'version'>>,
  userId?: string | null,
) {
  const template = await colGet<ReminderTemplate>(orgId, 'reminderTemplates', templateId);
  if (!template) throw new Error('Reminder template not found');
  const patch: Record<string, unknown> = { ...input, updatedBy: userId ?? null };
  if (input.subject !== undefined && !String(input.subject).trim()) patch.subject = template.subject;
  if (input.body !== undefined && !String(input.body).trim()) patch.body = template.body;
  await colUpdate(orgId, 'reminderTemplates', templateId, patch);
  return colGet<ReminderTemplate>(orgId, 'reminderTemplates', templateId);
}

export async function deleteReminderTemplate(orgId: string, templateId: string) {
  await colDelete(orgId, 'reminderTemplates', templateId);
  return { success: true as const };
}

export async function listReminderTemplates(orgId: string) {
  return ensureReminderTemplates(orgId);
}

export async function ensureInvoiceTemplates(orgId: string): Promise<InvoiceTemplate[]> {
  const db = getAdminFirestore();
  const snap = await db.collection(orgPath(orgId, 'invoiceTemplates')).get();
  if (!snap.empty) return snap.docs.map((d) => mapDoc<InvoiceTemplate>({ id: d.id, ...d.data()! }));

  const now = ts();
  const ref = db.collection(orgPath(orgId, 'invoiceTemplates')).doc();
  const seed = {
    ...DEFAULT_INVOICE_TEMPLATE,
    organizationId: orgId,
    createdAt: now,
    updatedAt: now,
    createdBy: null,
    updatedBy: null,
  };
  await ref.set(seed);
  return [mapDoc<InvoiceTemplate>({ id: ref.id, ...seed })];
}

export async function listInvoiceTemplates(orgId: string) {
  return ensureInvoiceTemplates(orgId);
}

export async function createInvoiceTemplate(
  orgId: string,
  input: Omit<InvoiceTemplate, keyof import('@clcrm/types').InvoiceAuditFields | 'id' | 'organizationId'>,
  userId?: string | null,
) {
  const db = getAdminFirestore();
  const now = ts();
  const ref = db.collection(orgPath(orgId, 'invoiceTemplates')).doc();
  if (input.isDefault) {
    const existing = await listInvoiceTemplates(orgId);
    await Promise.all(existing.map((template) => colUpdate(orgId, 'invoiceTemplates', template.id, { isDefault: false, updatedBy: userId ?? null })));
  }
  await ref.set({
    organizationId: orgId,
    ...input,
    createdAt: now,
    updatedAt: now,
    createdBy: userId ?? null,
    updatedBy: userId ?? null,
  });
  const snap = await ref.get();
  return mapDoc<InvoiceTemplate>({ id: snap.id, ...snap.data()! });
}

export async function updateInvoiceTemplate(
  orgId: string,
  templateId: string,
  input: Partial<Omit<InvoiceTemplate, keyof import('@clcrm/types').InvoiceAuditFields | 'id' | 'organizationId'>>,
  userId?: string | null,
) {
  const current = await colGet<InvoiceTemplate>(orgId, 'invoiceTemplates', templateId);
  if (!current) throw new Error('Invoice template not found');

  if (input.isDefault) {
    const existing = await listInvoiceTemplates(orgId);
    await Promise.all(existing
      .filter((template) => template.id !== templateId)
      .map((template) => colUpdate(orgId, 'invoiceTemplates', template.id, { isDefault: false, updatedBy: userId ?? null })));
  }

  await colUpdate(orgId, 'invoiceTemplates', templateId, {
    ...input,
    updatedBy: userId ?? null,
  });
  return colGet<InvoiceTemplate>(orgId, 'invoiceTemplates', templateId);
}

export async function deleteInvoiceTemplate(orgId: string, templateId: string) {
  const template = await colGet<InvoiceTemplate>(orgId, 'invoiceTemplates', templateId);
  if (!template) throw new Error('Invoice template not found');

  const templates = await listInvoiceTemplates(orgId);
  if (template.isDefault && templates.length > 1) {
    const replacement = templates.find((row) => row.id !== templateId);
    if (replacement) {
      await colUpdate(orgId, 'invoiceTemplates', replacement.id, { isDefault: true });
    }
  }

  await colDelete(orgId, 'invoiceTemplates', templateId);
  return { success: true as const };
}

export async function createDispute360(
  orgId: string,
  input: { invoiceId: string; reason: string; assignedUserId?: string; assignedUserName?: string },
  userId?: string | null,
) {
  const invoice = await getInvoice360(orgId, input.invoiceId);
  if (!invoice) throw new Error('Invoice not found');

  const dispute = await subCreate<InvoiceDispute>(orgId, input.invoiceId, 'disputes', {
    invoiceId: input.invoiceId,
    customerId: invoice.customerId,
    reason: input.reason,
    status: 'open',
    assignedUserId: input.assignedUserId ?? null,
    assignedUserName: input.assignedUserName ?? null,
    openedAt: new Date(),
    createdBy: userId,
    updatedBy: userId,
  });

  await colUpdate(orgId, 'invoices', input.invoiceId, {
    status: 'disputed',
    activeDisputeId: dispute.id,
    remindersPaused: true,
    updatedBy: userId,
  });
  await logInvoiceActivity(orgId, input.invoiceId, 'dispute_opened', 'Dispute opened', { userId: userId ?? undefined, description: input.reason });
  return dispute;
}

export async function updateDispute360(
  orgId: string,
  invoiceId: string,
  disputeId: string,
  status: InvoiceDispute['status'],
  resolution?: string,
  userId?: string | null,
) {
  const db = getAdminFirestore();
  await db.doc(`${orgPath(orgId, 'invoices')}/${invoiceId}/disputes/${disputeId}`).update({
    status,
    resolution: resolution ?? null,
    resolvedAt: status === 'resolved' || status === 'closed' ? ts() : null,
    updatedAt: ts(),
    updatedBy: userId ?? null,
  });

  if (status === 'resolved' || status === 'closed') {
    await colUpdate(orgId, 'invoices', invoiceId, {
      activeDisputeId: null,
      remindersPaused: false,
      status: 'overdue',
      updatedBy: userId,
    });
    await logInvoiceActivity(orgId, invoiceId, 'dispute_resolved', 'Dispute resolved', { userId: userId ?? undefined, description: resolution });
  }

  const snap = await db.doc(`${orgPath(orgId, 'invoices')}/${invoiceId}/disputes/${disputeId}`).get();
  return mapDoc<InvoiceDispute>({ id: snap.id, ...snap.data()! });
}

export async function listDisputes360(orgId: string) {
  const invoices = await listInvoices360(orgId);
  const all: InvoiceDispute[] = [];
  for (const inv of invoices) {
    all.push(...await subList<InvoiceDispute>(orgId, inv.id, 'disputes'));
  }
  return all.sort((a, b) => b.openedAt.getTime() - a.openedAt.getTime());
}

async function syncCollectionQueue(orgId: string, invoice: InvoiceRecord) {
  const risk = computeCollectionRisk(invoice.daysOverdue, invoice.balanceDueCents);
  const db = getAdminFirestore();
  const existing = await db.collection(orgPath(orgId, 'collectionsQueue')).where('invoiceId', '==', invoice.id).limit(1).get();

  const data = {
    organizationId: orgId,
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    customerId: invoice.customerId,
    customerName: invoice.customerName,
    balanceDueCents: invoice.balanceDueCents,
    daysOverdue: invoice.daysOverdue,
    riskLevel: risk.level,
    riskScore: risk.score,
    queuedAt: new Date(),
  };

  if (existing.empty) {
    await colCreate(orgId, 'collectionsQueue', data);
    await colUpdate(orgId, 'invoices', invoice.id, { inCollectionQueue: true, status: 'in_collection', collectionRiskLevel: risk.level });
    await logInvoiceActivity(orgId, invoice.id, 'collection_queued', 'Added to collection queue', { metadata: { riskLevel: risk.level } });
  } else {
    await existing.docs[0]!.ref.update({ ...data, updatedAt: ts() });
  }
}

export async function syncAllCollectionsQueue(orgId: string) {
  const invoices = await listInvoices360(orgId);
  for (const inv of invoices.filter((i) => i.balanceDueCents > 0 && i.daysOverdue >= 30)) {
    await syncCollectionQueue(orgId, inv);
  }
}

export async function listCollectionsQueue(orgId: string): Promise<CollectionQueueItem[]> {
  await syncAllCollectionsQueue(orgId);
  return colList<CollectionQueueItem>(orgId, 'collectionsQueue');
}

export async function getAgingReport(orgId: string): Promise<AgingBucketSummary[]> {
  const invoices = await listInvoices360(orgId).then((list) => list.filter((i) => i.balanceDueCents > 0));
  const buckets: AgingBucketSummary[] = [
    { bucket: 'current', label: 'Current', invoiceCount: 0, balanceDueCents: 0, customerCount: 0, riskRating: 'low' },
    { bucket: '1_30', label: '1–30 Days', invoiceCount: 0, balanceDueCents: 0, customerCount: 0, riskRating: 'low' },
    { bucket: '31_60', label: '31–60 Days', invoiceCount: 0, balanceDueCents: 0, customerCount: 0, riskRating: 'medium' },
    { bucket: '61_90', label: '61–90 Days', invoiceCount: 0, balanceDueCents: 0, customerCount: 0, riskRating: 'high' },
    { bucket: '90_plus', label: '90+ Days', invoiceCount: 0, balanceDueCents: 0, customerCount: 0, riskRating: 'critical' },
  ];

  const customersByBucket = new Map<AgingBucketSummary['bucket'], Set<string>>();

  for (const inv of invoices) {
    const b = buckets.find((x) => x.bucket === inv.agingBucket)!;
    b.invoiceCount++;
    b.balanceDueCents += inv.balanceDueCents;
    if (!customersByBucket.has(b.bucket)) customersByBucket.set(b.bucket, new Set());
    customersByBucket.get(b.bucket)!.add(inv.customerId);
  }

  for (const b of buckets) {
    b.customerCount = customersByBucket.get(b.bucket)?.size ?? 0;
  }

  return buckets;
}

export async function getInvoiceDashboard(orgId: string, filters: { year?: number | null } = {}): Promise<InvoiceDashboardKpis> {
  const { year = null } = filters;
  const invoices = await listInvoices360(orgId);
  const open = invoices.filter((i) => i.balanceDueCents > 0);
  const overdue = open.filter((i) => i.daysOverdue > 0);
  const paid = invoices.filter((i) => i.status === 'paid' || i.amountPaidCents >= i.subtotalCents);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const paidInPeriod = year != null
    ? invoices.filter((i) => i.amountPaidCents > 0 && i.paidAt && i.paidAt.getFullYear() === year)
    : invoices.filter((i) => i.paidAt && i.paidAt >= monthStart);
  const totalPaidThisMonthCents = paidInPeriod.reduce((s, i) => s + i.amountPaidCents, 0);

  const scopedPaid = year != null
    ? paid.filter((i) => i.paidAt && i.paidAt.getFullYear() === year)
    : paid;

  const collectionRate = invoices.length > 0 ? Math.round((paid.length / invoices.length) * 100) : 100;
  const avgDays = scopedPaid.length > 0
    ? Math.round(scopedPaid.reduce((s, i) => s + Math.max(0, ((i.paidAt ?? i.updatedAt).getTime() - (i.sentAt ?? i.createdAt).getTime()) / 86400000), 0) / scopedPaid.length)
    : 0;

  const aging = await getAgingReport(orgId);
  const agingRiskScore = aging.reduce((s, b) => {
    const weight = b.bucket === '90_plus' ? 4 : b.bucket === '61_90' ? 3 : b.bucket === '31_60' ? 2 : b.bucket === '1_30' ? 1 : 0;
    return s + weight * b.balanceDueCents;
  }, 0);

  const expectedCollectionsCents = open
    .filter((i) => i.daysOverdue <= 0)
    .reduce((s, i) => s + i.balanceDueCents, 0);

  return {
    totalReceivablesCents: open.reduce((s, i) => s + i.balanceDueCents, 0),
    currentBalanceCents: open.filter((i) => i.agingBucket === 'current').reduce((s, i) => s + i.balanceDueCents, 0),
    overdueBalanceCents: overdue.reduce((s, i) => s + i.balanceDueCents, 0),
    depositsOutstandingCents: open.reduce((s, i) => s + Math.max(0, i.depositCents - Math.min(i.amountPaidCents, i.depositCents)), 0),
    collectionRatePercent: collectionRate,
    averageDaysToPay: avgDays,
    totalPaidThisMonthCents,
    expectedCollectionsCents,
    revenueForecastCents: expectedCollectionsCents + Math.round(overdue.reduce((s, i) => s + i.balanceDueCents, 0) * 0.4),
    agingRiskScore: Math.min(100, Math.round(agingRiskScore / 10000)),
  };
}

export async function getCashFlowForecasts(orgId: string): Promise<CashFlowForecast[]> {
  const invoices = await listInvoices360(orgId);
  const open = invoices.filter((i) => i.balanceDueCents > 0);
  const horizons: Array<30 | 60 | 90> = [30, 60, 90];

  return horizons.map((horizonDays) => {
    const expected = open
      .filter((i) => i.daysOverdue <= 0 || i.daysOverdue <= horizonDays)
      .reduce((s, i) => s + i.balanceDueCents * (i.daysOverdue > 0 ? 0.5 : 1), 0);
    const lateRisk = open.filter((i) => i.daysOverdue > 0).reduce((s, i) => s + i.balanceDueCents, 0);

    return {
      id: `forecast-${horizonDays}`,
      organizationId: orgId,
      forecastDate: new Date(),
      horizonDays,
      expectedCollectionsCents: Math.round(expected),
      latePaymentRiskCents: lateRisk,
      monthlyRevenueCents: invoices.filter((i) => i.amountPaidCents > 0).reduce((s, i) => s + i.amountPaidCents, 0),
      seasonalRevenueCents: Math.round(expected * 1.2),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });
}

export async function getInvoiceAnalytics(orgId: string, filters: { year?: number | null } = {}): Promise<InvoiceAnalytics> {
  const { year = null } = filters;
  const invoices = await listInvoices360(orgId);
  const dashboard = await getInvoiceDashboard(orgId, filters);
  const open = invoices.filter((i) => i.balanceDueCents > 0);
  const paidInvoices = year != null
    ? invoices.filter((i) => i.amountPaidCents > 0 && i.paidAt && i.paidAt.getFullYear() === year)
    : invoices.filter((i) => i.amountPaidCents > 0);

  const byCustomer = new Map<string, { name: string; balance: number; count: number }>();
  for (const inv of open.filter((i) => i.daysOverdue > 0)) {
    const cur = byCustomer.get(inv.customerId) ?? { name: inv.customerName ?? 'Unknown', balance: 0, count: 0 };
    cur.balance += inv.balanceDueCents;
    cur.count++;
    byCustomer.set(inv.customerId, cur);
  }

  return {
    revenueCollectedCents: paidInvoices.reduce((s, i) => s + i.amountPaidCents, 0),
    outstandingBalanceCents: open.reduce((s, i) => s + i.balanceDueCents, 0),
    collectionRatePercent: dashboard.collectionRatePercent,
    averageDaysToPay: dashboard.averageDaysToPay,
    agingTrend: [
      { month: 'Jan', currentCents: dashboard.currentBalanceCents, overdueCents: dashboard.overdueBalanceCents },
      { month: 'Feb', currentCents: Math.round(dashboard.currentBalanceCents * 0.9), overdueCents: Math.round(dashboard.overdueBalanceCents * 1.1) },
    ],
    overdueTrend: [
      { month: 'Jan', count: open.filter((i) => i.daysOverdue > 0).length, balanceCents: dashboard.overdueBalanceCents },
    ],
    topOverdueCustomers: [...byCustomer.entries()]
      .map(([customerId, v]) => ({ customerId, customerName: v.name, balanceCents: v.balance, invoiceCount: v.count }))
      .sort((a, b) => b.balanceCents - a.balanceCents)
      .slice(0, 10),
  };
}

export async function getCustomerBalance(orgId: string, customerId: string): Promise<CustomerBalanceSummary> {
  const customer = await colGet<{ firstName?: string; lastName?: string }>(orgId, 'customers', customerId);
  const invoices = (await listInvoices360(orgId)).filter((i) => i.customerId === customerId);
  const open = invoices.filter((i) => i.balanceDueCents > 0);
  const paid = invoices.filter((i) => i.balanceDueCents <= 0 && i.amountPaidCents > 0);

  return {
    customerId,
    customerName: customer ? `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() : 'Customer',
    openInvoices: open,
    paidInvoices: paid,
    creditsCents: 0,
    depositsCents: invoices.reduce((s, i) => s + Math.min(i.amountPaidCents, i.depositCents), 0),
    outstandingBalanceCents: open.reduce((s, i) => s + i.balanceDueCents, 0),
  };
}

export async function generateCustomerStatement(
  orgId: string,
  input: { customerId: string; periodStart: Date; periodEnd: Date },
  userId?: string | null,
) {
  const balance = await getCustomerBalance(orgId, input.customerId);
  const inPeriod = [...balance.openInvoices, ...balance.paidInvoices].filter((i) => {
    const d = i.sentAt ?? i.createdAt;
    return d >= input.periodStart && d <= input.periodEnd;
  });

  const statement = await colCreate(orgId, 'customerStatements', {
    organizationId: orgId,
    customerId: input.customerId,
    customerName: balance.customerName,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    openingBalanceCents: 0,
    chargesCents: inPeriod.reduce((s, i) => s + i.subtotalCents, 0),
    paymentsCents: inPeriod.reduce((s, i) => s + i.amountPaidCents, 0),
    creditsCents: balance.creditsCents,
    closingBalanceCents: balance.outstandingBalanceCents,
    invoiceIds: inPeriod.map((i) => i.id),
    sentAt: null,
    createdBy: userId,
    updatedBy: userId,
  }) as CustomerStatement;

  for (const inv of inPeriod) {
    await logInvoiceActivity(orgId, inv.id, 'statement_sent', 'Statement generated', { userId: userId ?? undefined });
  }

  return statement;
}

export async function recordInvoiceView(token: string) {
  const invoice = await getByPublicToken<Record<string, unknown>>('invoices', token);
  if (!invoice) return null;
  const orgId = String(invoice.organizationId);
  const id = String(invoice.id);
  const viewCount = Number(invoice.viewCount ?? 0) + 1;
  const now = new Date();
  await colUpdate(orgId, 'invoices', id, {
    viewCount,
    lastViewedAt: now,
    openedAt: invoice.openedAt ?? now,
    status: invoice.status === 'sent' ? 'viewed' : invoice.status,
  });
  await logInvoiceActivity(orgId, id, 'viewed', 'Invoice viewed by customer');
  return getInvoice360(orgId, id);
}

export async function getInvoiceByToken360(token: string) {
  const invoice = await getByPublicToken<Record<string, unknown>>('invoices', token);
  if (!invoice) return null;
  const orgId = String(invoice.organizationId);
  const normalized = normalizeInvoice({ ...invoice, organizationId: orgId });
  const customer = await colGet<{ firstName?: string; lastName?: string; email?: string }>(orgId, 'customers', normalized.customerId);
  return { invoice: normalized, customer };
}

export async function aiCollectionsQuery(orgId: string, question: string): Promise<AiCollectionsQueryResult> {
  const invoices = await listInvoices360(orgId);
  const q = question.toLowerCase();
  let filtered = invoices;

  if (q.includes('overdue') && q.includes('30')) {
    filtered = invoices.filter((i) => i.daysOverdue > 30 && i.balanceDueCents > 0);
  } else if (q.includes('overdue')) {
    filtered = invoices.filter((i) => i.daysOverdue > 0 && i.balanceDueCents > 0);
  } else if (q.includes('late payment') || q.includes('repeated')) {
    const counts = new Map<string, number>();
    for (const i of invoices.filter((x) => x.daysOverdue > 0)) {
      counts.set(i.customerId, (counts.get(i.customerId) ?? 0) + 1);
    }
    const repeatCustomers = new Set([...counts.entries()].filter(([, c]) => c >= 2).map(([id]) => id));
    filtered = invoices.filter((i) => repeatCustomers.has(i.customerId));
  } else if (q.includes('next week') || q.includes('expected collection')) {
    filtered = invoices.filter((i) => i.balanceDueCents > 0 && i.daysOverdue <= 0);
  } else if (q.includes('collection')) {
    filtered = invoices.filter((i) => i.inCollectionQueue || i.status === 'in_collection');
  }

  const recommendations: string[] = [];
  if (filtered.some((i) => i.daysOverdue > 30)) recommendations.push('Prioritize invoices over 30 days for phone follow-up.');
  if (filtered.some((i) => i.depositCents > i.amountPaidCents)) recommendations.push('Several invoices have outstanding deposits — send deposit reminders.');
  if (filtered.length === 0) recommendations.push('No matching invoices — review aging report for full portfolio view.');

  return {
    answer: `Found ${filtered.length} invoice(s) matching "${question}".`,
    invoices: filtered.slice(0, 20),
    recommendations,
  };
}

export async function listAllPayments(orgId: string) {
  const invoices = await listInvoices360(orgId);
  const payments: Array<InvoicePayment & { invoiceNumber: string; customerName?: string | null }> = [];
  for (const inv of invoices) {
    const invPayments = await listInvoicePayments(orgId, inv.id);
    payments.push(...invPayments.map((p) => ({ ...p, invoiceNumber: inv.invoiceNumber, customerName: inv.customerName })));
  }
  return payments.sort((a, b) => b.paidAt.getTime() - a.paidAt.getTime());
}

export async function getInvoicePipeline(orgId: string) {
  const invoices = await listInvoices360(orgId);
  const columns: Record<string, InvoiceRecord[]> = {
    draft: [], sent: [], viewed: [], pending_payment: [], partially_paid: [],
    paid: [], overdue: [], in_collection: [], disputed: [], refunded: [], cancelled: [],
  };
  for (const inv of invoices) {
    const key = inv.status in columns ? inv.status : 'sent';
    columns[key]!.push(inv);
  }
  return columns;
}

function toJsDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function isYear(value: unknown, year: number) {
  const d = toJsDate(value);
  return d ? d.getFullYear() === year : false;
}

function shiftYearDate(value: unknown, deltaYears: number): Date | null {
  const d = toJsDate(value);
  if (!d) return null;
  const shifted = new Date(d);
  shifted.setFullYear(shifted.getFullYear() + deltaYears);
  return shifted;
}

/** Reclassify payment receipt dates from 2026 to 2025 (same month/day). */
export async function shift2026PaymentsTo2025(orgId: string, dryRun = false) {
  const db = getAdminFirestore();
  const fromYear = 2026;
  const toYear = 2025;
  const delta = toYear - fromYear;
  const stats = { payments: 0, invoices: 0, activity: 0 };

  const invoicesSnap = await db.collection(orgPath(orgId, 'invoices')).get();

  for (const invoiceDoc of invoicesSnap.docs) {
    const invoiceId = invoiceDoc.id;
    const invoiceData = invoiceDoc.data();
    const invoiceUpdates: Record<string, unknown> = {};

    const paymentsSnap = await db.collection(`${orgPath(orgId, 'invoices')}/${invoiceId}/payments`).get();
    let latestPaidAt: Date | null = null;

    for (const paymentDoc of paymentsSnap.docs) {
      const payment = paymentDoc.data();
      const paymentUpdates: Record<string, unknown> = {};
      let paidAt = toJsDate(payment.paidAt);

      if (isYear(paidAt, fromYear)) {
        paidAt = shiftYearDate(paidAt, delta);
        paymentUpdates.paidAt = paidAt;
        stats.payments += 1;
      }
      if (isYear(payment.createdAt, fromYear)) {
        paymentUpdates.createdAt = shiftYearDate(payment.createdAt, delta);
      }
      if (paidAt && (!latestPaidAt || paidAt > latestPaidAt)) {
        latestPaidAt = paidAt;
      }
      if (Object.keys(paymentUpdates).length) {
        paymentUpdates.updatedAt = new Date();
        if (!dryRun) await paymentDoc.ref.update(paymentUpdates);
      }
    }

    const activitySnap = await db.collection(`${orgPath(orgId, 'invoices')}/${invoiceId}/activity`).get();
    for (const activityDoc of activitySnap.docs) {
      const activity = activityDoc.data();
      if (activity.type !== 'payment_received' || !isYear(activity.occurredAt, fromYear)) continue;
      stats.activity += 1;
      if (!dryRun) {
        await activityDoc.ref.update({
          occurredAt: shiftYearDate(activity.occurredAt, delta),
          updatedAt: new Date(),
        });
      }
    }

    const amountPaidCents = Number(invoiceData.amountPaidCents ?? 0);
    if (isYear(invoiceData.paidAt, fromYear)) {
      invoiceUpdates.paidAt = shiftYearDate(invoiceData.paidAt, delta);
      stats.invoices += 1;
    } else if (amountPaidCents > 0 && latestPaidAt && (!invoiceData.paidAt || isYear(invoiceData.updatedAt, fromYear))) {
      invoiceUpdates.paidAt = latestPaidAt;
      stats.invoices += 1;
    }

    if (Object.keys(invoiceUpdates).length) {
      invoiceUpdates.updatedAt = new Date();
      if (!dryRun) await invoiceDoc.ref.update(invoiceUpdates);
    }
  }

  return stats;
}
