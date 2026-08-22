import type { CustomerStage } from '@clcrm/types';
import { formatCurrency } from '@clcrm/ui';
import { PIPELINE_STAGE_LABELS } from '@/lib/customer360-utils';

export const PIPELINE_STAGES: { value: CustomerStage; label: string }[] = (
  Object.entries(PIPELINE_STAGE_LABELS) as [CustomerStage, string][]
).map(([value, label]) => ({ value, label }));

export function labelPipelineStage(stage: CustomerStage): string {
  return PIPELINE_STAGE_LABELS[stage] ?? stage;
}

export function pipelineStageColor(stage: CustomerStage): string {
  if (stage === 'lost' || stage === 'deferred') return 'border-red-200 bg-red-500/5';
  if (['paid', 'stored', 'rebook_next_season'].includes(stage)) return 'border-emerald-200 bg-emerald-500/5';
  if (['approved', 'deposit_paid', 'scheduled', 'installed'].includes(stage)) return 'border-blue-200 bg-blue-500/5';
  if (['proposal_sent', 'proposal_viewed', 'proposal_draft', 'follow_up_required'].includes(stage)) {
    return 'border-violet-200 bg-violet-500/5';
  }
  if (['consultation_scheduled', 'consultation_completed', 'qualified', 'attempting_contact'].includes(stage)) {
    return 'border-amber-200 bg-amber-500/5';
  }
  return 'border-border bg-muted/20';
}

export { formatCurrency };
