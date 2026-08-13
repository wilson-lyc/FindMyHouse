import type { FastifyInstance } from 'fastify';

export async function registerHealthRoutes(app: FastifyInstance) {
  app.get('/api/health', async (_request, reply) => {
    return reply.ok({ ok: true, service: 'find-my-house-api' }, '服务正常');
  });
}
