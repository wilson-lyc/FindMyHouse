import type { FastifyInstance } from 'fastify';
import { chatMessageSchema } from './chat.schema.js';
import { ChatService } from './chat.service.js';
import { getLlm } from '../langchain/llm.js';
import { SystemMessage, HumanMessage, AIMessage } from '@langchain/core/messages';

const chatService = new ChatService();

export async function registerChatRoutes(app: FastifyInstance) {
  app.post('/api/chat', async (request, reply) => {
    const { messages } = chatMessageSchema.parse(request.body);
    const result = await chatService.chat(messages);
    return { data: result };
  });

  app.post('/api/chat/debug', async (request) => {
    const { messages } = chatMessageSchema.parse(request.body);
    const llm = getLlm();
    const langchainMessages = [
      new SystemMessage('你是一个助手，回答要简短。'),
      ...messages.slice(0, -1).map((msg) =>
        msg.role === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content)
      ),
      new HumanMessage(messages[messages.length - 1].content),
    ];
    const response = await llm.invoke(langchainMessages);
    return {
      data: {
        content: typeof response.content === 'string' ? response.content : JSON.stringify(response.content),
        additional_kwargs: response.additional_kwargs,
        response_metadata: response.response_metadata,
        tool_calls: response.tool_calls,
      }
    };
  });
}
