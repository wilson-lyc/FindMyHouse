<script setup lang="ts">
import { computed, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { UploadFilled } from '@element-plus/icons-vue';
import { parseImportJson, useDataTransfer } from '../../composables/data-transfer/useDataTransfer';
import type { DataImportSummary } from '../../api/data-transfer/data-transfer-api';
import type { UploadFile } from 'element-plus';

withDefaults(
  defineProps<{
    title?: string;
    description?: string;
  }>(),
  {
    title: '导入数据'
  }
);

const emit = defineEmits<{
  imported: [summary: DataImportSummary];
}>();

const selectedFileName = ref('');
const parseError = ref('');
const parsedPayload = ref<Record<string, unknown> | null>(null);

const { importing, importSummary, submitImport } = useDataTransfer();

const summaryText = computed(() => (importSummary.value ? JSON.stringify(importSummary.value, null, 2) : ''));

function resetSelection() {
  selectedFileName.value = '';
  parseError.value = '';
  parsedPayload.value = null;
}

async function handleFileChange(uploadFile: UploadFile) {
  parseError.value = '';
  parsedPayload.value = null;

  const file = uploadFile.raw;
  if (!file) return;

  selectedFileName.value = file.name;

  try {
    const text = await file.text();
    parsedPayload.value = parseImportJson(text);
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
        <p v-if="description">{{ description }}</p>
      </div>
    </div>

    <el-upload
      drag
      :auto-upload="false"
      :show-file-list="false"
      accept=".json,application/json"
      :on-change="handleFileChange"
    >
      <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
      <div class="el-upload__text">
        将 JSON 文件拖拽到此处，或 <em>点击选择</em>
      </div>
      <template #tip>
        <div v-if="selectedFileName" class="el-upload__tip">
          <span class="data-file-name">{{ selectedFileName }}</span>
        </div>
      </template>
    </el-upload>

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
        导入
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

.data-file-name {
  color: var(--app-text-primary);
  font-weight: 600;
}

.data-panel-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.data-panel-footer :deep(.el-button + .el-button) {
  margin-left: 0;
}

@media (max-width: 720px) {
  .data-panel {
    padding: 16px;
  }
}
</style>
