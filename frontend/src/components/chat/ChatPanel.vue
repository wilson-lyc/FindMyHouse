<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus, Setting, Share } from '@element-plus/icons-vue';
import {
  sendChatMessage,
  type AgentFrontendAction,
  type ChatMessage as ApiChatMessage,
  type ConfirmCompareHousesResult,
  type ConfirmCreateHouseResult
} from '../../api/chat/chat-api';
import ChatMessageItem from './ChatMessageItem.vue';
import ChatComposer from './ChatComposer.vue';
import ChatLoading from './ChatLoading.vue';
import ChatSessionDialog from './ChatSessionDialog.vue';
import ChatShareDialog from './ChatShareDialog.vue';
import ChatCompareConfirmDialog from './ChatCompareConfirmDialog.vue';
import { useChatSession } from '../../composables/chat/useChatSession';
import { useChatShare } from '../../composables/chat/useChatShare';
import type { House } from '../../model/house/house';
import { statusLabels } from '../../model/house/house-status';
import { formatCurrency } from '../../lib/format';
import type { ChatMessage } from '../../model/chat/chat-message';

const messages = ref<ChatMessage[]>([]);
const inputValue = ref('');
const loading = ref(false);
const sessionDialogVisible = ref(false);
const compareConfirmDialogVisible = ref(false);
const pendingCompareAction = ref<Extract<AgentFrontendAction, { type: 'confirm_compare_houses' }> | null>(null);
const pendingCompareResolve = ref<((result: ConfirmCompareHousesResult) => void) | null>(null);
const messagesContainerRef = ref<HTMLDivElement | null>(null);
const composerPanelSize = ref('152px');
const customChoiceInputs = ref<Record<string, string>>({});

const sessionState = useChatSession();
const shareState = useChatShare();

const visibleMessages = computed(() => messages.value.filter((message) => !message.hidden));
const canShareConversation = computed(() => visibleMessages.value.length > 0 && !shareState.shareGenerating.value);

const emit = defineEmits<{
  housesFound: [houses: House[]];
  selectHouse: [house: House];
  openHouseCompare: [houses: House[]];
  confirmCreateHouse: [action: Extract<AgentFrontendAction, { type: 'confirm_create_house' }>, done: (result: ConfirmCreateHouseResult) => void];
}>();

onMounted(() => {
  void sessionState.loadSessions();
});

async function handleSubmit() {
  const content = inputValue.value.trim();
  if (!content || loading.value) return;

  const userMessage: ChatMessage = { content, role: 'user' };
  messages.value.push(userMessage);
  inputValue.value = '';

  loading.value = true;
  try {
    await sessionState.persistCurrentSession(messages.value, content);
    const apiMessages = toApiMessages();
    const result = await sendChatMessage(apiMessages);
    appendAssistantResponse(result);

    await sessionState.persistCurrentSession(messages.value);
    await executeAgentActions(result.actions ?? []);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '请求失败');
  } finally {
    loading.value = false;
  }
}

function appendAssistantResponse(result: { reply: string; houses?: House[]; housesTitle?: string; actions?: AgentFrontendAction[] }) {
  const assistantMessage: ChatMessage = { content: result.reply, role: 'assistant' };
  const choicePrompt = result.actions?.find((action) => action.type === 'ask_single_choice');
  if (choicePrompt) {
    assistantMessage.choicePrompt = choicePrompt;
  }
  attachHousesToMessage(assistantMessage, result);
  messages.value.push(assistantMessage);
}

function attachHousesToMessage(message: ChatMessage, result: { houses?: House[]; housesTitle?: string }) {
  if (result.houses && result.houses.length > 0) {
    message.houses = result.houses;
    message.housesTitle = result.housesTitle ?? `找到 ${result.houses.length} 套房源`;
    emit('housesFound', result.houses);
  }
}

async function handleStartNewSession() {
  if (loading.value) return;
  sessionState.startNewSession();
  messages.value = [];
  inputValue.value = '';
}

async function openSessionDialog() {
  sessionDialogVisible.value = true;
  await sessionState.loadSessions();
}

async function handleRestoreSession(id: string) {
  if (loading.value || sessionState.currentSessionId.value === id) return;

  try {
    const session = await sessionState.restoreSession(id);
    messages.value = session.messages;
    inputValue.value = '';
    sessionDialogVisible.value = false;

    const restoredHouses = messages.value.flatMap((message) => message.houses ?? []);
    if (restoredHouses.length > 0) {
      emit('housesFound', restoredHouses);
    }
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '恢复会话失败');
  }
}

