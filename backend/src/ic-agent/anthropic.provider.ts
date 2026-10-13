import Anthropic from '@anthropic-ai/sdk';
import type { Provider } from '@nestjs/common';

/** Injection token for the Anthropic SDK client. */
export const ANTHROPIC_CLIENT = 'ANTHROPIC_CLIENT';

/**
 * Builds the Anthropic SDK client from the environment. Fails at startup with a
 * clear message when the API key is missing, so misconfiguration is caught
 * before the first request.
 */
export const anthropicClientProvider: Provider = {
  provide: ANTHROPIC_CLIENT,
  useFactory: (): Anthropic => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set');
    }
    return new Anthropic({ apiKey });
  },
};
