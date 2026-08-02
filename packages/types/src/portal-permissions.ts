/**
 * Canonical portal permission resolver (Phase 2).
 * Fail-closed. Backend authorization is authoritative; nav visibility is not a security boundary.
 */
import type {
  PortalAccountStatus,
  PortalFeatureKey,
  PortalUserRole,
  PortalUserStatus,
} from './portal';
import { PORTAL_FEATURES } from './portal';

export type PortalAction =
  | 'view'
  | 'request'
  | 'create'
  | 'edit'
  | 'sign'
  | 'pay'
  | 'download'
  | 'message'
  | 'manage_users'
  | 'manage_contacts';

export const PORTAL_ACTIONS: PortalAction[] = [
  'view',
  'request',
  'create',
  'edit',
  'sign',
  'pay',
  'download',
  'message',
  'manage_users',
  'manage_contacts',
];

export const PORTAL_USER_ROLES: PortalUserRole[] = [
  'account_owner',
  'authorized_contact',
  'billing_contact',
  'property_contact',
  'view_only',
];

export type PortalPermissionInput = {
  role: PortalUserRole;
  feature: PortalFeatureKey;
  action: PortalAction;
  accountStatus: PortalAccountStatus;
  userStatus: PortalUserStatus;
  /** When false, feature is disabled for the tenant/platform. */
  featureEnabled: boolean;
};

export type PortalPermissionDecision = {
  allowed: boolean;
  reason:
    | 'ok'
    | 'unknown_role'
    | 'unknown_action'
    | 'unknown_feature'
    | 'account_suspended'
    | 'account_revoked'
    | 'account_locked'
    | 'account_inactive'
    | 'user_suspended'
    | 'user_locked'
    | 'user_inactive'
    | 'feature_disabled'
    | 'action_not_permitted'
    | 'missing_feature_config';
};

const FEATURE_KEYS = new Set(PORTAL_FEATURES.map((f) => f.key));

/** Role → feature → allowed actions (fail-closed for unspecified). */
const MATRIX: Record<PortalUserRole, Partial<Record<PortalFeatureKey, PortalAction[]>>> = {
  account_owner: Object.fromEntries(
    PORTAL_FEATURES.map((f) => [
      f.key,
      [
        'view',
        'request',
        'create',
        'edit',
        'sign',
        'pay',
        'download',
        'message',
        'manage_users',
        'manage_contacts',
      ] as PortalAction[],
    ]),
  ) as Partial<Record<PortalFeatureKey, PortalAction[]>>,

  authorized_contact: {
    dashboard: ['view'],
    properties: ['view'],
    consultations: ['view', 'request'],
    mockups: ['view'],
    proposals: ['view', 'sign'],
    agreements: ['view', 'sign'],
    e_sign: ['view', 'sign'],
    billing: ['view', 'pay', 'download'],
    online_payments: ['view', 'pay'],
    scheduling: ['view', 'request'],
    install_tracking: ['view'],
    service_requests: ['view', 'create', 'request'],
    takedowns: ['view'],
    storage: ['view'],
    messaging: ['view', 'message', 'create'],
    documents: ['view', 'download'],
    reviews: ['view', 'create'],
    referrals: ['view'],
    rebooking: ['view', 'request'],
  },

  billing_contact: {
    dashboard: ['view'],
    billing: ['view', 'pay', 'download'],
    online_payments: ['view', 'pay'],
    proposals: ['view', 'download'],
    agreements: ['view', 'download'],
    documents: ['view', 'download'],
    messaging: ['view', 'message'],
  },

  property_contact: {
    dashboard: ['view'],
    properties: ['view'],
    scheduling: ['view', 'request'],
    install_tracking: ['view'],
    service_requests: ['view', 'create', 'request'],
    takedowns: ['view'],
    storage: ['view'],
    mockups: ['view'],
    documents: ['view', 'download'],
    messaging: ['view', 'message'],
    consultations: ['view'],
  },

  view_only: Object.fromEntries(
    PORTAL_FEATURES.map((f) => [f.key, ['view', 'download'] as PortalAction[]]),
  ) as Partial<Record<PortalFeatureKey, PortalAction[]>>,
};

export function resolvePortalPermission(input: PortalPermissionInput): PortalPermissionDecision {
  if (!PORTAL_USER_ROLES.includes(input.role)) {
    return { allowed: false, reason: 'unknown_role' };
  }
  if (!PORTAL_ACTIONS.includes(input.action)) {
    return { allowed: false, reason: 'unknown_action' };
  }
  if (!FEATURE_KEYS.has(input.feature)) {
    return { allowed: false, reason: 'unknown_feature' };
  }

  const account = input.accountStatus;
  if (account === 'suspended') return { allowed: false, reason: 'account_suspended' };
  if (account === 'archived') return { allowed: false, reason: 'account_revoked' };
  if (account === 'locked') return { allowed: false, reason: 'account_locked' };
  if (account === 'not_invited' || account === 'invitation_pending') {
    return { allowed: false, reason: 'account_inactive' };
  }

  const user = input.userStatus;
  if (user === 'suspended') return { allowed: false, reason: 'user_suspended' };
  if (user === 'locked') return { allowed: false, reason: 'user_locked' };
  if (user === 'invited') return { allowed: false, reason: 'user_inactive' };

  if (!input.featureEnabled) {
    return { allowed: false, reason: 'feature_disabled' };
  }

  const allowedActions = MATRIX[input.role]?.[input.feature];
  if (!allowedActions) {
    return { allowed: false, reason: 'missing_feature_config' };
  }
  if (!allowedActions.includes(input.action)) {
    return { allowed: false, reason: 'action_not_permitted' };
  }

  return { allowed: true, reason: 'ok' };
}

export function portalRoleLabel(role: PortalUserRole): string {
  const labels: Record<PortalUserRole, string> = {
    account_owner: 'Account Owner',
    authorized_contact: 'Authorized Contact',
    billing_contact: 'Billing Contact',
    property_contact: 'Property Contact',
    view_only: 'View Only',
  };
  return labels[role] ?? role;
}

export function listPortalMatrixEntries(): Array<{
  role: PortalUserRole;
  feature: PortalFeatureKey;
  actions: PortalAction[];
}> {
  const rows: Array<{ role: PortalUserRole; feature: PortalFeatureKey; actions: PortalAction[] }> =
    [];
  for (const role of PORTAL_USER_ROLES) {
    for (const feature of PORTAL_FEATURES.map((f) => f.key)) {
      const actions = MATRIX[role]?.[feature] ?? [];
      rows.push({ role, feature, actions: [...actions] });
    }
  }
  return rows;
}
