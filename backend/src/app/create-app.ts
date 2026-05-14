import cors from '@fastify/cors';
import Fastify from 'fastify';
import { registerErrorHandler } from './error-handler.js';
import { registerHealthRoutes } from '../routes/health.routes.js';
import { registerConfigRoutes } from '../modules/config/config.routes.js';
import { registerHouseRoutes } from '../modules/houses/house.routes.js';
import { registerLocationRoutes } from '../modules/locations/location.routes.js';
import { registerMapRoutes } from '../modules/maps/map.routes.js';
import { registerAgentRoutes } from '../modules/agent/agent.routes.js';

export async function createApp() {
  const app = Fastify({
    logger: true
  });

  await app.register(cors, {
    origin: true
  });

  registerErrorHandler(app);

  await registerHealthRoutes(app);
  await registerConfigRoutes(app);
  await registerHouseRoutes(app);
  await registerLocationRoutes(app);
  await registerMapRoutes(app);
  await registerAgentRoutes(app);

  return app;
}
