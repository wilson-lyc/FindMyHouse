import { z } from 'zod';

/** 地点分类枚举(前后端共享,与后端存储值一致)。 */
export const locationCategories = ['work', 'school', 'transport', 'common', 'other'] as const;
export type LocationCategory = (typeof locationCategories)[number];

/** 地点实体(响应 DTO,与后端存储一致)。 */
export interface Location {
  id: string;
  name: string;
  category: LocationCategory;
  address: string;
  latitude?: number;
  longitude?: number;
  isFocus: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/** 地点列表筛选条件(service / repository 使用)。 */
export interface LocationFilters {
  q?: string;
  category?: LocationCategory;
}

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

/** 创建地点请求(请求 DTO)。 */
export const createLocationSchema = z.object({
  name: z.string().trim().min(1, 'name is required'),
  category: z.enum(locationCategories).default('other'),
  address: z.string().trim().min(1, 'address is required'),
  latitude: optionalNumber,
  longitude: optionalNumber,
  isFocus: z.boolean().default(false),
  notes: optionalText
});
export type CreateLocationInput = z.infer<typeof createLocationSchema>;

/** 更新地点请求(请求 DTO)。 */
export const updateLocationSchema = createLocationSchema.partial();
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;

/** 导入地点请求(请求 DTO)。 */
export const importLocationSchema = createLocationSchema.extend({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type ImportLocationInput = z.infer<typeof importLocationSchema>;

/** 地点列表查询参数(请求 DTO)。 */
export const listLocationsQuerySchema = z.object({
  category: z.enum(locationCategories).optional()
});
export type ListLocationsQuery = z.infer<typeof listLocationsQuerySchema>;

import { idParamsSchema } from './house.js';
import type { IdParams } from './house.js';
