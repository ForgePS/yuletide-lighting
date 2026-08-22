/** Advanced Accounts Receivable — Sprint INV-002 */

export type InvoiceAuditFields = {
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type InvoiceStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'pending_payment'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
  | 'in_collection'
  | 'disputed'
  | 'refunded'
  | 'cancelled';

export type PaymentMethod = 'credit_card' | 'ach' | 'check' | 'cash' | 'wire_transfer';

export type PaymentType = 'deposit' | 'partial' | 'final' | 'refund' | 'credit';

export type ReminderStage =
  | 'pre_due_3'
  | 'due_today'
  | 'overdue_3'
  | 'overdue_7'
  | 'overdue_14'
  | 'overdue_21'
  | 'overdue_30';

export type ReminderStatus =
  | 'scheduled'
  | 'recorded'
  | 'sent'
  | 'skipped'
  | 'paused'
  | 'cancelled';

export type ReminderChannel = 'email' | 'sms';

export type DisputeStatus = 'open' | 'investigating' | 'resolved' | 'closed';

export type CollectionRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type AgingBucket = 'current' | '1_30' | '31_60' | '61_90' | '90_plus';

export type InvoiceActivityType =
  | 'created'
  | 'sent'
  | 'viewed'
  | 'payment_attempt'
  | 'payment_received'
  | 'reminder_sent'
  | 'customer_response'
  | 'dispute_opened'
  | 'dispute_resolved'
  | 'status_changed'
  | 'refund'
  | 'collection_queued'
  | 'statement_sent';

export type InvoiceRecord = InvoiceAuditFields & {
  id: string;
  organizationId: string;
  invoiceNumber: string;
  customerId: string;
  customerName?: string | null;
  propertyAddress?: string | null;
  proposalId?: string | null;
  status: InvoiceStatus;
  subtotalCents: number;
  depositPercent: number;
  depositCents: number;
  amountPaidCents: number;
  balanceDueCents: number;
  dueDate: Date;
  sentAt?: Date | null;
  openedAt?: Date | null;
  paidAt?: Date | null;
  viewCount: number;
  lastViewedAt?: Date | null;
  paymentAttempts: number;
  publicToken: string;
  remindersPaused: boolean;
  reminderStage?: ReminderStage | null;
  nextReminderAt?: Date | null;
  activeDisputeId?: string | null;
  inCollectionQueue: boolean;
  collectionRiskLevel?: CollectionRiskLevel | null;
  agingBucket: AgingBucket;
  daysOverdue: number;
  notes?: string | null;
};

export type InvoicePayment = InvoiceAuditFields & {
  id: string;
  invoiceId: string;
  amountCents: number;
  paymentType: PaymentType;
  paymentMethod: PaymentMethod;
  transactionId?: string | null;
  processor?: string | null;
  feesCents: number;
  paidAt: Date;
  notes?: string | null;
};

export type InvoiceActivity = InvoiceAuditFields & {
  id: string;
  invoiceId: string;
  type: InvoiceActivityType;
  title: string;
  description?: string | null;
  userId?: string | null;
  userName?: string | null;
  metadata?: Record<string, unknown> | null;
  occurredAt: Date;
};

export type InvoiceReminder = InvoiceAuditFields & {
  id: string;
  invoiceId: string;
  stage: ReminderStage;
  channel: ReminderChannel;
  status: ReminderStatus;
  scheduledAt: Date;
  sentAt?: Date | null;
  templateId?: string | null;
  subject?: string | null;
  body?: string | null;
};

export type InvoiceDispute = InvoiceAuditFields & {
  id: string;
  invoiceId: string;
  customerId: string;
  reason: string;
  status: DisputeStatus;
  assignedUserId?: string | null;
  assignedUserName?: string | null;
  resolution?: string | null;
  openedAt: Date;
  resolvedAt?: Date | null;
};

export type ReminderTemplate = InvoiceAuditFields & {
  id: string;
  organizationId: string;
  name: string;
  stage: ReminderStage;
  channel: ReminderChannel;
  subject: string;
  body: string;
  version: number;
  isActive: boolean;
};

export type InvoiceTemplateBlockType = 'text' | 'image' | 'field' | 'divider';

export type InvoiceTemplateBlock = {
  id: string;
  type: InvoiceTemplateBlockType;
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string | null;
  fieldKey?: string | null;
  textSize?: number | null;
  align?: 'left' | 'center' | 'right' | null;
};

export type InvoiceTemplate = InvoiceAuditFields & {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  backgroundImageUrl?: string | null;
  primaryColor: string;
  pageWidth: number;
  pageHeight: number;
  contentHtml?: string | null;
  blocks: InvoiceTemplateBlock[];
  isDefault: boolean;
  isActive: boolean;
};

export type CollectionQueueItem = InvoiceAuditFields & {
  id: string;
  organizationId: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName?: string | null;
  balanceDueCents: number;
  daysOverdue: number;
  riskLevel: CollectionRiskLevel;
  riskScore: number;
  queuedAt: Date;
  assignedUserId?: string | null;
};

export type CustomerStatement = InvoiceAuditFields & {
  id: string;
  organizationId: string;
  customerId: string;
  customerName?: string | null;
  periodStart: Date;
  periodEnd: Date;
  openingBalanceCents: number;
  chargesCents: number;
  paymentsCents: number;
  creditsCents: number;
  closingBalanceCents: number;
  invoiceIds: string[];
  sentAt?: Date | null;
};

export type CashFlowForecast = InvoiceAuditFields & {
  id: string;
  organizationId: string;
  forecastDate: Date;
  horizonDays: 30 | 60 | 90;
  expectedCollectionsCents: number;
  latePaymentRiskCents: number;
  monthlyRevenueCents: number;
  seasonalRevenueCents: number;
};

export type InvoiceDashboardKpis = {
  totalReceivablesCents: number;
  currentBalanceCents: number;
  overdueBalanceCents: number;
  depositsOutstandingCents: number;
  collectionRatePercent: number;
  averageDaysToPay: number;
  totalPaidThisMonthCents: number;
  expectedCollectionsCents: number;
  revenueForecastCents: number;
  agingRiskScore: number;
};

export type AgingBucketSummary = {
  bucket: AgingBucket;
  label: string;
  invoiceCount: number;
  balanceDueCents: number;
  customerCount: number;
  riskRating: CollectionRiskLevel;
};

export type InvoiceAnalytics = {
  revenueCollectedCents: number;
  outstandingBalanceCents: number;
  collectionRatePercent: number;
  averageDaysToPay: number;
  agingTrend: Array<{ month: string; currentCents: number; overdueCents: number }>;
  overdueTrend: Array<{ month: string; count: number; balanceCents: number }>;
  topOverdueCustomers: Array<{ customerId: string; customerName: string; balanceCents: number; invoiceCount: number }>;
};

export type CustomerBalanceSummary = {
  customerId: string;
  customerName: string;
  openInvoices: InvoiceRecord[];
  paidInvoices: InvoiceRecord[];
  creditsCents: number;
  depositsCents: number;
  outstandingBalanceCents: number;
};

export type AiCollectionsQueryResult = {
  answer: string;
  invoices: InvoiceRecord[];
  recommendations: string[];
};

export const REMINDER_STAGE_LABELS: Record<ReminderStage, string> = {
  pre_due_3: '3 days before due',
  due_today: 'Due today',
  overdue_3: '3 days overdue',
  overdue_7: '7 days overdue',
  overdue_14: '14 days overdue',
  overdue_21: '21 days overdue (escalation)',
  overdue_30: '30 days overdue (collection review)',
};

export const DEFAULT_REMINDER_TEMPLATES: Array<Omit<ReminderTemplate, keyof InvoiceAuditFields | 'id' | 'organizationId'>> = [
  {
    name: 'Friendly pre-due reminder',
    stage: 'pre_due_3',
    channel: 'email',
    subject: 'Upcoming invoice {{invoiceNumber}} — {{customerName}}',
    body: 'Hi {{customerName}},\n\nThis is a friendly reminder that invoice {{invoiceNumber}} for {{balanceDue}} is due on {{dueDate}}.\n\nPay online: {{paymentLink}}\n\nProperty: {{propertyAddress}}',
    version: 1,
    isActive: true,
  },
  {
    name: 'Due today notice',
    stage: 'due_today',
    channel: 'email',
    subject: 'Invoice {{invoiceNumber}} is due today',
    body: 'Hi {{customerName}},\n\nInvoice {{invoiceNumber}} for {{balanceDue}} is due today.\n\nPay now: {{paymentLink}}',
    version: 1,
    isActive: true,
  },
  {
    name: 'Overdue reminder #1',
    stage: 'overdue_3',
    channel: 'email',
    subject: 'Past due: Invoice {{invoiceNumber}}',
    body: 'Hi {{customerName}},\n\nInvoice {{invoiceNumber}} is now past due. Balance: {{balanceDue}}.\n\nPlease pay at your earliest convenience: {{paymentLink}}',
    version: 1,
    isActive: true,
  },
];

export function normalizeInvoiceStatus(status: string): InvoiceStatus {
  const map: Record<string, InvoiceStatus> = {
    partial: 'partially_paid',
    void: 'cancelled',
    canceled: 'cancelled',
  };
  return (map[status] ?? status) as InvoiceStatus;
}

/** YL-S13 — null-safe invoice / payment method labels. */
export function formatInvoiceStatusLabel(value: string | null | undefined): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return 'Unknown';
  const normalized = normalizeInvoiceStatus(text);
  return String(normalized)
    .split('_')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/**
 * YL-S13 — server-authoritative next charge amount (deposit-first, then balance).
 * Pure helper shared by checkout, pay page, and portal billing.
 */
export function invoicePayableCents(invoice: {
  status?: string | null;
  subtotalCents?: number | null;
  amountPaidCents?: number | null;
  depositCents?: number | null;
}): { payable: boolean; amountCents: number; reason?: string } {
  const status = normalizeInvoiceStatus(String(invoice.status ?? 'draft').toLowerCase());
  if (['paid', 'cancelled', 'draft', 'refunded'].includes(status)) {
    return { payable: false, amountCents: 0, reason: 'INVALID_STATE' };
  }
  const subtotal = Math.max(0, Number(invoice.subtotalCents ?? 0));
  const paid = Math.max(0, Number(invoice.amountPaidCents ?? 0));
  const balance = Math.max(0, subtotal - paid);
  if (balance <= 0) {
    return { payable: false, amountCents: 0, reason: 'INVALID_STATE' };
  }
  const deposit = Number(invoice.depositCents ?? 0);
  if (deposit > 0) {
    const depositDue = Math.max(0, deposit - paid);
    if (depositDue > 0) {
      return { payable: true, amountCents: Math.min(depositDue, balance) };
    }
  }
  return { payable: true, amountCents: balance };
}

/** YL-S13 — classify a payment for AR activity / subcollection rows. */
export function inferInvoicePaymentType(
  invoice: { subtotalCents: number; amountPaidCents: number; depositCents?: number | null },
  amountCents: number,
): PaymentType {
  const newPaid = invoice.amountPaidCents + amountCents;
  const balanceAfter = invoice.subtotalCents - newPaid;
  if (balanceAfter <= 0) return 'final';
  const depositDue = Math.max(0, (invoice.depositCents ?? 0) - invoice.amountPaidCents);
  if (depositDue > 0 && amountCents <= depositDue) return 'deposit';
  return 'partial';
}

export function computeBalanceDue(invoice: Pick<InvoiceRecord, 'subtotalCents' | 'amountPaidCents'>): number {
  return Math.max(0, invoice.subtotalCents - invoice.amountPaidCents);
}

export function computeDaysOverdue(dueDate: Date, now = new Date()): number {
  const ms = now.getTime() - dueDate.getTime();
  return ms > 0 ? Math.floor(ms / (24 * 60 * 60 * 1000)) : 0;
}

export function computeAgingBucket(dueDate: Date, balanceDueCents: number, now = new Date()): AgingBucket {
  if (balanceDueCents <= 0) return 'current';
  const days = computeDaysOverdue(dueDate, now);
  if (days <= 0) return 'current';
  if (days <= 30) return '1_30';
  if (days <= 60) return '31_60';
  if (days <= 90) return '61_90';
  return '90_plus';
}

export function computeCollectionRisk(
  daysOverdue: number,
  balanceDueCents: number,
  paymentHistoryScore = 0.5,
): { level: CollectionRiskLevel; score: number } {
  let score = 0;
  if (daysOverdue >= 90) score += 40;
  else if (daysOverdue >= 60) score += 30;
  else if (daysOverdue >= 30) score += 20;
  else if (daysOverdue >= 7) score += 10;

  if (balanceDueCents >= 500000) score += 30;
  else if (balanceDueCents >= 100000) score += 20;
  else if (balanceDueCents >= 25000) score += 10;

  score += Math.round((1 - paymentHistoryScore) * 30);

  const level: CollectionRiskLevel =
    score >= 75 ? 'critical' : score >= 50 ? 'high' : score >= 25 ? 'medium' : 'low';
  return { level, score: Math.min(100, score) };
}

export function getNextReminderStage(
  daysOverdue: number,
  daysUntilDue: number,
  currentStage?: ReminderStage | null,
): ReminderStage | null {
  const stages: Array<{ stage: ReminderStage; trigger: number }> = [
    { stage: 'pre_due_3', trigger: -3 },
    { stage: 'due_today', trigger: 0 },
    { stage: 'overdue_3', trigger: 3 },
    { stage: 'overdue_7', trigger: 7 },
    { stage: 'overdue_14', trigger: 14 },
    { stage: 'overdue_21', trigger: 21 },
    { stage: 'overdue_30', trigger: 30 },
  ];
  const day = daysOverdue > 0 ? daysOverdue : daysUntilDue;
  const eligible = stages.filter((s) => (daysOverdue > 0 ? s.trigger <= daysOverdue : s.trigger <= day && s.trigger <= 0));
  if (!eligible.length) return daysUntilDue === 3 ? 'pre_due_3' : null;
  const next = eligible[eligible.length - 1]!.stage;
  if (currentStage === next) return null;
  return next;
}

export function renderTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '');
}
