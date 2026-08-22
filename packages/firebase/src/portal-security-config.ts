/**
 * Canonical portal security configuration (P2-S3).
 * ENVIRONMENT=EMULATOR for automated evidence. Fail closed on invalid overrides.
 */
export type PortalSecurityConfig = {
  invitationTtlMinutes: number;
  otpTtlMinutes: number;
  otpLength: number;
  otpMaxAttempts: number;
  otpLockoutMinutes: number;
  otpResendCooldownSeconds: number;
  otpRequestMaxPerWindow: number;
  otpRequestWindowMinutes: number;
  invitationResendCooldownSeconds: number;
  invitationClaimMaxPerWindow: number;
  invitationClaimWindowMinutes: number;
  /** Short-lived portal file access tickets / signed reads. */
  fileAccessTtlMinutes: number;
  maxUploadBytes: number;
};

const DEFAULTS: PortalSecurityConfig = {
  invitationTtlMinutes: 7 * 24 * 60,
  otpTtlMinutes: 10,
  otpLength: 6,
  otpMaxAttempts: 5,
  otpLockoutMinutes: 15,
  otpResendCooldownSeconds: 60,
  otpRequestMaxPerWindow: 10,
  otpRequestWindowMinutes: 15,
  invitationResendCooldownSeconds: 60,
  invitationClaimMaxPerWindow: 20,
  invitationClaimWindowMinutes: 15,
  fileAccessTtlMinutes: 15,
  maxUploadBytes: 4_500_000,
};

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

/** Single typed source for invitation/OTP security timings. */
export function getPortalSecurityConfig(
  overrides?: Partial<PortalSecurityConfig>,
): PortalSecurityConfig {
  const merged = { ...DEFAULTS, ...overrides };
  return {
    invitationTtlMinutes: clamp(merged.invitationTtlMinutes, 60, 60 * 24 * 30),
    otpTtlMinutes: clamp(merged.otpTtlMinutes, 1, 60),
    otpLength: clamp(merged.otpLength, 6, 8),
    otpMaxAttempts: clamp(merged.otpMaxAttempts, 3, 20),
    otpLockoutMinutes: clamp(merged.otpLockoutMinutes, 1, 24 * 60),
    otpResendCooldownSeconds: clamp(merged.otpResendCooldownSeconds, 15, 3600),
    otpRequestMaxPerWindow: clamp(merged.otpRequestMaxPerWindow, 3, 100),
    otpRequestWindowMinutes: clamp(merged.otpRequestWindowMinutes, 1, 60),
    invitationResendCooldownSeconds: clamp(merged.invitationResendCooldownSeconds, 15, 3600),
    invitationClaimMaxPerWindow: clamp(merged.invitationClaimMaxPerWindow, 5, 100),
    invitationClaimWindowMinutes: clamp(merged.invitationClaimWindowMinutes, 1, 60),
    fileAccessTtlMinutes: clamp(merged.fileAccessTtlMinutes, 1, 60),
    maxUploadBytes: clamp(merged.maxUploadBytes, 64_000, 12_000_000),
  };
}

export function portalFileAccessTtlMs(cfg = getPortalSecurityConfig()): number {
  return cfg.fileAccessTtlMinutes * 60 * 1000;
}

export function portalInvitationTtlMs(cfg = getPortalSecurityConfig()): number {
  return cfg.invitationTtlMinutes * 60 * 1000;
}

export function portalOtpTtlMs(cfg = getPortalSecurityConfig()): number {
  return cfg.otpTtlMinutes * 60 * 1000;
}

/** Public-facing generic messages — never include internal reason codes. */
export const PORTAL_PUBLIC_MESSAGES = {
  verificationSent: 'If the access information is valid, verification instructions have been sent.',
  accessUnavailable:
    'Portal access is unavailable. Please request a new access link or contact the business.',
  tryAgainLater: 'Please wait a moment and try again.',
} as const;

export type PortalOtpPurpose = 'portal_access' | 'invitation_claim' | 'account_recovery';
