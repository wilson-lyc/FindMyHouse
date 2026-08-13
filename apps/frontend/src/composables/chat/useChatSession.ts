import { computed, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  createChatSession,
  deleteChatSession,
  deleteChatSessions,
  fetchChatSession,
  fetchChatSessions,
  updateChatSession,
  type ChatSession,
  type ChatSessionSummary
} from '../../api/chat/chat-session-api';
import type { ChatMessage } from '../../model/chat/chat-message';

export function useChatSession() {
  const sessions = ref<ChatSessionSummary[]>([]);
  const sessionsLoading = ref(false);
  const selectedSessionIds = ref<string[]>([]);
  const currentSessionId = ref<string | null>(null);

  const hasSelectedSessions = computed(() => selectedSessionIds.value.length > 0);

  function createSessionTitle(content: string) {
    const title = content.trim().replace(/\s+/g, ' ');
    if (!title) return '新会话';
    return title.length > 24 ? `${title.slice(0, 24)}...` : title;
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

  async function persistCurrentSession(messages: ChatMessage[], titleSource?: string) {
    if (messages.length === 0) return;

    if (!currentSessionId.value) {
      const session = await createChatSession({
        title: titleSource ? createSessionTitle(titleSource) : undefined,
        messages
      });
      currentSessionId.value = session.id;
    } else {
      await updateChatSession(currentSessionId.value, {
        messages
      });
    }

    await loadSessions();
  }

  async function restoreSession(id: string): Promise<ChatSession> {
    const session = await fetchChatSession(id);
    currentSessionId.value = session.id;
    return session;
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
      }

      selectedSessionIds.value = [];
      await loadSessions();
      ElMessage.success('已删除选中会话');
    } catch {
      // User cancelled.
    }
  }

  function handleSessionSelectionChange(selection: ChatSessionSummary[]) {
    selectedSessionIds.value = selection.map((session) => session.id);
  }

  function startNewSession() {
    currentSessionId.value = null;
  }

  return {
    sessions,
    sessionsLoading,
    selectedSessionIds,
    currentSessionId,
    hasSelectedSessions,
    loadSessions,
    createSessionTitle,
    persistCurrentSession,
    restoreSession,
    removeSession,
    removeSelectedSessions,
    handleSessionSelectionChange,
    startNewSession
  };
}
