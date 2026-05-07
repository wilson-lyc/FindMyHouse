import { createApp } from './app/create-app.js';
import { env } from './config/env.js';
import { migrate } from './database/migrations.js';

migrate();

const app = await createApp();

await app.listen({
  port: env.port,
  host: env.host
});
