import type { FastifyInstance } from 'fastify';
import { db } from '../../database/connection.js';
import { HouseRepository } from '../houses/house.repository.js';
import { HouseService } from '../houses/house.service.js';
import {
  AgentSearchConfigurationError,
  AgentSearchProviderError,
  AgentSearchService
} from './agent-search.service.js';
import { directHouseAgentSearchSchema, openAiHouseAgentSearchSchema } from './dto/agent-search.schema.js';

const houseService = new HouseService(new HouseRepository(db));
const agentSearchService = new AgentSearchService(houseService);

export async function registerAgentRoutes(app: FastifyInstance) {
  app.post('/api/agent/houses/search', async (request) => {
    const input = directHouseAgentSearchSchema.parse(request.body);
    return { data: agentSearchService.searchHouses(input.filters) };
  });

  app.post('/api/agent/houses/search/openai', async (request, reply) => {
    const input = openAiHouseAgentSearchSchema.parse(request.body);
    try {
      return { data: await agentSearchService.searchHousesWithOpenAi(input) };
    } catch (error) {
      if (error instanceof AgentSearchConfigurationError) {
        return reply.code(503).send({ error: error.message });
      }

      if (error instanceof AgentSearchProviderError) {
        return reply.code(502).send({ error: error.message });
      }

      throw error;
    }
  });
}
