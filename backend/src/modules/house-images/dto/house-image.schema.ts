import { z } from 'zod';

export const houseImageParamsSchema = z.object({
  houseId: z.string().uuid()
});

export const houseImageItemParamsSchema = z.object({
  houseId: z.string().uuid(),
  imageId: z.string().uuid()
});

export const reorderHouseImagesSchema = z.object({
  imageIds: z.array(z.string().uuid()).min(1)
});

export const updateHouseImageSchema = z.object({
  isCover: z.boolean().optional(),
  sortOrder: z.number().int().nonnegative().optional()
});
