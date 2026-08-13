import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.fail({
        code: 400,
        message: '请求参数校验失败',
        error: 'VALIDATION_FAILED',
        details: error.issues
      });
    }

    app.log.error(error);

    const statusCode = typeof error === 'object' && error !== null && 'statusCode' in error
      ? (error as { statusCode?: number }).statusCode ?? 500
      : 500;
    const message =
      statusCode >= 500
        ? '服务器内部错误'
        : (typeof error === 'object' && error !== null && 'message' in error
            ? (error as { message?: string }).message
            : undefined) || '请求处理失败';
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error
        ? (error as { code?: string }).code
        : undefined;

    return reply.fail({
      code: statusCode,
      message,
      error: errorCode ?? 'INTERNAL_ERROR'
    });
  });
}
