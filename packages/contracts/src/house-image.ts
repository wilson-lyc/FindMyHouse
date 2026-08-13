import { z } from 'zod';

/** 房源图片实体(响应 DTO,与后端存储一致)。 */
export const houseImageSchema = z.object({
  id: z.string(),
  houseId: z.string(),
  url: z.string(),
  storagePath: z.string(),
  originalName: z.string(),
  mimeType: z.string(),
  size: z.number(),
  width: z.number().optional(),
  height: z.number().optional(),
  sortOrder: z.number(),
  isCover: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type HouseImage = z.infer<typeof houseImageSchema>;

/** 房源图片更新请求(请求 DTO)。 */
export const updateHouseImageSchema = z.object({
  isCover: z.boolean().optional(),
  sortOrder: z.number().int().nonnegative().optional()
});
export type UpdateHouseImageInput = z.infer<typeof updateHouseImageSchema>;

/** 房源图片列表路径参数(请求 DTO)。 */
export const houseImageParamsSchema = z.object({
  houseId: z.string().uuid('房源 ID 格式无效')
});
export type HouseImageParams = z.infer<typeof houseImageParamsSchema>;

/** 房源图片单项路径参数(请求 DTO)。 */
export const houseImageItemParamsSchema = z.object({
  houseId: z.string().uuid('房源 ID 格式无效'),
  imageId: z.string().uuid('图片 ID 格式无效')
});
export type HouseImageItemParams = z.infer<typeof houseImageItemParamsSchema>;

/** 房源图片排序请求(请求 DTO)。 */
export const reorderHouseImagesSchema = z.object({
  imageIds: z.array(z.string().uuid('图片 ID 格式无效')).min(1, '图片 ID 列表不能为空')
});
export type ReorderHouseImagesInput = z.infer<typeof reorderHouseImagesSchema>;

export class UnsupportedHouseImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedHouseImageError';
  }
}

export class NoHouseImagesUploadedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NoHouseImagesUploadedError';
  }
}
