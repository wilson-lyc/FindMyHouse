import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import Fastify from 'fastify';
import { mkdirSync } from 'node:fs';
import { registerErrorHandler } from './error-handler.js';
import { registerHealthRoutes } from '../routes/health.routes.js';
import { registerConfigRoutes } from '../modules/config/config.routes.js';
import { registerHouseRoutes } from '../modules/houses/house.routes.js';
import { registerHouseImageRoutes } from '../modules/house-images/house-image.routes.js';
import { registerLocationRoutes } from '../modules/locations/location.routes.js';
import { registerMapRoutes } from '../modules/maps/map.routes.js';
import { registerAgentRoutes } from '../modules/agent/agent.routes.js';
import { registerDataTransferRoutes } from '../modules/data-transfer/data-transfer.routes.js';
import { registerScheduleRoutes } from '../modules/schedules/schedule.routes.js';
import { uploadsRoot, uploadsUrlPrefix } from '../modules/house-images/house-image.storage.js';

export async function createApp() {
  const app = Fastify({
    logger: true
  });

  await app.register(cors, {
    origin: true
  });

  await app.register(multipart, {
    limits: {
      files: 20,
      fileSize: 10 * 1024 * 1024
    }
  });

  mkdirSync(uploadsRoot, { recursive: true });
  await app.register(fastifyStatic, {
    root: uploadsRoot,
    prefix: `${uploadsUrlPrefix}/`
  });

  registerErrorHandler(app);

  await registerHealthRoutes(app);
  await registerConfigRoutes(app);
  await registerHouseRoutes(app);
  await registerHouseImageRoutes(app);
  await registerLocationRoutes(app);
  await registerMapRoutes(app);
  await registerAgentRoutes(app);
  await registerDataTransferRoutes(app);
  await registerScheduleRoutes(app);

  return app;
}
