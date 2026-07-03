/** Workflow Automation Center — Sprint 14 */

export type Automation360Trigger =
  | 'new_lead_created'
  | 'proposal_sent'
  | 'proposal_viewed'
  | 'proposal_not_viewed_24h'
  | 'proposal_accepted'
  | 'deposit_paid'
  | 'job_scheduled'
  | 'job_completed'
  | 'invoice_overdue'
  | 'removal_completed'
  | 'storage_completed'
  | 'rebooking_season_begins';

export type AutomationConditionOperator = 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'exists';

export type AutomationActionType =
  | 'send_email'
  | 'send_sms'
  | 'create_task'
  | 'change_stage'
  | 'notify_user'
  | 'create_invoice'
  | 'create_follow_up_reminder';

export type AutomationAuditFields = {
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type AutomationCondition = {
  field: string;
  operator: AutomationConditionOperator;
  value?: string | number | boolean | null;
};

export type AutomationAction = {
  type: AutomationActionType;
  config: Record<string, unknown>;
};

export type AutomationRule360 = AutomationAuditFields & {
  id: string;
  organizationId: string;
  name: string;
  trigger: Automation360Trigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  active: boolean;
  runCount: number;
  lastRunAt?: Date | null;
  description?: string | null;
};

export type AutomationRunStatus = 'success' | 'failed' | 'skipped';

export type AutomationRunLog = AutomationAuditFields & {
  id: string;
  organizationId: string;
  ruleId: string;
  ruleName: string;
  trigger: Automation360Trigger;
  status: AutomationRunStatus;
  customerId?: string | null;
  customerName?: string | null;
  actionsExecuted: string[];
  errorMessage?: string | null;
  contextSummary?: string | null;
};

export type AutomationDashboard = {
  totalRules: number;
  activeRules: number;
  runsToday: number;
  failedRuns24h: number;
  successRatePercent: number;
};

export type AutomationTriggerContext = {
  customerId: string;
  customerName?: string | null;
  jobId?: string | null;
  proposalId?: string | null;
  invoiceId?: string | null;
  vars?: Record<string, string>;
  metadata?: Record<string, unknown>;
};

export const AUTOMATION360_TRIGGER_LABELS: Record<Automation360Trigger, string> = {
  new_lead_created: 'New lead created',
  proposal_sent: 'Proposal sent',
  proposal_viewed: 'Proposal viewed',
  proposal_not_viewed_24h: 'Proposal not viewed (24h)',
  proposal_accepted: 'Proposal accepted',
  deposit_paid: 'Deposit paid',
  job_scheduled: 'Job scheduled',
  job_completed: 'Job completed',
  invoice_overdue: 'Invoice overdue',
  removal_completed: 'Removal completed',
  storage_completed: 'Storage completed',
  rebooking_season_begins: 'Rebooking season begins',
};

export const DEFAULT_AUTOMATION360_RULES: Array<
  Omit<AutomationRule360, keyof AutomationAuditFields | 'id' | 'organizationId' | 'runCount' | 'lastRunAt'>
> = [
  {
    name: 'Welcome new lead',
    trigger: 'new_lead_created',
    conditions: [],
    actions: [
      { type: 'send_email', config: { subject: 'Thanks for your interest!', body: 'Hi {{customerName}}, thanks for reaching out about holiday lighting. We will be in touch shortly.' } },
      { type: 'create_task', config: { title: 'Follow up new lead', dueDays: 1 } },
    ],
    active: true,
    description: 'Email welcome + office task for new leads',
  },
  {
    name: 'Proposal sent notification',
    trigger: 'proposal_sent',
    conditions: [],
    actions: [
      { type: 'send_sms', config: { body: 'Hi {{customerName}}, your holiday lighting proposal is ready: {{proposalLink}}' } },
    ],
    active: true,
    description: 'SMS when proposal is sent',
  },
  {
    name: 'Proposal viewed alert',
    trigger: 'proposal_viewed',
    conditions: [],
    actions: [{ type: 'notify_user', config: { channelType: 'sales', body: 'Customer viewed proposal for {{customerName}}' } }],
    active: true,
    description: 'Notify sales when customer opens proposal',
  },
  {
    name: 'Proposal accepted follow-up',
    trigger: 'proposal_accepted',
    conditions: [],
    actions: [
      { type: 'change_stage', config: { stage: 'approved' } },
      { type: 'create_follow_up_reminder', config: { action: 'Schedule deposit invoice', dueDays: 1 } },
    ],
    active: true,
    description: 'Move pipeline + reminder after approval',
  },
  {
    name: 'Deposit paid confirmation',
    trigger: 'deposit_paid',
    conditions: [],
    actions: [{ type: 'send_email', config: { subject: 'Deposit received', body: 'Thank you {{customerName}}! We received your deposit and will confirm your install date soon.' } }],
    active: true,
    description: 'Email when deposit is collected',
  },
  {
    name: 'Install scheduled SMS',
    trigger: 'job_scheduled',
    conditions: [],
    actions: [{ type: 'send_sms', config: { body: 'Your install is scheduled for {{appointmentDate}} at {{address}}.' } }],
    active: true,
    description: 'Appointment confirmation SMS',
  },
  {
    name: 'Job complete notice',
    trigger: 'job_completed',
    conditions: [],
    actions: [
      { type: 'send_email', config: { subject: 'Installation complete', body: 'Hi {{customerName}}, your holiday lighting install is complete. Enjoy the season!' } },
      { type: 'change_stage', config: { stage: 'installed' } },
    ],
    active: true,
    description: 'Completion email + pipeline update',
  },
  {
    name: 'Overdue invoice reminder',
    trigger: 'invoice_overdue',
    conditions: [],
    actions: [{ type: 'send_sms', config: { body: 'Invoice {{invoiceNumber}} is past due. Pay online: {{paymentLink}}' } }],
    active: true,
    description: 'SMS payment reminder',
  },
  {
    name: 'Removal complete storage offer',
    trigger: 'removal_completed',
    conditions: [],
    actions: [{ type: 'create_follow_up_reminder', config: { action: 'Discuss storage for next season', dueDays: 3 } }],
    active: true,
    description: 'Office follow-up after takedown',
  },
  {
    name: 'Rebooking season kickoff',
    trigger: 'rebooking_season_begins',
    conditions: [],
    actions: [{ type: 'send_email', config: { subject: 'Book next season', body: 'Hi {{customerName}}, it is time to rebook your holiday lighting for next season!' } }],
    active: true,
    description: 'August rebooking campaign email',
  },
];
