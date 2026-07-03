import { z } from 'zod';
import { isValidLogoReference } from '@clcrm/types';

/** Storage path, file-proxy URL, or HTTPS URL for uploaded media. */
export const mediaReferenceSchema = z
  .string()
  .refine((val) => isValidLogoReference(val), { message: 'Invalid image URL or storage path' });

export const optionalMediaReferenceSchema = z
  .string()
  .optional()
  .nullable()
  .or(z.literal(''))
  .refine((val) => isValidLogoReference(val), { message: 'Invalid image URL or storage path' });
