'use client';

/**
 * Unified Shared Audio Manager
 * Provides a single, high-performance audio engine across the entire application:
 * - Single shared AudioContext (prevents WASAPI device lock on Windows)
 * - Single shared MediaStream (prevents multiple getUserMedia microphone contention)
 * - Instant STT and pre-warmed SpeechSynthesis
 * - Zero blocking startup delay (instant UI boot)
 */

type ClapCallback = (result: { confidence: number; gapMs: number; timestamp: number }) => void;

class AudioManager {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private isMicPermissionGranted = false;
  private isInitializing = false;

  // Visualizer Analyser
  private visualizerAnalyser: AnalyserNode | null = null;
  private visualizerFrameId: number | null = null;
  private visualizerListeners = new Set<(level: number, waveform: number[]) => void>();

  // Double-Clap Detector
  private clapAnalyser: AnalyserNode | null = null;
  private clapFilter: BiquadFilterNode | null = null;
  private clapFrameId: number | null = null;
  private firstClapTime: number | null = null;
  private lastActivationTime = 0;
  private resetTimer: NodeJS.Timeout | null = null;
  private onDoubleClapCallback: ClapCallback | null = null;

  // Performance timestamps
  public bootTimestamps: Record<string, number> = {};

  constructor() {
    if (typeof window !== 'undefined') {
      this.bootTimestamps['[BOOT] App started'] = performance.now();
      // Pre-warm SpeechSynthesis in background immediately
      this.prewarmTTS();
    }
  }

