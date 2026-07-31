import { beforeAll, describe, expect, it } from 'vitest';
import {
  ensureFirestoreEmulator,
  seedTenant,
  setUserStatus,
  resolveTestSession,
  buildAuthContext,
  createTestCaller,
  createUnauthenticatedCaller,
  expectTrpcCode,
  permissionsForRole,
} from '../setup';

describe('integration: auth session', () => {
  beforeAll(() => {
    ensureFirestoreEmulator();
  });

  it('denies unauthenticated resolveTestSession', async () => {
    const result = await resolveTestSession(null);
    expect(result).toEqual({ status: 'denied', reason: 'unauthenticated' });
  });

  it('denies unknown firebase uid', async () => {
    const result = await resolveTestSession('missing-uid-xyz');
    expect(result).toEqual({ status: 'denied', reason: 'no_account' });
  });

  it('resolves active owner session with SYSTEM_ROLES permissions', async () => {
    const { org, user } = await seedTenant();
    const result = await resolveTestSession(user.firebaseUid);
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.ctx.organizationId).toBe(org.id);
    expect(result.ctx.userId).toBe(user.id);
    expect(result.ctx.settingsRole).toBe('owner');
    expect(result.ctx.role).toBe('owner');
    expect(result.ctx.permissions).toEqual(permissionsForRole('owner'));
    expect(result.ctx.subscriptionLocked).toBe(false);
  });

  it('denies suspended users', async () => {
    const { user } = await seedTenant();
    await setUserStatus(user.id, 'suspended');
    const result = await resolveTestSession(user.firebaseUid);
    expect(result).toEqual({ status: 'denied', reason: 'inactive' });
  });

  it('denies archived users', async () => {
    const { user } = await seedTenant();
    await setUserStatus(user.id, 'archived');
    const result = await resolveTestSession(user.firebaseUid);
    expect(result).toEqual({ status: 'denied', reason: 'inactive' });
  });

  it('denies pending users', async () => {
    const { user } = await seedTenant({ user: { status: 'pending' } });
    const result = await resolveTestSession(user.firebaseUid);
    expect(result).toEqual({ status: 'denied', reason: 'pending' });
  });

  it('unauthenticated caller cannot list customers', async () => {
    const caller = createUnauthenticatedCaller();
    await expectTrpcCode(caller.customers.list({ page: 1, pageSize: 10 }), 'UNAUTHORIZED');
  });

  it('active session caller can list customers', async () => {
    const { org, user } = await seedTenant();
    const session = await resolveTestSession(user.firebaseUid);
    expect(session.status).toBe('ok');
    if (session.status !== 'ok') return;
    const caller = createTestCaller(session.ctx);
    const list = await caller.customers.list({ page: 1, pageSize: 10 });
    expect(Array.isArray(list.items)).toBe(true);
    expect(list.total).toBeGreaterThanOrEqual(0);
    expect(org.id).toBe(session.ctx.organizationId);
  });

  it('subscriptionLocked context is rejected by protectedProcedure', async () => {
    const { org, user } = await seedTenant();
    const auth = buildAuthContext({
      organizationId: org.id,
      firebaseUid: user.firebaseUid,
      userId: user.id,
      settingsRole: 'owner',
      subscriptionLocked: true,
    });
    const caller = createTestCaller(auth);
    await expectTrpcCode(caller.customers.list({ page: 1, pageSize: 5 }), 'FORBIDDEN');
  });

  it('maps installer settingsRole to crew legacy role', async () => {
    const { org, user } = await seedTenant({
      user: { settingsRole: 'installer', role: 'crew' },
    });
    const session = await resolveTestSession(user.firebaseUid);
    expect(session.status).toBe('ok');
    if (session.status !== 'ok') return;
    expect(session.ctx.role).toBe('crew');
    expect(session.ctx.settingsRole).toBe('installer');
    expect(session.ctx.organizationId).toBe(org.id);
  });
});
