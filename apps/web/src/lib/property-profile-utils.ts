import type { InstallComplexity, Property, PropertyGalleryPhoto, PropertyProfileType } from '@clcrm/types';

export const PROPERTY_PROFILE_TYPE_OPTIONS: { value: PropertyProfileType; label: string }[] = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'hoa', label: 'HOA' },
  { value: 'municipal', label: 'Municipal' },
  { value: 'church', label: 'Church' },
  { value: 'other', label: 'Other' },
];

export const INSTALL_COMPLEXITY_OPTIONS: { value: InstallComplexity; label: string; description: string }[] = [
  { value: 'low', label: 'Low', description: 'Single-story, easy access, minimal obstacles' },
  { value: 'medium', label: 'Medium', description: 'Standard roofline, moderate tree coverage' },
  { value: 'high', label: 'High', description: 'Multi-story, steep roof, or heavy landscaping' },
  { value: 'extreme', label: 'Extreme', description: 'Lift required, complex commercial, or major hazards' },
];

export function labelPropertyProfileType(type?: string | null): string {
  return PROPERTY_PROFILE_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type ?? '—';
}

export function labelInstallComplexity(c?: InstallComplexity | null): string {
  return INSTALL_COMPLEXITY_OPTIONS.find((o) => o.value === c)?.label ?? c ?? 'Medium';
}

export function installComplexityBadgeClass(c?: InstallComplexity | null): string {
  switch (c) {
    case 'low':
      return 'bg-emerald-100 text-emerald-800';
    case 'high':
      return 'bg-amber-100 text-amber-800';
    case 'extreme':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-blue-100 text-blue-800';
  }
}

export function formatPropertyAddress(p: Pick<Property, 'addressLine1' | 'city' | 'state' | 'postalCode'>): string {
  return `${p.addressLine1}, ${p.city}, ${p.state} ${p.postalCode}`;
}

export type PropertyProfileFormValues = {
  propertyName: string;
  propertyType: PropertyProfileType | '';
  label: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  gateCode: string;
  hoaInfo: string;
  accessInstructions: string;
  installNotes: string;
  powerSourceLocations: string;
  gfciNotes: string;
  ladderAccessPoints: string;
  ladderRequired: boolean;
  liftRequired: boolean;
  roofMeasurementNotes: string;
  estimatedRooflineFeet: string;
  peaks: string;
  treeCount: string;
  shrubCount: string;
  wreathLocations: string;
  garlandLocations: string;
  siteHazards: Property['siteHazards'];
  siteHazardNotes: string;
  installComplexity: InstallComplexity;
  previousYearDesignNotes: string;
  galleryPhotos: PropertyGalleryPhoto[];
};

export function emptyPropertyProfileForm(): PropertyProfileFormValues {
  return {
    propertyName: '',
    propertyType: 'residential',
    label: 'Primary',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    gateCode: '',
    hoaInfo: '',
    accessInstructions: '',
    installNotes: '',
    powerSourceLocations: '',
    gfciNotes: '',
    ladderAccessPoints: '',
    ladderRequired: false,
    liftRequired: false,
    roofMeasurementNotes: '',
    estimatedRooflineFeet: '',
    peaks: '',
    treeCount: '',
    shrubCount: '',
    wreathLocations: '',
    garlandLocations: '',
    siteHazards: [],
    siteHazardNotes: '',
    installComplexity: 'medium',
    previousYearDesignNotes: '',
    galleryPhotos: [],
  };
}

export function propertyToFormValues(p: Property): PropertyProfileFormValues {
  return {
    propertyName: p.propertyName,
    propertyType: (p.propertyType as PropertyProfileType) || 'residential',
    label: p.label,
    addressLine1: p.addressLine1,
    addressLine2: p.addressLine2 ?? '',
    city: p.city,
    state: p.state,
    postalCode: p.postalCode,
    gateCode: p.gateCode ?? '',
    hoaInfo: p.hoaInfo ?? '',
    accessInstructions: p.accessInstructions ?? '',
    installNotes: p.installNotes ?? '',
    powerSourceLocations: p.powerSourceLocations ?? '',
    gfciNotes: p.gfciNotes ?? '',
    ladderAccessPoints: p.ladderAccessPoints ?? '',
    ladderRequired: p.ladderRequired ?? false,
    liftRequired: p.liftRequired ?? false,
    roofMeasurementNotes: p.roofMeasurementNotes ?? '',
    estimatedRooflineFeet: p.estimatedRooflineFeet != null ? String(p.estimatedRooflineFeet) : '',
    peaks: p.peaks != null ? String(p.peaks) : '',
    treeCount: p.treeCount != null ? String(p.treeCount) : '',
    shrubCount: p.shrubCount != null ? String(p.shrubCount) : '',
    wreathLocations: p.wreathLocations ?? '',
    garlandLocations: p.garlandLocations ?? '',
    siteHazards: p.siteHazards ?? [],
    siteHazardNotes: p.siteHazardNotes ?? '',
    installComplexity: p.installComplexity ?? 'medium',
    previousYearDesignNotes: p.previousYearDesignNotes ?? '',
    galleryPhotos: p.galleryPhotos ?? [],
  };
}

export function formValuesToPropertyPayload(form: PropertyProfileFormValues) {
  return {
    ...form,
    propertyType: form.propertyType || 'residential',
    treeCount: form.treeCount ? Number(form.treeCount) : null,
    shrubCount: form.shrubCount ? Number(form.shrubCount) : null,
    estimatedRooflineFeet: form.estimatedRooflineFeet ? Number(form.estimatedRooflineFeet) : null,
    peaks: form.peaks ? Number(form.peaks) : null,
    photos: {},
  };
}

export function buildScopeFromProperty(p: Property): string {
  const parts: string[] = [];
  if (p.estimatedRooflineFeet) parts.push(`${p.estimatedRooflineFeet} ft roofline lighting`);
  if (p.treeCount) parts.push(`${p.treeCount} tree wrap(s)`);
  if (p.shrubCount) parts.push(`${p.shrubCount} shrub accent(s)`);
  if (p.wreathLocations) parts.push(`Wreaths: ${p.wreathLocations}`);
  if (p.garlandLocations) parts.push(`Garland: ${p.garlandLocations}`);
  if (p.roofMeasurementNotes) parts.push(p.roofMeasurementNotes);
  if (p.previousYearDesignNotes) parts.push(`Prior season: ${p.previousYearDesignNotes}`);
  if (p.installNotes) parts.push(p.installNotes);
  if (parts.length === 0) return '';
  return parts.join('. ') + '. Professional installation, takedown, and storage included unless noted otherwise.';
}