  public prewarmTTS() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.getVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.getVoices();
        };
      }
      this.bootTimestamps['[VOICE] TTS ready'] = performance.now();
      console.log('[VOICE] TTS pre-warmed and ready');
    } catch {}
  }

  public async getAudioContext(): Promise<AudioContext | null> {
    if (typeof window === 'undefined') return null;
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) return null;

    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.audioContext = new AudioContextClass();
    }

    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch {}
    }

    return this.audioContext;
  }

  public async initMicrophone(): Promise<MediaStream | null> {
    if (this.mediaStream && this.mediaStream.active) {
      return this.mediaStream;
    }

    if (this.isInitializing) {
      // Wait for ongoing init
      while (this.isInitializing) {
        await new Promise((r) => setTimeout(r, 50));
      }
      if (this.mediaStream && this.mediaStream.active) return this.mediaStream;
    }

    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return null;
    }

    this.isInitializing = true;
    const startMs = performance.now();
    console.log('[VOICE] Initialization started');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.mediaStream = stream;
      this.isMicPermissionGranted = true;

      const ctx = await this.getAudioContext();
      if (ctx) {
        if (this.sourceNode) {
          try {
            this.sourceNode.disconnect();
          } catch {}
        }
        this.sourceNode = ctx.createMediaStreamSource(stream);
        this.setupVisualizer(ctx, this.sourceNode);
        this.setupClapDetector(ctx, this.sourceNode);
      }

      this.bootTimestamps['[VOICE] Microphone ready'] = performance.now();
      console.log(`[VOICE] Microphone ready in ${(performance.now() - startMs).toFixed(0)}ms`);
      return stream;
    } catch (err) {
      console.warn('[VOICE] Microphone permission not yet granted or denied:', err);
      return null;
    } finally {
      this.isInitializing = false;
    }
  }

  public isMicActive(): boolean {
    return Boolean(this.mediaStream && this.mediaStream.active && this.isMicPermissionGranted);
  }

  private setupVisualizer(ctx: AudioContext, source: MediaStreamAudioSourceNode) {
    if (this.visualizerAnalyser) return;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.75;
    source.connect(analyser);
    this.visualizerAnalyser = analyser;

    const frequencyData = new Uint8Array(analyser.frequencyBinCount);
    const timeData = new Uint8Array(analyser.fftSize);

    const tick = () => {
      if (!this.visualizerAnalyser || this.visualizerListeners.size === 0) {
        this.visualizerFrameId = requestAnimationFrame(tick);
        return;
      }

      this.visualizerAnalyser.getByteFrequencyData(frequencyData);
      this.visualizerAnalyser.getByteTimeDomainData(timeData);

      let total = 0;
      for (let i = 0; i < timeData.length; i++) {
        const centered = (timeData[i] - 128) / 128;
        total += centered * centered;
      }
      const rms = Math.min(1, Math.sqrt(total / timeData.length) * 2.8);
      const waveform = Array.from({ length: 32 }, (_, index) => {
        const sourceIndex = Math.floor((index / 32) * frequencyData.length);
        return Math.min(1, frequencyData[sourceIndex] / 255);
      });

      this.visualizerListeners.forEach((listener) => listener(rms, waveform));
      this.visualizerFrameId = requestAnimationFrame(tick);
    };

    if (this.visualizerFrameId === null) {
      this.visualizerFrameId = requestAnimationFrame(tick);
    }
  }

  public subscribeVisualizer(listener: (level: number, waveform: number[]) => void): () => void {
    this.visualizerListeners.add(listener);
    return () => {
      this.visualizerListeners.delete(listener);
    };
  }

  private setupClapDetector(ctx: AudioContext, source: MediaStreamAudioSourceNode) {
    if (this.clapAnalyser) return;

    // Highpass filter for sharp clap transients (>450Hz)
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(450, ctx.currentTime);

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.15;

    source.connect(filter);
    filter.connect(analyser);

    this.clapFilter = filter;
    this.clapAnalyser = analyser;

    const data = new Uint8Array(analyser.frequencyBinCount);
    const threshold = 0.22;
    const minGapMs = 140;
    const maxGapMs = 1000;
    const cooldownMs = 1800;

    let wasAbove = false;

    const tick = () => {
      if (!this.clapAnalyser) {
        this.clapFrameId = requestAnimationFrame(tick);
        return;
      }

      this.clapAnalyser.getByteFrequencyData(data);
      let sum = 0;
      // High frequency bins
      for (let i = 8; i < data.length; i++) {
        sum += data[i];
      }
      const avgEnergy = sum / (data.length - 8) / 255;
      const isAbove = avgEnergy > threshold;

      if (isAbove && !wasAbove) {
        wasAbove = true;
        const now = Date.now();

        if (now - this.lastActivationTime >= cooldownMs) {
          if (this.firstClapTime === null) {
            this.firstClapTime = now;
            console.log(`[CLAP] First clap detected (energy: ${avgEnergy.toFixed(2)})`);
            if (this.resetTimer) clearTimeout(this.resetTimer);
            this.resetTimer = setTimeout(() => {
              if (this.firstClapTime === now) {
                this.firstClapTime = null;
              }
            }, maxGapMs + 60);
          } else {
            const gap = now - this.firstClapTime;
            if (gap >= minGapMs && gap <= maxGapMs) {
              console.log(`[CLAP] DOUBLE CLAP ACTIVATED (gap: ${gap}ms)`);
              this.lastActivationTime = now;
              this.firstClapTime = null;
              if (this.resetTimer) clearTimeout(this.resetTimer);
              this.onDoubleClapCallback?.({
                confidence: 0.95,
                gapMs: gap,
                timestamp: now,
              });
            } else if (gap > maxGapMs) {
              this.firstClapTime = now;
            }
          }
        }
      } else if (!isAbove && wasAbove) {
        wasAbove = false;
      }

      this.clapFrameId = requestAnimationFrame(tick);
    };

    if (this.clapFrameId === null) {
      this.clapFrameId = requestAnimationFrame(tick);
    }
  }

  public setOnDoubleClap(callback: ClapCallback | null) {
    this.onDoubleClapCallback = callback;
  }

  public triggerSimulatedDoubleClap() {
    const now = Date.now();
    this.onDoubleClapCallback?.({
      confidence: 1.0,
      gapMs: 320,
      timestamp: now,
    });
  }

  public cleanup() {
    if (this.visualizerFrameId !== null) cancelAnimationFrame(this.visualizerFrameId);
    if (this.clapFrameId !== null) cancelAnimationFrame(this.clapFrameId);
    this.visualizerFrameId = null;
    this.clapFrameId = null;
    this.mediaStream?.getTracks().forEach((t) => t.stop());
    this.mediaStream = null;
    this.sourceNode?.disconnect();
    this.sourceNode = null;
    if (this.audioContext && this.audioContext.state !== 'closed') {
      void this.audioContext.close();
    }
    this.audioContext = null;
  }
}

// Global singleton
export const audioManager = new AudioManager();
