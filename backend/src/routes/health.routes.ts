import { Router, type Request, type Response } from 'express';
import { assistantService } from '../services/assistant.service';
import { sessionIdOf } from '../middleware/session.middleware';
import type { ApiRequest, ApiResponse, SystemHealth } from '../types';

const router = Router();

router.get('/', (_req: Request, res: Response<ApiResponse<SystemHealth>>) => {
  res.json({ success: true, data: assistantService.health() });
});

/** Cheap liveness probe used by the client to detect real connectivity. */
router.get('/ping', (_req: Request, res: Response<ApiResponse>) => {
  res.json({ success: true, data: { pong: true, serverTime: new Date().toISOString() } });
});

/** Conversation history for the current session. */
router.get('/conversations', (req: ApiRequest, res: Response<ApiResponse>) => {
  res.json({ success: true, data: assistantService.listConversations(sessionIdOf(req)) });
});

router.get('/conversations/:id', (req: ApiRequest, res: Response<ApiResponse>) => {
  const conversation = assistantService.getConversation(sessionIdOf(req), String(req.params.id));
  if (!conversation) {
    res.status(404).json({ success: false, error: 'Conversation not found' });
    return;
  }
  res.json({ success: true, data: conversation });
});

router.delete('/conversations/:id', (req: ApiRequest, res: Response<ApiResponse>) => {
  const removed = assistantService.deleteConversation(sessionIdOf(req), String(req.params.id));
  res.status(removed ? 200 : 404).json({
    success: removed,
    ...(removed ? {} : { error: 'Conversation not found' }),
  });
});

export default router;