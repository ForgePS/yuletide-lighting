import { describe, expect, it } from 'vitest';
import {
  aiAnalyticsQuery,
  SEASONAL_PHASES,
  DEFAULT_SCHEDULED_REPORTS,
  formatReportLabel,
  invoicePaidDate,
  inReportYear,
  isSelectedYearCurrent,
  isSeasonMonth,
  buildSalesFunnelStages,
} from '@clcrm/types';

const context = {
  customers: [
    { id: '1', name: 'Acme HOA', revenueCents: 500000 },
    { id: '2', name: 'Smith Residence', revenueCents: 120000 },
  ],
  crews: [
    { name: 'Alpha Crew', productivityScore: 85, revenueCents: 300000 },
    { name: 'Beta Crew', productivityScore: 55, revenueCents: 100000 },
  ],
  invoices: [
    { balanceCents: 150000, daysOverdue: 45 },
    { balanceCents: 50000, daysOverdue: 0 },
  ],
  services: [
    { name: 'Permanent Lighting', marginPercent: 62 },
    { name: 'Roofline Lighting', marginPercent: 58 },
  ],
};

describe('reports360 analytics helpers', () => {
  it('identifies top profitable customers', () => {
    const result = aiAnalyticsQuery('Show my highest profit customers', context);
    expect(result.answer).toContain('Acme HOA');
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it('finds underperforming crews', () => {
    const result = aiAnalyticsQuery('Which crews are underperforming?', context);
    expect(result.answer).toContain('Beta Crew');
    expect(result.riskAlerts.length).toBeGreaterThan(0);
  });

  it('forecasts revenue', () => {
    const result = aiAnalyticsQuery('Forecast next season revenue', context);
    expect(result.answer).toContain('forecast');
    expect(result.data.forecastCents).toBeDefined();
  });

  it('has seasonal phases defined', () => {
    expect(SEASONAL_PHASES).toHaveLength(6);
    expect(SEASONAL_PHASES[0]?.month).toBe('August');
  });

  it('has default scheduled reports', () => {
    expect(DEFAULT_SCHEDULED_REPORTS.length).toBeGreaterThan(0);
    expect(DEFAULT_SCHEDULED_REPORTS[0]?.frequency).toBe('daily');
  });
});

describe('YL-S19 report date/label helpers', () => {
  it('formatReportLabel title-cases snake_case and null-safes', () => {
    expect(formatReportLabel('sales_manager')).toBe('Sales Manager');
    expect(formatReportLabel(null)).toBe('Unknown');
    expect(formatReportLabel('  ')).toBe('Unknown');
  });

  it('invoicePaidDate prefers paidAt then updatedAt then createdAt', () => {
    const paidAt = new Date('2025-11-01');
    const updatedAt = new Date('2025-10-01');
    const createdAt = new Date('2025-09-01');
    expect(invoicePaidDate({ paidAt, updatedAt, createdAt })).toEqual(paidAt);
    expect(invoicePaidDate({ updatedAt, createdAt })).toEqual(updatedAt);
    expect(invoicePaidDate({ createdAt })).toEqual(createdAt);
    expect(invoicePaidDate({})).toBeNull();
  });

  it('inReportYear and isSelectedYearCurrent gate year filters', () => {
    expect(inReportYear(new Date('2026-03-01'), 2026)).toBe(true);
    expect(inReportYear(new Date('2025-03-01'), 2026)).toBe(false);
    expect(inReportYear(null, 2026)).toBe(false);
    expect(inReportYear(new Date('2025-03-01'), null)).toBe(true);
    expect(isSelectedYearCurrent(undefined, new Date('2026-08-13'))).toBe(true);
    expect(isSelectedYearCurrent(2026, new Date('2026-08-13'))).toBe(true);
    expect(isSelectedYearCurrent(2025, new Date('2026-08-13'))).toBe(false);
  });

  it('isSeasonMonth covers Aug–Dec and optional January takedown', () => {
    expect(isSeasonMonth(7)).toBe(true); // Aug
    expect(isSeasonMonth(11)).toBe(true); // Dec
    expect(isSeasonMonth(0)).toBe(false);
    expect(isSeasonMonth(0, true)).toBe(true);
    expect(isSeasonMonth(5)).toBe(false);
  });

  it('buildSalesFunnelStages uses real counts without invented leads', () => {
    const stages = buildSalesFunnelStages({
      leadCount: 12,
      proposalCount: 8,
      sentCount: 5,
      approvedCount: 3,
      completedCount: 2,
      leadValueCents: 100,
      completedValueCents: 50,
    });
    expect(stages.map((s) => s.stage)).toEqual([
      'Lead',
      'Consultation',
      'Proposal',
      'Approval',
      'Scheduled',
      'Completed',
    ]);
    expect(stages[0]).toEqual({ stage: 'Lead', count: 12, valueCents: 100 });
    expect(stages[5]).toEqual({ stage: 'Completed', count: 2, valueCents: 50 });
    expect(stages[3]?.count).toBe(3);
    expect(stages[4]?.count).toBe(3); // Scheduled mirrors approved
  });
});
