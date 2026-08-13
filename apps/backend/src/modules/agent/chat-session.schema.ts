import { z } from 'zod';
import { idParamsSchema } from '../houses/dto/house.schema.js';

const chatSessionMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  reasoning: z.string().optional(),
  houses: z.array(z.unknown()).optional(),
  housesTitle: z.string().optional(),
  choicePrompt: z.object({
    id: z.string(),
    type: z.literal('ask_single_choice'),
    title: z.string(),
    question: z.string(),
    options: z.array(z.object({
      id: z.string(),
      label: z.string(),
      value: z.string(),
    })).min(2).max(5),
    customOptionLabel: z.string(),
    answeredValue: z.string().optional(),
  }).optional(),
  hidden: z.boolean().optional(),
});

export const createChatSessionSchema = z.object({
  title: z.string().trim().min(1).optional(),
  messages: z.array(chatSessionMessageSchema).default([]),
});

export const updateChatSessionSchema = z.object({
  title: z.string().trim().min(1).optional(),
  messages: z.array(chatSessionMessageSchema).optional(),
});

export const deleteChatSessionsSchema = z.object({
  ids: z.array(idParamsSchema.shape.id).min(1),
});

export type ChatSessionMessage = z.infer<typeof chatSessionMessageSchema>;
export type CreateChatSessionInput = z.infer<typeof createChatSessionSchema>;
export type UpdateChatSessionInput = z.infer<typeof updateChatSessionSchema>;
