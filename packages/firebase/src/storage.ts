import { getAdminStorage } from './admin';
import { nanoid } from 'nanoid';

import {
  assertStaffUploadContract,
  sanitizeStorageFilename,
  sanitizeStorageFolder,
  toFileProxyUrl as toFileProxyUrlFromTypes,
} from '@clcrm/types';

export function toFileProxyUrl(path: string) {
  return toFileProxyUrlFromTypes(path);
}

export async function getSignedReadUrl(path: string, expiresMs = 60 * 60 * 1000) {
  const bucket = getAdminStorage().bucket();
  const [url] = await bucket.file(path).getSignedUrl({
    action: 'read',
    expires: Date.now() + expiresMs,
  });
  return url;
}

export async function readStorageFile(path: string) {
  const bucket = getAdminStorage().bucket();
  const file = bucket.file(path);
  const [exists] = await file.exists();
  if (!exists) return null;
  const [metadata] = await file.getMetadata();
  const [buffer] = await file.download();
  return {
    buffer,
    contentType: metadata.contentType ?? 'application/octet-stream',
  };
}

export async function uploadFile(
  orgId: string,
  folder: string,
  buffer: Buffer,
  contentType: string,
  filename?: string,
): Promise<{ path: string; url: string }> {
  const contract = assertStaffUploadContract({
    contentType,
    sizeBytes: buffer.byteLength,
    folder,
  });
  const bucket = getAdminStorage().bucket();
  const safeName = sanitizeStorageFilename(filename ?? `${nanoid()}-${Date.now()}`);
  const path = `organizations/${orgId}/${contract.folder}/${safeName}`;
  const file = bucket.file(path);

  await file.save(buffer, {
    metadata: { contentType: contract.contentType },
  });

  return { path, url: toFileProxyUrl(path) };
}

export async function uploadFromUrl(orgId: string, folder: string, url: string): Promise<{ path: string; url: string }> {
  const res = await fetch(url);
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get('content-type') ?? 'image/jpeg';
  return uploadFile(orgId, folder, buffer, contentType);
}

export async function uploadPlatformFile(
  folder: string,
  buffer: Buffer,
  contentType: string,
  filename?: string,
): Promise<{ path: string; url: string }> {
  const contract = assertStaffUploadContract({
    contentType,
    sizeBytes: buffer.byteLength,
    folder,
  });
  const bucket = getAdminStorage().bucket();
  const safeName = sanitizeStorageFilename(filename ?? `${nanoid()}-${Date.now()}`);
  const safeFolder = sanitizeStorageFolder(contract.folder);
  const path = `platform/website/${safeFolder}/${safeName}`;
  const file = bucket.file(path);

  await file.save(buffer, {
    metadata: { contentType: contract.contentType },
  });

  return { path, url: toFileProxyUrl(path) };
}

export async function deleteStoragePath(path: string): Promise<void> {
  const bucket = getAdminStorage().bucket();
  const file = bucket.file(path);
  const [exists] = await file.exists();
  if (exists) await file.delete();
}
