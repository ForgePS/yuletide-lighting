import { getAdminFirestore } from './admin';
import { getSeasonSettings } from './settings360';

export type PublicSeasonConfig = {
  seasonYear: number;
  publicMarketingYear: number | null;
  installCutoffDate: string | null;
  takedownStartDate: string | null;
  rebookingStartDate: string | null;
  bookingOpen: boolean | null;
};

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

export async function getPublicSeasonConfig(): Promise<PublicSeasonConfig | null> {
  const orgId = await resolveOperatingOrganizationId();
  if (!orgId) return null;

  const season = await getSeasonSettings(orgId);
  return {
    seasonYear: season.seasonYear,
    publicMarketingYear: season.publicMarketingYear ?? null,
    installCutoffDate: season.installCutoffDate ?? null,
    takedownStartDate: season.takedownStartDate ?? null,
    rebookingStartDate: season.rebookingStartDate ?? null,
    bookingOpen: season.bookingOpen ?? null,
  };
}
