import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  ORG_A,
  ORG_B,
  createRulesTestEnv,
  seedOrg,
  seedOrgPath,
  seedRootDoc,
  seedUsers,
} from './helpers';

describe('firestore.rules', () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await createRulesTestEnv();
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
    await seedUsers(testEnv, [
      { uid: 'adminA', organizationId: ORG_A, role: 'admin', status: 'active' },
      { uid: 'officeA', organizationId: ORG_A, role: 'office', status: 'active' },
      { uid: 'crewA', organizationId: ORG_A, role: 'crew', status: 'active' },
      { uid: 'ownerA', organizationId: ORG_A, role: 'owner', status: 'active' },
      { uid: 'adminB', organizationId: ORG_B, role: 'admin', status: 'active' },
      { uid: 'suspendedA', organizationId: ORG_A, role: 'admin', status: 'suspended' },
      { uid: 'revokedA', organizationId: ORG_A, role: 'portal', status: 'revoked' },
      { uid: 'archivedA', organizationId: ORG_A, role: 'admin', status: 'archived' },
      { uid: 'pendingA', organizationId: ORG_A, role: 'admin', status: 'pending' },
      { uid: 'nostatusA', organizationId: ORG_A, role: 'office' },
      { uid: 'portalUserA', organizationId: ORG_A, role: 'portal', status: 'active' },
      // YL-S6: settingsRole overrides mismatched legacy role
      {
        uid: 'settingsOfficeOverCrew',
        organizationId: ORG_A,
        role: 'crew',
        status: 'active',
        settingsRole: 'office_staff',
      },
      {
        uid: 'settingsInstaller',
        organizationId: ORG_A,
        role: 'office',
        status: 'active',
        settingsRole: 'installer',
      },
      {
        uid: 'settingsReadOnly',
        organizationId: ORG_A,
        role: 'office',
        status: 'active',
        settingsRole: 'read_only',
      },
      {
        uid: 'settingsDispatcher',
        organizationId: ORG_A,
        role: 'crew',
        status: 'active',
        settingsRole: 'dispatcher',
      },
    ]);

    // Org roots required for belongsToOrg lifecycle checks (YL-S4 / BACKLOG-010).
    await seedOrg(testEnv, ORG_A, { name: 'Org A', lifecycleStatus: 'active' });
    await seedOrg(testEnv, ORG_B, { name: 'Org B', lifecycleStatus: 'active' });

    await seedOrgPath(testEnv, ORG_A, 'customers/custA', { name: 'Customer A' });
    await seedOrgPath(testEnv, ORG_B, 'customers/custB', { name: 'Customer B' });
    await seedOrgPath(testEnv, ORG_A, 'jobs/jobA', { title: 'Job A' });
    await seedOrgPath(testEnv, ORG_B, 'jobs/jobB', { title: 'Job B' });
    await seedOrgPath(testEnv, ORG_A, 'invoices/invA', { total: 100 });
    await seedOrgPath(testEnv, ORG_B, 'invoices/invB', { total: 200 });
    await seedOrgPath(testEnv, ORG_A, 'conversations/convA', { subject: 'A' });
    await seedOrgPath(testEnv, ORG_A, 'conversations/convA/messages/msgA', { body: 'hi' });
    await seedOrgPath(testEnv, ORG_B, 'conversations/convB', { subject: 'B' });
    await seedOrgPath(testEnv, ORG_B, 'conversations/convB/messages/msgB', { body: 'yo' });
    await seedOrgPath(testEnv, ORG_A, 'messages/msgTopA', { body: 'top A' });
    await seedOrgPath(testEnv, ORG_B, 'messages/msgTopB', { body: 'top B' });
    await seedOrgPath(testEnv, ORG_A, 'settings/general', { theme: 'dark' });
    await seedOrgPath(testEnv, ORG_B, 'settings/general', { theme: 'light' });
    await seedOrgPath(testEnv, ORG_A, 'signLocations/signA', { address: '1 Main' });
    await seedOrgPath(testEnv, ORG_B, 'signLocations/signB', { address: '2 Main' });
    await seedOrgPath(testEnv, ORG_A, 'portalAccounts/portalA', { customerId: 'custA' });
    await seedRootDoc(testEnv, 'platform/config', { secret: true });
    await seedRootDoc(testEnv, 'platformAuditLogs/log1', { action: 'x' });
    await seedRootDoc(testEnv, 'publicProposals/token1', { proposalId: 'p1' });
    await seedRootDoc(testEnv, 'publicInvoices/token1', { invoiceId: 'i1' });
  });

  describe('A. unauthenticated access', () => {
    it('cannot read or write org customers', async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(db, 'organizations', ORG_A, 'customers', 'custA')));
      await assertFails(
        setDoc(doc(db, 'organizations', ORG_A, 'customers', 'newCust'), { name: 'Nope' }),
      );
    });
  });

  describe('Portal Phase 2 unauthenticated access', () => {
    it('denies reads from portal collections', async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      for (const [collectionName, documentId] of [
        ['portalAccounts', 'portalA'],
        ['portalUsers', 'portalUserA'],
        ['portalTimelineEvents', 'eventA'],
        ['portalNotifications', 'notificationA'],
        ['portalQrCodes', 'qrA'],
        ['portalQrScans', 'scanA'],
        ['portalQrVerifications', 'verificationA'],
        ['portalQrAuditEvents', 'auditA'],
      ] as const) {
        await assertFails(getDoc(doc(db, 'organizations', ORG_A, collectionName, documentId)));
      }
    });
  });

  describe('B. tenant isolation', () => {
    it('orgA user cannot read/write orgB customers, jobs, invoices, conversations/messages, settings, signLocations', async () => {
      const db = testEnv.authenticatedContext('adminA').firestore();

      await assertFails(getDoc(doc(db, 'organizations', ORG_B, 'customers', 'custB')));
      await assertFails(
        setDoc(doc(db, 'organizations', ORG_B, 'customers', 'custB'), { name: 'hack' }),
      );

      await assertFails(getDoc(doc(db, 'organizations', ORG_B, 'jobs', 'jobB')));
      await assertFails(setDoc(doc(db, 'organizations', ORG_B, 'jobs', 'jobB'), { title: 'hack' }));

      await assertFails(getDoc(doc(db, 'organizations', ORG_B, 'invoices', 'invB')));
      await assertFails(setDoc(doc(db, 'organizations', ORG_B, 'invoices', 'invB'), { total: 1 }));

      await assertFails(getDoc(doc(db, 'organizations', ORG_B, 'conversations', 'convB')));
      await assertFails(
        getDoc(doc(db, 'organizations', ORG_B, 'conversations', 'convB', 'messages', 'msgB')),
      );
      await assertFails(getDoc(doc(db, 'organizations', ORG_B, 'messages', 'msgTopB')));

      await assertFails(getDoc(doc(db, 'organizations', ORG_B, 'settings', 'general')));
      await assertFails(
        setDoc(doc(db, 'organizations', ORG_B, 'settings', 'general'), { theme: 'x' }),
      );

      await assertFails(getDoc(doc(db, 'organizations', ORG_B, 'signLocations', 'signB')));
      await assertFails(
        setDoc(doc(db, 'organizations', ORG_B, 'signLocations', 'signB'), { address: 'x' }),
      );
    });
  });

  describe('C. user status', () => {
    it('suspended, archived, and pending are denied; active and missing status allowed', async () => {
      for (const uid of ['suspendedA', 'revokedA', 'archivedA', 'pendingA'] as const) {
        const db = testEnv.authenticatedContext(uid).firestore();
        await assertFails(getDoc(doc(db, 'organizations', ORG_A, 'customers', 'custA')));
        await assertFails(getDoc(doc(db, 'organizations', ORG_A, 'jobs', 'jobA')));
      }

      const activeDb = testEnv.authenticatedContext('officeA').firestore();
      await assertSucceeds(getDoc(doc(activeDb, 'organizations', ORG_A, 'customers', 'custA')));

      const noStatusDb = testEnv.authenticatedContext('nostatusA').firestore();
      await assertSucceeds(getDoc(doc(noStatusDb, 'organizations', ORG_A, 'customers', 'custA')));
    });
  });

  describe('C2. organization lifecycleStatus (YL-S4 / BACKLOG-010)', () => {
    it('inactive, suspended, and archived orgs deny member reads; active and missing field allow', async () => {
      for (const lifecycleStatus of ['inactive', 'suspended', 'archived'] as const) {
        await seedOrg(testEnv, ORG_A, { name: 'Org A', lifecycleStatus });
        const db = testEnv.authenticatedContext('adminA').firestore();
        await assertFails(getDoc(doc(db, 'organizations', ORG_A)));
        await assertFails(getDoc(doc(db, 'organizations', ORG_A, 'customers', 'custA')));
        await assertFails(getDoc(doc(db, 'organizations', ORG_A, 'jobs', 'jobA')));
        await assertFails(
          setDoc(doc(db, 'organizations', ORG_A, 'customers', 'custA'), { name: 'hack' }),
        );
      }

      await seedOrg(testEnv, ORG_A, { name: 'Org A', lifecycleStatus: 'active' });
      const activeOrgDb = testEnv.authenticatedContext('adminA').firestore();
      await assertSucceeds(getDoc(doc(activeOrgDb, 'organizations', ORG_A)));
      await assertSucceeds(
        getDoc(doc(activeOrgDb, 'organizations', ORG_A, 'customers', 'custA')),
      );

      // Missing lifecycleStatus ⇒ legacy active
      await seedOrg(testEnv, ORG_A, { name: 'Org A legacy' });
      await assertSucceeds(getDoc(doc(activeOrgDb, 'organizations', ORG_A, 'customers', 'custA')));
    });

    it('org lifecycle denial does not weaken cross-org isolation', async () => {
      await seedOrg(testEnv, ORG_A, { name: 'Org A', lifecycleStatus: 'inactive' });
      await seedOrg(testEnv, ORG_B, { name: 'Org B', lifecycleStatus: 'active' });

      const adminA = testEnv.authenticatedContext('adminA').firestore();
      await assertFails(getDoc(doc(adminA, 'organizations', ORG_A, 'customers', 'custA')));
      await assertFails(getDoc(doc(adminA, 'organizations', ORG_B, 'customers', 'custB')));

      const adminB = testEnv.authenticatedContext('adminB').firestore();
      await assertSucceeds(getDoc(doc(adminB, 'organizations', ORG_B, 'customers', 'custB')));
      await assertFails(getDoc(doc(adminB, 'organizations', ORG_A, 'customers', 'custA')));
    });
  });

  describe('D. roles', () => {
    it('crew can read jobs but not write customers; office can write customers', async () => {
      const crewDb = testEnv.authenticatedContext('crewA').firestore();
      await assertSucceeds(getDoc(doc(crewDb, 'organizations', ORG_A, 'jobs', 'jobA')));
      await assertFails(
        setDoc(doc(crewDb, 'organizations', ORG_A, 'jobs', 'jobA'), { title: 'crew write' }),
      );
      await assertFails(getDoc(doc(crewDb, 'organizations', ORG_A, 'customers', 'custA')));
      await assertFails(
        setDoc(doc(crewDb, 'organizations', ORG_A, 'customers', 'custA'), { name: 'crew' }),
      );

      const officeDb = testEnv.authenticatedContext('officeA').firestore();
      await assertSucceeds(
        setDoc(doc(officeDb, 'organizations', ORG_A, 'customers', 'custA'), {
          name: 'Updated by office',
        }),
      );
    });
  });

  describe('D2. settingsRole bridge (YL-S6 / BACKLOG-007)', () => {
    it('settingsRole office_staff overrides stale legacy crew for customer access', async () => {
      const db = testEnv.authenticatedContext('settingsOfficeOverCrew').firestore();
      await assertSucceeds(getDoc(doc(db, 'organizations', ORG_A, 'customers', 'custA')));
      await assertSucceeds(
        setDoc(doc(db, 'organizations', ORG_A, 'customers', 'custA'), { name: 'via settingsRole' }),
      );
    });

    it('settingsRole installer maps to crew bucket (jobs read, customers denied)', async () => {
      const db = testEnv.authenticatedContext('settingsInstaller').firestore();
      await assertSucceeds(getDoc(doc(db, 'organizations', ORG_A, 'jobs', 'jobA')));
      await assertFails(getDoc(doc(db, 'organizations', ORG_A, 'customers', 'custA')));
      await assertFails(
        setDoc(doc(db, 'organizations', ORG_A, 'customers', 'custA'), { name: 'nope' }),
      );
    });

    it('settingsRole dispatcher maps to office (desk), not crew', async () => {
      const db = testEnv.authenticatedContext('settingsDispatcher').firestore();
      await assertSucceeds(getDoc(doc(db, 'organizations', ORG_A, 'customers', 'custA')));
    });

    it('settingsRole read_only is denied office hasRole paths', async () => {
      const db = testEnv.authenticatedContext('settingsReadOnly').firestore();
      await assertFails(getDoc(doc(db, 'organizations', ORG_A, 'customers', 'custA')));
      await assertFails(getDoc(doc(db, 'organizations', ORG_A, 'jobs', 'jobA')));
    });

    it('legacy role still used when settingsRole absent', async () => {
      const officeDb = testEnv.authenticatedContext('officeA').firestore();
      await assertSucceeds(getDoc(doc(officeDb, 'organizations', ORG_A, 'customers', 'custA')));
      const crewDb = testEnv.authenticatedContext('crewA').firestore();
      await assertFails(getDoc(doc(crewDb, 'organizations', ORG_A, 'customers', 'custA')));
    });
  });

  describe('E. platform collections', () => {
    it('deny all client access including authenticated tenant admin', async () => {
      const adminDb = testEnv.authenticatedContext('adminA').firestore();
      await assertFails(getDoc(doc(adminDb, 'platform', 'config')));
      await assertFails(setDoc(doc(adminDb, 'platform', 'config'), { secret: false }));
      await assertFails(getDoc(doc(adminDb, 'platformAuditLogs', 'log1')));
      await assertFails(setDoc(doc(adminDb, 'platformAuditLogs', 'log1'), { action: 'y' }));

      const unauth = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(unauth, 'platform', 'config')));
      await assertFails(getDoc(doc(unauth, 'platformAuditLogs', 'log1')));
    });
  });

  describe('F. public mirrors', () => {
    it('publicProposals and publicInvoices deny client read/write', async () => {
      const adminDb = testEnv.authenticatedContext('adminA').firestore();
      await assertFails(getDoc(doc(adminDb, 'publicProposals', 'token1')));
      await assertFails(setDoc(doc(adminDb, 'publicProposals', 'token1'), { x: 1 }));
      await assertFails(getDoc(doc(adminDb, 'publicInvoices', 'token1')));
      await assertFails(setDoc(doc(adminDb, 'publicInvoices', 'token1'), { x: 1 }));

      const unauth = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(unauth, 'publicProposals', 'token1')));
      await assertFails(getDoc(doc(unauth, 'publicInvoices', 'token1')));
    });
  });

  describe('G. portal collections', () => {
    it('portalAccounts require office/admin/owner; crew denied', async () => {
      const crewDb = testEnv.authenticatedContext('crewA').firestore();
      await assertFails(getDoc(doc(crewDb, 'organizations', ORG_A, 'portalAccounts', 'portalA')));
      await assertFails(
        setDoc(doc(crewDb, 'organizations', ORG_A, 'portalAccounts', 'portalA'), {
          customerId: 'x',
        }),
      );

      for (const uid of ['officeA', 'adminA', 'ownerA'] as const) {
        const db = testEnv.authenticatedContext(uid).firestore();
        await assertSucceeds(getDoc(doc(db, 'organizations', ORG_A, 'portalAccounts', 'portalA')));
        await assertSucceeds(
          setDoc(doc(db, 'organizations', ORG_A, 'portalAccounts', 'portalA'), {
            customerId: 'custA',
            updatedBy: uid,
          }),
        );
      }
    });

    it('portal users cannot write protected identity, org, role, or customer data', async () => {
      const db = testEnv.authenticatedContext('portalUserA').firestore();
      await assertFails(
        setDoc(doc(db, 'users', 'portalUserA'), {
          firebaseUid: 'portalUserA',
          organizationId: ORG_B,
          role: 'admin',
          status: 'active',
        }),
      );
      await assertFails(setDoc(doc(db, 'organizations', ORG_A), { name: 'Nope' }));
      await assertFails(
        setDoc(doc(db, 'organizations', ORG_A, 'roles', 'portal'), { permissions: ['*'] }),
      );
      await assertFails(
        setDoc(doc(db, 'organizations', ORG_A, 'customers', 'custA'), { name: 'Nope' }),
      );
    });

    it('suspended and revoked users cannot read portal collections', async () => {
      for (const uid of ['suspendedA', 'revokedA'] as const) {
        const db = testEnv.authenticatedContext(uid).firestore();
        await assertFails(getDoc(doc(db, 'organizations', ORG_A, 'portalAccounts', 'portalA')));
      }
    });
  });
});
