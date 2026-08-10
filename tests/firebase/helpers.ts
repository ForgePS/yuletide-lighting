import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, type Firestore } from 'firebase/firestore';

export const RULES_PROJECT_ID = 'yuletide-rules-test';
export const ORG_A = 'orgA';
export const ORG_B = 'orgB';

const root = resolve(__dirname, '../..');

export function loadFirestoreRules(): string {
  return readFileSync(resolve(root, 'firestore.rules'), 'utf8');
}

export function loadStorageRules(): string {
  return readFileSync(resolve(root, 'storage.rules'), 'utf8');
}

export async function createRulesTestEnv(): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    projectId: RULES_PROJECT_ID,
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: loadFirestoreRules(),
    },
    storage: {
      host: '127.0.0.1',
      port: 9199,
      rules: loadStorageRules(),
    },
  });
}

export type SeedUser = {
  uid: string;
  organizationId: string;
  role: string;
  status?: string;
};

export type OrganizationLifecycleStatus =
  | 'active'
  | 'inactive'
  | 'suspended'
  | 'archived';

export async function seedUsers(
  testEnv: RulesTestEnvironment,
  users: SeedUser[],
): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    for (const user of users) {
      const data: Record<string, unknown> = {
        organizationId: user.organizationId,
        role: user.role,
        firebaseUid: user.uid,
      };
      if (user.status !== undefined) {
        data.status = user.status;
      }
      await setDoc(doc(db, 'users', user.uid), data);
    }
  });
}

/** Seed organizations/{orgId} root doc (required for belongsToOrg lifecycle checks). */
export async function seedOrg(
  testEnv: RulesTestEnvironment,
  orgId: string,
  data: Record<string, unknown> = { name: orgId, lifecycleStatus: 'active' },
): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore() as Firestore;
    await setDoc(doc(db, 'organizations', orgId), data);
  });
}

/** Seed a document under organizations/{orgId}/... using slash path after org. */
export async function seedOrgPath(
  testEnv: RulesTestEnvironment,
  orgId: string,
  relativePath: string,
  data: Record<string, unknown> = { seeded: true },
): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore() as Firestore;
    await setDoc(doc(db, 'organizations', orgId, ...relativePath.split('/')), data);
  });
}

export async function seedRootDoc(
  testEnv: RulesTestEnvironment,
  path: string,
  data: Record<string, unknown> = { seeded: true },
): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore() as Firestore;
    await setDoc(doc(db, ...path.split('/')), data);
  });
}

/** Minimal JPEG-ish bytes for content-type tests (not a real image). */
export function tinyJpegBytes(): Uint8Array {
  return new Uint8Array([0xff, 0xd8, 0xff, 0xd9, 0x00, 0x01, 0x02, 0x03]);
}

export function bytesOfSize(size: number): Uint8Array {
  return new Uint8Array(size);
}
