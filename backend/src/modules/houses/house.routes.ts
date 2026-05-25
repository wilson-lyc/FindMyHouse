import type { FastifyInstance } from 'fastify';
import { db } from '../../database/connection.js';
import type { House } from './domain/house.js';
import { createHouseSchema, idParamsSchema, listHousesQuerySchema, updateHouseSchema } from './dto/house.schema.js';
import { HouseRepository } from './house.repository.js';
import { HouseService } from './house.service.js';

const houseService = new HouseService(new HouseRepository(db));

export async function registerHouseRoutes(app: FastifyInstance) {
  app.get('/api/houses', async (request) => {
    const filters = listHousesQuerySchema.parse(request.query);
    return { data: houseService.listHouses(filters).map(toPublicHouse) };
  });

  app.post('/api/houses', async (request, reply) => {
    const input = createHouseSchema.parse(request.body);
    const house = houseService.createHouse(input);
    return reply.code(201).send({ data: toPublicHouse(house) });
  });

  app.get('/api/houses/:id', async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);
    const house = houseService.getHouse(id);

    if (!house) {
      return reply.code(404).send({ error: 'House not found' });
    }

    return { data: toPublicHouse(house) };
  });

  app.patch('/api/houses/:id', async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);
    const input = updateHouseSchema.parse(request.body);
    const house = houseService.updateHouse(id, input);

    if (!house) {
      return reply.code(404).send({ error: 'House not found' });
    }

    return { data: toPublicHouse(house) };
  });

  app.delete('/api/houses/:id', async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);
    const deleted = houseService.deleteHouse(id);

    if (!deleted) {
      return reply.code(404).send({ error: 'House not found' });
    }

    return reply.code(204).send();
  });
}

function toPublicHouse(house: House) {
  return {
    ...house,
    images: house.images?.map(({ storagePath: _storagePath, ...image }) => image)
  };
}
