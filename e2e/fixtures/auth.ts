import fs from 'node:fs';
import path from 'node:path';
import { test as base, expect, type BrowserContext, type Page } from '@playwright/test';

const repoRoot = path.join(__dirname, '..');
const authDir = path.join(repoRoot, 'e2e', '.auth');
const credsPath = path.join(repoRoot, 'secrets', 'staging-verification-credentials.json');

export type StagingRole =
  | 'creator'
  | 'owner'
  | 'administrator'
  | 'sales'
  | 'operations'
  | 'sign_manager'
  | 'sign_viewer'
  | 'no_export'
  | 'read_only'
  | 'suspended'
  | 'no_sign_module';

type CredEntry = {
  email: string;
  password: string;
  uid: string;
  settingsRole: string;
  status: string;
  authProvisioned?: boolean;
};

type CredFile = Partial<Record<StagingRole, CredEntry>>;

function loadCredentials(): CredFile | null {
  if (!fs.existsSync(credsPath)) return null;
  return JSON.parse(fs.readFileSync(credsPath, 'utf8')) as CredFile;
}

export function storageStatePath(role: StagingRole) {
  return path.join(authDir, `${role}.json`);
}

/**
 * Authenticate through the real sign-in UI + server session cookie.
 * Does not inject unauthorized application state.
 */
export async function authenticateViaUi(page: Page, role: StagingRole) {
  const creds = loadCredentials()?.[role];
  test.skip(!creds, `Missing secrets credential for ${role}`);
  test.skip(!creds!.authProvisioned, `Firebase Auth not provisioned for ${role} on staging`);

  await page.goto('/sign-in');
  await page.getByLabel(/email/i).fill(creds!.email);
  await page.getByLabel(/password/i).fill(creds!.password);
  await page.getByRole('button', { name: /sign in/i }).click();

  // Server session must land — middleware requires __session.
  await expect
    .poll(async () => {
      const cookies = await page.context().cookies();
      return cookies.some((c) => c.name === '__session' && c.value.length > 20);
    })
    .toBeTruthy();

  await page.waitForURL(/\/(app|creator)/, { timeout: 45_000 });
}

export async function saveStorageState(context: BrowserContext, role: StagingRole) {
  fs.mkdirSync(authDir, { recursive: true });
  await context.storageState({ path: storageStatePath(role) });
}

export async function ensureStorageState(page: Page, role: StagingRole) {
  const statePath = storageStatePath(role);
  if (fs.existsSync(statePath)) {
    // Validate existing state still has session cookie shape.
    const raw = JSON.parse(fs.readFileSync(statePath, 'utf8')) as {
      cookies?: Array<{ name: string; value: string }>;
    };
    const session = raw.cookies?.find((c) => c.name === '__session');
    if (session?.value) return statePath;
  }
  await authenticateViaUi(page, role);
  await saveStorageState(page.context(), role);
  return statePath;
}

type AuthFixtures = {
  role: StagingRole;
  authenticatedPage: Page;
};

export const test = base.extend<AuthFixtures>({
  role: ['owner', { option: true }],
  authenticatedPage: async ({ page, role }, use) => {
    await authenticateViaUi(page, role);
    await use(page);
  },
});

export { expect };
