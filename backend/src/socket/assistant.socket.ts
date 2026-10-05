import type { Server, Socket } from 'socket.io';
import { assistantService } from '../services/assistant.service';
import { assistantStateService } from '../assistant-state/assistant-state.service';
import { clapDetectorService } from '../clap-detector/clap-detector.service';
import { desktopService } from '../desktop/desktop.service';
import { logger } from '../utils/logger';
import type { AssistantStatus, ClientToServerEvents, ServerToClientEvents } from '../types';

const STATUSES: AssistantStatus[] = ['idle', 'activating', 'listening', 'processing', 'responding', 'speaking', 'error'];

/**
 * Realtime bidirectional communication for Assistant:
 * - State machine sync (AssistantOrb reactivity)
 * - Double-clap detection & background wake
 * - Welcome sequence coordination ("Welcome. I'm ready." -> "How can I help you?")
 * - Barge-in / Interruption handling
 * - Multi-turn conversational streaming
 */
export const setupAssistantSocket = (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>
): void => {
  const sessionId: string = socket.data.sessionId;

  // 1. Status synchronization
  socket.on('assistant:status', (data) => {
    const status = data?.status;
    if (!status || !STATUSES.includes(status)) return;
    assistantStateService.setStatus(sessionId, status);
    io.emit('assistant:status', { status });
  });

  // 2. Manual / External Activation Trigger
  socket.on('assistant:activate', async (data) => {
    const source = data?.source || 'socket';
    logger.info(`[Socket] Received activation request from ${socket.id} (${source})`);
    await assistantStateService.triggerActivation(sessionId, source);
  });

  // 3. Clap event from client-side local analyzer
  socket.on('assistant:clap-event', (data) => {
    const result = clapDetectorService.registerClapEvent(data?.timestamp, data?.confidence, 0.8);
    if (result.isDoubleClap) {
      void assistantStateService.triggerActivation(sessionId, 'client-double-clap');
    }
  });

  // 4. Barge-in / User Interruption
  socket.on('assistant:interrupt', () => {
    logger.info(`[Socket] User interrupted assistant playback (barge-in) from ${socket.id}`);
    assistantStateService.handleInterrupt(sessionId, 'user_barge_in');
  });

  // 5. Message processing
  socket.on('assistant:message', async (data) => {
    const message = (data?.message ?? '').trim();
    if (!message) return;

    try {
      assistantStateService.setStatus(sessionId, 'processing');
      io.emit('assistant:status', { status: 'processing' });

      const turn = await assistantService.handleMessage(sessionId, message, data?.conversationId);
      socket.emit('assistant:turn', turn);

      const nextStatus = turn.status === 'responding' ? 'responding' : turn.status;
      assistantStateService.setStatus(sessionId, nextStatus);
      io.emit('assistant:status', { status: nextStatus, conversationId: turn.conversationId });
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Something went wrong';
      logger.error('socket assistant turn failed', error);
      socket.emit('assistant:error', { error: text });
      assistantStateService.setStatus(sessionId, 'error');
      io.emit('assistant:status', { status: 'error' });
    }
  });

  // 6. Cancellation / Reset
  socket.on('assistant:cancel', () => {
    assistantStateService.setStatus(sessionId, 'idle');
    io.emit('assistant:status', { status: 'idle' });
  });

  // 7. Settings update
  socket.on('settings:update', (data) => {
    if (data.clapThreshold || data.clapMinGap || data.clapMaxGap || data.activationCooldown) {
      clapDetectorService.updateConfig({
        ...(data.clapThreshold ? { threshold: data.clapThreshold } : {}),
        ...(data.clapMinGap ? { minGapMs: data.clapMinGap } : {}),
        ...(data.clapMaxGap ? { maxGapMs: data.clapMaxGap } : {}),
        ...(data.activationCooldown ? { cooldownMs: data.activationCooldown } : {}),
      });
    }
  });

  // Send initial health & configuration
  socket.emit('system:health', assistantService.health());
};

// Global subscription to clap detection across all connected clients
clapDetectorService.onDoubleClap((result) => {
  const io = require('./socket').getIO();
  if (io) {
    io.emit('assistant:clap-detected', {
      count: 2,
      intervalMs: result.gapMs,
      confidence: result.confidence,
    });
    io.emit('assistant:activated', {
      timestamp: new Date().toISOString(),
      source: 'double-clap',
    });
  }
});

// Global subscription to activation events
assistantStateService.onActivation((sessionId, data) => {
  const io = require('./socket').getIO();
  if (io) {
    io.emit('assistant:activated', data);
  }
});

// Global subscription to welcome sequence steps
assistantStateService.onWelcomeSequence((sessionId, step, phrase, targetState) => {
  const io = require('./socket').getIO();
  if (io) {
    io.emit('assistant:welcome-sequence', { step, phrase, targetState });
  }
});

// Global subscription to interruption
assistantStateService.onInterrupt((sessionId, reason) => {
  const io = require('./socket').getIO();
  if (io) {
    io.emit('assistant:interrupted', { reason });
  }
});