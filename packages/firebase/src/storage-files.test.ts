import { describe, expect, it } from 'vitest';
import {
  assertSafeOrgStoragePath,
  assertStaffUploadContract,
  formatStorageLabel,
  isCustomerVisibleDocument,
  isPortalPhotoContentType,
  isSafeOrgStoragePath,
  normalizeDocumentVisibility,
  sanitizeStorageFolder,
  STAFF_UPLOAD_MAX_BYTES,
} from '@clcrm/types';

describe('YL-S15 storage file helpers', () => {
  it('sanitizes storage folders and blocks traversal segments', () => {
    expect(sanitizeStorageFolder('../secret')).toBe('secret');
    expect(sanitizeStorageFolder('a/../b/./c')).toBe('a/b/c');
    expect(sanitizeStorageFolder('')).toBe('uploads');
    expect(sanitizeStorageFolder('job photos!!')).toBe('job_photos_');
  });

  it('assertSafeOrgStoragePath fail-closes on traversal and wrong org', () => {
    expect(isSafeOrgStoragePath('orgA', 'organizations/orgA/uploads/x.jpg')).toBe(true);
    expect(isSafeOrgStoragePath('orgA', 'organizations/orgB/uploads/x.jpg')).toBe(false);
    expect(isSafeOrgStoragePath('orgA', 'organizations/orgA/../orgB/x')).toBe(false);
    expect(isSafeOrgStoragePath('orgA', 'organizations/orgA/%2e%2e/x')).toBe(false);
    expect(() => assertSafeOrgStoragePath('orgA', 'organizations/orgA/')).toThrow(
      'FORBIDDEN_STORAGE_PATH',
    );
  });

  it('enforces staff upload MIME and size contract', () => {
    expect(
      assertStaffUploadContract({
        contentType: 'image/jpeg',
        sizeBytes: 1024,
        folder: 'photos',
      }),
    ).toEqual({ contentType: 'image/jpeg', folder: 'photos' });
    expect(() =>
      assertStaffUploadContract({
        contentType: 'application/zip',
        sizeBytes: 10,
      }),
    ).toThrow('UNSUPPORTED_CONTENT_TYPE');
    expect(() =>
      assertStaffUploadContract({
        contentType: 'image/png',
        sizeBytes: STAFF_UPLOAD_MAX_BYTES + 1,
      }),
    ).toThrow('FILE_TOO_LARGE');
  });

  it('formats null-safe storage labels', () => {
    expect(formatStorageLabel(null)).toBe('Unknown');
    expect(formatStorageLabel('customer_owned')).toBe('Customer Owned');
  });

  it('fail-closes document visibility unless explicitly customer_visible', () => {
    expect(isCustomerVisibleDocument(null)).toBe(false);
    expect(isCustomerVisibleDocument(undefined)).toBe(false);
    expect(isCustomerVisibleDocument('staff_only')).toBe(false);
    expect(isCustomerVisibleDocument('customer_visible')).toBe(true);
    expect(normalizeDocumentVisibility(null)).toBe('staff_only');
    expect(normalizeDocumentVisibility('customer_visible')).toBe('customer_visible');
  });

  it('aligns portal photo content types including HEIC', () => {
    expect(isPortalPhotoContentType('image/heic')).toBe(true);
    expect(isPortalPhotoContentType('image/heif')).toBe(true);
    expect(isPortalPhotoContentType('image/jpeg')).toBe(true);
    expect(isPortalPhotoContentType('application/pdf')).toBe(false);
  });
});
