import type { CustomerStage } from '@clcrm/types';
import { formatCurrency } from '@clcrm/ui';

export const PIPELINE_STAGES: { value: CustomerStage; label: string }[] = [
  { value: 'new_lead', label: 'New Lead' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'needs_estimate', label: 'Needs Estimate' },
  { value: 'mockup_needed', label: 'Mockup Needed' },
  { value: 'proposal_sent', label: 'Proposal Sent' },
  { value: 'proposal_viewed', label: 'Proposal Viewed' },
  { value: 'approved', label: 'Approved' },
  { value: 'deposit_paid', label: 'Deposit Paid' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'installed', label: 'Installed' },
  { value: 'balance_due', label: 'Balance Due' },
  { value: 'paid', label: 'Paid' },
  { value: 'removal_scheduled', label: 'Removal Scheduled' },
  { value: 'removed', label: 'Removed' },
  { value: 'stored', label: 'Stored' },
  { value: 'rebook_next_season', label: 'Rebook Next Season' },
  { value: 'lost', label: 'Lost / Declined' },
];

export function labelPipelineStage(stage: CustomerStage): string {
  return PIPELINE_STAGES.find((s) => s.value === stage)?.label ?? stage;
}

export function pipelineStageColor(stage: CustomerStage): string {
  if (stage === 'lost') return 'border-red-200 bg-red-500/5';
  if (['paid', 'stored', 'rebook_next_season'].includes(stage)) return 'border-emerald-200 bg-emerald-500/5';
  if (['approved', 'deposit_paid', 'scheduled', 'installed'].includes(stage)) return 'border-blue-200 bg-blue-500/5';
  if (['proposal_sent', 'proposal_viewed'].includes(stage)) return 'border-violet-200 bg-violet-500/5';
  return 'border-border bg-muted/20';
}

export { formatCurrency };
