import type { ChatSessionMessage } from '@findmyhouse/contracts';

export type { ChatSessionMessage };

/** 聊天消息实体(前端展示用,与契约 ChatSessionMessage 结构一致)。 */
export interface ChatMessage {
  content: string;
  role: 'user' | 'assistant';
  houses?: import('../house/house').House[];
  housesTitle?: string;
  compareHouses?: import('../house/house').House[];
  choicePrompt?: {
    id: string;
    type: 'ask_single_choice';
    title: string;
    question: string;
    options: { id: string; label: string; value: string }[];
    customOptionLabel: string;
    answeredValue?: string;
  };
  hidden?: boolean;
}
