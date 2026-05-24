import { computed, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  exportData,
  importData,
  type DataExportScope,
  type DataImportPayload,
  type DataImportSummary
} from '../../api/data-transfer/data-transfer-api';

export type DataExportOption = 'data' | 'schedules' | 'serviceConfig';

export const dataExportScopes: Array<{ label: string; value: DataExportOption; description: string }> = [
  {
    label: '房源 + 地点数据',
    value: 'data',
    description: '导出房源、地点、坐标、备注等业务数据'
  },
  {
    label: '日程数据',
    value: 'schedules',
    description: '导出看房日程数据'
  },
  {
    label: '服务配置数据',
    value: 'serviceConfig',
    description: '导出模型服务和地图服务配置'
  }
];

export function getExportFileName(date = new Date()) {
  const day = date.toISOString().slice(0, 10);
  return `find-my-house-export-${day}.json`;
}

export function parseImportJson(content: string): DataImportPayload {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('JSON 格式错误，请检查文件内容');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('导入文件必须是 JSON 对象');
  }

  return parsed as DataImportPayload;
}

function downloadJsonFile(data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = getExportFileName();
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function useDataTransfer() {
  const selectedScopes = ref<DataExportOption[]>(['data', 'schedules', 'serviceConfig']);
  const exporting = ref(false);
  const importing = ref(false);
  const importSummary = ref<DataImportSummary | null>(null);

  const hasServiceConfigScope = computed(() => selectedScopes.value.includes('serviceConfig'));
  const hasSelectedScopes = computed(() => selectedScopes.value.length > 0);

  function selectAllScopes() {
    selectedScopes.value = dataExportScopes.map((scope) => scope.value);
  }

  function clearScopes() {
    selectedScopes.value = [];
  }

  function getExportScope(): DataExportScope {
    const hasData = selectedScopes.value.includes('data');
    const hasSchedules = selectedScopes.value.includes('schedules');
    const hasServiceConfig = selectedScopes.value.includes('serviceConfig');

    if (hasData && hasSchedules && hasServiceConfig) return 'all';
    if (hasServiceConfig) {
      if (hasData || hasSchedules) return 'all';
      return 'serviceConfig';
    }
    if (hasData && hasSchedules) return 'data';
    if (hasSchedules) return 'schedules';
    return 'data';
  }

  async function confirmServiceConfigExport() {
    if (!hasServiceConfigScope.value) return true;

    try {
      await ElMessageBox.confirm('服务配置数据是隐私数据，导出后会变成明文，注意保密', '确认导出服务配置', {
        type: 'warning',
        confirmButtonText: '确认导出',
        cancelButtonText: '取消'
      });
      return true;
    } catch {
      return false;
    }
  }

  async function submitExport() {
    if (!hasSelectedScopes.value) {
      ElMessage.warning('请选择要导出的数据范围');
      return false;
    }

    if (!(await confirmServiceConfigExport())) {
      return false;
    }

    exporting.value = true;
    try {
      const data = await exportData(getExportScope());
      downloadJsonFile(data);
      ElMessage.success('导出文件已生成');
      return true;
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '导出失败');
      return false;
    } finally {
      exporting.value = false;
    }
  }

  async function submitImport(payload: DataImportPayload) {
    importing.value = true;
    importSummary.value = null;

    try {
      const summary = await importData(payload);
      importSummary.value = summary;
      ElMessage.success('导入完成');
      return summary;
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '导入失败');
      return null;
    } finally {
      importing.value = false;
    }
  }

  return {
    selectedScopes,
    exporting,
    importing,
    importSummary,
    hasServiceConfigScope,
    hasSelectedScopes,
    selectAllScopes,
    clearScopes,
    submitExport,
    submitImport
  };
}
