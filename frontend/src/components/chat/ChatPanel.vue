<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { CopyDocument, Delete, Download, Plus, Setting, Share, Top } from '@element-plus/icons-vue';
import html2canvas from 'html2canvas';
import MarkdownIt from 'markdown-it';
import {
  sendChatMessage,
  type AgentFrontendAction,
  type ChatMessage as ApiChatMessage,
  type ConfirmCompareHousesResult,
  type ConfirmCreateHouseResult,
  type ConfirmCreateLocationResult
} from '../../api/chat/chat-api';
import {
  createChatSession,
  deleteChatSession,
  deleteChatSessions,
  fetchChatSession,
  fetchChatSessions,
  updateChatSession,
  type ChatSessionSummary
} from '../../api/chat/chat-session-api';
import type { CustomFeeItem, House } from '../../model/house/house';
import type { Location } from '../../model/location/location';
import { locationCategoryLabels, type LocationCategory } from '../../model/location/location';
import { statusLabels } from '../../model/house/house-status';
import { formatCurrency } from '../../lib/format';

interface ChatMessage {
  content: string;
  role: 'user' | 'assistant';
  houses?: House[];
  housesTitle?: string;
  compareHouses?: House[];
  choicePrompt?: Extract<AgentFrontendAction, { type: 'ask_single_choice' }> & {
    answeredValue?: string;
  };
  hidden?: boolean;
}

const messages = ref<ChatMessage[]>([]);
const inputValue = ref('');
const loading = ref(false);
const sessionsLoading = ref(false);
const sessionDialogVisible = ref(false);
const shareDialogVisible = ref(false);
const shareImageUrl = ref('');
const shareGenerating = ref(false);
const shareRenderMessages = ref<ChatMessage[]>([]);
const currentSessionId = ref<string | null>(null);
const sessions = ref<ChatSessionSummary[]>([]);
const selectedSessionIds = ref<string[]>([]);
const compareConfirmDialogVisible = ref(false);
const pendingCompareAction = ref<Extract<AgentFrontendAction, { type: 'confirm_compare_houses' }> | null>(null);
const pendingCompareResolve = ref<((result: ConfirmCompareHousesResult) => void) | null>(null);
const inputRef = ref<HTMLTextAreaElement | null>(null);
const messagesContainerRef = ref<HTMLDivElement | null>(null);
const shareCaptureMessagesRef = ref<HTMLDivElement | null>(null);
const shareCaptureCardRef = ref<HTMLDivElement | null>(null);
const composerPanelSize = ref('152px');
const customChoiceInputs = ref<Record<string, string>>({});

const canSubmit = computed(() => inputValue.value.trim().length > 0 && !loading.value);
const visibleMessages = computed(() => messages.value.filter((message) => !message.hidden));
const hasSelectedSessions = computed(() => selectedSessionIds.value.length > 0);
const canShareConversation = computed(() => visibleMessages.value.length > 0 && !shareGenerating.value);
const markdown = new MarkdownIt({
  breaks: true,
  html: false,
  linkify: true,
  typographer: true,
});
markdown.renderer.rules.table_open = () => '<div class="chat-table-scroll"><table>';
markdown.renderer.rules.table_close = () => '</table></div>';

const emit = defineEmits<{
  housesFound: [houses: House[]];
  selectHouse: [house: House];
  openHouseCompare: [houses: House[]];
  confirmCreateHouse: [action: Extract<AgentFrontendAction, { type: 'confirm_create_house' }>, done: (result: ConfirmCreateHouseResult) => void];
  confirmCreateLocation: [action: Extract<AgentFrontendAction, { type: 'confirm_create_location' }>, done: (result: ConfirmCreateLocationResult) => void];
}>();

onMounted(() => {
  void loadSessions();
});

