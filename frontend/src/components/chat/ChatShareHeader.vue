<script setup lang="ts">
</script>

<template>
  <div class="chat-share-header">
    <div class="chat-share-header-group">
      <div class="chat-share-header-brand">FindMyHouse</div>
      <div class="chat-share-header-slogan">您贴心的租房智能专家</div>
    </div>
    <el-tag type="primary">对话分享</el-tag>
  </div>
</template>

<style scoped>
.chat-share-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 28px 34px 18px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
}

.chat-share-header-group {
  min-width: 0;
}

.chat-share-header-brand {
  color: var(--app-text-primary);
  font-size: 28px;
  font-weight: 800;
  line-height: 1.2;
}

.chat-share-header-slogan {
  margin-top: 6px;
  color: var(--el-text-color-secondary);
  font-size: 16px;
  line-height: 1.4;
}

.chat-share-header :deep(.el-tag) {
  flex: 0 0 auto;
  font-weight: 700;
}
</style>
