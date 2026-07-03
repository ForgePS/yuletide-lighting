export const LOGO_STORAGE_PATH_REGEX = /^organizations\/[^/]+\/.+/;

export function isValidLogoReference(value: string | null | undefined): boolean {
  if (value === undefined || value === null || value === '') return true;
  if (value.startsWith('http://') || value.startsWith('https://')) {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }
  if (value.startsWith('/api/files?path=')) return true;
  return LOGO_STORAGE_PATH_REGEX.test(value);
}

export function toFileProxyUrl(path: string) {
  return `/api/files?path=${encodeURIComponent(path)}`;
}

/** Persist storage paths; unwrap file-proxy URLs to paths. */
export function normalizeLogoReference(value: string | null | undefined): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (value.startsWith('/api/files?path=')) {
    const q = value.indexOf('?');
    if (q >= 0) {
      const path = new URLSearchParams(value.slice(q + 1)).get('path');
      if (path) return path;
    }
  }
  return value;
}

/** Resolve stored logo reference to a browser-loadable URL. */
export function logoDisplayUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/api/files')) {
    return value;
  }
  if (LOGO_STORAGE_PATH_REGEX.test(value)) return toFileProxyUrl(value);
  return value;
}
