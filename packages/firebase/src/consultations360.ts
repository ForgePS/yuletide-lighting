/**
 * Phase 1 — Consultation / property survey between qualification and proposal.
 */

import { getAdminFirestore, Timestamp } from './admin';
import { mapTimestampsFromData } from './firestore-utils';
import { logCustomerActivity, updateCustomerPipelineStage } from './customer360';
import type { DocumentData } from 'firebase-admin/firestore';

function ts() {
  return Timestamp.now();
}

export type ConsultationType =
  | 'phone'
  | 'virtual'
  | 'on_site'
  | 'returning_customer'
  | 'commercial_site_survey';

export type ConsultationStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

export type ConsultationRecord = {
  id: string;
  organizationId: string;
  customerId: string;
  propertyId?: string | null;
  consultationType: ConsultationType;
  status: ConsultationStatus;
  scheduledAt?: Date | null;
  completedAt?: Date | null;
  assignedUserId?: string | null;
  assignedUserName?: string | null;
  customerGoals?: string | null;
  budgetRange?: string | null;
  preferredColors?: string | null;
  preferredLightStyle?: string | null;
  powerAvailability?: string | null;
  accessRequirements?: string | null;
  safetyConcerns?: string | null;
  measurementsNotes?: string | null;
  followUpAction?: string | null;
  notes?: string | null;
  photoUrls: string[];
  createdAt: Date;
  updatedAt: Date;
};

function collection(orgId: string) {
  return getAdminFirestore().collection(`organizations/${orgId}/consultations`);
}

function mapDoc(id: string, data: DocumentData): ConsultationRecord {
  return mapTimestampsFromData({ id, ...data }) as ConsultationRecord;
}

export async function listConsultations360(orgId: string, customerId?: string) {
  let snap;
  if (customerId) {
    snap = await collection(orgId).where('customerId', '==', customerId).get();
  } else {
    snap = await collection(orgId).orderBy('createdAt', 'desc').limit(100).get();
  }
  return snap.docs
    .map((d) => mapDoc(d.id, d.data()))
    .sort((a, b) => (b.scheduledAt?.getTime?.() ?? b.createdAt.getTime()) - (a.scheduledAt?.getTime?.() ?? a.createdAt.getTime()));
}

export async function createConsultation360(
  orgId: string,
  input: {
    customerId: string;
    propertyId?: string | null;
    consultationType: ConsultationType;
    scheduledAt?: Date | null;
    assignedUserId?: string | null;
    assignedUserName?: string | null;
    customerGoals?: string | null;
    budgetRange?: string | null;
    notes?: string | null;
  },
  userId?: string | null,
) {
  const ref = collection(orgId).doc();
  const now = ts();
  const data = {
    organizationId: orgId,
    customerId: input.customerId,
    propertyId: input.propertyId ?? null,
    consultationType: input.consultationType,
    status: 'scheduled' as const,
    scheduledAt: input.scheduledAt ?? null,
    completedAt: null,
    assignedUserId: input.assignedUserId ?? null,
    assignedUserName: input.assignedUserName ?? null,
    customerGoals: input.customerGoals ?? null,
    budgetRange: input.budgetRange ?? null,
    preferredColors: null,
    preferredLightStyle: null,
    powerAvailability: null,
    accessRequirements: null,
    safetyConcerns: null,
    measurementsNotes: null,
    followUpAction: null,
    notes: input.notes ?? null,
    photoUrls: [] as string[],
    createdAt: now,
    updatedAt: now,
    createdBy: userId ?? null,
  };
  await ref.set(data);
  await updateCustomerPipelineStage(orgId, input.customerId, 'consultation_scheduled', userId, 'System');
  await logCustomerActivity(
    orgId,
    input.customerId,
    'consultation_scheduled',
    `Consultation scheduled (${input.consultationType.replace(/_/g, ' ')})`,
    userId,
    'System',
    { relatedRecordType: 'consultation', relatedRecordId: ref.id, relatedRecordLabel: input.consultationType },
  );
  return mapDoc(ref.id, data);
}

export async function completeConsultation360(
  orgId: string,
  consultationId: string,
  input: {
    notes?: string | null;
    measurementsNotes?: string | null;
    followUpAction?: string | null;
    customerGoals?: string | null;
    budgetRange?: string | null;
    safetyConcerns?: string | null;
  },
  userId?: string | null,
) {
  const ref = collection(orgId).doc(consultationId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Consultation not found');
  const existing = snap.data()!;
  const now = ts();
  const patch = {
    status: 'completed' as const,
    completedAt: now,
    updatedAt: now,
    notes: input.notes ?? existing.notes ?? null,
    measurementsNotes: input.measurementsNotes ?? existing.measurementsNotes ?? null,
    followUpAction: input.followUpAction ?? existing.followUpAction ?? null,
    customerGoals: input.customerGoals ?? existing.customerGoals ?? null,
    budgetRange: input.budgetRange ?? existing.budgetRange ?? null,
    safetyConcerns: input.safetyConcerns ?? existing.safetyConcerns ?? null,
  };
  await ref.update(patch);
  await updateCustomerPipelineStage(orgId, existing.customerId, 'consultation_completed', userId, 'System');
  await logCustomerActivity(
    orgId,
    existing.customerId,
    'consultation_completed',
    'Consultation completed',
    userId,
    'System',
    { relatedRecordType: 'consultation', relatedRecordId: consultationId },
  );
  return mapDoc(consultationId, { ...existing, ...patch });
}
