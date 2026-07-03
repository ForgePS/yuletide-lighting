import type {
  Automation360Trigger,
  AutomationAction,
  AutomationCondition,
  AutomationDashboard,
  AutomationRule360,
  AutomationRunLog,
  AutomationTriggerContext,
} from '@clcrm/types';
import { DEFAULT_AUTOMATION360_RULES } from '@clcrm/types';
import { getAdminFirestore, Timestamp } from './admin';
import { colCreate, colGet, colList, colUpdate } from './firestore';
import { mapTimestampsFromData } from './firestore-utils';
import { renderMessageTemplate } from '@clcrm/types';
import { sendMessage360, ensureInternalChannels, sendInternalMessage } from './messages360';
import { updateCustomerPipelineStage, updateCustomerNextAction, logCustomerActivity } from './customer360';
import type { CustomerStage } from '@clcrm/types';

function ts() {
  return Timestamp.now();
}

function mapRule(raw: Record<string, unknown>, id: string): AutomationRule360 {
  return mapTimestampsFromData({ id, ...raw }) as unknown as AutomationRule360;
}

function mapRun(raw: Record<string, unknown>, id: string): AutomationRunLog {
  return mapTimestampsFromData({ id, ...raw }) as unknown as AutomationRunLog;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function dayAgo(hours = 24) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

const LEGACY_TRIGGER_MAP: Partial<Record<Automation360Trigger, import('@clcrm/types').AutomationTrigger>> = {
  proposal_sent: 'proposal_sent',
  proposal_viewed: 'proposal_viewed',
  proposal_not_viewed_24h: 'proposal_not_approved',
  job_scheduled: 'job_scheduled',
  job_completed: 'job_completed',
  invoice_overdue: 'invoice_overdue',
  deposit_paid: 'payment_received',
  proposal_accepted: 'payment_received',
};

function resolveFieldValue(field: string, ctx: AutomationTriggerContext): unknown {
  if (field.startsWith('metadata.')) {
    return ctx.metadata?.[field.slice(9)];
  }
  if (field.startsWith('vars.')) {
    return ctx.vars?.[field.slice(5)];
  }
  return (ctx as Record<string, unknown>)[field] ?? ctx.metadata?.[field] ?? ctx.vars?.[field];
}

function evaluateConditions(conditions: AutomationCondition[], ctx: AutomationTriggerContext): boolean {
  if (!conditions.length) return true;
  return conditions.every((c) => {
    const actual = resolveFieldValue(c.field, ctx);
    switch (c.operator) {
      case 'exists':
        return actual != null && actual !== '';
      case 'equals':
        return String(actual ?? '') === String(c.value ?? '');
      case 'not_equals':
        return String(actual ?? '') !== String(c.value ?? '');
      case 'greater_than':
        return Number(actual ?? 0) > Number(c.value ?? 0);
      case 'less_than':
        return Number(actual ?? 0) < Number(c.value ?? 0);
      default:
        return true;
    }
  });
}

async function executeAction(
  orgId: string,
  action: AutomationAction,
  ctx: AutomationTriggerContext,
  userId?: string | null,
): Promise<string> {
  const vars = {
    customerName: ctx.customerName ?? 'Customer',
    ...(ctx.vars ?? {}),
  };

  switch (action.type) {
    case 'send_email': {
      const subject = renderMessageTemplate(String(action.config.subject ?? 'Message from your lighting company'), vars);
      const body = renderMessageTemplate(String(action.config.body ?? ''), vars);
      await sendMessage360(orgId, { customerId: ctx.customerId, channel: 'email', subject, body }, userId, 'Automation');
      return 'send_email';
    }
    case 'send_sms': {
      const body = renderMessageTemplate(String(action.config.body ?? ''), vars);
      await sendMessage360(orgId, { customerId: ctx.customerId, channel: 'sms', body }, userId, 'Automation');
      return 'send_sms';
    }
    case 'notify_user': {
      const channels = await ensureInternalChannels(orgId);
      const channelType = String(action.config.channelType ?? 'sales');
      const channel = channels.find((c) => c.channelType === channelType) ?? channels[0];
      const body = renderMessageTemplate(String(action.config.body ?? 'Automation notification'), vars);
      if (channel) {
        await sendInternalMessage(orgId, channel.id, body, userId ?? 'system', 'Automation');
      }
      return 'notify_user';
    }
    case 'change_stage': {
      const stage = String(action.config.stage ?? 'contacted') as CustomerStage;
      await updateCustomerPipelineStage(orgId, ctx.customerId, stage, userId);
      return `change_stage:${stage}`;
    }
    case 'create_task': {
      const title = renderMessageTemplate(String(action.config.title ?? 'Automation task'), vars);
      const dueDays = Number(action.config.dueDays ?? 1);
      const due = new Date();
      due.setDate(due.getDate() + dueDays);
      await colCreate(orgId, 'automationTasks', {
        organizationId: orgId,
        customerId: ctx.customerId,
        title,
        dueAt: due,
        status: 'open',
        source: 'automation',
      });
      return 'create_task';
    }
    case 'create_follow_up_reminder': {
      const actionText = renderMessageTemplate(String(action.config.action ?? 'Follow up with customer'), vars);
      const dueDays = Number(action.config.dueDays ?? 2);
      const due = new Date();
      due.setDate(due.getDate() + dueDays);
      await updateCustomerNextAction(orgId, ctx.customerId, { nextAction: actionText, nextActionDue: due }, userId);
      await logCustomerActivity(orgId, ctx.customerId, 'note_added', `Automation reminder: ${actionText}`, userId);
      return 'create_follow_up_reminder';
    }
    case 'create_invoice': {
      await logCustomerActivity(
        orgId,
        ctx.customerId,
        'note_added',
        'Automation flagged: generate invoice',
        userId,
      );
      return 'create_invoice';
    }
    default:
      return action.type;
  }
}

async function logAutomationRun(
  orgId: string,
  input: Omit<AutomationRunLog, keyof import('@clcrm/types').AutomationAuditFields | 'id' | 'organizationId'>,
) {
  return colCreate(orgId, 'automationRuns', {
    organizationId: orgId,
    ...input,
  }) as Promise<AutomationRunLog>;
}

export async function ensureAutomationRules(orgId: string, userId?: string | null): Promise<AutomationRule360[]> {
  const existing = await colList<Record<string, unknown>>(orgId, 'automationRules');
  if (existing.length) {
    return existing.map((r) => mapRule(r, String(r.id))).sort((a, b) => a.name.localeCompare(b.name));
  }

  const seeded: AutomationRule360[] = [];
  for (const rule of DEFAULT_AUTOMATION360_RULES) {
    const created = (await colCreate(orgId, 'automationRules', {
      organizationId: orgId,
      ...rule,
      runCount: 0,
      lastRunAt: null,
      createdBy: userId,
      updatedBy: userId,
    })) as AutomationRule360;
    seeded.push(created);
  }
  return seeded;
}

export async function listAutomationRules(orgId: string): Promise<AutomationRule360[]> {
  return ensureAutomationRules(orgId);
}

export async function createAutomationRule(
  orgId: string,
  input: Omit<AutomationRule360, keyof import('@clcrm/types').AutomationAuditFields | 'id' | 'organizationId' | 'runCount' | 'lastRunAt'>,
  userId?: string | null,
) {
  return colCreate(orgId, 'automationRules', {
    organizationId: orgId,
    ...input,
    runCount: 0,
    lastRunAt: null,
    createdBy: userId,
    updatedBy: userId,
  }) as Promise<AutomationRule360>;
}

export async function updateAutomationRule360(
  orgId: string,
  ruleId: string,
  input: Partial<Pick<AutomationRule360, 'name' | 'trigger' | 'description' | 'conditions' | 'actions' | 'active'>>,
  userId?: string | null,
) {
  await colUpdate(orgId, 'automationRules', ruleId, { ...input, updatedBy: userId });
  return colGet<AutomationRule360>(orgId, 'automationRules', ruleId);
}

export async function toggleAutomationRule(orgId: string, ruleId: string, active: boolean, userId?: string | null) {
  await colUpdate(orgId, 'automationRules', ruleId, { active, updatedBy: userId });
  return colGet<AutomationRule360>(orgId, 'automationRules', ruleId);
}

export async function listAutomationRuns(orgId: string, limit = 50): Promise<AutomationRunLog[]> {
  const rows = await colList<Record<string, unknown>>(orgId, 'automationRuns');
  return rows
    .map((r) => mapRun(r, String(r.id)))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);
}

