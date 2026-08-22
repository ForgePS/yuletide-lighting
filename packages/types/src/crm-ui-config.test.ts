import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CRM_UI_CONFIG,
  applyCrmLabelOverride,
  formatCrmNavLabel,
  groupNavItemsBySection,
  resolveCrmNavItems,
} from './crm-ui-config';
import { SYSTEM_ROLES } from './settings';

describe('YL-S18 resolveCrmNavItems', () => {
  it('fail-closes when enabledModules is missing', () => {
    const items = resolveCrmNavItems(DEFAULT_CRM_UI_CONFIG, null);
    expect(items.every((i) => !i.moduleKey)).toBe(true);
    expect(items.some((i) => i.key === 'dashboard')).toBe(true);
    expect(items.some((i) => i.key === 'inventory')).toBe(false);
  });

  it('shows module-gated items only when module enabled', () => {
    const items = resolveCrmNavItems(DEFAULT_CRM_UI_CONFIG, ['inventory', 'customers']);
    expect(items.some((i) => i.key === 'inventory')).toBe(true);
    expect(items.some((i) => i.key === 'customers')).toBe(true);
    expect(items.some((i) => i.key === 'schedule')).toBe(false);
  });

  it('gates agreements on proposals module', () => {
    const without = resolveCrmNavItems(DEFAULT_CRM_UI_CONFIG, ['customers']);
    expect(without.some((i) => i.key === 'agreements')).toBe(false);
    const withProposals = resolveCrmNavItems(DEFAULT_CRM_UI_CONFIG, ['proposals']);
    expect(withProposals.some((i) => i.key === 'agreements')).toBe(true);
  });

  it('filters by permission matrix when provided', () => {
    const sales = SYSTEM_ROLES.find((r) => r.slug === 'sales_rep')!.permissions;
    const items = resolveCrmNavItems(
      DEFAULT_CRM_UI_CONFIG,
      ['customers', 'proposals', 'inventory', 'jobs'],
      sales,
    );
    expect(items.some((i) => i.key === 'customers')).toBe(true);
    expect(items.some((i) => i.key === 'proposals')).toBe(true);
    expect(items.some((i) => i.key === 'inventory')).toBe(false);
    expect(items.some((i) => i.key === 'settings')).toBe(false);
  });

  it('applies nav.* label overrides and null-safe labels', () => {
    expect(formatCrmNavLabel(null)).toBe('Untitled');
    expect(applyCrmLabelOverride({ 'nav.customers': 'Clients' }, 'nav.customers', 'Customers')).toBe(
      'Clients',
    );
    const config = {
      ...DEFAULT_CRM_UI_CONFIG,
      labelOverrides: { 'nav.customers': 'Clients' },
    };
    const items = resolveCrmNavItems(config, ['customers']);
    expect(items.find((i) => i.key === 'customers')?.label).toBe('Clients');
  });

  it('groups sections without crashing on empty labels', () => {
    const items = resolveCrmNavItems(DEFAULT_CRM_UI_CONFIG, ['customers', 'proposals']);
    const groups = groupNavItemsBySection(items);
    expect(groups.length).toBeGreaterThan(0);
    expect(groups.every((g) => g.label.length > 0)).toBe(true);
  });
});
