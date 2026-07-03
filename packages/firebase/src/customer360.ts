import type {
  ActivityType,
  CommunicationRecord,
  CustomerActivity,
  CustomerInsights,
  CustomerListItem,
  CustomerOverviewStats,
  CustomerPipelineColumn,
  CustomerPipelineItem,
  CustomerPortalAccess,
  CustomerStage,
  CustomerStatus,
  CustomerType,
  DesignRecord,
  FollowUpRule,
  HealthRating,
  InstallComplexity,
  JobRecord,
  Property,
  PropertyListEntry,
  PropertyProfileType,
  StorageInventoryItem,
} from '@clcrm/types';
import { getAdminFirestore, Timestamp } from './admin';
import type { CustomerRecord, PropertyRecord } from './firestore';
import { getCustomer, updateCustomer } from './firestore';
import { mapTimestampsFromData } from './firestore-utils';

function ts() {
  return Timestamp.now();
}

function customerBase(orgId: string, customerId: string) {
  return `organizations/${orgId}/customers/${customerId}`;
}

function subPath(orgId: string, customerId: string, sub: string) {
  return `${customerBase(orgId, customerId)}/${sub}`;
}

async function subList<T>(orgId: string, customerId: string, sub: string, orderField = 'createdAt'): Promise<T[]> {
  const db = getAdminFirestore();
  const snap = await db.collection(subPath(orgId, customerId, sub)).orderBy(orderField, 'desc').get();
  return snap.docs.map((d) => mapTimestampsFromData({ id: d.id, ...d.data()! }) as T);
}

async function subGet<T>(orgId: string, customerId: string, sub: string, id: string): Promise<T | null> {
  const db = getAdminFirestore();
  const snap = await db.doc(`${subPath(orgId, customerId, sub)}/${id}`).get();
  if (!snap.exists) return null;
  return mapTimestampsFromData({ id: snap.id, ...snap.data()! }) as T;
}

async function subCreate<T extends Record<string, unknown>>(
  orgId: string,
  customerId: string,
  sub: string,
  data: T,
  userId?: string | null,
): Promise<T & { id: string }> {
  const db = getAdminFirestore();
  const ref = db.collection(subPath(orgId, customerId, sub)).doc();
  const now = ts();
  await ref.set({
    customerId,
    ...data,
    createdAt: now,
    updatedAt: now,
    createdBy: userId ?? null,
    updatedBy: userId ?? null,
  });
  const snap = await ref.get();
  return mapTimestampsFromData({ id: snap.id, ...snap.data()! }) as T & { id: string };
}

async function subUpdate(
  orgId: string,
  customerId: string,
  sub: string,
  id: string,
  data: Record<string, unknown>,
  userId?: string | null,
) {
  const db = getAdminFirestore();
  await db.doc(`${subPath(orgId, customerId, sub)}/${id}`).update({
    ...data,
    updatedAt: ts(),
    updatedBy: userId ?? null,
  });
  return subGet(orgId, customerId, sub, id);
}

async function subDelete(orgId: string, customerId: string, sub: string, id: string) {
  const db = getAdminFirestore();
  await db.doc(`${subPath(orgId, customerId, sub)}/${id}`).delete();
}

type CustomerInvoiceRevenueSummary = {
  lifetimeRevenueCents: number;
  currentSeasonRevenueCents: number;
  outstandingBalanceCents: number;
  invoicedCents: number;
};

function emptyRevenueSummary(): CustomerInvoiceRevenueSummary {
  return {
    lifetimeRevenueCents: 0,
    currentSeasonRevenueCents: 0,
    outstandingBalanceCents: 0,
    invoicedCents: 0,
  };
}

function invoiceRevenueDate(raw: Record<string, unknown>) {
  const paidAt = raw.paidAt instanceof Date ? raw.paidAt : null;
  const updatedAt = raw.updatedAt instanceof Date ? raw.updatedAt : null;
  const createdAt = raw.createdAt instanceof Date ? raw.createdAt : null;
  return paidAt ?? updatedAt ?? createdAt;
}

async function getInvoiceRevenueSummaries(
  orgId: string,
  customerIds?: string[],
  revenueYear?: number | null,
): Promise<Map<string, CustomerInvoiceRevenueSummary>> {
  const customerIdSet = customerIds?.length ? new Set(customerIds) : null;
  const db = getAdminFirestore();
  const currentYear = new Date().getFullYear();
  const byCustomer = new Map<string, CustomerInvoiceRevenueSummary>();

  const invoiceDocs: Record<string, unknown>[] = [];
  if (customerIdSet && customerIds!.length > 0) {
    for (let i = 0; i < customerIds!.length; i += 10) {
      const chunk = customerIds!.slice(i, i + 10);
      const snap = await db.collection(`organizations/${orgId}/invoices`).where('customerId', 'in', chunk).get();
      for (const doc of snap.docs) {
        invoiceDocs.push(mapTimestampsFromData({ id: doc.id, ...doc.data()! }) as Record<string, unknown>);
      }
    }
  } else {
    const snap = await db.collection(`organizations/${orgId}/invoices`).get();
    for (const doc of snap.docs) {
      invoiceDocs.push(mapTimestampsFromData({ id: doc.id, ...doc.data()! }) as Record<string, unknown>);
    }
  }

  for (const invoice of invoiceDocs) {
    const customerId = String(invoice.customerId ?? '');
    if (!customerId || (customerIdSet && !customerIdSet.has(customerId))) continue;

    const subtotalCents = Number(invoice.subtotalCents ?? 0);
    const paidCents = Number(invoice.amountPaidCents ?? 0);
    const status = String(invoice.status ?? '');
    const balanceDueCents = status === 'void' ? 0 : Math.max(0, subtotalCents - paidCents);
    const date = invoiceRevenueDate(invoice);
    const summary = byCustomer.get(customerId) ?? emptyRevenueSummary();
    const paidYear = date?.getFullYear() ?? null;
    const inSelectedYear = revenueYear != null ? paidYear === revenueYear : true;
    const inCurrentYear = paidYear === currentYear;

    if (revenueYear != null) {
      if (paidCents > 0 && inSelectedYear) {
        summary.lifetimeRevenueCents += paidCents;
        summary.currentSeasonRevenueCents += paidCents;
      }
      if (inSelectedYear) {
        summary.invoicedCents += subtotalCents;
      }
    } else {
      summary.lifetimeRevenueCents += paidCents;
      summary.invoicedCents += subtotalCents;
      if (date && paidCents > 0 && inCurrentYear) {
        summary.currentSeasonRevenueCents += paidCents;
      }
    }
    summary.outstandingBalanceCents += balanceDueCents;
    byCustomer.set(customerId, summary);
  }

  return byCustomer;
}

