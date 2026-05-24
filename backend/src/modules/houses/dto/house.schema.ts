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
  earnestMoney: optionalNumber,
  deposit: optionalNumber,
  propertyFee: optionalNumber,
  waterFeePerTon: optionalNumber,
  electricityFeePerKwh: optionalNumber,
  customFees: z.array(z.object({ name: z.string().min(1, '费用名称不能为空'), amount: z.number().min(0, '金额不能为负数') })).optional(),
  viewingSchedules: z
    .array(
      z.object({
        id: z.string().min(1),
        viewingAt: z.string().datetime(),
        note: optionalText
      })
    )
    .optional(),
  feeNotes: optionalText,
  contactName: optionalText,
  phone: optionalText,
  wechat: optionalText,
  contactNotes: optionalText
});

export const updateHouseSchema = createHouseSchema.partial();

export const importHouseSchema = createHouseSchema.extend({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const listHousesQuerySchema = z.object({
  q: optionalText,
  status: z.enum(houseStatuses).optional(),
  sourceChannel: z.enum(houseSourceChannels).optional(),
  minRentPrice: z.coerce.number().int().nonnegative().optional(),
  maxRentPrice: z.coerce.number().int().nonnegative().optional(),
  minBedroomCount: z.coerce.number().int().nonnegative().optional(),
  maxBedroomCount: z.coerce.number().int().nonnegative().optional(),
  minLivingRoomCount: z.coerce.number().int().nonnegative().optional(),
  maxLivingRoomCount: z.coerce.number().int().nonnegative().optional(),
  minBathroomCount: z.coerce.number().int().nonnegative().optional(),
  maxBathroomCount: z.coerce.number().int().nonnegative().optional(),
  minLatitude: z.coerce.number().finite().optional(),
  maxLatitude: z.coerce.number().finite().optional(),
  minLongitude: z.coerce.number().finite().optional(),
  maxLongitude: z.coerce.number().finite().optional(),
  limit: z.coerce.number().int().positive().max(100).optional()
});

export const idParamsSchema = z.object({
  id: z.string().uuid()
});

export type CreateHouseInput = z.infer<typeof createHouseSchema>;
export type UpdateHouseInput = z.infer<typeof updateHouseSchema>;
export type ImportHouseInput = z.infer<typeof importHouseSchema>;
