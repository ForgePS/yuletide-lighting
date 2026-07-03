import { createCustomer, updateCustomer, colCreate, colList, colUpdate, getCustomer } from './firestore';
import {
  createCustomerProperty360,
  updateCustomerProperty360,
  listCustomerProperties360,
  logCustomerActivity,
} from './customer360';
import { upsertContact360 } from './contacts';
import { createInventoryItem360, ensureDefaultWarehouses, findOrCreateInventoryCategory, listInventoryItems360, updateInventoryItem360 } from './inventory360';
import { createProposal360, updateProposalStatus } from './proposals';
import { recordInvoicePayment360 } from './invoices360';
import { getAdminFirestore } from './admin';
import { nanoid } from 'nanoid';
import type { CustomerType, CustomerStatus, InvoiceStatus, ProposalStatus, InventoryCategoryGroup } from '@clcrm/types';

export type ImportRowStatus = 'ready' | 'warning' | 'error';

export type ImportPreviewRow = {
  rowNumber: number;
  label: string;
  status: ImportRowStatus;
  messages: string[];
};

export type ImportPreviewResult = {
  totalRows: number;
  readyCount: number;
  warningCount: number;
  errorCount: number;
  rows: ImportPreviewRow[];
  sample: Array<Record<string, string>>;
};

export type ImportRunResult = {
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: Array<{ rowNumber: number; message: string }>;
};

type CustomerIndex = {
  byEmail: Map<string, string>;
  byDisplayName: Map<string, string>;
  byFullName: Map<string, string>;
  byBusinessName: Map<string, string>;
};

function normalizeHeader(header: string) {
  return header.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ');
}

function normalizeClientKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeStreet(value: string) {
  return value.trim().toLowerCase().replace(/[.,#]/g, '').replace(/\s+/g, ' ');
}

function getCell(row: Record<string, string>, ...aliases: string[]) {
  const normalized = new Map<string, string>();
  for (const [key, value] of Object.entries(row)) {
    normalized.set(normalizeHeader(key), value?.trim() ?? '');
  }
  for (const alias of aliases) {
    const hit = normalized.get(normalizeHeader(alias));
    if (hit) return hit;
  }
  return '';
}

function parseImportName(raw: string) {
  const value = raw.trim();
  if (!value) return { firstName: '', lastName: '' };
  if (value.includes(',')) {
    const [last, rest] = value.split(',', 2);
    return { firstName: rest?.trim() || 'Client', lastName: last.trim() || 'Unknown' };
  }
  const parts = value.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: 'Client' };
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts.at(-1) ?? 'Client' };
}

function mapImportCustomerType(raw: string): CustomerType {
  const value = raw.trim().toUpperCase();
  if (value === 'COMMERCIAL') return 'commercial';
  if (value === 'HOA') return 'hoa';
  if (value === 'MUNICIPAL') return 'municipal';
  if (value === 'CHURCH') return 'church';
  if (value === 'SCHOOL') return 'school';
  return 'residential';
}

function mapImportCustomerStatus(raw: string): CustomerStatus {
  const value = raw.trim().toUpperCase();
  if (value === 'CUSTOMER' || value === 'ACTIVE') return 'active';
  if (value === 'INACTIVE' || value === 'ARCHIVED') return 'archived';
  if (value === 'SCHEDULED') return 'scheduled';
  if (value === 'INSTALLED') return 'installed';
  if (value === 'WAIT LIST' || value === 'WAITLIST') return 'lead';
  return 'lead';
}

function mapImportProjectStatus(stage: string, status: string): ProposalStatus {
  const stageValue = stage.trim().toUpperCase();
  const statusValue = status.trim().toUpperCase();
  if (statusValue === 'LOST' || statusValue === 'CANCELED') return 'declined';
  if (statusValue === 'COMPLETED') return 'approved';
  if (stageValue === 'PROPOSAL') return 'sent';
  if (stageValue === 'REMOVAL' || stageValue === 'REVIEWS' || stageValue === 'PREPARATION') return 'approved';
  return 'draft';
}

function mapImportInvoiceStatus(raw: string, amountCents: number, paidCents: number): InvoiceStatus {
  const value = raw.trim().toUpperCase();
  if (value === 'OVERDUE') return 'overdue';
  if (paidCents >= amountCents && amountCents > 0) return 'paid';
  if (paidCents > 0) return 'partially_paid';
  if (value === 'PAID') return 'paid';
  return 'sent';
}

function parseMoneyToCents(raw: string) {
  const cleaned = raw.replace(/[$,\s]/g, '').trim();
  if (!cleaned || cleaned.toUpperCase() === 'NULL') return 0;
  const num = Number(cleaned);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100);
}

function parseQuantity(raw: string) {
  const cleaned = raw.replace(/,/g, '').trim();
  if (!cleaned) return 0;
  const num = Number(cleaned);
  return Number.isFinite(num) ? Math.max(0, Math.round(num)) : 0;
}

function parseBoolStock(raw: string) {
  return raw.trim().toUpperCase() === 'TRUE';
}

