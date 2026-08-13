import { z } from 'zod';
import { importHouseSchema, type ImportHouseInput } from './house.js';
import { importLocationSchema, type ImportLocationInput } from './location.js';
import { importScheduleSchema, type ImportScheduleInput } from './schedule.js';
import type { House } from './house.js';
import type { Location } from './location.js';
import type { Schedule } from './schedule.js';

/** 导出范围枚举(前后端共享)。 */
export const exportScopes = ['all', 'data', 'config', 'houses', 'locations', 'schedules', 'serviceConfig'] as const;
export type ExportScope = (typeof exportScopes)[number];

/** 导出数据请求(请求 DTO)。 */
export const exportDataQuerySchema = z.object({
  scope: z.enum(exportScopes)
});
export type ExportDataQuery = z.infer<typeof exportDataQuerySchema>;

/** 导入数据请求(请求 DTO)。 */
export const importDataSchema = z.object({
  houses: z.array(importHouseSchema).optional(),
  locations: z.array(importLocationSchema).optional(),
  schedules: z.array(importScheduleSchema).optional(),
  config: z.record(z.string(), z.string()).optional(),
  serviceConfig: z.record(z.string(), z.string()).optional()
});
export type ImportDataInput = z.infer<typeof importDataSchema>;

/** 导出数据响应(响应 DTO)。 */
export interface ExportData {
  exportedAt: string;
  scope: ExportScope;
  houses?: House[];
  locations?: Location[];
  schedules?: Schedule[];
  serviceConfig?: Record<string, string>;
}

/** 导入结果响应(响应 DTO)。 */
export interface ImportDataResult {
  houses: number;
  locations: number;
  schedules: number;
  serviceConfig: number;
}

export type { ImportHouseInput, ImportLocationInput, ImportScheduleInput };
