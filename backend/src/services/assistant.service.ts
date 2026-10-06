import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { store } from '../storage/jsonStore';
import { commandService } from '../commands/command.service';
import { confirmationService } from './confirmation.service';
import { systemService } from './system.service';
import { provider, providerCatalogue } from '../ai/providers/provider.registry';
import { getSystemPrompt } from '../ai/prompts/system.prompt';
import type {
  AssistantStatus,
  AssistantTurn,
  ChatMessage,
  CommandContext,
  CommandInvocation,
  Conversation,
  ProviderChatMessage,
  SystemHealth,
} from '../types';

const MAX_HISTORY_CHARS = 24_000;

class AssistantService {
  private statuses = new Map<string, AssistantStatus>();

  status(sessionId: string): AssistantStatus {
    return this.statuses.get(sessionId) ?? 'idle';
  }

  setStatus(sessionId: string, status: AssistantStatus): void {
    this.statuses.set(sessionId, status);
  }

  health(): SystemHealth {
    const info = providerCatalogue.active;
    return {
      status: info.configured ? 'ok' : 'degraded',
      engine: info,
      requestedProvider: providerCatalogue.requested,
      usingFallback: providerCatalogue.usingFallback,
      uptimeSeconds: Math.round(process.uptime()),
      version: '1.0.0',
      serverTime: new Date().toISOString(),
      storage: store.isPersistent ? 'json' : 'memory',
    };
  }

  /** Full pipeline for one user turn. */
  async handleMessage(
    sessionId: string,
    text: string,
    conversationId?: string,
    language: 'en' | 'bn' = 'en'
  ): Promise<AssistantTurn> {
    const input = text.trim();
    if (!input) throw new Error('empty message');

    const resolvedLanguage: 'en' | 'bn' =
      language === 'bn' || /[\u0980-\u09FF]/.test(input) ? 'bn' : 'en';

    console.log(`[LANGUAGE] Selected: ${resolvedLanguage}`);
    console.log(`[STT] Locale: ${resolvedLanguage === 'bn' ? 'bn-BD' : 'en-US'}`);
    console.log(`[STT] Final transcript: "${input}"`);
    console.log(`[ROUTER] Received user message: "${input}"`);

    const conversation = this.resolveConversation(sessionId, conversationId, input);

    const userMessage: ChatMessage = {
      id: uuidv4(),
      sender: 'user',
      text: input,
      createdAt: new Date().toISOString(),
    };
    conversation.messages.push(userMessage);
    conversation.updatedAt = userMessage.createdAt;

    this.setStatus(sessionId, 'processing');

    const ctx: CommandContext = {
      sessionId,
      conversationId: conversation.id,
      userMessage: input,
    };

    let assistantText: string;
    let command: CommandInvocation | undefined;
    let confirmation: AssistantTurn['confirmation'];
    let clientAction: AssistantTurn['clientAction'] = null;

    try {
      const intent = await provider.detectIntent({
        text: input,
        commands: commandService.catalog(),
      });

      const isCommand = intent.kind === 'command' && Boolean(intent.command);
      console.log(`[ROUTER] Intent: ${isCommand ? 'command (' + intent.command + ')' : 'conversation'}`);

      if (isCommand && intent.command) {
        const outcome = await commandService.run(ctx, intent.command, intent.arguments ?? {});
        command = outcome.invocation;
        confirmation = outcome.confirmation ?? null;
        clientAction = outcome.result.clientAction ?? null;
        assistantText = outcome.result.message;
      } else {
        assistantText = await this.converse(conversation, input, resolvedLanguage);
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`[AI ERROR] API request failed`);
      console.error(`[AI ERROR] Status: 500`);
      console.error(`[AI ERROR] Message: ${errMsg}`);
      logger.error('assistant turn failed', error);
      this.setStatus(sessionId, 'error');

      const isTimeout = /abort|timeout/i.test(errMsg);
      const isMissingConfig = !providerCatalogue.active.configured;
      const message =
        language === 'bn'
          ? isMissingConfig
            ? 'এআই প্রোভাইডার কনফিগার করা নেই।'
            : isTimeout
              ? 'এআই সার্ভিস থেকে সময়মত উত্তর পাওয়া যায়নি।'
              : 'এআই সার্ভিস এই মুহূর্তে অনুপলব্ধ।'
          : isMissingConfig
            ? 'AI provider is not configured.'
            : isTimeout
              ? 'AI service timed out. Please try again.'
              : 'AI service is temporarily unavailable.';
      const failed: ChatMessage = {
        id: uuidv4(),
        sender: 'assistant',
        text: message,
        createdAt: new Date().toISOString(),
      };
      conversation.messages.push(failed);
      this.persist(conversation);
      return {
        conversationId: conversation.id,
        status: 'error',
        userMessage,
        assistantMessage: failed,
        engine: providerCatalogue.active,
      };
    }

    const assistantMessage: ChatMessage = {
      id: uuidv4(),
      sender: 'assistant',
      text: assistantText,
      createdAt: new Date().toISOString(),
      ...(command ? { command } : {}),
    };
    conversation.messages.push(assistantMessage);
    conversation.updatedAt = assistantMessage.createdAt;
    this.persist(conversation);

    this.setStatus(sessionId, 'responding');

    return {
      conversationId: conversation.id,
      status: 'responding',
      userMessage,
      assistantMessage,
      command,
      confirmation: confirmation ?? null,
      clientAction,
      engine: providerCatalogue.active,
    };
  }