async function handleRemoveSession(id: string) {
  const wasCurrent = sessionState.currentSessionId.value === id;
  await sessionState.removeSession(id);
  if (wasCurrent) {
    messages.value = [];
  }
}

async function handleRemoveSelectedSessions() {
  const ids = [...sessionState.selectedSessionIds.value];
  const wasCurrentRemoved = sessionState.currentSessionId.value !== null && ids.includes(sessionState.currentSessionId.value);
  await sessionState.removeSelectedSessions();
  if (wasCurrentRemoved) {
    messages.value = [];
  }
}

function toApiMessages(): ApiChatMessage[] {
  return messages.value
    .filter((message) => message.content.trim().length > 0)
    .map((message) => ({
      role: message.role,
      content: message.content
    }));
}

async function executeAgentActions(actions: AgentFrontendAction[]) {
  for (const action of actions) {
    if (action.type === 'ask_single_choice') {
      continue;
    }

    if (action.type === 'show_house_search_results') {
      emit('housesFound', action.houses);
      continue;
    }

    if (action.type === 'confirm_create_house') {
      const result = await requestCreateHouseConfirmation(action);

      if (result.status === 'created') {
        appendCreatedHouseResponse(result.house);
        await sessionState.persistCurrentSession(messages.value);
      } else {
        messages.value.push({ role: 'assistant', content: '已取消新增房源。' });
        await sessionState.persistCurrentSession(messages.value);
      }
    }

    if (action.type === 'confirm_compare_houses') {
      const result = await requestCompareConfirmation(action);

      if (result.status === 'confirmed') {
        await runConfirmedComparison(result.houses);
      } else {
        messages.value.push({ role: 'assistant', content: '已取消房源对比。' });
        await sessionState.persistCurrentSession(messages.value);
      }
    }
  }
}

async function submitChoiceAnswer(message: ChatMessage, value: string) {
  const answer = value.trim();
  if (!message.choicePrompt || message.choicePrompt.answeredValue || !answer || loading.value) return;

  message.choicePrompt.answeredValue = answer;
  customChoiceInputs.value[message.choicePrompt.id] = '';
  messages.value.push({ role: 'user', content: answer });

  loading.value = true;
  try {
    await sessionState.persistCurrentSession(messages.value, answer);
    const result = await sendChatMessage(toApiMessages());
    appendAssistantResponse(result);
    await sessionState.persistCurrentSession(messages.value);
    await executeAgentActions(result.actions ?? []);
  } catch (error) {
    message.choicePrompt.answeredValue = undefined;
    ElMessage.error(error instanceof Error ? error.message : '请求失败');
  } finally {
    loading.value = false;
  }
}

function submitCustomChoiceAnswer(message: ChatMessage) {
  if (!message.choicePrompt) return;
  void submitChoiceAnswer(message, customChoiceInputs.value[message.choicePrompt.id] ?? '');
}

function requestCreateHouseConfirmation(action: Extract<AgentFrontendAction, { type: 'confirm_create_house' }>) {
  return new Promise<ConfirmCreateHouseResult>((resolve) => {
    emit('confirmCreateHouse', action, resolve);
  });
}

function requestCompareConfirmation(action: Extract<AgentFrontendAction, { type: 'confirm_compare_houses' }>) {
  pendingCompareAction.value = action;
  compareConfirmDialogVisible.value = true;

  return new Promise<ConfirmCompareHousesResult>((resolve) => {
    pendingCompareResolve.value = resolve;
  });
}

function confirmCompareHouses() {
  if (!pendingCompareAction.value || !pendingCompareResolve.value) return;

  const houses = pendingCompareAction.value.houses;
  pendingCompareResolve.value({ status: 'confirmed', houses });
  closeCompareConfirmation();
}

function cancelCompareHouses() {
  pendingCompareResolve.value?.({ status: 'cancelled' });
  closeCompareConfirmation();
}

function handleCompareConfirmVisibleChange(visible: boolean) {
  if (visible) {
    compareConfirmDialogVisible.value = true;
    return;
  }

  cancelCompareHouses();
}

function closeCompareConfirmation() {
  compareConfirmDialogVisible.value = false;
  pendingCompareAction.value = null;
  pendingCompareResolve.value = null;
}

async function runConfirmedComparison(houses: House[]) {
  messages.value.push({
    role: 'user',
    hidden: true,
    content: createCompareCallbackMessage(houses)
  });

  const result = await sendChatMessage(toApiMessages());
  const assistantMessage: ChatMessage = { content: result.reply, role: 'assistant', compareHouses: houses };
  attachHousesToMessage(assistantMessage, result);
  messages.value.push(assistantMessage);
  await sessionState.persistCurrentSession(messages.value);
  await executeAgentActions(result.actions ?? []);
}

