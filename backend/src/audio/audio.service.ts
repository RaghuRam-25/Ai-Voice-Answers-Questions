/**
 * Audio Service
 * Provides audio signal processing, RMS energy computation,
 * peak detection, and transient extraction for voice/clap analysis.
 */

export interface AudioFrameAnalysis {
  rms: number;
  peak: number;
  transientScore: number;
  isSpike: boolean;
}

export class AudioService {
  /**
   * Computes Root Mean Square (RMS) energy of PCM audio samples (normalized -1.0 to 1.0)
   */
  public computeRms(samples: Float32Array | number[]): number {
    if (!samples || samples.length === 0) return 0;
    let sumSquares = 0;
    for (let i = 0; i < samples.length; i++) {
      const val = samples[i];
      sumSquares += val * val;
    }
    return Math.sqrt(sumSquares / samples.length);
  }

  /**
   * Computes peak amplitude from samples
   */
  public computePeak(samples: Float32Array | number[]): number {
    if (!samples || samples.length === 0) return 0;
    let max = 0;
    for (let i = 0; i < samples.length; i++) {
      const abs = Math.abs(samples[i]);
      if (abs > max) max = abs;
    }
    return max;
  }

  /**
   * Analyzes an audio buffer to detect transient percussive characteristics (clap profile).
   * Hand claps exhibit a very fast rise time (< 5ms), high crest factor (Peak / RMS > 4.0),
   * and rapid exponential decay (< 35ms).
   */
  public analyzeFrame(samples: Float32Array | number[], threshold = 0.65): AudioFrameAnalysis {
    const rms = this.computeRms(samples);
    const peak = this.computePeak(samples);
    const crestFactor = rms > 0.001 ? peak / rms : 0;

    // Transient score is high when peak is sharp and energy is concentrated in a spike
    const transientScore = peak * Math.min(3, crestFactor / 2.5);
    const isSpike = peak >= threshold && crestFactor >= 2.5;

    return {
      rms,
      peak,
      transientScore,
      isSpike,
    };
  }

  /**
   * Generates a 32-bar visual frequency spectrum fallback
   */
  public generateVisualWaveform(energy: number): number[] {
    return Array.from({ length: 32 }, (_, i) => {
      const bell = Math.sin((i / 31) * Math.PI);
      const ripple = Math.sin(i * 1.5 + Date.now() * 0.01) * 0.15;
      return Math.min(1, Math.max(0, energy * bell + ripple));
    });
  }
}

export const audioService = new AudioService();
