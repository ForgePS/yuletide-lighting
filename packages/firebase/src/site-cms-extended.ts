import type { Query } from 'firebase-admin/firestore';
import type {
  CmsCollection,
  CmsCollectionEntry,
  CmsForm,
  CmsFormSubmission,
  CmsMediaAsset,
  CmsNotice,
  CmsRedirect,
  CmsSeoGlobals,
} from '@clcrm/types';
import {
  DEFAULT_FORM_SETTINGS,
  DEFAULT_SEO_GLOBALS,
  createCmsId,
  inferMediaKind,
} from '@clcrm/types';
import { getAdminFirestore, Timestamp } from './admin';
import { mapTimestampsFromData } from './firestore-utils';
import { deleteStoragePath, uploadPlatformFile } from './storage';
import { createCustomer } from './firestore';

function ts() {
  return Timestamp.now();
}

function website() {
  return getAdminFirestore().collection('platform').doc('website');
}

function mapDates<T extends Record<string, unknown>>(data: T): T {
  const result = { ...data } as Record<string, unknown>;
  for (const key of Object.keys(result)) {
    const val = result[key];
    if (val && typeof val === 'object' && 'toDate' in (val as object)) {
      result[key] = (val as { toDate: () => Date }).toDate();
    }
  }
  return result as T;
}

// ——— Media ———

export async function listMediaAssets(opts?: {
  folder?: string;
  kind?: string;
  search?: string;
}): Promise<CmsMediaAsset[]> {
  let query: Query = website().collection('media');
  const snap = await query.get();
  let items = snap.docs.map((doc) => ({ id: doc.id, ...mapDates(doc.data()) }) as CmsMediaAsset);
  if (opts?.folder) items = items.filter((i) => i.folder === opts.folder);
  if (opts?.kind) items = items.filter((i) => i.kind === opts.kind);
  if (opts?.search) {
    const q = opts.search.toLowerCase();
    items = items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.altText.toLowerCase().includes(q) ||
        i.originalName.toLowerCase().includes(q),
    );
  }
  return items.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export async function registerMediaAsset(input: {
  buffer: Buffer;
  mimeType: string;
  filename: string;
  folder?: string;
  altText?: string;
  caption?: string;
  actorEmail?: string;
}): Promise<CmsMediaAsset> {
  const folder = input.folder || 'library';
  const uploaded = await uploadPlatformFile(folder, input.buffer, input.mimeType, input.filename);
  const id = createCmsId('media');
  const now = new Date();
  const asset: CmsMediaAsset = {
    id,
    name: input.filename.replace(/\.[^.]+$/, ''),
    originalName: input.filename,
    path: uploaded.path,
    url: uploaded.url,
    folder,
    kind: inferMediaKind(input.mimeType),
    mimeType: input.mimeType,
    sizeBytes: input.buffer.byteLength,
    altText: input.altText ?? '',
    caption: input.caption ?? '',
    usedBy: [],
    createdAt: now,
    updatedAt: now,
    createdByEmail: input.actorEmail,
  };
  await website()
    .collection('media')
    .doc(id)
    .set({ ...asset, createdAt: ts(), updatedAt: ts() });
  return asset;
}

export async function registerUploadedMediaAsset(input: {
  path: string;
  url: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  folder?: string;
  altText?: string;
  caption?: string;
  actorEmail?: string;
}): Promise<CmsMediaAsset> {
  const id = createCmsId('media');
  const now = new Date();
  const asset: CmsMediaAsset = {
    id,
    name: input.filename.replace(/\.[^.]+$/, ''),
    originalName: input.filename,
    path: input.path,
    url: input.url,
    folder: input.folder || 'library',
    kind: inferMediaKind(input.mimeType),
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    altText: input.altText ?? '',
    caption: input.caption ?? '',
    usedBy: [],
    createdAt: now,
    updatedAt: now,
    createdByEmail: input.actorEmail,
  };
  await website()
    .collection('media')
    .doc(id)
    .set({ ...asset, createdAt: ts(), updatedAt: ts() });
  return asset;
}

export async function updateMediaAsset(
  id: string,
  patch: Partial<Pick<CmsMediaAsset, 'name' | 'altText' | 'caption' | 'folder' | 'focalPoint'>>,
): Promise<CmsMediaAsset> {
  const ref = website().collection('media').doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Media asset not found');
  const current = { id, ...mapDates(snap.data()!) } as CmsMediaAsset;
  const next = { ...current, ...patch, updatedAt: new Date() };
  await ref.set({ ...next, createdAt: Timestamp.fromDate(current.createdAt), updatedAt: ts() });
  return next;
}

