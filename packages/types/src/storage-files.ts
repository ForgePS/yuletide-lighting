/** YL-S15 — staff Admin Storage upload/proxy contract (mirrors storage.rules intent). */

export const STAFF_UPLOAD_MAX_BYTES = 15 * 1024 * 1024;

/** Content types allowed for staff Admin uploads (image/* + PDF). */
export const STAFF_ALLOWED_CONTENT_TYPE_RE = /^(image\/[a-z0-9.+-]+|application\/pdf)$/i;

export function sanitizeStorageFolder(folder: string | null | undefined): string {
  const raw = typeof folder === 'string' ? folder.trim() : '';
  if (!raw) return 'uploads';
  const cleaned = raw
    .replace(/\\/g, '/')
    .split('/')
    .map((seg) => seg.trim())
    .filter((seg) => seg && seg !== '.' && seg !== '..')
    .map((seg) => seg.replace(/[^\w.\-]+/g, '_'))
    .filter(Boolean);
  return cleaned.length > 0 ? cleaned.join('/') : 'uploads';
}

export function sanitizeStorageFilename(filename: string | null | undefined): string {
  const raw = typeof filename === 'string' ? filename.trim() : '';
  const cleaned = raw.replace(/[^\w.\-]+/g, '_').replace(/^\.+/, '').slice(0, 180);
  return cleaned || `file-${Date.now()}`;
}

/**
 * Fail-closed org path check for staff `/api/files` (and similar).
 * Rejects traversal, wrong org prefix, and encoded dots.
 */
export function assertSafeOrgStoragePath(organizationId: string, path: string): void {
  const orgId = String(organizationId ?? '').trim();
  const value = String(path ?? '').trim();
  if (!orgId || !value) throw new Error('FORBIDDEN_STORAGE_PATH');
  const prefix = `organizations/${orgId}/`;
  if (!value.startsWith(prefix)) throw new Error('FORBIDDEN_STORAGE_PATH');
  if (
    value.includes('..') ||
    value.includes('\\') ||
    value.includes('%2e') ||
    value.includes('%2E')
  ) {
    throw new Error('FORBIDDEN_STORAGE_PATH');
  }
  // No empty path segments after org root
  const rest = value.slice(prefix.length);
  if (!rest || rest.split('/').some((seg) => !seg || seg === '.' || seg === '..')) {
    throw new Error('FORBIDDEN_STORAGE_PATH');
  }
}

export function isSafeOrgStoragePath(organizationId: string, path: string): boolean {
  try {
    assertSafeOrgStoragePath(organizationId, path);
    return true;
  } catch {
    return false;
  }
}

export function assertStaffUploadContract(input: {
  contentType: string | null | undefined;
  sizeBytes: number;
  folder?: string | null;
}): { contentType: string; folder: string } {
  const contentType = typeof input.contentType === 'string' ? input.contentType.trim() : '';
  if (!contentType || !STAFF_ALLOWED_CONTENT_TYPE_RE.test(contentType)) {
    throw new Error('UNSUPPORTED_CONTENT_TYPE');
  }
  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0) {
    throw new Error('INVALID_FILE_SIZE');
  }
  if (input.sizeBytes > STAFF_UPLOAD_MAX_BYTES) {
    throw new Error('FILE_TOO_LARGE');
  }
  return {
    contentType,
    folder: sanitizeStorageFolder(input.folder),
  };
}

/** Portal photo upload allowlist (aligned validator ↔ uploadPortalPhoto). */
export const PORTAL_PHOTO_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;

export type PortalPhotoContentType = (typeof PORTAL_PHOTO_CONTENT_TYPES)[number];

export function isPortalPhotoContentType(value: string | null | undefined): value is PortalPhotoContentType {
  return PORTAL_PHOTO_CONTENT_TYPES.includes(value as PortalPhotoContentType);
}

/** Document portal visibility — fail-closed unless explicitly customer_visible. */
export function isCustomerVisibleDocument(
  visibility: string | null | undefined,
): boolean {
  return String(visibility ?? '').trim().toLowerCase() === 'customer_visible';
}

export function normalizeDocumentVisibility(
  visibility: string | null | undefined,
  fallback: 'customer_visible' | 'staff_only' = 'staff_only',
): 'customer_visible' | 'staff_only' | 'internal' | 'system' {
  const v = String(visibility ?? '').trim().toLowerCase();
  if (v === 'customer_visible' || v === 'staff_only' || v === 'internal' || v === 'system') {
    return v;
  }
  return fallback;
}
