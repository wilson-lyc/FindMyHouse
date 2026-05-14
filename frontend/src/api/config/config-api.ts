import { getData, postData } from '../http';

export interface ConfigData {
  openaiBaseUrl: string;
  openaiApiKey: string;
  amapWebServiceKey: string;
  viteAmapJsKey: string;
  viteAmapSecurityJsCode: string;
}

export function fetchConfig() {
  return getData<ConfigData>('/api/config');
}

export function saveConfig(data: ConfigData) {
  return postData<{ ok: boolean }, ConfigData>('/api/config', data);
}
