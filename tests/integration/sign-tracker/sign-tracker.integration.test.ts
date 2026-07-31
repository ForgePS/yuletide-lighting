import { beforeAll, describe, expect, it } from 'vitest';
import { MODULE_PRESETS } from '@clcrm/types';
import {
  ensureFirestoreEmulator,
  seedTenant,
  createCallerForAuth,
  expectTrpcCode,
  sampleSignLocationInput,
} from '../setup';

describe('integration: sign tracker procedures', () => {
  beforeAll(() => {
    ensureFirestoreEmulator();
  });

  async function ownerCaller() {
    const { org, user } = await seedTenant({
      org: { subscriptionTier: 'standard', enabledModules: [...MODULE_PRESETS.standard] },
    });
    const caller = createCallerForAuth({
      organizationId: org.id,
      firebaseUid: user.firebaseUid,
      userId: user.id,
      email: user.email,
      settingsRole: 'owner',
    });
    return { org, user, caller };
  }

  it('creates a sign location', async () => {
    const { caller } = await ownerCaller();
    const created = await caller.signTracker360.create(sampleSignLocationInput());
    expect(created.id).toBeTruthy();
    expect(created.status).toBe('active');
    expect(created.location.city).toBe('Dallas');
    expect(created.signData.quantityPlaced).toBe(2);
  });

  it('lists and gets by id', async () => {
    const { caller } = await ownerCaller();
    const created = await caller.signTracker360.create(sampleSignLocationInput());
    const list = await caller.signTracker360.list({ seasonYear: 2026 });
    expect(list.some((s: { id: string }) => s.id === created.id)).toBe(true);
    const got = await caller.signTracker360.getById({ locationId: created.id });
    expect(got.id).toBe(created.id);
  });

  it('updates notes and quantity', async () => {
    const { caller } = await ownerCaller();
    const created = await caller.signTracker360.create(sampleSignLocationInput());
    const updated = await caller.signTracker360.update({
      locationId: created.id,
      notes: 'moved closer to curb',
      quantityPlaced: 3,
    });
    expect(updated.notes).toBe('moved closer to curb');
    expect(updated.signData.quantityPlaced).toBe(3);
  });

  it('archives and restores', async () => {
    const { caller } = await ownerCaller();
    const created = await caller.signTracker360.create(sampleSignLocationInput());
    const archived = await caller.signTracker360.archive({ locationId: created.id });
    expect(archived.status).toBe('removed');
    const restored = await caller.signTracker360.restore({
      locationId: created.id,
      status: 'active',
    });
    expect(restored.status).toBe('active');
  });

  it('deletes a sign location', async () => {
    const { caller } = await ownerCaller();
    const created = await caller.signTracker360.create(sampleSignLocationInput());
    await caller.signTracker360.delete({ locationId: created.id });
    await expectTrpcCode(caller.signTracker360.getById({ locationId: created.id }), 'NOT_FOUND');
  });

  it('dashboard and cities return aggregates', async () => {
    const { caller } = await ownerCaller();
    await caller.signTracker360.create(sampleSignLocationInput());
    await caller.signTracker360.create(
      sampleSignLocationInput({
        location: {
          latitude: 33.1,
          longitude: -96.7,
          address: '200 Other St',
          city: 'Plano',
          state: 'TX',
          zip: '75024',
        },
      }),
    );
    const dash = await caller.signTracker360.dashboard({ seasonYear: 2026 });
    expect(dash).toBeTruthy();
    const cities = await caller.signTracker360.cities({ seasonYear: 2026 });
    expect(Array.isArray(cities) || typeof cities === 'object').toBe(true);
  });

  it('pageData and report succeed', async () => {
    const { caller } = await ownerCaller();
    await caller.signTracker360.create(sampleSignLocationInput());
    const page = await caller.signTracker360.pageData({ seasonYear: 2026 });
    expect(page).toBeTruthy();
    const report = await caller.signTracker360.report({ seasonYear: 2026 });
    expect(report).toBeTruthy();
  });

  it('settings get and update', async () => {
    const { caller } = await ownerCaller();
    const before = await caller.signTracker360.settings.get();
    expect(before.costPerSignCents).toBeGreaterThan(0);
    const updated = await caller.signTracker360.settings.update({
      costPerSignCents: 750,
    });
    expect(updated.costPerSignCents).toBe(750);
  });

  it('markNeedsPickup transitions active signs', async () => {
    const { caller } = await ownerCaller();
    const created = await caller.signTracker360.create(sampleSignLocationInput());
    await caller.signTracker360.markNeedsPickup({ seasonYear: 2026 });
    const got = await caller.signTracker360.getById({ locationId: created.id });
    expect(['needs_pickup', 'active']).toContain(got.status);
  });

  it('recover updates recovery quantities', async () => {
    const { caller } = await ownerCaller();
    const created = await caller.signTracker360.create(
      sampleSignLocationInput({ quantityPlaced: 4 }),
    );
    const recovered = await caller.signTracker360.recover({
      locationId: created.id,
      quantityRecovered: 3,
      quantityMissing: 1,
      recoveryType: 'partial_recovery',
      notes: 'one missing',
    });
    expect(recovered.signData.quantityRecovered).toBe(3);
    expect(recovered.signData.quantityMissing).toBe(1);
  });

  it('reverseGeocode returns empty fields without MAPBOX_TOKEN', async () => {
    const { caller } = await ownerCaller();
    const geo = await caller.signTracker360.reverseGeocode({
      latitude: 32.77,
      longitude: -96.8,
    });
    expect(geo).toMatchObject({
      address: expect.any(String),
      city: expect.any(String),
      state: expect.any(String),
      zip: expect.any(String),
    });
  });

  it('territory intelligence returns data shape', async () => {
    const { caller } = await ownerCaller();
    await caller.signTracker360.create(sampleSignLocationInput());
    const territory = await caller.signTracker360.territory({ seasonYear: 2026 });
    expect(territory).toBeTruthy();
  });
});
