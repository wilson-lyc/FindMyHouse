import { z } from 'zod';
import { importHouseSchema } from '../houses/dto/house.schema.js';
import { importLocationSchema } from '../locations/dto/location.schema.js';

export const exportScopeSchema = z.enum(['all', 'data', 'houses', 'locations', 'schedules', 'config', 'serviceConfig']);

export const exportDataQuerySchema = z.object({
  scope: exportScopeSchema.default('all')
});

const configValueSchema = z.union([z.string(), z.number(), z.boolean()]);
const serviceConfigSchema = z.record(z.string(), configValueSchema);

export const importScheduleSchema = z.object({
  id: z.string(),
  houseId: z.string(),
  viewingAt: z.string(),
  note: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const importDataSchema = z.object({
  houses: z.array(importHouseSchema).optional(),
  locations: z.array(importLocationSchema).optional(),
  schedules: z.array(importScheduleSchema).optional(),
  config: serviceConfigSchema.optional(),
  serviceConfig: serviceConfigSchema.optional()
});

export type ExportScope = z.infer<typeof exportScopeSchema>;
export type ImportDataInput = z.infer<typeof importDataSchema>;
