<script setup lang="ts">
import { computed, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { Upload } from '@element-plus/icons-vue';
import { parseImportJson, useDataTransfer } from '../../composables/data-transfer/useDataTransfer';
import type { DataImportSummary } from '../../api/data-transfer/data-transfer-api';

withDefaults(
  defineProps<{
    title?: string;
    description?: string;
  }>(),
  {
    title: '导入数据',
    description: '选择导出的 JSON 文件，文件里有什么就提交什么。'
  }
);

const emit = defineEmits<{
  imported: [summary: DataImportSummary];
}>();

const fileInputRef = ref<HTMLInputElement | null>(null);
const selectedFileName = ref('');
const jsonText = ref('');
const parseError = ref('');
const parsedPayload = ref<Record<string, unknown> | null>(null);

const { importing, importSummary, submitImport } = useDataTransfer();

const summaryText = computed(() => (importSummary.value ? JSON.stringify(importSummary.value, null, 2) : ''));

function resetSelection() {
  selectedFileName.value = '';
  jsonText.value = '';
  parseError.value = '';
  parsedPayload.value = null;

  if (fileInputRef.value) {
    fileInputRef.value.value = '';
  }
}

function openFilePicker() {
  fileInputRef.value?.click();
}

async function onFileSelected(event: Event) {
  parseError.value = '';
  parsedPayload.value = null;

  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  selectedFileName.value = file.name;

  try {
    jsonText.value = await file.text();
    parsedPayload.value = parseImportJson(jsonText.value);
  } catch (error) {
    parseError.value = error instanceof Error ? error.message : '导入文件解析失败';
    ElMessage.error(parseError.value);
  }
}

async function importSelectedData() {
  if (!parsedPayload.value) {
    parseError.value = selectedFileName.value ? '请先修正 JSON 格式错误' : '请先选择 JSON 文件';
    ElMessage.warning(parseError.value);
    return;
  }

  const summary = await submitImport(parsedPayload.value);
  if (summary) {
    emit('imported', summary);
  }
}
</script>

<template>
  <section class="data-panel">
    <div class="data-panel-heading">
      <div>
        <h2>{{ title }}</h2>
        <p>{{ description }}</p>
      </div>
    </div>

    <input ref="fileInputRef" class="data-file-input" type="file" accept=".json,application/json" @change="onFileSelected" />

    <div class="data-import-row">
      <el-button :icon="Upload" @click="openFilePicker">选择 JSON 文件</el-button>
      <span v-if="selectedFileName" class="data-file-name">{{ selectedFileName }}</span>
      <span v-else class="data-file-empty">未选择文件</span>
    </div>

    <el-alert v-if="parseError" :title="parseError" type="error" :closable="false" show-icon />

    <el-alert
      v-else-if="parsedPayload"
      title="文件格式检查通过，导入时将原样提交 JSON 内容。"
      type="success"
      :closable="false"
      show-icon
    />

    <el-input
      v-if="summaryText"
      :model-value="summaryText"
      type="textarea"
      :autosize="{ minRows: 4, maxRows: 10 }"
      readonly
      aria-label="导入结果"
    />

    <footer class="data-panel-footer">
      <el-button :disabled="importing || !selectedFileName" @click="resetSelection">清除</el-button>
      <el-button type="primary" :loading="importing" :disabled="!parsedPayload" @click="importSelectedData">
        开始导入
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

.data-file-input {
  display: none;
}

.data-import-row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.data-file-name,
.data-file-empty {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--el-text-color-secondary);
}

.data-file-name {
  color: var(--app-text-primary);
  font-weight: 600;
}

.data-panel-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 720px) {
  .data-panel {
    padding: 16px;
  }

  .data-import-row {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
