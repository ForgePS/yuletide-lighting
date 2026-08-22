import { z } from 'zod';
import {
  isValidPublicAccessToken,
  PUBLIC_ACCESS_TOKEN_MAX_LENGTH,
  PUBLIC_ACCESS_TOKEN_MIN_LENGTH,
} from '@clcrm/types';

/** YL-S22 — shared public CRM access token input (fail closed). */
export const publicAccessTokenSchema = z
  .string()
  .trim()
  .min(PUBLIC_ACCESS_TOKEN_MIN_LENGTH)
  .max(PUBLIC_ACCESS_TOKEN_MAX_LENGTH)
  .refine((value) => isValidPublicAccessToken(value), {
    message: 'Invalid public access token',
  });
