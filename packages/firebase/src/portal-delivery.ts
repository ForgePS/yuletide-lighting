/**
 * Portal verification delivery abstraction (P2-S3).
 * Emulator adapter only for automated evidence — refuses production init.
 */
import { PORTAL_PUBLIC_MESSAGES } from './portal-security-config';
import { createPortalOpaqueToken } from './portal-security';

export type SendOtpInput = {
  purpose: 'portal_access' | 'invitation_claim' | 'account_recovery';
  channel: 'email' | 'sms';
  to: string;
  /** Raw OTP — never log; emulator store only. */
  otp: string;
  organizationId: string;
  diagnosticReference?: string;
};

export type SendInvitationInput = {
  to: string;
  organizationId: string;
  /** Raw invitation token — never log; emulator store only. */
  invitationToken: string;
  claimPath: string;
};

export type PortalVerificationDeliveryProvider = {
  readonly name: string;
  sendOtp(input: SendOtpInput): Promise<{ delivered: boolean; reason?: string }>;
  sendInvitation(input: SendInvitationInput): Promise<{ delivered: boolean; reason?: string }>;
};

type EmulatorOtpCapture = SendOtpInput & { capturedAt: number; id: string };
type EmulatorInviteCapture = SendInvitationInput & { capturedAt: number; id: string };

const otpCaptures: EmulatorOtpCapture[] = [];
const inviteCaptures: EmulatorInviteCapture[] = [];

function assertEmulatorOnly(context: string): void {
  const isEmu =
    process.env.NODE_ENV === 'test' ||
    Boolean(process.env.FIRESTORE_EMULATOR_HOST) ||
    Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST) ||
    process.env.PORTAL_DELIVERY_MODE === 'emulator';
  const isProd =
    process.env.NODE_ENV === 'production' &&
    !process.env.FIRESTORE_EMULATOR_HOST &&
    process.env.PORTAL_DELIVERY_MODE !== 'emulator';
  if (isProd || (!isEmu && process.env.ALLOW_PORTAL_LIVE_DELIVERY !== '1')) {
    if (isProd) {
      throw new Error(`PortalVerificationDelivery[${context}]: refused in production`);
    }
  }
  if (!isEmu && process.env.ALLOW_PORTAL_LIVE_DELIVERY !== '1') {
    // Default fail-closed outside emulator/test unless explicitly allowed (never for S3 evidence).
    throw new Error(
      `PortalVerificationDelivery[${context}]: emulator/test only (set FIRESTORE_EMULATOR_HOST)`,
    );
  }
}

export function createEmulatorPortalDeliveryProvider(): PortalVerificationDeliveryProvider {
  assertEmulatorOnly('init');
  return {
    name: 'emulator',
    async sendOtp(input) {
      assertEmulatorOnly('sendOtp');
      const id = `otp_${Date.now().toString(36)}_${createPortalOpaqueToken(6)}`;
      // Store for tests only — never log otp value.
      otpCaptures.push({ ...input, capturedAt: Date.now(), id });
      return { delivered: true };
    },
    async sendInvitation(input) {
      assertEmulatorOnly('sendInvitation');
      const id = `inv_${Date.now().toString(36)}_${createPortalOpaqueToken(6)}`;
      inviteCaptures.push({ ...input, capturedAt: Date.now(), id });
      return { delivered: true };
    },
  };
}

/** Live adapters are stubs that refuse during S3 emulator phase. */
export function createLivePortalDeliveryProvider(): PortalVerificationDeliveryProvider {
  return {
    name: 'live-disabled-s3',
    async sendOtp() {
      return { delivered: false, reason: 'Live delivery disabled in PORTAL-P2-S3' };
    },
    async sendInvitation() {
      return { delivered: false, reason: 'Live delivery disabled in PORTAL-P2-S3' };
    },
  };
}

let activeProvider: PortalVerificationDeliveryProvider | null = null;

export function getPortalDeliveryProvider(): PortalVerificationDeliveryProvider {
  if (activeProvider) return activeProvider;
  const isEmu =
    Boolean(process.env.FIRESTORE_EMULATOR_HOST) ||
    Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST) ||
    process.env.PORTAL_DELIVERY_MODE === 'emulator' ||
    process.env.NODE_ENV === 'test';
  activeProvider = isEmu
    ? createEmulatorPortalDeliveryProvider()
    : createLivePortalDeliveryProvider();
  return activeProvider;
}

/** Test-only: override provider (never use in production routes). */
export function setPortalDeliveryProviderForTests(
  provider: PortalVerificationDeliveryProvider | null,
): void {
  if (process.env.NODE_ENV === 'production' && !process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('setPortalDeliveryProviderForTests refused in production');
  }
  activeProvider = provider;
}

export function getEmulatorOtpCaptures(): EmulatorOtpCapture[] {
  assertEmulatorOnly('getEmulatorOtpCaptures');
  return [...otpCaptures];
}

export function getEmulatorInvitationCaptures(): EmulatorInviteCapture[] {
  assertEmulatorOnly('getEmulatorInvitationCaptures');
  return [...inviteCaptures];
}

export function clearEmulatorDeliveryCaptures(): void {
  assertEmulatorOnly('clearEmulatorDeliveryCaptures');
  otpCaptures.length = 0;
  inviteCaptures.length = 0;
}

export function latestEmulatorOtp(filter?: {
  to?: string;
  purpose?: SendOtpInput['purpose'];
}): EmulatorOtpCapture | null {
  assertEmulatorOnly('latestEmulatorOtp');
  const list = otpCaptures.filter((c) => {
    if (filter?.to && c.to !== filter.to) return false;
    if (filter?.purpose && c.purpose !== filter.purpose) return false;
    return true;
  });
  return list[list.length - 1] ?? null;
}

export function publicDeliveryMessage(): string {
  return PORTAL_PUBLIC_MESSAGES.verificationSent;
}