function legacyPropertyTo360(p: PropertyRecord): Property {
  return {
    id: p.id,
    customerId: p.customerId,
    propertyName: p.label || 'Primary',
    propertyType: null,
    label: p.label,
    addressLine1: p.addressLine1,
    addressLine2: p.addressLine2,
    city: p.city,
    state: p.state,
    postalCode: p.postalCode,
    country: p.country,
    latitude: p.latitude,
    longitude: p.longitude,
    gateCode: null,
    hoaInfo: null,
    accessInstructions: null,
    installNotes: p.installNotes,
    powerSourceLocations: null,
    gfciNotes: null,
    ladderAccessPoints: null,
    ladderRequired: false,
    liftRequired: false,
    roofMeasurementNotes: null,
    estimatedRooflineFeet: null,
    peaks: null,
    treeCount: null,
    shrubCount: null,
    wreathLocations: null,
    garlandLocations: null,
    siteHazards: [],
    siteHazardNotes: null,
    installComplexity: 'medium',
    previousYearDesignNotes: null,
    photos: {},
    galleryPhotos: [],
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

function property360ToLegacy(p: Property, orgId: string): Omit<PropertyRecord, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    organizationId: orgId,
    customerId: p.customerId,
    label: p.label || p.propertyName,
    addressLine1: p.addressLine1,
    addressLine2: p.addressLine2 ?? null,
    city: p.city,
    state: p.state,
    postalCode: p.postalCode,
    country: p.country,
    latitude: p.latitude ?? null,
    longitude: p.longitude ?? null,
    installNotes: p.installNotes ?? p.accessInstructions ?? null,
  };
}

export async function listCustomerProperties360(orgId: string, customerId: string): Promise<Property[]> {
  const subProps = await subList<Property>(orgId, customerId, 'properties');
  if (subProps.length > 0) return subProps.map(normalizeProperty);

  const db = getAdminFirestore();
  const legacy = await db
    .collection(`organizations/${orgId}/properties`)
    .where('customerId', '==', customerId)
    .get();
  return legacy.docs.map((d) =>
    normalizeProperty(legacyPropertyTo360(mapTimestampsFromData({ id: d.id, ...d.data()! }) as PropertyRecord)),
  );
}

function normalizeProperty(p: Property): Property {
  return {
    ...p,
    siteHazards: p.siteHazards ?? [],
    photos: p.photos ?? {},
    galleryPhotos: p.galleryPhotos ?? [],
    ladderRequired: p.ladderRequired ?? false,
    liftRequired: p.liftRequired ?? false,
    installComplexity: p.installComplexity ?? 'medium',
  };
}

export async function getCustomerProperty360(
  orgId: string,
  customerId: string,
  propertyId: string,
): Promise<Property | null> {
  const prop = await subGet<Property>(orgId, customerId, 'properties', propertyId);
  if (prop) return normalizeProperty(prop);

  const db = getAdminFirestore();
  const snap = await db.doc(`organizations/${orgId}/properties/${propertyId}`).get();
  if (!snap.exists) return null;
  const data = mapTimestampsFromData({ id: snap.id, ...snap.data()! }) as PropertyRecord;
  if (data.customerId !== customerId) return null;
  return normalizeProperty(legacyPropertyTo360(data));
}

function customerDisplayName(c: CustomerRecord): string {
  if (c.businessName?.trim()) return c.businessName.trim();
  return `${c.firstName} ${c.lastName}`.trim();
}

export async function listAllProperties360(
  orgId: string,
  opts?: {
    search?: string;
    propertyProfileType?: PropertyProfileType;
    installComplexity?: InstallComplexity;
  },
): Promise<PropertyListEntry[]> {
  const db = getAdminFirestore();
  let customerSnap;
  try {
    customerSnap = await db.collection(`organizations/${orgId}/customers`).orderBy('createdAt', 'desc').get();
  } catch {
    customerSnap = await db.collection(`organizations/${orgId}/customers`).get();
  }

  const customers = customerSnap.docs.map(
    (d) => mapTimestampsFromData({ id: d.id, ...d.data()! }) as CustomerRecord,
  );

  const entries: PropertyListEntry[] = [];
  await Promise.all(
    customers.map(async (customer) => {
      const properties = await listCustomerProperties360(orgId, customer.id);
      for (const property of properties) {
        entries.push({
          ...property,
          customerId: customer.id,
          customerName: customerDisplayName(customer),
        });
      }
    }),
  );

  entries.sort((a, b) => (b.updatedAt?.getTime?.() ?? 0) - (a.updatedAt?.getTime?.() ?? 0));

  let filtered = entries;
  const search = opts?.search?.trim().toLowerCase();
  if (search) {
    filtered = filtered.filter((p) => {
      const addr = `${p.addressLine1} ${p.city} ${p.state} ${p.postalCode}`.toLowerCase();
      return (
        p.propertyName.toLowerCase().includes(search) ||
        p.customerName.toLowerCase().includes(search) ||
        addr.includes(search)
      );
    });
  }
  if (opts?.propertyProfileType) {
    filtered = filtered.filter((p) => p.propertyType === opts.propertyProfileType);
  }
  if (opts?.installComplexity) {
    filtered = filtered.filter((p) => (p.installComplexity ?? 'medium') === opts.installComplexity);
  }

  return filtered;
}

