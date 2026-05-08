import { env } from '../../config/env.js';
import type { House } from '../houses/domain/house.js';
import type { HouseService } from '../houses/house.service.js';
import { z } from 'zod';
import {
  houseAgentSearchFiltersSchema,
  type HouseAgentSearchFilters,
  type OpenAiHouseAgentSearchInput
} from './dto/agent-search.schema.js';

interface OpenAiChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

export interface AiHouseSearchResult {
  query: string;
  filters: HouseAgentSearchFilters;
  explanation?: string;
  steps: string[];
  houses: House[];
}

export class AgentSearchService {
  constructor(private readonly houseService: HouseService) {}

  searchHouses(filters: HouseAgentSearchFilters): House[] {
    return this.houseService.listHouses(filters);
  }

  async searchHousesWithOpenAi(input: OpenAiHouseAgentSearchInput): Promise<AiHouseSearchResult> {
    const parsed = await this.buildFiltersWithOpenAi(input.query);
    const filters = houseAgentSearchFiltersSchema.parse({
      ...parsed.filters,
      limit: input.limit
    });

    return {
      query: input.query,
      filters,
      explanation: parsed.explanation,
      steps: parsed.steps,
      houses: this.searchHouses(filters)
    };
  }

  private async buildFiltersWithOpenAi(
    query: string
  ): Promise<{ filters: HouseAgentSearchFilters; explanation?: string; steps: string[] }> {
    if (!env.openaiApiKey) {
      throw new AgentSearchConfigurationError('OPENAI_API_KEY is not configured');
    }

    const response = await fetch(`${env.openaiBaseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: env.openaiModel,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: [
              'You convert Chinese or English house-rental search requests into strict JSON filters.',
              'Return only a JSON object with keys: filters, explanation, steps.',
              'steps is a short public search-process summary, not hidden chain-of-thought. Use 2-5 concise Chinese phrases.',
              'filters may include: status, sourceChannel, q, keywords, minRentPrice, maxRentPrice, minBedroomCount, maxBedroomCount, minLivingRoomCount, maxLivingRoomCount, minBathroomCount, maxBathroomCount.',
              'Allowed status values: watching, interested, negotiating, abandoned, signed.',
              'Allowed sourceChannel values: beike, mini_program, anjuke, lianjia, offline_agent, other.',
              'Use q for one broad text search. Use keywords for concrete address, community, subway, contact note, or feature terms.',
              'Do not invent filters that are not implied by the user request.'
            ].join('\n')
          },
          {
            role: 'user',
            content: query
          }
        ]
      })
    });

    if (!response.ok) {
      throw new AgentSearchProviderError(`OpenAI search planning failed with ${response.status}`);
    }

    const payload = (await response.json()) as OpenAiChatCompletionResponse;
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new AgentSearchProviderError('OpenAI search planning returned empty content');
    }

    try {
      const parsed = JSON.parse(content) as unknown;
      return openAiSearchPlanSchema.parse(parsed);
    } catch (error) {
      throw new AgentSearchProviderError('OpenAI search planning returned invalid JSON', error);
    }
  }
}

export class AgentSearchConfigurationError extends Error {}

export class AgentSearchProviderError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
  }
}

const openAiSearchPlanSchema = z
  .object({
    filters: houseAgentSearchFiltersSchema.partial().optional(),
    explanation: z.string().optional(),
    steps: z.array(z.string().trim().min(1)).max(5).optional()
  })
  .transform((value) => {
    return {
      filters: houseAgentSearchFiltersSchema.parse(value.filters ?? {}),
      explanation: value.explanation,
      steps: value.steps ?? []
    };
  });
