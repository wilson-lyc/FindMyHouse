import type { FastifyReply, FastifyInstance } from 'fastify';

/**
 * 统一 REST 风格 JSON 响应结构。
 *
 * 成功响应:
 *   { success: true, code: number, message: string, data?: T }
 * 失败响应:
 *   { success: false, code: number, message: string, error?: string, details?: unknown }
 *
 * - code 与 HTTP 状态码保持一致
 * - 成功时 data 携带业务数据,message 为可读提示
 * - 失败时 error 为机器可读错误码,details 携带校验等附加信息
 * - 204 No Content 不含 data 字段
 */
export interface ApiSuccess<T> {
  success: true;
  code: number;
  message: string;
  data: T;
}

export interface ApiSuccessNoContent {
  success: true;
  code: 204;
  message: string;
}

export interface ApiError {
  success: false;
  code: number;
  message: string;
  error?: string;
  details?: unknown;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiSuccessNoContent | ApiError;

/** reply 上注入的便捷方法类型声明。 */
declare module 'fastify' {
  interface FastifyReply {
    /** 200 OK:返回业务数据。 */
    ok<T>(data: T, message?: string): FastifyReply;
    /** 201 Created:返回新建的资源。 */
    created<T>(data: T, message?: string): FastifyReply;
    /** 204 No Content:无响应体。 */
    noContent(message?: string): FastifyReply;
    /** 返回失败响应,HTTP 状态码由 code 决定。 */
    fail(options: {
      code: number;
      message: string;
      error?: string;
      details?: unknown;
    }): FastifyReply;
  }
}

function sendJson(reply: FastifyReply, code: number, payload: object): FastifyReply {
  return reply.code(code).send(payload);
}

/** 为 FastifyReply 注册统一的响应便捷方法。 */
export function registerReplyHelpers(app: FastifyInstance): void {
  app.decorateReply('ok', function (data: unknown, message = 'OK') {
    return sendJson(this, 200, { success: true, code: 200, message, data });
  });

  app.decorateReply('created', function (data: unknown, message = 'Created') {
    return sendJson(this, 201, { success: true, code: 201, message, data });
  });

  app.decorateReply('noContent', function (message = 'No Content') {
    return sendJson(this, 204, { success: true, code: 204, message });
  });

  app.decorateReply('fail', function (options: {
    code: number;
    message: string;
    error?: string;
    details?: unknown;
  }) {
    const { code, message, error, details } = options;
    const payload: ApiError = { success: false, code, message };
    if (error !== undefined) payload.error = error;
    if (details !== undefined) payload.details = details;
    return sendJson(this, code, payload);
  });
}
