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
