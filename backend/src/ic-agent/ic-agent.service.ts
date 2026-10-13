import {
  BadGatewayException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import type OpenAI from 'openai';
import { IC_AGENT_SYSTEM_PROMPT } from './ic-agent.prompt';
import { LLM_CLIENT } from './llm.provider';

export interface IcAgentReply {
  reply: string;
  model: string;
}

@Injectable()
export class IcAgentService {
  private readonly logger = new Logger(IcAgentService.name);

  constructor(@Inject(LLM_CLIENT) private readonly client: OpenAI) {}

  /** One independent request — no history, no streaming, no tools. */
  async ask(message: string): Promise<IcAgentReply> {
    // Validated at startup by the provider; re-read here for a strict type.
    const model = process.env.OPENROUTER_MODEL;
    if (!model) {
      throw new Error('OPENROUTER_MODEL is not set');
    }

    try {
      const response = await this.client.chat.completions.create({
        model,
        max_tokens: 1024,
        messages: [
          { role: 'system', content: IC_AGENT_SYSTEM_PROMPT },
          { role: 'user', content: message },
        ],
      });

      const reply = response.choices[0]?.message?.content ?? '';

      return { reply, model };
    } catch (error) {
      this.logger.error(
        'OpenRouter request failed',
        error instanceof Error ? error.message : String(error),
      );
      throw new BadGatewayException('AI provider error');
    }
  }
}
