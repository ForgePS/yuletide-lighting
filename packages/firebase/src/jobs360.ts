import type { AppointmentType, CalendarEvent, CustomerStage, Property, ProposalRecord } from '@clcrm/types';
import { colGet, colList } from './firestore';
import { updateCustomerPipelineStage } from './customer360';

export type OrgJobRecord = {
  id: string;
  customerId?: string;
  propertyId?: string | null;
  proposalId?: string | null;
  title: string;
  stage: string;
  assignedCrewUserId?: string | null;
  scheduledStart?: Date | null;
  scheduledEnd?: Date | null;
  installedAt?: Date | null;
  removedAt?: Date | null;
  subtotalCents?: number | null;
  jobType?: string | null;
  estimatedHours?: number | null;
  installNotes?: string | null;
  internalNotes?: string | null;
};

export type JobMaterialRow = {
  id: string;
  jobId: string;
  inventoryItemId: string;
  name?: string;
  quantity: number;
  status: 'planned' | 'reserved' | 'consumed';
};

export type Job360Detail = {
  job: OrgJobRecord;
  customer: {
    id: string;
    firstName?: string;
    lastName?: string;
    businessName?: string | null;
    email?: string | null;
    phone?: string | null;
    pipelineStage?: string | null;
  } | null;
  property: Property | null;
  proposal: ProposalRecord | null;
  mockups: Array<{ id: string; name: string; imageUrl: string; renderedImageUrl?: string | null }>;
  materials: JobMaterialRow[];
  calendarEvent: CalendarEvent | null;
};

const JOB_STAGE_TO_PIPELINE: Partial<Record<string, CustomerStage>> = {
  scheduled: 'scheduled',
  installed: 'installed',
  removal_scheduled: 'removal_scheduled',
  removed: 'removed',
  deposit_paid: 'deposit_paid',
};

const APPOINTMENT_TO_PIPELINE_ON_SCHEDULE: Partial<Record<AppointmentType, CustomerStage>> = {
  installation: 'scheduled',
  takedown: 'removal_scheduled',
  permanent_lighting_install: 'scheduled',
  commercial_project: 'scheduled',
};

const APPOINTMENT_TO_PIPELINE_ON_COMPLETE: Partial<Record<AppointmentType, CustomerStage>> = {
  installation: 'installed',
  takedown: 'removed',
  permanent_lighting_install: 'installed',
  commercial_project: 'installed',
};

export async function syncCustomerPipelineFromJob(
  orgId: string,
  customerId: string,
  stage: string,
  userId?: string | null,
) {
  const pipelineStage = JOB_STAGE_TO_PIPELINE[stage];
  if (pipelineStage) {
    await updateCustomerPipelineStage(orgId, customerId, pipelineStage, userId, 'System');
  }
}

export async function syncCustomerPipelineFromAppointment(
  orgId: string,
  customerId: string,
  appointmentType: AppointmentType,
  action: 'scheduled' | 'completed',
  userId?: string | null,
) {
  const map = action === 'scheduled' ? APPOINTMENT_TO_PIPELINE_ON_SCHEDULE : APPOINTMENT_TO_PIPELINE_ON_COMPLETE;
  const stage = map[appointmentType];
  if (stage) {
    await updateCustomerPipelineStage(orgId, customerId, stage, userId, 'System');
  }
}

export async function getJob360(orgId: string, jobId: string): Promise<Job360Detail | null> {
  const job = await colGet<OrgJobRecord>(orgId, 'jobs', jobId);
  if (!job) return null;

  const [customer, property, proposal, materialsRaw, events] = await Promise.all([
    job.customerId ? colGet<Job360Detail['customer'] & { id: string }>(orgId, 'customers', job.customerId) : null,
    job.propertyId ? colGet<Property>(orgId, 'properties', job.propertyId) : null,
    job.proposalId ? colGet<ProposalRecord>(orgId, 'proposals', job.proposalId) : null,
    colList<{ id: string; jobId: string; inventoryItemId: string; quantity: number; status: JobMaterialRow['status'] }>(orgId, 'jobMaterials'),
    colList<{ id: string; jobId?: string | null } & Record<string, unknown>>(orgId, 'calendarEvents'),
  ]);

  const jobMaterials = materialsRaw.filter((m) => m.jobId === jobId);
  const materials: JobMaterialRow[] = await Promise.all(
    jobMaterials.map(async (m) => {
      const item = await colGet<{ name?: string }>(orgId, 'inventoryItems', m.inventoryItemId);
      return { ...m, name: item?.name ?? 'Item' };
    }),
  );

  let mockups: Job360Detail['mockups'] = [];
  if (proposal?.mockupIds?.length) {
    mockups = (
      await Promise.all(
        proposal.mockupIds.map((id) =>
          colGet<{ id: string; name: string; imageUrl: string; renderedImageUrl?: string | null }>(orgId, 'mockups', id),
        ),
      )
    ).filter(Boolean) as Job360Detail['mockups'];
  }

  const eventRow = events.find((e) => e.jobId === jobId);
  const calendarEvent = eventRow
    ? ({
        id: eventRow.id,
        organizationId: orgId,
        title: String(eventRow.title ?? job.title),
        appointmentType: (eventRow.appointmentType as CalendarEvent['appointmentType']) ?? 'installation',
        category: (eventRow.category as CalendarEvent['category']) ?? 'installation',
        customerId: job.customerId,
        customerName: customer ? `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() : null,
        propertyId: job.propertyId ?? null,
        propertyAddress: property ? `${property.addressLine1}, ${property.city} ${property.state}` : null,
        jobId,
        proposalId: job.proposalId ?? null,
        crewId: (eventRow.crewId as string) ?? null,
        crewName: (eventRow.crewName as string) ?? null,
        vehicleId: (eventRow.vehicleId as string) ?? null,
        startAt: eventRow.startAt instanceof Date ? eventRow.startAt : new Date(String(eventRow.startAt)),
        endAt: eventRow.endAt instanceof Date ? eventRow.endAt : new Date(String(eventRow.endAt)),
        allDay: Boolean(eventRow.allDay),
        color: String(eventRow.color ?? '#DC2626'),
        notes: (eventRow.notes as string) ?? null,
        dispatchStatus: (eventRow.dispatchStatus as CalendarEvent['dispatchStatus']) ?? 'scheduled',
        estimatedRevenueCents: Number(eventRow.estimatedRevenueCents ?? job.subtotalCents ?? 0),
        weatherRisk: Boolean(eventRow.weatherRisk),
        holidayEventType: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: null,
        updatedBy: null,
      } satisfies CalendarEvent)
    : null;

  return { job: { ...job, id: jobId }, customer, property, proposal, mockups, materials, calendarEvent };
}

export function inferAppointmentTypeFromJob(job: OrgJobRecord): AppointmentType {
  if (job.jobType === 'takedown' || job.stage === 'removal_scheduled') return 'takedown';
  if (job.jobType === 'service_call' || job.jobType === 'repair') return 'service_call';
  if (job.jobType === 'commercial') return 'commercial_project';
  return 'installation';
}
