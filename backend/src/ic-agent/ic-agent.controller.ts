import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { IcAgentService, type IcAgentReply } from './ic-agent.service';

export interface IcAgentAskBody {
  message?: unknown;
}

const MAX_MESSAGE_LENGTH = 4000;

@Controller('ic-agent')
export class IcAgentController {
  constructor(private readonly service: IcAgentService) {}

  @Post('ask')
  async ask(@Body() body: IcAgentAskBody): Promise<IcAgentReply> {
    const message = body?.message;

    if (typeof message !== 'string' || message.trim().length === 0) {
      throw new BadRequestException('message must be a non-empty string');
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      throw new BadRequestException(
        `message must be at most ${MAX_MESSAGE_LENGTH} characters`,
      );
    }

    return this.service.ask(message);
  }
}
