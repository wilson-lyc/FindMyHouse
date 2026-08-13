import type { FastifyInstance } from 'fastify';
import { db } from '../../database/connection.js';
import type { House } from './domain/house.js';
import { createHouseSchema, idParamsSchema, listHousesQuerySchema, updateHouseSchema, validateCreateHouse, validateUpdateHouse } from './dto/house.schema.js';
import { HouseRepository } from './house.repository.js';
import { HouseService } from './house.service.js';

const houseService = new HouseService(new HouseRepository(db));

export async function registerHouseRoutes(app: FastifyInstance) {
  app.get('/api/houses', async (request, reply) => {
    const filters = listHousesQuerySchema.parse(request.query);
    return reply.ok(houseService.listHouses(filters).map(toPublicHouse));
  });

  app.post('/api/houses', async (request, reply) => {
    const validation = validateCreateHouse(request.body);

    if (!validation.success) {
      return reply.fail({
        code: 400,
        message: '房源信息校验未通过',
        error: 'VALIDATION_FAILED',
        details: validation.errors
      });
    }

    const house = houseService.createHouse(validation.data);
    return reply.created(toPublicHouse(house), '房源已创建');
  });

  app.get('/api/houses/:id', async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);
    const house = houseService.getHouse(id);

    if (!house) {
      return reply.fail({ code: 404, message: '房源不存在', error: 'HOUSE_NOT_FOUND' });
    }

    return reply.ok(toPublicHouse(house));
  });

  app.patch('/api/houses/:id', async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);
    const validation = validateUpdateHouse(request.body);

    if (!validation.success) {
      return reply.fail({
        code: 400,
        message: '房源更新信息校验未通过',
        error: 'VALIDATION_FAILED',
        details: validation.errors
      });
    }

    const house = houseService.updateHouse(id, validation.data);

    if (!house) {
      return reply.fail({ code: 404, message: '房源不存在', error: 'HOUSE_NOT_FOUND' });
    }

    return reply.ok(toPublicHouse(house), '房源已更新');
  });

  app.delete('/api/houses/:id', async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);
    const deleted = houseService.deleteHouse(id);

    if (!deleted) {
      return reply.fail({ code: 404, message: '房源不存在', error: 'HOUSE_NOT_FOUND' });
    }

    return reply.noContent();
  });
}

function toPublicHouse(house: House) {
  return {
    ...house,
    images: house.images?.map(({ storagePath: _storagePath, ...image }) => image)
  };
}
