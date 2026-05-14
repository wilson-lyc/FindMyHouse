import { z } from 'zod';

export const configDataSchema = z.object({
  openaiBaseUrl: z.string().trim().min(1, 'LLM Base URL 不能为空'),
  openaiApiKey: z.string().trim().min(1, 'LLM API Key 不能为空'),
  openaiModel: z.string().trim().min(1, '模型名称不能为空'),
  openaiTemperature: z.number().min(0).max(2),
  amapWebServiceKey: z.string().trim().min(1, '高德 Web Service Key 不能为空'),
  viteAmapJsKey: z.string().trim().min(1, '高德 JS API Key 不能为空'),
  viteAmapSecurityJsCode: z.string().trim().min(1, '高德 Security JS Code 不能为空'),
});

export type ConfigData = z.infer<typeof configDataSchema>;
