import type {
  SignCampaignReport,
  SignCityBreakdown,
  SignLocation,
  SignLocationListItem,
  SignLocationStatus,
  SignPickupLocation,
  SignTerritoryFlag,
  SignTrackerDashboard,
  SignTrackerPageData,
  SignTrackerSettings,
} from '@clcrm/types';
import { colCreate, colDelete, colGet, colList, colUpdate } from './firestore';

const COLLECTION = 'signLocations';
const SETTINGS_COLLECTION = 'signTrackerSettings';
const SETTINGS_DOC = 'default';

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  if (value) return new Date(String(value));
  return new Date();
}

function normalizeLocation(raw: Record<string, unknown>, orgId: string, id: string): SignLocation {
  const loc = (raw.location as Record<string, unknown>) ?? {};
  const signData = (raw.signData as Record<string, unknown>) ?? {};
  const photos = Array.isArray(raw.photos)
    ? (raw.photos as Array<Record<string, unknown>>).map((p) => ({
        imageUrl: String(p.imageUrl ?? ''),
        uploadedAt: toDate(p.uploadedAt),
      }))
    : [];
  const history = Array.isArray(raw.history)
    ? (raw.history as Array<Record<string, unknown>>).map((h) => ({
        action: String(h.action ?? ''),
        user: String(h.user ?? ''),
        timestamp: toDate(h.timestamp),
        oldStatus: (h.oldStatus as SignLocationStatus) ?? null,
        newStatus: (h.newStatus as SignLocationStatus) ?? null,
        notes: (h.notes as string) ?? null,
      }))
    : [];

  return {
    id,
    organizationId: orgId,
    seasonYear: Number(raw.seasonYear ?? new Date().getFullYear()),
    location: {
      latitude: Number(loc.latitude ?? 0),
      longitude: Number(loc.longitude ?? 0),
      address: String(loc.address ?? ''),
      city: String(loc.city ?? ''),
      state: String(loc.state ?? ''),
      zip: String(loc.zip ?? ''),
      neighborhood: (loc.neighborhood as string) ?? null,
    },
    signData: {
      quantityPlaced: Number(signData.quantityPlaced ?? 0),
      quantityRecovered: Number(signData.quantityRecovered ?? 0),
      quantityMissing: Number(signData.quantityMissing ?? 0),
      placementDate: toDate(signData.placementDate),
      pickupDate: signData.pickupDate ? toDate(signData.pickupDate) : null,
      placedByUserId: (signData.placedByUserId as string) ?? null,
      recoveredByUserId: (signData.recoveredByUserId as string) ?? null,
    },
    placementType: (raw.placementType as SignLocation['placementType']) ?? 'other',
    status: (raw.status as SignLocationStatus) ?? 'active',
    notes: (raw.notes as string) ?? null,
    photos,
    history,
    customerId: (raw.customerId as string) ?? null,
    jobId: (raw.jobId as string) ?? null,
    createdAt: toDate(raw.createdAt),
    updatedAt: toDate(raw.updatedAt),
  };
}

function currentSeasonYear(): number {
  const now = new Date();
  return now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear();
}

function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function computeStatus(
  placed: number,
  recovered: number,
  missing: number,
  explicit?: SignLocationStatus,
): SignLocationStatus {
  if (explicit === 'removed') return 'removed';
  if (recovered + missing >= placed) {
    if (missing >= placed) return 'missing';
    if (recovered >= placed) return 'picked_up';
    if (missing > 0 && recovered > 0) return 'partially_recovered';
    if (missing > 0) return 'missing';
    return 'picked_up';
  }
  if (recovered > 0 || missing > 0) return 'partially_recovered';
  return 'active';
}

function activeSignCount(loc: SignLocation): number {
  const { quantityPlaced, quantityRecovered, quantityMissing } = loc.signData;
  return Math.max(0, quantityPlaced - quantityRecovered - quantityMissing);
}