export async function createCustomerProperty360(
  orgId: string,
  customerId: string,
  data: Omit<Property, 'id' | 'customerId' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>,
  userId?: string | null,
) {
  const property = await subCreate(
    orgId,
    customerId,
    'properties',
    {
      ...data,
      siteHazards: data.siteHazards ?? [],
      photos: data.photos ?? {},
      galleryPhotos: data.galleryPhotos ?? [],
      ladderRequired: data.ladderRequired ?? false,
      liftRequired: data.liftRequired ?? false,
      installComplexity: data.installComplexity ?? 'medium',
    },
    userId,
  );

  const db = getAdminFirestore();
  const ref = db.collection(`organizations/${orgId}/properties`).doc();
  const now = ts();
  await ref.set(property360ToLegacy({ ...property, customerId } as Property, orgId));
  await ref.update({ createdAt: now, updatedAt: now });

  return property as Property;
}

export async function updateCustomerProperty360(
  orgId: string,
  customerId: string,
  propertyId: string,
  data: Partial<Property>,
  userId?: string | null,
) {
  const updated = await subUpdate(orgId, customerId, 'properties', propertyId, data, userId);
  return normalizeProperty(updated as Property);
}

export async function deleteCustomerProperty360(orgId: string, customerId: string, propertyId: string) {
  await subDelete(orgId, customerId, 'properties', propertyId);
}

export async function listActivities(orgId: string, customerId: string) {
  return subList<CustomerActivity>(orgId, customerId, 'activities', 'occurredAt');
}

export async function createActivity(
  orgId: string,
  customerId: string,
  data: Omit<CustomerActivity, 'id' | 'customerId' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>,
  userId?: string | null,
) {
  return subCreate(orgId, customerId, 'activities', data, userId) as Promise<CustomerActivity>;
}

export async function listDesigns(orgId: string, customerId: string) {
  return subList<DesignRecord>(orgId, customerId, 'designs');
}

export async function createDesign(
  orgId: string,
  customerId: string,
  data: Omit<DesignRecord, 'id' | 'customerId' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>,
  userId?: string | null,
) {
  return subCreate(orgId, customerId, 'designs', data, userId) as Promise<DesignRecord>;
}

export async function updateDesign(
  orgId: string,
  customerId: string,
  designId: string,
  data: Partial<DesignRecord>,
  userId?: string | null,
) {
  return subUpdate(orgId, customerId, 'designs', designId, data, userId) as Promise<DesignRecord>;
}

export async function listCustomerJobs(orgId: string, customerId: string) {
  return subList<JobRecord>(orgId, customerId, 'jobs');
}

export async function createCustomerJob(
  orgId: string,
  customerId: string,
  data: Omit<JobRecord, 'id' | 'customerId' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>,
  userId?: string | null,
) {
  return subCreate(orgId, customerId, 'jobs', data, userId) as Promise<JobRecord>;
}

export async function updateCustomerJob(
  orgId: string,
  customerId: string,
  jobId: string,
  data: Partial<JobRecord>,
  userId?: string | null,
) {
  return subUpdate(orgId, customerId, 'jobs', jobId, data, userId) as Promise<JobRecord>;
}

export async function deleteCustomerJob360(orgId: string, customerId: string, jobId: string) {
  await subDelete(orgId, customerId, 'jobs', jobId);
}

export async function listStorageItems(orgId: string, customerId: string) {
  return subList<StorageInventoryItem>(orgId, customerId, 'storage');
}

export async function createStorageItem(
  orgId: string,
  customerId: string,
  data: Omit<StorageInventoryItem, 'id' | 'customerId' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>,
  userId?: string | null,
) {
  return subCreate(orgId, customerId, 'storage', data, userId) as Promise<StorageInventoryItem>;
}

export async function updateStorageItem(
  orgId: string,
  customerId: string,
  itemId: string,
  data: Partial<StorageInventoryItem>,
  userId?: string | null,
) {
  return subUpdate(orgId, customerId, 'storage', itemId, data, userId) as Promise<StorageInventoryItem>;
}

export async function listCommunications(orgId: string, customerId: string) {
  return subList<CommunicationRecord>(orgId, customerId, 'communications', 'occurredAt');
}

export async function createCommunication(
  orgId: string,
  customerId: string,
  data: Omit<CommunicationRecord, 'id' | 'customerId' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>,
  userId?: string | null,
) {
  return subCreate(orgId, customerId, 'communications', data, userId) as Promise<CommunicationRecord>;
}

