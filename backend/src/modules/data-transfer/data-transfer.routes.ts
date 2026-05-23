import type { FastifyInstance } from 'fastify';
import { db } from '../../database/connection.js';
import { configService } from '../config/index.js';
import { HouseRepository } from '../houses/house.repository.js';
import { HouseService } from '../houses/house.service.js';
import { LocationRepository } from '../locations/location.repository.js';
import { LocationService } from '../locations/location.service.js';
import { RouteCacheRepository } from '../maps/route-cache.repository.js';
import { exportDataQuerySchema, importDataSchema } from './data-transfer.schema.js';
import { DataTransferService } from './data-transfer.service.js';

const dataTransferService = new DataTransferService(
  new HouseService(new HouseRepository(db)),
  new LocationService(new LocationRepository(db), new RouteCacheRepository(db)),
  configService
);

export async function registerDataTransferRoutes(app: FastifyInstance) {
  app.get('/api/data/export', async (request) => {
    const { scope } = exportDataQuerySchema.parse(request.query);
    return { data: dataTransferService.exportData(scope) };
  });

  app.post('/api/data/import', async (request) => {
    const input = importDataSchema.parse(request.body);
    return { data: { imported: dataTransferService.importData(input) } };
  });
}