export async function listSignLocations(
  orgId: string,
  filters?: {
    seasonYear?: number;
    city?: string;
    status?: SignLocationStatus;
    placementType?: string;
    dateFrom?: Date;
    dateTo?: Date;
    crewUserId?: string;
    customerId?: string;
  },
): Promise<SignLocation[]> {
  const rows = await colList<Record<string, unknown>>(orgId, COLLECTION);
  let locations = rows.map((r) => normalizeLocation(r, orgId, String(r.id)));

  if (filters?.seasonYear) {
    locations = locations.filter((l) => l.seasonYear === filters.seasonYear);
  }
  if (filters?.city) {
    const cityLower = filters.city.toLowerCase();
    locations = locations.filter((l) => l.location.city.toLowerCase() === cityLower);
  }
  if (filters?.status) {
    locations = locations.filter((l) => l.status === filters.status);
  }
  if (filters?.placementType) {
    locations = locations.filter((l) => l.placementType === filters.placementType);
  }
  if (filters?.dateFrom) {
    locations = locations.filter((l) => l.signData.placementDate >= filters.dateFrom!);
  }
  if (filters?.dateTo) {
    locations = locations.filter((l) => l.signData.placementDate <= filters.dateTo!);
  }
  if (filters?.crewUserId) {
    locations = locations.filter(
      (l) =>
        l.signData.placedByUserId === filters.crewUserId ||
        l.signData.recoveredByUserId === filters.crewUserId,
    );
  }
  if (filters?.customerId) {
    locations = locations.filter((l) => l.customerId === filters.customerId);
  }

  return locations.sort((a, b) => b.signData.placementDate.getTime() - a.signData.placementDate.getTime());
}

export async function getSignLocation(orgId: string, locationId: string): Promise<SignLocation | null> {
  const raw = await colGet<Record<string, unknown>>(orgId, COLLECTION, locationId);
  if (!raw) return null;
  return normalizeLocation(raw, orgId, locationId);
}

