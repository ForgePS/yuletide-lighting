/** Next Generation Mockup & Design Studio — Sprint MKP-001 */

export type MockupAuditFields = {
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type MockupStatus = 'draft' | 'in_review' | 'approved' | 'revision_requested' | 'archived';

export type LayerType = 'lighting' | 'decorations' | 'trees' | 'shrubs' | 'commercial' | 'notes';

export type LightType = 'c7' | 'c9' | 'rgb' | 'permanent' | 'mini' | 'custom';

export type ColorPattern = 'solid' | 'alternating' | 'candy_cane' | 'multi_repeat' | 'custom_sequence';

export type AnimationType = 'twinkle' | 'chase' | 'fade' | 'pulse' | 'wave' | 'sparkle';

export type DecorationCategory =
  | 'wreath'
  | 'garland'
  | 'bow'
  | 'starburst'
  | 'pole'
  | 'commercial'
  | 'ground_display';

export type DetectedFeature =
  | 'roofline'
  | 'peak'
  | 'valley'
  | 'dormer'
  | 'gutter'
  | 'window'
  | 'door'
  | 'column'
  | 'tree'
  | 'bush'
  | 'garage'
  | 'walkway';

export type MockupPoint = { x: number; y: number };

export type MockupStrand = {
  id: string;
  points: MockupPoint[];
  color: string;
  lightType: LightType;
  pattern: ColorPattern;
  bulbSize: number;
  spacing: number;
  brightness: number;
  layerId?: string | null;
  layerType?: LayerType | null;
};

export type MockupLayer = MockupAuditFields & {
  id: string;
  mockupId: string;
  name: string;
  layerType: LayerType;
  isLocked: boolean;
  isHidden: boolean;
  sortOrder: number;
  strands: MockupStrand[];
};

export type MockupMeasurement = MockupAuditFields & {
  id: string;
  mockupId: string;
  label: string;
  pixelLength: number;
  realWorldFeet: number;
  featureType?: DetectedFeature | null;
};

export type MockupVersion = MockupAuditFields & {
  id: string;
  mockupId: string;
  versionNumber: number;
  designerName?: string | null;
  revisionNotes?: string | null;
  snapshotData: Record<string, unknown>;
};

export type MockupExport = MockupAuditFields & {
  id: string;
  mockupId: string;
  exportType: 'material_list' | 'install_sheet' | 'pick_list' | 'crew_work_order' | 'gif' | 'mp4';
  fileUrl?: string | null;
  content?: string | null;
};

export type DesignTemplate = MockupAuditFields & {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  lightType: LightType;
  colorScheme: string;
  pattern: ColorPattern;
  isCompanyTemplate: boolean;
  previewUrl?: string | null;
};

export type DecorationAsset = MockupAuditFields & {
  id: string;
  organizationId: string;
  name: string;
  category: DecorationCategory;
  imageUrl: string;
  thumbnailUrl?: string | null;
  isBuiltIn: boolean;
};

export type MockupRecord = MockupAuditFields & {
  id: string;
  organizationId: string;
  propertyId: string;
  customerId?: string | null;
  name: string;
  status: MockupStatus;
  imageUrl: string;
  optimizedImageUrl?: string | null;
  thumbnailUrl?: string | null;
  renderedImageUrl?: string | null;
  backgroundBrightness: number;
  strands: MockupStrand[];
  layers: MockupLayer[];
  viewCount: number;
  versionNumber: number;
  designTimeMinutes: number;
  conversionRate?: number | null;
  revenueCents?: number | null;
  scaleFeetPerPixel?: number | null;
  aiDetectionComplete: boolean;
  detectedFeatures: Array<{ type: DetectedFeature; points: MockupPoint[]; confidence: number }>;
  animationType?: AnimationType | null;
  animationSpeed: number;
  notes?: string | null;
  approvalToken?: string | null;
  sentForApprovalAt?: Date | null;
  approvedAt?: Date | null;
  approvedBy?: string | null;
  revisionNotes?: string | null;
  linkedProposalId?: string | null;
};

export type MaterialLineItem = {
  sku: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
};

export type MaterialList = {
  bulbCount: number;
  strandCount: number;
  garlandFeet: number;
  wreathCount: number;
  controllerCount: number;
  powerSupplyCount: number;
  totalLinearFeet: number;
  laborHoursEstimate: number;
  items: MaterialLineItem[];
};

export type MockupDashboardKpis = {
  recentDesigns: number;
  draftDesigns: number;
  approvedDesigns: number;
  mostViewedDesignId?: string | null;
  mostViewedCount: number;
  designConversionRatePercent: number;
  revenueGeneratedCents: number;
  averageDesignTimeMinutes: number;
};

export type AiDesignResult = {
  designName: string;
  description: string;
  strands: MockupStrand[];
  upsells: string[];
  colorPackages: string[];
  estimatedLinearFeet: number;
};

export type AiDetectionResult = {
  features: MockupRecord['detectedFeatures'];
  overlayUrl?: string | null;
};

export const DEFAULT_DESIGN_TEMPLATES: Array<Omit<DesignTemplate, keyof MockupAuditFields | 'id' | 'organizationId'>> = [
  { name: 'Warm White Classic', description: 'Traditional warm white C9 roofline', lightType: 'c9', colorScheme: '#FFD700', pattern: 'solid', isCompanyTemplate: true, previewUrl: null },
  { name: 'Multicolor Traditional', description: 'Red, green, blue alternating', lightType: 'c9', colorScheme: 'multi', pattern: 'multi_repeat', isCompanyTemplate: true, previewUrl: null },
  { name: 'Candy Cane', description: 'Red and white candy cane pattern', lightType: 'c9', colorScheme: '#FF0000,#FFFFFF', pattern: 'candy_cane', isCompanyTemplate: true, previewUrl: null },
  { name: 'Elegant White', description: 'Cool white premium look', lightType: 'c9', colorScheme: '#F5F5F5', pattern: 'solid', isCompanyTemplate: true, previewUrl: null },
  { name: 'Commercial Package', description: 'High-density commercial display', lightType: 'c9', colorScheme: '#FFD700', pattern: 'solid', isCompanyTemplate: true, previewUrl: null },
  { name: 'Permanent Lighting', description: 'Year-round permanent track lighting', lightType: 'permanent', colorScheme: '#FFD700', pattern: 'solid', isCompanyTemplate: true, previewUrl: null },
];

export const DEFAULT_DECORATION_LIBRARY: Array<Omit<DecorationAsset, keyof MockupAuditFields | 'id' | 'organizationId'>> = [
  { name: 'Classic Wreath 24"', category: 'wreath', imageUrl: '/decor/wreath-classic.png', thumbnailUrl: null, isBuiltIn: true },
  { name: 'Premium Garland 9ft', category: 'garland', imageUrl: '/decor/garland-premium.png', thumbnailUrl: null, isBuiltIn: true },
  { name: 'Red Velvet Bow', category: 'bow', imageUrl: '/decor/bow-red.png', thumbnailUrl: null, isBuiltIn: true },
  { name: 'Starburst Display', category: 'starburst', imageUrl: '/decor/starburst.png', thumbnailUrl: null, isBuiltIn: true },
  { name: 'Pole Decoration Set', category: 'pole', imageUrl: '/decor/pole-set.png', thumbnailUrl: null, isBuiltIn: true },
  { name: 'Commercial Display', category: 'commercial', imageUrl: '/decor/commercial.png', thumbnailUrl: null, isBuiltIn: true },
  { name: 'Ground Display', category: 'ground_display', imageUrl: '/decor/ground.png', thumbnailUrl: null, isBuiltIn: true },
];

export function pixelDistance(a: MockupPoint, b: MockupPoint): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

export function strandPixelLength(strand: MockupStrand): number {
  let total = 0;
  for (let i = 1; i < strand.points.length; i++) {
    total += pixelDistance(strand.points[i - 1]!, strand.points[i]!);
  }
  return total;
}

export function calculateMaterials(mockup: Pick<MockupRecord, 'strands' | 'scaleFeetPerPixel'>): MaterialList {
  const scale = mockup.scaleFeetPerPixel ?? 0.05;
  let totalLinearFeet = 0;
  let bulbCount = 0;
  let strandCount = mockup.strands.length;

  for (const strand of mockup.strands) {
    const px = strandPixelLength(strand);
    const feet = px * scale;
    totalLinearFeet += feet;
    bulbCount += Math.ceil(feet * 12 / strand.spacing);
  }

  const controllerCount = Math.max(1, Math.ceil(strandCount / 4));
  const powerSupplyCount = Math.max(1, Math.ceil(totalLinearFeet / 100));

  const items: MaterialLineItem[] = [
    { sku: 'C9-WW-100', name: 'C9 Warm White Bulbs', quantity: bulbCount, unit: 'each', category: 'lighting' },
    { sku: 'SPT2-100', name: 'SPT2 Wire', quantity: Math.ceil(totalLinearFeet), unit: 'ft', category: 'wire' },
    { sku: 'CTRL-4CH', name: '4-Channel Controller', quantity: controllerCount, unit: 'each', category: 'controllers' },
    { sku: 'PSU-30A', name: '30A Power Supply', quantity: powerSupplyCount, unit: 'each', category: 'power' },
  ];

  return {
    bulbCount,
    strandCount,
    garlandFeet: Math.round(totalLinearFeet * 0.1),
    wreathCount: Math.max(0, Math.floor(strandCount / 5)),
    controllerCount,
    powerSupplyCount,
    totalLinearFeet: Math.round(totalLinearFeet * 10) / 10,
    laborHoursEstimate: Math.round(totalLinearFeet / 25 * 10) / 10,
    items,
  };
}

export function mockAiPropertyDetection(_imageUrl: string): AiDetectionResult {
  return {
    features: [
      { type: 'roofline', points: [{ x: 100, y: 150 }, { x: 700, y: 150 }], confidence: 0.92 },
      { type: 'peak', points: [{ x: 400, y: 80 }], confidence: 0.88 },
      { type: 'gutter', points: [{ x: 100, y: 160 }, { x: 700, y: 160 }], confidence: 0.85 },
      { type: 'window', points: [{ x: 250, y: 200 }, { x: 350, y: 280 }], confidence: 0.79 },
      { type: 'tree', points: [{ x: 50, y: 300 }, { x: 120, y: 450 }], confidence: 0.81 },
      { type: 'bush', points: [{ x: 540, y: 360 }, { x: 640, y: 390 }], confidence: 0.74 },
      { type: 'door', points: [{ x: 365, y: 260 }, { x: 430, y: 370 }], confidence: 0.77 },
      { type: 'walkway', points: [{ x: 330, y: 430 }, { x: 470, y: 530 }], confidence: 0.7 },
      { type: 'garage', points: [{ x: 470, y: 210 }, { x: 690, y: 380 }], confidence: 0.69 },
    ],
    overlayUrl: null,
  };
}

export function aiGenerateDesign(style: string): AiDesignResult {
  const lower = style.toLowerCase();
  const baseStrand: MockupStrand = {
    id: 'ai-1',
    points: [{ x: 100, y: 150 }, { x: 700, y: 150 }],
    color: '#FFD700',
    lightType: 'c9',
    pattern: 'solid',
    bulbSize: 6,
    spacing: 12,
    brightness: 1,
  };

  if (lower.includes('commercial')) {
    return {
      designName: 'Commercial Display Package',
      description: 'High-density C9 roofline with ground displays and pole decorations',
      strands: [{ ...baseStrand, color: '#FFD700', spacing: 8 }, { ...baseStrand, id: 'ai-2', points: [{ x: 100, y: 200 }, { x: 700, y: 200 }] }],
      upsells: ['Ground display package', 'Starburst center piece', 'Permanent lighting upgrade'],
      colorPackages: ['Warm white commercial', 'Red/green commercial'],
      estimatedLinearFeet: 180,
    };
  }
  if (lower.includes('hoa')) {
    return {
      designName: 'HOA Compliant Design',
      description: 'Uniform warm white roofline meeting HOA guidelines',
      strands: [{ ...baseStrand, color: '#FFD700', pattern: 'solid' }],
      upsells: ['Matching garage outline', 'Subtle tree wrap'],
      colorPackages: ['Warm white only'],
      estimatedLinearFeet: 95,
    };
  }
  if (lower.includes('premium')) {
    return {
      designName: 'Premium Estate Package',
      description: 'Multi-layer design with tree wraps and garland accents',
      strands: [
        baseStrand,
        { ...baseStrand, id: 'ai-2', color: '#FFFFFF', points: [{ x: 50, y: 300 }, { x: 120, y: 450 }] },
        { ...baseStrand, id: 'ai-3', color: '#FF0000', pattern: 'candy_cane', points: [{ x: 200, y: 180 }, { x: 600, y: 180 }] },
      ],
      upsells: ['Tree canopy wrap', 'Wreath package (3)', 'RGB accent zones'],
      colorPackages: ['Elegant white + accent', 'Full RGB premium'],
      estimatedLinearFeet: 145,
    };
  }
  return {
    designName: 'Warm White Classic',
    description: 'Traditional warm white C9 roofline design',
    strands: [baseStrand],
    upsells: ['Garland on porch rail', 'Wreath on front door', 'Tree wrap on feature tree'],
    colorPackages: ['Warm white', 'Warm white + red accents'],
    estimatedLinearFeet: 85,
  };
}
