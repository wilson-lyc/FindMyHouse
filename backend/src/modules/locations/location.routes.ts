import type { FastifyInstance } from 'fastify';
import { db } from '../../database/connection.js';
import { createLocationSchema, idParamsSchema, listLocationsQuerySchema, updateLocationSchema } from './dto/location.schema.js';
import { LocationRepository } from './location.repository.js';
import { LocationService } from './location.service.js';

const locationService = new LocationService(new LocationRepository(db));

export async function registerLocationRoutes(app: FastifyInstance) {
  app.get('/api/locations', async (request) => {
    const filters = listLocationsQuerySchema.parse(request.query);
    return { data: locationService.listLocations(filters) };
  });

  app.post('/api/locations', async (request, reply) => {
    const input = createLocationSchema.parse(request.body);
    const location = locationService.createLocation(input);
    return reply.code(201).send({ data: location });
  });

  app.get('/api/locations/:id', async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);
    const location = locationService.getLocation(id);

    if (!location) {
      return reply.code(404).send({ error: 'Location not found' });
    }

    return { data: location };
  });

  app.patch('/api/locations/:id', async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);
    const input = updateLocationSchema.parse(request.body);
    const location = locationService.updateLocation(id, input);

    if (!location) {
      return reply.code(404).send({ error: 'Location not found' });
    }

    return { data: location };
  });

  app.delete('/api/locations/:id', async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);
    const deleted = locationService.deleteLocation(id);

    if (!deleted) {
      return reply.code(404).send({ error: 'Location not found' });
    }

    return reply.code(204).send();
  });
}
