import type { FastifyInstance } from 'fastify';
import { configService } from './index.js';
import { configDataSchema } from './config.schema.js';

export async function registerConfigRoutes(app: FastifyInstance) {
  app.get('/api/config', async () => {
    return {
      data: {
        openaiBaseUrl: configService.getOpenaiBaseUrl() ?? '',
        openaiApiKey: configService.getOpenaiApiKey() ?? '',
        openaiModel: configService.getOpenaiModel(),
        openaiTemperature: configService.getOpenaiTemperature(),
        amapWebServiceKey: configService.getAmapWebServiceKey() ?? '',
        viteAmapJsKey: configService.getViteAmapJsKey() ?? '',
        viteAmapSecurityJsCode: configService.getViteAmapSecurityJsCode() ?? '',
      },
    };
  });

  app.post('/api/config', async (request, reply) => {
    const input = configDataSchema.parse(request.body);
    configService.set('OPENAI_BASE_URL', input.openaiBaseUrl);
    configService.set('OPENAI_API_KEY', input.openaiApiKey);
    configService.set('OPENAI_MODEL', input.openaiModel);
    configService.set('OPENAI_TEMPERATURE', String(input.openaiTemperature));
    configService.set('AMAP_WEB_SERVICE_KEY', input.amapWebServiceKey);
    configService.set('VITE_AMAP_JS_KEY', input.viteAmapJsKey);
    configService.set('VITE_AMAP_SECURITY_JS_CODE', input.viteAmapSecurityJsCode);
    return reply.code(200).send({ data: { ok: true } });
  });
}
