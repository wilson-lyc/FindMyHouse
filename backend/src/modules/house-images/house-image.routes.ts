import type { FastifyInstance } from 'fastify';
import { db } from '../../database/connection.js';
import {
  houseImageItemParamsSchema,
  houseImageParamsSchema,
  reorderHouseImagesSchema,
  updateHouseImageSchema
} from './dto/house-image.schema.js';
import type { HouseImage } from './domain/house-image.js';
import { HouseImageRepository } from './house-image.repository.js';
import { HouseImageService, NoHouseImagesUploadedError, UnsupportedHouseImageError } from './house-image.service.js';

const houseImageService = new HouseImageService(new HouseImageRepository(db));

export async function registerHouseImageRoutes(app: FastifyInstance) {
  app.get('/api/houses/:houseId/images', async (request, reply) => {
    const { houseId } = houseImageParamsSchema.parse(request.params);
    const images = houseImageService.listHouseImages(houseId);

    if (!images) {
      return reply.code(404).send({ error: 'House not found' });
    }

    return { data: images.map(toPublicHouseImage) };
  });

  app.post('/api/houses/:houseId/images', async (request, reply) => {
    const { houseId } = houseImageParamsSchema.parse(request.params);

    if (!request.isMultipart()) {
      return reply.code(400).send({ error: 'Expected multipart/form-data' });
    }

    const images = await houseImageService.uploadHouseImages(houseId, request.files()).catch((error: unknown) => {
      if (error instanceof UnsupportedHouseImageError || error instanceof NoHouseImagesUploadedError) {
        return error;
      }

      throw error;
    });

    if (images instanceof UnsupportedHouseImageError || images instanceof NoHouseImagesUploadedError) {
      return reply.code(400).send({ error: images.message });
    }

    if (!images) {
      return reply.code(404).send({ error: 'House not found' });
    }

    return reply.code(201).send({ data: images.map(toPublicHouseImage) });
  });

  app.delete('/api/houses/:houseId/images/:imageId', async (request, reply) => {
    const { houseId, imageId } = houseImageItemParamsSchema.parse(request.params);
    const deleted = await houseImageService.deleteImage(houseId, imageId);

    if (!deleted) {
      return reply.code(404).send({ error: 'Image not found' });
    }

    return reply.code(204).send();
  });

  app.patch('/api/houses/:houseId/images/:imageId', async (request, reply) => {
    const { houseId, imageId } = houseImageItemParamsSchema.parse(request.params);
    const input = updateHouseImageSchema.parse(request.body);
    const image = houseImageService.updateImage(houseId, imageId, input);

    if (!image) {
      return reply.code(404).send({ error: 'Image not found' });
    }

    return { data: toPublicHouseImage(image) };
  });

  app.put('/api/houses/:houseId/images/order', async (request, reply) => {
    const { houseId } = houseImageParamsSchema.parse(request.params);
    const { imageIds } = reorderHouseImagesSchema.parse(request.body);
    const images = houseImageService.reorderHouseImages(houseId, imageIds);

    if (!images) {
      return reply.code(400).send({ error: 'Image order must include all images for the house' });
    }

    return { data: images.map(toPublicHouseImage) };
  });
}

function toPublicHouseImage(image: HouseImage) {
  const { storagePath: _storagePath, ...publicImage } = image;
  return publicImage;
}
