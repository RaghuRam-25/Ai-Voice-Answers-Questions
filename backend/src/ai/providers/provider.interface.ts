import type { IntentResult, ProviderChatMessage, ProviderChatResult, ProviderInfo } from '../../types';

/**
 * Every AI integration implements this contract. The rest of the backend only
 * ever talks to `AIProvider`, so swapping OpenAI for Gemini or a self-hosted
 * gateway is a configuration change, not a refactor.
 */
export interface AIProvider {
  readonly id: string;
  readonly label: string;
  readonly model: string;
  /** True when credentials are present and the provider can serve requests. */
  isConfigured(): boolean;
  info(): ProviderInfo;
  /** Free-form conversation. */
  chat(messages: ProviderChatMessage[]): Promise<ProviderChatResult>;
  /**
   * Intent detection. Given the catalogue of commands, decide whether the user
   * asked for an action or for information. Implementations must never invent
   * arguments and must respect `explicitOnly` commands.
   */
  detectIntent(input: {
    text: string;
    commands: CommandDescriptor[];
  }): Promise<IntentResult>;
}

export interface CommandDescriptor {
  name: string;
  description: string;
  permission: 'safe' | 'moderate' | 'dangerous';
  parameters: Record<string, { type: string; description: string; required?: boolean }>;
  examples: string[];
  explicitOnly: boolean;
  patterns: string[];
}

export abstract class BaseAIProvider implements AIProvider {
  abstract readonly id: string;
  abstract readonly label: string;
  abstract readonly model: string;

  protected timeoutMs = 30_000;

  abstract isConfigured(): boolean;
  abstract chat(messages: ProviderChatMessage[]): Promise<ProviderChatResult>;
  abstract detectIntent(input: { text: string; commands: CommandDescriptor[] }): Promise<IntentResult>;

  info(): ProviderInfo {
    return {
      id: this.id,
      label: this.label,
      model: this.model,
      configured: this.isConfigured(),
    };
  }

  /** fetch with timeout + JSON handling shared by the HTTP providers. */
  protected async requestJson(url: string, init: RequestInit): Promise<any> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      const text = await response.text();
      if (!response.ok) {
        throw new Error(`${this.id} responded ${response.status}: ${text.slice(0, 400)}`);
      }
      try {
        return JSON.parse(text);
      } catch {
        throw new Error(`${this.id} returned a non JSON payload`);
      }
    } finally {
      clearTimeout(timer);
    }
  }

  /** Extract the first JSON object from a model reply that may be wrapped in prose/fences. */
  protected extractJson(raw: string): unknown | null {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = (fenced ? fenced[1] : raw).trim();
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;
    try {
      return JSON.parse(candidate.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}