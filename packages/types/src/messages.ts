/** Unified Communications — Sprint MSG-001 */

export type MessageAuditFields = {
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type MessageChannel = 'sms' | 'email' | 'portal' | 'internal';

export type MessageDirection = 'inbound' | 'outbound';

export type MessageDeliveryStatus = 'sent' | 'delivered' | 'read' | 'opened' | 'clicked' | 'failed' | 'replied';

export type ConversationStatus = 'open' | 'waiting_on_customer' | 'waiting_on_staff' | 'closed';

export type ConversationSource = 'sms' | 'email' | 'portal' | 'mixed';

export type InboxPriority = 'low' | 'normal' | 'high' | 'critical';

export type InboxCategory =
  | 'sales_opportunity'
  | 'scheduling_question'
  | 'payment_question'
  | 'service_issue'
  | 'warranty_request'
  | 'general';

export type CampaignType = 'email' | 'sms' | 'mixed';

export type CampaignAudience =
  | 'residential'
  | 'commercial'
  | 'hoa'
  | 'previous_customers'
  | 'high_value'
  | 'at_risk';

export type SeasonalCampaign =
  | 'august_early_booking'
  | 'september_design_approval'
  | 'october_final_booking'
  | 'january_storage_renewal'
  | 'february_permanent_upgrade';

export type AutomationTrigger =
  | 'proposal_sent'
  | 'proposal_viewed'
  | 'proposal_not_approved'
  | 'job_scheduled'
  | 'crew_en_route'
  | 'crew_arrived'
  | 'job_completed'
  | 'invoice_created'
  | 'invoice_viewed'
  | 'payment_reminder'
  | 'payment_received'
  | 'invoice_overdue'
  | 'installation_completed'
  | 'review_request'
  | SeasonalCampaign;

export type TemplateCategory =
  | 'proposal_follow_up'
  | 'estimate_reminder'
  | 'appointment_confirmation'
  | 'crew_arrival'
  | 'completion_notice'
  | 'invoice_reminder'
  | 'review_request'
  | 'renewal_offer';

export type InternalChannelType = 'sales' | 'install' | 'service' | 'management' | 'warehouse' | 'dispatch' | 'dm' | 'group';

export type TimelineEventType =
  | 'sms_sent'
  | 'sms_received'
  | 'email_sent'
  | 'email_opened'
  | 'proposal_viewed'
  | 'invoice_viewed'
  | 'payment_received'
  | 'job_scheduled'
  | 'review_submitted'
  | 'portal_message'
  | 'internal_note';

export type Conversation = MessageAuditFields & {
  id: string;
  organizationId: string;
  customerId: string;
  customerName?: string | null;
  propertyId?: string | null;
  propertyLabel?: string | null;
  status: ConversationStatus;
  source: ConversationSource;
  assignedUserId?: string | null;
  assignedUserName?: string | null;
  tags: string[];
  priority: InboxPriority;
  category: InboxCategory;
  lastActivityAt: Date;
  lastMessagePreview?: string | null;
  unreadCount: number;
};

export type ConversationMessage = MessageAuditFields & {
  id: string;
  conversationId: string;
  channel: MessageChannel;
  direction: MessageDirection;
  body: string;
  subject?: string | null;
  status: MessageDeliveryStatus;
  sentByUserId?: string | null;
  sentByUserName?: string | null;
  deliveredAt?: Date | null;
  readAt?: Date | null;
  openedAt?: Date | null;
  attachmentUrls: string[];
  metadata?: Record<string, unknown> | null;
};

export type MessageTemplate = MessageAuditFields & {
  id: string;
  organizationId: string;
  name: string;
  category: TemplateCategory;
  channel: MessageChannel;
  subject?: string | null;
  body: string;
  variables: string[];
  isActive: boolean;
};

export type Campaign = MessageAuditFields & {
  id: string;
  organizationId: string;
  name: string;
  campaignType: CampaignType;
  seasonalType?: SeasonalCampaign | null;
  audience: CampaignAudience[];
  templateId?: string | null;
  subject?: string | null;
  body: string;
  scheduledAt?: Date | null;
  sentAt?: Date | null;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';
  recipientCount: number;
  deliveredCount: number;
  openedCount: number;
  revenueCents: number;
};

export type Automation = MessageAuditFields & {
  id: string;
  organizationId: string;
  name: string;
  trigger: AutomationTrigger;
  channel: MessageChannel;
  templateId?: string | null;
  subject?: string | null;
  body: string;
  delayDays: number;
  isActive: boolean;
  sentCount: number;
};

export type NotificationRecord = MessageAuditFields & {
  id: string;
  organizationId: string;
  customerId?: string | null;
  trigger: AutomationTrigger;
  channel: MessageChannel;
  title: string;
  body: string;
  status: MessageDeliveryStatus;
  sentAt?: Date | null;
};

export type ReviewRequest = MessageAuditFields & {
  id: string;
  organizationId: string;
  customerId: string;
  customerName?: string | null;
  jobId?: string | null;
  channel: MessageChannel;
  reviewUrl?: string | null;
  status: 'pending' | 'sent' | 'clicked' | 'submitted';
  sentAt?: Date | null;
  clickedAt?: Date | null;
  submittedAt?: Date | null;
};

export type InternalChannel = MessageAuditFields & {
  id: string;
  organizationId: string;
  name: string;
  channelType: InternalChannelType;
  memberIds: string[];
  isDirect: boolean;
  lastMessageAt?: Date | null;
  lastMessagePreview?: string | null;
};

export type InternalMessage = MessageAuditFields & {
  id: string;
  channelId: string;
  body: string;
  sentByUserId: string;
  sentByUserName?: string | null;
  mentions: string[];
  attachmentUrls: string[];
  readByUserIds: string[];
};

export type TimelineEvent = {
  id: string;
  type: TimelineEventType;
  title: string;
  description?: string | null;
  occurredAt: Date;
  channel?: MessageChannel | null;
  metadata?: Record<string, unknown> | null;
};

export type MessagingDashboardKpis = {
  messagesSentToday: number;
  messagesDelivered: number;
  messagesOpened: number;
  smsResponses: number;
  emailResponses: number;
  activeConversations: number;
  automationMessagesSent: number;
  reviewRequestsSent: number;
  reviewsReceived: number;
  renewalCampaignRevenueCents: number;
};

export type AiCommunicationResult = {
  generatedText: string;
  suggestions: string[];
};

export type AiInboxClassification = {
  category: InboxCategory;
  priority: InboxPriority;
  summary: string;
};

export const DEFAULT_MESSAGE_TEMPLATES: Array<Omit<MessageTemplate, keyof MessageAuditFields | 'id' | 'organizationId'>> = [
  {
    name: 'Proposal follow-up',
    category: 'proposal_follow_up',
    channel: 'email',
    subject: 'Following up on your holiday lighting proposal',
    body: 'Hi {{customerName}},\n\nI wanted to follow up on the proposal for {{propertyName}}. Let me know if you have any questions!\n\n{{proposalLink}}',
    variables: ['customerName', 'propertyName', 'proposalLink'],
    isActive: true,
  },
  {
    name: 'Crew arrival notice',
    category: 'crew_arrival',
    channel: 'sms',
    subject: null,
    body: 'Hi {{customerName}}! Your installation crew ({{crewName}}) is approximately 30 minutes away. Contact: {{crewPhone}}',
    variables: ['customerName', 'crewName', 'crewPhone'],
    isActive: true,
  },
  {
    name: 'Invoice reminder',
    category: 'invoice_reminder',
    channel: 'email',
    subject: 'Invoice {{invoiceNumber}} reminder',
    body: 'Hi {{customerName}},\n\nThis is a reminder that invoice {{invoiceNumber}} for {{balanceDue}} is due on {{dueDate}}.\n\nPay online: {{paymentLink}}',
    variables: ['customerName', 'invoiceNumber', 'balanceDue', 'dueDate', 'paymentLink'],
    isActive: true,
  },
  {
    name: 'Review request',
    category: 'review_request',
    channel: 'sms',
    subject: null,
    body: 'Hi {{customerName}}! Thank you for choosing us for your holiday lighting. We\'d love a review: {{reviewLink}}',
    variables: ['customerName', 'reviewLink'],
    isActive: true,
  },
  {
    name: 'August early booking',
    category: 'renewal_offer',
    channel: 'email',
    subject: 'Book early & save — {{customerName}}',
    body: 'Hi {{customerName}},\n\nSecure your spot for this season! Early booking discounts available for {{address}}.\n\nReply or call us to schedule.',
    variables: ['customerName', 'address'],
    isActive: true,
  },
];

export const DEFAULT_AUTOMATIONS: Array<Omit<Automation, keyof MessageAuditFields | 'id' | 'organizationId' | 'sentCount'>> = [
  { name: 'Proposal sent email', trigger: 'proposal_sent', channel: 'email', templateId: null, subject: 'Your proposal is ready', body: 'Your holiday lighting proposal is ready to view.', delayDays: 0, isActive: true },
  { name: 'Proposal sent SMS', trigger: 'proposal_sent', channel: 'sms', templateId: null, subject: null, body: 'Your proposal is ready! View it here: {{proposalLink}}', delayDays: 0, isActive: true },
  { name: 'Proposal viewed notify sales', trigger: 'proposal_viewed', channel: 'internal', templateId: null, subject: null, body: 'Customer viewed proposal {{proposalNumber}}', delayDays: 0, isActive: true },
  { name: 'Proposal day 3 reminder', trigger: 'proposal_not_approved', channel: 'email', templateId: null, subject: 'Proposal reminder', body: 'Hi {{customerName}}, just checking in on your proposal.', delayDays: 3, isActive: true },
  { name: 'Proposal day 7 reminder', trigger: 'proposal_not_approved', channel: 'sms', templateId: null, subject: null, body: 'Hi {{customerName}}, still interested in holiday lighting? Reply YES to schedule.', delayDays: 7, isActive: true },
  { name: 'Proposal day 14 reminder', trigger: 'proposal_not_approved', channel: 'email', templateId: null, subject: 'Final proposal reminder', body: 'Hi {{customerName}}, our booking calendar is filling up. Let us know if you\'d like to proceed.', delayDays: 14, isActive: true },
  { name: 'Job scheduled notification', trigger: 'job_scheduled', channel: 'sms', templateId: null, subject: null, body: 'Your installation is scheduled for {{appointmentDate}} at {{address}}.', delayDays: 0, isActive: true },
  { name: 'Crew en route', trigger: 'crew_en_route', channel: 'sms', templateId: null, subject: null, body: 'Your crew is on the way! ETA ~30 min. Crew: {{crewName}}', delayDays: 0, isActive: true },
  { name: 'Job completed', trigger: 'job_completed', channel: 'email', templateId: null, subject: 'Installation complete!', body: 'Your holiday lighting installation is complete. Thank you!', delayDays: 0, isActive: true },
  { name: 'Review request after install', trigger: 'installation_completed', channel: 'sms', templateId: null, subject: null, body: 'Thanks for choosing us! Leave a review: {{reviewLink}}', delayDays: 1, isActive: true },
  { name: 'Invoice created', trigger: 'invoice_created', channel: 'email', templateId: null, subject: 'Invoice {{invoiceNumber}}', body: 'Your invoice is ready. Pay here: {{paymentLink}}', delayDays: 0, isActive: true },
  { name: 'Payment received', trigger: 'payment_received', channel: 'email', templateId: null, subject: 'Payment received', body: 'Thank you! We received your payment of {{amount}}.', delayDays: 0, isActive: true },
  { name: 'Invoice overdue', trigger: 'invoice_overdue', channel: 'sms', templateId: null, subject: null, body: 'Invoice {{invoiceNumber}} is past due. Pay: {{paymentLink}}', delayDays: 0, isActive: true },
];

export const DEFAULT_INTERNAL_CHANNELS: Array<{ name: string; channelType: InternalChannelType }> = [
  { name: 'Sales', channelType: 'sales' },
  { name: 'Install Teams', channelType: 'install' },
  { name: 'Service Teams', channelType: 'service' },
  { name: 'Management', channelType: 'management' },
  { name: 'Warehouse', channelType: 'warehouse' },
  { name: 'Dispatch', channelType: 'dispatch' },
];

export function renderMessageTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '');
}

