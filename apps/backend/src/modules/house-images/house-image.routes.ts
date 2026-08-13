import type { FastifyInstance } from 'fastify';
import { db } from '../../database/connection.js';
import {
  houseImageItemParamsSchema,
  houseImageParamsSchema,
  reorderHouseImagesSchema,
  updateHouseImageSchema
} from '@findmyhouse/contracts';
import type { HouseImage } from '@findmyhouse/contracts';
import { HouseImageRepository } from './house-image.repository.js';
import { HouseImageService, NoHouseImagesUploadedError, UnsupportedHouseImageError } from './house-image.service.js';

const houseImageService = new HouseImageService(new HouseImageRepository(db));

export async function registerHouseImageRoutes(app: FastifyInstance) {
  app.get('/api/houses/:houseId/images', async (request, reply) => {
    const { houseId } = houseImageParamsSchema.parse(request.params);
    const images = houseImageService.listHouseImages(houseId);

    if (!images) {
      return reply.fail({ code: 404, message: '房源不存在', error: 'HOUSE_NOT_FOUND' });
    }

    return reply.ok(images.map(toPublicHouseImage));
  });

  app.post('/api/houses/:houseId/images', async (request, reply) => {
    const { houseId } = houseImageParamsSchema.parse(request.params);

    if (!request.isMultipart()) {
      return reply.fail({
        code: 400,
        message: '请求格式应为 multipart/form-data',
        error: 'UNSUPPORTED_MEDIA_TYPE'
      });
    }

    const images = await houseImageService.uploadHouseImages(houseId, request.files()).catch((error: unknown) => {
      if (error instanceof UnsupportedHouseImageError || error instanceof NoHouseImagesUploadedError) {
        return error;
      }

      throw error;
    });

    if (images instanceof UnsupportedHouseImageError || images instanceof NoHouseImagesUploadedError) {
      return reply.fail({ code: 400, message: images.message, error: 'IMAGE_UPLOAD_FAILED' });
    }

    if (!images) {
      return reply.fail({ code: 404, message: '房源不存在', error: 'HOUSE_NOT_FOUND' });
    }

    return reply.created(images.map(toPublicHouseImage), '图片已上传');
  });

  app.delete('/api/houses/:houseId/images/:imageId', async (request, reply) => {
    const { houseId, imageId } = houseImageItemParamsSchema.parse(request.params);
    const deleted = await houseImageService.deleteImage(houseId, imageId);

    if (!deleted) {
      return reply.fail({ code: 404, message: '图片不存在', error: 'IMAGE_NOT_FOUND' });
    }

    return reply.noContent();
  });

  app.patch('/api/houses/:houseId/images/:imageId', async (request, reply) => {
    const { houseId, imageId } = houseImageItemParamsSchema.parse(request.params);
    const input = updateHouseImageSchema.parse(request.body);
    const image = houseImageService.updateImage(houseId, imageId, input);

    if (!image) {
      return reply.fail({ code: 404, message: '图片不存在', error: 'IMAGE_NOT_FOUND' });
    }

    return reply.ok(toPublicHouseImage(image), '图片已更新');
  });

  app.put('/api/houses/:houseId/images/order', async (request, reply) => {
    const { houseId } = houseImageParamsSchema.parse(request.params);
    const { imageIds } = reorderHouseImagesSchema.parse(request.body);
    const images = houseImageService.reorderHouseImages(houseId, imageIds);

    if (!images) {
      return reply.fail({
        code: 400,
        message: '图片排序必须包含该房源的全部图片',
        error: 'INVALID_IMAGE_ORDER'
      });
    }

    return reply.ok(images.map(toPublicHouseImage), '图片顺序已更新');
  });
}

function toPublicHouseImage(image: HouseImage) {
  const { storagePath: _storagePath, ...publicImage } = image;
  return publicImage;
}