function parseDate(raw: string) {
  if (!raw.trim()) return new Date();
  const parsed = new Date(raw.trim());
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function importProjectKey(client: string, created: string, street: string) {
  return `${normalizeClientKey(client)}|${created}|${normalizeStreet(street)}`;
}

function importInvoiceKey(invoiceNumber: string) {
  return `TIN-${invoiceNumber.trim()}`;
}

async function buildCustomerIndex(orgId: string): Promise<CustomerIndex> {
  const db = getAdminFirestore();
  const snap = await db.collection(`organizations/${orgId}/customers`).get();
  const index: CustomerIndex = {
    byEmail: new Map(),
    byDisplayName: new Map(),
    byFullName: new Map(),
    byBusinessName: new Map(),
  };

  for (const doc of snap.docs) {
    const data = doc.data();
    const id = doc.id;
    const firstName = String(data.firstName ?? '').trim();
    const lastName = String(data.lastName ?? '').trim();
    const businessName = String(data.businessName ?? '').trim();
    const email = String(data.email ?? '').trim().toLowerCase();
    const fullName = `${firstName} ${lastName}`.trim();

    if (email) index.byEmail.set(email, id);
    if (fullName) {
      index.byFullName.set(normalizeClientKey(fullName), id);
      index.byDisplayName.set(normalizeClientKey(fullName), id);
    }
    if (businessName) {
      index.byBusinessName.set(normalizeClientKey(businessName), id);
      index.byDisplayName.set(normalizeClientKey(businessName), id);
    }
    for (const tag of (data.tags as string[] | undefined) ?? []) {
      if (tag.startsWith('import-name:') || tag.startsWith('tinsel-name:')) {
        index.byDisplayName.set(normalizeClientKey(tag.replace(/^(import-name:|tinsel-name:)/, '')), id);
      }
    }
  }

  return index;
}

function resolveCustomerId(index: CustomerIndex, clientName: string, email?: string | null) {
  if (email) {
    const byEmail = index.byEmail.get(email.trim().toLowerCase());
    if (byEmail) return byEmail;
  }
  const key = normalizeClientKey(clientName);
  return (
    index.byDisplayName.get(key) ??
    index.byBusinessName.get(key) ??
    index.byFullName.get(key) ??
    null
  );
}

function resolveExistingCustomerId(index: CustomerIndex, data: ParsedImportCustomer) {
  return resolveCustomerId(index, data.displayName, data.email);
}

function hasImportAddress(data: ParsedImportCustomer) {
  return !data.addressLine1.toLowerCase().includes('address pending');
}

async function upsertPrimaryPropertyFromImport(
  orgId: string,
  customerId: string,
  data: ParsedImportCustomer,
  userId: string,
) {
  if (!hasImportAddress(data)) return;

  const properties = await listCustomerProperties360(orgId, customerId);
  const primary = properties.find((property) => property.label === 'Primary') ?? properties[0];
  const propertyFields = {
    propertyName: primary?.propertyName ?? 'Primary',
    propertyType: data.customerType,
    label: primary?.label ?? 'Primary',
    addressLine1: data.addressLine1,
    addressLine2: data.addressLine2,
    city: data.city,
    state: data.state,
    postalCode: data.postalCode,
    country: 'US' as const,
  };

  if (primary) {
    await updateCustomerProperty360(orgId, customerId, primary.id, propertyFields, userId);
    return;
  }

  await createCustomerProperty360(
    orgId,
    customerId,
    {
      ...propertyFields,
      latitude: null,
      longitude: null,
      gateCode: null,
      hoaInfo: null,
      accessInstructions: null,
      installNotes: null,
      powerSourceLocations: null,
      ladderAccessPoints: null,
      roofMeasurementNotes: null,
      treeCount: null,
      shrubCount: null,
      wreathLocations: null,
      garlandLocations: null,
      siteHazards: [],
      siteHazardNotes: null,
      photos: {},
    },
    userId,
  );
}

async function updateExistingImportedCustomer(
  orgId: string,
  userId: string,
  customerId: string,
  data: ParsedImportCustomer,
) {
  const existing = await getCustomer(orgId, customerId);
  const mergedTags = [...new Set([...(existing?.tags ?? []), ...data.tags, 'csv-import'])];

  await updateCustomer(orgId, customerId, {
    firstName: data.firstName,
    lastName: data.lastName,
    businessName: data.businessName,
    customerType: data.customerType,
    status: data.status,
    referralSource: data.referralSource ?? existing?.referralSource ?? null,
    email: data.email ?? existing?.email ?? null,
    phone: data.phone ?? existing?.phone ?? null,
    mobilePhone: data.mobilePhone ?? existing?.mobilePhone ?? null,
    preferredContactMethod: data.email ? 'email' : data.phone ? 'phone' : existing?.preferredContactMethod ?? 'email',
    notes: data.notes ?? existing?.notes ?? null,
    tags: mergedTags,
  });

  await upsertPrimaryPropertyFromImport(orgId, customerId, data, userId);
  await logCustomerActivity(orgId, customerId, 'note_added', 'Updated from CSV import', userId);
}

function registerCustomerInIndex(index: CustomerIndex, customerId: string, data: ParsedImportCustomer) {
  if (data.email) index.byEmail.set(data.email.toLowerCase(), customerId);
  index.byDisplayName.set(normalizeClientKey(data.displayName), customerId);
  index.byFullName.set(normalizeClientKey(`${data.firstName} ${data.lastName}`), customerId);
  if (data.businessName) index.byBusinessName.set(normalizeClientKey(data.businessName), customerId);
}

export type ParsedImportCustomer = {
  displayName: string;
  firstName: string;
  lastName: string;
  businessName: string | null;
  customerType: CustomerType;
  status: CustomerStatus;
  email: string | null;
  phone: string | null;
  mobilePhone: string | null;
  referralSource: string | null;
  notes: string | null;
  tags: string[];
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
};

export function parseImportCustomerRow(row: Record<string, string>): { data?: ParsedImportCustomer; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  const displayName = getCell(row, 'Name', 'Client Name', 'Client');
  const contactFirst = getCell(row, 'Contact 1 First Name', 'Contact First Name', 'First Name');
  const contactLast = getCell(row, 'Contact 1 Last Name', 'Contact Last Name', 'Last Name');

  let firstName = contactFirst;
  let lastName = contactLast;
  if (!firstName && !lastName && displayName) {
    const parsed = parseImportName(displayName);
    firstName = parsed.firstName;
    lastName = parsed.lastName;
  }
  if (!firstName) firstName = 'Imported';
  if (!lastName) lastName = 'Client';

  const typeRaw = getCell(row, 'Type', 'Client Type');
  let businessName = getCell(row, 'Business Name', 'Company') || null;
  if (!businessName && mapImportCustomerType(typeRaw) === 'commercial' && displayName) {
    businessName = displayName;
  }

  const email = getCell(row, 'Contact 1 Email', 'Email', 'Primary Email') || null;
  const phone = getCell(row, 'Contact 1 Phone', 'Phone', 'Phone Number', 'Primary Phone') || null;
  const mobilePhone = getCell(row, 'Contact 1 Mobile', 'Mobile Phone', 'Mobile') || null;

  const contact2 = [
    getCell(row, 'Contact 2 First Name'),
    getCell(row, 'Contact 2 Last Name'),
    getCell(row, 'Contact 2 Phone'),
    getCell(row, 'Contact 2 Email'),
  ].filter(Boolean).join(' · ');

  let addressLine1 = getCell(row, 'Street', 'Address', 'Address Line 1', 'Service Address');
  const addressLine2 = getCell(row, 'Address Line 2', 'Suite', 'Unit') || null;
  let city = getCell(row, 'City');
  let state = getCell(row, 'State', 'Province');
  let postalCode = getCell(row, 'Postal Code', 'Zip', 'ZIP', 'Postal');

  if (!addressLine1) {
    addressLine1 = 'Address pending — update after import';
    warnings.push('Missing street address; placeholder used');
  }
  if (!city) {
    city = 'Unknown';
    warnings.push('Missing city; placeholder used');
  }
  if (!state) {
    state = 'XX';
    warnings.push('Missing state; placeholder used');
  }
  if (!postalCode) {
    postalCode = '00000';
    warnings.push('Missing postal code; placeholder used');
  }

  const leadType = getCell(row, 'Lead Type', 'Lead Source', 'Referral Source');
  const notesParts = [getCell(row, 'Notes', 'Client Notes'), contact2 ? `Contact 2: ${contact2}` : ''].filter(Boolean);
  const tags = getCell(row, 'Tags')
    .split(/[;,]/)
    .map((tag) => tag.trim())
    .filter(Boolean);

  if (leadType && !tags.includes(leadType)) tags.push(leadType);
  if (displayName) tags.push(`import-name:${displayName}`);

  const statusRaw = getCell(row, 'Status');
  if (!email && !phone) warnings.push('No email or phone on record');

  return {
    data: {
      displayName: displayName || `${firstName} ${lastName}`.trim(),
      firstName,
      lastName,
      businessName,
      customerType: mapImportCustomerType(typeRaw),
      status: mapImportCustomerStatus(statusRaw),
      email,
      phone,
      mobilePhone,
      referralSource: leadType || null,
      notes: notesParts.join('\n') || null,
      tags,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
    },
    errors,
    warnings,
  };
}

export type ParsedImportContact = {
  clientName: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
};

export function parseImportContactRow(row: Record<string, string>): { data?: ParsedImportContact; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const clientName = getCell(row, 'Client Name', 'Name', 'Client');
  const firstName = getCell(row, 'First Name', 'Contact 1 First Name');
  const lastName = getCell(row, 'Last Name', 'Contact 1 Last Name');

  if (!clientName) errors.push('Client Name is required');
  if (!firstName && !lastName) errors.push('Contact name is required');
  if (errors.length) return { errors, warnings };

  return {
    data: {
      clientName,
      firstName: firstName || 'Contact',
      lastName: lastName || 'Unknown',
      phone: getCell(row, 'Phone Number', 'Phone', 'Contact 1 Phone') || null,
      email: getCell(row, 'Email', 'Contact 1 Email') || null,
    },
    errors,
    warnings,
  };
}

export type ParsedImportProject = {
  title: string;
  clientName: string;
  siteStreet: string;
  siteCity: string;
  siteState: string;
  sitePostalCode: string;
  category: string | null;
  storageLocation: string | null;
  stage: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  dedupeKey: string;
};

export function parseImportProjectRow(row: Record<string, string>): { data?: ParsedImportProject; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  const title = getCell(row, 'Name', 'Project');
  const clientName = getCell(row, 'Client', 'Client Name');
  const siteStreet = getCell(row, 'Site Street', 'Street', 'Address');

  if (!title) errors.push('Project name is required');
  if (!clientName) errors.push('Client is required');
  if (!siteStreet) warnings.push('Missing site street; will use client primary property if available');
  if (errors.length) return { errors, warnings };

  const createdRaw = getCell(row, 'Created');
  const updatedRaw = getCell(row, 'Updated');

  return {
    data: {
      title,
      clientName,
      siteStreet,
      siteCity: getCell(row, 'Site City', 'City') || 'Unknown',
      siteState: getCell(row, 'Site State', 'State') || 'XX',
      sitePostalCode: getCell(row, 'Site Postal Code', 'Postal Code', 'Zip') || '00000',
      category: getCell(row, 'Category') || null,
      storageLocation: getCell(row, 'Storage Location') || null,
      stage: getCell(row, 'Stage'),
      status: getCell(row, 'Status'),
      createdAt: parseDate(createdRaw),
      updatedAt: parseDate(updatedRaw),
      dedupeKey: importProjectKey(clientName, createdRaw, siteStreet || title),
    },
    errors,
    warnings,
  };
}

export type ParsedImportInvoice = {
  invoiceNumber: string;
  clientName: string;
  projectName: string | null;
  amountCents: number;
  paidCents: number;
  dueCents: number;
  status: string;
  issueDate: Date;
  dueDate: Date;
  phone: string | null;
  email: string | null;
  invoiceKey: string;
};

export function parseImportInvoiceRow(row: Record<string, string>): { data?: ParsedImportInvoice; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  const invoiceNumber = getCell(row, 'Invoice #', 'Invoice Number', 'Invoice');
  const clientName = getCell(row, 'Client', 'Client Name');
  const amountCents = parseMoneyToCents(getCell(row, 'Amount'));
  const paidCents = parseMoneyToCents(getCell(row, 'Paid'));

  if (!invoiceNumber) errors.push('Invoice # is required');
  if (!clientName) errors.push('Client is required');
  if (amountCents <= 0) warnings.push('Invoice amount is zero');
  if (errors.length) return { errors, warnings };

  return {
    data: {
      invoiceNumber,
      clientName,
      projectName: getCell(row, 'Project') || null,
      amountCents,
      paidCents,
      dueCents: parseMoneyToCents(getCell(row, 'Due')),
      status: getCell(row, 'Status'),
      issueDate: parseDate(getCell(row, 'Issue Date')),
      dueDate: parseDate(getCell(row, 'Due Date')),
      phone: getCell(row, 'Phone') || null,
      email: getCell(row, 'Email') || null,
      invoiceKey: importInvoiceKey(invoiceNumber),
    },
    errors,
    warnings,
  };
}

export type ParsedImportInventoryItem = {
  sku: string;
  name: string;
  description: string | null;
  categoryName: string | null;
  manufacturer: string | null;
  unitCostCents: number;
  sellPriceCents: number;
  quantityOnHand: number;
  reorderLevel: number;
  isSeasonal: boolean;
  locationAisle: string | null;
  locationRack: string | null;
  locationShelf: string | null;
  locationBin: string | null;
};

const TINSEL_CATEGORY_MAP: Array<{ pattern: RegExp; group: InventoryCategoryGroup; name: string }> = [
  { pattern: /\bc9\b|socket wire|c9 bulb/i, group: 'lighting', name: 'C9 Bulbs' },
  { pattern: /\bc7\b|c7 bulb/i, group: 'lighting', name: 'C7 Bulbs' },
  { pattern: /mini light|miniature/i, group: 'lighting', name: 'Mini Lights' },
  { pattern: /rgb|pixel|smart light/i, group: 'lighting', name: 'RGB Lights' },
  { pattern: /permanent/i, group: 'lighting', name: 'Permanent Lighting' },
  { pattern: /bulb|light string|string light|led/i, group: 'lighting', name: 'Mini Lights' },
  { pattern: /spt1/i, group: 'wire_components', name: 'SPT1' },
  { pattern: /spt2|wire|socket wire|bulk wire/i, group: 'wire_components', name: 'SPT2' },
  { pattern: /extension|cord/i, group: 'wire_components', name: 'Extension Cords' },
  { pattern: /splitter|tap/i, group: 'wire_components', name: 'Splitters' },
  { pattern: /controller|timer|remote/i, group: 'wire_components', name: 'Controllers' },
  { pattern: /power supply|transformer|adapter/i, group: 'wire_components', name: 'Power Supplies' },
  { pattern: /wreath/i, group: 'decor', name: 'Wreaths' },
  { pattern: /garland/i, group: 'decor', name: 'Garland' },
  { pattern: /bow|ribbon/i, group: 'decor', name: 'Bows' },
  { pattern: /pole|display|commercial decor/i, group: 'decor', name: 'Commercial Displays' },
  { pattern: /clip|shingle|tab/i, group: 'installation_supplies', name: 'Clips' },
  { pattern: /stake|ground/i, group: 'installation_supplies', name: 'Stakes' },
  { pattern: /zip tie|tie wrap/i, group: 'installation_supplies', name: 'Zip Ties' },
  { pattern: /fastener|screw|anchor/i, group: 'installation_supplies', name: 'Fasteners' },
  { pattern: /ladder/i, group: 'equipment', name: 'Ladders' },
  { pattern: /lift|bucket/i, group: 'equipment', name: 'Lift Equipment' },
  { pattern: /safety|glove|harness/i, group: 'equipment', name: 'Safety Gear' },
  { pattern: /tool|drill|bit/i, group: 'equipment', name: 'Tools' },
];

function mapImportCategoryName(raw: string | null): string | null {
  if (!raw?.trim()) return null;
  const normalized = raw.trim();
  for (const entry of TINSEL_CATEGORY_MAP) {
    if (entry.pattern.test(normalized)) return entry.name;
  }
  return normalized;
}

export function parseImportInventoryRow(row: Record<string, string>): { data?: ParsedImportInventoryItem; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  const sku = getCell(row, 'SKU', 'Sku');
  const name = getCell(row, 'Name', 'Item Name', 'Description');

  if (!sku) errors.push('SKU is required');
  if (!name) errors.push('Name is required');
  if (errors.length) return { errors, warnings };

  const rawCategory = getCell(row, 'Category') || null;
  const categoryName = mapImportCategoryName(rawCategory);
  const unitCostCents = parseMoneyToCents(getCell(row, 'Cost', 'Unit Cost'));
  const sellPriceCents = parseMoneyToCents(getCell(row, 'Single Price', 'Price', 'Sell Price', 'Retail Price')) || unitCostCents * 2;
  const quantityOnHand =
    parseQuantity(getCell(row, 'Stock Current', 'Stock Adjusted', 'Quantity', 'Qty On Hand', 'On Hand', 'In Stock')) ||
    (parseBoolStock(getCell(row, 'Stock')) ? 1 : 0);
  const reorderLevel = parseQuantity(getCell(row, 'Reorder Level', 'Reorder', 'Min Stock', 'Minimum Stock')) || 10;
  const description = getCell(row, 'Description', 'Notes', 'Item Description') || null;
  const manufacturer = getCell(row, 'Manufacturer', 'Brand', 'Vendor', 'Supplier') || null;
  const locationAisle = getCell(row, 'Aisle', 'Location Aisle') || null;
  const locationRack = getCell(row, 'Rack', 'Location Rack') || null;
  const locationShelf = getCell(row, 'Shelf', 'Location Shelf') || null;
  const locationBin = getCell(row, 'Bin', 'Location Bin', 'Location') || null;

  if (quantityOnHand === 0) warnings.push('Quantity is zero');
  if (rawCategory && categoryName !== rawCategory.trim()) warnings.push(`Category "${rawCategory}" mapped to "${categoryName}"`);

  return {
    data: {
      sku,
      name,
      description,
      categoryName,
      manufacturer,
      unitCostCents,
      sellPriceCents,
      quantityOnHand,
      reorderLevel,
      isSeasonal: true,
      locationAisle,
      locationRack,
      locationShelf,
      locationBin,
    },
    errors,
    warnings,
  };
}

function previewRows<T>(
  rows: Record<string, string>[],
  parser: (row: Record<string, string>) => { data?: T; errors: string[]; warnings: string[] },
  labelFn: (data: T) => string,
  fallbackLabel?: (row: Record<string, string>, index: number) => string,
): ImportPreviewResult {
  const previewRows: ImportPreviewRow[] = rows.map((row, index) => {
    const parsed = parser(row);
    const messages = [...parsed.errors, ...parsed.warnings];
    const status: ImportRowStatus =
      parsed.errors.length > 0 ? 'error' : parsed.warnings.length > 0 ? 'warning' : 'ready';
    return {
      rowNumber: index + 2,
      label: parsed.data
        ? labelFn(parsed.data)
        : (fallbackLabel?.(row, index) ?? (getCell(row, 'Name', 'SKU', 'Client Name', 'Client') || `Row ${index + 2}`)),
      status,
      messages,
    };
  });

  return {
    totalRows: rows.length,
    readyCount: previewRows.filter((r) => r.status === 'ready').length,
    warningCount: previewRows.filter((r) => r.status === 'warning').length,
    errorCount: previewRows.filter((r) => r.status === 'error').length,
    rows: previewRows.slice(0, 100),
    sample: rows.slice(0, 3),
  };
}

export function previewCsvCustomers(rows: Record<string, string>[]) {
  return previewRows(rows, parseImportCustomerRow, (c) => c.displayName);
}

export function previewCsvContacts(rows: Record<string, string>[]) {
  return previewRows(rows, parseImportContactRow, (c) => `${c.clientName} — ${c.firstName} ${c.lastName}`);
}

export function previewCsvProjects(rows: Record<string, string>[]) {
  return previewRows(rows, parseImportProjectRow, (p) => `${p.clientName} — ${p.title}`);
}

export function previewCsvInvoices(rows: Record<string, string>[]) {
  return previewRows(rows, parseImportInvoiceRow, (i) => `#${i.invoiceNumber} — ${i.clientName}`);
}

export function previewCsvInventory(rows: Record<string, string>[]) {
  return previewRows(rows, parseImportInventoryRow, (i) => `${i.sku} — ${i.name}`);
}

async function loadExistingItemsBySku(orgId: string) {
  const items = await listInventoryItems360(orgId);
  return new Map(items.map((item) => [item.sku.toLowerCase(), item]));
}

async function loadExistingImportedInvoiceKeys(orgId: string) {
  const invoices = await colList<{ invoiceNumber?: string }>(orgId, 'invoices');
  return new Set(invoices.map((invoice) => invoice.invoiceNumber).filter(Boolean) as string[]);
}

async function loadExistingImportedProjectKeys(orgId: string) {
  const proposals = await colList<{ notes?: string | null }>(orgId, 'proposals');
  const keys = new Set<string>();
  for (const proposal of proposals) {
    const match = proposal.notes?.match(/(?:import-project|tinsel-project):([^\n]+)/);
    if (match?.[1]) keys.add(match[1].trim());
  }
  return keys;
}

async function resolvePropertyForProject(
  orgId: string,
  customerId: string,
  data: ParsedImportProject,
  customerType: CustomerType,
  userId: string,
) {
  const properties = await listCustomerProperties360(orgId, customerId);
  const streetKey = normalizeStreet(data.siteStreet);
  const existing = properties.find((property) => normalizeStreet(property.addressLine1) === streetKey);
  if (existing) return existing.id;

  if (!data.siteStreet) {
    const primary = properties.find((property) => property.label === 'Primary') ?? properties[0];
    if (primary) return primary.id;
  }

  const created = await createCustomerProperty360(
    orgId,
    customerId,
    {
      propertyName: data.title,
      propertyType: customerType,
      label: data.siteStreet || data.title,
      addressLine1: data.siteStreet || 'Imported project site',
      addressLine2: null,
      city: data.siteCity,
      state: data.siteState,
      postalCode: data.sitePostalCode,
      country: 'US',
      latitude: null,
      longitude: null,
      gateCode: null,
      hoaInfo: null,
      accessInstructions: null,
      installNotes: data.storageLocation ? `Storage: ${data.storageLocation}` : null,
      powerSourceLocations: null,
      ladderAccessPoints: null,
      roofMeasurementNotes: null,
      treeCount: null,
      shrubCount: null,
      wreathLocations: null,
      garlandLocations: null,
      siteHazards: [],
      siteHazardNotes: null,
      photos: {},
    },
    userId,
  );
  return created.id;
}

export async function importCsvCustomers(
  orgId: string,
  userId: string,
  rows: Record<string, string>[],
  options: { skipDuplicates?: boolean } = {},
): Promise<ImportRunResult> {
  const result: ImportRunResult = { imported: 0, updated: 0, skipped: 0, failed: 0, errors: [] };
  const index = await buildCustomerIndex(orgId);

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 2;
    const parsed = parseImportCustomerRow(rows[i]);
    if (!parsed.data || parsed.errors.length) {
      result.failed += 1;
      result.errors.push({ rowNumber, message: parsed.errors.join('; ') || 'Invalid row' });
      continue;
    }

    const data = parsed.data;
    const existingId = resolveExistingCustomerId(index, data);

    if (existingId && options.skipDuplicates !== false) {
      try {
        await updateExistingImportedCustomer(orgId, userId, existingId, data);
        registerCustomerInIndex(index, existingId, data);
        result.updated += 1;
      } catch (error) {
        result.failed += 1;
        result.errors.push({ rowNumber, message: error instanceof Error ? error.message : 'Update failed' });
      }
      continue;
    }

    try {
      const customer = await createCustomer(orgId, {
        firstName: data.firstName,
        lastName: data.lastName,
        businessName: data.businessName,
        customerType: data.customerType,
        status: data.status,
        referralSource: data.referralSource,
        assignedSalespersonId: null,
        assignedSalespersonName: null,
        email: data.email,
        secondaryEmail: null,
        phone: data.phone,
        mobilePhone: data.mobilePhone,
        preferredContactMethod: data.email ? 'email' : data.phone ? 'phone' : 'email',
        notes: data.notes,
        tags: [...data.tags, 'csv-import'],
        smsOptIn: true,
        emailOptIn: true,
        billingSameAsPhysical: true,
        billingAddressLine1: null,
        billingAddressLine2: null,
        billingCity: null,
        billingState: null,
        billingPostalCode: null,
        mailingSameAsBilling: true,
        mailingAddressLine1: null,
        mailingAddressLine2: null,
        mailingCity: null,
        mailingState: null,
        mailingPostalCode: null,
        portalEnabled: false,
      });

      await createCustomerProperty360(
        orgId,
        customer.id,
        {
          propertyName: 'Primary',
          propertyType: data.customerType,
          label: 'Primary',
          addressLine1: data.addressLine1,
          addressLine2: data.addressLine2,
          city: data.city,
          state: data.state,
          postalCode: data.postalCode,
          country: 'US',
          latitude: null,
          longitude: null,
          gateCode: null,
          hoaInfo: null,
          accessInstructions: null,
          installNotes: null,
          powerSourceLocations: null,
          ladderAccessPoints: null,
          roofMeasurementNotes: null,
          treeCount: null,
          shrubCount: null,
          wreathLocations: null,
          garlandLocations: null,
          siteHazards: [],
          siteHazardNotes: null,
          photos: {},
        },
        userId,
      );

      await logCustomerActivity(orgId, customer.id, 'lead_created', 'Imported from CSV', userId);
      registerCustomerInIndex(index, customer.id, data);
      result.imported += 1;
    } catch (error) {
      result.failed += 1;
      result.errors.push({ rowNumber, message: error instanceof Error ? error.message : 'Import failed' });
    }
  }

  return result;
}