function createCompareCallbackMessage(houses: House[]) {
  const payload = houses.map((house) => ({
    name: house.name,
    status: statusLabels[house.status],
    layout: `${house.bedroomCount}室${house.livingRoomCount}厅${house.bathroomCount}卫`,
    address: house.address,
    rentPrice: house.rentPrice,
    monthlyTotalCost: getMonthlyTotalCost(house),
    earnestMoney: house.earnestMoney,
    deposit: house.deposit,
    propertyFee: house.propertyFee,
    waterFeePerTon: house.waterFeePerTon,
    electricityFeePerKwh: house.electricityFeePerKwh,
    customFees: house.customFees,
    feeNotes: house.feeNotes,
    rentPaymentPeriods: house.rentPaymentPeriods,
    contactNotes: house.contactNotes
  }));

  return [
    '前端执行器回调：用户已确认对比以下房源。',
    '请基于这些房源做对比分析，输出清晰的取舍建议和推荐结论；不要展示内部 ID。',
    JSON.stringify(payload, null, 2)
  ].join('\n');
}

function getMonthlyTotalCost(house: House) {
  const customFeesTotal = (house.customFees ?? []).reduce((sum, fee) => sum + fee.amount, 0);
  return house.rentPrice + (house.propertyFee ?? 0) + customFeesTotal;
}

function appendCreatedHouseResponse(house: House) {
  appendAssistantResponse({
    reply: createHouseCreatedReply(house),
    houses: [house],
    housesTitle: '新增一套房源'
  });
}

function createHouseCreatedReply(house: House) {
  const rows = [
    ['名称', house.name],
    ['地址', house.address],
    ['租金', `${formatCurrency(house.rentPrice)}/月`],
    ['户型', `${house.bedroomCount}室${house.livingRoomCount}厅${house.bathroomCount}卫`],
    ['状态', statusLabels[house.status]],
    ['定金', house.earnestMoney !== undefined ? `${house.earnestMoney} 元` : undefined],
    ['押金', house.deposit !== undefined ? `${house.deposit} 元` : undefined],
    ['水费', house.waterFeePerTon !== undefined ? `${house.waterFeePerTon} 元/吨` : undefined],
    ['电费', house.electricityFeePerKwh !== undefined ? `${house.electricityFeePerKwh} 元/度` : undefined],
    ['物业费', house.propertyFee !== undefined ? `${house.propertyFee} 元` : undefined],
    ...(house.customFees?.map(fee => [`${fee.name}`, `${fee.amount} 元`] as [string, string]) ?? []),
    ['付款周期', house.rentPaymentPeriods?.length ? house.rentPaymentPeriods.join('、') : undefined],
    ['费用备注', house.feeNotes || undefined],
    ['联系人', house.contactName || undefined],
    ['联系电话', house.phone || undefined],
    ['微信', house.wechat || undefined],
    ['联系备注', house.contactNotes || undefined]
  ].filter((row): row is [string, string] => Boolean(row[1]));

  return [
    '房源创建成功，以下是新增房源的信息：',
    '',
    '| 项目 | 内容 |',
    '| --- | --- |',
    ...rows.map(([label, value]) => `| ${escapeMarkdownTableCell(label)} | ${escapeMarkdownTableCell(value)} |`)
  ].join('\n');
}

function escapeMarkdownTableCell(value: string) {
  return value.replace(/\|/g, '\\|').replace(/\n/g, '<br>');
}

function handleSelectHouse(house: House) {
  emit('selectHouse', house);
}

function handleOpenHouseCompare(houses: House[]) {
  emit('openHouseCompare', houses);
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainerRef.value) {
      messagesContainerRef.value.scrollTop = messagesContainerRef.value.scrollHeight;
    }
  });
}

watch(visibleMessages, () => scrollToBottom(), { deep: true });
watch(loading, () => {
  if (!loading.value) scrollToBottom();
});
</script>

