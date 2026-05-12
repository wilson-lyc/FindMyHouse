import { loadEnvFiles } from './load-env.js';

loadEnvFiles();

export const env = {
  port: Number(process.env.PORT ?? 3001),
  host: process.env.HOST ?? '0.0.0.0',
  databaseUrl: process.env.DATABASE_URL,
  amapWebServiceKey: process.env.AMAP_WEB_SERVICE_KEY
};
