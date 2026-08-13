import { ChatOpenAI } from '@langchain/openai';
import { configService } from '../config/index.js';

let llm: ChatOpenAI | null = null;
let lastApiKey: string | undefined;
let lastBaseUrl: string | undefined;
let lastModel: string | undefined;
let lastTemperature: number | undefined;

export function getLlm(): ChatOpenAI {
  const apiKey = configService.getOpenaiApiKey();
  const baseUrl = configService.getOpenaiBaseUrl();
  const model = configService.getOpenaiModel();
  const temperature = configService.getOpenaiTemperature();

  if (
    llm &&
    lastApiKey === apiKey &&
    lastBaseUrl === baseUrl &&
    lastModel === model &&
    lastTemperature === temperature
  ) {
    return llm;
  }

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  llm = new ChatOpenAI({
    model,
    temperature,
    apiKey,
    configuration: {
      baseURL: baseUrl,
    },
  });

  lastApiKey = apiKey;
  lastBaseUrl = baseUrl;
  lastModel = model;
  lastTemperature = temperature;

  return llm;
}
