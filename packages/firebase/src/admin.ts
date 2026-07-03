import { initializeApp, getApps, cert, applicationDefault, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getStorage, type Storage } from 'firebase-admin/storage';

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
  return process.env.CLCRM_FIREBASE_ADMIN_KEY ?? process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
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

  if (isGoogleCloudRuntime()) {
    app = initializeApp({
      credential: applicationDefault(),
      projectId,
      storageBucket,
    });
    return;
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
