import { postData } from '../http';
import type { House } from '../../model/house/house';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  reply: string;
  houses: House[];
}

export function sendChatMessage(messages: ChatMessage[]) {
  return postData<ChatResponse, { messages: ChatMessage[] }>('/api/chat', { messages });
}
