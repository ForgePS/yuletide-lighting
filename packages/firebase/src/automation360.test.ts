import { describe, expect, it } from 'vitest';
import {
  evaluateAutomationConditions,
  formatAutomationActionLabel,
  formatAutomationLabel,
  formatAutomationRunStatus,
  formatAutomationTriggerLabel,
  shouldFallbackToMessagingAutomations,
} from '@clcrm/types';

describe('YL-S21 automation helpers', () => {
  it('formats labels null-safely', () => {
    expect(formatAutomationLabel(null)).toBe('Unknown');
    expect(formatAutomationLabel('send_email')).toBe('Send Email');
    expect(formatAutomationTriggerLabel('proposal_sent')).toBe('Proposal sent');
    expect(formatAutomationTriggerLabel('mystery_trigger')).toBe('Mystery Trigger');
    expect(formatAutomationActionLabel('notify_user')).toBe('Notify team');
    expect(formatAutomationActionLabel(null)).toBe('Unknown');
    expect(formatAutomationRunStatus('success')).toBe('Success');
    expect(formatAutomationRunStatus(undefined)).toBe('Unknown');
  });

  it('falls back to messaging automations only when no 360 rules', () => {
    expect(shouldFallbackToMessagingAutomations(0)).toBe(true);
    expect(shouldFallbackToMessagingAutomations(1)).toBe(false);
    expect(shouldFallbackToMessagingAutomations(3)).toBe(false);
  });

  it('evaluates automation conditions', () => {
    const ctx = {
      customerId: 'c1',
      customerName: 'Ada',
      vars: { deposit: '100' },
      metadata: { tier: 'gold' },
    };
    expect(evaluateAutomationConditions([], ctx)).toBe(true);
    expect(evaluateAutomationConditions(null, ctx)).toBe(true);
    expect(
      evaluateAutomationConditions([{ field: 'customerName', operator: 'equals', value: 'Ada' }], ctx),
    ).toBe(true);
    expect(
      evaluateAutomationConditions([{ field: 'customerName', operator: 'equals', value: 'Bob' }], ctx),
    ).toBe(false);
    expect(
      evaluateAutomationConditions([{ field: 'vars.deposit', operator: 'greater_than', value: 50 }], ctx),
    ).toBe(true);
    expect(
      evaluateAutomationConditions([{ field: 'metadata.tier', operator: 'exists' }], ctx),
    ).toBe(true);
    expect(
      evaluateAutomationConditions([{ field: 'missing', operator: 'exists' }], ctx),
    ).toBe(false);
  });
});
