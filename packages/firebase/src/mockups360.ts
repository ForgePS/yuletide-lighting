import { nanoid } from 'nanoid';
import type {
  DecorationAsset,
  DesignTemplate,
  MaterialList,
  MockupDashboardKpis,
  MockupExport,
  MockupLayer,
  MockupMeasurement,
  MockupRecord,
  MockupVersion,
} from '@clcrm/types';
import {
  aiGenerateDesign,
  calculateMaterials,
  DEFAULT_DECORATION_LIBRARY,
  DEFAULT_DESIGN_TEMPLATES,
  mockAiPropertyDetection,
  strandPixelLength,
} from '@clcrm/types';
import { getAdminFirestore, Timestamp } from './admin';
import { randomUUID } from 'crypto';
import { mapTimestampsFromData } from './firestore-utils';
import { colCreate, colGet, colList, colUpdate } from './firestore';
import { createProposal360 } from './proposals';

function ts() {
  return Timestamp.now();
}

function orgPath(orgId: string, collection: string) {
  return `organizations/${orgId}/${collection}`;
}

function mapDoc<T>(data: Record<string, unknown>): T {
  return mapTimestampsFromData(data) as unknown as T;
}

function normalizeMockup(raw: Record<string, unknown>): MockupRecord {
  const strands = ((raw.strands as MockupRecord['strands']) ?? []).map((strand) => ({
    ...strand,
    layerId: strand.layerId ?? null,
    layerType: strand.layerType ?? null,
  }));
  return {
    id: String(raw.id),
    organizationId: String(raw.organizationId ?? ''),
    propertyId: String(raw.propertyId ?? ''),
    customerId: (raw.customerId as string) ?? null,
    name: String(raw.name ?? ''),
    status: (raw.status as MockupRecord['status']) ?? 'draft',
    imageUrl: String(raw.imageUrl ?? ''),
    optimizedImageUrl: (raw.optimizedImageUrl as string) ?? null,
    thumbnailUrl: (raw.thumbnailUrl as string) ?? null,
    renderedImageUrl: (raw.renderedImageUrl as string) ?? null,
    backgroundBrightness: Number(raw.backgroundBrightness ?? 0.5),
    strands,
    layers: (raw.layers as MockupLayer[]) ?? [],
    viewCount: Number(raw.viewCount ?? 0),
    versionNumber: Number(raw.versionNumber ?? 1),
    designTimeMinutes: Number(raw.designTimeMinutes ?? 0),
    conversionRate: (raw.conversionRate as number) ?? null,
    revenueCents: (raw.revenueCents as number) ?? null,
    scaleFeetPerPixel: (raw.scaleFeetPerPixel as number) ?? null,
    aiDetectionComplete: Boolean(raw.aiDetectionComplete),
    detectedFeatures: (raw.detectedFeatures as MockupRecord['detectedFeatures']) ?? [],
    animationType: (raw.animationType as MockupRecord['animationType']) ?? null,
    animationSpeed: Number(raw.animationSpeed ?? 0.5),
    notes: (raw.notes as string) ?? null,
    approvalToken: (raw.approvalToken as string) ?? null,
    sentForApprovalAt: raw.sentForApprovalAt instanceof Date ? raw.sentForApprovalAt : raw.sentForApprovalAt ? new Date(String(raw.sentForApprovalAt)) : null,
    approvedAt: raw.approvedAt instanceof Date ? raw.approvedAt : raw.approvedAt ? new Date(String(raw.approvedAt)) : null,
    approvedBy: (raw.approvedBy as string) ?? null,
    revisionNotes: (raw.revisionNotes as string) ?? null,
    linkedProposalId: (raw.linkedProposalId as string) ?? null,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt : new Date(),
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt : new Date(),
    createdBy: (raw.createdBy as string) ?? null,
    updatedBy: (raw.updatedBy as string) ?? null,
  };
}

async function subList<T>(orgId: string, mockupId: string, sub: string): Promise<T[]> {
  const db = getAdminFirestore();
  const snap = await db.collection(`${orgPath(orgId, 'mockups')}/${mockupId}/${sub}`).orderBy('createdAt', 'asc').get();
  return snap.docs.map((d) => mapDoc<T>({ id: d.id, ...d.data()! }));
}

