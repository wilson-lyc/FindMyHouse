import { deleteData, getData, patchData, postData } from '../http';
import type { ChatMessage } from '../../model/chat/chat-message';

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatSessionSummary {
  id: string;
  title: string;
  messageCount: number;
  latestMessage: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeleteChatSessionsResult {
  deletedCount: number;
}

export function fetchChatSessions() {
  return getData<ChatSessionSummary[]>('/api/chat/sessions');
}

export function createChatSession(payload: { title?: string; messages?: ChatMessage[] }) {
  return postData<ChatSession, { title?: string; messages?: ChatMessage[] }>('/api/chat/sessions', payload);
}

export function fetchChatSession(id: string) {
  return getData<ChatSession>(`/api/chat/sessions/${id}`);
}

export function updateChatSession(id: string, payload: { title?: string; messages?: ChatMessage[] }) {
  return patchData<ChatSession, { title?: string; messages?: ChatMessage[] }>(`/api/chat/sessions/${id}`, payload);
}

export function deleteChatSession(id: string) {
  return deleteData(`/api/chat/sessions/${id}`);
}

export function deleteChatSessions(ids: string[]) {
  return postData<DeleteChatSessionsResult, { ids: string[] }>('/api/chat/sessions/batch-delete', { ids });
}