export async function listFollowUpRules(orgId: string): Promise<FollowUpRule[]> {
  const db = getAdminFirestore();
  const snap = await db.collection(`organizations/${orgId}/followUpRules`).orderBy('trigger').get();
  return snap.docs.map((d) => mapTimestampsFromData({ id: d.id, ...d.data()! }) as FollowUpRule);
}

export async function ensureFollowUpRules(orgId: string): Promise<FollowUpRule[]> {
  const existing = await listFollowUpRules(orgId);
  if (existing.length > 0) return existing;

  const defaults: Array<Omit<FollowUpRule, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>> = [
    { organizationId: orgId, trigger: 'estimate_sent', name: 'Estimate Sent Follow-Up', enabled: true, messageTemplate: 'Thanks for reviewing your estimate!', deliveryMethod: 'email', status: 'active' },
    { organizationId: orgId, trigger: 'estimate_not_accepted_3d', name: '3-Day Estimate Reminder', enabled: true, messageTemplate: 'Just checking in on your holiday lighting estimate.', deliveryMethod: 'email', status: 'active' },
    { organizationId: orgId, trigger: 'estimate_not_accepted_7d', name: '7-Day Estimate Reminder', enabled: true, messageTemplate: 'We still have availability — would you like to schedule?', deliveryMethod: 'sms', status: 'active' },
    { organizationId: orgId, trigger: 'estimate_not_accepted_14d', name: '14-Day Estimate Reminder', enabled: false, messageTemplate: 'Final reminder for this season.', deliveryMethod: 'email', status: 'inactive' },
    { organizationId: orgId, trigger: 'installation_completed', name: 'Post-Install Thank You', enabled: true, messageTemplate: 'Your installation is complete — thank you!', deliveryMethod: 'email', status: 'active' },
    { organizationId: orgId, trigger: 'review_request', name: 'Review Request', enabled: true, messageTemplate: 'We would love your feedback!', deliveryMethod: 'email', status: 'active' },
    { organizationId: orgId, trigger: 'august_early_booking', name: 'August Early Booking', enabled: true, messageTemplate: 'Book early for the best schedule slots.', deliveryMethod: 'email', status: 'active' },
    { organizationId: orgId, trigger: 'september_design_review', name: 'September Design Review', enabled: true, messageTemplate: 'Time to review your design for this season.', deliveryMethod: 'email', status: 'active' },
    { organizationId: orgId, trigger: 'october_final_scheduling', name: 'October Final Scheduling', enabled: true, messageTemplate: 'Let us finalize your install date.', deliveryMethod: 'sms', status: 'active' },
    { organizationId: orgId, trigger: 'january_storage_renewal', name: 'January Storage Renewal', enabled: true, messageTemplate: 'Renew your storage plan for next season.', deliveryMethod: 'email', status: 'active' },
  ];

  const db = getAdminFirestore();
  const now = ts();
  for (const rule of defaults) {
    await db.collection(`organizations/${orgId}/followUpRules`).add({
      ...rule,
      createdAt: now,
      updatedAt: now,
      createdBy: null,
      updatedBy: null,
    });
  }
  return listFollowUpRules(orgId);
}

export async function updateFollowUpRule(
  orgId: string,
  ruleId: string,
  data: Partial<FollowUpRule>,
  userId?: string | null,
) {
  const db = getAdminFirestore();
  await db.doc(`organizations/${orgId}/followUpRules/${ruleId}`).update({
    ...data,
    updatedAt: ts(),
    updatedBy: userId ?? null,
  });
  const snap = await db.doc(`organizations/${orgId}/followUpRules/${ruleId}`).get();
  return mapTimestampsFromData({ id: snap.id, ...snap.data()! }) as FollowUpRule;
}

function healthRatingFromScore(score: number): HealthRating {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'moderate';
  return 'at_risk';
}

export function calculateHealthScore(input: {
  paidRatio: number;
  renewalCount: number;
  communicationCount: number;
  completedJobs: number;
  totalJobs: number;
  outstandingBalanceCents: number;
}): { healthScore: number; healthRating: HealthRating; renewalProbability: number } {
  const paymentScore = Math.round(input.paidRatio * 30);
  const renewalScore = Math.min(input.renewalCount * 10, 20);
  const commScore = Math.min(input.communicationCount * 2, 15);
  const completionRate = input.totalJobs > 0 ? input.completedJobs / input.totalJobs : 0.5;
  const completionScore = Math.round(completionRate * 20);
  const balancePenalty = input.outstandingBalanceCents > 0 ? Math.min(15, Math.round(input.outstandingBalanceCents / 10000)) : 0;
  const healthScore = Math.max(0, Math.min(100, paymentScore + renewalScore + commScore + completionScore + 15 - balancePenalty));
  const renewalProbability = Math.max(0, Math.min(100, Math.round(healthScore * 0.85 + renewalScore)));
  return { healthScore, healthRating: healthRatingFromScore(healthScore), renewalProbability };
}

