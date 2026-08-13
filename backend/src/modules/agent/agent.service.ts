import { AIMessage, BaseMessage } from '@langchain/core/messages';
import type { House } from '../houses/domain/house.js';
import type { AgentFrontendAction } from './agent.tools.js';
import { createAgentGraph, getLastAiMessage, responseContentToString, toLangChainMessages } from './agent.graph.js';

export interface AgentResult {
  reply: string;
  // 会话内用户关注过的房源累计（来自 state.interestedHouses）。
  houses: House[];
  // 前端地图当前聚焦的房源（来自 state.focusedHouse）。
  focusedHouse?: House;
  actions: AgentFrontendAction[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class AgentService {
  private readonly graph = createAgentGraph();

  async chat(messages: ChatMessage[]): Promise<AgentResult> {
    const result = await this.graph.invoke(
      { messages: toLangChainMessages(messages), interestedHouses: [], focusedHouse: undefined, actions: [] },
      { recursionLimit: 12 }
    );
    const lastAiMessage = getLastAiMessage(result.messages);

    return {
      reply: lastAiMessage ? responseContentToString(lastAiMessage.content) : '我暂时无法生成回复，请稍后再试。',
      houses: result.interestedHouses,
      focusedHouse: result.focusedHouse,
      actions: result.actions,
    };
  }
}