export async function reverseGeocodeSignLocation(latitude: number, longitude: number) {
  const token = process.env.MAPBOX_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) {
    return {
      address: '',
      city: '',
      state: '',
      zip: '',
      neighborhood: null as string | null,
    };
  }
  const res = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${token}&types=address,place,locality,neighborhood&limit=1`,
  );
  const data = (await res.json()) as {
    features?: Array<{
      place_name?: string;
      text?: string;
      context?: Array<{ id: string; text: string; short_code?: string }>;
    }>;
  };
  const feature = data.features?.[0];
  if (!feature) {
    return { address: '', city: '', state: '', zip: '', neighborhood: null };
  }

  let city = '';
  let state = '';
  let zip = '';
  let neighborhood: string | null = null;
  for (const ctx of feature.context ?? []) {
    if (ctx.id.startsWith('place.') || ctx.id.startsWith('locality.')) city = ctx.text;
    if (ctx.id.startsWith('region.')) state = ctx.short_code?.replace('US-', '') ?? ctx.text;
    if (ctx.id.startsWith('postcode.')) zip = ctx.text;
    if (ctx.id.startsWith('neighborhood.')) neighborhood = ctx.text;
  }

  return {
    address: feature.place_name ?? feature.text ?? '',
    city,
    state,
    zip,
    neighborhood,
  };
}

export async function createSignLocation(
  orgId: string,
  input: {
    seasonYear: number;
    location: SignLocation['location'];
    quantityPlaced: number;
    placementType: SignLocation['placementType'];
    notes?: string | null;
    photoUrl?: string | null;
    customerId?: string | null;
    jobId?: string | null;
  },
  userId?: string | null,
  userName?: string | null,
): Promise<SignLocation> {
  const now = new Date();
  const photos = input.photoUrl
    ? [{ imageUrl: input.photoUrl, uploadedAt: now }]
    : [];

  const created = (await colCreate(orgId, COLLECTION, {
    organizationId: orgId,
    seasonYear: input.seasonYear,
    location: input.location,
    signData: {
      quantityPlaced: input.quantityPlaced,
      quantityRecovered: 0,
      quantityMissing: 0,
      placementDate: now,
      pickupDate: null,
      placedByUserId: userId ?? null,
      recoveredByUserId: null,
    },
    placementType: input.placementType,
    status: 'active',
    notes: input.notes ?? null,
    photos,
    history: [
      {
        action: 'placed',
        user: userName ?? userId ?? 'system',
        timestamp: now,
        oldStatus: null,
        newStatus: 'active',
        notes: `${input.quantityPlaced} sign(s) placed`,
      },
    ],
    customerId: input.customerId ?? null,
    jobId: input.jobId ?? null,
    createdBy: userId,
    updatedBy: userId,
  })) as Record<string, unknown>;

  return normalizeLocation({ ...created, id: created.id }, orgId, String(created.id));
}

export async function updateSignLocation(
  orgId: string,
  locationId: string,
  data: Partial<{
    location: Partial<SignLocation['location']>;
    quantityPlaced: number;
    placementType: SignLocation['placementType'];
    status: SignLocationStatus;
    notes: string | null;
    photoUrl: string | null;
  }>,
  userId?: string | null,
  userName?: string | null,
): Promise<SignLocation> {
  const existing = await getSignLocation(orgId, locationId);
  if (!existing) throw new Error('Sign location not found');

  const updates: Record<string, unknown> = { updatedBy: userId };
  const historyEntry = {
    action: 'updated',
    user: userName ?? userId ?? 'system',
    timestamp: new Date(),
    oldStatus: existing.status,
    newStatus: data.status ?? existing.status,
    notes: data.notes ?? null,
  };

  if (data.location) {
    updates.location = { ...existing.location, ...data.location };
  }
  if (data.placementType) updates.placementType = data.placementType;
  if (data.notes !== undefined) updates.notes = data.notes;
  if (data.quantityPlaced !== undefined) {
    updates.signData = { ...existing.signData, quantityPlaced: data.quantityPlaced };
  }
  if (data.photoUrl) {
    const photos = [...existing.photos];
    const photo = { imageUrl: data.photoUrl, uploadedAt: new Date() };
    if (photos.length > 0) {
      photos[0] = photo;
    } else {
      photos.push(photo);
    }
    updates.photos = photos;
  }
  if (data.status) {
    updates.status = data.status;
    updates.history = [...existing.history, historyEntry];
  } else if (
    data.location ||
    data.placementType ||
    data.notes !== undefined ||
    data.quantityPlaced !== undefined ||
    data.photoUrl
  ) {
    updates.history = [...existing.history, { ...historyEntry, action: 'edited' }];
  }

  await colUpdate(orgId, COLLECTION, locationId, updates);
  return (await getSignLocation(orgId, locationId))!;
}

export async function deleteSignLocation(orgId: string, locationId: string): Promise<void> {
  const existing = await getSignLocation(orgId, locationId);
  if (!existing) throw new Error('Sign location not found');
  await colDelete(orgId, COLLECTION, locationId);
}

export async function recoverSignLocation(
  orgId: string,
  locationId: string,
  input: {
    quantityRecovered: number;
    quantityMissing: number;
    recoveryType: string;
    notes?: string | null;
  },
  userId?: string | null,
  userName?: string | null,
): Promise<SignLocation> {
  const existing = await getSignLocation(orgId, locationId);
  if (!existing) throw new Error('Sign location not found');

  const { quantityPlaced } = existing.signData;
  let recovered = input.quantityRecovered;
  let missing = input.quantityMissing;

  if (input.recoveryType === 'recovered_all') {
    recovered = quantityPlaced;
    missing = 0;
  } else if (input.recoveryType === 'missing' || input.recoveryType === 'city_removed' || input.recoveryType === 'damaged') {
    missing = quantityPlaced - recovered;
  }

  const newStatus = computeStatus(quantityPlaced, recovered, missing);
  const now = new Date();

  await colUpdate(orgId, COLLECTION, locationId, {
    signData: {
      ...existing.signData,
      quantityRecovered: recovered,
      quantityMissing: missing,
      pickupDate: now,
      recoveredByUserId: userId ?? null,
    },
    status: newStatus,
    history: [
      ...existing.history,
      {
        action: `recovery_${input.recoveryType}`,
        user: userName ?? userId ?? 'system',
        timestamp: now,
        oldStatus: existing.status,
        newStatus,
        notes: input.notes ?? `Recovered: ${recovered}, Missing: ${missing}`,
      },
    ],
    updatedBy: userId,
  });

  return (await getSignLocation(orgId, locationId))!;
}

function aggregateLocations(locations: SignLocation[]) {
  let totalPlaced = 0;
  let activeSigns = 0;
  let recoveredSigns = 0;
  let missingSigns = 0;
  const cityMap = new Map<string, SignCityBreakdown>();

  for (const loc of locations) {
    const { quantityPlaced, quantityRecovered, quantityMissing } = loc.signData;
    totalPlaced += quantityPlaced;
    recoveredSigns += quantityRecovered;
    missingSigns += quantityMissing;
    activeSigns += activeSignCount(loc);

    const key = `${loc.location.city}|${loc.location.state}`;
    const existing = cityMap.get(key) ?? {
      city: loc.location.city,
      state: loc.location.state,
      placed: 0,
      active: 0,
      recovered: 0,
      missing: 0,
      locations: 0,
    };
    existing.placed += quantityPlaced;
    existing.active += activeSignCount(loc);
    existing.recovered += quantityRecovered;
    existing.missing += quantityMissing;
    existing.locations += 1;
    cityMap.set(key, existing);
  }

  const byCity = [...cityMap.values()].sort((a, b) => b.placed - a.placed);
  const activeCities = byCity.filter((c) => c.active > 0).length;
  const topPerformingCities = byCity
    .filter((c) => c.placed > 0)
    .map((c) => ({ city: c.city, state: c.state, placed: c.placed, recovered: c.recovered }))
    .sort((a, b) => b.recovered / b.placed - a.recovered / a.placed)
    .slice(0, 5);

  const lossPercentage = totalPlaced > 0 ? Math.round((missingSigns / totalPlaced) * 1000) / 10 : 0;
  const recoveryRate = totalPlaced > 0 ? Math.round(((recoveredSigns / totalPlaced) * 1000)) / 10 : 0;

  return { totalPlaced, activeSigns, recoveredSigns, missingSigns, lossPercentage, recoveryRate, activeCities, topPerformingCities, byCity };
}

function toListItem(loc: SignLocation): SignLocationListItem {
  const { history: _history, ...rest } = loc;
  return rest;
}

export async function getSignTrackerPageData(
  orgId: string,
  filters?: {
    seasonYear?: number;
    city?: string;
    status?: SignLocationStatus;
    placementType?: string;
    dateFrom?: Date;
    dateTo?: Date;
    crewUserId?: string;
  },
): Promise<SignTrackerPageData> {
  const locations = await listSignLocations(orgId, filters);
  const year = filters?.seasonYear ?? currentSeasonYear();
  const agg = aggregateLocations(locations);

  return {
    dashboard: {
      seasonYear: year,
      totalPlaced: agg.totalPlaced,
      activeSigns: agg.activeSigns,
      recoveredSigns: agg.recoveredSigns,
      missingSigns: agg.missingSigns,
      lossPercentage: agg.lossPercentage,
      recoveryRate: agg.recoveryRate,
      activeCities: agg.activeCities,
      topPerformingCities: agg.topPerformingCities,
    },
    cities: agg.byCity,
    locations: locations.map(toListItem),
  };
}

export async function getSignTrackerDashboard(orgId: string, seasonYear?: number): Promise<SignTrackerDashboard> {
  const year = seasonYear ?? currentSeasonYear();
  const locations = await listSignLocations(orgId, { seasonYear: year });
  const agg = aggregateLocations(locations);

  return {
    seasonYear: year,
    ...agg,
  };
}

export async function getSignCityBreakdown(orgId: string, seasonYear?: number): Promise<SignCityBreakdown[]> {
  const year = seasonYear ?? currentSeasonYear();
  const locations = await listSignLocations(orgId, { seasonYear: year });
  return aggregateLocations(locations).byCity;
}

export async function getSignPickupRoute(
  orgId: string,
  latitude: number,
  longitude: number,
  seasonYear?: number,
): Promise<SignPickupLocation[]> {
  const year = seasonYear ?? currentSeasonYear();
  const locations = await listSignLocations(orgId, { seasonYear: year });
  const active = locations.filter((l) => activeSignCount(l) > 0 && ['active', 'needs_pickup', 'partially_recovered'].includes(l.status));

  return active
    .map((loc) => ({
      ...loc,
      distanceMiles: haversineMiles(latitude, longitude, loc.location.latitude, loc.location.longitude),
    }))
    .sort((a, b) => a.distanceMiles - b.distanceMiles);
}

export async function getSignTrackerSettings(orgId: string): Promise<SignTrackerSettings> {
  const raw = await colGet<Record<string, unknown>>(orgId, SETTINGS_COLLECTION, SETTINGS_DOC);
  return {
    costPerSignCents: Number(raw?.costPerSignCents ?? 600),
  };
}

export async function updateSignTrackerSettings(orgId: string, settings: SignTrackerSettings): Promise<SignTrackerSettings> {
  const existing = await colGet(orgId, SETTINGS_COLLECTION, SETTINGS_DOC);
  if (existing) {
    await colUpdate(orgId, SETTINGS_COLLECTION, SETTINGS_DOC, settings);
  } else {
    await colCreate(orgId, SETTINGS_COLLECTION, { ...settings, organizationId: orgId });
  }
  return settings;
}

export async function getSignCampaignReport(orgId: string, seasonYear?: number): Promise<SignCampaignReport> {
  const year = seasonYear ?? currentSeasonYear();
  const locations = await listSignLocations(orgId, { seasonYear: year });
  const agg = aggregateLocations(locations);
  const settings = await getSignTrackerSettings(orgId);

  return {
    seasonYear: year,
    totalPlaced: agg.totalPlaced,
    totalRecovered: agg.recoveredSigns,
    totalMissing: agg.missingSigns,
    recoveryPercentage: agg.recoveryRate,
    lossPercentage: agg.lossPercentage,
    costPerSignCents: settings.costPerSignCents,
    replacementCostCents: agg.missingSigns * settings.costPerSignCents,
    byCity: agg.byCity,
  };
}

export async function getTerritoryIntelligence(orgId: string, seasonYear?: number): Promise<SignTerritoryFlag[]> {
  const year = seasonYear ?? currentSeasonYear();
  const locations = await listSignLocations(orgId, { seasonYear: year });
  const customers = await colList<{ city?: string; state?: string; latitude?: number; longitude?: number; pipelineStage?: string }>(orgId, 'customers');
  const jobs = await colList<{ stage?: string; customerId?: string }>(orgId, 'jobs');

  const installedCustomers = new Set(
    jobs.filter((j) => ['installed', 'complete', 'removal_scheduled'].includes(j.stage ?? '')).map((j) => j.customerId),
  );

  const flags: SignTerritoryFlag[] = [];
  const cityLossMap = new Map<string, { missing: number; placed: number; roadsideMissing: number; locs: SignLocation[] }>();

  for (const loc of locations) {
    const key = `${loc.location.city}|${loc.location.state}`;
    const entry = cityLossMap.get(key) ?? { missing: 0, placed: 0, roadsideMissing: 0, locs: [] };
    entry.missing += loc.signData.quantityMissing;
    entry.placed += loc.signData.quantityPlaced;
    if (loc.placementType === 'roadside') entry.roadsideMissing += loc.signData.quantityMissing;
    entry.locs.push(loc);
    cityLossMap.set(key, entry);
  }

  for (const [key, data] of cityLossMap) {
    const [city, state] = key.split('|');
    const lossRate = data.placed > 0 ? data.missing / data.placed : 0;
    const centerLoc = data.locs[0];
    if (!centerLoc) continue;

    const nearbyCustomers = customers.filter(
      (c) =>
        c.city?.toLowerCase() === city.toLowerCase() &&
        installedCustomers.has(String((c as { id?: string }).id)),
    ).length;

    if (lossRate >= 0.15 && data.missing >= 5) {
      flags.push({
        area: `${city}, ${state}`,
        city,
        state,
        flag: 'high_loss',
        reason: `${Math.round(lossRate * 100)}% sign loss rate (${data.missing} missing)`,
        latitude: centerLoc.location.latitude,
        longitude: centerLoc.location.longitude,
      });
      if (data.roadsideMissing > data.missing * 0.5) {
        flags.push({
          area: `${city}, ${state}`,
          city,
          state,
          flag: 'avoid_roadside',
          reason: 'Roadside placements account for majority of losses',
          latitude: centerLoc.location.latitude,
          longitude: centerLoc.location.longitude,
        });
      }
    }

    if (nearbyCustomers >= 10 && lossRate < 0.1) {
      flags.push({
        area: `${city}, ${state}`,
        city,
        state,
        flag: 'high_value',
        reason: `${nearbyCustomers} customer installs nearby with low sign loss`,
        latitude: centerLoc.location.latitude,
        longitude: centerLoc.location.longitude,
      });
      flags.push({
        area: `${city}, ${state}`,
        city,
        state,
        flag: 'increase_placement',
        reason: 'High conversion area — consider more signs next season',
        latitude: centerLoc.location.latitude,
        longitude: centerLoc.location.longitude,
      });
    }
  }

  return flags;
}

export async function createSignLocationFromJob(
  orgId: string,
  jobId: string,
  input: {
    quantityPlaced: number;
    placementType: SignLocation['placementType'];
    notes?: string | null;
    latitude?: number;
    longitude?: number;
  },
  userId?: string | null,
  userName?: string | null,
): Promise<SignLocation> {
  const job = await colGet<{
    customerId?: string;
    propertyId?: string;
    seasonYear?: number;
  }>(orgId, 'jobs', jobId);
  if (!job) throw new Error('Job not found');

  let latitude = input.latitude;
  let longitude = input.longitude;
  let address = '';
  let city = '';
  let state = '';
  let zip = '';

  if (job.propertyId) {
    const property = await colGet<{
      addressLine1?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      latitude?: number;
      longitude?: number;
    }>(orgId, 'properties', job.propertyId);
    if (property) {
      address = property.addressLine1 ?? '';
      city = property.city ?? '';
      state = property.state ?? '';
      zip = property.postalCode ?? '';
      latitude = latitude ?? property.latitude ?? undefined;
      longitude = longitude ?? property.longitude ?? undefined;
    }
  }

  if (latitude && longitude && !address) {
    const geo = await reverseGeocodeSignLocation(latitude, longitude);
    address = geo.address;
    city = geo.city || city;
    state = geo.state || state;
    zip = geo.zip || zip;
  }

  return createSignLocation(
    orgId,
    {
      seasonYear: job.seasonYear ?? currentSeasonYear(),
      location: {
        latitude: latitude ?? 0,
        longitude: longitude ?? 0,
        address,
        city,
        state,
        zip,
        neighborhood: null,
      },
      quantityPlaced: input.quantityPlaced,
      placementType: input.placementType,
      notes: input.notes,
      customerId: job.customerId ?? null,
      jobId,
    },
    userId,
    userName,
  );
}

export async function getCustomerSignLocations(orgId: string, customerId: string): Promise<SignLocation[]> {
  return listSignLocations(orgId, { customerId });
}

export async function markSignLocationsNeedsPickup(orgId: string, seasonYear?: number): Promise<number> {
  const year = seasonYear ?? currentSeasonYear();
  const locations = await listSignLocations(orgId, { seasonYear: year, status: 'active' });
  let count = 0;
  for (const loc of locations) {
    if (activeSignCount(loc) > 0) {
      await colUpdate(orgId, COLLECTION, loc.id, { status: 'needs_pickup' });
      count++;
    }
  }
  return count;
}