export function calculateCustomerInsights(
  stats: CustomerOverviewStats,
  customer: CustomerRecord,
): CustomerInsights {
  const upsells: string[] = [];
  if (customer.customerType === 'residential') {
    upsells.push('Tree wraps', 'Wreaths', 'Garland');
  }
  if (customer.customerType === 'commercial') {
    upsells.push('Commercial package', 'Permanent lighting');
  }
  if (customer.status === 'storage') {
    upsells.push('Storage renewal');
  }
  if (stats.totalInstalls === 0) {
    upsells.push('Permanent lighting');
  }

  let churnRisk: CustomerInsights['churnRisk'] = 'low';
  if (stats.healthRating === 'at_risk' || customer.status === 'at_risk') churnRisk = 'high';
  else if (stats.healthRating === 'moderate') churnRisk = 'medium';

  let recommendedNextAction = 'Schedule a check-in call';
  if (customer.status === 'lead') recommendedNextAction = 'Send estimate and schedule consultation';
  else if (stats.outstandingBalanceCents > 0) recommendedNextAction = 'Follow up on outstanding balance';
  else if (stats.renewalProbability >= 80) recommendedNextAction = 'Send early renewal offer';

  return {
    renewalProbability: stats.renewalProbability,
    churnRisk,
    suggestedUpsells: upsells.slice(0, 4),
    revenueForecastCents: Math.round(stats.averageAnnualSpendCents * (stats.renewalProbability / 100)),
    recommendedNextAction,
    healthScore: stats.healthScore,
    healthRating: stats.healthRating,
  };
}

export async function getCustomerOverviewStats(
  orgId: string,
  customerId: string,
  customer: CustomerRecord,
  revenueYear?: number | null,
): Promise<CustomerOverviewStats> {
  const [jobs, designs, communications] = await Promise.all([
    listCustomerJobs(orgId, customerId),
    listDesigns(orgId, customerId),
    listCommunications(orgId, customerId),
  ]);

  const yearFilter = revenueYear ?? null;
  const scopedJobs = yearFilter != null
    ? jobs.filter((j) => {
        const d = j.completionDate ?? j.scheduledDate ?? j.createdAt;
        return d && new Date(d).getFullYear() === yearFilter;
      })
    : jobs;

  const jobLifetimeRevenueCents = scopedJobs.reduce((sum, j) => sum + (j.revenueCents ?? 0), 0);
  const currentYear = yearFilter ?? new Date().getFullYear();
  const jobCurrentSeasonRevenueCents = scopedJobs
    .filter((j) => j.completionDate && new Date(j.completionDate).getFullYear() === currentYear)
    .reduce((sum, j) => sum + (j.revenueCents ?? 0), 0);
  const invoiceRevenue = (await getInvoiceRevenueSummaries(orgId, [customerId], yearFilter)).get(customerId) ?? emptyRevenueSummary();
  const lifetimeRevenueCents = invoiceRevenue.lifetimeRevenueCents || jobLifetimeRevenueCents;
  const currentSeasonRevenueCents = invoiceRevenue.currentSeasonRevenueCents || jobCurrentSeasonRevenueCents;

  const completedJobs = jobs.filter((j) => j.status === 'completed');
  const installs = jobs.filter((j) => j.jobType === 'installation');
  const takedowns = jobs.filter((j) => j.jobType === 'takedown');
  const serviceCalls = jobs.filter((j) => j.jobType === 'service_call' || j.jobType === 'repair');

  const sortedCompleted = [...completedJobs].sort(
    (a, b) => (b.completionDate?.getTime() ?? 0) - (a.completionDate?.getTime() ?? 0),
  );
  const scheduled = jobs
    .filter((j) => j.status === 'scheduled' && j.scheduledDate)
    .sort((a, b) => (a.scheduledDate?.getTime() ?? 0) - (b.scheduledDate?.getTime() ?? 0));

  const outstandingBalanceCents = invoiceRevenue.outstandingBalanceCents;
  const yearsActive = Math.max(1, new Date().getFullYear() - customer.createdAt.getFullYear() + 1);
  const averageAnnualSpendCents = Math.round(lifetimeRevenueCents / yearsActive);

  const paidRatio = invoiceRevenue.invoicedCents > 0
    ? Math.min(1, invoiceRevenue.lifetimeRevenueCents / invoiceRevenue.invoicedCents)
    : (lifetimeRevenueCents > 0 ? 1 : 1);
  const { healthScore, healthRating, renewalProbability } = calculateHealthScore({
    paidRatio,
    renewalCount: Math.min(installs.length, 3),
    communicationCount: communications.length,
    completedJobs: completedJobs.length,
    totalJobs: jobs.length,
    outstandingBalanceCents,
  });

  return {
    lifetimeRevenueCents,
    currentSeasonRevenueCents,
    outstandingBalanceCents,
    averageAnnualSpendCents,
    totalQuotes: designs.filter((d) => d.status !== 'archived').length,
    totalJobs: jobs.length,
    totalInstalls: installs.length,
    totalTakedowns: takedowns.length,
    totalServiceCalls: serviceCalls.length,
    renewalProbability,
    healthScore,
    healthRating,
    lastJobDate: sortedCompleted[0]?.completionDate ?? null,
    nextScheduledJobDate: scheduled[0]?.scheduledDate ?? null,
  };
}

export function getCustomerPortalAccess(customer: CustomerRecord): CustomerPortalAccess {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://yuletide-lighting.web.app';
  const root = base.replace(/\/$/, '');
  const accessUrl = customer.portalToken ? `${root}/portal/${customer.portalToken}` : null;
  return {
    enabled: customer.portalEnabled ?? false,
    inviteSentAt: customer.portalInviteSentAt ?? null,
    lastLoginAt: customer.portalLastLoginAt ?? null,
    accessLinkPlaceholder: accessUrl ?? `${root}/portal/login`,
  };
}

function normalizeCustomerListBase(customer: CustomerRecord) {
  return {
    ...customer,
    customerType: (customer.customerType ?? 'residential') as CustomerType,
    status: (customer.status ?? 'lead') as CustomerStatus,
    preferredContactMethod: (customer.preferredContactMethod ?? 'email') as 'phone' | 'email' | 'sms',
    mailingSameAsBilling: customer.mailingSameAsBilling ?? true,
  };
}

