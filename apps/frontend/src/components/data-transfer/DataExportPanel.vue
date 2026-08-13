<script setup lang="ts">
import { Download } from '@element-plus/icons-vue';
import { dataExportScopes, useDataTransfer } from '../../composables/data-transfer/useDataTransfer';

const emit = defineEmits<{
  exported: [];
}>();

const {
  selectedScopes,
  exporting,
  hasServiceConfigScope,
  hasSelectedScopes,
  selectAllScopes,
  clearScopes,
  submitExport
} = useDataTransfer();

async function exportSelectedData() {
  const exported = await submitExport();
  if (exported) emit('exported');
}
</script>

<template>
  <section class="data-panel">
    <div class="data-panel-heading">
      <div>
        <h2>导出数据</h2>
        <p>选择需要导出的数据范围，生成 JSON 备份文件。</p>
      </div>
      <div class="data-panel-actions">
        <el-button size="small" @click="selectAllScopes">全选</el-button>
        <el-button size="small" :disabled="!hasSelectedScopes" @click="clearScopes">清空</el-button>
      </div>
    </div>

    <el-checkbox-group v-model="selectedScopes" class="data-scope-list">
      <label v-for="scope in dataExportScopes" :key="scope.value" class="data-scope-option">
        <el-checkbox :label="scope.value">
          <span class="data-scope-label">{{ scope.label }}</span>
        </el-checkbox>
        <span class="data-scope-description">{{ scope.description }}</span>
      </label>
    </el-checkbox-group>

    <el-alert
      v-if="hasServiceConfigScope"
      title="服务配置包含密钥等隐私信息，导出前需要再次确认。"
      type="warning"
      :closable="false"
      show-icon
    />

    <footer class="data-panel-footer">
      <el-button type="primary" :icon="Download" :loading="exporting" :disabled="!hasSelectedScopes" @click="exportSelectedData">
        导出 JSON
      </el-button>
    </footer>
  </section>
</template>

<style scoped>
.data-panel {
  display: grid;
  gap: 18px;
  border: 1px solid var(--app-border-light);
  border-radius: 8px;
  background: var(--el-bg-color);
  padding: 20px;
}

.data-panel-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid var(--app-border-lighter);
  padding-bottom: 14px;
}

.data-panel-heading h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
}

.data-panel-heading p {
  margin: 6px 0 0;
  color: var(--el-text-color-secondary);
}

.data-panel-actions {
  display: flex;
  flex: none;
  gap: 8px;
}

.data-scope-list {
  display: grid;
  gap: 10px;
}

.data-scope-option {
  display: grid;
  gap: 4px;
  border: 1px solid var(--app-border-lighter);
  border-radius: 8px;
  padding: 12px 14px;
  cursor: pointer;
}

.data-scope-option:hover {
  border-color: var(--el-color-primary-light-5);
}

.data-scope-label {
  font-weight: 700;
}

.data-scope-description {
  padding-left: 24px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.data-panel-footer {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 720px) {
  .data-panel {
    padding: 16px;
  }

  .data-panel-heading {
    display: grid;
  }
}
</style>