  /** Runs a previously created confirmation. */
  async confirm(
    sessionId: string,
    confirmationId: string,
    approved: boolean
  ): Promise<AssistantTurn> {
    const pending = confirmationService.claim(confirmationId, sessionId);
    if (!pending) {
      throw new Error('That confirmation expired or is no longer valid. Ask me again.');
    }

    const conversation =
      this.latestConversation(sessionId) ??
      ({
        id: uuidv4(),
        sessionId,
        title: 'Session',
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } satisfies Conversation);

    if (!approved) {
      confirmationService.resolve(confirmationId, 'rejected');
      const message: ChatMessage = {
        id: uuidv4(),
        sender: 'assistant',
        text: 'বাতিল করা হয়েছে।',
        createdAt: new Date().toISOString(),
        command: {
          name: pending.command,
          arguments: pending.arguments,
          permission: 'moderate',
          status: 'rejected',
          summary: 'Declined by user',
        },
      };
      conversation.messages.push(message);
      this.persist(conversation);
      return {
        conversationId: conversation.id,
        status: 'idle',
        userMessage: conversation.messages[conversation.messages.length - 2],
        assistantMessage: message,
        engine: providerCatalogue.active,
      };
    }

    confirmationService.resolve(confirmationId, 'executed');
    const ctx: CommandContext = {
      sessionId,
      conversationId: conversation.id,
      userMessage: pending.command,
    };
    const outcome = await commandService.run(ctx, pending.command, pending.arguments, { approved: true });

    const message: ChatMessage = {
      id: uuidv4(),
      sender: 'assistant',
      text: outcome.result.message,
      createdAt: new Date().toISOString(),
      command: outcome.invocation,
    };
    conversation.messages.push(message);
    this.persist(conversation);

    return {
      conversationId: conversation.id,
      status: 'responding',
      userMessage: conversation.messages[conversation.messages.length - 2],
      assistantMessage: message,
      command: outcome.invocation,
      confirmation: null,
      clientAction: outcome.result.clientAction ?? null,
      engine: providerCatalogue.active,
    };
  }

  /** Free-form conversation with the active provider. */
  private async converse(conversation: Conversation, input: string, language: 'en' | 'bn' = 'en'): Promise<string> {
    const history = conversation.messages
      .filter((m) => m.sender !== 'system')
      .slice(-(env.CONVERSATION_HISTORY_TURNS * 2) - 1, -1)
      .slice(-env.CONVERSATION_HISTORY_TURNS * 2);

    const messages: ProviderChatMessage[] = [
      {
        role: 'system',
        content: getSystemPrompt(commandService.describe(), this.liveContext(), language),
      },
      ...this.toProviderMessages(history),
      { role: 'user', content: input },
    ];

    const budget = MAX_HISTORY_CHARS;
    while (messages.length > 2 && messages.reduce((n, m) => n + m.content.length, 0) > budget) {
      messages.splice(1, 1);
    }

    console.log(`[PROD] AI request started`);
    console.log(`[AI] Provider: ${providerCatalogue.active.label} (${providerCatalogue.active.model})`);

    const result = await provider.chat(messages);
    const trimmedResult = (result.text || '').trim();

    if (!trimmedResult) {
      if (language === 'bn') {
        console.log(`[AI] Bengali response empty`);
      }
      console.log(`[AI] Raw API response:`, result);
      return language === 'bn' ? 'আমি আপনার কথা বুঝতে পেরেছি।' : 'I understood what you said.';
    }

    console.log(`[PROD] AI provider response received`);
    console.log(`[PROD] AI response text: "${trimmedResult.slice(0, 100)}${trimmedResult.length > 100 ? '...' : ''}"`);
    console.log(`[AI] Response length: ${trimmedResult.length}`);

    return trimmedResult;
  }

  private toProviderMessages(history: ChatMessage[]): ProviderChatMessage[] {
    return history.map((m) => ({
      role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
      content: m.text,
    }));
  }

  private liveContext(): string {
    const info = systemService.info();
    return [
      `Current time: ${systemService.localTime()}`,
      `Engine: ${providerCatalogue.active.label} (${providerCatalogue.active.model}), configured=${providerCatalogue.active.configured}`,
      `Platform: ${info.platform} ${info.release}, Node ${info.nodeVersion}`,
    ].join('\n');
  }

  private resolveConversation(sessionId: string, conversationId: string | undefined, seed: string): Conversation {
    if (conversationId) {
      const existing = store.conversations.get(conversationId);
      if (existing && existing.sessionId === sessionId) return existing;
    }
    const latest = store.conversations
      .find((c) => c.sessionId === sessionId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    if (latest) return latest;

    const now = new Date().toISOString();
    const conversation: Conversation = {
      id: uuidv4(),
      sessionId,
      title: seed.slice(0, 60),
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    store.conversations.put(conversation);
    return conversation;
  }

  private persist(conversation: Conversation): void {
    store.conversations.put({ ...conversation, messages: conversation.messages.slice(-200) });
  }

  private latestConversation(sessionId: string): Conversation | undefined {
    return store.conversations
      .find((c) => c.sessionId === sessionId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  }

  listConversations(sessionId: string) {
    return store.conversations
      .find((c) => c.sessionId === sessionId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map(({ messages, ...rest }) => ({ ...rest, messageCount: messages.length }));
  }

  getConversation(sessionId: string, id: string): Conversation | undefined {
    const conversation = store.conversations.get(id);
    if (!conversation || conversation.sessionId !== sessionId) return undefined;
    return conversation;
  }

  deleteConversation(sessionId: string, id: string): boolean {
    const conversation = store.conversations.get(id);
    if (!conversation || conversation.sessionId !== sessionId) return false;
    return store.conversations.remove(id);
  }
}

export const assistantService = new AssistantService();
export const healthOf = (): SystemHealth => assistantService.health();