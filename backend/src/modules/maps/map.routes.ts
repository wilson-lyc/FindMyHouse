import type { FastifyInstance } from 'fastify';
import { geocodeSchema, drivingDistanceSchema } from './dto/map.schema.js';
import { AmapService } from './amap.service.js';

const amapService = new AmapService();

export async function registerMapRoutes(app: FastifyInstance) {
  app.post('/api/maps/geocode', async (request, reply) => {
    const input = geocodeSchema.parse(request.body);
    const result = await amapService.geocode(input.address, input.city);

    if (!result) {
      return reply.code(404).send({ error: 'Address not found' });
    }

    return { data: result };
  });

  app.post('/api/maps/driving-distance', async (request, reply) => {
    const input = drivingDistanceSchema.parse(request.body);
    const result = await amapService.getDrivingDistance(input.origin, input.destination);

    if (!result) {
      return reply.code(404).send({ error: 'Route not found' });
    }

    return { data: result };
  });

  app.post('/api/maps/driving-route', async (request, reply) => {
    const input = drivingDistanceSchema.parse(request.body);
    const result = await amapService.getDrivingRoute(input.origin, input.destination);

    if (!result) {
      return reply.code(404).send({ error: 'Route not found' });
    }

    return { data: result };
  });
}
