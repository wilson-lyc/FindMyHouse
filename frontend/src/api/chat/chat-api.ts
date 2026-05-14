import { postData } from '../http';
import type { House, HouseForm } from '../../model/house/house';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  reply: string;
  houses: House[];
  actions: AgentFrontendAction[];
}

export interface ConfirmCreateHouseAction {
  id: string;
  type: 'confirm_create_house';
  title: string;
  payload: HouseForm;
}

export type AgentFrontendAction = ConfirmCreateHouseAction;

export type ConfirmCreateHouseResult =
  | { status: 'created'; house: House }
  | { status: 'cancelled' };

export function sendChatMessage(messages: ChatMessage[]) {
  return postData<ChatResponse, { messages: ChatMessage[] }>('/api/chat', { messages });
}
