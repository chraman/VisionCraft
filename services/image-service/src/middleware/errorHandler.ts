import type { Request, Response, NextFunction } from 'express';
import { isAppError } from '@ai-platform/types';
import { createLogger } from '@ai-platform/utils';

const logger = createLogger('image-service');

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const requestId = (res.locals['requestId'] as string) ?? 'unknown';

  if (isAppError(err)) {
    if (err.statusCode >= 500) {
      logger.error('Request error', {
        action: 'request_error',
        requestId,
        code: err.code,
        error: err.message,
        path: req.path,
      });
    }
    res.status(err.statusCode).json({
      success: false,
      error: err.toJSON(),
      requestId,
    });
    return;
  }

  logger.error('Unhandled error', {
    action: 'unhandled_error',
    requestId,
    error: err instanceof Error ? err.message : String(err),
    path: req.path,
  });

  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
    requestId,
  });
}
