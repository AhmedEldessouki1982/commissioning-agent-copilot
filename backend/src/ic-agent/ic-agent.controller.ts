import { Body, Controller, Post } from '@nestjs/common';
import { validateMessage } from '../common/validate-message';
import { IcAgentService, type IcAgentReply } from './ic-agent.service';

export interface IcAgentAskBody {
  message?: unknown;
}

@Controller('ic-agent')
export class IcAgentController {
  constructor(private readonly service: IcAgentService) {}

  @Post('ask')
  async ask(@Body() body: IcAgentAskBody): Promise<IcAgentReply> {
    return this.service.ask(validateMessage(body));
  }
}