async function subCreate(orgId: string, mockupId: string, sub: string, data: Record<string, unknown>) {
  const db = getAdminFirestore();
  const ref = db.collection(`${orgPath(orgId, 'mockups')}/${mockupId}/${sub}`).doc();
  const now = ts();
  await ref.set({ ...data, createdAt: now, updatedAt: now });
  return mapDoc({ id: ref.id, ...data, createdAt: now, updatedAt: now });
}

export async function listMockups360(orgId: string): Promise<MockupRecord[]> {
  const rows = await colList<Record<string, unknown>>(orgId, 'mockups');
  return rows.map((r) => normalizeMockup({ ...r, organizationId: orgId }));
}

export async function getMockup360(orgId: string, mockupId: string): Promise<MockupRecord | null> {
  const raw = await colGet<Record<string, unknown>>(orgId, 'mockups', mockupId);
  if (!raw) return null;
  const mockup = normalizeMockup({ ...raw, id: mockupId, organizationId: orgId });
  mockup.layers = await subList<MockupLayer>(orgId, mockupId, 'layers');
  return mockup;
}

export async function createMockup360(
  orgId: string,
  input: {
    propertyId: string;
    customerId?: string;
    name: string;
    imageUrl: string;
    optimizedImageUrl?: string;
    thumbnailUrl?: string;
    backgroundBrightness?: number;
    strands?: MockupRecord['strands'];
    notes?: string;
  },
  userId?: string | null,
) {
  const prop = await colGet<{ customerId?: string; addressLine1?: string }>(orgId, 'properties', input.propertyId);

  const mockup = await colCreate(orgId, 'mockups', {
    organizationId: orgId,
    propertyId: input.propertyId,
    customerId: input.customerId ?? prop?.customerId ?? null,
    name: input.name,
    status: 'draft',
    imageUrl: input.imageUrl,
    optimizedImageUrl: input.optimizedImageUrl ?? input.imageUrl,
    thumbnailUrl: input.thumbnailUrl ?? input.imageUrl,
    renderedImageUrl: null,
    backgroundBrightness: input.backgroundBrightness ?? 0.5,
    strands: input.strands ?? [],
    viewCount: 0,
    versionNumber: 1,
    designTimeMinutes: 0,
    scaleFeetPerPixel: null,
    aiDetectionComplete: false,
    detectedFeatures: [],
    animationType: null,
    animationSpeed: 0.5,
    notes: input.notes ?? null,
    createdBy: userId,
    updatedBy: userId,
  }) as Record<string, unknown>;

  const id = String(mockup.id);
  await subCreate(orgId, id, 'layers', {
    mockupId: id,
    name: 'Lighting',
    layerType: 'lighting',
    isLocked: false,
    isHidden: false,
    sortOrder: 0,
    strands: input.strands ?? [],
  });

  return getMockup360(orgId, id);
}

export async function updateMockup360(orgId: string, mockupId: string, data: Partial<MockupRecord>, userId?: string | null) {
  const patch: Record<string, unknown> = { ...data, updatedBy: userId };
  if (data.strands) {
    patch.strands = data.strands.map((strand) => ({
      id: strand.id,
      points: strand.points,
      color: strand.color,
      lightType: strand.lightType,
      pattern: strand.pattern,
      bulbSize: strand.bulbSize,
      spacing: strand.spacing,
      brightness: strand.brightness,
      layerId: strand.layerId ?? null,
      layerType: strand.layerType ?? null,
    }));
  }
  await colUpdate(orgId, 'mockups', mockupId, patch);
  return getMockup360(orgId, mockupId);
}

export async function setMockupScale(orgId: string, mockupId: string, knownFeet: number, pixelLength: number) {
  const scaleFeetPerPixel = knownFeet / pixelLength;
  await colUpdate(orgId, 'mockups', mockupId, { scaleFeetPerPixel });
  return getMockup360(orgId, mockupId);
}

export async function runAiDetection(orgId: string, mockupId: string, userId?: string | null) {
  const mockup = await getMockup360(orgId, mockupId);
  if (!mockup) throw new Error('Mockup not found');
  const result = mockAiPropertyDetection(mockup.imageUrl);
  await colUpdate(orgId, 'mockups', mockupId, {
    aiDetectionComplete: true,
    detectedFeatures: result.features,
    updatedBy: userId,
  });
  return { ...result, mockup: await getMockup360(orgId, mockupId) };
}

