import type { Request } from 'express';

/* ────────────────────────────── API envelope ────────────────────────────── */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface ApiRequest extends Request {
  sessionId?: string;
}

/* ──────────────────────────────── assistant ──────────────────────────────── */

export type AssistantStatus =
  | 'idle'
  | 'activating'
  | 'listening'
  | 'processing'
  | 'responding'
  | 'speaking'
  | 'error';

export type MessageSender = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  sender: MessageSender;
  text: string;
  createdAt: string;
  /** Present on assistant messages that were produced by a command run. */
  command?: CommandInvocation;
}

export interface Conversation {
  id: string;
  sessionId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

/* ───────────────────────────────── commands ──────────────────────────────── */

export type Permission = 'safe' | 'moderate' | 'dangerous';

export interface CommandParameterSpec {
  type: 'string' | 'number' | 'boolean' | 'string[]';
  description: string;
  required?: boolean;
  default?: unknown;
}

export interface CommandInvocation {
  name: string;
  arguments: Record<string, unknown>;
  permission: Permission;
  status: 'executed' | 'failed' | 'awaiting_confirmation' | 'rejected' | 'unsupported';
  summary: string;
}

/** Actions the browser must perform (opening a tab, etc.). Never OS-level. */
export type ClientAction =
  | { type: 'open_url'; url: string; label: string }
  | { type: 'focus_window'; label: string };

export interface CommandResult {
  ok: boolean;
  /** Human readable outcome, used as the assistant's spoken/typed answer. */
  message: string;
  data?: Record<string, unknown>;
  clientAction?: ClientAction;
}

export interface CommandContext {
  sessionId: string;
  conversationId: string;
  userMessage: string;
}

export interface CommandDefinition {
  name: string;
  description: string;
  permission: Permission;
  parameters: Record<string, CommandParameterSpec>;
  /** Extra guard: never infer this command from free text without an explicit request. */
  explicitOnly?: boolean;
  /**
   * Regex sources used by the offline engine for deterministic intent
   * detection. Remote models ignore these and classify with the LLM prompt.
   */
  patterns?: string[];
  examples: string[];
  execute: (ctx: CommandContext, args: Record<string, unknown>) => Promise<CommandResult>;
}

export interface PendingConfirmation {
  id: string;
  sessionId: string;
  command: string;
  arguments: Record<string, unknown>;
  reason: string;
  createdAt: string;
  expiresAt: string;
}

export interface CommandLogEntry {
  id: string;
  sessionId: string;
  command: string;
  arguments: Record<string, unknown>;
  permission: Permission;
  status: CommandInvocation['status'];
  result: string;
  executedAt: string;
}

/* ─────────────────────────────────── AI ──────────────────────────────────── */

export interface ProviderChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ProviderChatResult {
  text: string;
  model: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}

export interface IntentResult {
  kind: 'command' | 'reply';
  command?: string;
  arguments?: Record<string, unknown>;
  confidence: number;
  /** Set when the engine deliberately refuses to answer. */
  honest?: boolean;
}

export interface ProviderInfo {
  id: string;
  label: string;
  configured: boolean;
  model: string;
  /** Why a provider cannot be used, when configured === false. */
  reason?: string;
}

/* ────────────────────────────── assistant turn ───────────────────────────── */

export interface AssistantTurn {
  conversationId: string;
  status: AssistantStatus;
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  command?: CommandInvocation;
  confirmation?: PendingConfirmation | null;
  clientAction?: ClientAction | null;
  engine: ProviderInfo;
}

/* ──────────────────────── clap & audio & config ──────────────────────────── */

export interface ClapDetectorConfig {
  threshold: number;
  minGapMs: number;
  maxGapMs: number;
  cooldownMs: number;
  microphoneDevice?: string;
}

export interface ClapDetectionResult {
  isClap: boolean;
  isDoubleClap: boolean;
  confidence: number;
  energy: number;
  timestamp: number;
  gapMs?: number;
}

export interface AssistantConfig {
  clapThreshold: number;
  clapMinGap: number;
  clapMaxGap: number;
  activationCooldown: number;
  microphoneDevice: string;
  aiProvider: string;
  sttProvider: string;
  ttsProvider: string;
}

/* ─────────────────────────────── socket events ───────────────────────────── */

export interface ServerToClientEvents {
  'assistant:status': (data: { status: AssistantStatus; conversationId?: string }) => void;
  'assistant:turn': (data: AssistantTurn) => void;
  'assistant:transcript': (data: { text: string; isFinal: boolean }) => void;
  'assistant:activated': (data: { timestamp: string; source: string }) => void;
  'assistant:clap-detected': (data: { count: number; intervalMs?: number; confidence: number }) => void;
  'assistant:welcome-sequence': (data: { step: number; phrase: string; targetState: AssistantStatus }) => void;
  'assistant:interrupted': (data: { reason: string }) => void;
  'system:health': (data: SystemHealth) => void;
  'assistant:error': (data: { error: string }) => void;
  'settings:config': (data: AssistantConfig) => void;
}

export interface ClientToServerEvents {
  'assistant:message': (data: { message: string; conversationId?: string }) => void;
  'assistant:status': (data: { status: AssistantStatus }) => void;
  'assistant:activate': (data?: { source?: string }) => void;
  'assistant:clap-event': (data: { timestamp?: number; confidence?: number; gapMs?: number }) => void;
  'assistant:interrupt': () => void;
  'assistant:cancel': () => void;
  'settings:update': (data: Partial<AssistantConfig>) => void;
}

export interface SystemHealth {
  status: 'ok' | 'degraded';
  engine: ProviderInfo;
  requestedProvider: string;
  usingFallback: boolean;
  uptimeSeconds: number;
  version: string;
  serverTime: string;
  storage: 'json' | 'memory';
  clapDetector?: ClapDetectorConfig;
}