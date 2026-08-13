import type { House } from '../house/house';
import type { AskSingleChoiceAction } from '../../api/chat/chat-api';

export interface ChatMessage {
  content: string;
  role: 'user' | 'assistant';
  houses?: House[];
  housesTitle?: string;
  compareHouses?: House[];
  choicePrompt?: AskSingleChoiceAction & {
    answeredValue?: string;
  };
  hidden?: boolean;
}
