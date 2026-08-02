/**
 * Portal Phase 2 S5 — customer file access tickets (short-lived).
 * Prefer ticketed /api/portal/files over permanent Storage URLs.
 * ENVIRONMENT=EMULATOR for automated evidence.
 */
import {
  getPortalSecurityConfig,
  portalFileAccessTtlMs,
  PORTAL_PUBLIC_MESSAGES,
} from './portal-security-config';
import { hashPortalSecret, timingSafeEqualUtf8 } from './portal-security';
import type { PortalAuthorizedContext } from './portal360';
import { getPortalResourceScope, requirePortalOwnedRecord } from './portal-ownership';
import { colGet } from './firestore';
import { readStorageFile } from './storage';

export type PortalFileVisibility = 'customer_visible' | 'staff_only' | 'internal' | 'system';

export type PublicPortalFileDto = {
  id: string;
  name: string;
  contentType: string;
  size?: number;
  category?: string;
  createdAt?: string;
  canPreview: boolean;
  canDownload: boolean;
  /** Short-lived portal ticket URL — never a raw bucket path. */
  accessUrl: string | null;
};

type PortalFileTicketPayload = {
  v: 1;
  organizationId: string;
  customerId: string;
  portalAccountId: string;
  portalUserId: string;
  storagePath: string;
  fileId: string;
  name: string;
  contentType: string;
  visibility: PortalFileVisibility;
  exp: number;
  iat: number;
};

function fileTicketSecret(): string {
  return (
    process.env.PORTAL_FILE_TICKET_SECRET ||
    process.env.PORTAL_SESSION_SECRET ||
    'emulator-portal-file-ticket-secret-not-for-production'
  );
}

function encodeTicket(payload: PortalFileTicketPayload): string {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = hashPortalSecret(body, fileTicketSecret());
  return `${body}.${sig}`;
}

export function verifyPortalFileTicket(ticket: string): PortalFileTicketPayload | null {
  const parts = ticket.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  if (!body || !sig) return null;
  const expected = hashPortalSecret(body, fileTicketSecret());
  if (sig.length !== expected.length || !timingSafeEqualUtf8(sig, expected)) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(body, 'base64url').toString('utf8'),
    ) as PortalFileTicketPayload;
    if (parsed.v !== 1) return null;
    if (typeof parsed.exp !== 'number' || parsed.exp <= Date.now()) return null;
    if (!parsed.storagePath?.startsWith('organizations/')) return null;
    if (parsed.visibility !== 'customer_visible') return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Extract org storage path from /api/files?path=... or raw path. */
export function resolvePortalStoragePath(
  organizationId: string,
  rawUrlOrPath: string | null | undefined,
): string | null {
  if (!rawUrlOrPath) return null;
  const value = rawUrlOrPath.trim();
  if (!value) return null;

  if (value.startsWith('organizations/')) {
    return value.startsWith(`organizations/${organizationId}/`) ? value : null;
  }

  try {
    const url = value.startsWith('http') ? new URL(value) : new URL(value, 'http://portal.local');
    const pathParam = url.searchParams.get('path');
    if (pathParam?.startsWith(`organizations/${organizationId}/`)) {
      if (pathParam.includes('..') || pathParam.includes('%2e') || pathParam.includes('\\')) {
        return null;
      }
      return pathParam;
    }
  } catch {
    return null;
  }
  return null;
}

