import { env } from '../config/env';
import { logger } from '../utils/logger';
import { audioService } from '../audio/audio.service';
import type { ClapDetectorConfig, ClapDetectionResult } from '../types';

export class ClapDetectorService {
  private config: ClapDetectorConfig;
  private firstClapTimestamp: number | null = null;
  private lastActivationTimestamp = 0;
  private resetTimer: NodeJS.Timeout | null = null;
  private onDoubleClapListeners: Array<(result: ClapDetectionResult) => void> = [];

  constructor() {
    this.config = {
      threshold: env.CLAP_THRESHOLD,
      minGapMs: env.CLAP_MIN_GAP,
      maxGapMs: env.CLAP_MAX_GAP,
      cooldownMs: env.ACTIVATION_COOLDOWN,
      microphoneDevice: env.MICROPHONE_DEVICE,
    };
  }

  public getConfig(): ClapDetectorConfig {
    return { ...this.config };
  }

  public updateConfig(partial: Partial<ClapDetectorConfig>): ClapDetectorConfig {
    this.config = {
      ...this.config,
      ...partial,
    };
    logger.info('[ClapDetector] Configuration updated:', this.config);
    return this.getConfig();
  }

  public onDoubleClap(listener: (result: ClapDetectionResult) => void): () => void {
    this.onDoubleClapListeners.push(listener);
    return () => {
      this.onDoubleClapListeners = this.onDoubleClapListeners.filter((l) => l !== listener);
    };
  }

  /**
   * Process an audio frame directly (PCM samples)
   */
  public processAudioBuffer(samples: Float32Array | number[]): ClapDetectionResult {
    const analysis = audioService.analyzeFrame(samples, this.config.threshold);
    if (!analysis.isSpike) {
      return {
        isClap: false,
        isDoubleClap: false,
        confidence: 0,
        energy: analysis.peak,
        timestamp: Date.now(),
      };
    }

    return this.registerClapEvent(Date.now(), Math.min(1, analysis.transientScore), analysis.peak);
  }

  /**
   * Registers a detected clap event (from client audio worklet, desktop host, or server analyzer)
   */
  public registerClapEvent(
    now = Date.now(),
    confidence = 0.9,
    energy = 0.8
  ): ClapDetectionResult {
    // 1. Cooldown check
    if (now - this.lastActivationTimestamp < this.config.cooldownMs) {
      logger.debug('[ClapDetector] Clap ignored due to cooldown protection');
      return {
        isClap: true,
        isDoubleClap: false,
        confidence,
        energy,
        timestamp: now,
      };
    }

    // 2. First clap check
    if (this.firstClapTimestamp === null) {
      this.firstClapTimestamp = now;
      logger.info('[ClapDetector] First clap detected! Waiting for second clap...');

      if (this.resetTimer) clearTimeout(this.resetTimer);
      this.resetTimer = setTimeout(() => {
        if (this.firstClapTimestamp === now) {
          logger.debug('[ClapDetector] Second clap timeout expired. Resetting.');
          this.firstClapTimestamp = null;
        }
      }, this.config.maxGapMs + 50);

      return {
        isClap: true,
        isDoubleClap: false,
        confidence,
        energy,
        timestamp: now,
      };
    }

    // 3. Second clap check
    const gapMs = now - this.firstClapTimestamp;

    // Discard echo / mechanical bounce
    if (gapMs < this.config.minGapMs) {
      logger.debug(`[ClapDetector] Clap ignored: gap too short (${gapMs}ms < ${this.config.minGapMs}ms)`);
      return {
        isClap: true,
        isDoubleClap: false,
        confidence,
        energy,
        timestamp: now,
        gapMs,
      };
    }

    // Valid double-clap window!
    if (gapMs <= this.config.maxGapMs) {
      if (this.resetTimer) clearTimeout(this.resetTimer);
      this.firstClapTimestamp = null;
      this.lastActivationTimestamp = now;

      logger.info(`[ClapDetector] ✅ DOUBLE CLAP ACTIVATION DETECTED! Gap: ${gapMs}ms, Confidence: ${confidence.toFixed(2)}`);

      const result: ClapDetectionResult = {
        isClap: true,
        isDoubleClap: true,
        confidence: Math.max(0.85, confidence),
        energy,
        timestamp: now,
        gapMs,
      };

      // Notify listeners
      for (const listener of this.onDoubleClapListeners) {
        try {
          listener(result);
        } catch (err) {
          logger.error('[ClapDetector] Error in listener:', err);
        }
      }

      return result;
    }

    // Gap was too large (> maxGapMs): this clap becomes the new first clap
    this.firstClapTimestamp = now;
    logger.info('[ClapDetector] Gap was too large. Restarting sequence with current clap as 1st clap.');

    if (this.resetTimer) clearTimeout(this.resetTimer);
    this.resetTimer = setTimeout(() => {
      if (this.firstClapTimestamp === now) {
        this.firstClapTimestamp = null;
      }
    }, this.config.maxGapMs + 50);

    return {
      isClap: true,
      isDoubleClap: false,
      confidence,
      energy,
      timestamp: now,
    };
  }

  public reset(): void {
    if (this.resetTimer) clearTimeout(this.resetTimer);
    this.firstClapTimestamp = null;
  }
}

export const clapDetectorService = new ClapDetectorService();
