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

async function waitForImages(element: HTMLElement) {
  const images = Array.from(element.querySelectorAll('img')) as HTMLImageElement[];
  if (images.length === 0) return;

  await Promise.race([
    Promise.all(
      images.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise<void>((resolve) => {
          const done = () => resolve();
          img.addEventListener('load', done, { once: true });
          img.addEventListener('error', done, { once: true });
        });
      })
    ),
    new Promise<void>((resolve) => setTimeout(resolve, 1500))
  ]);
}

async function waitForStableHeight(element: HTMLElement) {
  let last = element.scrollHeight;
  for (let i = 0; i < 10; i += 1) {
    await new Promise(requestAnimationFrame);
    const current = element.scrollHeight;
    if (current === last) {
      await new Promise(requestAnimationFrame);
      if (element.scrollHeight === current) return;
    }
    last = current;
  }
}

async function renderToPng(): Promise<string> {
  const card = captureCardRef.value;
  if (!card) {
    throw new Error('没有可分享的对话内容');
  }

  const originalHeight = card.style.height;
  card.style.height = 'auto';

  await nextTick();
  await nextTick();
  await new Promise(requestAnimationFrame);
  await new Promise(requestAnimationFrame);

  await document.fonts?.ready;
  await waitForImages(card);
  await waitForStableHeight(card);

  const imageWidth = Math.max(360, card.offsetWidth);
  const imageHeight = Math.ceil(Math.max(card.scrollHeight, card.offsetHeight));
  card.style.height = `${imageHeight}px`;

  try {
    return await renderElementToPng(card, imageWidth, imageHeight);
  } finally {
    card.style.height = originalHeight;
  }
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
