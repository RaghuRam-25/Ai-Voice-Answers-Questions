import { env } from '../config/env';
import { logger } from '../utils/logger';

export interface SpeechTranscribeOptions {
  audioBuffer?: Buffer;
  mimeType?: string;
  language?: string;
  prompt?: string;
}

export interface SpeechTranscribeResult {
  text: string;
  provider: string;
  confidence?: number;
}

export class SpeechService {
  public getProvider(): string {
    return env.STT_PROVIDER;
  }

  /**
   * Transcribes audio using the configured backend provider (OpenAI Whisper, Gemini, or WebSpeech bridge)
   */
  public async transcribe(options: SpeechTranscribeOptions): Promise<SpeechTranscribeResult> {
    const provider = env.STT_PROVIDER;

    if (provider === 'whisper' && env.OPENAI_API_KEY && options.audioBuffer) {
      return this.transcribeWithWhisper(options.audioBuffer, options.mimeType || 'audio/webm', options.language);
    }

    if (provider === 'gemini' && env.GEMINI_API_KEY && options.audioBuffer) {
      return this.transcribeWithGemini(options.audioBuffer, options.mimeType || 'audio/webm');
    }

    // Default / WebSpeech mode: Client handles real-time audio STT via Web Speech API
    return {
      text: '',
      provider: 'web-speech',
      confidence: 1.0,
    };
  }

  private async transcribeWithWhisper(
    buffer: Buffer,
    mimeType: string,
    language = 'en'
  ): Promise<SpeechTranscribeResult> {
    try {
      const formData = new FormData();
      const blob = new Blob([buffer], { type: mimeType });
      formData.append('file', blob, 'audio.webm');
      formData.append('model', 'whisper-1');
      formData.append('language', language);

      const response = await fetch(`${env.OPENAI_BASE_URL}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Whisper API failed: ${response.status} ${errText}`);
      }

      const json = (await response.json()) as { text: string };
      return {
        text: json.text.trim(),
        provider: 'whisper',
        confidence: 0.95,
      };
    } catch (err) {
      logger.error('[SpeechService] Whisper transcription error:', err);
      throw err;
    }
  }

  private async transcribeWithGemini(
    buffer: Buffer,
    mimeType: string
  ): Promise<SpeechTranscribeResult> {
    try {
      const base64Audio = buffer.toString('base64');
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;

      const payload = {
        contents: [
          {
            parts: [
              {
                text: 'Transcribe the following speech exactly as spoken. Return only the transcription text, nothing else.',
              },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Audio,
                },
              },
            ],
          },
        ],
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Gemini transcription error: ${err}`);
      }

      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
      return {
        text,
        provider: 'gemini',
        confidence: 0.95,
      };
    } catch (err) {
      logger.error('[SpeechService] Gemini transcription error:', err);
      throw err;
    }
  }
}

export const speechService = new SpeechService();
