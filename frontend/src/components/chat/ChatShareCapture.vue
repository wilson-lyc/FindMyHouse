<script setup lang="ts">
import { nextTick, ref } from 'vue';
import ChatMessageItem from './ChatMessageItem.vue';
import ChatShareHeader from './ChatShareHeader.vue';
import ChatShareFooter from './ChatShareFooter.vue';
import { renderElementToPng } from '../../composables/chat/useChatShare';
import type { ChatMessage } from '../../model/chat/chat-message';

defineProps<{
  messages: ChatMessage[];
  customChoiceInputs: Record<string, string>;
  loading: boolean;
}>();

const captureCardRef = ref<HTMLDivElement | null>(null);

async function renderToPng(): Promise<string> {
  const card = captureCardRef.value;
  if (!card) {
    throw new Error('没有可分享的对话内容');
  }

  await new Promise(requestAnimationFrame);
  await new Promise(requestAnimationFrame);

  const imageWidth = Math.max(360, card.offsetWidth);
  const imageHeight = Math.ceil(Math.max(
    card.scrollHeight,
    card.offsetHeight
  ));
  card.style.height = `${imageHeight}px`;

  return renderElementToPng(card, imageWidth, imageHeight);
}

defineExpose({ renderToPng });
</script>

<template>
  <div ref="captureCardRef" class="chat-share-capture-card">
    <ChatShareHeader />
    <div class="chat-share-capture-messages">
      <ChatMessageItem
        v-for="(msg, index) in messages"
        :key="index"
        :message="msg"
        :loading="loading"
        :custom-choice-inputs="customChoiceInputs"
        disabled
      />
    </div>
    <ChatShareFooter />
  </div>
</template>

<style scoped>
.chat-share-capture-card {
  width: 760px;
  overflow: visible;
  border-radius: 18px;
  background: var(--el-bg-color);
  color: var(--app-text-primary);
}

.chat-share-capture-messages {
  width: 760px;
  height: auto;
  min-height: auto;
  overflow: visible;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  box-sizing: border-box;
}
</style>
