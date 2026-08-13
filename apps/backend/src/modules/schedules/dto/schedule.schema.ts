import { z } from 'zod';

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value === '' ? undefined : value));

export const createScheduleSchema = z.object({
  houseId: z.string().uuid(),
  viewingAt: z.string().datetime(),
  note: optionalText
});

export const updateScheduleSchema = z.object({
  viewingAt: z.string().datetime().optional(),
  note: optionalText
});

export const listSchedulesQuerySchema = z.object({
  houseId: z.string().uuid().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional()
});

export const idParamsSchema = z.object({
  id: z.string().uuid()
});

export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;
