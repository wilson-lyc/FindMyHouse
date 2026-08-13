import { z } from 'zod';

/** 配置数据(请求 / 响应 DTO)。 */
export const configDataSchema = z.object({
  openaiBaseUrl: z.string().trim().min(1),
  openaiApiKey: z.string().trim().min(1),
  openaiModel: z.string().trim().min(1),
  openaiTemperature: z.number(),
  amapWebServiceKey: z.string().trim().min(1),
  viteAmapJsKey: z.string().trim().min(1),
  viteAmapSecurityJsCode: z.string().trim().min(1)
});
export type ConfigData = z.infer<typeof configDataSchema>;

/** 导入配置请求(请求 DTO)。 */
export const importServiceConfigSchema = z.record(z.string(), z.string());
export type ImportServiceConfigInput = z.infer<typeof importServiceConfigSchema>;
