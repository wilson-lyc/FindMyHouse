import { z } from 'zod';
import { housePaymentPeriods, houseStatuses } from '../domain/house.js';

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

export const createHouseSchema = z.object({
  title: z.string().trim().min(1, 'title is required'),
  source: optionalText,
  sourceUrl: optionalText,
  address: z.string().trim().min(1, 'address is required'),
  latitude: optionalNumber,
  longitude: optionalNumber,
  rentPrice: z.number().int().nonnegative(),
  paymentPeriods: z.array(z.enum(housePaymentPeriods)).optional(),
  depositAmount: optionalNumber,
  agencyFee: optionalNumber,
  propertyFee: optionalNumber,
  waterFeePerTon: optionalNumber,
  electricityFeePerKwh: optionalNumber,
  internetFee: optionalNumber,
  sharedFee: optionalNumber,
  otherFee: optionalNumber,
  areaSqm: optionalNumber,
  layout: optionalText,
  floor: optionalText,
  orientation: optionalText,
  availableDate: optionalText,
  status: z.enum(houseStatuses).default('new'),
  notes: optionalText
});

export const updateHouseSchema = createHouseSchema.partial();

export const listHousesQuerySchema = z.object({
  status: z.enum(houseStatuses).optional(),
  q: z.string().trim().optional(),
  minLatitude: z.coerce.number().finite().optional(),
  maxLatitude: z.coerce.number().finite().optional(),
  minLongitude: z.coerce.number().finite().optional(),
  maxLongitude: z.coerce.number().finite().optional()
});

export const idParamsSchema = z.object({
  id: z.string().uuid()
});

export const toggleFavoriteSchema = z.object({
  isFavorited: z.boolean()
});

export type CreateHouseInput = z.infer<typeof createHouseSchema>;
export type UpdateHouseInput = z.infer<typeof updateHouseSchema>;
