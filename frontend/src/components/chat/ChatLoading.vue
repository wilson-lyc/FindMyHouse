<script setup lang="ts">
defineProps<{
  size?: 'small' | 'default';
}>();
</script>

<template>
  <span class="chat-loading" :class="`chat-loading--${size ?? 'default'}`">
    <span class="chat-loading-dot" />
    <span class="chat-loading-dot" />
    <span class="chat-loading-dot" />
  </span>
</template>

<style scoped>
.chat-loading {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.chat-loading-dot {
  border-radius: 50%;
  background: var(--el-text-color-secondary);
  animation: chat-bounce 1.4s ease-in-out infinite;
}

.chat-loading--default .chat-loading-dot {
  width: 6px;
  height: 6px;
}

.chat-loading--small .chat-loading-dot {
  width: 4px;
  height: 4px;
}

.chat-loading-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.chat-loading-dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes chat-bounce {
  0%, 80%, 100% {
    opacity: 0.3;
    transform: scale(0.8);
  }
  40% {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
