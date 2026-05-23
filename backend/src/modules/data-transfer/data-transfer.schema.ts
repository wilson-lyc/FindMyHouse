import { z } from 'zod';
import { importHouseSchema } from '../houses/dto/house.schema.js';
import { importLocationSchema } from '../locations/dto/location.schema.js';

export const exportScopeSchema = z.enum(['all', 'data', 'houses', 'locations', 'config', 'serviceConfig']);

export const exportDataQuerySchema = z.object({
  scope: exportScopeSchema.default('all')
});

const configValueSchema = z.union([z.string(), z.number(), z.boolean()]);
const serviceConfigSchema = z.record(z.string(), configValueSchema);

export const importDataSchema = z.object({
  houses: z.array(importHouseSchema).optional(),
  locations: z.array(importLocationSchema).optional(),
  config: serviceConfigSchema.optional(),
  serviceConfig: serviceConfigSchema.optional()
});

export type ExportScope = z.infer<typeof exportScopeSchema>;
export type ImportDataInput = z.infer<typeof importDataSchema>;
