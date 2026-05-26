<script setup lang="ts">
import { ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { CopyDocument, Download } from '@element-plus/icons-vue';
import ChatShareCapture from './ChatShareCapture.vue';
import type { ChatMessage } from '../../model/chat/chat-message';

const props = defineProps<{
  visible: boolean;
  imageUrl: string;
  generating: boolean;
  messages: ChatMessage[];
  customChoiceInputs: Record<string, string>;
  loading: boolean;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  'update:imageUrl': [value: string];
  'update:generating': [value: boolean];
  copyImage: [];
  downloadImage: [];
}>();

const captureRef = ref<InstanceType<typeof ChatShareCapture> | null>(null);

watch(
  () => props.generating,
  async (generating) => {
    if (!generating || props.messages.length === 0) return;
    await triggerCapture();
  },
  { flush: 'post' }
);

async function triggerCapture() {
  emit('update:imageUrl', '');

  try {
    const capture = captureRef.value;
    if (!capture) {
      throw new Error('没有可分享的对话内容');
    }

    const url = await capture.renderToPng();
    emit('update:imageUrl', url);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '生成分享图失败');
    emit('update:visible', false);
  } finally {
    emit('update:generating', false);
  }
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    title="分享对话"
    width="760px"
    class="chat-share-dialog"
    align-center
    @update:model-value="(v: boolean) => emit('update:visible', v)"
  >
    <div v-loading="generating" class="chat-share-preview">
      <div v-if="generating && !imageUrl" class="chat-share-generating">
        正在生成分享图...
      </div>
      <img v-if="imageUrl" :src="imageUrl" alt="对话分享图">
    </div>

    <div class="chat-share-capture-host" aria-hidden="true">
      <ChatShareCapture
        v-if="messages.length > 0"
        ref="captureRef"
        :messages="messages"
        :custom-choice-inputs="customChoiceInputs"
        :loading="loading"
      />
    </div>

    <template #footer>
      <el-button
        :icon="CopyDocument"
        :disabled="generating || !imageUrl"
        @click="emit('copyImage')"
      >
        复制图片
      </el-button>
      <el-button
        type="primary"
        :icon="Download"
        :disabled="generating || !imageUrl"
        @click="emit('downloadImage')"
      >
        下载图片
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.chat-share-preview {
  display: flex;
  max-height: min(68vh, 780px);
  align-items: flex-start;
  justify-content: center;
  overflow: auto;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--app-bg-soft);
  padding: 12px;
}

.chat-share-preview img {
  display: block;
  width: min(100%, 420px);
  height: auto;
  border-radius: 8px;
  box-shadow: 0 8px 24px var(--app-shadow-color);
}

.chat-share-generating {
  display: flex;
  min-height: 240px;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-secondary);
  font-size: 14px;
  line-height: 1.5;
}

.chat-share-capture-host {
  position: fixed;
  left: -10000px;
  top: 0;
  width: 760px;
  pointer-events: none;
}

:deep(.chat-share-dialog .el-dialog__footer) {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

:deep(.chat-share-dialog .el-dialog__footer .el-button) {
  margin-left: 0;
}
</style>
