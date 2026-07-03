import { getAdminStorage } from './admin';
import { nanoid } from 'nanoid';

import { toFileProxyUrl as toFileProxyUrlFromTypes } from '@clcrm/types';

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
  const bucket = getAdminStorage().bucket();
  const safeName = (filename ?? `${nanoid()}-${Date.now()}`).replace(/[^\w.\-]+/g, '_');
  const path = `organizations/${orgId}/${folder}/${safeName}`;
  const file = bucket.file(path);

  await file.save(buffer, {
    metadata: { contentType },
  });

  return { path, url: toFileProxyUrl(path) };
}

export async function uploadFromUrl(orgId: string, folder: string, url: string): Promise<{ path: string; url: string }> {
  const res = await fetch(url);
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get('content-type') ?? 'image/jpeg';
  return uploadFile(orgId, folder, buffer, contentType);
}

export function storagePath(orgId: string, folder: string, filename: string) {
  return `organizations/${orgId}/${folder}/${filename}`;
}
