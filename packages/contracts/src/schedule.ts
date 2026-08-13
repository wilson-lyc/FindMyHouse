import { z } from 'zod';

/** 日程实体(响应 DTO,与后端存储一致)。 */
export interface Schedule {
  id: string;
  houseId: string;
  viewingAt: string;
  note?: string;
  houseName?: string;
  createdAt: string;
  updatedAt: string;
}

/** 日程列表筛选条件(service / repository 使用)。 */
export interface ScheduleFilters {
  houseId?: string;
  dateFrom?: string;
  dateTo?: string;
}

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value === '' ? undefined : value));

/** 创建日程请求(请求 DTO)。 */
export const createScheduleSchema = z.object({
  houseId: z.string().uuid('房源 ID 格式无效'),
  viewingAt: z.string().datetime('看房时间格式无效'),
  note: optionalText
});
export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;

/** 更新日程请求(请求 DTO)。 */
export const updateScheduleSchema = z.object({
  viewingAt: z.string().datetime('看房时间格式无效').optional(),
  note: optionalText
});
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;

/** 清单日程查询参数(请求 DTO)。 */
export const listSchedulesQuerySchema = z.object({
  houseId: z.string().uuid().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional()
});
export type ListSchedulesQuery = z.infer<typeof listSchedulesQuerySchema>;

/** 导入日程请求(请求 DTO)。 */
export const importScheduleSchema = z.object({
  id: z.string(),
  houseId: z.string(),
  viewingAt: z.string(),
  note: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type ImportScheduleInput = z.infer<typeof importScheduleSchema>;

import { idParamsSchema } from './house.js';
import type { IdParams } from './house.js';
