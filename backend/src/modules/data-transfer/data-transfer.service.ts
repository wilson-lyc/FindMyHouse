import type { ConfigService } from '../config/index.js';
import type { House } from '../houses/domain/house.js';
import type { HouseService } from '../houses/house.service.js';
import type { Location } from '../locations/domain/location.js';
import type { LocationService } from '../locations/location.service.js';
import type { Schedule } from '../schedules/domain/schedule.js';
import type { ScheduleService } from '../schedules/schedule.service.js';
import type { ExportScope, ImportDataInput } from './data-transfer.schema.js';

interface ExportDataPayload {
  exportedAt: string;
  scope: ExportScope;
  houses?: House[];
  locations?: Location[];
  schedules?: Schedule[];
  serviceConfig?: Record<string, string>;
}

interface ImportDataResult {
  houses: number;
  locations: number;
  schedules: number;
  serviceConfig: number;
}

const configKeyMap: Record<string, string> = {
  openaiBaseUrl: 'OPENAI_BASE_URL',
  openaiApiKey: 'OPENAI_API_KEY',
  openaiModel: 'OPENAI_MODEL',
  openaiTemperature: 'OPENAI_TEMPERATURE',
  amapWebServiceKey: 'AMAP_WEB_SERVICE_KEY',
  viteAmapJsKey: 'VITE_AMAP_JS_KEY',
  viteAmapSecurityJsCode: 'VITE_AMAP_SECURITY_JS_CODE'
};

export class DataTransferService {
  constructor(
    private readonly houseService: HouseService,
    private readonly locationService: LocationService,
    private readonly scheduleService: ScheduleService,
    private readonly configService: ConfigService
  ) {}

  exportData(scope: ExportScope): ExportDataPayload {
    const payload: ExportDataPayload = {
      exportedAt: new Date().toISOString(),
      scope
    };

    if (scope === 'all' || scope === 'data' || scope === 'houses') {
      payload.houses = this.houseService.listHouses({});
    }

    if (scope === 'all' || scope === 'data' || scope === 'locations') {
      payload.locations = this.locationService.listLocations({});
    }

    if (scope === 'all' || scope === 'data' || scope === 'schedules') {
      payload.schedules = this.scheduleService.listSchedules({});
    }

    if (scope === 'all' || scope === 'config' || scope === 'serviceConfig') {
      payload.serviceConfig = this.configService.getAll();
    }

    return payload;
  }

  importData(input: ImportDataInput): ImportDataResult {
    const result: ImportDataResult = {
      houses: 0,
      locations: 0,
      schedules: 0,
      serviceConfig: 0
    };

    if (input.houses) {
      result.houses = this.houseService.importHouses(input.houses);
    }

    if (input.locations) {
      result.locations = this.locationService.importLocations(input.locations);
    }

    if (input.schedules) {
      result.schedules = this.scheduleService.importSchedules(input.schedules);
    }

    const serviceConfig = this.normalizeServiceConfig(input.config, input.serviceConfig);
    if (Object.keys(serviceConfig).length) {
      result.serviceConfig = this.configService.setMany(serviceConfig);
    }

    return result;
  }

  private normalizeServiceConfig(
    config?: ImportDataInput['config'],
    serviceConfig?: ImportDataInput['serviceConfig']
  ): Record<string, string> {
    const normalized: Record<string, string> = {};

    for (const source of [config, serviceConfig]) {
      if (!source) continue;

      for (const [key, value] of Object.entries(source)) {
        normalized[configKeyMap[key] ?? key] = String(value);
      }
    }

    return normalized;
  }
}
