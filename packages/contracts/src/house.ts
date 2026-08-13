import { z } from 'zod';

/** 房源状态枚举(前后端共享,与后端存储值一致)。 */
export const houseStatuses = [
  'watching',
  'interested',
  'negotiating',
  'abandoned',
  'signed'
] as const;
export type HouseStatus = (typeof houseStatuses)[number];

/** 房源来源渠道枚举(前后端共享,与后端存储值一致)。 */
export const houseSourceChannels = ['beike', 'mini_program', 'anjuke', 'lianjia', 'offline_agent', 'other'] as const;
export type HouseSourceChannel = (typeof houseSourceChannels)[number];

/** 租金支付周期枚举(前后端共享,与后端存储值一致)。 */
export const rentPaymentPeriods = ['monthly', 'quarterly', 'semiannually', 'annually'] as const;
export type RentPaymentPeriod = (typeof rentPaymentPeriods)[number];

/** 看房日程单项(实体)。 */
export interface ViewingScheduleItem {
  id: string;
  houseId: string;
  viewingAt: string;
  note?: string;
  houseName?: string;
  createdAt: string;
  updatedAt: string;
}

/** 自定义费用项(实体)。 */
export interface CustomFeeItem {
  name: string;
  amount: number;
}

/** 房源图片实体(响应 DTO)。 */
export interface HouseImageItem {
  id: string;
  houseId: string;
  url: string;
  storagePath: string;
  originalName: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  sortOrder: number;
  isCover: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 房源实体(响应 DTO,与后端数据库映射一致)。 */
export interface House {
  id: string;
  name: string;
  status: HouseStatus;
  bedroomCount: number;
  livingRoomCount: number;
  bathroomCount: number;
  sourceChannel?: HouseSourceChannel;
  address: string;
  latitude?: number;
  longitude?: number;
  rentPrice: number;
  rentPaymentPeriods?: RentPaymentPeriod[];
  earnestMoney?: number;
  deposit?: number;
  propertyFee?: number;
  waterFeePerTon?: number;
  electricityFeePerKwh?: number;
  customFees?: CustomFeeItem[];
  viewingSchedules?: ViewingScheduleItem[];
  images?: HouseImageItem[];
  feeNotes?: string;
  contactName?: string;
  phone?: string;
  wechat?: string;
  contactNotes?: string;
  createdAt: string;
  updatedAt: string;
}

/** 房源列表筛选条件(service / repository 使用)。 */
export interface HouseFilters {
  q?: string;
  status?: HouseStatus;
  sourceChannel?: HouseSourceChannel;
  minRentPrice?: number;
  maxRentPrice?: number;
  minBedroomCount?: number;
  maxBedroomCount?: number;
  minLivingRoomCount?: number;
  maxLivingRoomCount?: number;
  minBathroomCount?: number;
  maxBathroomCount?: number;
  minLatitude?: number;
  maxLatitude?: number;
  minLongitude?: number;
  maxLongitude?: number;
  limit?: number;
}

/** 创建房源请求(请求 DTO),服务端生成的字段省略。 */
export const createHouseSchema = z.object({
  name: z.string().min(1, '房源名称不能为空'),
  status: z.enum(houseStatuses),
  bedroomCount: z.number(),
  livingRoomCount: z.number(),
  bathroomCount: z.number(),
  sourceChannel: z.enum(houseSourceChannels).optional(),
  address: z.string().min(1, '地址不能为空'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  rentPrice: z.number(),
  rentPaymentPeriods: z.array(z.enum(rentPaymentPeriods)).optional(),
  earnestMoney: z.number().optional(),
  deposit: z.number().optional(),
  propertyFee: z.number().optional(),
  waterFeePerTon: z.number().optional(),
  electricityFeePerKwh: z.number().optional(),
  customFees: z.array(z.object({
    name: z.string().min(1, '费用名称不能为空'),
    amount: z.number()
  })).optional(),
  feeNotes: z.string().optional(),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  wechat: z.string().optional(),
  contactNotes: z.string().optional()
});
export type CreateHouseInput = z.infer<typeof createHouseSchema>;

/** 更新房源请求(请求 DTO),所有字段可选。 */
export const updateHouseSchema = createHouseSchema.partial();
export type UpdateHouseInput = z.infer<typeof updateHouseSchema>;

/** 导入房源请求(请求 DTO),导入的房源为完整房源结构。 */
export const importHouseSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(houseStatuses),
  bedroomCount: z.number(),
  livingRoomCount: z.number(),
  bathroomCount: z.number(),
  sourceChannel: z.enum(houseSourceChannels).optional(),
  address: z.string(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  rentPrice: z.number(),
  rentPaymentPeriods: z.array(z.enum(rentPaymentPeriods)).optional(),
  earnestMoney: z.number().optional(),
  deposit: z.number().optional(),
  propertyFee: z.number().optional(),
  waterFeePerTon: z.number().optional(),
  electricityFeePerKwh: z.number().optional(),
  customFees: z.array(z.object({
    name: z.string(),
    amount: z.number()
  })).optional(),
  feeNotes: z.string().optional(),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  wechat: z.string().optional(),
  contactNotes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type ImportHouseInput = z.infer<typeof importHouseSchema>;

/** 房源列表查询参数(请求 DTO)。 */
export const listHousesQuerySchema = z.object({
  name: z.string().optional(),
  status: z.enum(houseStatuses).optional(),
  minRent: z.coerce.number().min(0, '最小租金不能为负数').optional(),
  maxRent: z.coerce.number().min(0, '最大租金不能为负数').optional(),
  sortBy: z.enum(['name', 'rentPrice', 'createdAt', 'updatedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
});
export type ListHousesQuery = z.infer<typeof listHousesQuerySchema>;

/** 资源 ID 路径参数(请求 DTO)。 */
export const idParamsSchema = z.object({
  id: z.string().min(1, 'ID 不能为空')
});
export type IdParams = z.infer<typeof idParamsSchema>;

/** 校验结果统一结构(判别联合,成功时 data 非 null)。 */
export type ValidationResult<T> =
  | { success: true; data: T; errors: []; error?: undefined }
  | { success: false; data: null; errors: string[]; error: string };

function toValidationResult<T>(result: z.ZodSafeParseResult<T>): ValidationResult<T> {
  if (result.success) {
    return { success: true, data: result.data, errors: [] };
  }
  const errors = result.error.issues.map((issue: z.core.$ZodIssue) => issue.message);
  return {
    success: false,
    data: null,
    errors,
    error: errors[0] ?? '校验未通过'
  };
}

export function validateCreateHouse(input: unknown): ValidationResult<CreateHouseInput> {
  return toValidationResult(createHouseSchema.safeParse(input));
}

export function validateUpdateHouse(input: unknown): ValidationResult<UpdateHouseInput> {
  return toValidationResult(updateHouseSchema.safeParse(input));
}

export function validateDeleteHouse(input: unknown): ValidationResult<IdParams> {
  return toValidationResult(idParamsSchema.safeParse(input));
}