function customerFieldsMatchSearch(
  customer: Pick<CustomerRecord, 'firstName' | 'lastName' | 'businessName' | 'email' | 'phone'>,
  search: string,
): boolean {
  return (
    customer.firstName.toLowerCase().includes(search) ||
    customer.lastName.toLowerCase().includes(search) ||
    (customer.businessName?.toLowerCase().includes(search) ?? false) ||
    (customer.email?.toLowerCase().includes(search) ?? false) ||
    (customer.phone?.includes(search) ?? false)
  );
}

function customerListItemMatchesSearch(customer: CustomerListItem, search: string): boolean {
  if (customerFieldsMatchSearch(customer, search)) return true;
  const addr = customer.primaryProperty
    ? `${customer.primaryProperty.addressLine1} ${customer.primaryProperty.city} ${customer.primaryProperty.state} ${customer.primaryProperty.postalCode}`.toLowerCase()
    : '';
  return addr.includes(search);
}

/** Batch-load one primary property per customer (avoids N+1 subcollection reads). */
async function batchLoadPrimaryProperties(orgId: string, customerIds: string[]): Promise<Map<string, Property>> {
  const result = new Map<string, Property>();
  if (customerIds.length === 0) return result;

  const db = getAdminFirestore();
  for (let i = 0; i < customerIds.length; i += 10) {
    const chunk = customerIds.slice(i, i + 10);
    const snap = await db.collection(`organizations/${orgId}/properties`).where('customerId', 'in', chunk).get();
    for (const doc of snap.docs) {
      const p = legacyPropertyTo360(mapTimestampsFromData({ id: doc.id, ...doc.data()! }) as PropertyRecord);
      if (!result.has(p.customerId)) result.set(p.customerId, p);
    }
  }

  const missing = customerIds.filter((id) => !result.has(id));
  if (missing.length > 0) {
    await Promise.all(missing.map(async (customerId) => {
      const snap = await db
        .collection(subPath(orgId, customerId, 'properties'))
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();
      const doc = snap.docs[0];
      if (!doc) return;
      const p = mapTimestampsFromData({ id: doc.id, customerId, ...doc.data()! }) as Property;
      result.set(customerId, p);
    }));
  }

  return result;
}

function toCustomerListItem(
  customer: CustomerRecord,
  primaryProperty: Property | null,
  revenue?: CustomerInvoiceRevenueSummary,
): CustomerListItem {
  return {
    ...normalizeCustomerListBase(customer),
    primaryProperty,
    lifetimeRevenueCents: revenue?.lifetimeRevenueCents ?? 0,
    lastJobDate: null,
    nextScheduledJobDate: null,
  };
}

async function enrichCustomersBatch(
  orgId: string,
  customers: CustomerRecord[],
  revenueYear?: number | null,
): Promise<CustomerListItem[]> {
  if (customers.length === 0) return [];
  const ids = customers.map((c) => c.id);
  const [propertiesByCustomer, revenueByCustomer] = await Promise.all([
    batchLoadPrimaryProperties(orgId, ids),
    getInvoiceRevenueSummaries(orgId, ids, revenueYear),
  ]);
  return customers.map((c) => toCustomerListItem(
    c,
    propertiesByCustomer.get(c.id) ?? null,
    revenueByCustomer.get(c.id),
  ));
}

export async function listCustomers360(
  orgId: string,
  opts: {
    search?: string;
    page?: number;
    pageSize?: number;
    customerTypes?: CustomerType[];
    statuses?: CustomerStatus[];
    year?: number | null;
    enrich?: 'full' | 'none';
  },
): Promise<{ items: CustomerListItem[]; total: number; page: number; pageSize: number }> {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 20;
  const enrich = opts.enrich ?? 'full';

  try {
    const db = getAdminFirestore();
    let snap;
    try {
      snap = await db.collection(`organizations/${orgId}/customers`).orderBy('createdAt', 'desc').get();
    } catch {
      snap = await db.collection(`organizations/${orgId}/customers`).get();
    }

    let items = snap.docs.map((d) => mapTimestampsFromData({ id: d.id, ...d.data()! }) as CustomerRecord);
    items.sort((a, b) => (b.createdAt?.getTime?.() ?? 0) - (a.createdAt?.getTime?.() ?? 0));

    if (opts.customerTypes?.length) {
      items = items.filter((c) => opts.customerTypes!.includes((c.customerType ?? 'residential') as CustomerType));
    }
    if (opts.statuses?.length) {
      items = items.filter((c) => opts.statuses!.includes((c.status ?? 'lead') as CustomerStatus));
    }

    const search = opts.search?.trim().toLowerCase();

    if (enrich === 'none') {
      const filtered = search
        ? items.filter((c) => customerFieldsMatchSearch(c, search))
        : items;
      const total = filtered.length;
      const start = (page - 1) * pageSize;
      const pageItems = filtered.slice(start, start + pageSize);
      return {
        items: pageItems.map((c) => toCustomerListItem(c, null)),
        total,
        page,
        pageSize,
      };
    }

    if (search) {
      const fieldMatches = items.filter((c) => customerFieldsMatchSearch(c, search));
      const candidates = fieldMatches.length > 0 ? fieldMatches : items;
      const enriched = await enrichCustomersBatch(orgId, candidates, opts.year);
      const filtered = enriched.filter((c) => customerListItemMatchesSearch(c, search));
      const total = filtered.length;
      const start = (page - 1) * pageSize;
      return { items: filtered.slice(start, start + pageSize), total, page, pageSize };
    }

    const total = items.length;
    const start = (page - 1) * pageSize;
    const pageItems = items.slice(start, start + pageSize);
    const enriched = await enrichCustomersBatch(orgId, pageItems, opts.year);
    return { items: enriched, total, page, pageSize };
  } catch (err) {
    console.error('[listCustomers360] failed', orgId, err);
    throw err;
  }
}

