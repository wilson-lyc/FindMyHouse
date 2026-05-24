import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app/create-app.js';
import { env } from './config/env.js';
import { migrate } from './database/migrations.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../.env') });

migrate();

const app = await createApp();

await app.listen({
  port: env.port,
  host: env.host
});
