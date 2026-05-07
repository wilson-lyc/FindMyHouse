import cors from '@fastify/cors';
import Fastify from 'fastify';
import { registerErrorHandler } from './error-handler.js';
import { registerHealthRoutes } from '../routes/health.routes.js';
import { registerListingRoutes } from '../modules/listings/listing.routes.js';
import { registerLocationRoutes } from '../modules/locations/location.routes.js';
import { registerMapRoutes } from '../modules/maps/map.routes.js';

export async function createApp() {
  const app = Fastify({
    logger: true
  });

  await app.register(cors, {
    origin: true
  });

  registerErrorHandler(app);

  await registerHealthRoutes(app);
  await registerListingRoutes(app);
  await registerLocationRoutes(app);
  await registerMapRoutes(app);

  return app;
}
