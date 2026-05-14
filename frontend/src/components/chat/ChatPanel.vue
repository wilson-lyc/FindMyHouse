<script setup lang="ts">
import { computed, ref } from 'vue';
import { ElMessage } from 'element-plus';
import MarkdownIt from 'markdown-it';
import {
  sendChatMessage,
  type AgentFrontendAction,
  type ChatMessage as ApiChatMessage,
  type ConfirmCreateHouseResult
} from '../../api/chat/chat-api';
import type { House } from '../../model/house/house';
import { statusLabels } from '../../model/house/house-status';
import { formatCurrency } from '../../lib/format';

interface ChatMessage {
  content: string;
  role: 'user' | 'assistant';
  houses?: House[];
  hidden?: boolean;
}

const messages = ref<ChatMessage[]>([]);
const inputValue = ref('');
const loading = ref(false);
const inputRef = ref<HTMLTextAreaElement | null>(null);
const composerPanelSize = ref('152px');

const canSubmit = computed(() => inputValue.value.trim().length > 0 && !loading.value);
const visibleMessages = computed(() => messages.value.filter((message) => !message.hidden));
const markdown = new MarkdownIt({
  breaks: true,
  html: false,
  linkify: true,
  typographer: true,
});

const emit = defineEmits<{
  housesFound: [houses: House[]];
  selectHouse: [house: House];
  confirmCreateHouse: [action: Extract<AgentFrontendAction, { type: 'confirm_create_house' }>, done: (result: ConfirmCreateHouseResult) => void];
}>();

async function handleSubmit() {
  const content = inputValue.value.trim();
  if (!content || loading.value) return;

  const userMessage: ChatMessage = { content, role: 'user' };
  messages.value.push(userMessage);
  inputValue.value = '';

  loading.value = true;
  try {
    const result = await sendChatMessage(toApiMessages());
    appendAssistantResponse(result);
    await executeAgentActions(result.actions ?? []);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '请求失败');
  } finally {
    loading.value = false;
  }
}

function appendAssistantResponse(result: { reply: string; houses?: House[] }) {
  const assistantMessage: ChatMessage = { content: result.reply, role: 'assistant' };

  if (result.houses && result.houses.length > 0) {
    assistantMessage.houses = result.houses;
    emit('housesFound', result.houses);
  }

  messages.value.push(assistantMessage);
}

function toApiMessages(): ApiChatMessage[] {
  return messages.value.map((message) => ({
    role: message.role,
    content: message.content
  }));
}

async function executeAgentActions(actions: AgentFrontendAction[]) {
  for (const action of actions) {
    if (action.type === 'confirm_create_house') {
      const result = await requestCreateHouseConfirmation(action);

      if (result.status === 'created') {
        try {
          await notifyAgentHouseCreated(result.house);
        } catch (error) {
          ElMessage.warning(error instanceof Error ? error.message : '创建成功，但回调助手失败');
          appendAssistantResponse({
            reply: `房源创建成功：${result.house.name}`,
            houses: [result.house]
          });
        }
      } else {
        messages.value.push({ role: 'assistant', content: '已取消新增房源。' });
      }
    }
  }
}

function requestCreateHouseConfirmation(action: Extract<AgentFrontendAction, { type: 'confirm_create_house' }>) {
  return new Promise<ConfirmCreateHouseResult>((resolve) => {
    emit('confirmCreateHouse', action, resolve);
  });
}

async function notifyAgentHouseCreated(house: House) {
  messages.value.push({
    role: 'user',
    hidden: true,
    content: [
      '前端执行器回调：用户已确认新增房源，入库操作已成功完成。',
      `房源ID：${house.id}`,
      `名称：${house.name}`,
      `地址：${house.address}`,
      `租金：${house.rentPrice}元/月`,
      `户型：${house.bedroomCount}室${house.livingRoomCount}厅${house.bathroomCount}卫`,
      `状态：${statusLabels[house.status]}`
    ].join('\n')
  });

  const result = await sendChatMessage(toApiMessages());
  appendAssistantResponse({
    reply: result.reply,
    houses: result.houses?.length ? result.houses : [house]
  });
}

function handleInputKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing) {
    return;
  }

  event.preventDefault();
  void handleSubmit();
}

function handleSelectHouse(house: House) {
  emit('selectHouse', house);
}

function renderAssistantContent(content: string) {
  return markdown.render(content);
}
</script>