async function handleSubmit() {
  const content = inputValue.value.trim();
  if (!content || loading.value) return;

  const userMessage: ChatMessage = { content, role: 'user' };
  messages.value.push(userMessage);
  inputValue.value = '';

  loading.value = true;
  try {
    await persistCurrentSession(content);
    const apiMessages = toApiMessages();
    const result = await sendChatMessage(apiMessages);
    appendAssistantResponse(result);

    await persistCurrentSession();
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

function attachHousesToMessage(message: ChatMessage, result: { houses?: House[]; housesTitle?: string }) {
  if (result.houses && result.houses.length > 0) {
    message.houses = result.houses;
    message.housesTitle = result.housesTitle ?? `找到 ${result.houses.length} 套房源`;
    emit('housesFound', result.houses);
  }
}

async function loadSessions() {
  sessionsLoading.value = true;
  try {
    sessions.value = await fetchChatSessions();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '加载会话失败');
  } finally {
    sessionsLoading.value = false;
  }
}

function createSessionTitle(content: string) {
  const title = content.trim().replace(/\s+/g, ' ');
  if (!title) return '新会话';
  return title.length > 24 ? `${title.slice(0, 24)}...` : title;
}

async function persistCurrentSession(titleSource?: string) {
  if (messages.value.length === 0) return;

  if (!currentSessionId.value) {
    const session = await createChatSession({
      title: titleSource ? createSessionTitle(titleSource) : undefined,
      messages: messages.value
    });
    currentSessionId.value = session.id;
  } else {
    await updateChatSession(currentSessionId.value, {
      messages: messages.value
    });
  }

  await loadSessions();
}

async function startNewSession() {
  if (loading.value) return;
  currentSessionId.value = null;
  messages.value = [];
  inputValue.value = '';
}

async function openSessionDialog() {
  sessionDialogVisible.value = true;
  await loadSessions();
}

async function restoreSession(id: string) {
  if (loading.value || currentSessionId.value === id) return;

  sessionsLoading.value = true;
  try {
    const session = await fetchChatSession(id);
    currentSessionId.value = session.id;
    messages.value = session.messages;
    inputValue.value = '';
    sessionDialogVisible.value = false;

    const restoredHouses = messages.value.flatMap((message) => message.houses ?? []);
    if (restoredHouses.length > 0) {
      emit('housesFound', restoredHouses);
    }
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '恢复会话失败');
  } finally {
    sessionsLoading.value = false;
  }
}

function handleSessionSelectionChange(selection: ChatSessionSummary[]) {
  selectedSessionIds.value = selection.map((session) => session.id);
}

async function removeSession(id: string) {
  try {
    await ElMessageBox.confirm('确认删除这条会话记录吗？', '删除会话', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    });

    await deleteChatSession(id);
    selectedSessionIds.value = selectedSessionIds.value.filter((selectedId) => selectedId !== id);

    if (currentSessionId.value === id) {
      currentSessionId.value = null;
      messages.value = [];
    }

    await loadSessions();
    ElMessage.success('会话已删除');
  } catch {
    // User cancelled.
  }
}

