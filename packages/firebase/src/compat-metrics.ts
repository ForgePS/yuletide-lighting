/**
 * Compatibility / deprecation metrics for legacy path freezes.
 * Production: sanitized counters only (no PII).
 */
export function emitLegacyPathDeprecation(domain: string, operation: string) {
  const payload = {
    type: 'legacy_path_deprecation',
    domain,
    operation,
    at: new Date().toISOString(),
  };
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[deprecation] legacy ${domain} ${operation} — use canonical org path`);
  }
  // Hook for future metrics backends without leaking record contents.
  if (typeof process !== 'undefined' && process.env.COMPAT_METRICS_DEBUG === '1') {
    console.info(JSON.stringify(payload));
  }
}
