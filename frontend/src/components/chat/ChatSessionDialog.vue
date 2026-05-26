<script setup lang="ts">
import { Delete } from '@element-plus/icons-vue';
import type { ChatSessionSummary } from '../../api/chat/chat-session-api';

const props = defineProps<{
  visible: boolean;
  sessions: ChatSessionSummary[];
  sessionsLoading: boolean;
  hasSelectedSessions: boolean;
  selectedSessionIds: string[];
  shareGenerating?: boolean;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  restoreSession: [id: string];
  shareSession: [id: string];
  removeSession: [id: string];
  removeSelectedSessions: [];
  selectionChange: [selection: ChatSessionSummary[]];
}>();

function formatSessionTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function handleSelectionChange(selection: ChatSessionSummary[]) {
  emit('selectionChange', selection);
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    title="管理会话"
    width="860px"
    class="chat-session-dialog"
    @update:model-value="(v: boolean) => emit('update:visible', v)"
  >
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
          @click="emit('removeSelectedSessions')"
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
      @selection-change="handleSelectionChange"
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
          <el-button link type="primary" @click="emit('restoreSession', row.id)">恢复</el-button>
          <el-button
            link
            type="primary"
            :disabled="shareGenerating"
            @click="emit('shareSession', row.id)"
          >
            分享
          </el-button>
          <el-button link type="danger" @click="emit('removeSession', row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-dialog>
</template>

<style scoped>
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
</style>
