import { env } from '../config/env';
import { logger } from '../utils/logger';

export interface TtsSynthesizeOptions {
  text: string;
  voice?: string;
  speed?: number;
}

export interface TtsSynthesizeResult {
  audioBuffer?: Buffer;
  mimeType?: string;
  provider: string;
  useClientTts?: boolean;
}

export class TtsService {
  public getProvider(): string {
    return env.TTS_PROVIDER;
  }

  public async synthesize(options: TtsSynthesizeOptions): Promise<TtsSynthesizeResult> {
    const provider = env.TTS_PROVIDER;

    if (provider === 'openai' && env.OPENAI_API_KEY) {
      try {
        const audioBuffer = await this.synthesizeWithOpenAI(options.text, options.voice || 'alloy', options.speed || 1.0);
        return {
          audioBuffer,
          mimeType: 'audio/mpeg',
          provider: 'openai',
          useClientTts: false,
        };
      } catch (err) {
        logger.warn('[TtsService] OpenAI TTS failed, falling back to client-side speech synthesis:', err);
      }
    }

    // Default: instruct client to use Web Speech API / browser SpeechSynthesisUtterance
    return {
      provider: 'web-speech',
      useClientTts: true,
    };
  }

  private async synthesizeWithOpenAI(
    text: string,
    voice = 'alloy',
    speed = 1.0
  ): Promise<Buffer> {
    const response = await fetch(`${env.OPENAI_BASE_URL}/audio/speech`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice,
        speed,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI TTS error: ${response.status} ${err}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}

export const ttsService = new TtsService();
