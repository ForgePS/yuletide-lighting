import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CRM_NAV_ITEMS } from '@clcrm/types';

const repoRoot = resolve(__dirname, '../..');
const webSrc = resolve(repoRoot, 'apps/web/src');
const webApp = resolve(repoRoot, 'apps/web/src/app');

const FIELD_PAGES = [
  ['apps/web/src/app/app/field/page.tsx', '/app/marketing/sign-tracker'],
  ['apps/web/src/app/app/field/signs/page.tsx', '/app/marketing/sign-tracker'],
  ['apps/web/src/app/app/field/signs/add/page.tsx', '/app/marketing/sign-tracker/add'],
  ['apps/web/src/app/app/field/signs/pickup/page.tsx', '/app/marketing/sign-tracker/pickup'],
  ['apps/web/src/app/app/field/signs/report/page.tsx', '/app/marketing/sign-tracker/report'],
] as const;

const CANONICAL_SIGN_PAGES = [
  'apps/web/src/app/app/marketing/sign-tracker/page.tsx',
  'apps/web/src/app/app/marketing/sign-tracker/add/page.tsx',
  'apps/web/src/app/app/marketing/sign-tracker/pickup/page.tsx',
  'apps/web/src/app/app/marketing/sign-tracker/report/page.tsx',
] as const;

function walkFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry === '.next') continue;
      walkFiles(full, out);
    } else if (/\.(tsx?|jsx?|mjs|cjs)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

function pageExistsForHref(href: string): boolean {
  if (href.includes('[')) return true;
  const parts = (href.replace(/\/$/, '') || '/').split('/').filter(Boolean);
  return ['page.tsx', 'page.ts'].some((name) => existsSync(join(webApp, ...parts, name)));
}

describe('sign-tracker route validation', () => {
  it('every DEFAULT_CRM_NAV_ITEMS href resolves to a page', () => {
    const missing = DEFAULT_CRM_NAV_ITEMS.filter((item) => !pageExistsForHref(item.href)).map(
      (item) => `${item.key}:${item.href}`,
    );
    expect(missing).toEqual([]);
  });

  it('field pages redirect to marketing/sign-tracker', () => {
    for (const [rel, target] of FIELD_PAGES) {
      const content = readFileSync(resolve(repoRoot, rel), 'utf8');
      expect(content, rel).toMatch(/redirect\(/);
      expect(content, rel).toContain(target);
    }
  });

  it('no production page links to /app/field as a destination without redirect', () => {
    const offenders: string[] = [];
    for (const file of walkFiles(webSrc)) {
      const rel = relative(repoRoot, file).replace(/\\/g, '/');
      if (rel.startsWith('apps/web/src/app/app/field/')) continue;
      if (rel.includes('/docs/')) continue;

      const content = readFileSync(file, 'utf8');
      if (!content.includes('/app/field')) continue;

      const isRedirectOnly =
        /redirect\s*\(\s*['`]\/app\/marketing\/sign-tracker/.test(content) &&
        !/href\s*=\s*['"`]\/app\/field/.test(content) &&
        !/to\s*=\s*['"`]\/app\/field/.test(content) &&
        !/push\s*\(\s*['"`]\/app\/field/.test(content);

      const hasFieldDestination =
        /href\s*=\s*['"`]\/app\/field/.test(content) ||
        /to\s*=\s*['"`]\/app\/field/.test(content) ||
        /push\s*\(\s*['"`]\/app\/field/.test(content) ||
        /['"`]\/app\/field(?:\/[^'"`]*)?['"`]/.test(content);

      if (hasFieldDestination && !isRedirectOnly) {
        offenders.push(rel);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('DEFAULT_CRM_NAV_ITEMS sign_tracker has moduleKey sign_tracker', () => {
    const item = DEFAULT_CRM_NAV_ITEMS.find((i) => i.key === 'sign_tracker');
    expect(item).toBeDefined();
    expect(item!.moduleKey).toBe('sign_tracker');
    expect(item!.permissionResource).toBe('sign_tracker');
    expect(item!.href).toBe('/app/marketing/sign-tracker');
  });

  it('canonical sign-tracker pages exist and report is not a placeholder', () => {
    for (const rel of CANONICAL_SIGN_PAGES) {
      expect(existsSync(resolve(repoRoot, rel)), rel).toBe(true);
    }
    const reportPage = readFileSync(
      resolve(repoRoot, 'apps/web/src/app/app/marketing/sign-tracker/report/page.tsx'),
      'utf8',
    );
    expect(reportPage).toMatch(/SignCampaignReport/);
    expect(reportPage.toLowerCase()).not.toMatch(/coming soon/);
    expect(reportPage.toLowerCase()).not.toMatch(/visit another page/);

    const reportComponent = readFileSync(
      resolve(repoRoot, 'apps/web/src/components/sign-tracker/sign-campaign-report.tsx'),
      'utf8',
    );
    expect(reportComponent).toMatch(/signTracker360\.report/);
    expect(reportComponent).toMatch(/reportExport|canExport/);
    expect(reportComponent).toMatch(/LoadingState/);
    expect(reportComponent).toMatch(/ErrorState/);
    expect(reportComponent).toMatch(/EmptyState/);
    expect(reportComponent.toLowerCase()).not.toMatch(/coming soon/);
  });

  it('signTracker360 API gates module and export permission', () => {
    const api = readFileSync(resolve(repoRoot, 'packages/api/src/routers/signTracker360.ts'), 'utf8');
    expect(api).toMatch(/requireModule\('sign_tracker'\)/);
    expect(api).toMatch(/requirePermission\('sign_tracker',\s*'export'\)/);
    expect(api).toMatch(/requirePermission\('sign_tracker',\s*'view'\)/);
    expect(api).toMatch(/reportExport:\s*signExport/);
  });
});
