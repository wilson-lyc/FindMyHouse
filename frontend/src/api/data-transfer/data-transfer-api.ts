import { getData, postData } from '../http';

export type DataExportScope = 'all' | 'data' | 'schedules' | 'serviceConfig';

export type DataImportPayload = Record<string, unknown>;

export interface DataImportSummary {
  imported: {
    houses: number;
    locations: number;
    schedules: number;
    serviceConfig: number;
  };
}

export function exportData(scope: DataExportScope) {
  return getData<unknown>(`/api/data/export?scope=${encodeURIComponent(scope)}`);
}

export function importData(payload: DataImportPayload) {
  return postData<DataImportSummary, DataImportPayload>('/api/data/import', payload);
}
