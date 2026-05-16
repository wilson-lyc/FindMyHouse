import type { FastifyInstance } from 'fastify';
import { agentMessageSchema } from './agent.schema.js';
import { AgentService } from './agent.service.js';
import { getLlm } from '../langchain/llm.js';
import { SystemMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import { db } from '../../database/connection.js';
import { idParamsSchema } from '../houses/dto/house.schema.js';
import { ChatSessionRepository } from './chat-session.repository.js';
import { createChatSessionSchema, deleteChatSessionsSchema, updateChatSessionSchema } from './chat-session.schema.js';

const agentService = new AgentService();
const chatSessionRepository = new ChatSessionRepository(db);

export async function registerAgentRoutes(app: FastifyInstance) {
  app.get('/api/chat/sessions', async () => {
    return { data: chatSessionRepository.list() };
  });

  app.post('/api/chat/sessions', async (request, reply) => {
    const input = createChatSessionSchema.parse(request.body);
    const session = chatSessionRepository.create(input);
    return reply.code(201).send({ data: session });
  });

  app.get('/api/chat/sessions/:id', async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);
    const session = chatSessionRepository.findById(id);

    if (!session) {
      return reply.code(404).send({ error: 'Chat session not found' });
    }

    return { data: session };
  });

  app.patch('/api/chat/sessions/:id', async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);
    const input = updateChatSessionSchema.parse(request.body);
    const session = chatSessionRepository.update(id, input);

    if (!session) {
      return reply.code(404).send({ error: 'Chat session not found' });
    }

    return { data: session };
  });

  app.delete('/api/chat/sessions/:id', async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);
    const deleted = chatSessionRepository.delete(id);

    if (!deleted) {
      return reply.code(404).send({ error: 'Chat session not found' });
    }

    return reply.code(204).send();
  });

  app.post('/api/chat/sessions/batch-delete', async (request) => {
    const { ids } = deleteChatSessionsSchema.parse(request.body);
    const deletedCount = chatSessionRepository.deleteMany(ids);
    return { data: { deletedCount } };
  });

  app.post('/api/chat', async (request, reply) => {
    const { messages } = agentMessageSchema.parse(request.body);
    const result = await agentService.chat(messages);
    return { data: result };
  });

  app.post('/api/chat/stream', async (request, reply) => {
    const { messages } = agentMessageSchema.parse(request.body);

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const sendEvent = (event: string, data: unknown) => {
      reply.raw.write(`event: ${event}\n`);
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      for await (const event of agentService.streamChat(messages)) {
        sendEvent(event.type, event);
      }
    } catch (error) {
      sendEvent('error', {
        type: 'error',
        message: error instanceof Error ? error.message : '请求失败',
      });
    } finally {
      reply.raw.end();
    }
  });

  app.post('/api/chat/debug', async (request) => {
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
