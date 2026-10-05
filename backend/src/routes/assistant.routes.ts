import { Router, type Response } from 'express';
import { assistantController } from '../controllers/assistant.controller';
import { assistantService } from '../services/assistant.service';
import { assistantStateService } from '../assistant-state/assistant-state.service';
import { clapDetectorService } from '../clap-detector/clap-detector.service';
import { speechService } from '../speech/speech.service';
import { ttsService } from '../tts/tts.service';
import { desktopService } from '../desktop/desktop.service';
import { commandService } from '../commands/command.service';
import { providerCatalogue } from '../ai/providers/provider.registry';
import { sessionIdOf } from '../middleware/session.middleware';
import { validate } from '../middleware/validate.middleware';
import { assistantLimiter } from '../middleware/rateLimit.middleware';
import { assertSafePayload } from '../middleware/session.middleware';
import { assistantMessageSchema, confirmSchema } from '../validators/assistant.schema';
import type { ApiRequest, ApiResponse, AssistantStatus } from '../types';

const router = Router();

const STATUSES: AssistantStatus[] = ['idle', 'activating', 'listening', 'processing', 'responding', 'speaking', 'error'];

/* ── engine + status ────────────────────────────────────────── */

router.get('/status', (req: ApiRequest, res: Response<ApiResponse>) => {
  const sessionId = sessionIdOf(req);
  res.json({
    success: true,
    data: {
      status: assistantStateService.getStatus(sessionId),
      engine: providerCatalogue.active,
      providers: providerCatalogue.available,
      usingFallback: providerCatalogue.usingFallback,
      requestedProvider: providerCatalogue.requested,
      clapDetector: clapDetectorService.getConfig(),
    },
  });
});

router.post('/status', (req: ApiRequest, res: Response<ApiResponse>) => {
  const sessionId = sessionIdOf(req);
  const status = (req.body as { status?: AssistantStatus })?.status;
  if (!status || !STATUSES.includes(status)) {
    res.status(400).json({ success: false, error: 'Unsupported status' });
    return;
  }
  assistantStateService.setStatus(sessionId, status);
  res.json({ success: true, data: { status } });
});

/* ── double-clap & activation ────────────────────────────────── */

router.post('/activate', async (req: ApiRequest, res: Response<ApiResponse>) => {
  const sessionId = sessionIdOf(req);
  const source = (req.body as { source?: string })?.source || 'api';
  await assistantStateService.triggerActivation(sessionId, source);
  res.json({
    success: true,
    data: {
      status: 'activating',
      message: 'Activation sequence initiated',
    },
  });
});

router.post('/clap', (req: ApiRequest, res: Response<ApiResponse>) => {
  const sessionId = sessionIdOf(req);
  const body = req.body as { timestamp?: number; confidence?: number; energy?: number };
  const result = clapDetectorService.registerClapEvent(body.timestamp, body.confidence, body.energy);

  if (result.isDoubleClap) {
    void assistantStateService.triggerActivation(sessionId, 'double-clap');
  }

  res.json({
    success: true,
    data: result,
  });
});

router.get('/config', (_req: ApiRequest, res: Response<ApiResponse>) => {
  res.json({
    success: true,
    data: {
      clap: clapDetectorService.getConfig(),
      sttProvider: speechService.getProvider(),
      ttsProvider: ttsService.getProvider(),
    },
  });
});

router.post('/config', (req: ApiRequest, res: Response<ApiResponse>) => {
  const body = req.body as { clap?: Record<string, unknown> };
  if (body.clap) {
    const updated = clapDetectorService.updateConfig(body.clap);
    res.json({ success: true, data: { clap: updated } });
    return;
  }
  res.json({ success: true, data: {} });
});

/* ── desktop window focus ───────────────────────────────────── */

router.post('/foreground', async (_req: ApiRequest, res: Response<ApiResponse>) => {
  const brought = await desktopService.bringToForeground();
  res.json({ success: true, data: { broughtToForeground: brought } });
});

/* ── speech & tts endpoints ─────────────────────────────────── */

router.post('/tts/synthesize', async (req: ApiRequest, res: Response) => {
  try {
    const text = String((req.body as { text?: string })?.text || '').trim();
    if (!text) {
      res.status(400).json({ success: false, error: 'Missing text parameter' });
      return;
    }
    const result = await ttsService.synthesize({ text });
    if (result.audioBuffer) {
      res.setHeader('Content-Type', result.mimeType || 'audio/mpeg');
      res.send(result.audioBuffer);
      return;
    }
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

/* ── command catalogue ──────────────────────────────────────── */

router.get('/commands', (_req: ApiRequest, res: Response<ApiResponse>) => {
  res.json({ success: true, data: commandService.catalog() });
});

router.get('/commands/:name', (req: ApiRequest, res: Response<ApiResponse>) => {
  const needle = String(req.params.name).replace(/_/g, ' ').toLowerCase();
  const [command] = commandService
    .catalog()
    .filter((c) => c.name === needle || c.name.replace(/_/g, ' ').toLowerCase() === needle);
  if (!command) {
    res.status(404).json({ success: false, error: 'Unknown command' });
    return;
  }
  res.json({ success: true, data: command });
});

/* ── conversation ──────────────────────────────────────────── */

router.post(
  '/message',
  assistantLimiter,
  validate(assistantMessageSchema),
  (req, res, next) => {
    assertSafePayload(req.body);
    next();
  },
  assistantController.sendMessage
);

router.post('/confirm', assistantLimiter, validate(confirmSchema), assistantController.confirmAction);

router.post('/cancel', assistantController.cancel);

export default router;