import { describe, expect, it } from 'vitest';
import {
  formatBackgroundJobLabel,
  isProposalFollowUpCandidate,
  orgIdFromOrgNestedPath,
  PROPOSAL_FOLLOW_UP_STALE_MS,
  resolveInvoiceReminderStatus,
  shouldRunBackgroundJobsForOrg,
} from '@clcrm/types';

describe('YL-S20 background job helpers', () => {
  it('gates orgs by lifecycle', () => {
    expect(shouldRunBackgroundJobsForOrg('active')).toBe(true);
    expect(shouldRunBackgroundJobsForOrg(undefined)).toBe(true);
    expect(shouldRunBackgroundJobsForOrg('inactive')).toBe(false);
    expect(shouldRunBackgroundJobsForOrg('suspended')).toBe(false);
    expect(shouldRunBackgroundJobsForOrg('archived')).toBe(false);
  });

  it('parses org id from nested paths', () => {
    expect(orgIdFromOrgNestedPath('organizations/org_1/proposals/p1')).toBe('org_1');
    expect(orgIdFromOrgNestedPath('bad/path')).toBeNull();
    expect(orgIdFromOrgNestedPath(null)).toBeNull();
  });

  it('selects stale viewed proposals once per view window', () => {
    const now = new Date('2026-08-13T12:00:00Z');
    const viewedAt = new Date(now.getTime() - PROPOSAL_FOLLOW_UP_STALE_MS - 1000);
    expect(
      isProposalFollowUpCandidate(
        {
          status: 'viewed',
          followUpAutomationEnabled: true,
          lastViewedAt: viewedAt,
          followUpLastSentAt: null,
          customerId: 'c1',
        },
        now,
      ),
    ).toBe(true);

    expect(
      isProposalFollowUpCandidate(
        {
          status: 'viewed',
          followUpAutomationEnabled: true,
          lastViewedAt: new Date(now.getTime() - 1000),
          customerId: 'c1',
        },
        now,
      ),
    ).toBe(false);

    expect(
      isProposalFollowUpCandidate(
        {
          status: 'viewed',
          followUpAutomationEnabled: false,
          lastViewedAt: viewedAt,
          customerId: 'c1',
        },
        now,
      ),
    ).toBe(false);

    expect(
      isProposalFollowUpCandidate(
        {
          status: 'approved',
          followUpAutomationEnabled: true,
          lastViewedAt: viewedAt,
          customerId: 'c1',
        },
        now,
      ),
    ).toBe(false);

    expect(
      isProposalFollowUpCandidate(
        {
          status: 'viewed',
          followUpAutomationEnabled: true,
          lastViewedAt: viewedAt,
          followUpLastSentAt: new Date(viewedAt.getTime() + 1000),
          customerId: 'c1',
        },
        now,
      ),
    ).toBe(false);
  });

  it('resolves honest invoice reminder status (record-first)', () => {
    expect(resolveInvoiceReminderStatus({ channel: 'email' })).toBe('recorded');
    expect(
      resolveInvoiceReminderStatus({
        channel: 'email',
        scheduledAt: new Date('2099-01-01'),
      }),
    ).toBe('scheduled');
    expect(
      resolveInvoiceReminderStatus({
        channel: 'email',
        providerAdapterActive: true,
        env: { REAL_EMAIL: '1', RESEND_API_KEY: 're_x' },
      }),
    ).toBe('sent');
    expect(
      resolveInvoiceReminderStatus({
        channel: 'email',
        providerAdapterActive: true,
        env: { RESEND_API_KEY: 're_x' },
      }),
    ).toBe('recorded');
  });

  it('formats job labels null-safely', () => {
    expect(formatBackgroundJobLabel('proposal_follow_up')).toBe('Proposal Follow Up');
    expect(formatBackgroundJobLabel(null)).toBe('Unknown');
  });
});