export async function importCsvContacts(
  orgId: string,
  userId: string,
  rows: Record<string, string>[],
  options: { skipDuplicates?: boolean } = {},
): Promise<ImportRunResult> {
  const result: ImportRunResult = { imported: 0, updated: 0, skipped: 0, failed: 0, errors: [] };
  const index = await buildCustomerIndex(orgId);
  const db = getAdminFirestore();

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 2;
    const parsed = parseImportContactRow(rows[i]);
    if (!parsed.data || parsed.errors.length) {
      result.failed += 1;
      result.errors.push({ rowNumber, message: parsed.errors.join('; ') || 'Invalid row' });
      continue;
    }

    const data = parsed.data;
    const customerId = resolveCustomerId(index, data.clientName, data.email);
    if (!customerId) {
      result.failed += 1;
      result.errors.push({ rowNumber, message: `No matching customer for "${data.clientName}" — import clients first` });
      continue;
    }

    try {
      const upserted = await upsertContact360(
        orgId,
        {
          customerId,
          customerName: data.clientName,
          firstName: data.firstName,
          lastName: data.lastName,
          role: 'primary',
          phone: data.phone ?? '',
          email: data.email ?? '',
          phoneExtension: '',
          title: '',
          notes: '',
          isPrimary: true,
          smsOptIn: true,
          emailOptIn: true,
          tags: ['csv-import'],
          source: 'csv',
        },
        userId,
      );

      const ref = db.doc(`organizations/${orgId}/customers/${customerId}`);
      const snap = await ref.get();
      const existing = snap.data() ?? {};
      const patch: Record<string, unknown> = {};
      if (data.email && !existing.email) patch.email = data.email;
      if (data.phone && !existing.phone) patch.phone = data.phone;
      if (Object.keys(patch).length) await ref.update({ ...patch, updatedAt: new Date() });
      if (upserted.created) result.imported += 1;
      else result.updated += 1;
    } catch (error) {
      result.failed += 1;
      result.errors.push({ rowNumber, message: error instanceof Error ? error.message : 'Import failed' });
    }
  }

  if (options.skipDuplicates) return result;
  return result;
}