<template>
  <div class="chat-panel">
    <div class="chat-header">
      <span>对话</span>
    </div>

    <el-splitter class="chat-splitter" layout="vertical">
      <el-splitter-panel min="160px">
        <div class="chat-messages">
          <div v-if="messages.length === 0" class="chat-empty">
            <p>你好！我是你的找房助手，有什么可以帮你的吗？</p>
            <p class="chat-hints">
              试试问：<br>
              "帮我找月租5000以下的两居室"<br>
              "有哪些待签约的房源？"<br>
              "找3个卧室的房子"
            </p>
          </div>
          <div v-for="(msg, index) in visibleMessages" :key="index" class="chat-message-wrapper" :class="msg.role">
            <div class="chat-bubble">
              <div
                v-if="msg.role === 'assistant'"
                class="chat-bubble-markdown"
                v-html="renderAssistantContent(msg.content)"
              />
              <div v-else class="chat-bubble-text">{{ msg.content }}</div>
              <div v-if="msg.houses && msg.houses.length > 0" class="chat-house-results">
                <div class="chat-house-results-header">
                  找到 {{ msg.houses.length }} 套房源
                </div>
                <div
                  v-for="house in msg.houses"
                  :key="house.id"
                  class="chat-house-card"
                  @click="handleSelectHouse(house)"
                >
                  <div class="chat-house-name">{{ house.name }}</div>
                  <div class="chat-house-meta">
                    <span class="chat-house-price">{{ formatCurrency(house.rentPrice) }}</span>
                    <span class="chat-house-type">{{ house.bedroomCount }}室{{ house.livingRoomCount }}厅{{ house.bathroomCount }}卫</span>
                    <span class="chat-house-status" :class="house.status">{{ statusLabels[house.status] }}</span>
                  </div>
                  <div class="chat-house-address">{{ house.address }}</div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="loading" class="chat-message-wrapper assistant">
            <div class="chat-bubble chat-loading">
              <span class="chat-loading-dot" />
              <span class="chat-loading-dot" />
              <span class="chat-loading-dot" />
            </div>
          </div>
        </div>
      </el-splitter-panel>

      <el-splitter-panel v-model:size="composerPanelSize" min="112px" max="48%">
        <div class="chat-input-area">
          <form class="chat-composer" @submit.prevent="handleSubmit">
            <textarea
              ref="inputRef"
              v-model="inputValue"
              class="chat-composer-input"
              placeholder="用自然语言描述你想要的房子..."
              :disabled="loading"
              @keydown="handleInputKeydown"
            />
            <div class="chat-composer-footer">
              <span class="chat-composer-hint">Shift + Enter 换行</span>
              <button
                class="chat-composer-send"
                type="submit"
                :disabled="!canSubmit"
                aria-label="发送消息"
                title="发送"
              >
                <span v-if="loading" class="chat-composer-spinner" />
                <span v-else class="chat-composer-send-icon">↑</span>
              </button>
            </div>
          </form>
        </div>
      </el-splitter-panel>
    </el-splitter>
  </div>
</template>

<style scoped>
.chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: #f7f9fb;
}

.chat-splitter {
  flex: 1;
  min-height: 0;
}

:deep(.chat-splitter > .el-splitter__panel) {
  min-height: 0;
}

.chat-header {
  flex: 0 0 auto;
  padding: 12px 16px;
  font-size: 15px;
  font-weight: 600;
  border-bottom: 1px solid var(--el-border-color-light);
}

.chat-messages {
  height: 100%;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chat-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-secondary);
  font-size: 14px;
  text-align: center;
  line-height: 1.8;
}

.chat-hints {
  margin-top: 12px;
  font-size: 13px;
  color: var(--el-text-color-placeholder);
}

.chat-message-wrapper {
  display: flex;
  max-width: 85%;
}

.chat-message-wrapper.user {
  align-self: flex-end;
  justify-content: flex-end;
}

.chat-message-wrapper.assistant {
  align-self: flex-start;
  justify-content: flex-start;
}

.chat-bubble {
  padding: 10px 13px;
  border-radius: 14px;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  box-shadow: 0 1px 2px rgb(16 24 40 / 4%);
}

.chat-bubble-text {
  white-space: pre-wrap;
}

.chat-message-wrapper.user .chat-bubble {
  background: #2563eb;
  color: #fff;
  border-bottom-right-radius: 5px;
}

.chat-message-wrapper.assistant .chat-bubble {
  background: #eef1f4;
  color: #17202a;
  border-bottom-left-radius: 5px;
}

.chat-bubble-markdown {
  white-space: normal;
}

.chat-bubble-markdown :deep(p) {
  margin: 0;
}

