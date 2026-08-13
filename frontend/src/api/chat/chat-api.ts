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

export interface ConfirmUpdateHouseAction {
  id: string;
  type: 'confirm_update_house';
  title: string;
  houseId: string;
  payload: House;
}

export interface ConfirmDeleteHouseAction {
  id: string;
  type: 'confirm_delete_house';
  title: string;
  houseId: string;
  houseName: string;
}

export interface ShowHouseSearchResultsAction {
  id: string;
  type: 'show_house_search_results';
  title: string;
  houses: House[];
}

export interface ConfirmCompareHousesAction {
  id: string;
  type: 'confirm_compare_houses';
  title: string;
  houses: House[];
}

export interface AskSingleChoiceAction {
  id: string;
  type: 'ask_single_choice';
  title: string;
  question: string;
  options: Array<{
    id: string;
    label: string;
    value: string;
  }>;
  customOptionLabel: string;
}

export type AgentFrontendAction =
  | ConfirmCreateHouseAction
  | ConfirmUpdateHouseAction
  | ConfirmDeleteHouseAction
  | ShowHouseSearchResultsAction
  | ConfirmCompareHousesAction
  | AskSingleChoiceAction;

export type ConfirmCreateHouseResult =
  | { status: 'created'; house: House }
  | { status: 'cancelled' };

export type ConfirmUpdateHouseResult =
  | { status: 'updated'; house: House }
  | { status: 'cancelled' };

export type ConfirmDeleteHouseResult =
  | { status: 'deleted'; houseId: string }
  | { status: 'cancelled' };

export type ConfirmCompareHousesResult =
  | { status: 'confirmed'; houses: House[] }
  | { status: 'cancelled' };

export function sendChatMessage(messages: ChatMessage[]) {
  return postData<ChatResponse, { messages: ChatMessage[] }>('/api/chat', { messages });
}
