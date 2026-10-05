export type AssistantStatusType =
  | 'idle'
  | 'activating'
  | 'listening'
  | 'processing'
  | 'responding'
  | 'speaking'
  | 'error';

export interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date | string;
  actionExecuted?: {
    tool: string;
    status: 'success' | 'failed';
    details?: string;
  };
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
}

export interface AssistantEngineInfo {
  id: string;
  label: string;
  configured: boolean;
  model: string;
  reason?: string;
}

export interface AssistantSystemStatus {
  status: 'ok' | 'degraded' | AssistantStatusType;
  engine: AssistantEngineInfo;
  requestedProvider: string;
  usingFallback: boolean;
  uptimeSeconds: number;
  version: string;
  serverTime: string;
  storage: 'json' | 'memory';
}

export interface AssistantTurnResponse {
  conversationId: string;
  status: AssistantStatusType;
  userMessage: {
    id: string;
    sender: 'user' | 'assistant';
    text: string;
    createdAt: string;
  };
  assistantMessage: {
    id: string;
    sender: 'user' | 'assistant';
    text: string;
    createdAt: string;
  };
  command?: unknown;
  confirmation?: unknown;
  clientAction?: unknown;
  engine: AssistantEngineInfo;
}

export interface ClapDetectorSettings {
  threshold: number;
  minGapMs: number;
  maxGapMs: number;
  cooldownMs: number;
  microphoneDevice?: string;
}