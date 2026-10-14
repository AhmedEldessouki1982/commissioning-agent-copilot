import type { Provider } from '@nestjs/common';
import OpenAI from 'openai';

/** Injection token for the OpenRouter (OpenAI-compatible) client. */
export const LLM_CLIENT = 'LLM_CLIENT';

/**
 * Builds the OpenRouter client using the OpenAI SDK. Fails at startup with a
 * clear message when configuration is missing, so misconfiguration is caught
 * before the first request.
 */
export const llmClientProvider: Provider = {
  provide: LLM_CLIENT,
  useFactory: (): OpenAI => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY is not set');
    }
    if (!process.env.OPENROUTER_MODEL) {
      throw new Error('OPENROUTER_MODEL is not set');
    }
    return new OpenAI({
      apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      timeout: 60_000,
      maxRetries: 1,
    });
  },
};