export const PIPELINE_STAGE_ORDER: CustomerStage[] = [
  'new_lead',
  'contacted',
  'needs_estimate',
  'mockup_needed',
  'proposal_sent',
  'proposal_viewed',
  'approved',
  'deposit_paid',
  'scheduled',
  'installed',
  'balance_due',
  'paid',
  'removal_scheduled',
  'removed',
  'stored',
  'rebook_next_season',
  'lost',
];

const STATUS_TO_PIPELINE_STAGE: Record<CustomerStatus, CustomerStage> = {
  lead: 'new_lead',
  active: 'contacted',
  scheduled: 'scheduled',
  installed: 'installed',
  takedown_pending: 'removal_scheduled',
  storage: 'stored',
  at_risk: 'balance_due',
  archived: 'lost',
};

export function resolveCustomerPipelineStage(customer: CustomerRecord): CustomerStage {
  if (customer.pipelineStage) return customer.pipelineStage;
  const status = (customer.status ?? 'lead') as CustomerStatus;
  return STATUS_TO_PIPELINE_STAGE[status] ?? 'new_lead';
}

export function isNextActionOverdue(due?: Date | null): boolean {
  if (!due) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(due);
  d.setHours(0, 0, 0, 0);
  return d < today;
}

function toPipelineItem(
  customer: CustomerRecord,
  primaryProperty: Property | null,
  lifetimeRevenueCents: number,
): CustomerPipelineItem {
  const stage = resolveCustomerPipelineStage(customer);
  const estimatedValueCents =
    customer.pipelineEstimatedValueCents ?? lifetimeRevenueCents ?? 0;
  return {
    id: customer.id,
    customerId: customer.id,
    stage,
    previousStage: customer.previousPipelineStage ?? null,
    stageUpdatedAt: customer.stageUpdatedAt ?? null,
    assignedTo: customer.pipelineAssignedTo ?? customer.assignedSalespersonName ?? null,
    estimatedValueCents,
    nextAction: customer.nextAction ?? null,
    nextActionDue: customer.nextActionDue ?? null,
    isOverdue: isNextActionOverdue(customer.nextActionDue),
    firstName: customer.firstName,
    lastName: customer.lastName,
    businessName: customer.businessName ?? null,
    customerType: (customer.customerType ?? 'residential') as CustomerType,
    email: customer.email ?? null,
    phone: customer.phone ?? null,
    primaryProperty,
  };
}

export async function getCustomerPipeline(
  orgId: string,
  opts?: {
    search?: string;
    stages?: CustomerStage[];
    overdueOnly?: boolean;
  },
): Promise<{
  columns: CustomerPipelineColumn[];
  totals: { count: number; revenueCents: number; overdueCount: number };
}> {
  const db = getAdminFirestore();
  let snap;
  try {
    snap = await db.collection(`organizations/${orgId}/customers`).orderBy('createdAt', 'desc').get();
  } catch {
    snap = await db.collection(`organizations/${orgId}/customers`).get();
  }

  let customers = snap.docs.map((d) => mapTimestampsFromData({ id: d.id, ...d.data()! }) as CustomerRecord);
  customers = customers.filter((c) => c.status !== 'archived' || resolveCustomerPipelineStage(c) === 'lost');

  const ids = customers.map((c) => c.id);
  const [propertiesByCustomer, revenueByCustomer] = await Promise.all([
    batchLoadPrimaryProperties(orgId, ids),
    getInvoiceRevenueSummaries(orgId, ids, null),
  ]);

  let items = customers.map((c) =>
    toPipelineItem(
      c,
      propertiesByCustomer.get(c.id) ?? null,
      revenueByCustomer.get(c.id)?.lifetimeRevenueCents ?? 0,
    ),
  );

  const search = opts?.search?.trim().toLowerCase();
  if (search) {
    items = items.filter(
      (c) =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(search) ||
        (c.businessName?.toLowerCase().includes(search) ?? false) ||
        (c.email?.toLowerCase().includes(search) ?? false) ||
        (c.phone?.includes(search) ?? false),
    );
  }
  if (opts?.stages?.length) {
    items = items.filter((c) => opts.stages!.includes(c.stage));
  }
  if (opts?.overdueOnly) {
    items = items.filter((c) => c.isOverdue);
  }

  const columns: CustomerPipelineColumn[] = PIPELINE_STAGE_ORDER.map((stage) => {
    const stageItems = items.filter((c) => c.stage === stage);
    return {
      stage,
      count: stageItems.length,
      revenueCents: stageItems.reduce((sum, c) => sum + c.estimatedValueCents, 0),
      customers: stageItems,
    };
  });

  const visibleStages = opts?.stages?.length ? opts.stages : PIPELINE_STAGE_ORDER;
  const visibleItems = items.filter((c) => visibleStages.includes(c.stage));

  return {
    columns: opts?.stages?.length
      ? columns.filter((col) => opts.stages!.includes(col.stage))
      : columns,
    totals: {
      count: visibleItems.length,
      revenueCents: visibleItems.reduce((sum, c) => sum + c.estimatedValueCents, 0),
      overdueCount: visibleItems.filter((c) => c.isOverdue).length,
    },
  };
}

