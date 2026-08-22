import { beforeAll, describe, expect, it } from 'vitest';
import {
  ensureFirestoreEmulator,
  seedTenant,
  setOrgLifecycleStatus,
  setUserStatus,
  resolveTestSession,
  createCallerForAuth,
  expectTrpcCode,
  sampleCustomerInput,
} from '../setup';

describe('integration: YL-S1 organization domain', () => {
  beforeAll(() => {
    ensureFirestoreEmulator();
  });

  it('membership binds user session to their organizationId', async () => {
    const { org, user } = await seedTenant({ org: { companyName: 'Membership Co' } });
    const session = await resolveTestSession(user.firebaseUid);
    expect(session.status).toBe('ok');
    if (session.status !== 'ok') return;
    expect(session.ctx.organizationId).toBe(org.id);
    expect(session.ctx.userId).toBe(user.id);
  });

  it('denies inactive organization lifecycle', async () => {
    const { org, user } = await seedTenant();
    await setOrgLifecycleStatus(org.id, 'inactive');
    const result = await resolveTestSession(user.firebaseUid);
    expect(result).toEqual({ status: 'denied', reason: 'org_inactive' });
  });

  it('denies suspended organization lifecycle', async () => {
    const { org, user } = await seedTenant();
    await setOrgLifecycleStatus(org.id, 'suspended');
    expect(await resolveTestSession(user.firebaseUid)).toEqual({
      status: 'denied',
      reason: 'org_inactive',
    });
  });

  it('denies archived organization lifecycle', async () => {
    const { org, user } = await seedTenant();
    await setOrgLifecycleStatus(org.id, 'archived');
    expect(await resolveTestSession(user.firebaseUid)).toEqual({
      status: 'denied',
      reason: 'org_inactive',
    });
  });

  it('inactive membership (user suspended) still denied', async () => {
    const { user } = await seedTenant();
    await setUserStatus(user.id, 'suspended');
    expect(await resolveTestSession(user.firebaseUid)).toEqual({
      status: 'denied',
      reason: 'inactive',
    });
  });

  it('cross-org customer list does not leak foreign records', async () => {
    const a = await seedTenant({ org: { companyName: 'Org A S1' } });
    const b = await seedTenant({ org: { companyName: 'Org B S1' } });
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

    const created = await callerA.customers.create(
      sampleCustomerInput({ firstName: 'OnlyA' }),
    );
    const listB = await callerB.customers.list({ page: 1, pageSize: 50 });
    expect(listB.items.some((c: { id: string }) => c.id === created.id)).toBe(false);
  });

  it('cross-org getById returns null', async () => {
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
    expect(await callerB.customers.getById({ id: created.id })).toBeNull();
  });
});