export function sanitizePortalFilename(name: string): string {
  return (
    name
      .replace(/[/\\?%*:|"<>]/g, '_')
      .replace(/\.\./g, '_')
      .replace(/^\.+/, '')
      .slice(0, 180) || 'file'
  );
}

export function assertSafePortalStoragePath(
  organizationId: string,
  customerId: string,
  path: string,
): void {
  if (!path.startsWith(`organizations/${organizationId}/`)) {
    throw new Error('PORTAL_RESOURCE_NOT_FOUND');
  }
  if (path.includes('..') || path.includes('\\') || path.includes('%2e') || path.includes('%2E')) {
    throw new Error('PORTAL_RESOURCE_NOT_FOUND');
  }
  // Prefer paths that include customer segment when present under portal-service
  if (path.includes('/portal-service/') && !path.includes(`/portal-service/${customerId}/`)) {
    throw new Error('PORTAL_RESOURCE_NOT_FOUND');
  }
}

/**
 * Create short-lived portal file access after ownership + visibility checks.
 */
export async function createPortalFileAccess(args: {
  authorized: PortalAuthorizedContext;
  fileId: string;
  name: string;
  contentType?: string;
  size?: number;
  category?: string;
  createdAt?: Date | string | null;
  /** Stored URL or storage path. */
  sourceUrlOrPath: string | null | undefined;
  visibility?: PortalFileVisibility;
  /** Optional parent ownership proof. */
  parent?: { collection: string; id: string };
  action?: 'download' | 'preview';
}): Promise<PublicPortalFileDto> {
  const visibility = args.visibility ?? 'customer_visible';
  const denied: PublicPortalFileDto = {
    id: args.fileId,
    name: sanitizePortalFilename(args.name),
    contentType: args.contentType ?? 'application/octet-stream',
    size: args.size,
    category: args.category,
    createdAt: args.createdAt
      ? args.createdAt instanceof Date
        ? args.createdAt.toISOString()
        : String(args.createdAt)
      : undefined,
    canPreview: false,
    canDownload: false,
    accessUrl: null,
  };

  if (visibility !== 'customer_visible') {
    return denied;
  }

  const scope = getPortalResourceScope(args.authorized);

  if (args.parent?.id) {
    const parent = await colGet<{ id: string; customerId?: string }>(
      scope.organizationId,
      args.parent.collection,
      args.parent.id,
    );
    try {
      requirePortalOwnedRecord({
        authorized: args.authorized,
        record: parent,
        resourceType: args.parent.collection,
      });
    } catch {
      return denied;
    }
  }

  const storagePath = resolvePortalStoragePath(scope.organizationId, args.sourceUrlOrPath);
  if (!storagePath) {
    // External HTTPS URLs are not ticketed; do not expose permanent staff proxy paths.
    // Compatibility: allow preview-only of https URLs that are not /api/files.
    const raw = args.sourceUrlOrPath?.trim() ?? '';
    if (raw.startsWith('https://') && !raw.includes('/api/files')) {
      return {
        ...denied,
        canPreview: true,
        canDownload: false,
        accessUrl: null, // force UI to use controlled preview only if we add one later
      };
    }
    return denied;
  }

  try {
    assertSafePortalStoragePath(scope.organizationId, scope.customerId, storagePath);
  } catch {
    return denied;
  }

  const cfg = getPortalSecurityConfig();
  const now = Date.now();
  const ticket = encodeTicket({
    v: 1,
    organizationId: scope.organizationId,
    customerId: scope.customerId,
    portalAccountId: scope.portalAccountId,
    portalUserId: scope.portalUserId,
    storagePath,
    fileId: args.fileId,
    name: sanitizePortalFilename(args.name),
    contentType: args.contentType ?? 'application/octet-stream',
    visibility: 'customer_visible',
    iat: now,
    exp: now + portalFileAccessTtlMs(cfg),
  });

  return {
    id: args.fileId,
    name: sanitizePortalFilename(args.name),
    contentType: args.contentType ?? 'application/octet-stream',
    size: args.size,
    category: args.category,
    createdAt: denied.createdAt,
    canPreview: true,
    canDownload: true,
    accessUrl: `/api/portal/files?ticket=${encodeURIComponent(ticket)}`,
  };
}

/** Stream file bytes after ticket verification (used by API route). */
export async function readPortalFileFromTicket(ticket: string): Promise<{
  buffer: Buffer;
  contentType: string;
  filename: string;
} | null> {
  const payload = verifyPortalFileTicket(ticket);
  if (!payload) return null;
  try {
    assertSafePortalStoragePath(payload.organizationId, payload.customerId, payload.storagePath);
  } catch {
    return null;
  }
  const file = await readStorageFile(payload.storagePath);
  if (!file) return null;
  return {
    buffer: file.buffer,
    contentType: payload.contentType || file.contentType,
    filename: payload.name,
  };
}

export function portalFileDeniedMessage(): string {
  return PORTAL_PUBLIC_MESSAGES.accessUnavailable;
}