export function classifyMessage(body: string): AiInboxClassification {
  const lower = body.toLowerCase();
  if (/pay|invoice|deposit|balance|bill/.test(lower)) {
    return { category: 'payment_question', priority: 'high', summary: 'Payment-related inquiry' };
  }
  if (/schedule|appointment|when|date|time|available/.test(lower)) {
    return { category: 'scheduling_question', priority: 'normal', summary: 'Scheduling question' };
  }
  if (/broken|repair|fix|warranty|not working|outage/.test(lower)) {
    return { category: 'warranty_request', priority: 'high', summary: 'Service/warranty issue' };
  }
  if (/quote|proposal|price|cost|estimate|book/.test(lower)) {
    return { category: 'sales_opportunity', priority: 'normal', summary: 'Sales opportunity' };
  }
  if (/urgent|emergency|asap|immediately/.test(lower)) {
    return { category: 'service_issue', priority: 'critical', summary: 'Urgent service request' };
  }
  return { category: 'general', priority: 'low', summary: 'General message' };
}

export function aiGenerateMessage(prompt: string): AiCommunicationResult {
  const lower = prompt.toLowerCase();
  if (lower.includes('proposal follow')) {
    return {
      generatedText: 'Hi {{customerName}},\n\nI hope you had a chance to review the holiday lighting proposal for {{propertyName}}. I\'m happy to answer any questions or adjust the design. Would you like to schedule a quick call?\n\nBest regards',
      suggestions: ['Send within 48 hours of proposal view', 'Include proposal link', 'Mention early booking discount'],
    };
  }
  if (lower.includes('payment reminder')) {
    return {
      generatedText: 'Hi {{customerName}},\n\nThis is a friendly reminder that invoice {{invoiceNumber}} for {{balanceDue}} is due on {{dueDate}}. You can pay securely online: {{paymentLink}}\n\nThank you!',
      suggestions: ['Keep tone friendly for first reminder', 'Include direct payment link', 'Offer to answer billing questions'],
    };
  }
  if (lower.includes('review request')) {
    return {
      generatedText: 'Hi {{customerName}}! Thank you for trusting us with your holiday lighting. If you\'re happy with the results, we\'d really appreciate a quick review: {{reviewLink}}. It helps other homeowners find us!',
      suggestions: ['Send 1-2 days after completion', 'Keep SMS under 160 chars if possible', 'Include Google review link'],
    };
  }
  return {
    generatedText: 'Hi {{customerName}},\n\nThank you for reaching out. How can we help you today?\n\nBest regards',
    suggestions: ['Personalize with customer name', 'Reference property address when relevant'],
  };
}
