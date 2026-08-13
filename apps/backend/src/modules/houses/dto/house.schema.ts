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
  name: z.string().trim().min(1, '房源名称不能为空'),
  status: z.enum(houseStatuses, { message: '房源状态不合法' }).default('watching'),
  bedroomCount: z.number().int({ message: '卧室数必须为整数' }).nonnegative({ message: '卧室数不能为负数' }),
  livingRoomCount: z.number().int({ message: '客厅数必须为整数' }).nonnegative({ message: '客厅数不能为负数' }),
  bathroomCount: z.number().int({ message: '卫生间数必须为整数' }).nonnegative({ message: '卫生间数不能为负数' }),
  sourceChannel: optionalSourceChannel,
  address: z.string().trim().min(1, '房源地址不能为空'),
  latitude: optionalNumber,
  longitude: optionalNumber,
  rentPrice: z.number().int({ message: '租金必须为整数' }).nonnegative({ message: '租金不能为负数' }),
  rentPaymentPeriods: z.array(z.enum(rentPaymentPeriods, { message: '付款周期不合法' })).optional(),
  earnestMoney: optionalNumber,
  deposit: optionalNumber,
  propertyFee: optionalNumber,
  waterFeePerTon: optionalNumber,
  electricityFeePerKwh: optionalNumber,
  customFees: z
    .array(z.object({ name: z.string().min(1, '费用名称不能为空'), amount: z.number().min(0, '金额不能为负数') }))
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

export type HouseValidationResult =
  | { success: true; data: CreateHouseInput }
  | { success: false; errors: string[] };

export type HouseUpdateValidationResult =
  | { success: true; data: UpdateHouseInput }
  | { success: false; errors: string[] };

// 创建房源的统一数据校验入口：手动表单提交与 Agent 共用同一份规则（single source of truth）。
// 校验失败时返回中文错误清单，由调用方决定如何呈现（前端直接展示 / Agent 转成自然语言反问用户）。
export function validateCreateHouse(input: unknown): HouseValidationResult {
  const parsed = createHouseSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, errors: z.prettifyError(parsed.error).split('\n').map((line) => line.trim()).filter(Boolean) };
  }

  return { success: true, data: parsed.data };
}

// 更新房源的统一校验入口：复用 updateHouseSchema（createHouseSchema.partial），只校验“本次提供的字段”是否合法。
export function validateUpdateHouse(input: unknown): HouseUpdateValidationResult {
  const parsed = updateHouseSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, errors: z.prettifyError(parsed.error).split('\n').map((line) => line.trim()).filter(Boolean) };
  }

  return { success: true, data: parsed.data };
}

// 删除房源的统一校验入口：仅校验 id 是否合法，供手动路由与 Agent 共用。
export function validateDeleteHouse(id: unknown): { success: true; id: string } | { success: false; error: string } {
  const parsed = idParamsSchema.shape.id.safeParse(id);

  if (!parsed.success) {
    return { success: false, error: '房源 ID 不合法' };
  }

  return { success: true, id: parsed.data };
}
