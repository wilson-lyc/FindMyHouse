import { z } from 'zod';

export const chatMessageSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })
  ).min(1, '消息列表不能为空'),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
