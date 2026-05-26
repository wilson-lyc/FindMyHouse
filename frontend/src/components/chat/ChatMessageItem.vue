<script setup lang="ts">
import MarkdownIt from 'markdown-it';
import ChatHouseCard from './ChatHouseCard.vue';
import ChatChoicePrompt from './ChatChoicePrompt.vue';
import ChatLoading from './ChatLoading.vue';
import type { House } from '../../model/house/house';
import type { ChatMessage } from '../../model/chat/chat-message';

const props = defineProps<{
  message: ChatMessage;
  loading: boolean;
  customChoiceInputs: Record<string, string>;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  selectHouse: [house: House];
  openHouseCompare: [houses: House[]];
  submitChoiceAnswer: [value: string];
  submitCustomChoiceAnswer: [];
  customChoiceInputUpdate: [promptId: string, value: string];
}>();

const markdown = new MarkdownIt({
  breaks: true,
  html: false,
  linkify: true,
  typographer: true,
});
markdown.renderer.rules.table_open = () => '<div class="chat-table-scroll"><table>';
markdown.renderer.rules.table_close = () => '</table></div>';

function renderAssistantContent(content: string) {
  return markdown.render(content);
}

function getVisibleAssistantContent(message: ChatMessage) {
  if (!message.choicePrompt) return message.content;

  const content = normalizeChoiceText(message.content);
  const question = normalizeChoiceText(message.choicePrompt.question);
  const title = normalizeChoiceText(message.choicePrompt.title);

  if (content && (content === question || content === title)) {
    return '';
  }

  return message.content;
}

function normalizeChoiceText(value: string) {
  return value.trim().replace(/\s+/g, '');
}

function handleCustomInputUpdate(promptId: string, value: string) {
  emit('customChoiceInputUpdate', promptId, value);
}
</script>

<template>
  <div class="chat-message-wrapper" :class="message.role">
    <div class="chat-bubble">
      <div v-if="message.role === 'assistant'">
        <div
          v-if="getVisibleAssistantContent(message)"
          class="chat-bubble-markdown markdown-body"
          v-html="renderAssistantContent(getVisibleAssistantContent(message))"
        />
        <ChatChoicePrompt
          v-if="message.choicePrompt"
          :prompt="message.choicePrompt"
          :loading="loading"
          :disabled="disabled"
          :custom-input-value="customChoiceInputs[message.choicePrompt.id] ?? ''"
          @select="(value: string) => emit('submitChoiceAnswer', value)"
          @submit-custom="emit('submitCustomChoiceAnswer')"
          @update:custom-input-value="(value: string) => handleCustomInputUpdate(message.choicePrompt!.id, value)"
        />
        <div v-if="!message.content && !message.choicePrompt" class="chat-inline-loading">
          <ChatLoading />
        </div>
      </div>
      <div v-else class="chat-bubble-text">{{ message.content }}</div>
      <div v-if="message.houses && message.houses.length > 0" class="chat-house-results">
        <div class="chat-house-results-header">
          {{ message.housesTitle ?? `找到 ${message.houses.length} 套房源` }}
        </div>
        <ChatHouseCard
          v-for="house in message.houses"
          :key="house.id"
          :house="house"
          :disabled="disabled"
          @select="(h: House) => emit('selectHouse', h)"
        />
      </div>
      <div v-if="message.compareHouses && message.compareHouses.length > 1" class="chat-compare-actions">
        <el-button
          type="primary"
          plain
          :disabled="disabled"
          @click="emit('openHouseCompare', message.compareHouses!)"
        >
          打开对比表
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-message-wrapper {
  display: flex;
  min-width: 0;
}

.chat-message-wrapper.user {
  align-self: flex-end;
  justify-content: flex-end;
  max-width: min(520px, calc(100% - 40px));
}

.chat-message-wrapper.assistant {
  align-self: flex-start;
  justify-content: flex-start;
  max-width: min(520px, calc(100% - 40px));
}

.chat-bubble {
  max-width: 100%;
  min-width: 0;
  padding: 10px 13px;
  border-radius: 14px;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.chat-bubble-text {
  white-space: pre-wrap;
}

.chat-message-wrapper.user .chat-bubble {
  background: var(--el-color-primary);
  color: var(--el-bg-color);
  border-bottom-right-radius: 5px;
}

.chat-message-wrapper.assistant .chat-bubble {
  background: #eeeef0;
  border-bottom-left-radius: 5px;
  color: var(--app-text-primary);
}

.chat-bubble-markdown {
  max-width: 100%;
  min-width: 0;
  background: transparent;
  font-size: 14px;
  line-height: 1.55;
  white-space: normal;
}

.chat-bubble-markdown :deep(hr) {
  height: 1px;
  margin: 16px 0;
  background-color: var(--el-border-color-light);
}

.chat-bubble-markdown :deep(.chat-table-scroll) {
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  margin: 8px 0;
  -webkit-overflow-scrolling: touch;
}

.chat-bubble-markdown :deep(table) {
  width: max-content;
  min-width: 100%;
  white-space: nowrap;
}

.chat-inline-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 42px;
  min-height: 22px;
}

.chat-house-results {
  margin-top: 8px;
  border-top: 1px solid var(--el-border-color-light);
  padding-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.chat-house-results-header {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-color-primary);
}

.chat-compare-actions {
  margin-top: 10px;
  border-top: 1px solid var(--el-border-color-light);
  padding-top: 10px;
}

.chat-compare-actions .el-button {
  margin-left: 0;
}
</style>
