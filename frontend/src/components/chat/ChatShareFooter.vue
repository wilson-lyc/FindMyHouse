<script setup lang="ts">
</script>

<template>
  <div class="chat-share-footer">
    <div class="chat-share-footer-brand">FindMyHouse</div>
    <div class="chat-share-footer-slogan">您贴心的租房智能专家</div>
  </div>
</template>

<style scoped>
.chat-share-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  min-height: 70px;
  padding: 18px 34px 28px;
  border-top: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
  box-sizing: border-box;
}

.chat-share-footer-brand {
  color: #606266;
  font-size: 18px;
  font-weight: 800;
  line-height: 1.3;
}

.chat-share-footer-slogan {
  min-width: 0;
  color: #909399;
  font-size: 15px;
  line-height: 1.4;
  text-align: right;
}
</style>
