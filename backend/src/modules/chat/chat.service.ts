import { AgentService, type AgentResult } from './agent.service.js';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const agentService = new AgentService();

export class ChatService {
  async chat(messages: ChatMessage[]): Promise<AgentResult> {
    return agentService.chat(messages);
  }
}
