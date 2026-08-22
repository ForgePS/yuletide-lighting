import { describe, expect, it } from 'vitest';
import {
  defaultRebookingSeasonYear,
  formatRebookingLabel,
  isPriorSeasonJobEligibleForRebooking,
  isRebookingPopulateCustomerEligible,
  isRebookingRecordTerminal,
  shouldSendRebookingOutreach,
} from './rebooking';

describe('YL-S25 rebooking helpers', () => {
  it('formats null-safe labels', () => {
    expect(formatRebookingLabel(null)).toBe('Unknown');
    expect(formatRebookingLabel('')).toBe('Unknown');
    expect(formatRebookingLabel('not_sent')).toBe('Not Sent');
    expect(formatRebookingLabel('upgrade_requested')).toBe('Upgrade Requested');
  });

  it('defaults season year after June to next year', () => {
    expect(defaultRebookingSeasonYear(new Date(2026, 5, 15))).toBe(2026);
    expect(defaultRebookingSeasonYear(new Date(2026, 6, 1))).toBe(2027);
  });

  it('gates prior-season job eligibility', () => {
    expect(
      isPriorSeasonJobEligibleForRebooking(
        { stage: 'installed', customerId: 'c1', installedAt: new Date(2025, 11, 1) },
        2025,
      ),
    ).toBe(true);
    expect(
      isPriorSeasonJobEligibleForRebooking(
        { stage: 'scheduled', customerId: 'c1', installedAt: new Date(2025, 11, 1) },
        2025,
      ),
    ).toBe(false);
    expect(
      isPriorSeasonJobEligibleForRebooking(
        { stage: 'installed', customerId: 'c1', installedAt: new Date(2024, 11, 1) },
        2025,
      ),
    ).toBe(false);
    expect(
      isPriorSeasonJobEligibleForRebooking(
        { stage: 'installed', customerId: null, installedAt: new Date(2025, 11, 1) },
        2025,
      ),
    ).toBe(false);
  });

  it('aligns populate customer eligibility with lifecycle stages', () => {
    expect(isRebookingPopulateCustomerEligible('stored')).toBe(true);
    expect(isRebookingPopulateCustomerEligible('removed')).toBe(true);
    expect(isRebookingPopulateCustomerEligible('rebook_next_season')).toBe(true);
    expect(isRebookingPopulateCustomerEligible('new_lead')).toBe(false);
    expect(isRebookingPopulateCustomerEligible(null)).toBe(false);
  });

  it('gates outreach send vs terminal / already-sent', () => {
    expect(shouldSendRebookingOutreach('not_sent')).toBe(true);
    expect(shouldSendRebookingOutreach('no_response')).toBe(true);
    expect(shouldSendRebookingOutreach('sent')).toBe(false);
    expect(shouldSendRebookingOutreach('opened')).toBe(false);
    expect(shouldSendRebookingOutreach('rebooked')).toBe(false);
    expect(shouldSendRebookingOutreach('declined')).toBe(false);
    expect(shouldSendRebookingOutreach(null)).toBe(false);
    expect(isRebookingRecordTerminal('rebooked')).toBe(true);
    expect(isRebookingRecordTerminal('not_sent')).toBe(false);
  });
});
