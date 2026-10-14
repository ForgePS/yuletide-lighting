import type { TourProgressRecord, TourProgressStatus } from '@clcrm/types';
import { getAdminFirestore, Timestamp } from './admin';
import { mapTimestampsFromData } from './firestore-utils';

function progressPath(userId: string) {
  return `users/${userId}/tourProgress`;
}

function mapRecord(data: Record<string, unknown>): TourProgressRecord {
  const mapped = mapTimestampsFromData(data) as TourProgressRecord & {
    startedAt?: Date;
    updatedAt?: Date;
    completedAt?: Date;
    dismissedAt?: Date;
  };
  return {
    tourId: String(mapped.tourId),
    tourVersion: Number(mapped.tourVersion ?? 1),
    status: mapped.status,
    currentStep: Number(mapped.currentStep ?? 0),
    mode: mapped.mode,
    startedAt: mapped.startedAt?.toISOString?.() ?? (mapped.startedAt as string | null) ?? null,
    updatedAt: mapped.updatedAt?.toISOString?.() ?? (mapped.updatedAt as string | null) ?? null,
    completedAt: mapped.completedAt?.toISOString?.() ?? (mapped.completedAt as string | null) ?? null,
    dismissedAt: mapped.dismissedAt?.toISOString?.() ?? (mapped.dismissedAt as string | null) ?? null,
  };
}

export async function listTourProgress(userId: string): Promise<TourProgressRecord[]> {
  const db = getAdminFirestore();
  const snap = await db.collection(progressPath(userId)).get();
  return snap.docs.map((doc) => mapRecord({ tourId: doc.id, ...doc.data()! }));
}

export async function getTourProgress(
  userId: string,
  tourId: string,
): Promise<TourProgressRecord | null> {
  const db = getAdminFirestore();
  const snap = await db.doc(`${progressPath(userId)}/${tourId}`).get();
  if (!snap.exists) return null;
  return mapRecord({ tourId: snap.id, ...snap.data()! });
}

export type SaveTourProgressInput = {
  tourId: string;
  tourVersion: number;
  status: TourProgressStatus;
  currentStep: number;
  mode: TourProgressRecord['mode'];
};

export async function saveTourProgress(
  userId: string,
  input: SaveTourProgressInput,
): Promise<TourProgressRecord> {
  const db = getAdminFirestore();
  const ref = db.doc(`${progressPath(userId)}/${input.tourId}`);
  const existing = await ref.get();
  const now = Timestamp.now();

  const patch: Record<string, unknown> = {
    tourId: input.tourId,
    tourVersion: input.tourVersion,
    status: input.status,
    currentStep: input.currentStep,
    mode: input.mode,
    updatedAt: now,
  };

  if (!existing.exists) {
    patch.startedAt = now;
  }

  if (input.status === 'completed') {
    patch.completedAt = now;
    patch.dismissedAt = null;
  }

  if (input.status === 'dismissed') {
    patch.dismissedAt = now;
  }

  if (input.status === 'in-progress') {
    patch.dismissedAt = null;
    patch.completedAt = existing.data()?.completedAt ?? null;
  }

  await ref.set(patch, { merge: true });
  const saved = await ref.get();
  return mapRecord({ tourId: saved.id, ...saved.data()! });
}

export async function dismissTourProgress(
  userId: string,
  tourId: string,
): Promise<TourProgressRecord | null> {
  const existing = await getTourProgress(userId, tourId);
  if (!existing) return null;
  return saveTourProgress(userId, {
    tourId,
    tourVersion: existing.tourVersion,
    status: 'dismissed',
    currentStep: existing.currentStep,
    mode: existing.mode,
  });
}
