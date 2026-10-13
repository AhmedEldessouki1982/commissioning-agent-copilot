import Anthropic from '@anthropic-ai/sdk';
import {
  BadGatewayException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ANTHROPIC_CLIENT } from './anthropic.provider';
import { IC_AGENT_SYSTEM_PROMPT } from './ic-agent.prompt';

export interface IcAgentReply {
  reply: string;
  model: string;
}

const DEFAULT_MODEL = 'claude-sonnet-5-5';

@Injectable()
export class IcAgentService {
  private readonly logger = new Logger(IcAgentService.name);

  constructor(@Inject(ANTHROPIC_CLIENT) private readonly client: Anthropic) {}

  /** One independent request — no history, no streaming, no tools. */
  async ask(message: string): Promise<IcAgentReply> {
    const model = process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;

    try {
      const response = await this.client.messages.create({
        model,
        max_tokens: 1024,
        system: IC_AGENT_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: message }],
      });

      const reply = response.content
        .map((block) => (block.type === 'text' ? block.text : ''))
        .join('');

      return { reply, model };
    } catch (error) {
      this.logger.error(
        'Anthropic request failed',
        error instanceof Error ? error.message : String(error),
      );
      throw new BadGatewayException('AI provider error');
    }
  }
}
