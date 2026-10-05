import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';
import { store } from '../storage/jsonStore';
import { logger } from '../utils/logger';
import type { Conversation, ChatMessage, ProviderChatMessage } from '../types';

export class ConversationService {
  private activeConversations = new Map<string, Conversation>();

  public getOrCreate(sessionId: string, conversationId?: string, seedTitle?: string): Conversation {
    if (conversationId && this.activeConversations.has(conversationId)) {
      return this.activeConversations.get(conversationId)!;
    }

    if (conversationId) {
      const persisted = store.conversations.get(conversationId);
      if (persisted && persisted.sessionId === sessionId) {
        this.activeConversations.set(persisted.id, persisted);
        return persisted;
      }
    }

    // Find latest active conversation for this session
    for (const conv of this.activeConversations.values()) {
      if (conv.sessionId === sessionId) {
        return conv;
      }
    }

    const newConv: Conversation = {
      id: conversationId || uuidv4(),
      sessionId,
      title: seedTitle ? seedTitle.slice(0, 48) : 'New Conversation',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.activeConversations.set(newConv.id, newConv);
    this.persist(newConv);
    return newConv;
  }

  public addMessage(conversation: Conversation, message: ChatMessage): void {
    conversation.messages.push(message);
    conversation.updatedAt = message.createdAt;
    this.persist(conversation);
  }

  public getContextHistory(conversation: Conversation, maxTurns = env.CONVERSATION_HISTORY_TURNS): ProviderChatMessage[] {
    const turns = conversation.messages.slice(-maxTurns * 2);
    return turns.map((msg) => ({
      role: msg.sender === 'assistant' ? 'assistant' : msg.sender === 'system' ? 'system' : 'user',
      content: msg.text,
    }));
  }

  public clearSession(sessionId: string): void {
    for (const [id, conv] of this.activeConversations.entries()) {
      if (conv.sessionId === sessionId) {
        this.activeConversations.delete(id);
      }
    }
  }

  public persist(conversation: Conversation): void {
    try {
      store.conversations.put(conversation);
    } catch (err) {
      logger.warn('[ConversationService] Failed to persist conversation:', err);
    }
  }
}

export const conversationService = new ConversationService();
