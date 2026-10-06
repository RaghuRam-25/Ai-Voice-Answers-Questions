import type { Response, NextFunction } from 'express';
import { assistantService } from '../services/assistant.service';
import { sessionIdOf } from '../middleware/session.middleware';
import { AppError } from '../utils/errors';
import type { ApiRequest, ApiResponse } from '../types';
import type { AssistantMessageInput, ConfirmInput } from '../validators/assistant.schema';

export const assistantController = {
  /** POST /api/assistant/message — voice transcript or typed text, same path. */
  async sendMessage(req: ApiRequest, res: Response<ApiResponse>, next: NextFunction): Promise<void> {
    const origin = req.headers.origin || req.headers.referer || req.headers.host || 'unknown';
    console.log(`[PROD] Request received`);
    console.log(`[PROD] Origin: ${origin}`);
    try {
      const sessionId = sessionIdOf(req);
      const { message, conversationId, language } = req.body as AssistantMessageInput;
      const turn = await assistantService.handleMessage(sessionId, message, conversationId, language);
      console.log(`[PROD] Response sent to frontend`);
      res.json({ success: true, data: turn });
    } catch (error) {
      console.error(`[PROD] Error processing request:`, error instanceof Error ? error.message : error);
      next(toAppError(error));
    }
  },

  /** POST /api/assistant/confirm — approve or decline a gated action. */
  async confirmAction(req: ApiRequest, res: Response<ApiResponse>, next: NextFunction): Promise<void> {
    try {
      const sessionId = sessionIdOf(req);
      const { confirmationId, approved } = req.body as ConfirmInput;
      const turn = await assistantService.confirm(sessionId, confirmationId, approved);
      res.json({ success: true, data: turn });
    } catch (error) {
      next(toAppError(error));
    }
  },

  async cancel(req: ApiRequest, res: Response<ApiResponse>): Promise<void> {
    const sessionId = sessionIdOf(req);
    assistantService.setStatus(sessionId, 'idle');
    res.json({ success: true, data: { status: 'idle' as const } });
  },
};

const toAppError = (error: unknown): AppError => {
  if (error instanceof AppError) return error;
  const message = error instanceof Error ? error.message : 'Request failed';
  const status = /expired|no longer valid/i.test(message) ? 409 : 500;
  return new AppError(status === 409 ? message : (error instanceof Error ? error.message : 'Failed to process the request'), status);
};