export async function generateMaterials(orgId: string, mockupId: string): Promise<MaterialList> {
  const mockup = await getMockup360(orgId, mockupId);
  if (!mockup) throw new Error('Mockup not found');
  return calculateMaterials(mockup);
}

export async function createMockupVersion(orgId: string, mockupId: string, revisionNotes?: string, designerName?: string | null, userId?: string | null) {
  const mockup = await getMockup360(orgId, mockupId);
  if (!mockup) throw new Error('Mockup not found');
  const versionNumber = mockup.versionNumber + 1;

  await subCreate(orgId, mockupId, 'versions', {
    mockupId,
    versionNumber,
    designerName: designerName ?? null,
    revisionNotes: revisionNotes ?? null,
    snapshotData: { strands: mockup.strands, backgroundBrightness: mockup.backgroundBrightness, scaleFeetPerPixel: mockup.scaleFeetPerPixel },
    createdBy: userId,
  });

  await colUpdate(orgId, 'mockups', mockupId, { versionNumber, updatedBy: userId });
  return subList<MockupVersion>(orgId, mockupId, 'versions');
}

export async function listMockupVersions(orgId: string, mockupId: string) {
  return subList<MockupVersion>(orgId, mockupId, 'versions');
}

export async function exportMockup(orgId: string, mockupId: string, exportType: MockupExport['exportType'], userId?: string | null) {
  const mockup = await getMockup360(orgId, mockupId);
  if (!mockup) throw new Error('Mockup not found');
  const materials = calculateMaterials(mockup);

  let content = '';
  if (exportType === 'material_list' || exportType === 'pick_list') {
    content = materials.items.map((i) => `${i.quantity}x ${i.name} (${i.sku})`).join('\n');
  } else if (exportType === 'install_sheet') {
    content = `Installation Sheet: ${mockup.name}\nTotal linear feet: ${materials.totalLinearFeet}\nLabor estimate: ${materials.laborHoursEstimate}h\n\nMaterials:\n${materials.items.map((i) => `- ${i.quantity} ${i.unit} ${i.name}`).join('\n')}`;
  } else if (exportType === 'crew_work_order') {
    content = `Crew Work Order\nDesign: ${mockup.name}\nProperty: ${mockup.propertyId}\nLinear feet: ${materials.totalLinearFeet}\nEstimated hours: ${materials.laborHoursEstimate}\nStrands: ${mockup.strands.length}`;
  }

  return subCreate(orgId, mockupId, 'exports', {
    mockupId,
    exportType,
    content,
    fileUrl: null,
    createdBy: userId,
  }) as Promise<MockupExport>;
}

export async function listMockupExports(orgId: string, mockupId: string) {
  return subList<MockupExport>(orgId, mockupId, 'exports');
}

export async function ensureDesignTemplates(orgId: string): Promise<DesignTemplate[]> {
  const db = getAdminFirestore();
  const snap = await db.collection(orgPath(orgId, 'designTemplates')).get();
  if (!snap.empty) return snap.docs.map((d) => mapDoc<DesignTemplate>({ id: d.id, ...d.data()! }));

  const now = ts();
  const templates: DesignTemplate[] = [];
  for (const t of DEFAULT_DESIGN_TEMPLATES) {
    const ref = db.collection(orgPath(orgId, 'designTemplates')).doc();
    const data = { organizationId: orgId, ...t, createdAt: now, updatedAt: now };
    await ref.set(data);
    templates.push(mapDoc<DesignTemplate>({ id: ref.id, ...data }));
  }
  return templates;
}

export async function ensureDecorationLibrary(orgId: string): Promise<DecorationAsset[]> {
  const db = getAdminFirestore();
  const snap = await db.collection(orgPath(orgId, 'decorationLibrary')).get();
  if (!snap.empty) return snap.docs.map((d) => mapDoc<DecorationAsset>({ id: d.id, ...d.data()! }));

  const now = ts();
  const assets: DecorationAsset[] = [];
  for (const a of DEFAULT_DECORATION_LIBRARY) {
    const ref = db.collection(orgPath(orgId, 'decorationLibrary')).doc();
    const data = { organizationId: orgId, ...a, createdAt: now, updatedAt: now };
    await ref.set(data);
    assets.push(mapDoc<DecorationAsset>({ id: ref.id, ...data }));
  }
  return assets;
}

