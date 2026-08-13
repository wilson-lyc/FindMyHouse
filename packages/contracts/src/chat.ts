import { z } from 'zod';
import { idParamsSchema } from './house.js';
import type { IdParams } from './house.js';

/** 聊天角色枚举(前后端共享)。 */
export const chatRoles = ['user', 'assistant'] as const;
export type ChatRole = (typeof chatRoles)[number];

/** 聊天消息实体(响应 DTO)。 */
export const chatMessageSchema = z.object({
  role: z.enum(chatRoles),
  content: z.string()
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;

/** 会话内消息(含推理/房源等扩展字段,响应 DTO)。 */
export const chatSessionMessageSchema = z.object({
  role: z.enum(chatRoles),
  content: z.string(),
  reasoning: z.string().optional(),
  houses: z.array(z.unknown()).optional(),
  housesTitle: z.string().optional(),
  choicePrompt: z
    .object({
      id: z.string(),
      type: z.literal('ask_single_choice'),
      title: z.string(),
      question: z.string(),
      options: z
        .array(
          z.object({
            id: z.string(),
            label: z.string(),
            value: z.string()
          })
        )
        .min(2)
        .max(5),
      customOptionLabel: z.string(),
      answeredValue: z.string().optional()
    })
    .optional(),
  hidden: z.boolean().optional()
});
export type ChatSessionMessage = z.infer<typeof chatSessionMessageSchema>;

/** 聊天会话实体(响应 DTO)。 */
export interface ChatSession {
  id: string;
  title: string;
  messages: ChatSessionMessage[];
  createdAt: string;
  updatedAt: string;
}

/** 聊天请求(请求 DTO)。 */
export const agentMessageSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(chatRoles),
        content: z.string()
      })
    )
    .min(1, '消息列表不能为空')
});
export type AgentMessageInput = z.infer<typeof agentMessageSchema>;

/** 创建聊天会话请求(请求 DTO)。 */
export const createChatSessionSchema = z.object({
  title: z.string().trim().min(1).optional(),
  messages: z.array(chatSessionMessageSchema).default([])
});
export type CreateChatSessionInput = z.infer<typeof createChatSessionSchema>;

/** 更新聊天会话请求(请求 DTO)。 */
export const updateChatSessionSchema = z.object({
  title: z.string().trim().min(1).optional(),
  messages: z.array(chatSessionMessageSchema).optional()
});
export type UpdateChatSessionInput = z.infer<typeof updateChatSessionSchema>;

/** 批量删除聊天会话请求(请求 DTO)。 */
export const deleteChatSessionsSchema = z.object({
  ids: z.array(idParamsSchema.shape.id).min(1)
});
export type DeleteChatSessionsInput = z.infer<typeof deleteChatSessionsSchema>;

export { idParamsSchema };
export type { IdParams };
