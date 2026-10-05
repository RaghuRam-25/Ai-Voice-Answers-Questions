import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import type { AIProvider } from './provider.interface';
import { LocalProvider } from './local.provider';
import { OpenAIProvider } from './openai.provider';
import { GeminiProvider } from './gemini.provider';
import { CustomProvider } from './custom.provider';

const build = (): AIProvider => {
  switch (env.AI_PROVIDER) {
    case 'openai':
      return new OpenAIProvider(
        env.OPENAI_API_KEY ?? '',
        env.OPENAI_BASE_URL,
        env.OPENAI_MODEL
      );
    case 'gemini':
      return new GeminiProvider(env.GEMINI_API_KEY ?? '', env.GEMINI_MODEL);
    case 'custom':
      return new CustomProvider(
        env.CUSTOM_BASE_URL ?? '',
        env.CUSTOM_MODEL ?? '',
        env.CUSTOM_API_KEY ?? ''
      );
    case 'local':
    default:
      return new LocalProvider();
  }
};

export const provider: AIProvider = build();

/** Every provider that could be selected, so the UI can show real capabilities. */
export const providerCatalogue = {
  active: provider.info(),
  requested: env.AI_PROVIDER_REQUESTED,
  usingFallback: env.AI_PROVIDER_FALLBACK,
  available: (['local', 'openai', 'gemini', 'custom'] as const).map((id) => {
    switch (id) {
      case 'openai':
        return new OpenAIProvider(env.OPENAI_API_KEY ?? '', env.OPENAI_BASE_URL, env.OPENAI_MODEL).info();
      case 'gemini':
        return new GeminiProvider(env.GEMINI_API_KEY ?? '', env.GEMINI_MODEL).info();
      case 'custom':
        return new CustomProvider(
          env.CUSTOM_BASE_URL ?? '',
          env.CUSTOM_MODEL ?? '',
          env.CUSTOM_API_KEY ?? ''
        ).info();
      default:
        return new LocalProvider().info();
    }
  }),
};

if (provider.id === 'local' && env.AI_PROVIDER_REQUESTED !== 'local') {
  logger.warn(
    `AI provider "${env.AI_PROVIDER_REQUESTED}" is not usable with the current environment. Serving with the offline local engine.`
  );
}