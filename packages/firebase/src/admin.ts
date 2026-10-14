import { initializeApp, getApps, cert, applicationDefault, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getStorage, type Storage } from 'firebase-admin/storage';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

let app: App;
let auth: Auth;
let db: Firestore;
let storage: Storage;

function isGoogleCloudRuntime() {
  return Boolean(
    process.env.K_SERVICE ||
      process.env.FUNCTION_TARGET ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.GCLOUD_PROJECT,
  );
}

function readServiceAccountJson() {
  if (process.env.FIREBASE_USE_ADC === '1') return null;

  const inline = process.env.CLCRM_FIREBASE_ADMIN_KEY ?? process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (inline?.trim()) return inline.trim();

  const filePath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ??
    process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!filePath?.trim()) return null;

  const absolute = resolve(filePath.trim());
  if (!existsSync(absolute)) {
    console.warn(
      `[firebase-admin] Service account file not found: ${absolute} — falling back to Application Default Credentials.`,
    );
    return null;
  }
  return readFileSync(absolute, 'utf8');
}

function initAdmin() {
  if (getApps().length) {
    app = getApps()[0]!;
    return;
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? process.env.GOOGLE_CLOUD_PROJECT ?? 'yuletide-lighting';
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const serviceAccount = readServiceAccountJson();

  if (serviceAccount) {
    app = initializeApp({
      credential: cert(JSON.parse(serviceAccount)),
      projectId,
      storageBucket,
    });
    return;
  }

  // Cloud runtimes, or local `gcloud auth application-default login`
  if (isGoogleCloudRuntime() || process.env.FIREBASE_USE_ADC === '1') {
    app = initializeApp({
      credential: applicationDefault(),
      projectId,
      storageBucket,
    });
    return;
  }

  // Last resort: try ADC without the flag (works after gcloud ADC login)
  try {
    app = initializeApp({
      credential: applicationDefault(),
      projectId,
      storageBucket,
    });
    return;
  } catch {
    // fall through to unauthenticated init + warning
  }

  if (!(globalThis as unknown as { __clcrmAdminCredWarned?: boolean }).__clcrmAdminCredWarned) {
    (globalThis as unknown as { __clcrmAdminCredWarned?: boolean }).__clcrmAdminCredWarned = true;
    console.error(
      '[firebase-admin] No Admin credentials found. Local sign-in will fail.\n' +
        '  Option A: Download a service account JSON and set FIREBASE_SERVICE_ACCOUNT_PATH=C:\\\\path\\\\to\\\\key.json\n' +
        '  Option B: Paste JSON one-line into FIREBASE_SERVICE_ACCOUNT_KEY in root .env\n' +
        '  Option C: Run `gcloud auth application-default login` then set FIREBASE_USE_ADC=1',
    );
  }
  app = initializeApp({ projectId, storageBucket });
}

export function getAdminApp() {
  if (!app) initAdmin();
  return app!;
}

export function getAdminAuth() {
  if (!auth) auth = getAuth(getAdminApp());
  return auth;
}

export function getAdminFirestore() {
  if (!db) db = getFirestore(getAdminApp());
  return db;
}

export function getAdminStorage() {
  if (!storage) storage = getStorage(getAdminApp());
  return storage;
}

export { FieldValue, Timestamp };

export function orgPath(orgId: string, collection: string) {
  return `organizations/${orgId}/${collection}`;
}

export function toDate(value: FirebaseFirestore.Timestamp | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  return value.toDate();
}

export function docToData<T>(doc: FirebaseFirestore.DocumentSnapshot): T | null {
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as T;
}