async function removeSelectedSessions() {
  if (!hasSelectedSessions.value) return;

  try {
    await ElMessageBox.confirm(`确认删除选中的 ${selectedSessionIds.value.length} 条会话记录吗？`, '批量删除会话', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    });

    const ids = [...selectedSessionIds.value];
    await deleteChatSessions(ids);

    if (currentSessionId.value && ids.includes(currentSessionId.value)) {
      currentSessionId.value = null;
      messages.value = [];
    }

    selectedSessionIds.value = [];
    await loadSessions();
    ElMessage.success('已删除选中会话');
  } catch {
    // User cancelled.
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

    if (action.type === 'show_location_search_results') {
      continue;
    }

    if (action.type === 'confirm_create_house') {
      const result = await requestCreateHouseConfirmation(action);

      if (result.status === 'created') {
        appendCreatedHouseResponse(result.house);
        await persistCurrentSession();
      } else {
        messages.value.push({ role: 'assistant', content: '已取消新增房源。' });
        await persistCurrentSession();
      }
    }

    if (action.type === 'confirm_compare_houses') {
      const result = await requestCompareConfirmation(action);

      if (result.status === 'confirmed') {
        await runConfirmedComparison(result.houses);
      } else {
        messages.value.push({ role: 'assistant', content: '已取消房源对比。' });
        await persistCurrentSession();
      }
    }

    if (action.type === 'confirm_create_location') {
      const result = await requestCreateLocationConfirmation(action);

      if (result.status === 'created') {
        appendCreatedLocationResponse(result.location);
        await persistCurrentSession();
      } else {
        messages.value.push({ role: 'assistant', content: '已取消新增地点。' });
        await persistCurrentSession();
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
    await persistCurrentSession(answer);
    const result = await sendChatMessage(toApiMessages());
    appendAssistantResponse(result);
    await persistCurrentSession();
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

function requestCreateLocationConfirmation(action: Extract<AgentFrontendAction, { type: 'confirm_create_location' }>) {
  return new Promise<ConfirmCreateLocationResult>((resolve) => {
    emit('confirmCreateLocation', action, resolve);
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
  await persistCurrentSession();
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

function formatHouseStatus(house: House) {
  return statusLabels[house.status];
}

function appendCreatedHouseResponse(house: House) {
  appendAssistantResponse({
    reply: createHouseCreatedReply(house),
    houses: [house],
    housesTitle: '新增一套房源'
  });
}

function appendCreatedLocationResponse(location: Location) {
  appendAssistantResponse({
    reply: createLocationCreatedReply(location)
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

function createLocationCreatedReply(location: Location) {
  const rows = [
    ['名称', location.name],
    ['地址', location.address],
    ['分类', locationCategoryLabels[location.category as LocationCategory] ?? location.category],
    ['焦点地点', location.isFocus ? '是' : '否'],
    ['备注', location.notes || undefined]
  ].filter((row): row is [string, string] => Boolean(row[1]));

  return [
    '地点创建成功，以下是新增地点的信息：',
    '',
    '| 项目 | 内容 |',
    '| --- | --- |',
    ...rows.map(([label, value]) => `| ${escapeMarkdownTableCell(label)} | ${escapeMarkdownTableCell(value)} |`)
  ].join('\n');
}

function escapeMarkdownTableCell(value: string) {
  return value.replace(/\|/g, '\\|').replace(/\n/g, '<br>');
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

function handleOpenHouseCompare(houses: House[]) {
  emit('openHouseCompare', houses);
}

function renderAssistantContent(content: string) {
  return markdown.render(content);
}

function formatSessionTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

async function openShareDialog() {
  if (!canShareConversation.value) return;

  await generateShareImage(visibleMessages.value);
}

async function shareSession(sessionId: string) {
  if (shareGenerating.value) return;

  try {
    const session = await fetchChatSession(sessionId);
    await generateShareImage(session.messages.filter((message) => !message.hidden));
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '加载会话失败');
  }
}

async function generateShareImage(sourceMessages: ChatMessage[]) {
  if (sourceMessages.length === 0) return;

  try {
    await ElMessageBox.confirm(
      '分享图片会包含当前对话中展示的文字和房源信息，发送给他人后可能造成隐私泄露。请确认已检查内容，并注意识别敏感信息。',
      '确认分享对话',
      {
        type: 'warning',
        confirmButtonText: '确认生成',
        cancelButtonText: '取消'
      }
    );
  } catch {
    return;
  }

  shareImageUrl.value = '';
  shareRenderMessages.value = sourceMessages;
    shareDialogVisible.value = true;
    shareGenerating.value = true;
  try {
    await nextTick();
    shareImageUrl.value = await createConversationShareImage();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '生成分享图失败');
    shareDialogVisible.value = false;
  } finally {
    shareGenerating.value = false;
  }
}

async function copyShareImage() {
  if (!shareImageUrl.value) return;

  try {
    const response = await fetch(shareImageUrl.value);
    const blob = await response.blob();

    if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
      throw new Error('当前浏览器不支持复制图片');
    }

    await navigator.clipboard.write([
      new ClipboardItem({
        [blob.type]: blob
      })
    ]);
    ElMessage.success('分享图已复制');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '复制失败，请下载后分享');
  }
}

function downloadShareImage() {
  if (!shareImageUrl.value) return;

  const link = document.createElement('a');
  link.href = shareImageUrl.value;
  link.download = `findmyhouse-chat-${new Date().toISOString().slice(0, 10)}.png`;
  link.click();
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
  ) + footerHeight-10);
  card.style.height = `${imageHeight}px`;

  return renderElementToPng(card, imageWidth, imageHeight);
}

async function renderElementToPng(element: HTMLElement, width: number, height: number) {
  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    height,
    scale: Math.min(window.devicePixelRatio || 1, 2),
    useCORS: true,
    width,
    windowHeight: height,
    windowWidth: width
  });

  return canvas.toDataURL('image/png');
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
          :loading="shareGenerating"
          @click="openShareDialog"
        />
        <el-button
          text
          :icon="Plus"
          aria-label="新会话"
          title="新会话"
          @click="startNewSession"
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
              <div v-if="msg.role === 'assistant'">
                <div
                  v-if="getVisibleAssistantContent(msg)"
                  class="chat-bubble-markdown markdown-body"
                  v-html="renderAssistantContent(getVisibleAssistantContent(msg))"
                />
                <div v-if="msg.choicePrompt" class="chat-choice-prompt">
                  <div class="chat-choice-question">{{ msg.choicePrompt.question }}</div>
                  <div class="chat-choice-options" role="radiogroup" :aria-label="msg.choicePrompt.question">
                    <button
                      v-for="option in msg.choicePrompt.options"
                      :key="option.id"
                      class="chat-choice-option"
                      type="button"
                      role="radio"
                      :aria-checked="msg.choicePrompt.answeredValue === option.value"
                      :class="{ selected: msg.choicePrompt.answeredValue === option.value }"
                      :disabled="loading || Boolean(msg.choicePrompt.answeredValue)"
                      @click="submitChoiceAnswer(msg, option.value)"
                    >
                      <span class="chat-choice-radio" />
                      <span class="chat-choice-label">{{ option.label }}</span>
                    </button>
                  </div>
                  <form class="chat-choice-custom" @submit.prevent="submitCustomChoiceAnswer(msg)">
                    <input
                      v-model="customChoiceInputs[msg.choicePrompt.id]"
                      class="chat-choice-custom-input"
                      type="text"
                      :placeholder="msg.choicePrompt.customOptionLabel"
                      :disabled="loading || Boolean(msg.choicePrompt.answeredValue)"
                    >
                    <el-button
                      class="chat-choice-custom-submit"
                      type="primary"
                      native-type="submit"
                      :disabled="loading || Boolean(msg.choicePrompt.answeredValue) || !(customChoiceInputs[msg.choicePrompt.id] ?? '').trim()"
                    >
                      发送
                    </el-button>
                  </form>
                </div>
                <div v-if="!msg.content && !msg.choicePrompt" class="chat-inline-loading">
                  <span class="chat-loading-dot" />
                  <span class="chat-loading-dot" />
                  <span class="chat-loading-dot" />
                </div>
              </div>
              <div v-else class="chat-bubble-text">{{ msg.content }}</div>
              <div v-if="msg.houses && msg.houses.length > 0" class="chat-house-results">
                <div class="chat-house-results-header">
                  {{ msg.housesTitle ?? `找到 ${msg.houses.length} 套房源` }}
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
              <div v-if="msg.compareHouses && msg.compareHouses.length > 1" class="chat-compare-actions">
                <el-button type="primary" plain @click="handleOpenHouseCompare(msg.compareHouses)">
                  打开对比表
                </el-button>
              </div>
            </div>
          </div>
          <div v-if="loading && !visibleMessages.some((msg) => msg.role === 'assistant' && msg.content.length === 0)" class="chat-message-wrapper assistant">
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
              <el-button
                class="chat-composer-send"
                type="primary"
                circle
                native-type="submit"
                :disabled="!canSubmit"
                :loading="loading"
                :icon="loading ? undefined : Top"
                aria-label="发送消息"
                title="发送"
              />
            </div>
          </form>
        </div>
      </el-splitter-panel>
    </el-splitter>

    <el-dialog v-model="sessionDialogVisible" title="管理会话" width="860px" class="chat-session-dialog">
      <div class="chat-session-dialog-toolbar">
        <div class="chat-session-dialog-summary">
          <span>{{ sessions.length }} 条会话</span>
          <span v-if="hasSelectedSessions" class="chat-session-dialog-selected">
            已选 {{ selectedSessionIds.length }} 条
          </span>
        </div>
        <div class="chat-session-dialog-actions">
          <el-button
            type="danger"
            plain
            :icon="Delete"
            :disabled="!hasSelectedSessions"
            @click="removeSelectedSessions"
          >
            删除选中
          </el-button>
        </div>
      </div>

      <el-table
        v-loading="sessionsLoading"
        :data="sessions"
        height="420"
        empty-text="暂无历史会话"
        @selection-change="handleSessionSelectionChange"
      >
        <el-table-column type="selection" width="42" />
        <el-table-column label="会话" min-width="280">
          <template #default="{ row }">
            <div class="chat-session-table-title">{{ row.title }}</div>
            <div class="chat-session-table-preview">{{ row.latestMessage || '空会话' }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="messageCount" label="消息" width="80" />
        <el-table-column label="更新时间" width="150">
          <template #default="{ row }">
            {{ formatSessionTime(row.updatedAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="190" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="restoreSession(row.id)">恢复</el-button>
            <el-button link type="primary" :disabled="shareGenerating" @click="shareSession(row.id)">分享</el-button>
            <el-button link type="danger" @click="removeSession(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <el-dialog v-model="shareDialogVisible" title="分享对话" width="760px" class="chat-share-dialog" align-center>
      <div v-loading="shareGenerating" class="chat-share-preview">
        <div v-if="shareGenerating && !shareImageUrl" class="chat-share-generating">
          正在生成分享图...
        </div>
        <img v-if="shareImageUrl" :src="shareImageUrl" alt="对话分享图">
      </div>
      <div class="chat-share-capture-host" aria-hidden="true">
        <div v-if="shareRenderMessages.length > 0" ref="shareCaptureCardRef" class="chat-share-capture-card">
          <div class="chat-share-capture-header">
            <div class="chat-share-capture-title-group">
              <div class="chat-share-capture-title">FindMyHouse</div>
              <div class="chat-share-capture-slogan">您贴心的租房智能专家</div>
            </div>
            <el-tag type="primary">对话分享</el-tag>
          </div>
          <div ref="shareCaptureMessagesRef" class="chat-messages">
            <div v-for="(msg, index) in shareRenderMessages" :key="index" class="chat-message-wrapper" :class="msg.role">
              <div class="chat-bubble">
                <div v-if="msg.role === 'assistant'">
                  <div
                    v-if="getVisibleAssistantContent(msg)"
                    class="chat-bubble-markdown markdown-body"
                    v-html="renderAssistantContent(getVisibleAssistantContent(msg))"
                  />
                  <div v-if="msg.choicePrompt" class="chat-choice-prompt">
                    <div class="chat-choice-question">{{ msg.choicePrompt.question }}</div>
                    <div class="chat-choice-options" role="radiogroup" :aria-label="msg.choicePrompt.question">
                      <button
                        v-for="option in msg.choicePrompt.options"
                        :key="option.id"
                        class="chat-choice-option"
                        type="button"
                        role="radio"
                        :aria-checked="msg.choicePrompt.answeredValue === option.value"
                        :class="{ selected: msg.choicePrompt.answeredValue === option.value }"
                        disabled
                      >
                        <span class="chat-choice-radio" />
                        <span class="chat-choice-label">{{ option.label }}</span>
                      </button>
                    </div>
                  </div>
                </div>
                <div v-else class="chat-bubble-text">{{ msg.content }}</div>
                <div v-if="msg.houses && msg.houses.length > 0" class="chat-house-results">
                  <div class="chat-house-results-header">
                    {{ msg.housesTitle ?? `找到 ${msg.houses.length} 套房源` }}
                  </div>
                  <div
                    v-for="house in msg.houses"
                    :key="house.id"
                    class="chat-house-card"
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
                <div v-if="msg.compareHouses && msg.compareHouses.length > 1" class="chat-compare-actions">
                  <el-button type="primary" plain disabled>
                    打开对比表
                  </el-button>
                </div>
              </div>
            </div>
          </div>
          <div class="chat-share-capture-footer">
            <div class="chat-share-capture-footer-brand">FindMyHouse</div>
            <div class="chat-share-capture-footer-slogan">您贴心的租房智能专家</div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button :icon="CopyDocument" :disabled="shareGenerating || !shareImageUrl" @click="copyShareImage">复制图片</el-button>
        <el-button type="primary" :icon="Download" :disabled="shareGenerating || !shareImageUrl" @click="downloadShareImage">下载图片</el-button>
      </template>
    </el-dialog>

    <el-dialog
      :model-value="compareConfirmDialogVisible"
      :title="pendingCompareAction?.title ?? '确认对比房源'"
      width="720px"
      class="chat-compare-confirm-dialog"
      @update:model-value="handleCompareConfirmVisibleChange"
    >
      <el-table :data="pendingCompareAction?.houses ?? []" max-height="360">
        <el-table-column label="房源" min-width="180">
          <template #default="{ row }">
            <div class="chat-compare-confirm-name">{{ row.name }}</div>
            <div class="chat-compare-confirm-address">{{ row.address }}</div>
          </template>
        </el-table-column>
        <el-table-column label="月租" width="100">
          <template #default="{ row }">{{ formatCurrency(row.rentPrice) }}</template>
        </el-table-column>
        <el-table-column label="户型" width="110">
          <template #default="{ row }">{{ row.bedroomCount }}室{{ row.livingRoomCount }}厅{{ row.bathroomCount }}卫</template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">{{ formatHouseStatus(row) }}</template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="cancelCompareHouses">取消</el-button>
        <el-button type="primary" @click="confirmCompareHouses">确认并开始分析</el-button>
      </template>
    </el-dialog>
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

.chat-session-dialog-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  padding: 10px 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--app-bg-soft);
}

.chat-session-dialog-summary {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  line-height: 1.4;
}

.chat-session-dialog-selected {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary-dark-2);
  font-weight: 600;
}

.chat-session-dialog-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
}

.chat-session-dialog-actions .el-button {
  margin-left: 0;
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

:deep(.chat-share-dialog .el-dialog__footer) {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

:deep(.chat-share-dialog .el-dialog__footer .el-button) {
  margin-left: 0;
}

.chat-session-table-title {
  overflow: hidden;
  color: var(--app-text-primary);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-session-table-preview {
  overflow: hidden;
  margin-top: 4px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.chat-choice-prompt {
  display: grid;
  gap: 10px;
  min-width: min(360px, 100%);
  white-space: normal;
}

.chat-choice-question {
  color: var(--app-text-primary);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.45;
}

.chat-choice-options {
  display: grid;
  gap: 8px;
}

.chat-choice-option {
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 36px;
  padding: 8px 10px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  background: var(--el-bg-color);
  color: var(--app-text-primary);
  cursor: pointer;
  font: inherit;
  line-height: 1.35;
  text-align: left;
}

.chat-choice-option:hover:not(:disabled) {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.chat-choice-option:disabled {
  cursor: default;
  opacity: 0.72;
}

.chat-choice-option.selected {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary-dark-2);
}

.chat-choice-radio {
  width: 14px;
  height: 14px;
  border: 1px solid var(--el-border-color-darker);
  border-radius: 50%;
  background: var(--el-bg-color);
  box-shadow: inset 0 0 0 3px var(--el-bg-color);
}

.chat-choice-option.selected .chat-choice-radio {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary);
}

.chat-choice-label {
  min-width: 0;
  overflow-wrap: anywhere;
}

.chat-choice-custom {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}

.chat-choice-custom-input {
  min-width: 0;
  height: 34px;
  padding: 0 10px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  outline: 0;
  background: var(--el-bg-color);
  color: var(--app-text-primary);
  font: inherit;
  font-size: 13px;
  letter-spacing: 0;
}

.chat-choice-custom-input:focus {
  border-color: var(--el-color-primary);
}

.chat-choice-custom-submit {
  height: 34px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
}

.chat-choice-custom-submit:disabled {
  cursor: not-allowed;
  opacity: 0.32;
}

.chat-inline-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 42px;
  min-height: 22px;
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

.chat-compare-actions {
  margin-top: 10px;
  border-top: 1px solid var(--el-border-color-light);
  padding-top: 10px;
}

.chat-compare-actions .el-button {
  margin-left: 0;
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
  color: var(--el-bg-color);
}

.chat-house-status.interested {
  background: var(--el-color-primary-light-3);
  color: var(--el-bg-color);
}

.chat-house-status.negotiating {
  background: var(--el-color-warning-light-3);
  color: var(--el-bg-color);
}

.chat-house-status.signed {
  background: var(--el-color-success-light-3);
  color: var(--el-bg-color);
}

.chat-house-status.abandoned {
  background: var(--el-color-danger-light-3);
  color: var(--el-bg-color);
}

.chat-house-address {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-compare-confirm-name {
  font-weight: 600;
  line-height: 1.4;
}

.chat-compare-confirm-address {
  margin-top: 3px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.4;
}

.chat-input-area {
  height: 100%;
  padding: 12px 16px 14px;
  background: var(--el-bg-color);
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
  color: var(--app-text-primary);
  font: inherit;
  font-size: 14px;
  line-height: 1.55;
  letter-spacing: 0;
  padding: 0;
}

.chat-composer-input::placeholder {
  color: var(--el-text-color-secondary);
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
  color: var(--el-text-color-placeholder);
  font-size: 12px;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-composer-send {
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.chat-composer-send:hover:not(.is-disabled) {
  transform: translateY(-1px);
}

.chat-composer-send.is-disabled {
  opacity: 0.28;
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
