import {
  DEMO_EMAIL_SIMULATED,
  DEMO_PAYMENT_SIMULATED,
  DEMO_REFUND_SIMULATED,
  DEMO_SIGNATURE_SIMULATED,
  DEMO_SMS_SIMULATED,
  DEMO_TENANT_SLUG,
} from '@clcrm/types';
import type { OrganizationRecord } from './firestore';
import { getOrganization } from './firestore';

export {
  DEMO_EMAIL_SIMULATED,
  DEMO_PAYMENT_SIMULATED,
  DEMO_REFUND_SIMULATED,
  DEMO_SIGNATURE_SIMULATED,
  DEMO_SMS_SIMULATED,
  DEMO_TENANT_SLUG,
};

type DemoOrgShape = Pick<OrganizationRecord, 'isDemoTenant' | 'slug'> | null | undefined;

/** Server-side demo tenant detection — authoritative for outbound guards. */
export function isDemoOrganization(org: DemoOrgShape): boolean {
  if (!org) return false;
  if (org.isDemoTenant === true) return true;
  return org.slug === DEMO_TENANT_SLUG;
}

export async function isDemoOrganizationId(orgId: string): Promise<boolean> {
  const org = await getOrganization(orgId);
  return isDemoOrganization(org);
}

export async function assertAuthorizedDemoTenant(orgId: string): Promise<OrganizationRecord> {
  const org = await getOrganization(orgId);
  if (!org || !isDemoOrganization(org)) {
    throw new Error('Operation is only permitted for authorized demo tenants');
  }
  return org;
}

export function assertDemoSafeOperation(
  org: DemoOrgShape,
  operation: 'email' | 'sms' | 'payment' | 'refund' | 'signature' | 'integration_probe',
): void {
  if (!isDemoOrganization(org)) return;
  const code = demoSimulatedCodeForOperation(operation);
  throw new DemoOutboundBlockedError(code, operation);
}

export class DemoOutboundBlockedError extends Error {
  readonly code: string;
  readonly operation: string;

  constructor(code: string, operation: string) {
    super(code);
    this.name = 'DemoOutboundBlockedError';
    this.code = code;
    this.operation = operation;
  }
}

export function demoSimulatedCodeForOperation(
  operation: 'email' | 'sms' | 'payment' | 'refund' | 'signature' | 'integration_probe',
): string {
  switch (operation) {
    case 'email':
      return DEMO_EMAIL_SIMULATED;
    case 'sms':
      return DEMO_SMS_SIMULATED;
    case 'payment':
      return DEMO_PAYMENT_SIMULATED;
    case 'refund':
      return DEMO_REFUND_SIMULATED;
    case 'signature':
      return DEMO_SIGNATURE_SIMULATED;
    case 'integration_probe':
      return 'DEMO_INTEGRATION_SIMULATED';
    default:
      return 'DEMO_OPERATION_SIMULATED';
  }
}

export type DemoSimulatedEmailResult = {
  sent: boolean;
  simulated: true;
  code: typeof DEMO_EMAIL_SIMULATED;
  reason: typeof DEMO_EMAIL_SIMULATED;
};

export type DemoSimulatedSmsResult = {
  sent: boolean;
  simulated: true;
  code: typeof DEMO_SMS_SIMULATED;
  reason: typeof DEMO_SMS_SIMULATED;
};

export function createDemoSimulatedEmailResult(sent = true): DemoSimulatedEmailResult {
  return {
    sent,
    simulated: true,
    code: DEMO_EMAIL_SIMULATED,
    reason: DEMO_EMAIL_SIMULATED,
  };
}

export function createDemoSimulatedSmsResult(sent = true): DemoSimulatedSmsResult {
  return {
    sent,
    simulated: true,
    code: DEMO_SMS_SIMULATED,
    reason: DEMO_SMS_SIMULATED,
  };
}

export function createDemoSimulatedPaymentResult() {
  return {
    simulated: true,
    code: DEMO_PAYMENT_SIMULATED,
    status: 'succeeded' as const,
  };
}
