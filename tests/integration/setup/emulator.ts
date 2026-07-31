/**
 * Firestore emulator bootstrap for integration tests.
 * Prefer `firebase emulators:exec` which already sets FIRESTORE_EMULATOR_HOST.
 */

export const INTEGRATION_PROJECT_ID = 'yuletide-rules-test';

let configured = false;

/** Ensure Admin SDK talks to the Firestore emulator (never production). */
export function ensureFirestoreEmulator(): { host: string; projectId: string } {
  const host = process.env.FIRESTORE_EMULATOR_HOST?.trim();
  if (!host) {
    throw new Error(
      [
        'FIRESTORE_EMULATOR_HOST is not set.',
        'Run integration tests via:',
        '  npm run test:integration',
        'which wraps: firebase emulators:exec --only firestore --project yuletide-rules-test "vitest run tests/integration"',
      ].join('\n'),
    );
  }

  if (!configured) {
    process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || INTEGRATION_PROJECT_ID;
    process.env.GOOGLE_CLOUD_PROJECT = process.env.GOOGLE_CLOUD_PROJECT || INTEGRATION_PROJECT_ID;
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID =
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || INTEGRATION_PROJECT_ID;
    // Avoid accidental ADC / production credential paths during tests.
    process.env.FIREBASE_USE_ADC = '0';
    configured = true;
  }

  return { host, projectId: process.env.GCLOUD_PROJECT || INTEGRATION_PROJECT_ID };
}

export function isFirestoreEmulatorConfigured(): boolean {
  return Boolean(process.env.FIRESTORE_EMULATOR_HOST?.trim());
}
