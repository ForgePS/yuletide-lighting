import { describe, expect, it } from 'vitest';
import { aiAnalyticsQuery, SEASONAL_PHASES, DEFAULT_SCHEDULED_REPORTS } from '@clcrm/types';

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
