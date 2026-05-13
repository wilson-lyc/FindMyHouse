<script setup lang="ts">
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { sendChatMessage } from '../../api/chat/chat-api';
import type { House } from '../../model/house/house';
import { statusLabels } from '../../model/house/house-status';
import { formatCurrency } from '../../lib/format';

interface ChatMessage {
  content: string;
  role: 'user' | 'assistant';
  houses?: House[];
}

const messages = ref<ChatMessage[]>([]);
const loading = ref(false);
const senderRef = ref();

const emit = defineEmits<{
  housesFound: [houses: House[]];
  selectHouse: [house: House];
}>();

async function handleSubmit() {
  if (!senderRef.value) return;
  const modelValue = senderRef.value.getModelValue();
  const content = modelValue?.text?.trim();
  if (!content || loading.value) return;

  const userMessage: ChatMessage = { content, role: 'user' };
  messages.value.push(userMessage);
  senderRef.value.clear();

  loading.value = true;
  try {
    const result = await sendChatMessage(messages.value);
    const assistantMessage: ChatMessage = { content: result.reply, role: 'assistant' };
    if (result.houses && result.houses.length > 0) {
      assistantMessage.houses = result.houses;
      emit('housesFound', result.houses);
    }
    messages.value.push(assistantMessage);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '请求失败');
  } finally {
    loading.value = false;
  }
}

function handleSelectHouse(house: House) {
  emit('selectHouse', house);
}
</script>

<template>
  <div class="chat-panel">
    <div class="chat-header">
      <span>对话</span>
    </div>

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
      <div v-for="(msg, index) in messages" :key="index" class="chat-message-wrapper" :class="msg.role">
        <div class="chat-avatar">
          {{ msg.role === 'user' ? '我' : 'AI' }}
        </div>
        <div class="chat-bubble">
          <div class="chat-bubble-text">{{ msg.content }}</div>
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
        <div class="chat-avatar">AI</div>
        <div class="chat-bubble chat-loading">
          <span class="chat-loading-dot" />
          <span class="chat-loading-dot" />
          <span class="chat-loading-dot" />
        </div>
      </div>
    </div>

    <div class="chat-input-area">
      <XSender
        ref="senderRef"
        :loading="loading"
        placeholder="用自然语言描述你想要的房子..."
        @submit="handleSubmit"
      />
    </div>
  </div>
</template>

<style scoped>
.chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chat-header {
  padding: 12px 16px;
  font-size: 15px;
  font-weight: 600;
  border-bottom: 1px solid var(--el-border-color-light);
}

.chat-messages {
  flex: 1;
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
  gap: 8px;
  max-width: 85%;
}

.chat-message-wrapper.user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.chat-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  flex-shrink: 0;
}

.chat-message-wrapper.user .chat-avatar {
  background: var(--el-color-primary);
  color: #fff;
}

.chat-message-wrapper.assistant .chat-avatar {
  background: var(--el-color-success-light-3);
  color: #fff;
}

.chat-bubble {
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.chat-bubble-text {
  white-space: pre-wrap;
}

.chat-message-wrapper.user .chat-bubble {
  background: var(--el-color-primary-light-3);
  color: #fff;
  border-bottom-right-radius: 2px;
}

.chat-message-wrapper.assistant .chat-bubble {
  background: var(--el-fill-color-light);
  color: var(--el-text-color-primary);
  border-bottom-left-radius: 2px;
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
  padding: 12px 16px;
  border-top: 1px solid var(--el-border-color-light);
}
</style>