<template>
  <div class="chat-panel">
    <div class="panel-header">
      <h2>对话</h2>
      <div class="panel-header-actions">
        <el-button
          text
          :icon="Share"
          aria-label="生成分享图"
          title="生成分享图"
          :disabled="!canShareConversation"
          :loading="shareState.shareGenerating.value"
          @click="shareState.openShareDialog(visibleMessages)"
        />
        <el-button
          text
          :icon="Plus"
          aria-label="新会话"
          title="新会话"
          @click="handleStartNewSession"
        />
        <el-button
          text
          :icon="Setting"
          aria-label="管理会话"
          title="管理会话"
          @click="openSessionDialog"
        />
      </div>
    </div>

    <div class="chat-notice">AI 内容仅供参考，请以实际信息为准</div>

    <el-splitter class="chat-splitter" layout="vertical">
      <el-splitter-panel min="160px">
        <div ref="messagesContainerRef" class="chat-messages">
          <div v-if="messages.length === 0" class="chat-empty">
            <p>你好！我是你的租房助手，有什么可以帮你的吗？</p>
            <p class="chat-hints">
              试试问：<br>
              "帮我找月租5000以下的两居室"<br>
              "有哪些待签约的房源？"<br>
              "找3个卧室的房子"
            </p>
          </div>
          <ChatMessageItem
            v-for="(msg, index) in visibleMessages"
            :key="index"
            :message="msg"
            :loading="loading"
            :custom-choice-inputs="customChoiceInputs"
            @select-house="handleSelectHouse"
            @open-house-compare="handleOpenHouseCompare"
            @submit-choice-answer="(value) => submitChoiceAnswer(msg, value)"
            @submit-custom-choice-answer="submitCustomChoiceAnswer(msg)"
            @custom-choice-input-update="(promptId, value) => { customChoiceInputs[promptId] = value }"
          />
          <div v-if="loading && !visibleMessages.some((msg) => msg.role === 'assistant' && msg.content.length === 0)" class="chat-message-wrapper assistant">
            <div class="chat-bubble chat-loading-bubble">
              <ChatLoading />
            </div>
          </div>
        </div>
      </el-splitter-panel>

      <el-splitter-panel v-model:size="composerPanelSize" min="112px" max="48%">
        <div class="chat-input-area">
          <ChatComposer
            v-model="inputValue"
            :disabled="loading"
            @submit="handleSubmit"
          />
        </div>
      </el-splitter-panel>
    </el-splitter>

    <ChatSessionDialog
      v-model:visible="sessionDialogVisible"
      :sessions="sessionState.sessions.value"
      :sessions-loading="sessionState.sessionsLoading.value"
      :has-selected-sessions="sessionState.hasSelectedSessions.value"
      :selected-session-ids="sessionState.selectedSessionIds.value"
      :share-generating="shareState.shareGenerating.value"
      @restore-session="handleRestoreSession"
      @share-session="shareState.shareSession"
      @remove-session="handleRemoveSession"
      @remove-selected-sessions="handleRemoveSelectedSessions"
      @selection-change="sessionState.handleSessionSelectionChange"
    />

    <ChatShareDialog
      v-model:visible="shareState.shareDialogVisible.value"
      v-model:image-url="shareState.shareImageUrl.value"
      v-model:generating="shareState.shareGenerating.value"
      :messages="shareState.shareRenderMessages.value"
      :custom-choice-inputs="customChoiceInputs"
      :loading="loading"
      @copy-image="shareState.copyShareImage"
      @download-image="shareState.downloadShareImage"
    />

    <ChatCompareConfirmDialog
      :visible="compareConfirmDialogVisible"
      :houses="pendingCompareAction?.houses ?? []"
      :title="pendingCompareAction?.title"
      @update:visible="handleCompareConfirmVisibleChange"
      @confirm="confirmCompareHouses"
      @cancel="cancelCompareHouses"
    />
  </div>
</template>

<style scoped>
.chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--app-bg-soft);
}

.chat-splitter {
  flex: 1;
  min-height: 0;
}

:deep(.chat-splitter > .el-splitter__panel) {
  min-height: 0;
}

.chat-notice {
  flex: 0 0 auto;
  padding: 6px 16px;
  font-size: 12px;
  color: var(--el-color-warning-dark-2);
  background: var(--el-color-warning-light-9);
  border-bottom: 1px solid var(--el-color-warning-light-8);
  text-align: center;
  line-height: 1.4;
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
  min-width: 0;
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

.chat-message-wrapper.assistant .chat-bubble {
  background: #eeeef0;
  border-bottom-left-radius: 5px;
  color: var(--app-text-primary);
}

.chat-loading-bubble {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 12px 16px !important;
}

.chat-input-area {
  height: 100%;
  padding: 12px 16px 14px;
  background: var(--el-bg-color);
}

@media (max-width: 520px) {
  .chat-input-area {
    padding: 12px;
  }
}
</style>
