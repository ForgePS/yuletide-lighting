import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { ref, uploadBytes, getBytes } from 'firebase/storage';
import { ORG_A, ORG_B, bytesOfSize, createRulesTestEnv, seedUsers, tinyJpegBytes } from './helpers';

const FIFTEEN_MB = 15 * 1024 * 1024;

describe('storage.rules', () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await createRulesTestEnv();
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
    await testEnv.clearStorage();
    await seedUsers(testEnv, [
      { uid: 'userA', organizationId: ORG_A, role: 'office', status: 'active' },
      { uid: 'userB', organizationId: ORG_B, role: 'office', status: 'active' },
    ]);

    // Seed a file in org B for cross-tenant read denial
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const storage = context.storage();
      await uploadBytes(ref(storage, `organizations/${ORG_B}/docs/secret.pdf`), tinyJpegBytes(), {
        contentType: 'application/pdf',
      });
      await uploadBytes(ref(storage, `organizations/${ORG_A}/docs/existing.jpg`), tinyJpegBytes(), {
        contentType: 'image/jpeg',
      });
    });
  });

  it('unauthenticated upload/read denied for org paths', async () => {
    const storage = testEnv.unauthenticatedContext().storage();
    await assertFails(
      uploadBytes(ref(storage, `organizations/${ORG_A}/docs/unauth.jpg`), tinyJpegBytes(), {
        contentType: 'image/jpeg',
      }),
    );
    await assertFails(getBytes(ref(storage, `organizations/${ORG_A}/docs/existing.jpg`)));
  });

  it('tenant A cannot read/write tenant B org folder', async () => {
    const storage = testEnv.authenticatedContext('userA').storage();
    await assertFails(getBytes(ref(storage, `organizations/${ORG_B}/docs/secret.pdf`)));
    await assertFails(
      uploadBytes(ref(storage, `organizations/${ORG_B}/docs/intrusion.jpg`), tinyJpegBytes(), {
        contentType: 'image/jpeg',
      }),
    );
  });

  it('rejects content-types that are not image/* or application/pdf', async () => {
    const storage = testEnv.authenticatedContext('userA').storage();
    await assertFails(
      uploadBytes(ref(storage, `organizations/${ORG_A}/docs/bad.txt`), tinyJpegBytes(), {
        contentType: 'text/plain',
      }),
    );
    await assertFails(
      uploadBytes(ref(storage, `organizations/${ORG_A}/docs/bad.bin`), tinyJpegBytes(), {
        contentType: 'application/octet-stream',
      }),
    );
  });

  it('rejects size >= 15MB', async () => {
    const storage = testEnv.authenticatedContext('userA').storage();
    await assertFails(
      uploadBytes(
        ref(storage, `organizations/${ORG_A}/docs/too-big.jpg`),
        bytesOfSize(FIFTEEN_MB),
        { contentType: 'image/jpeg' },
      ),
    );
  });

  it('allows image/jpeg under org path for same-tenant user', async () => {
    const storage = testEnv.authenticatedContext('userA').storage();
    await assertSucceeds(
      uploadBytes(ref(storage, `organizations/${ORG_A}/docs/ok.jpg`), tinyJpegBytes(), {
        contentType: 'image/jpeg',
      }),
    );
    await assertSucceeds(getBytes(ref(storage, `organizations/${ORG_A}/docs/existing.jpg`)));
  });

  it('denies portal customer auth without staff users doc (P2-S5)', async () => {
    // Authenticated Firebase user with no staff users/{uid} document — portal customers.
    const storage = testEnv.authenticatedContext('portalCustomerA1').storage();
    await assertFails(getBytes(ref(storage, `organizations/${ORG_A}/docs/existing.jpg`)));
    await assertFails(
      uploadBytes(ref(storage, `organizations/${ORG_A}/portal-service/c1/x.jpg`), tinyJpegBytes(), {
        contentType: 'image/jpeg',
      }),
    );
  });

  it('denies non-staff role even with matching organizationId (P2-S5)', async () => {
    await seedUsers(testEnv, [
      { uid: 'customerUserA', organizationId: ORG_A, role: 'customer', status: 'active' },
    ]);
    const storage = testEnv.authenticatedContext('portalUserA').storage();
    await assertFails(getBytes(ref(storage, `organizations/${ORG_A}/docs/existing.jpg`)));
  });

  it('denies suspended staff status (P2-S5)', async () => {
    await seedUsers(testEnv, [
      { uid: 'suspendedStaff', organizationId: ORG_A, role: 'office', status: 'suspended' },
    ]);
    const storage = testEnv.authenticatedContext('suspendedStaff').storage();
    await assertFails(getBytes(ref(storage, `organizations/${ORG_A}/docs/existing.jpg`)));
  });
});
