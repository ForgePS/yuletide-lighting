import { beforeAll, describe, expect, it } from 'vitest';
import {
  ensureFirestoreEmulator,
  seedTenant,
  setOrgEnabledModules,
  createCallerForAuth,
  expectTrpcCode,
  sampleSignLocationInput,
} from '../setup';
import { MODULE_PRESETS } from '@clcrm/types';

describe('integration: module gates (requireModule)', () => {
  beforeAll(() => {
    ensureFirestoreEmulator();
  });

  it('sign_tracker allowed when module enabled', async () => {
    const { org, user } = await seedTenant({
      org: {
        subscriptionTier: 'standard',
        enabledModules: [...MODULE_PRESETS.standard],
      },
    });
    const caller = createCallerForAuth({
      organizationId: org.id,
      firebaseUid: user.firebaseUid,
      settingsRole: 'owner',
    });
    const list = await caller.signTracker360.list({ seasonYear: 2026 });
    expect(Array.isArray(list)).toBe(true);
  });

  it('sign_tracker FORBIDDEN when module disabled', async () => {
    const { org, user } = await seedTenant({
      org: {
        subscriptionTier: 'trial',
        enabledModules: [...MODULE_PRESETS.trial],
      },
    });
    expect(org.enabledModules).not.toContain('sign_tracker');
    const caller = createCallerForAuth({
      organizationId: org.id,
      firebaseUid: user.firebaseUid,
      settingsRole: 'owner',
    });
    await expectTrpcCode(caller.signTracker360.list({ seasonYear: 2026 }), 'FORBIDDEN');
  });

  it('sign_tracker FORBIDDEN when enabledModules empty', async () => {
    const { org, user } = await seedTenant({
      org: { enabledModules: [] },
    });
    await setOrgEnabledModules(org.id, []);
    const caller = createCallerForAuth({
      organizationId: org.id,
      firebaseUid: user.firebaseUid,
      settingsRole: 'owner',
    });
    await expectTrpcCode(caller.signTracker360.dashboard({}), 'FORBIDDEN');
  });

  it('sign_tracker FORBIDDEN when enabledModules missing (null)', async () => {
    const { org, user } = await seedTenant();
    await setOrgEnabledModules(org.id, null);
    const caller = createCallerForAuth({
      organizationId: org.id,
      firebaseUid: user.firebaseUid,
      settingsRole: 'owner',
    });
    await expectTrpcCode(caller.signTracker360.create(sampleSignLocationInput()), 'FORBIDDEN');
  });

  it('toggling module on then off updates gate', async () => {
    const { org, user } = await seedTenant({
      org: { enabledModules: [...MODULE_PRESETS.trial] },
    });
    const caller = createCallerForAuth({
      organizationId: org.id,
      firebaseUid: user.firebaseUid,
      settingsRole: 'owner',
    });

    await expectTrpcCode(caller.signTracker360.list({}), 'FORBIDDEN');

    await setOrgEnabledModules(org.id, [...MODULE_PRESETS.trial, 'sign_tracker']);
    const list = await caller.signTracker360.list({});
    expect(Array.isArray(list)).toBe(true);

    await setOrgEnabledModules(org.id, [...MODULE_PRESETS.trial]);
    await expectTrpcCode(caller.signTracker360.list({}), 'FORBIDDEN');
  });

  it('routes module gate on schedule360.routes.list', async () => {
    const { org, user } = await seedTenant({
      org: {
        subscriptionTier: 'starter',
        enabledModules: [...MODULE_PRESETS.starter],
      },
    });
    expect(org.enabledModules).not.toContain('routes');
    const caller = createCallerForAuth({
      organizationId: org.id,
      firebaseUid: user.firebaseUid,
      settingsRole: 'owner',
      role: 'owner',
    });
    await expectTrpcCode(caller.schedule360.routes.list({}), 'FORBIDDEN');
  });

  it('routes module allowed when enabled', async () => {
    const { org, user } = await seedTenant({
      org: {
        subscriptionTier: 'standard',
        enabledModules: [...MODULE_PRESETS.standard],
      },
    });
    expect(org.enabledModules).toContain('routes');
    const caller = createCallerForAuth({
      organizationId: org.id,
      firebaseUid: user.firebaseUid,
      settingsRole: 'owner',
      role: 'owner',
    });
    const routes = await caller.schedule360.routes.list({});
    expect(Array.isArray(routes)).toBe(true);
  });

  it('unknown module key in middleware fails closed for sign_tracker removal', async () => {
    const { org, user } = await seedTenant({
      org: { enabledModules: ['customers', 'jobs'] },
    });
    const caller = createCallerForAuth({
      organizationId: org.id,
      firebaseUid: user.firebaseUid,
      settingsRole: 'owner',
    });
    await expectTrpcCode(caller.signTracker360.cities({}), 'FORBIDDEN');
  });
});