export async function applyDesignTemplate(orgId: string, mockupId: string, templateId: string, userId?: string | null) {
  const template = await colGet<DesignTemplate>(orgId, 'designTemplates', templateId);
  const mockup = await getMockup360(orgId, mockupId);
  if (!template || !mockup) throw new Error('Not found');

  const strand = {
    id: nanoid(),
    points: [{ x: 100, y: 150 }, { x: 700, y: 150 }],
    color: template.colorScheme.split(',')[0] ?? '#FFD700',
    lightType: template.lightType,
    pattern: template.pattern,
    bulbSize: 6,
    spacing: 12,
    brightness: 1,
  };

  return updateMockup360(orgId, mockupId, {
    strands: [strand],
    name: `${mockup.name} — ${template.name}`,
  }, userId);
}

export async function aiDesignAssistant(orgId: string, style: string, mockupId?: string, userId?: string | null) {
  const result = aiGenerateDesign(style);
  if (mockupId) {
    await updateMockup360(orgId, mockupId, { strands: result.strands, name: result.designName }, userId);
  }
  return result;
}

export async function createProposalFromMockup(
  orgId: string,
  input: { mockupId: string; customerId: string; propertyId: string; title?: string },
  userId?: string | null,
) {
  const mockup = await getMockup360(orgId, input.mockupId);
  if (!mockup) throw new Error('Mockup not found');
  const materials = calculateMaterials(mockup);

  const lineItems = materials.items.map((item) => ({
    id: randomUUID(),
    description: item.name,
    quantity: item.quantity,
    unitPriceCents: item.category === 'lighting' ? 150 : 500,
    agreementCode: 'STD',
  }));

  const proposal = await createProposal360(orgId, {
    customerId: input.customerId,
    propertyId: input.propertyId,
    title: input.title ?? `${mockup.name} — Proposal`,
    lineItems,
    mockupIds: [input.mockupId],
    notes: `Generated from mockup design. ${materials.totalLinearFeet} linear feet, ~${materials.laborHoursEstimate}h labor.`,
  }, userId);

  await colUpdate(orgId, 'mockups', input.mockupId, { status: 'approved', revenueCents: lineItems.reduce((s, li) => s + li.quantity * li.unitPriceCents, 0) });
  return proposal;
}

export async function getMockupDashboard(orgId: string): Promise<MockupDashboardKpis> {
  const mockups = await listMockups360(orgId);
  const approved = mockups.filter((m) => m.status === 'approved');
  const mostViewed = mockups.sort((a, b) => b.viewCount - a.viewCount)[0];

  return {
    recentDesigns: mockups.filter((m) => Date.now() - m.updatedAt.getTime() < 7 * 86400000).length,
    draftDesigns: mockups.filter((m) => m.status === 'draft').length,
    approvedDesigns: approved.length,
    mostViewedDesignId: mostViewed?.id ?? null,
    mostViewedCount: mostViewed?.viewCount ?? 0,
    designConversionRatePercent: mockups.length ? Math.round((approved.length / mockups.length) * 100) : 0,
    revenueGeneratedCents: approved.reduce((s, m) => s + (m.revenueCents ?? 0), 0),
    averageDesignTimeMinutes: mockups.length ? Math.round(mockups.reduce((s, m) => s + m.designTimeMinutes, 0) / mockups.length) : 0,
  };
}

export async function recordMockupView(orgId: string, mockupId: string) {
  const mockup = await getMockup360(orgId, mockupId);
  if (!mockup) return null;
  await colUpdate(orgId, 'mockups', mockupId, { viewCount: mockup.viewCount + 1 });
  return getMockup360(orgId, mockupId);
}

export async function saveMeasurements(orgId: string, mockupId: string, userId?: string | null) {
  const mockup = await getMockup360(orgId, mockupId);
  if (!mockup) throw new Error('Mockup not found');
  const scale = mockup.scaleFeetPerPixel ?? 0.05;
  const measurements: MockupMeasurement[] = [];

  for (const strand of mockup.strands) {
    const px = strandPixelLength(strand);
    const m = await subCreate(orgId, mockupId, 'measurements', {
      mockupId,
      label: `Strand ${strand.id.slice(0, 6)}`,
      pixelLength: px,
      realWorldFeet: Math.round(px * scale * 10) / 10,
      featureType: 'roofline',
      createdBy: userId,
    }) as MockupMeasurement;
    measurements.push(m);
  }
  return measurements;
}

