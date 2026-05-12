import { z } from 'zod';
import { locationCategories } from '../domain/location.js';

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value === '' ? undefined : value));

const optionalNumber = z
  .number()
  .finite()
  .optional()
  .nullable()
  .transform((value) => value ?? undefined);

export const createLocationSchema = z.object({
  name: z.string().trim().min(1, 'name is required'),
  category: z.enum(locationCategories).default('other'),
  address: z.string().trim().min(1, 'address is required'),
  latitude: optionalNumber,
  longitude: optionalNumber,
  notes: optionalText
});

export const updateLocationSchema = createLocationSchema.partial();

export const listLocationsQuerySchema = z.object({
  category: z.enum(locationCategories).optional()
});

export const idParamsSchema = z.object({
  id: z.string().uuid()
});

export type CreateLocationInput = z.infer<typeof createLocationSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
