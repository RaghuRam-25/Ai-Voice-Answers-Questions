import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  CLIENT_URL: z.string().default('http://localhost:3000'),

  // AI provider
  AI_PROVIDER: z.enum(['openai', 'gemini', 'custom', 'local']).default('local'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().default('https://api.openai.com/v1'),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-3.5-flash-lite'),
  CUSTOM_API_KEY: z.string().optional(),
  CUSTOM_BASE_URL: z.string().optional(),
  CUSTOM_MODEL: z.string().optional(),

  // Double-clap activation parameters
  CLAP_THRESHOLD: z.coerce.number().min(0.01).max(1.0).default(0.65),
  CLAP_MIN_GAP: z.coerce.number().int().min(50).max(1000).default(140),
  CLAP_MAX_GAP: z.coerce.number().int().min(200).max(3000).default(850),
  ACTIVATION_COOLDOWN: z.coerce.number().int().min(500).max(10000).default(2000),
  MICROPHONE_DEVICE: z.string().default('default'),

  // Speech & TTS Providers
  STT_PROVIDER: z.enum(['web-speech', 'whisper', 'gemini', 'local']).default('web-speech'),
  TTS_PROVIDER: z.enum(['web-speech', 'openai', 'gemini', 'local']).default('web-speech'),

  // Conversation behavior
  MAX_MESSAGE_LENGTH: z.coerce.number().int().min(100).max(32000).default(4000),
  CONVERSATION_HISTORY_TURNS: z.coerce.number().int().min(0).max(40).default(8),
  CONFIRMATION_TTL_MS: z.coerce.number().int().min(5000).max(600000).default(60000),
  DATA_DIR: z.string().default('./data'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.errors.map((e) => `  • ${e.path.join('.')}: ${e.message}`).join('\n');
  // eslint-disable-next-line no-console
  console.error(`\nInvalid backend environment configuration:\n${details}\n\nCopy .env.example to .env and fix the values above.\n`);
  process.exit(1);
}

const raw = parsed.data;

const providerKeyFor = (provider: string): string => {
  if (provider === 'openai') return raw.OPENAI_API_KEY ?? '';
  if (provider === 'gemini') return raw.GEMINI_API_KEY ?? '';
  if (provider === 'custom') return raw.CUSTOM_API_KEY ?? '';
  return '';
};

const requestedProvider = raw.AI_PROVIDER;
const requestedKey = providerKeyFor(requestedProvider).trim();

const providerUsable =
  requestedProvider === 'local' ||
  (requestedProvider === 'custom'
    ? Boolean(raw.CUSTOM_BASE_URL && raw.CUSTOM_BASE_URL.trim())
    : Boolean(requestedKey));

const activeProvider = providerUsable ? requestedProvider : 'local';

if (!providerUsable) {
  // eslint-disable-next-line no-console
  console.warn(
    `[env] AI_PROVIDER="${requestedProvider}" is missing its credentials. Falling back to the offline "local" engine.`
  );
}

export const env = {
  ...raw,
  AI_PROVIDER: activeProvider,
  AI_PROVIDER_REQUESTED: requestedProvider,
  AI_PROVIDER_FALLBACK: !providerUsable,
  CLIENT_URLS: raw.CLIENT_URL.split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  isDev: raw.NODE_ENV !== 'production',
  isProd: raw.NODE_ENV === 'production',
  dataDir: path.resolve(__dirname, '../../', raw.DATA_DIR),
} as const;

if (env.isProd) {
  // eslint-disable-next-line no-console
  console.warn(
    '[env] Production mode. Terminate TLS at your reverse proxy and forward X-Forwarded-Proto=https so the app only ever runs on HTTPS/WSS.'
  );
}

export const ensureDataDir = (): string => {
  if (!fs.existsSync(env.dataDir)) {
    fs.mkdirSync(env.dataDir, { recursive: true });
  }
  return env.dataDir;
};