import { z } from 'zod';
import { houseSourceChannels, houseStatuses, rentPaymentPeriods } from '../domain/house.js';

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

const optionalSourceChannel = z
  .union([z.enum(houseSourceChannels), z.literal('')])
  .optional()
  .nullable()
  .transform((value) => value || undefined);

export const createHouseSchema = z.object({
  name: z.string().trim().min(1, 'name is required'),
  status: z.enum(houseStatuses).default('watching'),
  bedroomCount: z.number().int().nonnegative(),
  livingRoomCount: z.number().int().nonnegative(),
  bathroomCount: z.number().int().nonnegative(),
  sourceChannel: optionalSourceChannel,
  address: z.string().trim().min(1, 'address is required'),
  latitude: optionalNumber,
  longitude: optionalNumber,
  rentPrice: z.number().int().nonnegative(),
  rentPaymentPeriods: z.array(z.enum(rentPaymentPeriods)).optional(),
  propertyFee: optionalNumber,
  waterFeePerTon: optionalNumber,
  electricityFeePerKwh: optionalNumber,
  otherFee: optionalNumber,
  phone: optionalText,
  wechat: optionalText,
  contactNotes: optionalText
});

export const updateHouseSchema = createHouseSchema.partial();

export const listHousesQuerySchema = z.object({
  status: z.enum(houseStatuses).optional(),
  sourceChannel: z.enum(houseSourceChannels).optional(),
  q: z.string().trim().optional(),
  minLatitude: z.coerce.number().finite().optional(),
  maxLatitude: z.coerce.number().finite().optional(),
  minLongitude: z.coerce.number().finite().optional(),
  maxLongitude: z.coerce.number().finite().optional()
});

export const idParamsSchema = z.object({
  id: z.string().uuid()
});

export type CreateHouseInput = z.infer<typeof createHouseSchema>;
export type UpdateHouseInput = z.infer<typeof updateHouseSchema>;
