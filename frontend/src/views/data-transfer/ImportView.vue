<script setup lang="ts">
import { useRouter } from 'vue-router';
import { ArrowLeft } from '@element-plus/icons-vue';
import DataImportPanel from '../../components/data-transfer/DataImportPanel.vue';

const router = useRouter();
</script>

<template>
  <el-container class="data-page" direction="vertical">
    <el-header class="data-header">
      <div class="data-title-row">
        <el-tooltip content="返回地图" placement="bottom">
          <el-button class="data-back-button" :icon="ArrowLeft" text aria-label="返回地图" @click="router.push('/')" />
        </el-tooltip>
        <h1>导入数据</h1>
      </div>
    </el-header>

    <el-main class="data-main">
      <el-scrollbar class="data-scrollbar">
        <section class="data-content">
          <DataImportPanel />
        </section>
      </el-scrollbar>
    </el-main>
  </el-container>
</template>

<style scoped>
.data-page {
  height: 100dvh;
  min-height: 0;
  overflow: hidden;
  background: var(--app-bg-page);
  color: var(--app-text-primary);
}

.data-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  height: auto;
  padding: 12px 24px;
  border-bottom: 1px solid var(--app-border-light);
  background: var(--el-bg-color);
}

.data-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.data-back-button {
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--app-text-primary);
  font-size: 16px;
}

.data-back-button:hover,
.data-back-button:focus {
  background: transparent;
  color: var(--el-color-primary);
}

.data-header h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}

.data-main {
  min-height: 0;
  padding: 0;
  overflow: hidden;
}

.data-scrollbar {
  height: 100%;
}

.data-content {
  display: grid;
  width: min(100%, 980px);
  margin: 0 auto;
  padding: 24px;
  gap: 16px;
}

.data-back-button :deep(.el-icon) {
  font-size: 16px;
}

@media (max-width: 720px) {
  .data-header {
    padding: 10px 16px;
  }

  .data-content {
    padding: 14px;
  }
}
</style>
