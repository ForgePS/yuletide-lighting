import { describe, expect, it } from 'vitest';
import {
  canMarkJobInstalled,
  canReserveJobInventory,
  canScheduleJob,
  formatJobStageLabel,
  mapCrmJobStatusToOrgStage,
  mapOrgJobStageToCrmStatus,
} from './customer360';

describe('YL-S9 job stage helpers', () => {
  it('formatJobStageLabel is null-safe', () => {
    expect(formatJobStageLabel(null)).toBe('Unknown');
    expect(formatJobStageLabel(undefined)).toBe('Unknown');
    expect(formatJobStageLabel('')).toBe('Unknown');
    expect(formatJobStageLabel('accepted_proposal')).toBe('Accepted Proposal');
  });

  it('maps CRM status to pipeline stage (no orphan pending)', () => {
    expect(mapCrmJobStatusToOrgStage('draft')).toBe('accepted_proposal');
    expect(mapCrmJobStatusToOrgStage('scheduled')).toBe('scheduled');
    expect(mapCrmJobStatusToOrgStage('in_progress')).toBe('scheduled');
    expect(mapCrmJobStatusToOrgStage('completed')).toBe('installed');
    expect(mapCrmJobStatusToOrgStage('cancelled')).toBe('lost');
    expect(mapCrmJobStatusToOrgStage(null)).toBe('accepted_proposal');
  });

  it('maps org stage to CRM status', () => {
    expect(mapOrgJobStageToCrmStatus('accepted_proposal')).toBe('draft');
    expect(mapOrgJobStageToCrmStatus('deposit_paid')).toBe('draft');
    expect(mapOrgJobStageToCrmStatus('scheduled')).toBe('scheduled');
    expect(mapOrgJobStageToCrmStatus('installed')).toBe('completed');
    expect(mapOrgJobStageToCrmStatus('removed')).toBe('completed');
    expect(mapOrgJobStageToCrmStatus('lost')).toBe('cancelled');
    expect(mapOrgJobStageToCrmStatus(null)).toBe('draft');
  });

  it('staff action gates cover mid-pipeline stages', () => {
    expect(canReserveJobInventory('accepted_proposal')).toBe(true);
    expect(canReserveJobInventory('deposit_paid')).toBe(true);
    expect(canReserveJobInventory('scheduled')).toBe(false);

    expect(canScheduleJob('inventory_reserved')).toBe(true);
    expect(canScheduleJob('invoiced')).toBe(true);
    expect(canScheduleJob('installed')).toBe(false);

    expect(canMarkJobInstalled('scheduled')).toBe(true);
    expect(canMarkJobInstalled('inventory_reserved')).toBe(true);
    expect(canMarkJobInstalled('accepted_proposal')).toBe(false);
  });
});
