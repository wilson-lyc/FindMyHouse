import { z } from 'zod';
import { listingStatuses } from '../domain/listing.js';

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

export const createListingSchema = z.object({
  title: z.string().trim().min(1, 'title is required'),
  source: optionalText,
  sourceUrl: optionalText,
  address: z.string().trim().min(1, 'address is required'),
  latitude: optionalNumber,
  longitude: optionalNumber,
  rentPrice: z.number().int().nonnegative(),
  depositAmount: optionalNumber,
  agencyFee: optionalNumber,
  areaSqm: optionalNumber,
  layout: optionalText,
  floor: optionalText,
  orientation: optionalText,
  availableDate: optionalText,
  status: z.enum(listingStatuses).default('new'),
  notes: optionalText
});

export const updateListingSchema = createListingSchema.partial();

export const listListingsQuerySchema = z.object({
  status: z.enum(listingStatuses).optional(),
  q: z.string().trim().optional(),
  minLatitude: z.coerce.number().finite().optional(),
  maxLatitude: z.coerce.number().finite().optional(),
  minLongitude: z.coerce.number().finite().optional(),
  maxLongitude: z.coerce.number().finite().optional()
});

export const idParamsSchema = z.object({
  id: z.string().uuid()
});

export type CreateListingInput = z.infer<typeof createListingSchema>;
export type UpdateListingInput = z.infer<typeof updateListingSchema>;
