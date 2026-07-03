import { z } from 'zod';
import { mediaReferenceSchema, optionalMediaReferenceSchema } from './media';

export const mockupStatusSchema = z.enum(['draft', 'in_review', 'approved', 'revision_requested', 'archived']);
export const lightTypeSchema = z.enum(['c7', 'c9', 'rgb', 'permanent', 'mini', 'custom']);
export const colorPatternSchema = z.enum(['solid', 'alternating', 'candy_cane', 'multi_repeat', 'custom_sequence']);
export const layerTypeSchema = z.enum(['lighting', 'decorations', 'trees', 'shrubs', 'commercial', 'notes']);
export const animationTypeSchema = z.enum(['twinkle', 'chase', 'fade', 'pulse', 'wave', 'sparkle']);

export const mockupPointSchema = z.object({ x: z.number(), y: z.number() });

export const mockupStrand360Schema = z.object({
  id: z.string(),
  points: z.array(mockupPointSchema).min(2),
  color: z.string(),
  lightType: lightTypeSchema.default('c9'),
  pattern: colorPatternSchema.default('solid'),
  bulbSize: z.number().default(6),
  spacing: z.number().default(12),
  brightness: z.number().min(0).max(1).default(1),
  layerId: z.string().optional(),
});

export const createMockup360Schema = z.object({
  propertyId: z.string().min(1),
  customerId: z.string().optional(),
  name: z.string().min(1).max(200),
  imageUrl: mediaReferenceSchema,
  optimizedImageUrl: optionalMediaReferenceSchema,
  thumbnailUrl: optionalMediaReferenceSchema,
  backgroundBrightness: z.number().min(0).max(1).default(0.5),
  strands: z.array(mockupStrand360Schema).default([]),
  notes: z.string().max(5000).optional(),
});

export const updateMockup360Schema = z.object({
  mockupId: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
  status: mockupStatusSchema.optional(),
  backgroundBrightness: z.number().min(0).max(1).optional(),
  strands: z.array(mockupStrand360Schema).optional(),
  scaleFeetPerPixel: z.number().positive().optional(),
  animationType: animationTypeSchema.optional(),
  animationSpeed: z.number().min(0).max(1).optional(),
  imageUrl: optionalMediaReferenceSchema,
  renderedImageUrl: optionalMediaReferenceSchema,
  notes: z.string().max(5000).optional(),
});

export const setScaleSchema = z.object({
  mockupId: z.string().min(1),
  knownFeet: z.number().positive(),
  pixelLength: z.number().positive(),
});

export const createVersionSchema = z.object({
  mockupId: z.string().min(1),
  revisionNotes: z.string().max(2000).optional(),
});

export const aiDesignSchema = z.object({
  style: z.string().min(3).max(200),
  mockupId: z.string().optional(),
});

export const exportMockupSchema = z.object({
  mockupId: z.string().min(1),
  exportType: z.enum(['material_list', 'install_sheet', 'pick_list', 'crew_work_order']),
});

export const createProposalFromMockupSchema = z.object({
  mockupId: z.string().min(1),
  customerId: z.string().min(1),
  propertyId: z.string().min(1),
  title: z.string().min(1).max(200).optional(),
});

export const linkMockupProposalSchema = z.object({
  mockupId: z.string().min(1),
  proposalId: z.string().min(1),
});

export const mockupCustomerApprovalSchema = z.object({
  token: z.string().min(8),
  action: z.enum(['approved', 'revision_requested']),
  customerName: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
});
