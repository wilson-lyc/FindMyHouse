import { ChatOpenAI } from '@langchain/openai';
import { env } from '../../config/env.js';

let llm: ChatOpenAI | null = null;

export function getLlm(): ChatOpenAI {
  if (llm) {
    return llm;
  }

  if (!env.openaiApiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  llm = new ChatOpenAI({
    model: env.openaiModel,
    temperature: env.openaiTemperature,
    apiKey: env.openaiApiKey,
    configuration: {
      baseURL: env.openaiBaseUrl,
    },
  });

  return llm;
}
