import { loadEnvFiles } from './load-env.js';

loadEnvFiles();

export const env = {
  port: Number(process.env.PORT ?? 3001),
  host: process.env.HOST ?? '0.0.0.0',
  databaseUrl: process.env.DATABASE_URL,
  amapWebServiceKey: process.env.AMAP_WEB_SERVICE_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiBaseUrl: process.env.OPENAI_BASE_URL,
  openaiModel: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
  openaiTemperature: Number(process.env.OPENAI_TEMPERATURE ?? 0),
};