export async function importCsvProjects(
  orgId: string,
  userId: string,
  rows: Record<string, string>[],
  options: { skipDuplicates?: boolean } = {},
): Promise<ImportRunResult> {
  const result: ImportRunResult = { imported: 0, updated: 0, skipped: 0, failed: 0, errors: [] };
  const customerIndex = await buildCustomerIndex(orgId);
  const existingKeys = options.skipDuplicates ? await loadExistingImportedProjectKeys(orgId) : new Set<string>();
  const db = getAdminFirestore();

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 2;
    const parsed = parseImportProjectRow(rows[i]);
    if (!parsed.data || parsed.errors.length) {
      result.failed += 1;
      result.errors.push({ rowNumber, message: parsed.errors.join('; ') || 'Invalid row' });
      continue;
    }

    const data = parsed.data;
    if (existingKeys.has(data.dedupeKey)) {
      result.skipped += 1;
      continue;
    }

    const customerId = resolveCustomerId(customerIndex, data.clientName);
    if (!customerId) {
      result.failed += 1;
      result.errors.push({ rowNumber, message: `No matching customer for "${data.clientName}" — import clients first` });
      continue;
    }

    try {
      const customerSnap = await db.doc(`organizations/${orgId}/customers/${customerId}`).get();
      const customerType = (customerSnap.data()?.customerType as CustomerType | undefined) ?? 'residential';
      const propertyId = await resolvePropertyForProject(orgId, customerId, data, customerType, userId);
      const proposalStatus = mapImportProjectStatus(data.stage, data.status);
      const notes = [
        `import-project:${data.dedupeKey}`,
        `Imported from CSV.`,
        `Stage: ${data.stage || '—'}`,
        `Status: ${data.status || '—'}`,
        data.category ? `Category: ${data.category}` : '',
        data.storageLocation ? `Storage: ${data.storageLocation}` : '',
      ].filter(Boolean).join('\n');

      const proposal = await createProposal360(
        orgId,
        {
          customerId,
          propertyId,
          title: data.title,
          season: data.category ?? 'Christmas',
          installType: 'roofline',
          scopeOfWork: `Imported project for ${data.clientName}.`,
          notes,
          lineItems: [
            {
              id: nanoid(),
              description: data.title,
              quantity: 1,
              unitPriceCents: 0,
              agreementCode: 'single',
            },
          ],
        },
        userId,
      );
      if (!proposal) throw new Error('Could not create proposal for imported project');

      if (proposalStatus !== 'draft') {
        await updateProposalStatus(orgId, proposal.id, proposalStatus, userId);
      }
      await colUpdate(orgId, 'proposals', proposal.id, {
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });

      existingKeys.add(data.dedupeKey);
      result.imported += 1;
    } catch (error) {
      result.failed += 1;
      result.errors.push({ rowNumber, message: error instanceof Error ? error.message : 'Import failed' });
    }
  }

  return result;
}

