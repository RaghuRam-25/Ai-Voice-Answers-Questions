import { logger } from '../utils/logger';
import { desktopService } from '../desktop/desktop.service';
import type { AssistantStatus } from '../types';

export type StateChangeListener = (sessionId: string, status: AssistantStatus, extra?: Record<string, unknown>) => void;
export type ActivationListener = (sessionId: string, data: { source: string; timestamp: string }) => void;
export type WelcomeSequenceListener = (sessionId: string, step: number, phrase: string, targetState: AssistantStatus) => void;
export type InterruptListener = (sessionId: string, reason: string) => void;

export class AssistantStateService {
  private sessionStatuses = new Map<string, AssistantStatus>();
  private stateChangeListeners: StateChangeListener[] = [];
  private activationListeners: ActivationListener[] = [];
  private welcomeListeners: WelcomeSequenceListener[] = [];
  private interruptListeners: InterruptListener[] = [];

  public getStatus(sessionId: string): AssistantStatus {
    return this.sessionStatuses.get(sessionId) ?? 'idle';
  }

  public setStatus(sessionId: string, status: AssistantStatus, extra?: Record<string, unknown>): void {
    const previous = this.getStatus(sessionId);
    if (previous === status) return;

    this.sessionStatuses.set(sessionId, status);
    logger.info(`[AssistantState] ${sessionId} status: ${previous} -> ${status}`);

    for (const listener of this.stateChangeListeners) {
      try {
        listener(sessionId, status, extra);
      } catch (err) {
        logger.error('[AssistantState] Error in state listener:', err);
      }
    }
  }

  /**
   * Triggers the full double-clap / wake activation sequence:
   * 1. Brings Assistant window to foreground
   * 2. Sets state to 'activating'
   * 3. Executes welcome phrases: "Welcome. I'm ready." -> "How can I help you?"
   * 4. Transitions smoothly into 'listening'
   */
  public async triggerActivation(sessionId: string, source = 'double-clap'): Promise<void> {
    logger.info(`[AssistantState] Triggering activation for session ${sessionId} via ${source}`);

    // 1. Bring window to foreground on Windows desktop
    void desktopService.bringToForeground();

    // 2. Notify activation listeners
    const timestamp = new Date().toISOString();
    for (const listener of this.activationListeners) {
      try {
        listener(sessionId, { source, timestamp });
      } catch (err) {
        logger.error('[AssistantState] Error in activation listener:', err);
      }
    }

    // 3. Set activating state
    this.setStatus(sessionId, 'activating');

    // 4. Welcome Sequence Step 1: "স্বাগতম! আমি প্রস্তুত আছি।"
    for (const listener of this.welcomeListeners) {
      try {
        listener(sessionId, 1, 'স্বাগতম! আমি প্রস্তুত আছি।', 'speaking');
      } catch (err) {
        logger.error('[AssistantState] Error in welcome listener:', err);
      }
    }
  }

  /**
   * Handles user barge-in / interruption
   */
  public handleInterrupt(sessionId: string, reason = 'speech_detected'): void {
    const current = this.getStatus(sessionId);
    if (current === 'responding' || current === 'speaking' || current === 'activating') {
      logger.info(`[AssistantState] User interrupted assistant during ${current}. Switching immediately to listening.`);
      for (const listener of this.interruptListeners) {
        try {
          listener(sessionId, reason);
        } catch (err) {
          logger.error('[AssistantState] Error in interrupt listener:', err);
        }
      }
      this.setStatus(sessionId, 'listening');
    }
  }

  public onStateChange(listener: StateChangeListener): () => void {
    this.stateChangeListeners.push(listener);
    return () => {
      this.stateChangeListeners = this.stateChangeListeners.filter((l) => l !== listener);
    };
  }

  public onActivation(listener: ActivationListener): () => void {
    this.activationListeners.push(listener);
    return () => {
      this.activationListeners = this.activationListeners.filter((l) => l !== listener);
    };
  }

  public onWelcomeSequence(listener: WelcomeSequenceListener): () => void {
    this.welcomeListeners.push(listener);
    return () => {
      this.welcomeListeners = this.welcomeListeners.filter((l) => l !== listener);
    };
  }

  public onInterrupt(listener: InterruptListener): () => void {
    this.interruptListeners.push(listener);
    return () => {
      this.interruptListeners = this.interruptListeners.filter((l) => l !== listener);
    };
  }
}

export const assistantStateService = new AssistantStateService();