export async function getAutomationDashboard(orgId: string): Promise<AutomationDashboard> {
  const [rules, runs] = await Promise.all([listAutomationRules(orgId), listAutomationRuns(orgId, 200)]);
  const today = startOfToday();
  const since24h = dayAgo(24);
  const recent = runs.filter((r) => r.createdAt >= since24h);
  const todayRuns = runs.filter((r) => r.createdAt >= today);
  const failed = recent.filter((r) => r.status === 'failed');
  const success = recent.filter((r) => r.status === 'success');

  return {
    totalRules: rules.length,
    activeRules: rules.filter((r) => r.active).length,
    runsToday: todayRuns.length,
    failedRuns24h: failed.length,
    successRatePercent: recent.length ? Math.round((success.length / recent.length) * 100) : 100,
  };
}

export async function runAutomationRule(
  orgId: string,
  rule: AutomationRule360,
  ctx: AutomationTriggerContext,
  userId?: string | null,
): Promise<AutomationRunLog> {
  if (!rule.active) {
    return logAutomationRun(orgId, {
      ruleId: rule.id,
      ruleName: rule.name,
      trigger: rule.trigger,
      status: 'skipped',
      customerId: ctx.customerId,
      customerName: ctx.customerName ?? null,
      actionsExecuted: [],
      contextSummary: 'Rule disabled',
    });
  }

  if (!evaluateConditions(rule.conditions, ctx)) {
    return logAutomationRun(orgId, {
      ruleId: rule.id,
      ruleName: rule.name,
      trigger: rule.trigger,
      status: 'skipped',
      customerId: ctx.customerId,
      customerName: ctx.customerName ?? null,
      actionsExecuted: [],
      contextSummary: 'Conditions not met',
    });
  }

  const executed: string[] = [];
  try {
    for (const action of rule.actions) {
      executed.push(await executeAction(orgId, action, ctx, userId));
    }
    await colUpdate(orgId, 'automationRules', rule.id, {
      runCount: rule.runCount + 1,
      lastRunAt: new Date(),
    });
    return logAutomationRun(orgId, {
      ruleId: rule.id,
      ruleName: rule.name,
      trigger: rule.trigger,
      status: 'success',
      customerId: ctx.customerId,
      customerName: ctx.customerName ?? null,
      actionsExecuted: executed,
      contextSummary: executed.join(', '),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Automation failed';
    return logAutomationRun(orgId, {
      ruleId: rule.id,
      ruleName: rule.name,
      trigger: rule.trigger,
      status: 'failed',
      customerId: ctx.customerId,
      customerName: ctx.customerName ?? null,
      actionsExecuted: executed,
      errorMessage: message,
      contextSummary: executed.length ? `${executed.join(', ')} — failed` : message,
    });
  }
}

export async function fireAutomationTrigger(
  orgId: string,
  trigger: Automation360Trigger,
  ctx: AutomationTriggerContext,
  userId?: string | null,
) {
  const rules = (await ensureAutomationRules(orgId)).filter((r) => r.trigger === trigger);
  const runs = await Promise.all(rules.map((rule) => runAutomationRule(orgId, rule, ctx, userId)));

  const legacy = LEGACY_TRIGGER_MAP[trigger];
  if (legacy) {
    try {
      const { triggerAutomation } = await import('./messages360');
      await triggerAutomation(orgId, legacy, ctx.customerId, ctx.vars ?? {}, userId);
    } catch {
      // Legacy automations are best-effort
    }
  }

  return runs;
}
