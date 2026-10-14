import {
  BadGatewayException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import type OpenAI from 'openai';
import { LLM_CLIENT } from './llm.provider';

export interface LlmCompletionRequest {
  system: string;
  message: string;
}

export interface LlmCompletionResult {
  reply: string;
  model: string;
}

const MAX_TOKENS = 1024;
const PROVIDER_ERROR = 'AI provider error';

/**
 * Single entry point to the LLM. Every call is independent — no history, no
 * streaming, no tools — and any provider failure is normalised to a clean
 * BadGatewayException so callers never see raw SDK errors or credentials.
 */

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  constructor(@Inject(LLM_CLIENT) private readonly client: OpenAI) {}

  async complete({
    system,
    message,
  }: LlmCompletionRequest): Promise<LlmCompletionResult> {
    // Validated at startup by the provider; re-read here for a strict type.
    const model = process.env.OPENROUTER_MODEL;
    if (!model) {
      throw new Error('OPENROUTER_MODEL is not set');
    }

    try {
      const response = await this.client.chat.completions.create({
        model,
        max_tokens: MAX_TOKENS,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: message },
        ],
      });

      const reply = response.choices[0]?.message?.content ?? '';
      if (reply) {
        return { reply, model };
      }
      this.logger.error('OpenRouter returned an empty completion');
    } catch (error) {
      this.logger.error(
        'OpenRouter request failed',
        error instanceof Error ? error.message : String(error),
      );
    }

    throw new BadGatewayException(PROVIDER_ERROR);
  }
}