export async function importCsvInvoices(
  orgId: string,
  userId: string,
  rows: Record<string, string>[],
  options: { skipDuplicates?: boolean } = {},
): Promise<ImportRunResult> {
  const result: ImportRunResult = { imported: 0, updated: 0, skipped: 0, failed: 0, errors: [] };
  const customerIndex = await buildCustomerIndex(orgId);
  const existingInvoiceKeys = options.skipDuplicates ? await loadExistingImportedInvoiceKeys(orgId) : new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 2;
    const parsed = parseImportInvoiceRow(rows[i]);
    if (!parsed.data || parsed.errors.length) {
      result.failed += 1;
      result.errors.push({ rowNumber, message: parsed.errors.join('; ') || 'Invalid row' });
      continue;
    }

    const data = parsed.data;
    if (existingInvoiceKeys.has(data.invoiceKey)) {
      result.skipped += 1;
      continue;
    }

    const customerId = resolveCustomerId(customerIndex, data.clientName, data.email);
    if (!customerId) {
      result.failed += 1;
      result.errors.push({ rowNumber, message: `No matching customer for "${data.clientName}" — import clients first` });
      continue;
    }

    try {
      const status = mapImportInvoiceStatus(data.status, data.amountCents, data.paidCents);
      const invoice = await colCreate(orgId, 'invoices', {
        organizationId: orgId,
        customerId,
        customerName: data.clientName,
        proposalId: null,
        invoiceNumber: data.invoiceKey,
        status,
        subtotalCents: data.amountCents,
        depositPercent: 0,
        depositCents: 0,
        amountPaidCents: 0,
        dueDate: data.dueDate,
        viewCount: 0,
        paymentAttempts: 0,
        publicToken: nanoid(32),
        remindersPaused: status === 'paid',
        inCollectionQueue: status === 'overdue',
        notes: [
          'Imported from CSV.',
          data.projectName ? `Project: ${data.projectName}` : '',
          `Original invoice #${data.invoiceNumber}`,
        ].filter(Boolean).join('\n'),
        createdBy: userId,
        updatedBy: userId,
      });

      if (data.paidCents > 0) {
        await recordInvoicePayment360(
          orgId,
          {
            invoiceId: String(invoice.id),
            amountCents: data.paidCents,
            paymentType: data.paidCents >= data.amountCents ? 'final' : 'partial',
            paymentMethod: 'check',
            paidAt: data.issueDate,
            notes: 'Imported payment from CSV',
          },
          userId,
        );
      } else {
        await colUpdate(orgId, 'invoices', String(invoice.id), {
          amountPaidCents: 0,
          status,
          updatedBy: userId,
        });
      }

      existingInvoiceKeys.add(data.invoiceKey);
      result.imported += 1;
    } catch (error) {
      result.failed += 1;
      result.errors.push({ rowNumber, message: error instanceof Error ? error.message : 'Import failed' });
    }
  }

  return result;
}