.chat-bubble-markdown :deep(p + p),
.chat-bubble-markdown :deep(ul),
.chat-bubble-markdown :deep(ol),
.chat-bubble-markdown :deep(pre),
.chat-bubble-markdown :deep(blockquote),
.chat-bubble-markdown :deep(table) {
  margin-top: 8px;
}

.chat-bubble-markdown :deep(ul),
.chat-bubble-markdown :deep(ol) {
  padding-left: 18px;
}

.chat-bubble-markdown :deep(li + li) {
  margin-top: 3px;
}

.chat-bubble-markdown :deep(code) {
  border-radius: 5px;
  background: rgb(17 24 39 / 8%);
  padding: 1px 5px;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 0.92em;
}

.chat-bubble-markdown :deep(pre) {
  overflow-x: auto;
  border-radius: 8px;
  background: #111827;
  padding: 10px 12px;
  color: #f8fafc;
}

.chat-bubble-markdown :deep(pre code) {
  background: transparent;
  padding: 0;
  color: inherit;
}

.chat-bubble-markdown :deep(a) {
  color: #1d4ed8;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.chat-bubble-markdown :deep(blockquote) {
  border-left: 3px solid #c6ced7;
  margin-left: 0;
  padding-left: 10px;
  color: #526170;
}

.chat-loading {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 12px 16px !important;
}

.chat-loading-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--el-text-color-secondary);
  animation: chat-bounce 1.4s ease-in-out infinite;
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

.chat-house-results {
  margin-top: 8px;
  border-top: 1px solid var(--el-border-color-light);
  padding-top: 8px;
}

.chat-house-results-header {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-color-primary);
  margin-bottom: 6px;
}

.chat-house-card {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  padding: 8px 10px;
  margin-bottom: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.chat-house-card:hover {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.chat-house-name {
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 4px;
}

.chat-house-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  margin-bottom: 2px;
}

.chat-house-price {
  color: var(--el-color-danger);
  font-weight: 600;
}

.chat-house-type {
  color: var(--el-text-color-secondary);
}

.chat-house-status {
  font-size: 11px;
  padding: 1px 4px;
  border-radius: 2px;
}

.chat-house-status.watching {
  background: var(--el-color-info-light-3);
  color: #fff;
}

.chat-house-status.interested {
  background: var(--el-color-primary-light-3);
  color: #fff;
}

.chat-house-status.negotiating {
  background: var(--el-color-warning-light-3);
  color: #fff;
}

.chat-house-status.signed {
  background: var(--el-color-success-light-3);
  color: #fff;
}

.chat-house-status.abandoned {
  background: var(--el-color-danger-light-3);
  color: #fff;
}

.chat-house-address {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-input-area {
  height: 100%;
  padding: 12px 16px 14px;
  background: #ffffff;
}

.chat-composer {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  gap: 8px;
  height: 100%;
  width: 100%;
  min-width: 0;
  background: transparent;
}

.chat-composer-input {
  display: block;
  width: 100%;
  min-height: 0;
  overflow-y: auto;
  resize: none;
  border: 0;
  outline: 0;
  background: transparent;
  color: #17202a;
  font: inherit;
  font-size: 14px;
  line-height: 1.55;
  letter-spacing: 0;
  padding: 0;
}

.chat-composer-input::placeholder {
  color: #8a96a3;
}

.chat-composer-input:disabled {
  cursor: not-allowed;
  opacity: 0.72;
}

.chat-composer-footer {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.chat-composer-hint {
  min-width: 0;
  overflow: hidden;
  color: #98a2ad;
  font-size: 12px;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-composer-send {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  border: 0;
  border-radius: 50%;
  background: #111111;
  color: #ffffff;
  cursor: pointer;
  transition:
    background 0.18s ease,
    opacity 0.18s ease,
    transform 0.18s ease;
}

.chat-composer-send:hover:not(:disabled) {
  background: #2a2f35;
  transform: translateY(-1px);
}

.chat-composer-send:disabled {
  cursor: not-allowed;
  opacity: 0.28;
}

.chat-composer-send-icon {
  display: block;
  font-size: 20px;
  font-weight: 700;
  line-height: 1;
  transform: translateY(-1px);
}

.chat-composer-spinner {
  width: 15px;
  height: 15px;
  border: 2px solid rgb(255 255 255 / 34%);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: chat-spin 0.8s linear infinite;
}

@keyframes chat-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 520px) {
  .chat-input-area {
    padding: 12px;
  }

  .chat-composer-hint {
    display: none;
  }
}
</style>
