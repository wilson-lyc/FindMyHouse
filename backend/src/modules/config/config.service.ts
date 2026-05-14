import type Database from 'better-sqlite3';
import { ConfigRepository } from './config.repository.js';

export class ConfigService {
  private readonly repo: ConfigRepository;

  constructor(db: Database.Database) {
    this.repo = new ConfigRepository(db);
  }

  getOpenaiApiKey(): string | undefined {
    return this.repo.get('OPENAI_API_KEY');
  }

  getOpenaiBaseUrl(): string | undefined {
    return this.repo.get('OPENAI_BASE_URL');
  }

  getOpenaiModel(): string {
    return this.repo.get('OPENAI_MODEL') ?? 'deepseek-v4-flash';
  }

  getOpenaiTemperature(): number {
    const val = this.repo.get('OPENAI_TEMPERATURE');
    return val ? Number(val) : 0;
  }

  getAmapWebServiceKey(): string | undefined {
    return this.repo.get('AMAP_WEB_SERVICE_KEY');
  }

  getViteAmapJsKey(): string | undefined {
    return this.repo.get('VITE_AMAP_JS_KEY');
  }

  getViteAmapSecurityJsCode(): string | undefined {
    return this.repo.get('VITE_AMAP_SECURITY_JS_CODE');
  }

  getAll(): Record<string, string> {
    return this.repo.getAll();
  }

  get(key: string): string | undefined {
    return this.repo.get(key);
  }

  set(key: string, value: string): void {
    this.repo.set(key, value);
  }
}
