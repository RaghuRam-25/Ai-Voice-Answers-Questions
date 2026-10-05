import { BaseAIProvider, type CommandDescriptor } from './provider.interface';
import type { IntentResult, ProviderChatMessage, ProviderChatResult } from '../../types';
import { INTENT_SYSTEM_PROMPT } from '../prompts/intent.prompt';

/**
 * Any OpenAI-compatible gateway (Ollama, vLLM, LM Studio, OpenRouter, Together,
 * a private corporate proxy...). Configured with CUSTOM_BASE_URL / CUSTOM_MODEL.
 */
export class CustomProvider extends BaseAIProvider {
  readonly id = 'custom';
  readonly label = 'Custom endpoint';

  constructor(
    private readonly baseUrl: string,
    readonly model: string,
    private readonly apiKey: string
  ) {
    super();
    this.timeoutMs = 120_000; // self-hosted models are frequently slower
  }

  isConfigured(): boolean {
    return this.baseUrl.trim().length > 0;
  }

  private async complete(messages: ProviderChatMessage[], jsonMode: boolean): Promise<string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiKey.trim()) headers.Authorization = `Bearer ${this.apiKey}`;

    const data = await this.requestJson(`${this.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: this.model || 'default',
        messages,
        stream: false,
        temperature: 0.6,
        ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
      }),
    });

    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== 'string') throw new Error('Custom endpoint returned no message content');
    return text;
  }

  async chat(messages: ProviderChatMessage[]): Promise<ProviderChatResult> {
    const text = await this.complete(messages, false);
    return { text, model: this.model || 'default' };
  }

  async detectIntent(input: { text: string; commands: CommandDescriptor[] }): Promise<IntentResult> {
    const catalogue = input.commands
      .map((c) => `- ${c.name} (${c.permission}): ${c.description}`)
      .join('\n');

    const raw = await this.complete(
      [
        { role: 'system', content: INTENT_SYSTEM_PROMPT.replace('{{COMMANDS}}', catalogue) },
        { role: 'user', content: input.text },
      ],
      true
    );

    const parsed = this.extractJson(raw) as
      | { kind?: string; command?: string; arguments?: Record<string, unknown>; confidence?: number }
      | null;

    if (!parsed || parsed.kind !== 'command' || typeof parsed.command !== 'string') {
      return { kind: 'reply', confidence: 1 };
    }
    return {
      kind: 'command',
      command: parsed.command,
      arguments: typeof parsed.arguments === 'object' && parsed.arguments ? parsed.arguments : {},
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
    };
  }
}