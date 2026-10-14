import {
  DEMO_ENTRY_USER_EMAIL,
  DEMO_TENANT_SLUG,
} from '@clcrm/types';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { getAdminAuth, getAdminFirestore } from './admin';
import { getOrganization } from './firestore';
import { isDemoOrganization } from './demo-tenant';

const CUSTOM_TOKEN_TIMEOUT_MS = 8_000;

type CachedDemoOrg = {
  org: Awaited<ReturnType<typeof getOrganization>>;
  at: number;
};

const DEMO_ORG_CACHE_MS = 60_000;
const DEMO_STATUS_CACHE_MS = 30_000;
const DEMO_UID_CACHE_MS = 60_000;

let demoOrgCache: CachedDemoOrg | null = null;
let demoStatusCache: {
  value: { enabled: boolean; configured: boolean; organizationId: string | null };
  at: number;
} | null = null;
const demoUidCache = new Map<string, { uid: string | null; at: number }>();

export type DemoEntrySessionResult =
  | { method: 'customToken'; customToken: string; organizationId: string }
  | { method: 'password'; email: string; password: string; organizationId: string };

function loadDemoEntryPassword(): string | null {
  const fromEnv = process.env.YULETIDE_DEMO_ENTRY_PASSWORD?.trim();
  if (fromEnv) return fromEnv;

  const filename = 'yuletide-demo-credentials.json';
  const candidates = [
    process.env.YULETIDE_DEMO_CREDENTIALS_PATH?.trim(),
    join(process.cwd(), 'secrets', filename),
    join(process.cwd(), '..', '..', 'secrets', filename),
    join(process.cwd(), '..', 'secrets', filename),
  ].filter((value): value is string => Boolean(value));

  for (const credsPath of candidates) {
    if (!existsSync(credsPath)) continue;
    try {
      const parsed = JSON.parse(readFileSync(credsPath, 'utf8')) as {
        entry?: { password?: string };
      };
      const password = parsed.entry?.password?.trim();
      if (password) return password;
    } catch {
      /* try next path */
    }
  }

  return null;
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label}_TIMEOUT`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function isDemoEntryEnabled(): boolean {
  if (process.env.ALLOW_DEMO_ENTRY === '0') return false;
  if (process.env.ALLOW_DEMO_ENTRY === '1') return true;
  return process.env.NODE_ENV !== 'production';
}

export async function resolveDemoOrganization(): Promise<Awaited<ReturnType<typeof getOrganization>>> {
  if (demoOrgCache && Date.now() - demoOrgCache.at < DEMO_ORG_CACHE_MS) {
    return demoOrgCache.org;
  }

  const overrideId = process.env.YULETIDE_DEMO_ORG_ID?.trim();
  if (overrideId) {
    const org = await getOrganization(overrideId);
    const resolved = isDemoOrganization(org) ? org : null;
    demoOrgCache = { org: resolved, at: Date.now() };
    return resolved;
  }

  const db = getAdminFirestore();
  const snap = await db
    .collection('organizations')
    .where('slug', '==', DEMO_TENANT_SLUG)
    .limit(1)
    .get();

  if (snap.empty) {
    demoOrgCache = { org: null, at: Date.now() };
    return null;
  }
  const org = await getOrganization(snap.docs[0]!.id);
  const resolved = isDemoOrganization(org) ? org : null;
  demoOrgCache = { org: resolved, at: Date.now() };
  return resolved;
}

export async function resolveDemoEntryFirebaseUid(orgId: string): Promise<string | null> {
  const cached = demoUidCache.get(orgId);
  if (cached && Date.now() - cached.at < DEMO_UID_CACHE_MS) {
    return cached.uid;
  }

  const preferredEmail = (
    process.env.YULETIDE_DEMO_ENTRY_EMAIL?.trim() || DEMO_ENTRY_USER_EMAIL
  ).toLowerCase();

  const db = getAdminFirestore();
  const [preferred, owners, anyUser] = await Promise.all([
    db
      .collection('users')
      .where('organizationId', '==', orgId)
      .where('email', '==', preferredEmail)
      .limit(1)
      .get(),
    db.collection('users').where('organizationId', '==', orgId).where('role', '==', 'owner').limit(1).get(),
    db.collection('users').where('organizationId', '==', orgId).limit(1).get(),
  ]);

  let uid: string | null = null;
  if (!preferred.empty) {
    uid = (preferred.docs[0]!.data().firebaseUid as string | undefined) ?? null;
  } else if (!owners.empty) {
    uid = (owners.docs[0]!.data().firebaseUid as string | undefined) ?? null;
  } else if (!anyUser.empty) {
    uid = (anyUser.docs[0]!.data().firebaseUid as string | undefined) ?? null;
  }

  demoUidCache.set(orgId, { uid, at: Date.now() });
  return uid;
}

export async function getDemoEntryStatus(): Promise<{
  enabled: boolean;
  configured: boolean;
  organizationId: string | null;
}> {
  const enabled = isDemoEntryEnabled();
  if (!enabled) {
    return { enabled: false, configured: false, organizationId: null };
  }

  if (demoStatusCache && Date.now() - demoStatusCache.at < DEMO_STATUS_CACHE_MS) {
    return demoStatusCache.value;
  }

  const org = await resolveDemoOrganization();
  if (!org) {
    const value = { enabled: true, configured: false, organizationId: null };
    demoStatusCache = { value, at: Date.now() };
    return value;
  }

  const uid = await resolveDemoEntryFirebaseUid(org.id);
  const value = {
    enabled: true,
    configured: Boolean(uid),
    organizationId: org.id,
  };
  demoStatusCache = { value, at: Date.now() };
  return value;
}

export async function createDemoEntrySession(): Promise<DemoEntrySessionResult> {
  if (!isDemoEntryEnabled()) {
    throw new Error('DEMO_ENTRY_DISABLED');
  }

  const org = await resolveDemoOrganization();
  if (!org) {
    throw new Error('DEMO_NOT_CONFIGURED');
  }

  const firebaseUid = await resolveDemoEntryFirebaseUid(org.id);
  if (!firebaseUid) {
    throw new Error('DEMO_USER_NOT_CONFIGURED');
  }

  const email = (
    process.env.YULETIDE_DEMO_ENTRY_EMAIL?.trim() || DEMO_ENTRY_USER_EMAIL
  ).toLowerCase();

  if (process.env.FIREBASE_USE_ADC === '1') {
    const password = loadDemoEntryPassword();
    if (password) {
      return { method: 'password', email, password, organizationId: org.id };
    }
  }

  const auth = getAdminAuth();

  try {
    const customToken = await withTimeout(
      auth.createCustomToken(firebaseUid, { demoEntry: true }),
      CUSTOM_TOKEN_TIMEOUT_MS,
      'DEMO_CUSTOM_TOKEN',
    );
    return { method: 'customToken', customToken, organizationId: org.id };
  } catch {
    const password = loadDemoEntryPassword();
    if (!password) {
      throw new Error('DEMO_ENTRY_AUTH_UNAVAILABLE');
    }
    return { method: 'password', email, password, organizationId: org.id };
  }
}
