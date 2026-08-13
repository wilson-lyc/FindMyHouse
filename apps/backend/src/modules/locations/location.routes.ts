import type { FastifyInstance } from 'fastify';
import { db } from '../../database/connection.js';
import { createLocationSchema, idParamsSchema, listLocationsQuerySchema, updateLocationSchema } from './dto/location.schema.js';
import { LocationRepository } from './location.repository.js';
import { LocationService } from './location.service.js';
import { RouteCacheRepository } from '../maps/route-cache.repository.js';

const locationService = new LocationService(
  new LocationRepository(db),
  new RouteCacheRepository(db)
);

export async function registerLocationRoutes(app: FastifyInstance) {
  app.get('/api/locations', async (request, reply) => {
    const filters = listLocationsQuerySchema.parse(request.query);
    return reply.ok(locationService.listLocations(filters));
  });

  app.post('/api/locations', async (request, reply) => {
    const input = createLocationSchema.parse(request.body);
    const location = locationService.createLocation(input);
    return reply.created(location, '地点已创建');
  });

  app.get('/api/locations/:id', async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);
    const location = locationService.getLocation(id);

    if (!location) {
      return reply.fail({ code: 404, message: '地点不存在', error: 'LOCATION_NOT_FOUND' });
    }

    return reply.ok(location);
  });

  app.patch('/api/locations/:id', async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);
    const input = updateLocationSchema.parse(request.body);
    const location = locationService.updateLocation(id, input);

    if (!location) {
      return reply.fail({ code: 404, message: '地点不存在', error: 'LOCATION_NOT_FOUND' });
    }

    return reply.ok(location, '地点已更新');
  });

  app.patch('/api/locations/:id/focus', async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);
    const location = locationService.setFocusLocation(id);

    if (!location) {
      return reply.fail({ code: 404, message: '地点不存在', error: 'LOCATION_NOT_FOUND' });
    }

    return reply.ok(location, '关注地点已更新');
  });

  app.delete('/api/locations/:id', async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);
    const deleted = locationService.deleteLocation(id);

    if (!deleted) {
      return reply.fail({ code: 404, message: '地点不存在', error: 'LOCATION_NOT_FOUND' });
    }

    return reply.noContent();
  });
}
