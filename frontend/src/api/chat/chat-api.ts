import { postData } from '../http';
import type { House, HouseForm } from '../../model/house/house';
import type { Location, LocationForm } from '../../model/location/location';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  reply: string;
  houses: House[];
  actions: AgentFrontendAction[];
}

export type ChatStreamEvent =
  | { type: 'reasoning_delta'; delta: string }
  | { type: 'delta'; delta: string }
  | { type: 'status'; message: string }
  | ({ type: 'done' } & ChatResponse)
  | { type: 'error'; message: string };

export interface ConfirmCreateHouseAction {
  id: string;
  type: 'confirm_create_house';
  title: string;
  payload: HouseForm;
}

export interface ConfirmCreateLocationAction {
  id: string;
  type: 'confirm_create_location';
  title: string;
  payload: LocationForm;
}

export interface ShowHouseSearchResultsAction {
  id: string;
  type: 'show_house_search_results';
  title: string;
  houses: House[];
}

export interface ShowLocationSearchResultsAction {
  id: string;
  type: 'show_location_search_results';
  title: string;
  locations: Location[];
}

export type AgentFrontendAction = ConfirmCreateHouseAction | ConfirmCreateLocationAction | ShowHouseSearchResultsAction | ShowLocationSearchResultsAction;

export type ConfirmCreateHouseResult =
  | { status: 'created'; house: House }
  | { status: 'cancelled' };

export type ConfirmCreateLocationResult =
  | { status: 'created'; location: Location }
  | { status: 'cancelled' };

export function sendChatMessage(messages: ChatMessage[]) {
  return postData<ChatResponse, { messages: ChatMessage[] }>('/api/chat', { messages });
}

export async function streamChatMessage(messages: ChatMessage[], onEvent: (event: ChatStreamEvent) => void) {
  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ messages })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }

  if (!response.body) {
    throw new Error('浏览器不支持流式响应');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });

    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';

    for (const part of parts) {
      const dataLine = part.split('\n').find((line) => line.startsWith('data: '));
      if (!dataLine) continue;

      onEvent(JSON.parse(dataLine.slice(6)) as ChatStreamEvent);
    }

    if (done) break;
  }
}
