import type { FastifyInstance } from 'fastify';
import { geocodeSchema } from './dto/map.schema.js';
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
}