export async function importCsvInventory(
  orgId: string,
  userId: string,
  rows: Record<string, string>[],
  options: { skipDuplicates?: boolean } = {},
): Promise<ImportRunResult> {
  const result: ImportRunResult = { imported: 0, updated: 0, skipped: 0, failed: 0, errors: [] };
  const warehouses = await ensureDefaultWarehouses(orgId);
  const mainWarehouse = warehouses.find((w) => w.type === 'main') ?? warehouses[0];
  const existingBySku = await loadExistingItemsBySku(orgId);
  const updateExisting = options.skipDuplicates !== false;

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 2;
    const parsed = parseImportInventoryRow(rows[i]);
    if (!parsed.data || parsed.errors.length) {
      result.failed += 1;
      result.errors.push({ rowNumber, message: parsed.errors.join('; ') || 'Invalid row' });
      continue;
    }

    const data = parsed.data;
    const existingItem = existingBySku.get(data.sku.toLowerCase());
    const matchedCategory = await findOrCreateInventoryCategory(orgId, data.categoryName);

    const itemFields = {
      sku: data.sku,
      name: data.name,
      description: data.description,
      categoryId: matchedCategory?.id ?? null,
      categoryName: matchedCategory?.name ?? data.categoryName,
      categoryGroup: matchedCategory?.group ?? null,
      manufacturer: data.manufacturer,
      unitCostCents: data.unitCostCents,
      sellPriceCents: data.sellPriceCents,
      replacementCostCents: data.unitCostCents,
      quantityOnHand: data.quantityOnHand,
      reorderLevel: data.reorderLevel,
      isSeasonal: data.isSeasonal,
      unit: 'each',
      warehouseId: mainWarehouse?.id ?? null,
      locationAisle: data.locationAisle,
      locationRack: data.locationRack,
      locationShelf: data.locationShelf,
      locationBin: data.locationBin,
    };

    if (existingItem) {
      if (!updateExisting) {
        result.skipped += 1;
        continue;
      }

      try {
        await updateInventoryItem360(orgId, existingItem.id, {
          ...itemFields,
          warehouseId: existingItem.warehouseId ?? itemFields.warehouseId,
        }, userId);
        result.updated += 1;
      } catch (error) {
        result.failed += 1;
        result.errors.push({ rowNumber, message: error instanceof Error ? error.message : 'Update failed' });
      }
      continue;
    }

    try {
      const created = await createInventoryItem360(orgId, itemFields, userId);
      existingBySku.set(data.sku.toLowerCase(), created);
      result.imported += 1;
    } catch (error) {
      result.failed += 1;
      result.errors.push({ rowNumber, message: error instanceof Error ? error.message : 'Import failed' });
    }
  }

  return result;
}
