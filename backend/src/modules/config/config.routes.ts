import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FastifyInstance } from 'fastify';
import { configDataSchema } from './config.schema.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envFilePath = resolve(__dirname, '../../../../.env');

const CONFIG_KEYS = [
  'OPENAI_BASE_URL',
  'OPENAI_API_KEY',
  'AMAP_WEB_SERVICE_KEY',
  'VITE_AMAP_JS_KEY',
  'VITE_AMAP_SECURITY_JS_CODE',
] as const;

function parseEnvFile(): Record<string, string> {
  const config: Record<string, string> = {};
  if (!existsSync(envFilePath)) {
    return config;
  }

  const content = readFileSync(envFilePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const separatorIndex = trimmed.indexOf('=');
    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (CONFIG_KEYS.includes(key as typeof CONFIG_KEYS[number])) {
      config[key] = value;
    }
  }
  return config;
}

function writeEnvFile(updates: Record<string, string>): void {
  let lines: string[] = [];
  const updatedKeys = new Set(Object.keys(updates));

  if (existsSync(envFilePath)) {
    const content = readFileSync(envFilePath, 'utf8');
    const result: string[] = [];
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
        result.push(line);
        continue;
      }
      const separatorIndex = trimmed.indexOf('=');
      const key = trimmed.slice(0, separatorIndex).trim();
      if (CONFIG_KEYS.includes(key as typeof CONFIG_KEYS[number])) {
        const newValue = updates[key];
        if (newValue !== undefined) {
          result.push(`${key}=${newValue}`);
          updatedKeys.delete(key);
        }
      } else {
        result.push(line);
      }
    }
    lines = result;
  }

  for (const key of updatedKeys) {
    const value = updates[key];
    if (value !== undefined) {
      lines.push(`${key}=${value}`);
    }
  }

  writeFileSync(envFilePath, lines.join('\n') + '\n', 'utf8');
}

export async function registerConfigRoutes(app: FastifyInstance) {
  app.get('/api/config', async () => {
    const env = parseEnvFile();
    return {
      data: {
        openaiBaseUrl: env.OPENAI_BASE_URL ?? '',
        openaiApiKey: env.OPENAI_API_KEY ?? '',
        amapWebServiceKey: env.AMAP_WEB_SERVICE_KEY ?? '',
        viteAmapJsKey: env.VITE_AMAP_JS_KEY ?? '',
        viteAmapSecurityJsCode: env.VITE_AMAP_SECURITY_JS_CODE ?? '',
      },
    };
  });

  app.post('/api/config', async (request, reply) => {
    const input = configDataSchema.parse(request.body);
    writeEnvFile({
      OPENAI_BASE_URL: input.openaiBaseUrl,
      OPENAI_API_KEY: input.openaiApiKey,
      AMAP_WEB_SERVICE_KEY: input.amapWebServiceKey,
      VITE_AMAP_JS_KEY: input.viteAmapJsKey,
      VITE_AMAP_SECURITY_JS_CODE: input.viteAmapSecurityJsCode,
    });
    return reply.code(200).send({ data: { ok: true } });
  });
}