export async function updateCustomerPipelineStage(
  orgId: string,
  customerId: string,
  stage: CustomerStage,
  userId?: string | null,
  userName?: string | null,
) {
  const customer = await getCustomer(orgId, customerId);
  if (!customer) throw new Error('Customer not found');
  const previous = resolveCustomerPipelineStage(customer);
  await updateCustomer(orgId, customerId, {
    pipelineStage: stage,
    previousPipelineStage: previous,
    stageUpdatedAt: new Date(),
  });
  await logCustomerActivity(
    orgId,
    customerId,
    'note_added',
    `Pipeline stage changed to ${stage.replace(/_/g, ' ')}`,
    userId,
    userName,
  );
  return { success: true, stage, previousStage: previous };
}

export async function updateCustomerNextAction(
  orgId: string,
  customerId: string,
  data: { nextAction?: string | null; nextActionDue?: Date | null },
  userId?: string | null,
) {
  await updateCustomer(orgId, customerId, {
    nextAction: data.nextAction ?? null,
    nextActionDue: data.nextActionDue ?? null,
  });
  return { success: true };
}

export async function logCustomerActivity(
  orgId: string,
  customerId: string,
  activityType: ActivityType,
  description: string,
  userId?: string | null,
  userName?: string | null,
  extra?: Partial<CustomerActivity>,
) {
  return createActivity(
    orgId,
    customerId,
    {
      activityType,
      description,
      userId: userId ?? null,
      userName: userName ?? null,
      occurredAt: new Date(),
      relatedRecordType: extra?.relatedRecordType ?? null,
      relatedRecordId: extra?.relatedRecordId ?? null,
      relatedRecordLabel: extra?.relatedRecordLabel ?? null,
    },
    userId,
  );
}

export async function seedCustomer360Demo(orgId: string, userId?: string | null) {
  const db = getAdminFirestore();
  const count = await db.collection(`organizations/${orgId}/customers`).count().get();
  if (count.data().count > 0) return { seeded: false, reason: 'Customers already exist' };

  const { createCustomer } = await import('./firestore');
  const now = new Date();

  const demo = await createCustomer(orgId, {
    firstName: 'Sarah',
    lastName: 'Johnson',
    businessName: null,
    customerType: 'residential',
    status: 'active',
    referralSource: 'Neighbor referral',
    assignedSalespersonName: 'Mike Thompson',
    email: 'sarah.j@example.com',
    secondaryEmail: null,
    phone: '(555) 234-5678',
    mobilePhone: '(555) 234-5679',
    preferredContactMethod: 'email',
    tags: ['vip'],
    notes: 'Prefers warm white C9 on roofline.',
    smsOptIn: true,
    emailOptIn: true,
    billingSameAsPhysical: true,
    mailingSameAsBilling: true,
    portalEnabled: true,
    portalInviteSentAt: now,
  });

  await createCustomerProperty360(
    orgId,
    demo.id,
    {
      propertyName: 'Main Residence',
      propertyType: 'residential',
      label: 'Primary',
      addressLine1: '742 Evergreen Terrace',
      addressLine2: null,
      city: 'Springfield',
      state: 'IL',
      postalCode: '62704',
      country: 'US',
      latitude: null,
      longitude: null,
      gateCode: '4521#',
      hoaInfo: null,
      accessInstructions: 'Park in driveway. Dog friendly.',
      installNotes: 'Gate code 4521#',
      powerSourceLocations: 'Front porch outlet, garage GFCI',
      ladderAccessPoints: 'Driveway side',
      roofMeasurementNotes: 'Front ridge 42ft, sides 28ft each',
      treeCount: 3,
      shrubCount: 12,
      wreathLocations: 'Front door, garage',
      garlandLocations: 'Stair railing',
      siteHazards: ['dog_present'],
      siteHazardNotes: null,
      photos: {},
    },
    userId,
  );

  await logCustomerActivity(orgId, demo.id, 'lead_created', 'Demo customer created', userId, 'System');
  await createDesign(orgId, demo.id, {
    designName: '2025 Roofline Design',
    propertyId: null,
    propertyName: 'Main Residence',
    versionNumber: 1,
    designerId: null,
    designerName: 'Design Team',
    status: 'approved',
    revisionNotes: 'Warm white C9, 12" spacing',
    originalPhotoUrl: null,
    mockupImageUrl: null,
    installedResultPhotoUrl: null,
  }, userId);

  await createCustomerJob(orgId, demo.id, {
    jobType: 'installation',
    title: '2025 Holiday Install',
    propertyId: null,
    propertyName: 'Main Residence',
    scheduledDate: new Date(now.getFullYear(), 10, 15),
    completionDate: new Date(now.getFullYear(), 10, 15),
    assignedCrewIds: [],
    assignedCrewNames: ['Crew A'],
    laborHours: 6,
    materialsUsed: 'C9 warm white, clips, extension cords',
    revenueCents: 245000,
    status: 'completed',
    crewNotes: 'Smooth install',
    beforePhotoUrls: [],
    duringPhotoUrls: [],
    completedPhotoUrls: [],
  }, userId);

  await createCommunication(orgId, demo.id, {
    type: 'email',
    direction: 'outbound',
    subject: 'Your 2025 estimate',
    body: 'Attached is your holiday lighting estimate.',
    employeeId: null,
    employeeName: 'Mike Thompson',
    occurredAt: now,
    followUpRequired: false,
    followUpDate: null,
    relatedPropertyId: null,
    relatedJobId: null,
    relatedQuoteId: null,
  }, userId);

  await ensureFollowUpRules(orgId);
  return { seeded: true, customerId: demo.id };
}
