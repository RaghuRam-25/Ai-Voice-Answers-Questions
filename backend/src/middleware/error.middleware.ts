import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { env } from '../config/env';
import type { ApiResponse } from '../types';

export const notFoundMiddleware = (req: Request, res: Response<ApiResponse>): void => {
  res.status(404).json({
    success: false,
    error: `No route for ${req.method} ${req.path}`,
  });
};

export const errorMiddleware = (
  err: Error,
  _req: Request,
  res: Response<ApiResponse>,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, error: err.message });
    return;
  }

  // CORS rejections and JSON body errors arrive as plain errors.
  const message = err.message || 'Request failed';
  if (/origin .* is not allowed/i.test(message)) {
    res.status(403).json({ success: false, error: 'Origin not allowed' });
    return;
  }
  if (err.name === 'SyntaxError' && 'body' in err) {
    res.status(400).json({ success: false, error: 'Malformed JSON body' });
    return;
  }

  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: env.isProd ? 'Internal Server Error' : message,
  });
};