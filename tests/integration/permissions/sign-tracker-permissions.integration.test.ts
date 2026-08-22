import { beforeAll, describe, expect, it } from 'vitest';
import { MODULE_PRESETS } from '@clcrm/types';
import {
  ensureFirestoreEmulator,
  seedTenant,
  createCallerForAuth,
  expectTrpcCode,
  sampleSignLocationInput,
  permissionsForRole,
} from '../setup';

const STANDARD_MODULES = [...MODULE_PRESETS.standard];

async function seededCaller(
  settingsRole: Parameters<typeof createCallerForAuth>[0]['settingsRole'],
) {
  const { org, user } = await seedTenant({
    org: { subscriptionTier: 'standard', enabledModules: STANDARD_MODULES },
    user: {
      settingsRole,
      role: settingsRole === 'owner' || settingsRole === 'administrator' ? 'owner' : 'office',
    },
  });
  const caller = createCallerForAuth({
    organizationId: org.id,
    firebaseUid: user.firebaseUid,
    userId: user.id,
    email: user.email,
    settingsRole,
    permissions: permissionsForRole(settingsRole!),
  });
  return { org, user, caller };
}

describe('integration: sign tracker permissions', () => {
  beforeAll(() => {
    ensureFirestoreEmulator();
  });

  it('owner can create and delete signs', async () => {
    const { caller } = await seededCaller('owner');
    const created = await caller.signTracker360.create(sampleSignLocationInput());
    expect(created.id).toBeTruthy();
    const del = await caller.signTracker360.delete({ locationId: created.id });
    expect(del.ok).toBe(true);
  });

  it('read_only can view but not create', async () => {
    const owner = await seededCaller('owner');
    const created = await owner.caller.signTracker360.create(sampleSignLocationInput());

    // Same org as owner-created sign; permissions from SYSTEM_ROLES read_only.
    const viewCaller = createCallerForAuth({
      organizationId: owner.org.id,
      firebaseUid: 'ro_' + owner.user.firebaseUid,
      settingsRole: 'read_only',
      permissions: permissionsForRole('read_only'),
    });

    const list = await viewCaller.signTracker360.list({ seasonYear: 2026 });
    expect(list.some((s: { id: string }) => s.id === created.id)).toBe(true);

    await expectTrpcCode(viewCaller.signTracker360.create(sampleSignLocationInput()), 'FORBIDDEN');
  });

  it('warehouse_staff lacks sign_tracker view', async () => {
    const { caller } = await seededCaller('warehouse_staff');
    await expectTrpcCode(caller.signTracker360.list({}), 'FORBIDDEN');
  });

  it('installer can create/edit but not delete', async () => {
    const { org } = await seededCaller('owner');
    const installer = createCallerForAuth({
      organizationId: org.id,
      firebaseUid: 'installer_uid',
      settingsRole: 'installer',
      role: 'crew',
      permissions: permissionsForRole('installer'),
    });

    const created = await installer.signTracker360.create(sampleSignLocationInput());
    const updated = await installer.signTracker360.update({
      locationId: created.id,
      notes: 'updated by installer',
    });
    expect(updated.notes).toBe('updated by installer');

    await expectTrpcCode(installer.signTracker360.delete({ locationId: created.id }), 'FORBIDDEN');
  });

  it('installer cannot manage settings', async () => {
    const { org } = await seededCaller('owner');
    const installer = createCallerForAuth({
      organizationId: org.id,
      firebaseUid: 'installer_settings',
      settingsRole: 'installer',
      role: 'crew',
      permissions: permissionsForRole('installer'),
    });
    await expectTrpcCode(installer.signTracker360.settings.get(), 'FORBIDDEN');
  });

  it('sales_manager can manage settings', async () => {
    const { org } = await seededCaller('owner');
    const mgr = createCallerForAuth({
      organizationId: org.id,
      firebaseUid: 'sales_mgr',
      settingsRole: 'sales_manager',
      role: 'office',
      permissions: permissionsForRole('sales_manager'),
    });
    const settings = await mgr.signTracker360.settings.get();
    expect(settings).toBeTruthy();
  });

  it('installer cannot export reportExport', async () => {
    const { org } = await seededCaller('owner');
    const installer = createCallerForAuth({
      organizationId: org.id,
      firebaseUid: 'installer_export',
      settingsRole: 'installer',
      role: 'crew',
      permissions: permissionsForRole('installer'),
    });
    await expectTrpcCode(installer.signTracker360.reportExport({ seasonYear: 2026 }), 'FORBIDDEN');
  });

  it('office_staff can create but not delete (non-manager)', async () => {
    const { org } = await seededCaller('owner');
    const office = createCallerForAuth({
      organizationId: org.id,
      firebaseUid: 'office_staff_uid',
      settingsRole: 'office_staff',
      role: 'office',
      permissions: permissionsForRole('office_staff'),
    });
    const created = await office.signTracker360.create(sampleSignLocationInput());
    expect(created.id).toBeTruthy();
    // resourcePermissions(..., false) → delete false
    expect(permissionsForRole('office_staff').sign_tracker.delete).toBe(false);
    await expectTrpcCode(office.signTracker360.delete({ locationId: created.id }), 'FORBIDDEN');
  });

  it('read_only cannot archive (settingsRole write block)', async () => {
    const owner = await seededCaller('owner');
    const created = await owner.caller.signTracker360.create(sampleSignLocationInput());
    const ro = createCallerForAuth({
      organizationId: owner.org.id,
      firebaseUid: 'ro_archive',
      settingsRole: 'read_only',
      permissions: permissionsForRole('read_only'),
    });
    await expectTrpcCode(ro.signTracker360.archive({ locationId: created.id }), 'FORBIDDEN');
  });
});
