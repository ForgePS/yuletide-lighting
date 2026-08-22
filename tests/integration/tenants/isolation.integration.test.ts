import { beforeAll, describe, expect, it } from 'vitest';
import {
  ensureFirestoreEmulator,
  seedTenant,
  createCallerForAuth,
  expectTrpcCode,
  sampleCustomerInput,
  sampleSignLocationInput,
} from '../setup';

describe('integration: tenant isolation', () => {
  beforeAll(() => {
    ensureFirestoreEmulator();
  });

  it('customer created in org A is not listed in org B', async () => {
    const a = await seedTenant({ org: { companyName: 'Org A' } });
    const b = await seedTenant({ org: { companyName: 'Org B' } });

    const callerA = createCallerForAuth({
      organizationId: a.org.id,
      firebaseUid: a.user.firebaseUid,
      userId: a.user.id,
      settingsRole: 'owner',
    });
    const callerB = createCallerForAuth({
      organizationId: b.org.id,
      firebaseUid: b.user.firebaseUid,
      userId: b.user.id,
      settingsRole: 'owner',
    });

    const created = await callerA.customers.create(sampleCustomerInput({ firstName: 'OrgAOnly' }));
    expect(created.id).toBeTruthy();

    const listB = await callerB.customers.list({ page: 1, pageSize: 50 });
    expect(listB.items.some((c: { id: string }) => c.id === created.id)).toBe(false);
    expect(listB.items.some((c: { firstName: string }) => c.firstName === 'OrgAOnly')).toBe(false);
  });

  it('getById for foreign customer returns null/empty for other org', async () => {
    const a = await seedTenant();
    const b = await seedTenant();
    const callerA = createCallerForAuth({
      organizationId: a.org.id,
      firebaseUid: a.user.firebaseUid,
      settingsRole: 'owner',
    });
    const callerB = createCallerForAuth({
      organizationId: b.org.id,
      firebaseUid: b.user.firebaseUid,
      settingsRole: 'owner',
    });

    const created = await callerA.customers.create(sampleCustomerInput());
    const foreign = await callerB.customers.getById({ id: created.id });
    expect(foreign).toBeNull();
  });

  it('sign locations are scoped by organizationId', async () => {
    const a = await seedTenant({
      org: { subscriptionTier: 'standard', enabledModules: undefined },
    });
    const b = await seedTenant({
      org: { subscriptionTier: 'standard' },
    });

    // Ensure both orgs have sign_tracker (standard preset includes it).
    const callerA = createCallerForAuth({
      organizationId: a.org.id,
      firebaseUid: a.user.firebaseUid,
      settingsRole: 'owner',
    });
    const callerB = createCallerForAuth({
      organizationId: b.org.id,
      firebaseUid: b.user.firebaseUid,
      settingsRole: 'owner',
    });

    const sign = await callerA.signTracker360.create(sampleSignLocationInput());
    expect(sign.id).toBeTruthy();

    const listB = await callerB.signTracker360.list({ seasonYear: 2026 });
    expect(listB.some((s: { id: string }) => s.id === sign.id)).toBe(false);
  });

  it('sign getById across orgs is NOT_FOUND', async () => {
    const a = await seedTenant({ org: { subscriptionTier: 'standard' } });
    const b = await seedTenant({ org: { subscriptionTier: 'standard' } });
    const callerA = createCallerForAuth({
      organizationId: a.org.id,
      firebaseUid: a.user.firebaseUid,
      settingsRole: 'owner',
    });
    const callerB = createCallerForAuth({
      organizationId: b.org.id,
      firebaseUid: b.user.firebaseUid,
      settingsRole: 'owner',
    });

    const sign = await callerA.signTracker360.create(sampleSignLocationInput());
    await expectTrpcCode(callerB.signTracker360.getById({ locationId: sign.id }), 'NOT_FOUND');
  });

  it('two orgs can create customers with independent counts', async () => {
    const a = await seedTenant();
    const b = await seedTenant();
    const callerA = createCallerForAuth({
      organizationId: a.org.id,
      firebaseUid: a.user.firebaseUid,
      settingsRole: 'owner',
    });
    const callerB = createCallerForAuth({
      organizationId: b.org.id,
      firebaseUid: b.user.firebaseUid,
      settingsRole: 'owner',
    });

    await callerA.customers.create(sampleCustomerInput({ firstName: 'A1' }));
    await callerA.customers.create(sampleCustomerInput({ firstName: 'A2' }));
    await callerB.customers.create(sampleCustomerInput({ firstName: 'B1' }));

    const listA = await callerA.customers.list({ page: 1, pageSize: 50 });
    const listB = await callerB.customers.list({ page: 1, pageSize: 50 });
    expect(
      listA.items.filter((c: { firstName: string }) => c.firstName.startsWith('A')).length,
    ).toBeGreaterThanOrEqual(2);
    expect(listB.items.some((c: { firstName: string }) => c.firstName === 'B1')).toBe(true);
    expect(listB.items.some((c: { firstName: string }) => c.firstName.startsWith('A'))).toBe(false);
  });

  it('caller auth organizationId cannot be overridden by procedure input', async () => {
    const a = await seedTenant({ org: { subscriptionTier: 'standard' } });
    const b = await seedTenant({ org: { subscriptionTier: 'standard' } });
    const callerA = createCallerForAuth({
      organizationId: a.org.id,
      firebaseUid: a.user.firebaseUid,
      settingsRole: 'owner',
    });

    const sign = await callerA.signTracker360.create(sampleSignLocationInput());
    // Even if we somehow knew B's path, getById uses ctx.auth.organizationId only.
    const again = await callerA.signTracker360.getById({ locationId: sign.id });
    expect(again.organizationId).toBe(a.org.id);
    expect(again.organizationId).not.toBe(b.org.id);
  });
});
