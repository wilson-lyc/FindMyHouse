import type { FastifyInstance } from 'fastify';
import { agentMessageSchema } from '@findmyhouse/contracts';
import { AgentService } from './agent.service.js';
import { getLlm } from '../langchain/llm.js';
import { SystemMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import { db } from '../../database/connection.js';
import { idParamsSchema } from '@findmyhouse/contracts';
import { ChatSessionRepository } from './chat-session.repository.js';
import { createChatSessionSchema, deleteChatSessionsSchema, updateChatSessionSchema } from '@findmyhouse/contracts';

const agentService = new AgentService();
const chatSessionRepository = new ChatSessionRepository(db);

export async function registerAgentRoutes(app: FastifyInstance) {
  app.get('/api/chat/sessions', async (_request, reply) => {
    return reply.ok(chatSessionRepository.list());
  });

  app.post('/api/chat/sessions', async (request, reply) => {
    const input = createChatSessionSchema.parse(request.body);
    const session = chatSessionRepository.create(input);
    return reply.created(session, '会话已创建');
  });

  app.get('/api/chat/sessions/:id', async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);
    const session = chatSessionRepository.findById(id);

    if (!session) {
      return reply.fail({ code: 404, message: '会话不存在', error: 'CHAT_SESSION_NOT_FOUND' });
    }

    return reply.ok(session);
  });

  app.patch('/api/chat/sessions/:id', async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);
    const input = updateChatSessionSchema.parse(request.body);
    const session = chatSessionRepository.update(id, input);

    if (!session) {
      return reply.fail({ code: 404, message: '会话不存在', error: 'CHAT_SESSION_NOT_FOUND' });
    }

    return reply.ok(session, '会话已更新');
  });

  app.delete('/api/chat/sessions/:id', async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);
    const deleted = chatSessionRepository.delete(id);

    if (!deleted) {
      return reply.fail({ code: 404, message: '会话不存在', error: 'CHAT_SESSION_NOT_FOUND' });
    }

    return reply.noContent();
  });

  app.post('/api/chat/sessions/batch-delete', async (request, reply) => {
    const { ids } = deleteChatSessionsSchema.parse(request.body);
    const deletedCount = chatSessionRepository.deleteMany(ids);
    return reply.ok({ deletedCount }, '批量删除完成');
  });

  app.post('/api/chat', async (request, reply) => {
    const { messages } = agentMessageSchema.parse(request.body);
    const result = await agentService.chat(messages);
    return reply.ok(result);
  });

  app.post('/api/chat/debug', async (request, reply) => {
    const { messages } = agentMessageSchema.parse(request.body);
    const llm = getLlm();
    const langchainMessages = [
      new SystemMessage('你是一个助手，回答要简短。'),
      ...messages.slice(0, -1).map((msg) =>
        msg.role === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content)
      ),
      new HumanMessage(messages[messages.length - 1].content),
    ];
    const response = await llm.invoke(langchainMessages);
    return reply.ok({
      content: typeof response.content === 'string' ? response.content : JSON.stringify(response.content),
      additional_kwargs: response.additional_kwargs,
      response_metadata: response.response_metadata,
      tool_calls: response.tool_calls,
    });
  });
}
