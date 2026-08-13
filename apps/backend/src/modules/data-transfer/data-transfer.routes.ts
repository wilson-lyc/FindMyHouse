import type { FastifyInstance } from 'fastify';
import { db } from '../../database/connection.js';
import { configService } from '../config/index.js';
import { HouseRepository } from '../houses/house.repository.js';
import { HouseService } from '../houses/house.service.js';
import { LocationRepository } from '../locations/location.repository.js';
import { LocationService } from '../locations/location.service.js';
import { RouteCacheRepository } from '../maps/route-cache.repository.js';
import { ScheduleRepository } from '../schedules/schedule.repository.js';
import { ScheduleService } from '../schedules/schedule.service.js';
import { exportDataQuerySchema, importDataSchema } from './data-transfer.schema.js';
import { DataTransferService } from './data-transfer.service.js';

const dataTransferService = new DataTransferService(
  new HouseService(new HouseRepository(db)),
  new LocationService(new LocationRepository(db), new RouteCacheRepository(db)),
  new ScheduleService(new ScheduleRepository(db)),
  configService
);

export async function registerDataTransferRoutes(app: FastifyInstance) {
  app.get('/api/data/export', async (request, reply) => {
    const { scope } = exportDataQuerySchema.parse(request.query);
    return reply.ok(dataTransferService.exportData(scope));
  });

  app.post('/api/data/import', async (request, reply) => {
    const input = importDataSchema.parse(request.body);
    return reply.ok({ imported: dataTransferService.importData(input) }, '数据导入完成');
  });
}