export async function deleteMediaAsset(id: string): Promise<void> {
  const ref = website().collection('media').doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Media asset not found');
  const asset = snap.data() as CmsMediaAsset;
  if (asset.usedBy?.length) {
    throw new Error('Cannot delete media that is in use. Remove references first.');
  }
  await deleteStoragePath(asset.path);
  await ref.delete();
}

// ——— Forms ———

export async function listCmsForms(): Promise<CmsForm[]> {
  const snap = await website().collection('forms').get();
  return snap.docs
    .map((doc) => ({ id: doc.id, ...mapDates(doc.data()) }) as CmsForm)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getCmsForm(id: string): Promise<CmsForm | null> {
  const snap = await website().collection('forms').doc(id).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...mapDates(snap.data()!) } as CmsForm;
}

export async function getCmsFormBySlug(slug: string): Promise<CmsForm | null> {
  const snap = await website().collection('forms').where('slug', '==', slug).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0]!;
  return { id: doc.id, ...mapDates(doc.data()) } as CmsForm;
}

export async function ensureDefaultContactForm(): Promise<CmsForm> {
  const existing = await listCmsForms();
  if (existing.length) return existing[0]!;
  return createCmsForm({
    name: 'Contact',
    slug: 'contact',
    description: 'Default website contact form',
    fields: [
      {
        id: createCmsId('fld'),
        type: 'text',
        label: 'Name',
        name: 'name',
        required: true,
        width: 'full',
      },
      {
        id: createCmsId('fld'),
        type: 'email',
        label: 'Email',
        name: 'email',
        required: true,
        width: 'full',
      },
      {
        id: createCmsId('fld'),
        type: 'phone',
        label: 'Phone',
        name: 'phone',
        required: false,
        width: 'full',
      },
      {
        id: createCmsId('fld'),
        type: 'textarea',
        label: 'Message',
        name: 'message',
        required: true,
        width: 'full',
      },
      {
        id: createCmsId('fld'),
        type: 'consent',
        label: 'I agree to be contacted about my inquiry',
        name: 'consent',
        required: true,
        width: 'full',
      },
    ],
    settings: { ...DEFAULT_FORM_SETTINGS },
  });
}

export async function createCmsForm(input: {
  name: string;
  slug: string;
  description?: string;
  fields?: CmsForm['fields'];
  settings?: Partial<CmsForm['settings']>;
}): Promise<CmsForm> {
  const id = createCmsId('form');
  const now = new Date();
  const form: CmsForm = {
    id,
    name: input.name,
    slug: input.slug,
    description: input.description,
    fields: input.fields ?? [],
    settings: { ...DEFAULT_FORM_SETTINGS, ...(input.settings ?? {}) },
    createdAt: now,
    updatedAt: now,
  };
  await website()
    .collection('forms')
    .doc(id)
    .set({ ...form, createdAt: ts(), updatedAt: ts() });
  return form;
}

export async function updateCmsForm(
  id: string,
  patch: Partial<Omit<CmsForm, 'id' | 'createdAt'>>,
): Promise<CmsForm> {
  const current = await getCmsForm(id);
  if (!current) throw new Error('Form not found');
  const next: CmsForm = {
    ...current,
    ...patch,
    settings: { ...current.settings, ...(patch.settings ?? {}) },
    updatedAt: new Date(),
  };
  await website()
    .collection('forms')
    .doc(id)
    .set({
      ...next,
      createdAt: Timestamp.fromDate(current.createdAt),
      updatedAt: ts(),
    });
  return next;
}

export async function deleteCmsForm(id: string): Promise<void> {
  await website().collection('forms').doc(id).delete();
}

