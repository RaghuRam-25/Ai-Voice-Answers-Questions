import { BaseAIProvider, type CommandDescriptor } from './provider.interface';
import type { IntentResult, ProviderChatMessage, ProviderChatResult } from '../../types';
import { INTENT_SYSTEM_PROMPT } from '../prompts/intent.prompt';

/**
 * OpenAI chat-completions provider.
 * Kept dependency free: it talks to the REST API directly so the backend has no
 * vendor SDK in the tree.
 */
export class OpenAIProvider extends BaseAIProvider {
  readonly id = 'openai';
  readonly label = 'OpenAI';

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
    readonly model: string
  ) {
    super();
  }

  isConfigured(): boolean {
    return this.apiKey.trim().length > 0;
  }

  private async complete(messages: ProviderChatMessage[], jsonMode: boolean): Promise<string> {
    const data = await this.requestJson(`${this.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.6,
        ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
      }),
    });

    const choice = data?.choices?.[0]?.message?.content;
    if (typeof choice !== 'string') throw new Error('OpenAI returned no message content');
    return choice;
  }

  async chat(messages: ProviderChatMessage[]): Promise<ProviderChatResult> {
    const text = await this.complete(messages, false);
    return { text, model: this.model };
  }

  async detectIntent(input: { text: string; commands: CommandDescriptor[] }): Promise<IntentResult> {
    const catalogue = input.commands
      .map((c) =>
        [
          `- ${c.name} (${c.permission}${c.explicitOnly ? ', explicit request only' : ''}): ${c.description}`,
          ...c.examples.map((e) => `    e.g. "${e}"`),
        ].join('\n')
      )
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