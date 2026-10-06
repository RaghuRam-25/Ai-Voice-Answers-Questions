import { BaseAIProvider, type CommandDescriptor } from './provider.interface';
import type { IntentResult, ProviderChatMessage, ProviderChatResult } from '../../types';
import { INTENT_SYSTEM_PROMPT } from '../prompts/intent.prompt';

/** Google Gemini generateContent provider with full diagnostics and model resilience. */
export class GeminiProvider extends BaseAIProvider {
  readonly id = 'gemini';
  readonly label = 'Google Gemini';

  private readonly fallbackModels = [
    'gemini-flash-lite-latest',
    'gemini-3.5-flash',
    'gemini-3.6-flash',
    'gemini-3.7-flash',
    'gemini-3.8-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
  ];

  constructor(
    private readonly apiKey: string,
    public model: string
  ) {
    super();
  }

  isConfigured(): boolean {
    return this.apiKey.trim().length > 0;
  }

  private endpoint(model: string, method: 'generateContent'): string {
    return `https://generativelanguage.googleapis.com/v1beta/models/${model}:${method}?key=${encodeURIComponent(this.apiKey)}`;
  }

  private payload(messages: ProviderChatMessage[]) {
    const system = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n');

    // Group adjacent messages with same role for Gemini API compliance
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
    for (const m of messages) {
      if (m.role === 'system') continue;
      const role = m.role === 'assistant' ? 'model' : 'user';
      const text = m.content.trim();
      if (!text) continue;
      if (contents.length > 0 && contents[contents.length - 1].role === role) {
        contents[contents.length - 1].parts[0].text += `\n${text}`;
      } else {
        contents.push({ role, parts: [{ text }] });
      }
    }

    return {
      ...(system ? { system_instruction: { parts: [{ text: system }] } } : {}),
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
    };
  }

  async chat(messages: ProviderChatMessage[]): Promise<ProviderChatResult> {
    console.log(`[PROD] AI request started`);
    console.log(`[AI] Provider: ${this.label} (${this.model})`);

    const payloadObj = this.payload(messages);

    const modelsToTry = [this.model, ...this.fallbackModels.filter((m) => m !== this.model)];
    let lastError: Error | null = null;

    for (const currentModel of modelsToTry) {
      try {
        const url = this.endpoint(currentModel, 'generateContent');
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);

        let response: Response;
        let rawText = '';
        try {
          response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadObj),
            signal: controller.signal,
          });
          rawText = await response.text();
        } finally {
          clearTimeout(timer);
        }

        if (!response.ok) {
          console.warn(`[AI] Model ${currentModel} returned HTTP ${response.status}. Retrying with next model...`);
          lastError = new Error(`Gemini API error ${response.status}: ${rawText}`);
          continue;
        }

        console.log(`[PROD] AI provider response received`);

        const data = JSON.parse(rawText);
        const parsedText: string =
          data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';

        console.log(`[PROD] AI response text: "${parsedText.slice(0, 100)}${parsedText.length > 100 ? '...' : ''}"`);
        console.log(`[AI] Response length: ${parsedText.length}`);

        if (!parsedText) {
          throw new Error('Gemini returned no text candidate');
        }

        this.model = currentModel;
        const usage = data?.usageMetadata;
        return {
          text: parsedText,
          model: currentModel,
          usage: usage
            ? {
                promptTokens: usage.promptTokenCount ?? 0,
                completionTokens: usage.candidatesTokenCount ?? 0,
                totalTokens: usage.totalTokenCount ?? 0,
              }
            : undefined,
        };
      } catch (err) {
        lastError = err as Error;
        console.warn(`[AI] Error with model ${currentModel}: ${(err as Error).message}. Retrying...`);
        continue;
      }
    }

    throw lastError || new Error('All Gemini models failed');
  }

  async detectIntent(input: { text: string; commands: CommandDescriptor[] }): Promise<IntentResult> {
    const text = input.text.trim();
    if (!text) return { kind: 'reply', confidence: 1 };

    // Explicit check for normal conversation questions
    const isNormalChat =
      /^(কেমন আছো|কেমন আছেন|তুমি কে|তোমার নাম কি|কে বানিয়েছে|কী খবর|কি অবস্থা|কেমন চলছে|একটা গল্প বলো|গল্প বলো|আজকে আমার কি করা উচিত|বাংলাদেশের রাজধানী|বাংলাদেশ সম্পর্কে|আমার ল্যাপটপ slow কেন|আমার ল্যাপটপ স্লো কেন|ল্যাপটপ স্লো|help me|how are you|who are you|tell me a story|what is|why is|explain)\b/i.test(
        text
      ) ||
      /\?$/.test(text) ||
      /[\u0980-\u09FF]/.test(text) && !/\b(খুলো|খুলে দাও|ওপেন করো|সার্চ করো|নোট|রিমাইন্ডার|কয়টা বাজে|সময় কত)\b/i.test(text);

    if (isNormalChat) {
      return { kind: 'reply', confidence: 1 };
    }

    const catalogue = input.commands
      .map(
        (c) =>
          `- ${c.name} (${c.permission}${c.explicitOnly ? ', explicit request only' : ''}): ${c.description}\n` +
          c.examples.map((e) => `    e.g. "${e}"`).join('\n')
      )
      .join('\n');

    try {
      const data = await this.requestJson(this.endpoint(this.model, 'generateContent'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...this.payload([
            { role: 'system', content: INTENT_SYSTEM_PROMPT.replace('{{COMMANDS}}', catalogue) },
            { role: 'user', content: input.text },
          ]),
          generationConfig: { temperature: 0, maxOutputTokens: 256, responseMimeType: 'application/json' },
        }),
      });

      const raw: string =
        data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
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
    } catch {
      // If intent classification fails or is unavailable, default to free-form conversation
      return { kind: 'reply', confidence: 1 };
    }
  }
}