function cmsFieldString(data: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function parseCmsLeadName(data: Record<string, unknown>): { firstName: string; lastName: string } {
  const first = cmsFieldString(data, 'firstName');
  const last = cmsFieldString(data, 'lastName');
  if (first || last) {
    return { firstName: first || 'Website', lastName: last || 'Lead' };
  }
  const full = cmsFieldString(data, 'name', 'fullName');
  if (full) {
    const parts = full.split(/\s+/);
    return {
      firstName: parts[0] || 'Website',
      lastName: parts.slice(1).join(' ') || 'Lead',
    };
  }
  return { firstName: 'Website', lastName: 'Lead' };
}

async function resolveOperatingOrganizationId(): Promise<string | null> {
  const fromEnv =
    process.env.OPERATING_ORGANIZATION_ID?.trim() ||
    process.env.NEXT_PUBLIC_OPERATING_ORGANIZATION_ID?.trim();
  if (fromEnv) return fromEnv;
  const snap = await getAdminFirestore()
    .collection('organizations')
    .orderBy('createdAt', 'asc')
    .limit(1)
    .get();
  if (snap.empty) return null;
  return snap.docs[0]!.id;
}

async function createCrmLeadFromCmsSubmission(input: {
  formName: string;
  data: Record<string, unknown>;
}): Promise<{ customerId: string; organizationId: string } | null> {
  const organizationId = await resolveOperatingOrganizationId();
  if (!organizationId) return null;

  const { firstName, lastName } = parseCmsLeadName(input.data);
  const email = cmsFieldString(input.data, 'email') || null;
  const phone = cmsFieldString(input.data, 'phone', 'mobile') || null;
  const message = cmsFieldString(input.data, 'message', 'notes');
  const notes = [`Website form: ${input.formName}`, message ? `Message: ${message}` : null]
    .filter(Boolean)
    .join('\n');

  const customer = await createCustomer(organizationId, {
    firstName,
    lastName,
    businessName: null,
    customerType: 'residential',
    status: 'lead',
    referralSource: 'website',
    assignedSalespersonId: null,
    assignedSalespersonName: null,
    email,
    secondaryEmail: null,
    phone,
    mobilePhone: phone,
    preferredContactMethod: email ? 'email' : phone ? 'phone' : 'email',
    tags: ['website-lead'],
    notes,
    smsOptIn: false,
    emailOptIn: Boolean(email),
    billingSameAsPhysical: true,
    portalEnabled: false,
    pipelineStage: 'new_lead',
    stageUpdatedAt: new Date(),
    leadSource: 'website',
  } as Parameters<typeof createCustomer>[1]);

  return { customerId: customer.id, organizationId };
}

export async function submitCmsForm(input: {
  formId: string;
  data: Record<string, unknown>;
  honeypot?: string;
}): Promise<{ submissionId: string; successMessage: string; redirectUrl?: string | null }> {
  const form = await getCmsForm(input.formId);
  if (!form) throw new Error('Form not found');
  if (form.settings.spamProtection === 'honeypot' && input.honeypot) {
    return {
      submissionId: 'ignored',
      successMessage: form.settings.successMessage,
      redirectUrl: form.settings.redirectUrl,
    };
  }
  for (const field of form.fields) {
    if (!field.required) continue;
    const value = input.data[field.name];
    if (value === undefined || value === null || value === '' || value === false) {
      throw new Error(`${field.label} is required`);
    }
  }
  const id = createCmsId('sub');
  const submission: CmsFormSubmission = {
    id,
    formId: form.id,
    formName: form.name,
    data: input.data,
    status: 'new',
    notes: '',
    createdAt: new Date(),
  };
  const submissionRef = website()
    .collection('forms')
    .doc(form.id)
    .collection('submissions')
    .doc(id);
  await submissionRef.set({ ...submission, createdAt: ts() });

  try {
    const lead = await createCrmLeadFromCmsSubmission({
      formName: form.name,
      data: input.data,
    });
    if (lead) {
      await submissionRef.update({
        crmCustomerId: lead.customerId,
        crmOrganizationId: lead.organizationId,
      });
    }
  } catch {
    // Never fail the form submit if CRM create fails
  }

  return {
    submissionId: id,
    successMessage: form.settings.successMessage,
    redirectUrl: form.settings.redirectUrl,
  };
}

export async function listFormSubmissions(
  formId: string,
  opts?: { status?: string; search?: string },
): Promise<CmsFormSubmission[]> {
  const snap = await website().collection('forms').doc(formId).collection('submissions').get();
  let items = snap.docs.map((doc) => ({ id: doc.id, ...mapDates(doc.data()) }) as CmsFormSubmission);
  if (opts?.status) items = items.filter((i) => i.status === opts.status);
  if (opts?.search) {
    const q = opts.search.toLowerCase();
    items = items.filter((i) => JSON.stringify(i.data).toLowerCase().includes(q));
  }
  return items.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export async function updateFormSubmission(
  formId: string,
  submissionId: string,
  patch: Partial<Pick<CmsFormSubmission, 'status' | 'notes'>>,
): Promise<CmsFormSubmission> {
  const ref = website().collection('forms').doc(formId).collection('submissions').doc(submissionId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Submission not found');
  const current = { id: snap.id, ...mapDates(snap.data()!) } as CmsFormSubmission;
  const next = { ...current, ...patch };
  await ref.set({ ...next, createdAt: Timestamp.fromDate(current.createdAt) });
  return next;
}

// ——— Collections ———

export async function listCollections(): Promise<CmsCollection[]> {
  const snap = await website().collection('collections').get();
  return snap.docs
    .map((doc) => ({ id: doc.id, ...mapDates(doc.data()) }) as CmsCollection)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getCollection(id: string): Promise<CmsCollection | null> {
  const snap = await website().collection('collections').doc(id).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...mapDates(snap.data()!) } as CmsCollection;
}

export async function createCollection(input: {
  name: string;
  slug: string;
  description?: string;
  fields?: CmsCollection['fields'];
}): Promise<CmsCollection> {
  const id = createCmsId('col');
  const now = new Date();
  const collection: CmsCollection = {
    id,
    name: input.name,
    slug: input.slug,
    description: input.description,
    fields: input.fields ?? [
      { id: createCmsId('cf'), key: 'title', label: 'Title', type: 'text', required: true },
      { id: createCmsId('cf'), key: 'body', label: 'Body', type: 'textarea', required: false },
      { id: createCmsId('cf'), key: 'image', label: 'Image', type: 'image', required: false },
    ],
    createdAt: now,
    updatedAt: now,
  };
  await website()
    .collection('collections')
    .doc(id)
    .set({ ...collection, createdAt: ts(), updatedAt: ts() });
  return collection;
}

export async function updateCollection(
  id: string,
  patch: Partial<Omit<CmsCollection, 'id' | 'createdAt'>>,
): Promise<CmsCollection> {
  const current = await getCollection(id);
  if (!current) throw new Error('Collection not found');
  const next = { ...current, ...patch, updatedAt: new Date() };
  await website()
    .collection('collections')
    .doc(id)
    .set({
      ...next,
      createdAt: Timestamp.fromDate(current.createdAt),
      updatedAt: ts(),
    });
  return next;
}

export async function deleteCollection(id: string): Promise<void> {
  const entries = await website().collection('collections').doc(id).collection('entries').get();
  const batch = getAdminFirestore().batch();
  entries.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(website().collection('collections').doc(id));
  await batch.commit();
}

export async function listCollectionEntries(
  collectionId: string,
  opts?: { status?: string; featuredOnly?: boolean; limit?: number },
): Promise<CmsCollectionEntry[]> {
  const snap = await website().collection('collections').doc(collectionId).collection('entries').get();
  let items = snap.docs.map((doc) => ({ id: doc.id, ...mapDates(doc.data()) }) as CmsCollectionEntry);
  if (opts?.status) items = items.filter((i) => i.status === opts.status);
  if (opts?.featuredOnly) items = items.filter((i) => i.featured);
  items.sort((a, b) => a.sortOrder - b.sortOrder || +new Date(b.updatedAt) - +new Date(a.updatedAt));
  if (opts?.limit) items = items.slice(0, opts.limit);
  return items;
}

export async function upsertCollectionEntry(
  collectionId: string,
  input: Partial<CmsCollectionEntry> & { title: string; slug: string },
): Promise<CmsCollectionEntry> {
  const id = input.id || createCmsId('entry');
  const existing = input.id
    ? await website().collection('collections').doc(collectionId).collection('entries').doc(id).get()
    : null;
  const now = new Date();
  const entry: CmsCollectionEntry = {
    id,
    collectionId,
    title: input.title,
    slug: input.slug,
    status: input.status ?? 'draft',
    data: input.data ?? {},
    tags: input.tags ?? [],
    featured: input.featured ?? false,
    sortOrder: input.sortOrder ?? 0,
    publishedAt: input.publishedAt ?? null,
    scheduledAt: input.scheduledAt ?? null,
    createdAt: existing?.exists
      ? ((existing.data()?.createdAt?.toDate?.() as Date) ?? now)
      : now,
    updatedAt: now,
  };
  await website()
    .collection('collections')
    .doc(collectionId)
    .collection('entries')
    .doc(id)
    .set({
      ...entry,
      createdAt: Timestamp.fromDate(entry.createdAt),
      updatedAt: ts(),
      publishedAt: entry.publishedAt ? Timestamp.fromDate(entry.publishedAt) : null,
      scheduledAt: entry.scheduledAt ? Timestamp.fromDate(entry.scheduledAt) : null,
    });
  return entry;
}

export async function deleteCollectionEntry(collectionId: string, entryId: string): Promise<void> {
  await website().collection('collections').doc(collectionId).collection('entries').doc(entryId).delete();
}

// ——— Notices ———

export async function listNotices(): Promise<CmsNotice[]> {
  const snap = await website().collection('notices').get();
  return snap.docs
    .map((doc) => ({ id: doc.id, ...mapDates(doc.data()) }) as CmsNotice)
    .sort((a, b) => b.priority - a.priority);
}

export async function getActiveNotices(pageSlug?: string): Promise<CmsNotice[]> {
  const all = await listNotices();
  const now = new Date();
  return all.filter((n) => {
    if (!n.enabled) return false;
    if (n.startAt && n.startAt > now) return false;
    if (n.endAt && n.endAt < now) return false;
    if (n.targetPages !== 'all' && pageSlug && !n.targetPages.includes(pageSlug)) return false;
    return true;
  });
}

export async function upsertNotice(
  input: Partial<CmsNotice> & { name: string; type: CmsNotice['type']; title: string; body: string },
): Promise<CmsNotice> {
  const id = input.id || createCmsId('notice');
  const existing = input.id ? await website().collection('notices').doc(id).get() : null;
  const now = new Date();
  const notice: CmsNotice = {
    id,
    name: input.name,
    type: input.type,
    enabled: input.enabled ?? true,
    title: input.title,
    body: input.body,
    buttonLabel: input.buttonLabel ?? null,
    buttonHref: input.buttonHref ?? null,
    imageUrl: input.imageUrl ?? null,
    backgroundColor: input.backgroundColor ?? null,
    textColor: input.textColor ?? null,
    priority: input.priority ?? 0,
    startAt: input.startAt ?? null,
    endAt: input.endAt ?? null,
    targetPages: input.targetPages ?? 'all',
    targetDevices: input.targetDevices ?? ['desktop', 'tablet', 'mobile'],
    displayFrequency: input.displayFrequency ?? 'always',
    dismissible: input.dismissible ?? true,
    createdAt: existing?.exists
      ? ((existing.data()?.createdAt?.toDate?.() as Date) ?? now)
      : now,
    updatedAt: now,
  };
  await website()
    .collection('notices')
    .doc(id)
    .set({
      ...notice,
      createdAt: Timestamp.fromDate(notice.createdAt),
      updatedAt: ts(),
      startAt: notice.startAt ? Timestamp.fromDate(notice.startAt) : null,
      endAt: notice.endAt ? Timestamp.fromDate(notice.endAt) : null,
    });
  return notice;
}

export async function deleteNotice(id: string): Promise<void> {
  await website().collection('notices').doc(id).delete();
}

// ——— Redirects & SEO globals ———

export async function listRedirects(): Promise<CmsRedirect[]> {
  const snap = await website().collection('redirects').get();
  return snap.docs
    .map((doc) => ({ id: doc.id, ...mapDates(doc.data()) }) as CmsRedirect)
    .sort((a, b) => a.fromPath.localeCompare(b.fromPath));
}

export async function upsertRedirect(
  input: Partial<CmsRedirect> & { fromPath: string; toPath: string },
): Promise<CmsRedirect> {
  const id = input.id || createCmsId('redir');
  const now = new Date();
  const existing = input.id ? await website().collection('redirects').doc(id).get() : null;
  const redirect: CmsRedirect = {
    id,
    fromPath: input.fromPath,
    toPath: input.toPath,
    statusCode: input.statusCode ?? 301,
    enabled: input.enabled ?? true,
    createdAt: existing?.exists
      ? ((existing.data()?.createdAt?.toDate?.() as Date) ?? now)
      : now,
    updatedAt: now,
  };
  await website()
    .collection('redirects')
    .doc(id)
    .set({
      ...redirect,
      createdAt: Timestamp.fromDate(redirect.createdAt),
      updatedAt: ts(),
    });
  return redirect;
}

export async function deleteRedirect(id: string): Promise<void> {
  await website().collection('redirects').doc(id).delete();
}

export async function getSeoGlobals(): Promise<CmsSeoGlobals> {
  const snap = await website().collection('globals').doc('seo').get();
  if (!snap.exists) return { ...DEFAULT_SEO_GLOBALS };
  return mapDates(snap.data()!) as CmsSeoGlobals;
}

export async function updateSeoGlobals(
  input: Omit<CmsSeoGlobals, 'updatedAt'>,
): Promise<CmsSeoGlobals> {
  const next = { ...input, updatedAt: new Date() };
  await website()
    .collection('globals')
    .doc('seo')
    .set({ ...next, updatedAt: ts() });
  return next;
}

export async function findRedirect(pathname: string): Promise<CmsRedirect | null> {
  const all = await listRedirects();
  return all.find((r) => r.enabled && r.fromPath === pathname) ?? null;
}