export async function listMeasurements(orgId: string, mockupId: string) {
  return subList<MockupMeasurement>(orgId, mockupId, 'measurements');
}

function mockupApprovalUrl(token: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://yuletide-lighting.web.app';
  return `${base.replace(/\/$/, '')}/m/${token}`;
}

export async function ensureMockupApprovalToken(orgId: string, mockupId: string) {
  const mockup = await getMockup360(orgId, mockupId);
  if (!mockup) throw new Error('Mockup not found');
  if (mockup.approvalToken) return mockup.approvalToken;
  const token = nanoid(32);
  await colUpdate(orgId, 'mockups', mockupId, { approvalToken: token });
  return token;
}

export async function sendMockupForApproval(orgId: string, mockupId: string, userId?: string | null) {
  const token = await ensureMockupApprovalToken(orgId, mockupId);
  await colUpdate(orgId, 'mockups', mockupId, {
    status: 'in_review',
    sentForApprovalAt: new Date(),
    updatedBy: userId,
  });
  return { token, approvalUrl: mockupApprovalUrl(token) };
}

export async function getMockupByApprovalToken(token: string) {
  const db = getAdminFirestore();
  const snap = await db.collectionGroup('mockups').where('approvalToken', '==', token).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0]!;
  const orgId = doc.ref.parent.parent?.id ?? String(doc.data().organizationId ?? '');
  const mockup = await getMockup360(orgId, doc.id);
  if (!mockup) return null;
  const [organization, property, customer] = await Promise.all([
    import('./firestore').then((m) => m.getOrganization(orgId)),
    mockup.propertyId ? colGet<{ addressLine1?: string; city?: string; state?: string }>(orgId, 'properties', mockup.propertyId) : null,
    mockup.customerId ? colGet<{ firstName?: string; lastName?: string; businessName?: string | null }>(orgId, 'customers', mockup.customerId) : null,
  ]);
  await recordMockupView(orgId, mockup.id);
  return { mockup, organization, property, customer, organizationId: orgId };
}

export async function recordCustomerMockupApproval(
  token: string,
  input: { action: 'approved' | 'revision_requested'; customerName?: string; notes?: string },
) {
  const ctx = await getMockupByApprovalToken(token);
  if (!ctx) throw new Error('Mockup not found');
  const { mockup, organizationId: orgId } = ctx;
  const now = new Date();
  const patch: Partial<MockupRecord> = {
    approvedBy: input.customerName ?? null,
    revisionNotes: input.notes ?? null,
  };
  if (input.action === 'approved') {
    patch.status = 'approved';
    patch.approvedAt = now;
  } else {
    patch.status = 'revision_requested';
    patch.approvedAt = null;
  }
  await colUpdate(orgId, 'mockups', mockup.id, patch);

  if (mockup.customerId) {
    const { updateCustomerPipelineStage } = await import('./customer360');
    await updateCustomerPipelineStage(
      orgId,
      mockup.customerId,
      input.action === 'approved' ? 'approved' : 'mockup_needed',
      null,
      input.customerName ?? 'Customer',
    );
  }

  return getMockup360(orgId, mockup.id);
}

export async function linkMockupToProposal(orgId: string, mockupId: string, proposalId: string, userId?: string | null) {
  const [mockup, proposal] = await Promise.all([
    getMockup360(orgId, mockupId),
    colGet<{ mockupIds?: string[] }>(orgId, 'proposals', proposalId),
  ]);
  if (!mockup || !proposal) throw new Error('Mockup or proposal not found');
  const mockupIds = [...new Set([...(proposal.mockupIds ?? []), mockupId])];
  await colUpdate(orgId, 'proposals', proposalId, { mockupIds });
  await colUpdate(orgId, 'mockups', mockupId, { linkedProposalId: proposalId, updatedBy: userId });
  return { success: true, mockupIds };
}

export async function listProposalsForMockup(orgId: string, mockup: MockupRecord) {
  if (!mockup.customerId) return [];
  const proposals = await colList<{ id: string; customerId?: string; title?: string; status?: string; mockupIds?: string[] }>(orgId, 'proposals');
  return proposals.filter((p) => p.customerId === mockup.customerId || (p.mockupIds ?? []).includes(mockup.id));
}
