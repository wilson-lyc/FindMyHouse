<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { CopyDocument, Download } from '@element-plus/icons-vue';
import ChatMessageItem from './ChatMessageItem.vue';
import { renderElementToPng } from '../../composables/chat/useChatShare';
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

const shareCaptureCardRef = ref<HTMLDivElement | null>(null);
const shareCaptureMessagesRef = ref<HTMLDivElement | null>(null);

watch(
  () => props.generating,
  async (generating) => {
    if (!generating || props.messages.length === 0) return;
    await generateImage();
  }
);

async function generateImage() {
  emit('update:imageUrl', '');

  try {
    await nextTick();
    const url = await createConversationShareImage();
    emit('update:imageUrl', url);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '生成分享图失败');
    emit('update:visible', false);
  } finally {
    emit('update:generating', false);
  }
}

async function createConversationShareImage() {
  await nextTick();

  const card = shareCaptureCardRef.value;
  const source = shareCaptureMessagesRef.value;

  if (!card) {
    throw new Error('没有可分享的对话内容');
  }

  if (!source) {
    throw new Error('没有可分享的对话内容');
  }

  await new Promise(requestAnimationFrame);
  await new Promise(requestAnimationFrame);
  const imageWidth = Math.max(360, card.offsetWidth);
  const cardRect = card.getBoundingClientRect();
  const footer = card.querySelector<HTMLElement>('.chat-share-capture-footer');
  const footerRect = footer?.getBoundingClientRect();
  const footerHeight = footer ? Math.max(footer.offsetHeight, footer.scrollHeight) : 0;
  const imageHeight = Math.ceil(Math.max(
    card.scrollHeight,
    card.offsetHeight,
    footerRect ? footerRect.bottom - cardRect.top : 0
  ) + footerHeight - 10);
  card.style.height = `${imageHeight}px`;

  return renderElementToPng(card, imageWidth, imageHeight);
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
      <div v-if="messages.length > 0" ref="shareCaptureCardRef" class="chat-share-capture-card">
        <div class="chat-share-capture-header">
          <div class="chat-share-capture-title-group">
            <div class="chat-share-capture-title">FindMyHouse</div>
            <div class="chat-share-capture-slogan">您贴心的租房智能专家</div>
          </div>
          <el-tag type="primary">对话分享</el-tag>
        </div>
        <div ref="shareCaptureMessagesRef" class="chat-messages">
          <ChatMessageItem
            v-for="(msg, index) in messages"
            :key="index"
            :message="msg"
            :loading="loading"
            :custom-choice-inputs="customChoiceInputs"
            disabled
          />
        </div>
        <div class="chat-share-capture-footer">
          <div class="chat-share-capture-footer-brand">FindMyHouse</div>
          <div class="chat-share-capture-footer-slogan">您贴心的租房智能专家</div>
        </div>
      </div>
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

.chat-share-capture-card {
  width: 760px;
  overflow: visible;
  border-radius: 18px;
  background: var(--el-bg-color);
  color: var(--app-text-primary);
}

.chat-share-capture-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 28px 34px 18px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
}

.chat-share-capture-title-group {
  min-width: 0;
}

.chat-share-capture-title {
  color: var(--app-text-primary);
  font-size: 28px;
  font-weight: 800;
  line-height: 1.2;
}

.chat-share-capture-slogan {
  margin-top: 6px;
  color: var(--el-text-color-secondary);
  font-size: 16px;
  line-height: 1.4;
}

.chat-share-capture-header .el-tag {
  flex: 0 0 auto;
  font-weight: 700;
}

.chat-share-capture-card .chat-messages {
  width: 760px;
  height: auto;
  min-height: auto;
  overflow: visible;
}

.chat-share-capture-footer {
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

.chat-share-capture-footer-brand {
  color: #606266;
  font-size: 18px;
  font-weight: 800;
  line-height: 1.3;
}

.chat-share-capture-footer-slogan {
  min-width: 0;
  color: #909399;
  font-size: 15px;
  line-height: 1.4;
  text-align: right;
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
