/** Sign Tracker & Territory Intelligence — seasonal marketing sign management */

export type SignPlacementType =
  | 'customer_yard'
  | 'roadside'
  | 'intersection'
  | 'subdivision_entrance'
  | 'commercial_property'
  | 'other';

export type SignLocationStatus =
  | 'active'
  | 'needs_pickup'
  | 'picked_up'
  | 'partially_recovered'
  | 'missing'
  | 'removed';

export type SignLocationHistoryEntry = {
  action: string;
  user: string;
  timestamp: Date;
  oldStatus?: SignLocationStatus | null;
  newStatus?: SignLocationStatus | null;
  notes?: string | null;
};

export type SignLocationPhoto = {
  imageUrl: string;
  uploadedAt: Date;
};

export type SignLocationAddress = {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state: string;
  zip: string;
  neighborhood?: string | null;
};

export type SignLocationData = {
  quantityPlaced: number;
  quantityRecovered: number;
  quantityMissing: number;
  placementDate: Date;
  pickupDate?: Date | null;
  placedByUserId?: string | null;
  recoveredByUserId?: string | null;
};

export type SignLocation = {
  id: string;
  organizationId: string;
  seasonYear: number;
  location: SignLocationAddress;
  signData: SignLocationData;
  placementType: SignPlacementType;
  status: SignLocationStatus;
  notes?: string | null;
  photos: SignLocationPhoto[];
  history: SignLocationHistoryEntry[];
  customerId?: string | null;
  jobId?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SignTrackerDashboard = {
  seasonYear: number;
  totalPlaced: number;
  activeSigns: number;
  recoveredSigns: number;
  missingSigns: number;
  lossPercentage: number;
  recoveryRate: number;
  activeCities: number;
  topPerformingCities: Array<{ city: string; state: string; placed: number; recovered: number }>;
};

export type SignCityBreakdown = {
  city: string;
  state: string;
  placed: number;
  active: number;
  recovered: number;
  missing: number;
  locations: number;
};

export type SignPickupLocation = SignLocation & {
  distanceMiles: number;
};

export type SignTerritoryFlag = {
  area: string;
  city: string;
  state: string;
  flag: 'high_value' | 'high_loss' | 'increase_placement' | 'avoid_roadside';
  reason: string;
  latitude: number;
  longitude: number;
};

export type SignCampaignReport = {
  seasonYear: number;
  totalPlaced: number;
  totalRecovered: number;
  totalMissing: number;
  recoveryPercentage: number;
  lossPercentage: number;
  costPerSignCents: number;
  replacementCostCents: number;
  byCity: SignCityBreakdown[];
};

export type SignTrackerSettings = {
  costPerSignCents: number;
};
